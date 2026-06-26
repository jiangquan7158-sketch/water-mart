import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UploadParams {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  acl?: 'public-read' | 'private';
}

export interface DeleteParams {
  key: string;
}

export interface GetUrlParams {
  key: string;
  expiresIn?: number;
}

export interface StorageProvider {
  /**
   * Upload a file to storage. Returns the storage key.
   */
  upload(params: UploadParams): Promise<string>;

  /**
   * Delete a file from storage by key.
   */
  delete(params: DeleteParams): Promise<void>;

  /**
   * Build a public or signed URL for a stored file.
   */
  getUrl(params: GetUrlParams): Promise<string>;

  /**
   * Retrieve the raw object from storage.
   */
  get(key: string): Promise<Uint8Array | null>;
}

// ─── S3 / Cloudflare R2 Implementation ──────────────────────────────────────

function createS3Config(): S3ClientConfig {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || 'auto';
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (process.env.NODE_ENV === 'development' && !endpoint) {
    console.warn(
      '[Storage] S3_ENDPOINT not set — filesystem fallback not implemented; uploads will fail in development.',
    );
  }

  return {
    endpoint,
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    forcePathStyle: true,
  };
}

class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor() {
    this.client = new S3Client(createS3Config());
    this.bucket = process.env.S3_BUCKET || 'watermart';
    this.publicUrl = process.env.S3_PUBLIC_URL || null;
  }

  async upload(params: UploadParams): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || 'application/octet-stream',
      Metadata: params.metadata,
      CacheControl: params.cacheControl || 'public, max-age=31536000, immutable',
      ACL: params.acl || 'public-read',
    });

    await this.client.send(command);
    return params.key;
  }

  async delete(params: DeleteParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
    });
    await this.client.send(command);
  }

  async getUrl(params: GetUrlParams): Promise<string> {
    const { key, expiresIn } = params;

    // If a public URL base is configured, use it for direct CDN access
    if (this.publicUrl) {
      const base = this.publicUrl.replace(/\/$/, '');
      return `${base}/${key}`;
    }

    // Otherwise, generate a pre-signed URL
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresIn || 3600,
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      if (!response.Body) return null;

      const stream = response.Body as ReadableStream;
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }

      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  /**
   * Upload multiple files in parallel.
   */
  async uploadMany(files: UploadParams[]): Promise<string[]> {
    const results = await Promise.allSettled(
      files.map((f) => this.upload(f)),
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      throw new Error(`Failed to upload file at index ${i}: ${r.reason}`);
    });
  }

  /**
   * Delete multiple files in parallel.
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete({ key })));
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const globalForStorage = globalThis as unknown as {
  storage: S3StorageProvider | undefined;
};

export const storage: S3StorageProvider =
  globalForStorage.storage ?? new S3StorageProvider();

if (process.env.NODE_ENV !== 'production') {
  globalForStorage.storage = storage;
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export type { S3ClientConfig };
