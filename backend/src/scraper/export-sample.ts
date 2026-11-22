import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

/** Exports the collected dataset to <repo>/data/sample-reviews.json (committed as sample data). */
async function main() {
  const prisma = new PrismaClient();
  const properties = await prisma.property.findMany({ orderBy: { id: 'asc' } });
  const out = [];
  for (const p of properties) {
    const reviews = await prisma.review.findMany({ where: { propertyId: p.id }, orderBy: { reviewedAt: 'desc' } });
    out.push({
      slug: p.slug,
      name: p.name,
      url: p.url,
      overallScore: p.overallScore,
      reviewCount: p.reviewCount,
      reviews: reviews.map(({ id, propertyId, scrapedAt, updatedAt, ...r }) => r),
    });
  }
  const dir = join(__dirname, '..', '..', '..', 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sample-reviews.json'), JSON.stringify({ exportedAt: new Date().toISOString(), properties: out }, null, 2));
  console.log(`Exported ${out.reduce((n, p) => n + p.reviews.length, 0)} reviews to data/sample-reviews.json`);
  await prisma.$disconnect();
}
main();
