// ─── Perceptual Hash (pHash) ──────────────────────────────────────────────────
// Pure TypeScript implementation — NO native dependencies, NO canvas, NO sharp.
//
// Algorithm (based on phash.org / hackerfactor.com):
// 1. Resize image to 32x32 pixels using bilinear interpolation
// 2. Convert to grayscale: gray = 0.299*R + 0.587*G + 0.114*B
// 3. Apply 2D Discrete Cosine Transform (DCT-II) to the 32x32 matrix
// 4. Extract the top-left 8x8 of DCT coefficients (low frequencies = perceptual features)
// 5. Compute the MEAN of the 64 values
// 6. Binarize: each pixel > mean -> 1, else -> 0
// 7. Convert 64 bits to a 16-character hex string
//
// DCT formula used (DCT-II):
//   DCT(u,v) = a(u) * a(v) * SUM[x=0..N-1] SUM[y=0..N-1] pixel(x,y)
//              * cos[(2x+1) * u * pi / (2*N)]
//              * cos[(2y+1) * v * pi / (2*N)]
//
//   where a(0) = sqrt(1/N), a(k) = sqrt(2/N) for k > 0

// ─── Grayscale Conversion ────────────────────────────────────────────────────

/**
 * Convert RGBA pixel data to grayscale using luminance weights.
 * gray = 0.299*R + 0.587*G + 0.114*B
 */
function rgbaToGrayscale(pixels: Uint8ClampedArray, width: number, height: number): Float64Array {
  const totalPixels = width * height;
  const gray = new Float64Array(totalPixels);
  const srcLength = pixels.length;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    if (offset + 2 < srcLength) {
      const r = pixels[offset]!;
      const g = pixels[offset + 1]!;
      const b = pixels[offset + 2]!;
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    } else {
      // Last pixel might be truncated — use 0
      gray[i] = 0;
    }
  }

  return gray;
}

// ─── Bilinear Interpolation Resize ───────────────────────────────────────────

/**
 * Resize a grayscale image to target dimensions using bilinear interpolation.
 *
 * @param src - Source pixel values in row-major order
 * @param srcWidth - Source image width
 * @param srcHeight - Source image height
 * @param dstWidth - Target width (default 32)
 * @param dstHeight - Target height (default 32)
 * @returns Resized pixel values in row-major order
 */
function bilinearResize(
  src: Float64Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number = 32,
  dstHeight: number = 32,
): Float64Array {
  const dst = new Float64Array(dstWidth * dstHeight);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let dstY = 0; dstY < dstHeight; dstY++) {
    const srcY = dstY * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcHeight - 1);
    const dy = srcY - y0;

    const row0Start = y0 * srcWidth;
    const row1Start = y1 * srcWidth;

    for (let dstX = 0; dstX < dstWidth; dstX++) {
      const srcX = dstX * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const dx = srcX - x0;

      // Four surrounding pixels
      const topLeft = src[row0Start + x0] ?? 0;
      const topRight = src[row0Start + x1] ?? 0;
      const bottomLeft = src[row1Start + x0] ?? 0;
      const bottomRight = src[row1Start + x1] ?? 0;

      // Bilinear interpolation
      const top = topLeft + (topRight - topLeft) * dx;
      const bottom = bottomLeft + (bottomRight - bottomLeft) * dx;
      dst[dstY * dstWidth + dstX] = top + (bottom - top) * dy;
    }
  }

  return dst;
}

// ─── 2D Discrete Cosine Transform (DCT-II) ───────────────────────────────────

/**
 * Compute the 2D DCT-II on an NxN matrix.
 *
 * Formula:
 *   DCT(u,v) = a(u) * a(v) *
 *     SUM[x=0..N-1] SUM[y=0..N-1] f(x,y) *
 *       cos((2x+1) * u * pi / (2N)) *
 *       cos((2y+1) * v * pi / (2N))
 *
 * where:
 *   a(0) = sqrt(1/N)
 *   a(k) = sqrt(2/N) for k > 0
 *
 * @param matrix - Input NxN matrix in row-major order
 * @param N - Matrix dimension
 * @returns DCT coefficients in row-major order
 */
function computeDCT2D(matrix: Float64Array, N: number): Float64Array {
  const result = new Float64Array(N * N);
  const sqrt1OverN = Math.sqrt(1.0 / N);
  const sqrt2OverN = Math.sqrt(2.0 / N);

  // Pre-compute cosines for efficiency: cos[(2x+1)*k*pi/(2*N)]
  const cosTable: Float64Array[] = [];
  const twoN = 2 * N;
  for (let k = 0; k < N; k++) {
    const row = new Float64Array(N);
    for (let x = 0; x < N; x++) {
      row[x] = Math.cos(((2 * x + 1) * k * Math.PI) / twoN);
    }
    cosTable[k] = row;
  }

  for (let u = 0; u < N; u++) {
    const au = u === 0 ? sqrt1OverN : sqrt2OverN;
    const cosU = cosTable[u]!;

    for (let v = 0; v < N; v++) {
      const av = v === 0 ? sqrt1OverN : sqrt2OverN;
      const cosV = cosTable[v]!;

      let sum = 0.0;
      for (let x = 0; x < N; x++) {
        const rowStart = x * N;
        const cosUX = cosU[x]!;
        for (let y = 0; y < N; y++) {
          sum += (matrix[rowStart + y] ?? 0) * cosUX * cosV[y]!;
        }
      }

      result[u * N + v] = au * av * sum;
    }
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the perceptual hash of an image from raw RGBA pixel data.
 *
 * @param pixels - RGBA pixel data (Uint8ClampedArray) with 4 channels per pixel
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns 16-character lowercase hexadecimal string representing the 64-bit hash
 */
export function computePerceptualHash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  // Step 1: Convert RGBA to grayscale
  const gray = rgbaToGrayscale(pixels, width, height);

  // Step 2: Resize to 32x32 using bilinear interpolation
  const resized = bilinearResize(gray, width, height, 32, 32);

  // Step 3: Apply 2D DCT
  const dct = computeDCT2D(resized, 32);

  // Step 4: Extract top-left 8x8 of DCT coefficients
  const lowFreq = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      lowFreq[u * 8 + v] = dct[u * 32 + v] ?? 0;
    }
  }

  // Step 5: Compute the MEAN of the 8x8 DCT values
  let sum = 0.0;
  for (let i = 0; i < 64; i++) {
    sum += lowFreq[i] ?? 0;
  }
  const mean = sum / 64;

  // Step 6: Binarize — each value above mean = 1, else = 0
  let bits = 0n;
  for (let i = 0; i < 64; i++) {
    if ((lowFreq[i] ?? 0) > mean) {
      bits |= (1n << BigInt(63 - i));
    }
  }

  // Step 7: Convert 64 bits to 16-character hex string
  return bits.toString(16).padStart(16, '0');
}

/**
 * Compute the Hamming distance between two perceptual hashes.
 *
 * The Hamming distance is the number of bit positions where the hashes differ.
 * A distance of 0 means identical images, 64 means completely opposite.
 *
 * @param hash1 - First 16-character hex hash string
 * @param hash2 - Second 16-character hex hash string
 * @returns Number of differing bits (0-64)
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error(
      `Hash lengths must be equal. Got ${hash1.length} and ${hash2.length}.`,
    );
  }

  const a = BigInt('0x' + hash1);
  const b = BigInt('0x' + hash2);
  let xor = a ^ b;
  let distance = 0;

  // Brian Kernighan's algorithm for counting set bits
  while (xor > 0n) {
    xor &= xor - 1n;
    distance++;
  }

  return distance;
}

// ─── Legacy aliases for backward compatibility (index.ts exports) ────────────

export { computePerceptualHash as computeHash };
export { computeDCT2D as dct2d };
export { bilinearResize as resizeImage };
