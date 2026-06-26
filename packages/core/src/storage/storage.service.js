import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// ─── S3 / Cloudflare R2 Implementation ──────────────────────────────────────
function createS3Config() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    if (process.env.NODE_ENV === 'development' && !endpoint) {
        console.warn('[Storage] S3_ENDPOINT not set — filesystem fallback not implemented; uploads will fail in development.');
    }
    return {
        endpoint,
        region,
        credentials: accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
        forcePathStyle: true,
    };
}
class S3StorageProvider {
    client;
    bucket;
    publicUrl;
    constructor() {
        this.client = new S3Client(createS3Config());
        this.bucket = process.env.S3_BUCKET || 'watermart';
        this.publicUrl = process.env.S3_PUBLIC_URL || null;
    }
    async upload(params) {
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
    async delete(params) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: params.key,
        });
        await this.client.send(command);
    }
    async getUrl(params) {
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
    async get(key) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const response = await this.client.send(command);
            if (!response.Body)
                return null;
            const stream = response.Body;
            const chunks = [];
            const reader = stream.getReader();
            let done = false;
            while (!done) {
                const result = await reader.read();
                done = result.done;
                if (result.value)
                    chunks.push(result.value);
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
        }
        catch (err) {
            const error = err;
            if (error.name === 'NoSuchKey')
                return null;
            throw err;
        }
    }
    /**
     * Upload multiple files in parallel.
     */
    async uploadMany(files) {
        const results = await Promise.allSettled(files.map((f) => this.upload(f)));
        return results.map((r, i) => {
            if (r.status === 'fulfilled')
                return r.value;
            throw new Error(`Failed to upload file at index ${i}: ${r.reason}`);
        });
    }
    /**
     * Delete multiple files in parallel.
     */
    async deleteMany(keys) {
        await Promise.all(keys.map((key) => this.delete({ key })));
    }
}
// ─── Singleton ──────────────────────────────────────────────────────────────
const globalForStorage = globalThis;
export const storage = globalForStorage.storage ?? new S3StorageProvider();
if (process.env.NODE_ENV !== 'production') {
    globalForStorage.storage = storage;
}
