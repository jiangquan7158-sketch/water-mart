// ─── AI Product Optimizer Service ──────────────────────────────────────────────
// Multi-provider AI integration: DeepSeek (primary) + Claude (fallback)
//
// Features:
// - Auto-detects API provider from key prefix (sk-ant-* = Claude, sk-* = DeepSeek)
// - Zod schema validation of AI responses
// - Exponential backoff retry (3 attempts: 1s, 2s, 4s delays)
// - Rate limiting (max 5 concurrent requests)
// - LRU cache (100 entries) keyed by content hash
// - Graceful fallback with best-effort JSON extraction
//
// DeepSeek API docs: https://api-docs.deepseek.com/
// DeepSeek V4 Pro endpoint: https://api.deepseek.com/v1/chat/completions
// Model: deepseek-chat

import { z } from 'zod';
import {
  SYSTEM_PROMPT as BUILD_OPTIMIZATION_SYSTEM_PROMPT,
  buildOptimizationPrompt,
} from './optimizer.prompts';

// ─── Zod Response Schema ─────────────────────────────────────────────────────

const translationValueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const suggestedPriceSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
  rationale: z.string().min(1),
});

const optimizationResponseSchema = z.object({
  enhancedTitle: z.string().min(1),
  enhancedDescription: z.string().min(1),
  translations: z.record(z.string().min(2), translationValueSchema),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  suggestedTags: z.array(z.string().min(1)).min(1).max(15).optional(),
  sellingPoints: z.array(z.string().min(1)).length(5),
  suggestedPrice: suggestedPriceSchema,
});

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface AIOptimizedProduct {
  enhancedTitle: string;
  enhancedDescription: string;
  translations: Record<string, { title: string; description: string }>;
  seoTitle: string;
  seoDescription: string;
  suggestedTags: string[];
  sellingPoints: string[];
  suggestedPrice: { min: number; max: number; rationale: string };
}

export interface OptimizationOptions {
  tone?: 'professional' | 'casual' | 'luxury';
  includeSeo?: boolean;
  includeTags?: boolean;
}

export interface OptimizationRawInput {
  title: string;
  description: string;
  specs: Record<string, string>;
  price: number;
  currency: string;
  images: string[];
  platform: string;
}

// ─── LRU Cache ───────────────────────────────────────────────────────────────

class LRUCache<V> {
  private readonly maxSize: number;
  private readonly map: Map<string, V>;

  constructor(maxSize: number) { this.maxSize = maxSize; this.map = new Map(); }

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) { this.map.delete(key); }
    else if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}

// ─── Content Hash ────────────────────────────────────────────────────────────

function computeContentHash(input: OptimizationRawInput, targetLocales: string[], options?: OptimizationOptions): string {
  const canonical = JSON.stringify({
    title: input.title, description: input.description, specs: input.specs,
    price: input.price, currency: input.currency, platform: input.platform,
    locales: [...targetLocales].sort(), tone: options?.tone ?? 'professional',
    includeSeo: options?.includeSeo ?? true, includeTags: options?.includeTags ?? true,
  });
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) { hash ^= canonical.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}

// ─── Provider Detection ──────────────────────────────────────────────────────

type AIProvider = 'deepseek' | 'claude' | 'unknown';

function detectProvider(apiKey: string): AIProvider {
  if (apiKey.startsWith('sk-ant-')) return 'claude';
  if (apiKey.startsWith('sk-')) return 'deepseek';
  return 'unknown';
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function callDeepSeekApi(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`DeepSeek API error ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('DeepSeek API returned empty response');
  return text;
}

async function callClaudeApi(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 4096, temperature: 0.3,
      system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Claude API error ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text?: string }> };
  const text = data.content?.filter(b => b.type === 'text' && b.text).map(b => b.text!).join('\n').trim();
  if (!text) throw new Error('Claude API returned empty response');
  return text;
}

function callAI(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const provider = detectProvider(apiKey);
  if (provider === 'deepseek') return callDeepSeekApi(systemPrompt, userMessage, apiKey);
  if (provider === 'claude') return callClaudeApi(systemPrompt, userMessage, apiKey);
  throw new Error(`Unknown API provider. Key should start with "sk-" (DeepSeek) or "sk-ant-" (Claude). Got: ${apiKey.slice(0, 10)}...`);
}

// ─── Concurrency + Retry ─────────────────────────────────────────────────────

class ConcurrencyLimiter {
  private readonly max: number;
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(max: number) { this.max = max; }

  async acquire(): Promise<void> {
    if (this.active < this.max) { this.active++; return; }
    return new Promise<void>(resolve => { this.waiters.push(() => { this.active++; resolve(); }); });
  }

  release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) queueMicrotask(next);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delays = [1000, 2000, 4000]): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try { return await fn(); } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      if (/401|403|429/.test(msg)) throw lastError;
      if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[attempt] ?? delays[delays.length - 1]!)); }
    }
  }
  throw lastError;
}

// ─── JSON Extraction ─────────────────────────────────────────────────────────

function extractBestEffortJson(rawText: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let text = rawText.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) text = fence[1].trim();
  const b1 = text.indexOf('{'), b2 = text.lastIndexOf('}');
  if (b1 === -1 || b2 <= b1) return result;
  text = text.slice(b1, b2 + 1);

  try { const p = JSON.parse(text); Object.assign(result, p); return result; } catch { /* continue */ }

  const es = (k: string) => { const m = new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's').exec(text); return m?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'); };
  result.enhancedTitle = es('enhancedTitle');
  result.enhancedDescription = es('enhancedDescription');
  result.seoTitle = es('seoTitle');
  result.seoDescription = es('seoDescription');

  const tagsM = /"suggestedTags"\s*:\s*\[([^\]]*)\]/s.exec(text);
  if (tagsM?.[1]) { const tg: string[] = []; let m; const re = /"([^"]+)"/g; while ((m = re.exec(tagsM[1])) !== null) tg.push(m[1]!); if (tg.length) result.suggestedTags = tg; }

  const spM = /"sellingPoints"\s*:\s*\[([^\]]*)\]/s.exec(text);
  if (spM?.[1]) { const sp: string[] = []; let m; const re = /"((?:[^"\\]|\\.)*)"/g; while ((m = re.exec(spM[1])) !== null) sp.push(m[1]!.replace(/\\"/g, '"')); if (sp.length === 5) result.sellingPoints = sp; }

  const prM = /"suggestedPrice"\s*:\s*\{([^}]*)\}/s.exec(text);
  if (prM?.[1]) {
    const mn = /"min"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(prM[1]);
    const mx = /"max"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(prM[1]);
    const rt = /"rationale"\s*:\s*"([^"]*)"/.exec(prM[1]);
    if (mn?.[1] && mx?.[1]) result.suggestedPrice = { min: parseFloat(mn[1]), max: parseFloat(mx[1]), rationale: rt?.[1]?.replace(/\\"/g, '"') ?? '' };
  }

  return result;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

function defaultTags(raw: OptimizationRawInput): string[] {
  const stop = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','shall','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','and','or','not','no','but','if','then','else','when','up','down','out','off','over','under','again','further','its','it','this','that']);
  const tags: string[] = [];
  for (const w of raw.title.toLowerCase().replace(/[^a-z0-9\s-]/g,'').split(/\s+/)) { if (w.length > 2 && !stop.has(w) && !tags.includes(w)) tags.push(w); if (tags.length >= 8) break; }
  if (tags.length < 5) { for (const k of Object.keys(raw.specs)) { const t = k.toLowerCase().replace(/[^a-z0-9]+/g,'-'); if (t.length > 2 && !tags.includes(t)) tags.push(t); if (tags.length >= 8) break; } }
  return tags;
}

function defaultPoints(raw: OptimizationRawInput): string[] {
  const p: string[] = [];
  p.push(raw.title ? `Premium quality ${raw.title.toLowerCase()} for reliable performance` : 'Premium quality for reliable performance');
  p.push(raw.price > 0 ? `Exceptional value at ${raw.price} ${raw.currency}` : 'Exceptional value on the market');
  const specs = Object.entries(raw.specs);
  if (specs.length >= 2) { p.push(`Features ${specs[0]![0].toLowerCase()}: ${specs[0]![1]}`); p.push(`Engineered with ${specs[1]![0].toLowerCase()}: ${specs[1]![1]}`); }
  else if (specs.length === 1) { p.push(`Features ${specs[0]![0].toLowerCase()}: ${specs[0]![1]}`); p.push('Manufactured to high quality standards'); }
  else { p.push('Manufactured to high quality standards'); p.push('Versatile design for many applications'); }
  p.push('Backed by our customer satisfaction commitment');
  return p.slice(0, 5);
}

// ─── AI Optimizer Service ────────────────────────────────────────────────────

export class AIOptimizerService {
  private readonly apiKey: string;
  private readonly cache = new LRUCache<AIOptimizedProduct>(100);
  private readonly limiter = new ConcurrencyLimiter(5);

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.AI_API_KEY ?? process.env.CLAUDE_API_KEY ?? '';
    if (!key) {
      throw new Error(
        'AI API key is required. Set AI_API_KEY env var (DeepSeek key starting with sk-) or CLAUDE_API_KEY (Claude key starting with sk-ant-).',
      );
    }
    this.apiKey = key;
  }

  async optimize(rawData: OptimizationRawInput, targetLocales: string[], options?: OptimizationOptions): Promise<AIOptimizedProduct> {
    const cacheKey = computeContentHash(rawData, targetLocales, options);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const userPrompt = buildOptimizationPrompt(rawData, targetLocales, options);
    await this.limiter.acquire();

    try {
      const rawResponse = await withRetry(() => callAI(BUILD_OPTIMIZATION_SYSTEM_PROMPT, userPrompt, this.apiKey));
      const result = this.parseAndValidate(rawResponse, rawData, targetLocales, options);
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.limiter.release();
    }
  }

  private parseAndValidate(rawText: string, rawData: OptimizationRawInput, targetLocales: string[], options?: OptimizationOptions): AIOptimizedProduct {
    let jsonText = rawText.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence?.[1]) jsonText = fence[1].trim();
    const b1 = jsonText.indexOf('{'), b2 = jsonText.lastIndexOf('}');
    if (b1 !== -1 && b2 > b1) jsonText = jsonText.slice(b1, b2 + 1);

    try {
      const parsed = JSON.parse(jsonText);
      const validated = optimizationResponseSchema.parse(parsed);
      return this.normalize(validated, rawData, targetLocales, options);
    } catch { /* fall through */ }

    const extracted = extractBestEffortJson(rawText);
    return this.buildFallback(extracted, rawData, targetLocales, options);
  }

  private normalize(v: z.infer<typeof optimizationResponseSchema>, raw: OptimizationRawInput, locales: string[], opts?: OptimizationOptions): AIOptimizedProduct {
    const seo = opts?.includeSeo ?? true;
    const tags = opts?.includeTags ?? true;
    const tr: Record<string, { title: string; description: string }> = {};
    for (const l of locales) tr[l] = v.translations[l] ?? { title: v.enhancedTitle, description: v.enhancedDescription };
    return {
      enhancedTitle: v.enhancedTitle, enhancedDescription: v.enhancedDescription, translations: tr,
      seoTitle: seo ? (v.seoTitle ?? v.enhancedTitle.slice(0, 60)) : '',
      seoDescription: seo ? (v.seoDescription ?? v.enhancedDescription.replace(/\n/g, ' ').slice(0, 160)) : '',
      suggestedTags: tags ? (v.suggestedTags ?? defaultTags(raw)) : [],
      sellingPoints: v.sellingPoints, suggestedPrice: v.suggestedPrice,
    };
  }

  private buildFallback(ext: Record<string, unknown>, raw: OptimizationRawInput, locales: string[], opts?: OptimizationOptions): AIOptimizedProduct {
    const seo = opts?.includeSeo ?? true;
    const tags = opts?.includeTags ?? true;
    const title = (ext.enhancedTitle as string) || raw.title || 'Untitled';
    const desc = (ext.enhancedDescription as string) || raw.description || '';
    const tr: Record<string, { title: string; description: string }> = {};
    for (const l of locales) tr[l] = { title, description: desc };
    return {
      enhancedTitle: title, enhancedDescription: desc, translations: tr,
      seoTitle: seo ? ((ext.seoTitle as string) || title.slice(0, 60)) : '',
      seoDescription: seo ? ((ext.seoDescription as string) || desc.replace(/\n/g, ' ').slice(0, 160)) : '',
      suggestedTags: tags ? ((ext.suggestedTags as string[]) ?? defaultTags(raw)) : [],
      sellingPoints: (ext.sellingPoints as string[])?.length === 5 ? ext.sellingPoints as string[] : defaultPoints(raw),
      suggestedPrice: (ext.suggestedPrice as { min: number; max: number; rationale: string }) ?? { min: Math.round(raw.price * 0.85 * 100) / 100, max: Math.round(raw.price * 1.25 * 100) / 100, rationale: 'Default range based on current price' },
    };
  }
}

export { BUILD_OPTIMIZATION_SYSTEM_PROMPT };
