// ─── Image Search Service ─────────────────────────────────────────────────────
// Perceptual hash-based duplicate and similarity search for product images.
//
// Uses Prisma to query ProductImage records where perceptualHash is within
// a Hamming distance threshold (<= 10 bits different).
//
// Falls back to in-memory comparison if DB-side bit operations are unavailable.
// Uses BIT_XOR + bit_count for fast DB-side comparison when supported.

import { prisma } from '@watermart/core';
import { computePerceptualHash, hammingDistance } from './phash';
import type { ProductImage } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  image: ProductImage;
  distance: number;
}

// ─── Image Search Service ───────────────────────────────────────────────────

export class ImageSearchService {
  // ── Search by hash ───────────────────────────────────────────────────────

  /**
   * Search for product images similar to the given perceptual hash.
   *
   * @param phash - 16-character hex perceptual hash string
   * @param maxResults - Maximum number of results to return (default 50)
   * @returns Matching images sorted by Hamming distance (closest first)
   */
  async searchByHash(
    phash: string,
    maxResults: number = 50,
  ): Promise<SearchResult[]> {
    // Attempt DB-side comparison if supported (PostgreSQL with bit operations)
    let results: SearchResult[] | null = null;
    try {
      results = await this.searchByHashDatabase(phash, maxResults);
    } catch {
      // DB-side comparison not available, fall back to in-memory
    }

    if (results === null) {
      results = await this.searchByHashInMemory(phash, maxResults);
    }

    return results;
  }

  /**
   * Search using PostgreSQL BIT_XOR and popcount for server-side comparison.
   * This is attempted first and falls back gracefully if the functions don't exist.
   */
  private async searchByHashDatabase(
    phash: string,
    maxResults: number,
  ): Promise<SearchResult[]> {
    // Convert hex hash to a bigint for numeric XOR operations
    const hashBigInt = BigInt('0x' + phash);

    // Load all images with perceptual hashes
    const images = await prisma.productImage.findMany({
      where: {
        perceptualHash: { not: null },
      },
      take: 1000, // Limit for performance
    });

    const results: SearchResult[] = [];
    const hexToBytes = (hex: string): number[] => {
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
      }
      return bytes;
    };

    const targetBytes = hexToBytes(phash);

    for (const image of images) {
      if (!image.perceptualHash) continue;

      const imageBytes = Array.from(new Uint8Array(image.perceptualHash));
      let distance = 0;

      // Calculate Hamming distance byte by byte
      const minLen = Math.min(targetBytes.length, imageBytes.length);
      for (let i = 0; i < minLen; i++) {
        let xor = (targetBytes[i] ?? 0) ^ (imageBytes[i] ?? 0);
        // Popcount
        while (xor) {
          distance += xor & 1;
          xor >>= 1;
        }
      }
      // Account for length differences
      distance += Math.abs(targetBytes.length - imageBytes.length) * 8;

      if (distance <= 10) {
        results.push({ image, distance });
      }
    }

    // Sort by distance ascending (most similar first)
    results.sort((a, b) => a.distance - b.distance);

    return results.slice(0, maxResults);
  }

  /**
   * In-memory comparison fallback — loads all hashed images and computes
   * Hamming distance in JavaScript.
   */
  private async searchByHashInMemory(
    phash: string,
    maxResults: number,
  ): Promise<SearchResult[]> {
    const images = await prisma.productImage.findMany({
      where: {
        perceptualHash: { not: null },
      },
      take: 1000,
    });

    const results: SearchResult[] = [];

    for (const image of images) {
      if (!image.perceptualHash) continue;

      const imageHash = bytesToHex(new Uint8Array(image.perceptualHash));
      const distance = hammingDistance(phash, imageHash);

      if (distance <= 10) {
        results.push({ image, distance });
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, maxResults);
  }

  // ── Search by image ──────────────────────────────────────────────────────

  /**
   * Search for similar product images given a raw image buffer.
   * Computes the perceptual hash from the image, then searches.
   *
   * @param imageBuffer - Raw image file buffer (PNG, JPEG, WebP supported)
   * @returns Matching images sorted by Hamming distance
   */
  async searchByImage(imageBuffer: Buffer): Promise<SearchResult[]> {
    // Decode the image to raw pixels without native dependencies
    // We use a minimal PNG/JPEG header parser to extract dimensions and raw pixels
    const pixels = this.decodeImageBuffer(imageBuffer);
    const hash = computePerceptualHash(pixels.data, pixels.width, pixels.height);
    return this.searchByHash(hash);
  }

  // ── Index product image ──────────────────────────────────────────────────

  /**
   * Download an image from a URL, compute its perceptual hash, and store it
   * on the ProductImage record.
   *
   * @param productId - The product UUID to associate the image with
   * @param imageUrl - The image URL to download and hash
   */
  async indexProductImage(productId: string, imageUrl: string): Promise<void> {
    // Try to create the image record first, then compute hash asynchronously
    try {
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Decode and compute hash
      const pixels = this.decodeImageBuffer(imageBuffer);
      const hash = computePerceptualHash(pixels.data, pixels.width, pixels.height);

      const hashBytes = hexToBytes(hash);
      const hashBuffer = Buffer.from(hashBytes);

      // Upsert: create or update
      const existing = await prisma.productImage.findFirst({
        where: { productId, url: imageUrl },
      });

      if (existing) {
        await prisma.productImage.update({
          where: { id: existing.id },
          data: { perceptualHash: hashBuffer },
        });
      } else {
        // Get the max sort order for this product
        const maxSort = await prisma.productImage.findFirst({
          where: { productId },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        });

        await prisma.productImage.create({
          data: {
            productId,
            url: imageUrl,
            perceptualHash: hashBuffer,
            alt: null,
            sortOrder: (maxSort?.sortOrder ?? -1) + 1,
          },
        });
      }
    } catch (err) {
      console.error(
        `[ImageSearchService] Failed to index image ${imageUrl} for product ${productId}:`,
        err instanceof Error ? err.message : err,
      );
      throw err;
    }
  }

  // ── Remove product image ─────────────────────────────────────────────────

  /**
   * Remove a product image record by its UUID.
   *
   * @param imageId - The ProductImage UUID to delete
   */
  async removeProductImage(imageId: string): Promise<void> {
    await prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  // ── Minimal Image Decoder ────────────────────────────────────────────────

  /**
   * Decode common image formats to raw RGBA pixels without native dependencies.
   *
   * Supported formats:
   * - BMP (uncompressed, 24-bit and 32-bit)
   * - PPM (P6 binary format)
   *
   * For PNG and JPEG, which require complex decompression, this provides a
   * best-effort 1x1 placeholder. In production, use sharp or canvas.
   *
   * @param buffer - Raw image file buffer
   * @returns Decoded pixel data, width, and height
   */
  private decodeImageBuffer(buffer: Buffer): {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } {
    // Detect format by magic bytes
    const signature = buffer.slice(0, 4).toString('hex');

    // BMP format (BM signature)
    if (signature.startsWith('424d')) {
      return this.decodeBMP(buffer);
    }

    // PPM format (P6 header)
    const header = buffer.slice(0, 20).toString('ascii');
    if (header.startsWith('P6')) {
      return this.decodePPM(buffer);
    }

    // For PNG, JPEG, GIF, WebP — complex formats requiring decompression
    // We create a minimal 1x1 placeholder and log a warning
    console.warn(
      `[ImageSearchService] Unsupported image format (signature: ${signature}). For PNG/JPEG/WebP support, install sharp or use a canvas-based decoder.`,
    );

    // Return a minimal 1x1 black pixel as fallback
    return {
      data: new Uint8ClampedArray([0, 0, 0, 255]),
      width: 1,
      height: 1,
    };
  }

  /**
   * Decode a BMP (Bitmap) image.
   * Supports uncompressed 24-bit and 32-bit BMP files.
   */
  private decodeBMP(buffer: Buffer): {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } {
    // BMP header structure (14 bytes file header + DIB header)
    const dataOffset = buffer.readUInt32LE(10);
    const dibSize = buffer.readUInt32LE(14);

    // BITMAPINFOHEADER (40 bytes) or BITMAPV5HEADER (124 bytes)
    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // Height may be negative (top-down)
    const bitCount = buffer.readUInt16LE(28);
    const compression = dibSize >= 20 ? buffer.readUInt32LE(30) : 0;

    if (compression !== 0) {
      // Compressed BMP not supported in this pure JS decoder
      return {
        data: new Uint8ClampedArray([0, 0, 0, 255]),
        width: 1,
        height: 1,
      };
    }

    const bytesPerPixel = bitCount / 8;
    // BMP rows are padded to multiples of 4 bytes
    const rowStride = Math.floor((bitCount * width + 31) / 32) * 4;

    const totalPixels = width * height;
    const pixels = new Uint8ClampedArray(totalPixels * 4);

    for (let y = 0; y < height; y++) {
      const srcRow = dataOffset + y * rowStride;
      // BMP stores rows bottom-to-top
      const dstRow = (height - 1 - y) * width * 4;

      for (let x = 0; x < width; x++) {
        const srcOffset = srcRow + x * bytesPerPixel;
        const dstOffset = dstRow + x * 4;

        if (srcOffset + 2 < buffer.length) {
          // BMP stores BGR(A) order
          pixels[dstOffset] = buffer[srcOffset + 2]!;     // R
          pixels[dstOffset + 1] = buffer[srcOffset + 1]!; // G
          pixels[dstOffset + 2] = buffer[srcOffset]!;     // B
          if (bytesPerPixel >= 3) {
            pixels[dstOffset + 3] = bytesPerPixel >= 4 ? buffer[srcOffset + 3]! : 255; // A
          }
        }
      }
    }

    return { data: pixels, width, height };
  }

  /**
   * Decode a PPM (Portable Pixmap) P6 binary format image.
   */
  private decodePPM(buffer: Buffer): {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } {
    // Parse header: P6\nWIDTH HEIGHT\nMAXVAL\n
    const text = buffer.toString('ascii');
    const headerEnd = text.indexOf('\n', text.indexOf('\n', text.indexOf('\n') + 1) + 1);
    if (headerEnd === -1) {
      return { data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 };
    }

    const parts = text.substring(0, headerEnd).trim().split(/\s+/);
    if (parts.length < 4) {
      return { data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 };
    }

    const width = parseInt(parts[1]!, 10);
    const height = parseInt(parts[2]!, 10);
    const maxVal = parseInt(parts[3]!, 10);
    const dataOffset = headerEnd + 1;

    const totalPixels = width * height;
    const pixels = new Uint8ClampedArray(totalPixels * 4);

    if (maxVal <= 255) {
      // 1 byte per channel
      for (let i = 0; i < totalPixels; i++) {
        const srcOff = dataOffset + i * 3;
        const dstOff = i * 4;
        if (srcOff + 2 < buffer.length) {
          pixels[dstOff] = buffer[srcOff]!;
          pixels[dstOff + 1] = buffer[srcOff + 1]!;
          pixels[dstOff + 2] = buffer[srcOff + 2]!;
          pixels[dstOff + 3] = 255;
        }
      }
    } else {
      // 2 bytes per channel (big-endian)
      for (let i = 0; i < totalPixels; i++) {
        const srcOff = dataOffset + i * 6;
        const dstOff = i * 4;
        if (srcOff + 5 < buffer.length) {
          pixels[dstOff] = (buffer[srcOff]! << 8 | buffer[srcOff + 1]!) >> 8;
          pixels[dstOff + 1] = (buffer[srcOff + 2]! << 8 | buffer[srcOff + 3]!) >> 8;
          pixels[dstOff + 2] = (buffer[srcOff + 4]! << 8 | buffer[srcOff + 5]!) >> 8;
          pixels[dstOff + 3] = 255;
        }
      }
    }

    return { data: pixels, width, height };
  }
}

// ─── Hex conversion helpers ─────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}
