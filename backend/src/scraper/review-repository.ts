import { PrismaClient } from '@prisma/client';
import { classifyReview, isTrivialText } from '../modules/insights/topic-classifier';

const flags = (r: { positiveText?: string | null; negativeText?: string | null }) => ({
  hasComplaint: !isTrivialText(r.negativeText),
  hasPraise: !isTrivialText(r.positiveText),
});
import { NormalisedReview } from './review-mapper';

export interface UpsertStats {
  inserted: number;
  updated: number;
  unchanged: number;
}

/** Idempotent persistence: (propertyId, externalId) is unique, so re-running never duplicates. */
export class ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async knownIds(propertyId: number, ids: string[]): Promise<Set<string>> {
    const rows = await this.prisma.review.findMany({
      where: { propertyId, externalId: { in: ids } },
      select: { externalId: true },
    });
    return new Set(rows.map((r) => r.externalId));
  }

  async upsertMany(propertyId: number, reviews: NormalisedReview[]): Promise<UpsertStats> {
    const stats: UpsertStats = { inserted: 0, updated: 0, unchanged: 0 };
    // De-duplicate within the batch itself (a repeated card must not violate the unique key).
    const unique = [...new Map(reviews.map((r) => [r.externalId, r])).values()];
    const existing = await this.prisma.review.findMany({
      where: { propertyId, externalId: { in: unique.map((r) => r.externalId) } },
      select: { id: true, externalId: true, positiveText: true, negativeText: true, score: true, ownerReply: true, helpfulVotes: true },
    });
    const byExternal = new Map(existing.map((e) => [e.externalId, e]));

    for (const r of unique) {
      const prev = byExternal.get(r.externalId);
      const topics = classifyReview(r).map((t) => ({ topic: t.topic, polarity: t.polarity }));
      if (!prev) {
        await this.prisma.review.create({ data: { ...r, ...flags(r), propertyId, topics: { create: topics } } });
        stats.inserted++;
        continue;
      }
      const changed =
        prev.positiveText !== r.positiveText ||
        prev.negativeText !== r.negativeText ||
        prev.score !== r.score ||
        prev.ownerReply !== r.ownerReply ||
        prev.helpfulVotes !== r.helpfulVotes;
      if (!changed) {
        stats.unchanged++;
        continue;
      }
      await this.prisma.$transaction([
        this.prisma.reviewTopic.deleteMany({ where: { reviewId: prev.id } }),
        this.prisma.review.update({ where: { id: prev.id }, data: { ...r, ...flags(r), topics: { create: topics } } }),
      ]);
      stats.updated++;
    }
    return stats;
  }

  /** Re-runs the classifier over stored reviews (used after tuning keywords). */
  async reclassifyAll(): Promise<number> {
    const reviews = await this.prisma.review.findMany({ select: { id: true, positiveText: true, negativeText: true } });
    for (const r of reviews) {
      await this.prisma.$transaction([
        this.prisma.review.update({ where: { id: r.id }, data: flags(r) }),
        this.prisma.reviewTopic.deleteMany({ where: { reviewId: r.id } }),
        this.prisma.reviewTopic.createMany({
          data: classifyReview(r).map((t) => ({ reviewId: r.id, topic: t.topic, polarity: t.polarity })),
        }),
      ]);
    }
    return reviews.length;
  }
}
