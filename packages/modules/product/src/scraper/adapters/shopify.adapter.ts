import type { ScraperAdapter, ScrapedProduct, ScrapedVariant } from '../scraper.interface';

// ─── Shopify Scraper ──────────────────────────────────────────────────────────

export class ShopifyScraper implements ScraperAdapter {
  getPlatformName(): string {
    return 'Shopify';
  }

  canHandle(url: string): boolean {
    // Detect Shopify stores by:
    // 1. myshopify.com domain
    if (/myshopify\.com/i.test(url)) return true;

    // 2. Contains /products/ in path (most Shopify stores use this pattern)
    // BUT be more precise: the path must include /products/ followed by a slug
    if (/\/products\/[^/?#]+/i.test(url)) {
      // Could be a Shopify store; we will try scraping and let it fail gracefully
      // For canHandle we return true so it gets priority over generic for /products/ paths
      return true;
    }

    // 3. Common Shopify CDN patterns
    if (/cdn\.shopify\.com/i.test(url)) return true;

    return false;
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const finalUrl = response.url;

      // Strategy 1: Parse JSON-LD structured data (Shopify injects Product schema)
      const jsonLdData = this.parseJsonLd(html);
      if (jsonLdData.title) {
        return {
          sourceUrl: finalUrl,
          platform: 'Shopify',
          title: jsonLdData.title,
          description: jsonLdData.description ?? '',
          images: jsonLdData.images ?? [],
          variants: jsonLdData.variants ?? [],
          price: jsonLdData.price,
          currency: jsonLdData.currency,
          category: jsonLdData.category,
          specs: jsonLdData.specs ?? {},
          brand: jsonLdData.brand,
          availability: jsonLdData.availability,
        };
      }

      // Strategy 2: Parse OpenGraph meta tags
      const ogData = this.parseOpenGraph(html);
      if (ogData.title) {
        return {
          sourceUrl: finalUrl,
          platform: 'Shopify',
          title: ogData.title,
          description: ogData.description ?? '',
          images: ogData.images ?? [],
          variants: ogData.variants ?? [],
          price: ogData.price,
          currency: ogData.currency,
          category: ogData.category,
          specs: ogData.specs ?? {},
          brand: ogData.brand,
          availability: ogData.availability,
        };
      }

      // Strategy 3: DOM-like fallback parsing
      return {
        sourceUrl: finalUrl,
        platform: 'Shopify',
        title: this.fallbackTitle(html),
        description: this.fallbackDescription(html),
        images: this.fallbackImages(html),
        variants: this.fallbackVariants(html),
        price: undefined,
        currency: undefined,
        category: undefined,
        specs: {},
        brand: undefined,
        availability: undefined,
      };
    } catch (err) {
      return {
        sourceUrl: url,
        platform: 'Shopify',
        title: '',
        description: '',
        images: [],
        variants: [],
        specs: {},
      };
    }
  }

  // ── JSON-LD Parsing ──────────────────────────────────────────────────────

  private parseJsonLd(html: string): Partial<ScrapedProduct> {
    const jsonLdRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]!);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          const type = item['@type'];
          const types = Array.isArray(type) ? type : [type];

          if (types.some((t: string) => t === 'Product')) {
            const result: Partial<ScrapedProduct> = {};

            // Title
            result.title = (item.name as string) ?? '';

            // Description
            result.description = (item.description as string) ?? '';

            // Images
            if (Array.isArray(item.image)) {
              result.images = item.image.map((img: unknown) =>
                typeof img === 'string'
                  ? img
                  : typeof img === 'object' && img !== null
                    ? ((img as Record<string, unknown>).url as string) ?? ''
                    : '',
              ).filter(Boolean);
            } else if (typeof item.image === 'string') {
              result.images = [item.image];
            } else if (item.image && typeof item.image === 'object') {
              result.images = [((item.image as Record<string, unknown>).url as string) ?? ''].filter(Boolean);
            } else {
              result.images = [];
            }

            // Offers - could be a single Offer or an array of Offers
            const offers = item.offers;
            if (offers) {
              const offerList = Array.isArray(offers) ? offers : [offers];

              // Get price from the first offer with a price
              for (const offer of offerList) {
                if (offer && typeof offer === 'object') {
                  const o = offer as Record<string, unknown>;
                  if (o.price && !result.price) {
                    const price = parseFloat(String(o.price));
                    if (!isNaN(price)) {
                      result.price = price;
                      result.currency = (o.priceCurrency as string) ?? 'USD';
                      result.availability = this.parseAvailability(o.availability as string);
                    }
                  }
                }
              }

              // Parse variants from offers
              if (offerList.length > 1) {
                result.variants = [];
                for (const offer of offerList) {
                  if (offer && typeof offer === 'object') {
                    const o = offer as Record<string, unknown>;
                    const variant: ScrapedVariant = {
                      name: (o.name as string) ?? 'Default',
                      value: (o.name as string) ?? 'Default',
                      price: o.price ? parseFloat(String(o.price)) : undefined,
                      stock: o.inventoryLevel
                        ? (typeof o.inventoryLevel === 'object'
                            ? parseInt(String((o.inventoryLevel as Record<string, unknown>).value ?? '0'))
                            : parseInt(String(o.inventoryLevel)))
                        : undefined,
                      sku: (o.sku as string) ?? undefined,
                    };
                    // Parse availability from the offer
                    if (o.availability && typeof o.availability === 'string') {
                      const avail = this.parseAvailability(o.availability);
                      if (avail && avail.toLowerCase().includes('out')) {
                        variant.stock = 0;
                      } else if (avail && avail.toLowerCase().includes('in')) {
                        variant.stock = variant.stock ?? 10;
                      }
                    }
                    result.variants.push(variant);
                  }
                }
              } else {
                result.variants = [];
              }
            }

            // Brand
            if (item.brand) {
              if (typeof item.brand === 'string') {
                result.brand = item.brand;
              } else if (typeof item.brand === 'object') {
                result.brand = ((item.brand as Record<string, unknown>).name as string) ?? '';
              }
            }

            // SKU
            if (item.sku) {
              if (result.variants && result.variants.length === 0) {
                result.variants = [{
                  name: 'Default',
                  value: 'Default',
                  sku: item.sku as string,
                  price: result.price,
                }];
              }
            } else if (!result.variants || result.variants.length === 0) {
              // Create a default variant from the product price
              result.variants = [{
                name: 'Default',
                value: 'Default',
                price: result.price,
                stock: undefined,
              }];
            }

            // Category from additionalProperty or category field
            if (item.category) {
              if (typeof item.category === 'string') {
                result.category = item.category;
              } else if (typeof item.category === 'object') {
                result.category = ((item.category as Record<string, unknown>).name as string) ?? '';
              }
            }

            // Specs from additionalProperty
            const specs: Record<string, string> = {};
            if (Array.isArray(item.additionalProperty)) {
              for (const prop of item.additionalProperty) {
                if (prop && typeof prop === 'object') {
                  const p = prop as Record<string, unknown>;
                  const name = (p.name as string) ?? '';
                  const value = (p.value as string) ?? '';
                  if (name && value) {
                    specs[name] = value;
                  }
                }
              }
            }
            result.specs = specs;

            return result;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return {};
  }

  // ── OpenGraph Fallback ───────────────────────────────────────────────────

  private parseOpenGraph(html: string): Partial<ScrapedProduct> {
    const getMeta = (property: string): string => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const match = regex.exec(html);
      return match?.[1]?.trim() ?? '';
    };

    const title = getMeta('og:title');
    const description = getMeta('og:description');
    const image = getMeta('og:image');

    // Product-specific OG tags
    const priceAmount = getMeta('product:price:amount');
    const priceCurrency = getMeta('product:price:currency');
    const brand = getMeta('product:brand');
    const availability = getMeta('product:availability');

    const price = priceAmount ? parseFloat(priceAmount) : undefined;
    const currency = priceCurrency || undefined;

    return {
      title,
      description,
      images: image ? [image] : [],
      price: price && !isNaN(price) ? price : undefined,
      currency,
      brand: brand || undefined,
      availability: availability || undefined,
      variants: [],
      specs: {},
      category: undefined,
    };
  }

  // ── DOM fallbacks ────────────────────────────────────────────────────────

  private fallbackTitle(html: string): string {
    // Try product title element
    const titleRegex = /<h1[^>]*class=["'][^"']*product[^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i;
    const match = titleRegex.exec(html);
    if (match?.[1]) {
      return match[1].replace(/<[^>]+>/g, '').trim();
    }

    // Try any h1
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
    const h1Match = h1Regex.exec(html);
    return h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
  }

  private fallbackDescription(html: string): string {
    const descRegex =
      /<div[^>]*class=["'][^"']*product[^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i;
    const match = descRegex.exec(html);
    return match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
  }

  private fallbackImages(html: string): string[] {
    const images: string[] = [];
    // Shopify often stores product images in data attributes
    const dataSrcRegex = /data-(?:src|original|zoom)=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
    let match: RegExpExecArray | null;
    while ((match = dataSrcRegex.exec(html)) !== null) {
      if (match[1]) {
        // Shopify CDN: remove size suffix for full resolution
        const fullSize = match[1].replace(/_\d+x\d+(?:\.\w+)?(\.\w+)$/, '$1');
        images.push(fullSize);
      }
    }

    // Fall back to img tags with product class
    if (images.length === 0) {
      const imgRegex = /<img[^>]*class=["'][^"']*product[^"']*img[^"']*["'][^>]*src=["']([^"']+)["']/gi;
      while ((match = imgRegex.exec(html)) !== null) {
        if (match[1]) images.push(match[1]);
      }
    }

    return [...new Set(images)];
  }

  private fallbackVariants(html: string): ScrapedVariant[] {
    const variants: ScrapedVariant[] = [];

    // Look for variant select elements (Shopify's theme standard)
    const selectRegex = /<select[^>]*(?:class=["'][^"']*variant[^"']*["']|name=["'][^"']*(?:option|variant)[^"']*["'])[^>]*>([\s\S]*?)<\/select>/gi;
    let selectMatch: RegExpExecArray | null;

    while ((selectMatch = selectRegex.exec(html)) !== null) {
      const selectHtml = selectMatch[1]!;

      // Try to extract the option name from a nearby label
      const labelRegex = /<label[^>]*>([^<]+)<\/label>/i;
      const labelMatch = labelRegex.exec(selectMatch[0]);

      const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)<\/option>/gi;
      let optionMatch: RegExpExecArray | null;

      while ((optionMatch = optionRegex.exec(selectHtml)) !== null) {
        const value = optionMatch[1]!;
        const label = optionMatch[2]!.trim();
        if (value && label && value !== 'Select' && label !== 'Select') {
          variants.push({
            name: labelMatch?.[1]?.trim() ?? 'Option',
            value: label,
          });
        }
      }
    }

    return variants;
  }

  private parseAvailability(availabilityStr: string | undefined): string | undefined {
    if (!availabilityStr) return undefined;

    // Standard schema.org availability values
    if (availabilityStr.includes('InStock')) return 'in_stock';
    if (availabilityStr.includes('OutOfStock')) return 'out_of_stock';
    if (availabilityStr.includes('PreOrder')) return 'pre_order';
    if (availabilityStr.includes('BackOrder')) return 'back_order';
    if (availabilityStr.includes('Discontinued')) return 'discontinued';

    // Shopify-specific patterns
    const lower = availabilityStr.toLowerCase();
    if (lower.includes('in stock') || lower.includes('available')) return 'in_stock';
    if (lower.includes('out of stock') || lower.includes('sold out') || lower.includes('unavailable')) return 'out_of_stock';

    return availabilityStr;
  }
}
