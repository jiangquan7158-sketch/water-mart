// WaterMart Database Seed Script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? 'file:./watermart.db' } },
});

function json(val: unknown): string { return JSON.stringify(val); }

async function main() {
  // Clean
  await prisma.scrapeResult.deleteMany();
  await prisma.scrapeJob.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.affiliateLink.deleteMany();
  await prisma.affiliate.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.product.deleteMany();
  await prisma.session.deleteMany();
  await prisma.address.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const admin = await prisma.user.create({ data: { email: 'admin@watermart.com', name: 'Admin', role: 'SUPER_ADMIN', metadata: '{}' } });
  const alice = await prisma.user.create({ data: { email: 'alice@example.com', name: 'Alice Chen', role: 'CUSTOMER', metadata: '{}' } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com', name: 'Bob Smith', role: 'CUSTOMER', metadata: '{}' } });
  const pUser1 = await prisma.user.create({ data: { email: 'johnp@example.com', name: 'John Partner', role: 'AFFILIATE', metadata: '{}' } });
  const pUser2 = await prisma.user.create({ data: { email: 'sarahp@example.com', name: 'Sarah Partner', role: 'AFFILIATE', metadata: '{}' } });

  // Categories
  const t = (en: {name:string}, zh: {name:string}) => json({ en, zh });
  const c1 = await prisma.category.create({ data: { slug: 'water-pitchers', translations: t({name:'Water Filter Pitchers'},{name:'滤水壶'}), sortOrder: 1 } });
  const c2 = await prisma.category.create({ data: { slug: 'reverse-osmosis', translations: t({name:'Reverse Osmosis'},{name:'反渗透系统'}), sortOrder: 2 } });
  const c3 = await prisma.category.create({ data: { slug: 'shower-filters', translations: t({name:'Shower Filters'},{name:'淋浴过滤器'}), sortOrder: 3 } });
  const c4 = await prisma.category.create({ data: { slug: 'countertop', translations: t({name:'Countertop Filters'},{name:'台式过滤器'}), sortOrder: 4 } });
  const c5 = await prisma.category.create({ data: { slug: 'under-sink', translations: t({name:'Under-Sink'},{name:'台下系统'}), sortOrder: 5 } });
  const c6 = await prisma.category.create({ data: { slug: 'accessories', translations: t({name:'Accessories'},{name:'配件'}), sortOrder: 6 } });

  // Tags
  const tg1 = await prisma.tag.create({ data: { slug: 'new-arrival', translations: t({name:'New Arrival'},{name:'新品'}) } });
  const tg2 = await prisma.tag.create({ data: { slug: 'bestseller', translations: t({name:'Bestseller'},{name:'热销'}) } });
  const tg3 = await prisma.tag.create({ data: { slug: 'eco-friendly', translations: t({name:'Eco-Friendly'},{name:'环保'}) } });

  // Products
  type PT = [string,string,string,string];
  const pT = (enTitle:string, enDesc:string, zhTitle:string, zhDesc:string): string => json({ en:{title:enTitle,description:enDesc}, zh:{title:zhTitle,description:zhDesc} });

  const products: Array<[string, PT, number, string, string[], string[]]> = [
    ['pureflow-pitcher-pro', ['PureFlow Pitcher Pro','Advanced 7-stage filtration pitcher. Removes 99.9% of contaminants. BPA-free.','PureFlow 滤水壶 Pro','先进7级过滤，去除99.9%污染物。不含BPA。'], 39.99, 'PureFlow', [c1.id], [tg2.id]],
    ['aquaclean-ro-5stage', ['AquaClean RO 5-Stage','Professional-grade 5-stage reverse osmosis system. Pure, great-tasting water.','AquaClean RO 5级系统','专业5级反渗透，产出纯净可口水。'], 249.99, 'AquaClean', [c2.id,c5.id], [tg2.id]],
    ['showerpure-filter', ['ShowerPure Filter Cartridge','Removes chlorine and heavy metals. Softer skin and hair in 2 weeks.','ShowerPure 过滤芯','去除氯和重金属，2周改善肤质发质。'], 29.99, 'ShowerPure', [c3.id], []],
    ['cleardrop-countertop', ['ClearDrop Countertop Filter','No-installation. Connects to any standard faucet. 3-stage carbon block.','ClearDrop 台式过滤器','免安装，接任何标准水龙头。3级活性炭。'], 79.99, 'ClearDrop', [c4.id], [tg1.id]],
    ['aquapure-undersink-pro', ['AquaPure Undersink Pro','High-capacity under-sink filtration. 0.01 micron ultrafiltration membrane.','AquaPure 台下 Pro','大容量台下过滤，0.01微米超滤膜。'], 189.99, 'AquaPure', [c5.id], []],
    ['aquapure-bottle-750', ['AquaPure Filter Bottle 750ml','Filter-as-you-drink. Built-in carbon filter lasts 150 refills.','AquaPure 过滤水瓶 750ml','边喝边过滤，内置碳滤芯可用150次。'], 24.99, 'AquaPure', [c6.id], [tg3.id]],
    ['zerowater-8-cup', ['ZeroWater 8-Cup Pitcher','5-stage ion exchange filter. Removes 99.6% TDS. Includes TDS meter.','ZeroWater 8杯滤水壶','5级离子交换，去除99.6% TDS。附赠TDS计。'], 34.99, 'ZeroWater', [c1.id], [tg2.id]],
    ['h2o-analyzer-kit', ['H2O Analyzer Test Kit','Complete water quality test. 16 parameters including lead, bacteria, pH.','H2O 分析测试套件','完整水质检测，16项参数含铅/细菌/pH。'], 49.99, 'H2O Analyzer', [c6.id], []],
  ];

  for (const [slug, [enT,enD,zhT,zhD], price, brand, catIds, tagIds] of products) {
    const prod = await prisma.product.create({ data: { slug, status: 'PUBLISHED', translations: pT(enT,enD,zhT,zhD), basePrice: price, currency: 'USD', metadata: json({brand}), publishedAt: new Date() } });
    for (const cid of catIds) { await prisma.productCategory.create({ data: { productId: prod.id, categoryId: cid } }); }
    for (const tid of tagIds) { await prisma.productTag.create({ data: { productId: prod.id, tagId: tid } }); }
    await prisma.productImage.create({ data: { productId: prod.id, url: `https://picsum.photos/seed/${slug}/400/400`, alt: enT, sortOrder: 0 } });
  }

  // Coupons
  await prisma.coupon.create({ data: { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrderAmount: null, maxUses: 1000, currentUses: 23, translations: json({en:{name:'Welcome 10% Off',description:'10% off your first order'}}) } });
  await prisma.coupon.create({ data: { code: 'SAVE20', type: 'FIXED_AMOUNT', value: 20, minOrderAmount: 100, maxUses: 500, currentUses: 8, translations: json({en:{name:'Save $20',description:'$20 off orders over $100'}}) } });
  await prisma.coupon.create({ data: { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, minOrderAmount: 50, maxUses: 2000, currentUses: 156, translations: json({en:{name:'Free Shipping',description:'Free shipping on orders over $50'}}) } });

  // Affiliates
  const a1 = await prisma.affiliate.create({ data: { userId: pUser1.id, code: 'JOHN001', commissionRate: 5.0, balance: 245.50, status: 'ACTIVE', metadata: '{}' } });
  await prisma.affiliateLink.create({ data: { affiliateId: a1.id, url: 'https://watermart.com/ref/john001', clicks: 342, conversions: 15, earnings: 245.50 } });
  const a2 = await prisma.affiliate.create({ data: { userId: pUser2.id, code: 'SARAH02', commissionRate: 7.5, balance: 578.25, status: 'ACTIVE', metadata: '{}' } });
  await prisma.affiliateLink.create({ data: { affiliateId: a2.id, url: 'https://watermart.com/ref/sarah02', clicks: 891, conversions: 42, earnings: 578.25 } });

  // Scrape Jobs
  const j1 = await prisma.scrapeJob.create({ data: { urls: json(['https://www.amazon.com/dp/B08XYZ123','https://www.aliexpress.com/item/100500123456.html']), status: 'COMPLETED' } });
  await prisma.scrapeResult.create({ data: { jobId: j1.id, sourceUrl: 'https://www.amazon.com/dp/B08XYZ123', platform: 'Amazon', rawData: json({title:'Brita UltraMax Dispenser',price:34.99,brand:'Brita',rating:4.7}), status: 'SCRAPED' } });
  await prisma.scrapeResult.create({ data: { jobId: j1.id, sourceUrl: 'https://www.aliexpress.com/item/100500123456.html', platform: 'AliExpress', rawData: json({title:'Smart UV Bottle',price:19.99}), status: 'OPTIMIZED', aiOptimized: json({enhancedTitle:'Premium UV Sterilization Bottle',seoTitle:'Smart UV Water Bottle | Pure Hydration',suggestedTags:['water-bottle','uv-sterilization','smart']}) } });

  const j2 = await prisma.scrapeJob.create({ data: { urls: json(['https://www.amazon.com/dp/B07DEF789','https://shopify.com/products/water-filter-pro']), status: 'RUNNING' } });
  await prisma.scrapeResult.create({ data: { jobId: j2.id, sourceUrl: 'https://www.amazon.com/dp/B07DEF789', platform: 'Amazon', rawData: json({title:'AquaBliss Shower Filter',price:39.99,brand:'AquaBliss'}), status: 'SCRAPED' } });

  console.log('Seed complete: 5 users, 6 categories, 8 products, 3 coupons, 2 affiliates, 2 scrape jobs');
}

main().then(async () => { await prisma.$disconnect(); }).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
