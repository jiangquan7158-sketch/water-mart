export { ProductService } from './product.service';
export { ProductRepository } from './product.repository';
export type {
  ProductFilters,
  ProductCreateInput,
  ProductUpdateInput,
  ProductListResult,
} from './product.repository';
export { ScraperManager } from './scraper/scraper.manager';
export type {
  ScrapedVariant,
  ScrapedProduct,
  ScraperAdapter,
} from './scraper/scraper.interface';
export { AmazonScraper } from './scraper/adapters/amazon.adapter';
export { ShopifyScraper } from './scraper/adapters/shopify.adapter';
export { AliExpressScraper } from './scraper/adapters/aliexpress.adapter';
export { GenericScraper } from './scraper/adapters/generic.adapter';
export { AIOptimizerService, BUILD_OPTIMIZATION_SYSTEM_PROMPT } from './ai-optimize/optimizer.service';
export type {
  AIOptimizedProduct,
  OptimizationOptions,
  OptimizationRawInput,
} from './ai-optimize/optimizer.service';
export {
  SYSTEM_PROMPT as PRODUCT_OPTIMIZATION_SYSTEM_PROMPT,
  buildOptimizationPrompt,
} from './ai-optimize/optimizer.prompts';
export { OptimizationQueue, getOptimizationQueue } from './ai-optimize/optimizer.queue';
export type { OptimizationJob, OptimizationJobStatus, OptimizationStatusResult } from './ai-optimize/optimizer.queue';
export { ImageSearchService } from './image-search/image-search.service';
export type { SearchResult } from './image-search/image-search.service';
export {
  computePerceptualHash,
  hammingDistance,
  computeHash,
  dct2d,
  resizeImage,
} from './image-search/phash';
export {
  ImageEmbeddingService,
  generateImageEmbedding,
  generateTextEmbedding,
} from './image-search/embedding';
export type { EmbeddingGenerator } from './image-search/embedding';
