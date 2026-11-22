import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRange, addDays, previousRange, rollingRanges, startOfSydneyDay, weekRanges } from '../../common/date-range';
import { NEGATIVE_MAX, POSITIVE_MIN, parseRange } from '../../common/filters.dto';

export interface PeriodStats {
  count: number;
  avgScore: number | null;
  positive: number;
  neutral: number;
  negative: number;
}

const EMPTY: PeriodStats = { count: 0, avgScore: null, positive: 0, neutral: 0, negative: 0 };

const round = (n: number | null, dp = 2) => (n === null ? null : Math.round(n * 10 ** dp) / 10 ** dp);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private propertyClause(ids?: number[]) {
    return ids?.length ? Prisma.sql`AND "propertyId" = ANY(${ids})` : Prisma.empty;
  }

  /** Aggregates per property for a half-open range. */
  private async statsByProperty(range: DateRange, ids?: number[]): Promise<Map<number, PeriodStats>> {
    const rows = await this.prisma.$queryRaw<
      { propertyId: number; n: number; avg: number | null; pos: number; neg: number }[]
    >(Prisma.sql`
      SELECT "propertyId",
             COUNT(*)::int AS n,
             AVG(score)::float AS avg,
             COUNT(*) FILTER (WHERE score >= ${POSITIVE_MIN})::int AS pos,
             COUNT(*) FILTER (WHERE score < ${NEGATIVE_MAX})::int AS neg
      FROM "Review"
      WHERE "reviewedAt" >= ${range.from} AND "reviewedAt" < ${range.to} ${this.propertyClause(ids)}
      GROUP BY "propertyId"`);
    return new Map(
      rows.map((r) => [
        r.propertyId,
        { count: r.n, avgScore: round(r.avg), positive: r.pos, negative: r.neg, neutral: r.n - r.pos - r.neg },
      ]),
    );
  }

  private combine(stats: PeriodStats[]): PeriodStats {
    const count = stats.reduce((s, x) => s + x.count, 0);
    if (!count) return { ...EMPTY };
    const weighted = stats.reduce((s, x) => s + (x.avgScore ?? 0) * x.count, 0);
    return {
      count,
      avgScore: round(weighted / count),
      positive: stats.reduce((s, x) => s + x.positive, 0),
      neutral: stats.reduce((s, x) => s + x.neutral, 0),
      negative: stats.reduce((s, x) => s + x.negative, 0),
    };
  }

  private delta(cur: PeriodStats, prev: PeriodStats) {
    return {
      avgScore: cur.avgScore !== null && prev.avgScore !== null ? round(cur.avgScore - prev.avgScore) : null,
      count: cur.count - prev.count,
    };
  }

  resolveRanges(period: string | undefined, from?: string, to?: string): { current: DateRange; previous: DateRange; period: string } {
    switch (period ?? 'week') {
      case 'week':
        return { ...weekRanges(), period: 'week' };
      case 'last7':
        return { ...rollingRanges(7), period: 'last7' };
      case 'last30':
        return { ...rollingRanges(30), period: 'last30' };
      case 'last90':
        return { ...rollingRanges(90), period: 'last90' };
      case 'all': {
        const to = addDays(startOfSydneyDay(new Date()), 1);
        const epoch = new Date(0);
        return { current: { from: epoch, to }, previous: { from: epoch, to: epoch }, period: 'all' };
      }
      case 'custom': {
        const r = parseRange(from, to);
        if (!r.from || !r.to) throw new BadRequestException('custom period needs both from and to');
        const current = { from: r.from, to: r.to };
        return { current, previous: previousRange(current), period: 'custom' };
      }
      default:
        throw new BadRequestException('period must be week, last7, last30, last90 or custom');
    }
  }

  async summary(period: string | undefined, from: string | undefined, to: string | undefined, ids?: number[]) {
    const ranges = this.resolveRanges(period, from, to);
    const properties = await this.prisma.property.findMany({
      where: ids?.length ? { id: { in: ids } } : undefined,
      orderBy: { id: 'asc' },
    });
    const [cur, prev] = await Promise.all([
      this.statsByProperty(ranges.current, ids),
      this.statsByProperty(ranges.previous, ids),
    ]);

    const perProperty = properties.map((p) => {
      const current = cur.get(p.id) ?? { ...EMPTY };
      const previous = prev.get(p.id) ?? { ...EMPTY };
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        overallScore: p.overallScore,
        totalReviews: p.reviewCount,
        current,
        previous,
        delta: this.delta(current, previous),
      };
    });
    const current = this.combine(perProperty.map((p) => p.current));
    const previous = this.combine(perProperty.map((p) => p.previous));

    return {
      period: ranges.period,
      ranges: {
        current: { from: ranges.current.from, to: addDays(ranges.current.to, -1) },
        previous: { from: ranges.previous.from, to: addDays(ranges.previous.to, -1) },
      },
      overall: { current, previous, delta: this.delta(current, previous) },
      properties: perProperty,
      thresholds: { positiveMin: POSITIVE_MIN, negativeBelow: NEGATIVE_MAX },
    };
  }

  /** Positive / neutral / negative counts per week (or day) in Sydney time. */
  async trends(from?: string, to?: string, ids?: number[], bucket: 'week' | 'day' | 'month' = 'week') {
    if (!['week', 'day', 'month'].includes(bucket)) throw new BadRequestException('bucket must be day, week or month');
    const r = parseRange(from, to);
    const fromClause = r.from ? Prisma.sql`AND "reviewedAt" >= ${r.from}` : Prisma.empty;
    const toClause = r.to ? Prisma.sql`AND "reviewedAt" < ${r.to}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      { bucket: Date; n: number; avg: number; pos: number; neg: number }[]
    >(Prisma.sql`
      SELECT date_trunc(${bucket}, "reviewedAt" AT TIME ZONE 'Australia/Sydney') AS bucket,
             COUNT(*)::int AS n,
             AVG(score)::float AS avg,
             COUNT(*) FILTER (WHERE score >= ${POSITIVE_MIN})::int AS pos,
             COUNT(*) FILTER (WHERE score < ${NEGATIVE_MAX})::int AS neg
      FROM "Review"
      WHERE TRUE ${fromClause} ${toClause} ${this.propertyClause(ids)}
      GROUP BY 1 ORDER BY 1`);
    return rows.map((x) => ({
      // bucket is a Sydney wall-clock timestamp; return as a plain yyyy-mm-dd label
      date: x.bucket.toISOString().slice(0, 10),
      count: x.n,
      avgScore: round(x.avg),
      positive: x.pos,
      negative: x.neg,
      neutral: x.n - x.pos - x.neg,
    }));
  }
}
