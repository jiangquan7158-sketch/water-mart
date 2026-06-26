// ─── Image Embedding Service ──────────────────────────────────────────────────
// Placeholder for real CLIP/vector embedding integration.
//
// When production-ready, this module will call a CLIP model endpoint (e.g.,
// Transformers.js running CLIP-ViT-B/32) to generate real semantic embeddings.
//
// For now, it produces consistent, deterministic 512-dimensional vectors derived
// from the input using a hash-based embedding approach. This is NOT random:
// the same input always produces the same output.
//
// The clear Interface below is designed so that the real implementation can be
// dropped in without changing any consumer code.

// ─── Interface for the real implementation ──────────────────────────────────

/**
 * Interface for image/text embedding generation.
 *
 * Real implementations would use:
 * - Transformers.js (CLIP): `pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32')`
 * - OpenAI CLIP API
 * - A self-hosted CLIP model service
 * - TensorFlow.js with a converted CLIP model
 */
export interface EmbeddingGenerator {
  /** Generate an embedding vector from an image URL */
  generateImageEmbedding(imageUrl: string): Promise<number[]>;

  /** Generate an embedding vector from text */
  generateTextEmbedding(text: string): Promise<number[]>;
}

// ─── Deterministic Hash-Based Embedding ─────────────────────────────────────

/**
 * Generate a 512-dimensional embedding vector deterministically from any string.
 *
 * Uses a two-stage process:
 * 1. Compute a 256-bit hash of the input (SHA-256 via Web Crypto, or pure JS fallback)
 * 2. Expand to 512 dimensions using a deterministic random walk seeded by the hash
 *
 * The same input ALWAYS produces the exact same 512-dim vector.
 * Vectors are L2-normalized to unit length.
 */
async function deterministicEmbedding(input: string): Promise<number[]> {
  const hashHex = await sha256Hex(input);
  return expandToEmbedding(hashHex, 512);
}

/**
 * Pure JavaScript SHA-256 implementation (FIPS 180-4).
 * Used when Web Crypto API is not available (e.g., Node.js without crypto global).
 */
function sha256Pure(data: string): number[] {
  // Encode string as UTF-8 bytes
  const msg: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const cp = data.codePointAt(i) ?? 0;
    if (cp < 0x80) {
      msg.push(cp);
    } else if (cp < 0x800) {
      msg.push(0xC0 | (cp >> 6));
      msg.push(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
      msg.push(0xE0 | (cp >> 12));
      msg.push(0x80 | ((cp >> 6) & 0x3F));
      msg.push(0x80 | (cp & 0x3F));
    } else {
      msg.push(0xF0 | (cp >> 18));
      msg.push(0x80 | ((cp >> 12) & 0x3F));
      msg.push(0x80 | ((cp >> 6) & 0x3F));
      msg.push(0x80 | (cp & 0x3F));
    }
    if (cp > 0xFFFF) i++; // Skip surrogate pair
  }

  // Padding
  const msgBitLen = msg.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) {
    msg.push(0x00);
  }

  // Append length as 64-bit big-endian
  const high = Math.floor(msgBitLen / 0x100000000);
  const low = msgBitLen >>> 0;
  msg.push((high >>> 24) & 0xFF, (high >>> 16) & 0xFF, (high >>> 8) & 0xFF, high & 0xFF);
  msg.push((low >>> 24) & 0xFF, (low >>> 16) & 0xFF, (low >>> 8) & 0xFF, low & 0xFF);

  // Initial hash values (first 32 bits of fractional parts of square roots of first 8 primes)
  const H: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  // Round constants (first 32 bits of fractional parts of cube roots of first 64 primes)
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // Process each 512-bit block
  for (let blockStart = 0; blockStart < msg.length; blockStart += 64) {
    const w = new Array<number>(64);
    for (let t = 0; t < 16; t++) {
      const off = blockStart + t * 4;
      w[t] = (msg[off]! << 24) | (msg[off + 1]! << 16) | (msg[off + 2]! << 8) | msg[off + 3]!;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (rightRotate(w[t - 15]!, 7) ^ rightRotate(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3));
      const s1 = (rightRotate(w[t - 2]!, 17) ^ rightRotate(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10));
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e!, 6) ^ rightRotate(e!, 11) ^ rightRotate(e!, 25);
      const ch = (e! & f!) ^ (~e! & g!);
      const temp1 = (h! + S1 + ch + K[t]! + w[t]!) >>> 0;
      const S0 = rightRotate(a!, 2) ^ rightRotate(a!, 13) ^ rightRotate(a!, 22);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d! + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0]! + a!) >>> 0;
    H[1] = (H[1]! + b!) >>> 0;
    H[2] = (H[2]! + c!) >>> 0;
    H[3] = (H[3]! + d!) >>> 0;
    H[4] = (H[4]! + e!) >>> 0;
    H[5] = (H[5]! + f!) >>> 0;
    H[6] = (H[6]! + g!) >>> 0;
    H[7] = (H[7]! + h!) >>> 0;
  }

  return H;
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

async function sha256Hex(input: string): Promise<string> {
  // Try Web Crypto API first (available in modern Node.js and browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to pure JS implementation
    }
  }

  // Pure JavaScript SHA-256 fallback
  const hash = sha256Pure(input);
  return hash.map((w) => w.toString(16).padStart(8, '0')).join('');
}

/**
 * Expand a hex hash string into a deterministic N-dimensional embedding vector.
 *
 * Uses the hash bits as seeds for a series of sin/cos rotations, creating
 * a pseudo-random but deterministic vector that is L2-normalized.
 */
function expandToEmbedding(hashHex: string, dimensions: number): number[] {
  // Convert hash to a sequence of numbers (each hex char = 4 bits)
  const seeds: number[] = [];
  for (let i = 0; i < hashHex.length; i++) {
    seeds.push(parseInt(hashHex[i]!, 16));
  }

  const embedding = new Array<number>(dimensions);

  for (let i = 0; i < dimensions; i++) {
    // Use a deterministic formula combining multiple seed values
    // This creates a pseudo-random but fully deterministic sequence
    const idx1 = i % seeds.length;
    const idx2 = (i * 7 + 3) % seeds.length;
    const idx3 = (i * 13 + 11) % seeds.length;

    const s1 = seeds[idx1]! / 16.0; // Normalize to [0, 1)
    const s2 = seeds[idx2]! / 16.0;
    const s3 = seeds[idx3]! / 16.0;

    // Use sinusoidal positional encoding style generation
    const angle = (s1 * Math.PI * 2) + (s2 * Math.PI);
    const value = Math.sin(angle * (i + 1) + s3 * Math.PI);

    embedding[i] = value;
  }

  // L2 normalize
  let sumSquares = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSquares += embedding[i]! * embedding[i]!;
  }
  const norm = Math.sqrt(sumSquares);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = embedding[i]! / norm;
    }
  }

  return embedding;
}

// ─── Exported Public API ────────────────────────────────────────────────────

/**
 * Generate an embedding vector for an image URL.
 *
 * CURRENT: Deterministic hash-based embedding derived from the URL.
 * PRODUCTION: Replace with CLIP vision transformer encoding:
 *   ```
 *   const clipModel = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
 *   const imageData = await fetch(imageUrl).then(r => r.arrayBuffer());
 *   const embedding = await clipModel(imageData);
 *   return Array.from(embedding.data);
 *   ```
 *
 * @param imageUrl - URL of the image to embed
 * @returns 512-dimensional normalized embedding vector
 */
export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  // Deterministic embedding from the URL string
  // In production, this would download the image and pass it through CLIP
  return deterministicEmbedding(`img:${imageUrl}`);
}

/**
 * Generate an embedding vector for text.
 *
 * CURRENT: Deterministic hash-based embedding derived from the text.
 * PRODUCTION: Replace with CLIP text encoder:
 *   ```
 *   const clipModel = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
 *   const embedding = await clipModel(text);
 *   return Array.from(embedding.data);
 *   ```
 *
 * @param text - The text to embed
 * @returns 512-dimensional normalized embedding vector
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  return deterministicEmbedding(`txt:${text}`);
}

// ─── Service Class for DI ───────────────────────────────────────────────────

/**
 * Embedding service class implementing the EmbeddingGenerator interface.
 * Can be dependency-injected and swapped with a real CLIP implementation.
 */
export class ImageEmbeddingService implements EmbeddingGenerator {
  private readonly dimensions: number = 512;

  async generateImageEmbedding(imageUrl: string): Promise<number[]> {
    return generateImageEmbedding(imageUrl);
  }

  async generateTextEmbedding(text: string): Promise<number[]> {
    return generateTextEmbedding(text);
  }

  get embeddingDimensions(): number {
    return this.dimensions;
  }
}
