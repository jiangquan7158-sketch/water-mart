import type { ScraperAdapter, ScrapedProduct, ScrapedVariant } from '../scraper.interface';

// ─── Generic Scraper ──────────────────────────────────────────────────────────
// Catch-all adapter that tries every possible method to extract product data

export class GenericScraper implements ScraperAdapter {
  getPlatformName(): string {
    return 'generic';
  }

  canHandle(_url: string): boolean {
    return true;
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
      const platform = this.extractDomain(finalUrl);

      // Try every strategy and merge results
      const jsonLdData = this.parseJsonLd(html);
      const ogData = this.parseOpenGraph(html);
      const twitterData = this.parseTwitterCard(html);
      const metaData = this.parseMetaTags(html);
      const domData = this.parseDomFallback(html);

      // Merge with priority: JSON-LD > OpenGraph > Twitter > Meta > DOM
      const merged: ScrapedProduct = {
        sourceUrl: finalUrl,
        platform,
        title:
          jsonLdData.title ||
          ogData.title ||
          twitterData.title ||
          domData.title ||
          metaData.title ||
          '',
        description:
          jsonLdData.description ||
          ogData.description ||
          twitterData.description ||
          metaData.description ||
          domData.description ||
          '',
        images: this.mergeImages([
          jsonLdData.images ?? [],
          ogData.images ?? [],
          twitterData.images ?? [],
          domData.images ?? [],
        ]),
        variants: (jsonLdData.variants ?? []).length > 0 ? jsonLdData.variants! : (domData.variants ?? []),
        price: jsonLdData.price ?? ogData.price ?? domData.price,
        currency: jsonLdData.currency ?? ogData.currency ?? domData.currency,
        category: jsonLdData.category || ogData.category,
        specs: { ...domData.specs, ...jsonLdData.specs, ...ogData.specs },
        brand: jsonLdData.brand || ogData.brand || domData.brand,
        availability: jsonLdData.availability || ogData.availability || domData.availability,
      };

      return merged;
    } catch (err) {
      return {
        sourceUrl: url,
        platform: this.extractDomain(url),
        title: '',
        description: '',
        images: [],
        variants: [],
        specs: {},
      };
    }
  }

  // ── Domain extraction ────────────────────────────────────────────────────

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      // Return the main domain name (e.g., "example" from "www.example.com")
      const hostParts = parsed.hostname.split('.');
      // Remove common TLDs and subdomains to get the main domain
      const knownTlds = ['com', 'org', 'net', 'io', 'co', 'de', 'fr', 'uk', 'jp', 'ca', 'au', 'br', 'mx', 'nl', 'se', 'pl', 'sg', 'ae', 'sa', 'eg', 'in', 'it', 'es', 'ru'];
      // Find the domain name (second-to-last part, or third-to-last for .co.uk style)
      if (hostParts.length >= 3) {
        const secondLevel = hostParts[hostParts.length - 2];
        if (secondLevel && knownTlds.includes(secondLevel)) {
          return hostParts[hostParts.length - 3] ?? parsed.hostname;
        }
      }
      if (hostParts.length >= 2) {
        return hostParts[hostParts.length - 2] ?? parsed.hostname;
      }
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  // ── JSON-LD Parsing ──────────────────────────────────────────────────────

  private parseJsonLd(html: string): Partial<ScrapedProduct> {
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]!);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;

          // Check for Product type
          const type = item['@type'];
          const types = Array.isArray(type) ? type : type ? [type] : [];

          if (types.some((t: string) => t === 'Product' || t === 'Offer')) {
            const result: Partial<ScrapedProduct> = {};

            // If it's an Offer, grab the itemOffered
            let productData = item as Record<string, unknown>;
            if (types.includes('Offer') && !types.includes('Product')) {
              if (productData.itemOffered) {
                productData = productData.itemOffered as Record<string, unknown>;
              }
            }

            result.title = (productData.name as string) ?? '';
            result.description = (productData.description as string) ?? '';

            // Images
            if (Array.isArray(productData.image)) {
              result.images = productData.image.map((img: unknown) =>
                typeof img === 'string' ? img
                  : typeof img === 'object' && img !== null
                    ? ((img as Record<string, unknown>).url as string) ?? ((img as Record<string, unknown>).contentUrl as string) ?? ''
                    : ''
              ).filter(Boolean);
            } else if (typeof productData.image === 'string') {
              result.images = [productData.image];
            } else if (typeof productData.image === 'object' && productData.image !== null) {
              result.images = [
                ((productData.image as Record<string, unknown>).url as string) ??
                ((productData.image as Record<string, unknown>).contentUrl as string) ?? '',
              ].filter(Boolean);
            } else {
              result.images = [];
            }

            // Price from offers
            const offers = productData.offers;
            const offerList = offers
              ? Array.isArray(offers) ? offers : [offers]
              : [];

            if (offerList.length > 0) {
              for (const offer of offerList) {
                if (offer && typeof offer === 'object') {
                  const o = offer as Record<string, unknown>;
                  if (o.price && !result.price) {
                    const price = parseFloat(String(o.price));
                    if (!isNaN(price)) {
                      result.price = price;
                      result.currency = (o.priceCurrency as string) ?? 'USD';
                      result.availability = this.parseSchemaAvailability(o.availability as string);
                    }
                  }
                }
              }

              // Variants from multiple offers
              if (offerList.length > 1) {
                result.variants = [];
                for (const offer of offerList) {
                  if (offer && typeof offer === 'object') {
                    const o = offer as Record<string, unknown>;
                    result.variants.push({
                      name: (o.name as string) ?? 'Option',
                      value: (o.name as string) ?? (o.sku as string) ?? 'Default',
                      price: o.price ? parseFloat(String(o.price)) : undefined,
                      sku: (o.sku as string),
                    });
                  }
                }
              } else {
                result.variants = [];
              }
            } else {
              result.variants = [];
            }

            // Brand
            if (productData.brand) {
              if (typeof productData.brand === 'string') {
                result.brand = productData.brand;
              } else if (typeof productData.brand === 'object') {
                result.brand = ((productData.brand as Record<string, unknown>).name as string) ?? '';
              }
            }

            // Category
            if (productData.category) {
              if (typeof productData.category === 'string') {
                result.category = productData.category;
              } else if (typeof productData.category === 'object') {
                result.category = ((productData.category as Record<string, unknown>).name as string) ?? '';
              }
            }

            // Specs from additionalProperty
            const specs: Record<string, string> = {};
            if (Array.isArray(productData.additionalProperty)) {
              for (const prop of productData.additionalProperty) {
                if (prop && typeof prop === 'object') {
                  const p = prop as Record<string, unknown>;
                  const n = (p.name as string) ?? '';
                  const v = (p.value as string) ?? '';
                  if (n && v) specs[n] = v;
                }
              }
            }
            result.specs = specs;

            // Availability for the product itself
            if (!result.availability && productData.availability) {
              result.availability = this.parseSchemaAvailability(productData.availability as string);
            }

            return result;
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    return {};
  }

  // ── OpenGraph Parsing ────────────────────────────────────────────────────

  private parseOpenGraph(html: string): Partial<ScrapedProduct> {
    const getProp = (property: string): string => {
      const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try property= first, then name=
      const regex = new RegExp(
        `<meta[^>]*(?:property=["']${escaped}["']|name=["']${escaped}["'])[^>]*content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const match = regex.exec(html);
      return match?.[1]?.trim() ?? '';
    };

    const title = getProp('og:title');
    const description = getProp('og:description');
    const image = getProp('og:image');

    // Product-specific OG tags
    const priceAmount = getProp('product:price:amount');
    const priceCurrency = getProp('product:price:currency');
    const brand = getProp('product:brand');
    const availability = getProp('product:availability');
    const category = getProp('product:category');
    const condition = getProp('product:condition');

    const price = priceAmount ? parseFloat(priceAmount) : undefined;

    // Multiple OG images
    const images: string[] = [];
    if (image) images.push(image);
    const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    let ogMatch: RegExpExecArray | null;
    while ((ogMatch = ogImageRegex.exec(html)) !== null) {
      if (ogMatch[1] && !images.includes(ogMatch[1])) {
        images.push(ogMatch[1]);
      }
    }

    return {
      title,
      description,
      images,
      price: price && !isNaN(price) ? price : undefined,
      currency: priceCurrency || undefined,
      brand: brand || undefined,
      availability: availability || undefined,
      category: category || undefined,
      specs: condition ? { Condition: condition } : {},
      variants: [],
    };
  }

  // ── Twitter Card Parsing ─────────────────────────────────────────────────

  private parseTwitterCard(html: string): Partial<ScrapedProduct> {
    const getMeta = (name: string): string => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `<meta[^>]*name=["']twitter:${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const match = regex.exec(html);
      return match?.[1]?.trim() ?? '';
    };

    const title = getMeta('title');
    const description = getMeta('description');
    const image = getMeta('image');

    return {
      title,
      description,
      images: image ? [image] : [],
      variants: [],
      specs: {},
    };
  }

  // ── Standard Meta Tags ───────────────────────────────────────────────────

  private parseMetaTags(html: string): Partial<ScrapedProduct> {
    const getMetaName = (name: string): string => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const match = regex.exec(html);
      return match?.[1]?.trim() ?? '';
    };

    return {
      title: '',
      description: getMetaName('description'),
      images: [],
      variants: [],
      specs: {},
    };
  }

  // ── DOM Fallback ─────────────────────────────────────────────────────────

  private parseDomFallback(html: string): Partial<ScrapedProduct> {
    // Title: h1 > title tag > first heading
    let title = '';
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (h1Match) {
      title = h1Match[1]!.replace(/<[^>]+>/g, '').trim();
    }
    if (!title) {
      const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      title = titleTag?.[1]?.trim() ?? '';
    }

    // Description: look for common description containers
    let description = '';
    const descPatterns = [
      /<div[^>]*(?:class|id)=["'][^"']*(?:description|product-description|productDescription|details|overview)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*(?:class|id)=["'][^"']*(?:description|product-description|details)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]*data-testid=["']description["'][^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pattern of descPatterns) {
      const m = pattern.exec(html);
      if (m?.[1]) {
        description = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (description.length > 20) break;
      }
    }

    // If no description div found, try to extract all text content from the body
    if (!description) {
      // Try meta description
      const metaDesc = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html);
      if (metaDesc?.[1]) {
        description = metaDesc[1].trim();
      }
    }

    // Images
    const images = this.extractProductImages(html);

    // Price patterns
    const priceData = this.extractPriceFromHtml(html);

    // Brand
    const brand = this.extractBrand(html);

    // Availability
    const availability = this.extractAvailability(html);

    // Variants from select elements
    const variants = this.extractVariantsFromSelects(html);

    // Specs from definition lists and tables
    const specs = this.extractSpecs(html);

    return {
      title,
      description,
      images,
      variants,
      price: priceData.price,
      currency: priceData.currency,
      brand,
      availability,
      specs,
      category: undefined,
    };
  }

  // ── Image extraction ─────────────────────────────────────────────────────

  private extractProductImages(html: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    // Extract all img tags
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]!;
      if (!src || seen.has(src)) continue;
      if (src.startsWith('data:')) continue;
      if (src.includes('pixel') || src.includes('tracking') || src.includes('analytics')) continue;

      seen.add(src);

      // Score the image based on likelihood it's a product photo
      const altMatch = /alt=["']([^"']*)["']/i.exec(match[0]);
      const alt = altMatch?.[1]?.toLowerCase() ?? '';
      const classMatch = /class=["']([^"']*)["']/i.exec(match[0]);
      const className = classMatch?.[1]?.toLowerCase() ?? '';

      // Boost images that have product-related class names or alt text
      const productKeywords = ['product', 'gallery', 'main', 'hero', 'featured', 'zoom', 'thumbnail', 'preview'];
      const isGoodSrc = productKeywords.some((kw) => src.toLowerCase().includes(kw));
      const isGoodClass = productKeywords.some((kw) => className.includes(kw));
      const isGoodAlt = alt.length > 3 && !alt.includes('logo') && !alt.includes('icon');

      if (isGoodSrc || isGoodClass || isGoodAlt) {
        images.unshift(src); // Prioritize these
      } else {
        images.push(src);
      }
    }

    // Also check srcset for high-res versions
    const srcsetRegex = /<img[^>]*srcset=["']([^"']+)["'][^>]*>/gi;
    while ((match = srcsetRegex.exec(html)) !== null) {
      const srcset = match[1]!;
      // Parse srcset: URL descriptor, URL descriptor, ...
      const urlPattern = /(https?:\/\/[^\s,]+)/g;
      let urlMatch: RegExpExecArray | null;
      while ((urlMatch = urlPattern.exec(srcset)) !== null) {
        const src = urlMatch[1]!;
        if (!seen.has(src) && !src.startsWith('data:')) {
          seen.add(src);
          images.push(src);
        }
      }
    }

    // Also check data-src for lazy-loaded images
    const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
    while ((match = dataSrcRegex.exec(html)) !== null) {
      const src = match[1]!;
      if (!seen.has(src) && !src.startsWith('data:')) {
        seen.add(src);
        images.push(src);
      }
    }

    // De-duplicate preserving order
    const unique: string[] = [];
    const addedSet = new Set<string>();
    for (const img of images) {
      if (!addedSet.has(img)) {
        addedSet.add(img);
        unique.push(img);
      }
    }

    return unique.slice(0, 30);
  }

  // ── Price extraction ─────────────────────────────────────────────────────

  private extractPriceFromHtml(html: string): { price?: number; currency?: string } {
    // Try structured price selectors
    const pricePatterns = [
      // Class-based
      /<[^>]*class=["'][^"']*(?:price|amount|cost)[^"']*["'][^>]*>([^<]*)<\/[^>]+>/i,
      // Itemprop
      /<[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      // Data attributes
      /<[^>]*data-price=["']([^"']+)["'][^>]*>/i,
      // Schema.org
      /<[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ];

    for (const pattern of pricePatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        const cleaned = text.replace(/[^\d.,\-]/g, '');
        const parsed = parseFloat(cleaned.replace(/,/g, '.'));
        if (!isNaN(parsed) && parsed > 0) {
          // Detect currency
          let currency = 'USD';
          const context = html.substring(
            Math.max(0, match.index - 200),
            Math.min(html.length, match.index + 200),
          );
          if (context.includes('€') || context.includes('EUR')) currency = 'EUR';
          else if (context.includes('£') || context.includes('GBP')) currency = 'GBP';
          else if (context.includes('¥') || context.includes('JPY')) currency = 'JPY';
          else if (context.includes('₹') || context.includes('INR')) currency = 'INR';
          else if (context.includes('R$') || context.includes('BRL')) currency = 'BRL';
          else if (context.includes('$')) currency = 'USD';

          return { price: parsed, currency };
        }
      }
    }

    // Generic regex fallback for currency patterns
    const genericPricePatterns = [
      /(?:USD|US\s*\$|\$)\s*([\d,]+\.?\d{0,2})/i,
      /(?:EUR|€)\s*([\d,]+\.?\d{0,2})/i,
      /(?:GBP|£)\s*([\d,]+\.?\d{0,2})/i,
      /(?:JPY|¥)\s*([\d,]+)/i,
    ];

    for (const pattern of genericPricePatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const cleaned = match[1].replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed) && parsed > 0) {
          let currency = 'USD';
          const full = match[0].toUpperCase();
          if (full.includes('EUR') || full.includes('€')) currency = 'EUR';
          else if (full.includes('GBP') || full.includes('£')) currency = 'GBP';
          else if (full.includes('JPY') || full.includes('¥')) currency = 'JPY';
          return { price: parsed, currency };
        }
      }
    }

    return {};
  }

  // ── Brand extraction ─────────────────────────────────────────────────────

  private extractBrand(html: string): string | undefined {
    const brandPatterns = [
      /<[^>]*itemprop=["']brand["'][^>]*>[\s\S]*?<[^>]*itemprop=["']name["'][^>]*>([^<]*)</i,
      /<[^>]*class=["'][^"']*brand[^"']*["'][^>]*>([\s\S]*?)<\//i,
      /<[^>]*data-brand=["']([^"']+)["'][^>]*>/i,
      /<[^>]*id=["']brand["'][^>]*>([\s\S]*?)<\//i,
    ];

    for (const pattern of brandPatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const brand = match[1].replace(/<[^>]+>/g, '').trim();
        if (brand && brand.length < 100) return brand;
      }
    }

    return undefined;
  }

  // ── Availability extraction ──────────────────────────────────────────────

  private extractAvailability(html: string): string | undefined {
    const availPatterns = [
      /<[^>]*itemprop=["']availability["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      /<[^>]*itemprop=["']availability["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<[^>]*class=["'][^"']*(?:availability|stock|inventory)[^"']*["'][^>]*>([\s\S]*?)<\//i,
      /<[^>]*data-availability=["']([^"']+)["'][^>]*>/i,
    ];

    for (const pattern of availPatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const value = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
        if (value.includes('instock') || value.includes('in_stock') || value.includes('available') || value.includes('in stock')) {
          return 'in_stock';
        }
        if (value.includes('outofstock') || value.includes('out_of_stock') || value.includes('soldout') || value.includes('sold out') || value.includes('unavailable')) {
          return 'out_of_stock';
        }
        if (value.includes('preorder') || value.includes('pre_order')) {
          return 'pre_order';
        }
        if (value.includes('backorder') || value.includes('back_order')) {
          return 'back_order';
        }
        return value.substring(0, 50);
      }
    }

    return undefined;
  }

  // ── Variant extraction ───────────────────────────────────────────────────

  private extractVariantsFromSelects(html: string): ScrapedVariant[] {
    const variants: ScrapedVariant[] = [];

    const selectRegex = /<select[^>]*>[\s\S]*?<\/select>/gi;
    let selectMatch: RegExpExecArray | null;

    while ((selectMatch = selectRegex.exec(html)) !== null) {
      const selectHtml = selectMatch[0];

      // Skip selects that are NOT related to variants (like country selectors, language, etc.)
      if (
        /name=["'](?:country|language|currency|sort|filter|page|limit)/i.test(selectHtml) ||
        /class=["'][^"']*(?:country|language|currency|sort|filter|page|limit)/i.test(selectHtml)
      ) {
        continue;
      }

      // Get the label/name from the select's name attribute, aria-label, or nearby label
      let optionName = '';
      const nameMatch = /name=["']([^"']+)["']/i.exec(selectHtml);
      const ariaMatch = /aria-label=["']([^"']+)["']/i.exec(selectHtml);
      const idMatch = /id=["']([^"']+)["']/i.exec(selectHtml);

      if (ariaMatch?.[1]) {
        optionName = ariaMatch[1];
      } else if (nameMatch?.[1]) {
        optionName = nameMatch[1].replace(/[_-]/g, ' ');
      } else if (idMatch?.[1]) {
        // Try to find a label with for=idMatch[1]
        const labelRegex = new RegExp(
          `<label[^>]*for=["']${idMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<\\/label>`,
          'i',
        );
        const labelMatch = labelRegex.exec(html);
        if (labelMatch?.[1]) {
          optionName = labelMatch[1].trim();
        } else {
          optionName = idMatch[1].replace(/[_-]/g, ' ');
        }
      }

      if (!optionName || /^\s*$/.test(optionName)) {
        optionName = 'Option';
      }

      // Extract options
      const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
      let optMatch: RegExpExecArray | null;

      while ((optMatch = optionRegex.exec(selectHtml)) !== null) {
        const value = optMatch[1]!;
        const label = optMatch[2]!.replace(/<[^>]+>/g, '').trim();

        // Skip placeholder options
        if (!value && !label) continue;
        if (
          /select|choose|pick|--|please/i.test(label) &&
          label.length < 30
        ) {
          continue;
        }

        variants.push({
          name: optionName,
          value: label || value,
        });
      }
    }

    // Also check radio button groups
    const fieldsetRegex = /<fieldset[^>]*>[\s\S]*?<\/fieldset>/gi;
    let fsMatch: RegExpExecArray | null;

    while ((fsMatch = fieldsetRegex.exec(html)) !== null) {
      const fieldsetHtml = fsMatch[0];

      // Get the legend as option name
      const legendMatch = /<legend[^>]*>([^<]+)<\/legend>/i.exec(fieldsetHtml);
      const optName = legendMatch?.[1]?.trim() ?? 'Option';

      const radioRegex = /<input[^>]*type=["']radio["'][^>]*value=["']([^"']*)["'][^>]*>/gi;
      let radioMatch: RegExpExecArray | null;

      while ((radioMatch = radioRegex.exec(fieldsetHtml)) !== null) {
        const value = radioMatch[1]!;
        // Try to find associated label
        const idMatch2 = /id=["']([^"']+)["']/i.exec(radioMatch[0]);
        let label = value;
        if (idMatch2?.[1]) {
          const labelRegex = new RegExp(
            `<label[^>]*for=["']${idMatch2[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<\\/label>`,
            'i',
          );
          const labelMatch = labelRegex.exec(fieldsetHtml);
          if (labelMatch?.[1]) {
            label = labelMatch[1].trim();
          }
        }

        variants.push({
          name: optName,
          value: label,
        });
      }
    }

    return variants;
  }

  // ── Specs extraction ─────────────────────────────────────────────────────

  private extractSpecs(html: string): Record<string, string> {
    const specs: Record<string, string> = {};

    // Method 1: Definition lists (<dl>, <dt>, <dd>)
    const dlRegex = /<dl[^>]*>([\s\S]*?)<\/dl>/gi;
    let dlMatch: RegExpExecArray | null;

    while ((dlMatch = dlRegex.exec(html)) !== null) {
      const dlHtml = dlMatch[1]!;
      const dtRegex = /<dt[^>]*>([\s\S]*?)<\/dt>/gi;
      const ddRegex = /<dd[^>]*>([\s\S]*?)<\/dd>/gi;

      const terms: string[] = [];
      const descs: string[] = [];

      let dtMatch: RegExpExecArray | null;
      while ((dtMatch = dtRegex.exec(dlHtml)) !== null) {
        terms.push(dtMatch[1]!.replace(/<[^>]+>/g, '').trim());
      }

      let ddMatch: RegExpExecArray | null;
      while ((ddMatch = ddRegex.exec(dlHtml)) !== null) {
        descs.push(ddMatch[1]!.replace(/<[^>]+>/g, '').trim());
      }

      const maxLen = Math.min(terms.length, descs.length);
      for (let i = 0; i < maxLen; i++) {
        if (terms[i] && descs[i]) {
          specs[terms[i]!] = descs[i]!;
        }
      }
    }

    // Method 2: Tables (spec tables)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1]!;
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1]!;
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        const cells: string[] = [];
        let cellMatch: RegExpExecArray | null;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(cellMatch[1]!.replace(/<[^>]+>/g, '').trim());
        }

        if (cells.length >= 2 && cells[0] && cells[1]) {
          specs[cells[0]] = cells[1];
        }
      }
    }

    // Method 3: Div-based spec rows
    const specRowRegex = /<(?:div|span|li)[^>]*class=["'][^"']*(?:spec|attribute|feature|property)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|li)>/gi;
    let specMatch: RegExpExecArray | null;

    while ((specMatch = specRowRegex.exec(html)) !== null) {
      const content = specMatch[1]!;
      const parts = content.split(/<[^>]+>/);
      const texts = parts.map((p) => p.trim()).filter(Boolean);
      if (texts.length >= 2) {
        // Try to find a colon-separated pair
        const joined = texts.join(' ');
        const colonIdx = joined.indexOf(':');
        if (colonIdx > 0) {
          const key = joined.substring(0, colonIdx).trim();
          const value = joined.substring(colonIdx + 1).trim();
          if (key && value && key.length < 100 && value.length < 500) {
            specs[key] = value;
          }
        }
      }
    }

    return specs;
  }

  // ── Merge images ─────────────────────────────────────────────────────────

  private mergeImages(imageLists: string[][]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const list of imageLists) {
      for (const img of list) {
        if (!seen.has(img)) {
          seen.add(img);
          result.push(img);
        }
      }
    }

    return result;
  }

  // ── Schema.org availability parsing ──────────────────────────────────────

  private parseSchemaAvailability(value: string | undefined): string | undefined {
    if (!value) return undefined;
    if (value.includes('InStock')) return 'in_stock';
    if (value.includes('OutOfStock')) return 'out_of_stock';
    if (value.includes('PreOrder')) return 'pre_order';
    if (value.includes('BackOrder')) return 'back_order';
    if (value.includes('Discontinued')) return 'discontinued';
    if (value.includes('LimitedAvailability')) return 'limited';
    return value;
  }
}
