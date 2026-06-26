// WaterMart Admin API — AI Optimization Route
// POST /api/ai-optimize
//
// Accepts { scrapeResultId: string, targetLocales: string[] }
// Uses your API key (DeepSeek starting with sk-, or Claude starting with sk-ant-)
// Set AI_API_KEY env var

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ─── Request Schema ─────────────────────────────────────────────────────────

const requestSchema = z.object({
  scrapeResultId: z.string().min(1),
  targetLocales: z.array(z.string().min(2)).min(1),
});

// ─── Detect provider from key prefix ────────────────────────────────────────

function detectProvider(key: string): 'deepseek' | 'claude' {
  if (key.startsWith('sk-ant-')) return 'claude';
  return 'deepseek';
}

// ─── AI API call ────────────────────────────────────────────────────────────

async function callDeepSeek(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('DeepSeek returned empty response');
  return text;
}

async function callClaude(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 4096, temperature: 0.3,
      system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json() as { content: Array<{ type: string; text?: string }> };
  const text = data.content?.filter(b => b.type === 'text' && b.text).map(b => b.text!).join('\n').trim();
  if (!text) throw new Error('Claude returned empty response');
  return text;
}

// ─── Mock optimizer for when no API key is configured ───────────────────────

function mockOptimize(productName: string, locales: string[]) {
  const name = productName || 'Water Filter';
  const translations: Record<string, { title: string; description: string }> = {};
  for (const l of locales) {
    if (l === 'zh') translations.zh = { title: `${name} — 优质滤水系统 | 全球免邮`, description: `${name}采用先进过滤技术，去除99%杂质，保留有益矿物质。安装简便，是健康饮水的理想之选。` };
    else translations[l] = { title: `${name} — Premium Filtration | Free Shipping`, description: `${name} uses advanced filtration technology. Removes 99% of contaminants. Easy installation. Pure, healthy water.` };
  }
  return {
    enhancedTitle: `${name} — Advanced Filtration for Pure, Healthy Water`,
    enhancedDescription: `Experience pure, healthy water with ${name}. Our advanced filtration removes contaminants while preserving minerals. Easy to install and maintain.`,
    seoTitle: `Buy ${name} | WaterMart`.slice(0, 60),
    seoDescription: `Shop ${name} at WaterMart. Premium filtration, free shipping.`.slice(0, 160),
    suggestedTags: ['water-filter', 'filtration', 'healthy-living'],
    sellingPoints: ['Advanced filtration', 'Easy installation', 'Long-lasting performance', 'Certified quality', 'Satisfaction guaranteed'],
    translations,
  };
}

// ─── POST Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { scrapeResultId, targetLocales } = parsed.data;
    const { prisma } = await import('@watermart/core');

    const result = await prisma.scrapeResult.findUnique({ where: { id: scrapeResultId } });
    if (!result) return NextResponse.json({ error: 'ScrapeResult not found' }, { status: 404 });

    const rawData = JSON.parse(result.rawData);
    const productName: string = rawData.title ?? 'Product';

    // Try real AI API, fall back to mock
    const apiKey = process.env.AI_API_KEY || process.env.CLAUDE_API_KEY || '';
    let optimized: Record<string, unknown>;

    if (apiKey) {
      try {
        const systemPrompt = `You are a senior e-commerce merchandising expert. Optimize product listings for global marketplaces. Return ONLY valid JSON.`;
        const userPrompt = `Optimize this product for e-commerce:\n\nTitle: ${productName}\nDescription: ${rawData.description ?? ''}\nPrice: ${rawData.price ?? 'N/A'}\nBrand: ${rawData.brand ?? ''}\nPlatform: ${result.platform}\n\nTarget locales for translation: ${targetLocales.join(', ')}\n\nReturn JSON with fields: enhancedTitle, enhancedDescription, translations (Record<locale, {title, description}>), seoTitle (≤60 chars), seoDescription (≤160 chars), suggestedTags (5-10 array), sellingPoints (exactly 5 array).`;

        const provider = detectProvider(apiKey);
        const rawResponse = provider === 'deepseek'
          ? await callDeepSeek(systemPrompt, userPrompt, apiKey)
          : await callClaude(systemPrompt, userPrompt, apiKey);

        // Extract JSON from response
        let json = rawResponse.trim();
        const fence = json.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (fence?.[1]) json = fence[1].trim();
        const b1 = json.indexOf('{'), b2 = json.lastIndexOf('}');
        if (b1 !== -1 && b2 > b1) json = json.slice(b1, b2 + 1);
        optimized = JSON.parse(json);
      } catch (e) {
        console.warn('[ai-optimize] AI API call failed, using mock fallback:', e);
        optimized = mockOptimize(productName, targetLocales) as unknown as Record<string, unknown>;
      }
    } else {
      console.log('[ai-optimize] No AI_API_KEY set, using mock mode');
      optimized = mockOptimize(productName, targetLocales) as unknown as Record<string, unknown>;
    }

    await prisma.scrapeResult.update({
      where: { id: scrapeResultId },
      data: { status: 'OPTIMIZED', aiOptimized: JSON.stringify(optimized) },
    });

    return NextResponse.json({ success: true, optimized, scrapeResultId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
