import type { ScraperAdapter, ScrapedProduct, ScrapedVariant } from '../scraper.interface';

// ─── AliExpress Scraper ───────────────────────────────────────────────────────

const ALIEXPRESS_PATTERN =
  /^https?:\/\/(?:www\.)?(?:aliexpress\.(?:com|us|ru)|(?:[a-z]{2}\.)?aliexpress\.com)\/(?:item\/|store\/product\/)/i;

export class AliExpressScraper implements ScraperAdapter {
  getPlatformName(): string {
    return 'AliExpress';
  }

  canHandle(url: string): boolean {
    return ALIEXPRESS_PATTERN.test(url);
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const finalUrl = response.url;

      // Strategy 1: Extract from embedded window.runParams.data
      const runParamsData = this.extractRunParams(html);
      if (runParamsData && (runParamsData.title || runParamsData.productTitle)) {
        return this.buildFromRunParams(runParamsData, finalUrl);
      }

      // Strategy 2: Extract from pageData JSON
      const pageData = this.extractPageData(html);
      if (pageData && pageData.title) {
        return this.buildFromPageData(pageData, finalUrl);
      }

      // Strategy 3: Fallback with meta tags / DOM
      return this.fallbackParse(html, finalUrl);
    } catch (err) {
      return {
        sourceUrl: url,
        platform: 'AliExpress',
        title: '',
        description: '',
        images: [],
        variants: [],
        specs: {},
      };
    }
  }

  // ── RunParams Extraction ─────────────────────────────────────────────────

  private extractRunParams(html: string): Record<string, unknown> | null {
    // window.runParams = {...}
    const runParamsRegex = /window\.runParams\s*=\s*({[\s\S]*?});/;
    const match = runParamsRegex.exec(html);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    // runParams is sometimes assigned to a variable
    const dataRegex = /var\s+data\s*=\s*window\.runParams\s*=\s*({[\s\S]*?});/;
    const dataMatch = dataRegex.exec(html);
    if (dataMatch?.[1]) {
      try {
        return JSON.parse(dataMatch[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    return null;
  }

  private buildFromRunParams(
    params: Record<string, unknown>,
    url: string,
  ): ScrapedProduct {
    // AliExpress stores product data in different formats
    const title =
      (params.productTitle as string) ??
      (params.subject as string) ??
      (params.title as string) ??
      '';

    const description =
      (params.description as string) ?? '';

    // Images from imagePath or imageList or imageUrls
    const images: string[] = [];
    if (params.imagePath && typeof params.imagePath === 'string') {
      images.push(params.imagePath);
    }
    if (Array.isArray(params.imageList)) {
      for (const img of params.imageList) {
        if (typeof img === 'string') images.push(img);
        else if (img && typeof img === 'object') {
          images.push(
            ((img as Record<string, unknown>).url as string) ??
              ((img as Record<string, unknown>).imagePath as string) ??
              '',
          );
        }
      }
    }
    if (Array.isArray(params.imageUrls)) {
      for (const img of params.imageUrls) {
        if (typeof img === 'string') images.push(img);
      }
    }

    // Price
    const priceInfo = this.extractAliPrice(params);

    // Variants from sku data
    const variants = this.extractAliVariants(params);

    // Specs from props or attributes
    const specs = this.extractAliSpecs(params);

    return {
      sourceUrl: url,
      platform: 'AliExpress',
      title,
      description,
      images: [...new Set(images)].filter(Boolean),
      variants,
      price: priceInfo.price,
      currency: priceInfo.currency,
      category: (params.categoryName as string) ?? (params.cateName as string),
      specs,
      brand: (params.brandName as string) ?? (params.brand as string),
      availability: this.parseAliAvailability(params),
    };
  }

  // ── PageData Extraction ──────────────────────────────────────────────────

  private extractPageData(html: string): Record<string, unknown> | null {
    // Try data-modules pattern
    const dataModRegex = /data-modules=["']({[\s\S]*?})["']/;
    const modMatch = dataModRegex.exec(html);
    if (modMatch?.[1]) {
      try {
        const decoded = modMatch[1].replace(/&quot;/g, '"');
        return JSON.parse(decoded) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    // Try the pageData script tag
    const pageDataRegex = /<script[^>]*>\s*window\.pageData\s*=\s*({[\s\S]*?});\s*<\/script>/;
    const pdMatch = pageDataRegex.exec(html);
    if (pdMatch?.[1]) {
      try {
        return JSON.parse(pdMatch[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    return null;
  }

  private buildFromPageData(
    data: Record<string, unknown>,
    url: string,
  ): ScrapedProduct {
    const productInfo =
      (data.productInfoComponent as Record<string, unknown>) ??
      (data.product as Record<string, unknown>) ??
      data;

    const title =
      (productInfo.title as string) ??
      (productInfo.productTitle as string) ??
      '';

    const description =
      (productInfo.description as string) ?? '';

    const images: string[] = [];
    if (Array.isArray(productInfo.imageList)) {
      for (const img of productInfo.imageList) {
        if (typeof img === 'string') images.push(img);
        else if (img && typeof img === 'object') {
          images.push(
            ((img as Record<string, unknown>).url as string) ??
              ((img as Record<string, unknown>).imageUrl as string) ??
              '',
          );
        }
      }
    }
    if (Array.isArray(productInfo.images)) {
      for (const img of productInfo.images) {
        if (typeof img === 'string') images.push(img);
      }
    }

    const priceInfo = this.extractAliPrice(productInfo);
    const variants = this.extractAliVariants(productInfo);
    const specs = this.extractAliSpecs(productInfo);

    return {
      sourceUrl: url,
      platform: 'AliExpress',
      title,
      description,
      images: [...new Set(images)].filter(Boolean),
      variants,
      price: priceInfo.price,
      currency: priceInfo.currency,
      category: (productInfo.categoryName as string),
      specs,
      brand: (productInfo.brandName as string) ?? (productInfo.brand as string),
      availability: this.parseAliAvailability(productInfo),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private extractAliPrice(
    data: Record<string, unknown>,
  ): { price?: number; currency?: string } {
    // Get price from various AliExpress data paths
    const priceSources = [
      data.originalPrice,
      data.price,
      data.minPrice,
      data.maxPrice,
      data.formatedPrice,
      data.formattedPrice,
      data.activityOriginalPrice,
    ];

    let price: number | undefined;
    let priceStr: string | undefined;

    for (const src of priceSources) {
      if (src === undefined || src === null) continue;
      if (typeof src === 'number' && !isNaN(src)) {
        price = src;
        break;
      }
      if (typeof src === 'string') {
        priceStr = src;
        break;
      }
    }

    if (!price && priceStr) {
      // Parse price string like "US $12.34"
      const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        price = parsed;
      }
    }

    // Detect currency from data
    let currency = 'USD';
    const currencyInfo = data.currencyCode ?? data.currency ?? data.priceCurrency;
    if (typeof currencyInfo === 'string') {
      currency = currencyInfo.toUpperCase();
    } else if (priceStr) {
      // Try to detect from price string
      if (priceStr.includes('€') || priceStr.includes('EUR')) currency = 'EUR';
      else if (priceStr.includes('₽') || priceStr.includes('RUB')) currency = 'RUB';
      else if (priceStr.includes('R$') || priceStr.includes('BRL')) currency = 'BRL';
    }

    return { price, currency };
  }

  private extractAliVariants(data: Record<string, unknown>): ScrapedVariant[] {
    const variants: ScrapedVariant[] = [];

    // Check sku property data
    const skuModule = data.skuModule ?? data.skuBase ?? data.skuProps;
    if (skuModule && typeof skuModule === 'object') {
      const skuData = skuModule as Record<string, unknown>;

      // AliExpress stores variants as skuPriceList or skuMap
      const skuList = skuData.skuPriceList ?? skuData.skuMap ?? skuData.productSKUPropertyList;

      if (Array.isArray(skuList)) {
        for (const sku of skuList) {
          if (sku && typeof sku === 'object') {
            const s = sku as Record<string, unknown>;
            variants.push({
              name: (s.skuAttr as string) ?? (s.skuPropertyName as string) ?? (s.propertyName as string) ?? '',
              value: (s.skuVal as string) ?? (s.skuPropertyValue as string) ?? (s.propertyValueDisplayName as string) ?? '',
              price: typeof s.price === 'number' ? s.price : undefined,
              stock: typeof s.stock === 'number' ? s.stock
                : typeof s.skuStock === 'number' ? s.skuStock
                : typeof s.inventory === 'number' ? s.inventory
                : undefined,
              sku: (s.skuCode as string) ?? (s.skuId as string)
                ? String(s.skuId)
                : undefined,
            });
          }
        }
      }

      // If no variants from SKU list, check property list (e.g. color/size options)
      if (variants.length === 0) {
        const propsList = skuData.productSKUPropertyList ?? skuData.props ?? skuData.properties;

        if (Array.isArray(propsList)) {
          for (const prop of propsList) {
            if (prop && typeof prop === 'object') {
              const p = prop as Record<string, unknown>;
              const propName = (p.skuPropertyName as string) ?? (p.name as string) ?? '';

              const values = p.skuPropertyValues ?? p.values ?? p.propertyValues;
              if (Array.isArray(values)) {
                for (const val of values) {
                  if (val && typeof val === 'object') {
                    const v = val as Record<string, unknown>;
                    variants.push({
                      name: propName,
                      value: (v.propertyValueDisplayName as string) ?? (v.displayName as string) ?? (v.name as string) ?? '',
                      stock: undefined,
                    });
                  } else if (typeof val === 'string') {
                    variants.push({
                      name: propName,
                      value: val,
                      stock: undefined,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return variants;
  }

  private extractAliSpecs(data: Record<string, unknown>): Record<string, string> {
    const specs: Record<string, string> = {};

    // Check props / htmlModule
    const propsModule = data.props ?? data.propsModule ?? data.htmlModule;
    if (propsModule && typeof propsModule === 'object') {
      const pm = propsModule as Record<string, unknown>;

      // AliExpress sometimes stores specs as an array of {name, value} pairs
      const attrList = pm.attributes ?? pm.attrList ?? pm.productAttributeList ?? pm.propsList;
      if (Array.isArray(attrList)) {
        for (const attr of attrList) {
          if (attr && typeof attr === 'object') {
            const a = attr as Record<string, unknown>;
            const name = (a.attrName as string) ?? (a.name as string) ?? (a.attributeName as string) ?? '';
            const value = (a.attrValue as string) ?? (a.value as string) ?? (a.attributeValue as string) ?? '';
            if (name && value) {
              specs[name] = value;
            }
          }
        }
      }

      // HTML module might contain product description in raw HTML
      if (pm.htmlDetail && typeof pm.htmlDetail === 'string') {
        // Strip HTML tags from specs extracted from description
        const detailText = pm.htmlDetail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (detailText) {
          specs['fullDescription'] = detailText.substring(0, 5000);
        }
      }
    }

    // Depth/weight info from component modules
    const commonModule = data.commonModule ?? data.webCommonModule;
    if (commonModule && typeof commonModule === 'object') {
      const cm = commonModule as Record<string, unknown>;
      if (cm.weight) specs['Weight'] = String(cm.weight);
      if (cm.packageWidth) specs['Package Width'] = String(cm.packageWidth);
      if (cm.packageHeight) specs['Package Height'] = String(cm.packageHeight);
      if (cm.packageLength) specs['Package Length'] = String(cm.packageLength);
    }

    return specs;
  }

  private parseAliAvailability(data: Record<string, unknown>): string | undefined {
    const availability = data.availability ?? data.stockStatus ?? data.availQuantity;

    if (typeof availability === 'string') return availability;
    if (typeof availability === 'number' && availability > 0) return 'in_stock';
    if (typeof availability === 'number' && availability === 0) return 'out_of_stock';

    const totalStock = data.totalStock ?? data.totalAvailQuantity ?? data.totalAvailableQty;
    if (typeof totalStock === 'number') {
      return totalStock > 0 ? 'in_stock' : 'out_of_stock';
    }

    return undefined;
  }

  // ── Fallback parse ───────────────────────────────────────────────────────

  private fallbackParse(html: string, url: string): ScrapedProduct {
    // Meta tags
    const getMeta = (name: string): string => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const match = regex.exec(html);
      return match?.[1]?.trim() ?? '';
    };

    const title = getMeta('og:title') || this.titleFromHtml(html);
    const description = getMeta('og:description') || getMeta('description');
    const image = getMeta('og:image');

    // Images from data-src (AliExpress lazy loads)
    const images: string[] = [];
    if (image) images.push(image);

    const dataSrcRegex = /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
    let match: RegExpExecArray | null;
    while ((match = dataSrcRegex.exec(html)) !== null) {
      if (match[1]) images.push(match[1]);
    }

    // Price patterns in HTML
    const priceMatch = /(?:\$|€|US\s*\$)\s*([\d,.]+)/.exec(html);
    let price: number | undefined;
    let currency: string | undefined;
    if (priceMatch?.[1]) {
      const cleaned = priceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        price = parsed;
        currency = priceMatch[0].includes('€') ? 'EUR' : 'USD';
      }
    }

    // Product image gallery
    const imgRegex = /<img[^>]*src=["']([^"']*(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*>/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1] && !match[1].includes('icon') && !match[1].includes('logo') && !match[1].includes('banner')) {
        // AliExpress CDN URL: remove size suffix
        const cleaned = match[1].replace(/_\d+x\d+Q\d+_?/, '_');
        images.push(cleaned.replace(/\.jpg_.*/, '.jpg'));
      }
    }

    return {
      sourceUrl: url,
      platform: 'AliExpress',
      title,
      description,
      images: [...new Set(images)].filter(Boolean).slice(0, 20),
      variants: [],
      price,
      currency,
      category: undefined,
      specs: {},
      brand: undefined,
      availability: undefined,
    };
  }

  private titleFromHtml(html: string): string {
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
    const match = h1Regex.exec(html);
    return match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
  }
}
