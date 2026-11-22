import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NEGATIVE_MAX, POSITIVE_MIN, parseRange } from '../../common/filters.dto';
import { TOPIC_LABELS } from '../insights/topic-classifier';

export interface ReviewQuery {
  page?: string;
  pageSize?: string;
  propertyIds?: number[];
  from?: string;
  to?: string;
  sentiment?: string;
  topic?: string;
  q?: string;
  sort?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ReviewQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 15));
    const range = parseRange(query.from, query.to);

    const and: Prisma.ReviewWhereInput[] = [];
    if (query.propertyIds?.length) and.push({ propertyId: { in: query.propertyIds } });
    if (range.from) and.push({ reviewedAt: { gte: range.from } });
    if (range.to) and.push({ reviewedAt: { lt: range.to } });
    if (query.sentiment) {
      if (query.sentiment === 'positive') and.push({ score: { gte: POSITIVE_MIN } });
      else if (query.sentiment === 'negative') and.push({ score: { lt: NEGATIVE_MAX } });
      else if (query.sentiment === 'neutral') and.push({ score: { gte: NEGATIVE_MAX, lt: POSITIVE_MIN } });
      else throw new BadRequestException('sentiment must be positive, neutral or negative');
    }
    if (query.topic) {
      if (!TOPIC_LABELS[query.topic]) throw new BadRequestException(`unknown topic "${query.topic}"`);
      and.push({ topics: { some: { topic: query.topic, polarity: 'NEGATIVE' } } });
    }
    const q = query.q?.trim();
    if (q) {
      and.push({
        OR: [
          { positiveText: { contains: q, mode: 'insensitive' } },
          { negativeText: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.ReviewWhereInput = and.length ? { AND: and } : {};

    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      query.sort === 'lowest'
        ? [{ score: 'asc' }, { reviewedAt: 'desc' }]
        : query.sort === 'highest'
          ? [{ score: 'desc' }, { reviewedAt: 'desc' }]
          : [{ reviewedAt: 'desc' }, { id: 'desc' }];

    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { property: { select: { id: true, name: true } }, topics: { select: { topic: true, polarity: true } } },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: rows.map((r) => ({
        id: r.id,
        property: r.property,
        score: r.score,
        sentiment: r.score >= POSITIVE_MIN ? 'positive' : r.score < NEGATIVE_MAX ? 'negative' : 'neutral',
        title: r.title,
        // Filler such as "Nothing" / "N/A" is hidden so the feed only shows real comments.
        positiveText: r.hasPraise ? r.positiveText : null,
        negativeText: r.hasComplaint ? r.negativeText : null,
        reviewedAt: r.reviewedAt,
        checkIn: r.checkIn,
        nights: r.nights,
        roomType: r.roomType,
        travellerType: r.travellerType,
        reviewerName: r.reviewerName,
        reviewerCountry: r.reviewerCountry,
        language: r.language,
        ownerReply: r.ownerReply,
        complaintTopics: r.topics.filter((t) => t.polarity === 'NEGATIVE').map((t) => ({ key: t.topic, label: TOPIC_LABELS[t.topic] ?? t.topic })),
        praiseTopics: r.topics.filter((t) => t.polarity === 'POSITIVE').map((t) => ({ key: t.topic, label: TOPIC_LABELS[t.topic] ?? t.topic })),
      })),
    };
  }
}
