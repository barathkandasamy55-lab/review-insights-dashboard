import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [properties, counts] = await Promise.all([
      this.prisma.property.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.review.groupBy({ by: ['propertyId'], _count: { _all: true }, _max: { reviewedAt: true } }),
    ]);
    const byId = new Map(counts.map((c) => [c.propertyId, c]));
    return properties.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      url: p.url,
      overallScore: p.overallScore,
      reviewCountOnSite: p.reviewCount,
      reviewsCollected: byId.get(p.id)?._count._all ?? 0,
      latestReviewAt: byId.get(p.id)?._max.reviewedAt ?? null,
      lastScrapedAt: p.lastScrapedAt,
    }));
  }

  /** Data freshness + health of the last collection run per property, shown to ops staff. */
  async scrapeStatus() {
    const properties = await this.prisma.property.findMany({ orderBy: { id: 'asc' } });
    const runs = await Promise.all(
      properties.map((p) => this.prisma.scrapeRun.findFirst({ where: { propertyId: p.id, NOT: { status: 'RUNNING' } }, orderBy: { id: 'desc' } })),
    );
    return properties.map((p, i) => ({
      propertyId: p.id,
      name: p.name,
      lastScrapedAt: p.lastScrapedAt,
      lastRun: runs[i]
        ? {
            status: runs[i]!.status,
            mode: runs[i]!.mode,
            finishedAt: runs[i]!.finishedAt,
            fetched: runs[i]!.fetched,
            inserted: runs[i]!.inserted,
            error: runs[i]!.error,
          }
        : null,
    }));
  }
}
