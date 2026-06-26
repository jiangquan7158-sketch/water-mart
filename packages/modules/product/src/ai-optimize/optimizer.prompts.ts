// ─── Optimization Prompt Templates ─────────────────────────────────────────────
// Claude API prompt templates for AI-powered e-commerce product optimization.

export const SYSTEM_PROMPT = `You are a senior e-commerce merchandising expert with 15 years of experience optimizing product listings for global marketplaces including Amazon, Shopify, eBay, AliExpress, Temu, and Walmart. You possess deep expertise in:

1. **Conversion-Optimized Copywriting** — you know exactly how to structure titles, descriptions, and bullet points that turn browsers into buyers. You understand psychological triggers, urgency, social proof, and benefit-driven language.

2. **Technical SEO** — you understand how search engines index and rank product pages. You know keyword density, LSI keywords, semantic search, and how to write meta tags that maximize click-through rates from SERPs.

3. **Cross-Cultural Localization** — you understand that direct translation loses marketing power. You adapt messaging for cultural context: what sells in Germany (precision, engineering) differs from what sells in Brazil (social proof, vivid benefits) or Japan (trust, detail, politeness).

4. **Competitive Pricing Intelligence** — you understand pricing psychology across markets: charm pricing, anchoring, decoy pricing, and regional willingness-to-pay. You factor in typical marketplace fees, shipping expectations, and competitor positioning.

5. **Product Taxonomy & Categorization** — you can identify the optimal category paths and tags that maximize discoverability within marketplace search algorithms.

## Your Optimization Methodology

For every product, you follow a structured analysis:

**Step 1: Identify the Core Pain Point**
What problem does this product solve? Who is the ideal customer? What are they struggling with before finding this solution?

**Step 2: Map Features to Benefits**
Every specification translates to a tangible benefit. "10,000 mAh battery" becomes "All-day power that keeps you untethered from outlets."

**Step 3: Differentiate**
What makes this product better than alternatives? Is it material quality? Price? Design? Warranty? Unique features?

**Step 4: Optimize for Discovery**
What would a motivated buyer type into a search bar? Include those terms naturally.

**Step 5: Localize, Don't Just Translate**
Adapt idioms, measurements, cultural references, and persuasion style for each locale.

## Strict Output Format

You MUST respond with ONLY a valid JSON object. No markdown fences, no explanatory text, no preamble. The response must start with "{" and end with "}". Every string must be properly escaped for JSON.`;

// ─── Prompt Builder ──────────────────────────────────────────────────────────

export interface OptimizationPromptInput {
  title: string;
  description: string;
  specs: Record<string, string>;
  price: number;
  currency: string;
  images: string[];
  platform: string;
}

export function buildOptimizationPrompt(
  rawData: {
    title: string;
    description: string;
    specs: Record<string, string>;
    price: number;
    currency: string;
    images: string[];
    platform: string;
  },
  targetLocales: string[],
  options?: {
    tone?: 'professional' | 'casual' | 'luxury';
    includeSeo?: boolean;
    includeTags?: boolean;
  },
): string {
  const tone = options?.tone ?? 'professional';
  const includeSeo = options?.includeSeo ?? true;
  const includeTags = options?.includeTags ?? true;

  const specsList = Object.entries(rawData.specs)
    .map(([key, value]) => `- **${key}:** ${value}`)
    .join('\n');

  const parts: string[] = [];

  // Header
  parts.push(`## Product Optimization Request`);
  parts.push(`\n**Source Platform:** ${rawData.platform}`);
  parts.push(`**Target Locales:** ${targetLocales.join(', ')}`);
  parts.push(`**Tone:** ${tone}`);
  parts.push(`**Include SEO:** ${includeSeo}`);
  parts.push(`**Include Tags:** ${includeTags}`);

  // Raw product data
  parts.push(`\n## Raw Product Data`);
  parts.push(`\n### Title`);
  parts.push(rawData.title || '(no title provided)');

  parts.push(`\n### Description`);
  parts.push(rawData.description || '(no description provided)');

  parts.push(`\n### Specifications`);
  parts.push(specsList || '(no specifications provided)');

  parts.push(`\n### Pricing`);
  parts.push(`Current price: ${rawData.price} ${rawData.currency}`);

  parts.push(`\n### Images`);
  parts.push(`${rawData.images.length} image(s) available`);
  if (rawData.images.length > 0) {
    parts.push(rawData.images.slice(0, 5).map((url) => `- ${url}`).join('\n'));
    if (rawData.images.length > 5) {
      parts.push(`- ... and ${rawData.images.length - 5} more`);
    }
  }

  // Tone-specific instructions
  const toneGuides: Record<string, string> = {
    professional: `Use authoritative, precise language. Emphasize specifications, certifications, and reliability. Suitable for B2B, industrial, medical, or technical products. Use industry terminology correctly. Focus on ROI and total cost of ownership.`,
    casual: `Use warm, friendly, conversational language. Write as if recommending to a friend. Emphasize ease of use, everyday benefits, and lifestyle improvement. Use contractions and relatable scenarios. Suitable for DTC, social commerce, and lifestyle products.`,
    luxury: `Use sophisticated, aspirational, sensory language. Emphasize craftsmanship, exclusivity, materials provenance, and heritage. Use evocative adjectives. Create desire through scarcity and prestige cues. Suitable for premium, designer, and high-end products.`,
  };

  parts.push(`\n## Tone Guide`);
  parts.push(toneGuides[tone] ?? toneGuides.professional!);

  // Instructions
  parts.push(`\n## Optimization Instructions`);

  parts.push(`\n### 1. Enhanced Title`);
  parts.push(`Rewrite the title to be more compelling, benefit-driven, and SEO-friendly.`);
  parts.push(`- Lead with the most important keyword (what the product IS)`);
  parts.push(`- Include brand if available`);
  parts.push(`- Add key differentiator (material, size, feature, use case)`);
  parts.push(`- Keep under 200 characters`);
  parts.push(`- Make it click-worthy and curiosity-provoking`);

  parts.push(`\n### 2. Enhanced Description`);
  parts.push(`Rewrite the description in a 3-section format:`);
  parts.push(``);
  parts.push(`**Section 1 — The Problem:** (1-2 sentences)`);
  parts.push(`Identify the pain point or unmet need the customer is experiencing. Make them feel understood. Use empathetic, relatable language.`);
  parts.push(``);
  parts.push(`**Section 2 — The Solution:** (3-5 sentences)`);
  parts.push(`Present the product features as benefits that directly solve the problem above. Reference specific specs from the raw data. Use concrete, specific language.`);
  parts.push(``);
  parts.push(`**Section 3 — Why Choose This:** (1-2 sentences)`);
  parts.push(`Give the compelling purchase reasons: quality guarantees, value proposition, unique selling points, social proof angle, or urgency drivers. Close with confidence.`);

  parts.push(`\n### 3. Translations`);
  parts.push(`Provide full translations of the enhanced title and description for each target locale: ${targetLocales.join(', ')}.`);
  parts.push(`- Preserve the marketing tone and persuasive power — do NOT do literal translations`);
  parts.push(`- Adapt measurements, currencies, and cultural references`);
  parts.push(`- Adjust persuasion style for each market's cultural norms`);
  parts.push(`- For locales you are less confident about, still provide your best translation`);

  if (includeSeo) {
    parts.push(`\n### 4. SEO Metadata`);
    parts.push(`- **seoTitle:** Create an SEO-optimized title (max 60 characters) designed for search engine results pages. Include primary keywords. Write for click-through, not just rankings.`);
    parts.push(`- **seoDescription:** Create a compelling meta description (max 160 characters) that summarizes the product's value proposition and includes a soft call-to-action.`);
  }

  if (includeTags) {
    parts.push(`\n### 5. Suggested Tags`);
    parts.push(`Suggest 5-8 relevant tags for product categorization and filtering. Tags should be:`);
    parts.push(`- Specific and descriptive (not generic like "product" or "item")`);
    parts.push(`- Lowercase with hyphens (e.g., "stainless-steel", "water-filter", "camping-gear")`);
    parts.push(`- Include: category tags, attribute tags, use-case tags, and audience tags`);
  }

  parts.push(`\n### 6. Key Selling Points`);
  parts.push(`Extract exactly 5 compelling selling points. Each should be:`);
  parts.push(`- One clear, impactful sentence`);
  parts.push(`- Focused on a specific benefit or differentiator`);
  parts.push(`- Written in persuasive marketing language`);
  parts.push(`- Backed by the product specifications when possible`);

  parts.push(`\n### 7. Competitive Price Range`);
  parts.push(`Based on the current price of ${rawData.price} ${rawData.currency}, the product features, and market positioning, suggest an optimal price range.`);
  parts.push(`- Provide min and max values in ${rawData.currency}`);
  parts.push(`- Include a brief rationale explaining your recommendation`);
  parts.push(`- Consider market positioning, competitor pricing, and perceived value`);

  // Output format
  parts.push(`\n## Required JSON Output`);
  parts.push(`\nRespond with ONLY this JSON structure (no markdown fences, no additional text):`);

  const jsonExample: Record<string, unknown> = {
    enhancedTitle: 'Compelling, benefit-driven, SEO-optimized product title',
    enhancedDescription: 'The Problem:\n[1-2 sentences about the pain point]\n\nThe Solution:\n[3-5 sentences about product features as benefits]\n\nWhy Choose This:\n[1-2 sentences with purchase reasons]',
    translations: targetLocales.reduce((acc, locale) => {
      (acc as Record<string, unknown>)[locale] = {
        title: 'Translated and localized title',
        description: 'Translated and localized 3-section description',
      };
      return acc;
    }, {} as Record<string, unknown>),
    sellingPoints: [
      'Compelling selling point 1',
      'Compelling selling point 2',
      'Compelling selling point 3',
      'Compelling selling point 4',
      'Compelling selling point 5',
    ],
    suggestedPrice: {
      min: rawData.price * 0.85,
      max: rawData.price * 1.25,
      rationale: 'Brief explanation of the price range recommendation based on market positioning',
    },
  };

  if (includeSeo) {
    jsonExample.seoTitle = 'SEO title under 60 characters with keywords';
    jsonExample.seoDescription = 'Compelling meta description under 160 characters with value proposition and soft CTA';
  }

  if (includeTags) {
    jsonExample.suggestedTags = ['tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5', 'tag-6', 'tag-7'];
  }

  parts.push(JSON.stringify(jsonExample, null, 2));

  return parts.join('\n');
}

// ─── Alias for backward compatibility with index.ts exports ──────────────────

export { SYSTEM_PROMPT as PRODUCT_OPTIMIZATION_SYSTEM_PROMPT };
