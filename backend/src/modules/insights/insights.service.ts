import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRange, previousRange } from '../../common/date-range';
import { NEGATIVE_MAX, parseRange } from '../../common/filters.dto';
import { TOPICS } from './topic-classifier';

interface TopicRow {
  topic: string;
  polarity: 'POSITIVE' | 'NEGATIVE';
  n: number;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  private where(range: Partial<DateRange>, ids?: number[]) {
    return {
      ...(ids?.length ? { propertyId: { in: ids } } : {}),
      ...(range.from || range.to
        ? { reviewedAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) } }
        : {}),
    } satisfies Prisma.ReviewWhereInput;
  }

  private async window(range: Partial<DateRange>, ids?: number[]) {
    const where = this.where(range, ids);
    // A review counts as "negative" when it has dislike text OR a low score, so complaints
    // hidden in a high-scoring review are still surfaced.
    const [total, withNegativeText, withPositiveText, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.count({ where: { ...where, hasComplaint: true } }),
      this.prisma.review.count({ where: { ...where, hasPraise: true } }),
      this.prisma.reviewTopic.groupBy({
        by: ['topic', 'polarity'],
        where: { review: where },
        _count: { _all: true },
      }),
    ]);
    const lowScore = await this.prisma.review.count({ where: { ...where, score: { lt: NEGATIVE_MAX } } });
    const counts: TopicRow[] = rows.map((r) => ({ topic: r.topic, polarity: r.polarity, n: r._count._all }));
    return { total, withNegativeText, withPositiveText, lowScore, counts };
  }

  /**
   * Topic breakdown. "% of complaints" is the share of reviews that have meaningful dislike text
   * and mention the topic there; "% of praise" is the same for the liked text.
   */
  async topics(from?: string, to?: string, ids?: number[]) {
    const range = parseRange(from, to);
    const cur = await this.window(range, ids);
    const prevRange = range.from && range.to ? previousRange({ from: range.from, to: range.to }) : undefined;
    const prev = prevRange ? await this.window(prevRange, ids) : undefined;

    // Denominator = reviews that actually contain a complaint (non-trivial negative text).
    const complaintDen = (w: typeof cur) => w.withNegativeText;
    const get = (w: typeof cur | undefined, topic: string, polarity: 'POSITIVE' | 'NEGATIVE') =>
      w?.counts.find((c) => c.topic === topic && c.polarity === polarity)?.n ?? 0;

    const topics = TOPICS.map((t) => {
      const neg = get(cur, t.key, 'NEGATIVE');
      const pos = get(cur, t.key, 'POSITIVE');
      const prevNeg = prev ? pct(get(prev, t.key, 'NEGATIVE'), complaintDen(prev)) : null;
      return {
        key: t.key,
        label: t.label,
        complaints: neg,
        complaintPct: pct(neg, complaintDen(cur)),
        previousComplaintPct: prevNeg,
        praise: pos,
        praisePct: pct(pos, cur.withPositiveText),
      };
    });

    const topComplaints = [...topics].filter((t) => t.complaints > 0).sort((a, b) => b.complaints - a.complaints);
    const headlines = topComplaints.slice(0, 3).map((t) => {
      const change =
        t.previousComplaintPct !== null && prev && complaintDen(prev) > 0
          ? ` (${t.complaintPct >= t.previousComplaintPct ? 'up' : 'down'} from ${t.previousComplaintPct}% the previous period)`
          : '';
      return `${t.complaintPct}% of reviews with complaints mentioned ${t.label.toLowerCase()}${change}.`;
    });

    return {
      reviews: cur.total,
      reviewsWithComplaints: cur.withNegativeText,
      reviewsWithPraise: cur.withPositiveText,
      lowScoreReviews: cur.lowScore,
      topics,
      headlines,
    };
  }
}
