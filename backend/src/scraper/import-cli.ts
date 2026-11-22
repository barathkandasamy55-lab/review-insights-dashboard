import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PROPERTIES } from './properties.config';
import { ReviewRepository } from './review-repository';

/** Loads data/sample-reviews.json so the dashboard works without running the browser scraper. */
async function main() {
  const file = process.argv[2] ?? join(__dirname, '..', '..', '..', 'data', 'sample-reviews.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const prisma = new PrismaClient();
  const repo = new ReviewRepository(prisma);
  for (const p of data.properties) {
    const cfg = PROPERTIES.find((c) => c.slug === p.slug);
    const property = await prisma.property.upsert({
      where: { slug: p.slug },
      update: { name: cfg?.name ?? p.name, url: p.url, overallScore: p.overallScore, reviewCount: p.reviewCount },
      create: { slug: p.slug, name: cfg?.name ?? p.name, url: p.url, overallScore: p.overallScore, reviewCount: p.reviewCount },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews = p.reviews.map((r: any) => ({
      ...r,
      reviewedAt: new Date(r.reviewedAt),
      checkIn: r.checkIn ? new Date(r.checkIn) : null,
      checkOut: r.checkOut ? new Date(r.checkOut) : null,
    }));
    const stats = await repo.upsertMany(property.id, reviews);
    await prisma.property.update({ where: { id: property.id }, data: { lastScrapedAt: new Date(data.exportedAt) } });
    console.log(`${p.slug}: +${stats.inserted} new, ${stats.updated} updated, ${stats.unchanged} unchanged`);
  }
  await prisma.$disconnect();
}
main();
