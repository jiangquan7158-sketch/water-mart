import { type S3ClientConfig } from '@aws-sdk/client-s3';
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
declare class S3StorageProvider implements StorageProvider {
    private readonly client;
    private readonly bucket;
    private readonly publicUrl;
    constructor();
    upload(params: UploadParams): Promise<string>;
    delete(params: DeleteParams): Promise<void>;
    getUrl(params: GetUrlParams): Promise<string>;
    get(key: string): Promise<Uint8Array | null>;
    /**
     * Upload multiple files in parallel.
     */
    uploadMany(files: UploadParams[]): Promise<string[]>;
    /**
     * Delete multiple files in parallel.
     */
    deleteMany(keys: string[]): Promise<void>;
}
export declare const storage: S3StorageProvider;
export type { S3ClientConfig };
//# sourceMappingURL=storage.service.d.ts.map