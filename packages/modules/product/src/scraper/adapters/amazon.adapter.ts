import type { ScraperAdapter, ScrapedProduct, ScrapedVariant } from '../scraper.interface';

// ─── Amazon Scraper ───────────────────────────────────────────────────────────

const AMAZON_DOMAIN_PATTERN =
  /^https?:\/\/(?:www\.)?amazon\.(com|co\.uk|de|fr|it|es|co\.jp|ca|in|com\.au|com\.br|com\.mx|nl|se|pl|sg|ae|sa|eg)\//i;

// ── HTML parsing helpers ──────────────────────────────────────────────────

function extractTextBetween(source: string, startPattern: string, endPattern: string): string {
  const startIdx = source.search(new RegExp(startPattern, 'i'));
  if (startIdx === -1) return '';

  const adjustedStart = source.indexOf('>', startIdx) + 1;
  if (adjustedStart === 0) return '';

  const endIdx = source.search(new RegExp(endPattern, 'i'));
  if (endIdx === -1) return '';

  return source.substring(adjustedStart, endIdx).trim();
}

function extractAttribute(source: string, tagPattern: string, attrName: string): string {
  const tagRegex = new RegExp(tagPattern, 'gi');
  const match = tagRegex.exec(source);
  if (!match) return '';

  const fullTag = match[0];
  const attrRegex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
  const attrMatch = attrRegex.exec(fullTag);
  return attrMatch?.[1] ?? '';
}

function extractAllAttributes(source: string, tagPattern: string, attrName: string): string[] {
  const tagRegex = new RegExp(tagPattern, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(source)) !== null) {
    const fullTag = match[0];
    const attrRegex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
    const attrMatch = attrRegex.exec(fullTag);
    if (attrMatch?.[1]) {
      results.push(attrMatch[1]);
    }
  }
  return results;
}

function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function extractPriceFromText(text: string): { price?: number; currency?: string } {
  if (!text) return {};

  // Common price patterns: $1,234.56, €1.234,56, ¥1,234
  const pricePatterns = [
    /(?:USD|US\s*\$|\$)\s*([\d,]+\.?\d*)/i,
    /(?:EUR|€)\s*([\d,.]+)/i,
    /(?:GBP|£)\s*([\d,]+\.?\d*)/i,
    /(?:JPY|¥)\s*([\d,]+)/i,
    /([\d,]+\.?\d*)\s*(?:USD|US\$|\$)/i,
    /([\d,.]+)\s*(?:EUR|€)/i,
    /([\d,]+\.?\d*)\s*(?:GBP|£)/i,
    /([\d,]+)\s*(?:JPY|¥)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      let numStr = match[1].replace(/,/g, '');
      // Handle European decimal format (1.234,56)
      if (numStr.match(/^\d+\.\d{3},\d{2}$/)) {
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      }
      const price = parseFloat(numStr);
      if (!isNaN(price)) {
        // Detect currency
        let currency = 'USD';
        const fullMatch = match[0].toUpperCase();
        if (fullMatch.includes('EUR') || fullMatch.includes('€')) currency = 'EUR';
        else if (fullMatch.includes('GBP') || fullMatch.includes('£')) currency = 'GBP';
        else if (fullMatch.includes('JPY') || fullMatch.includes('¥')) currency = 'JPY';
        return { price, currency };
      }
    }
  }

  return {};
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]!);
      // It could be an array of schemas
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }
  return null;
}

// ─── AmazonScraper ─────────────────────────────────────────────────────────

export class AmazonScraper implements ScraperAdapter {
  getPlatformName(): string {
    return 'Amazon';
  }

  canHandle(url: string): boolean {
    return AMAZON_DOMAIN_PATTERN.test(url);
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Try JSON-LD first as fallback, prefer DOM-like parsing for Amazon
      let scraped = this.parseAmazonDom(html);
      if (!scraped.title) {
        scraped = this.parseFromJsonLd(html, url);
      }

      return {
        sourceUrl: url,
        platform: 'Amazon',
        title: cleanHtmlEntities(scraped.title || this.fallbackTitle(html)),
        description: cleanHtmlEntities(scraped.description || ''),
        images: (scraped.images ?? []).length > 0 ? scraped.images! : this.extractImages(html),
        variants: (scraped.variants ?? []).length > 0 ? scraped.variants! : this.extractVariants(html),
        price: scraped.price,
        currency: scraped.currency,
        category: scraped.category,
        specs: scraped.specs ?? {},
        brand: scraped.brand || this.extractBrand(html),
        availability: scraped.availability,
      };
    } catch (err) {
      // Final fallback: return minimal data
      return {
        sourceUrl: url,
        platform: 'Amazon',
        title: '',
        description: '',
        images: [],
        variants: [],
        specs: {},
      };
    }
  }

  private parseAmazonDom(html: string): Partial<ScrapedProduct> {
    // Extract title from #productTitle
    const titleMatch = /id=["']productTitle["'][^>]*>([^<]*)</i.exec(html);
    const title = titleMatch?.[1]?.trim() ?? '';

    // Extract price - try multiple Amazon price selectors
    const pricePatterns = [
      /class=["']a-price["'][^>]*>[\s\S]*?<span[^>]*class=["']a-offscreen["'][^>]*>([^<]*)</i,
      /data-a-color=["']price["'][^>]*>[\s\S]*?<span[^>]*class=["']a-offscreen["'][^>]*>([^<]*)</i,
      /id=["']priceblock_(?:our|deal)price["'][^>]*>([^<]*)</i,
      /class=["']a-price-whole["'][^>]*>([^<]*)</i,
    ];

    let priceText = '';
    for (const pattern of pricePatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        priceText = match[1].trim();
        break;
      }
    }
    const priceData = extractPriceFromText(priceText);

    // Extract images
    const images: string[] = [];
    // Try the data-old-hires attribute on img tags
    const hiresRegex = /data-old-hires=["']([^"']+)["']/gi;
    let hiresMatch: RegExpExecArray | null;
    while ((hiresMatch = hiresRegex.exec(html)) !== null) {
      if (hiresMatch[1]) images.push(hiresMatch[1]);
    }

    // Fall back to regular img tags with specific classes
    if (images.length === 0) {
      const imgRegex = /<img[^>]*src=["']([^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*>/gi;
      while ((hiresMatch = imgRegex.exec(html)) !== null) {
        const src = hiresMatch[1];
        if (src && !src.includes('sprite') && !src.includes('icon') && !src.includes('logo')) {
          // Convert thumbnail URL to full-size if possible
          const fullSize = src.replace(/\._AC_US\d+_\./, '._AC_SL1500_.');
          images.push(fullSize);
        }
      }
    }

    // Deduplicate
    const uniqueImages = [...new Set(images)];

    // Extract description from feature bullets
    const bulletPoints: string[] = [];
    const bulletRegex = /id=["']feature-bullets["'][\s\S]*?<ul[\s\S]*?<\/ul>/i;
    const bulletSection = bulletRegex.exec(html);
    if (bulletSection) {
      const liRegex = /<span[^>]*class=["']a-list-item["'][^>]*>([\s\S]*?)<\/span>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(bulletSection[0])) !== null) {
        const text = liMatch[1]!.replace(/<[^>]+>/g, '').trim();
        if (text) bulletPoints.push(text);
      }
    }

    // Extract specs from detail bullets / product overview table
    const specs: Record<string, string> = {};
    const detailRegex = /id=["']detailBullets(?:_wrapper)?_feature_div["'][\s\S]*?<ul[\s\S]*?<\/ul>/i;
    const detailSection = detailRegex.exec(html) ?? bulletSection;
    if (detailSection) {
      const specLiRegex = /<li[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi;
      let specMatch: RegExpExecArray | null;
      while ((specMatch = specLiRegex.exec(detailSection[0])) !== null) {
        const key = specMatch[1]?.replace(/<[^>]+>/g, '').replace(/:\s*$/, '').trim();
        const value = specMatch[2]?.replace(/<[^>]+>/g, '').trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    }

    // Also check the product overview table (prodDetails)
    const prodDetailRegex = /id=["']prodDetails["'][\s\S]*?<table[\s\S]*?<\/table>/i;
    const prodDetailMatch = prodDetailRegex.exec(html);
    if (prodDetailMatch) {
      const rowRegex = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowRegex.exec(prodDetailMatch[0])) !== null) {
        const key = rowMatch[1]?.replace(/<[^>]+>/g, '').trim();
        const value = rowMatch[2]?.replace(/<[^>]+>/g, '').trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    }

    // Extract brand
    const brand = this.extractBrand(html);

    // Extract availability
    const availRegex = /id=["']availability["'][^>]*>([\s\S]*?)<\/(?:div|span)>/i;
    const availMatch = availRegex.exec(html);
    const availability = availMatch?.[1]?.replace(/<[^>]+>/g, '').trim();

    // Extract category from breadcrumb
    const breadcrumbRegex = /id=["']wayfinding-breadcrumbs_feature_div["'][\s\S]*?<\/div>/i;
    const breadcrumbMatch = breadcrumbRegex.exec(html);
    let category = '';
    if (breadcrumbMatch) {
      const crumbRegex = /<a[^>]*>([^<]*)<\/a>/gi;
      const crumbs: string[] = [];
      let crumbMatch: RegExpExecArray | null;
      while ((crumbMatch = crumbRegex.exec(breadcrumbMatch[0])) !== null) {
        if (crumbMatch[1]) crumbs.push(crumbMatch[1].trim());
      }
      category = crumbs.join(' > ');
    }

    return {
      title,
      price: priceData.price,
      currency: priceData.currency ?? 'USD',
      images: uniqueImages.filter(Boolean),
      description: bulletPoints.join('\n'),
      specs,
      brand,
      availability,
      category,
      variants: [],
    };
  }

  private parseFromJsonLd(html: string, url: string): Partial<ScrapedProduct> {
    const jsonLd = extractJsonLd(html);
    if (!jsonLd) return {};

    return {
      title: (jsonLd.name as string) ?? '',
      description: (jsonLd.description as string) ?? '',
      images: Array.isArray(jsonLd.image) ? jsonLd.image as string[] : jsonLd.image ? [jsonLd.image as string] : [],
      price: jsonLd.offers
        ? typeof jsonLd.offers === 'object' && !Array.isArray(jsonLd.offers)
          ? parseFloat((jsonLd.offers as Record<string, unknown>).price as string ?? '0')
          : undefined
        : undefined,
      currency: jsonLd.offers && typeof jsonLd.offers === 'object' && !Array.isArray(jsonLd.offers)
        ? ((jsonLd.offers as Record<string, unknown>).priceCurrency as string)
        : undefined,
      brand: typeof jsonLd.brand === 'object' && jsonLd.brand !== null
        ? ((jsonLd.brand as Record<string, unknown>).name as string)
        : (jsonLd.brand as string),
      specs: {},
      variants: [],
    };
  }

  private extractBrand(html: string): string | undefined {
    const brandRegex = /id=["']bylineInfo["'][^>]*>([^<]*)</i;
    const brandMatch = brandRegex.exec(html);
    return brandMatch?.[1]?.trim();
  }

  private extractImages(html: string): string[] {
    const images: string[] = [];
    const imgRegex = /<img[^>]*src=["']([^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]!;
      if (!src.includes('sprite') && !src.includes('icon') && !src.includes('logo') && !src.includes('pixel')) {
        images.push(src);
      }
    }
    return [...new Set(images)].slice(0, 20);
  }

  private extractVariants(html: string): ScrapedVariant[] {
    const variants: ScrapedVariant[] = [];

    // Look for dropdown selects (size, color, etc.)
    const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
    let selectMatch: RegExpExecArray | null;
    while ((selectMatch = selectRegex.exec(html)) !== null) {
      const selectName = selectMatch[1]!.replace(/^dropdown_selected_/, '');
      const optionsHtml = selectMatch[2]!;

      const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
      let optionMatch: RegExpExecArray | null;
      while ((optionMatch = optionRegex.exec(optionsHtml)) !== null) {
        const value = optionMatch[1]!;
        const label = optionMatch[2]!.replace(/<[^>]+>/g, '').trim();
        if (value && value !== '-1' && value !== 'SELECT' && label) {
          variants.push({
            name: selectName,
            value: label,
          });
        }
      }
    }

    // Also check for swatch items
    const swatchRegex = /data-a-button-group[^>]*name=["']([^"']+)["'][\s\S]*?<\/div>/gi;
    let swatchMatch: RegExpExecArray | null;
    while ((swatchMatch = swatchRegex.exec(html)) !== null) {
      const groupName = swatchMatch[1]!;
      const swatchContent = swatchMatch[0];
      const buttonRegex = /<span[^>]*class=["'][^"']*(?:swatch|button)[^"']*["'][^>]*>([^<]+)<\/span>/gi;
      let buttonMatch: RegExpExecArray | null;
      while ((buttonMatch = buttonRegex.exec(swatchContent)) !== null) {
        const label = buttonMatch[1]!.trim();
        if (label) {
          variants.push({
            name: groupName,
            value: label,
          });
        }
      }
    }

    return variants;
  }

  private fallbackTitle(html: string): string {
    const ogMatch = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html);
    return ogMatch?.[1]?.trim() ?? '';
  }
}
