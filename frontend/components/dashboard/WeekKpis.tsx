'use client';

import { useWeekSummary } from '@/lib/hooks/useDashboard';
import { Card, DeltaBadge, ErrorBox, Spinner } from '@/components/common/States';
import { formatDate, fmtScore } from '@/lib/utils/format';
import type { PeriodStats } from '@/lib/types';

function Kpi({ label, value, sub, badge }: { label: string; value: string; sub?: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
        {badge}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

const negShare = (s: PeriodStats) => (s.count ? Math.round((s.negative / s.count) * 100) : null);

export function WeekKpis({ propertyIds }: { propertyIds: number[] }) {
  const { data, loading, error, reload } = useWeekSummary(propertyIds);

  return (
    <Card
      title="This week vs last week"
      subtitle={
        data
          ? `${formatDate(data.ranges.current.from)} to ${formatDate(data.ranges.current.to)} compared with ${formatDate(data.ranges.previous.from)} to ${formatDate(data.ranges.previous.to)} (Mon to Sun, Sydney time)`
          : 'Weeks run Monday to Sunday, Sydney time'
      }
    >
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Average rating this week"
              value={fmtScore(data.overall.current.avgScore)}
              sub="out of 10"
              badge={<DeltaBadge value={data.overall.delta.avgScore} />}
            />
            <Kpi label="Average rating last week" value={fmtScore(data.overall.previous.avgScore)} sub="out of 10" />
            <Kpi
              label="Reviews this week"
              value={String(data.overall.current.count)}
              sub={`${data.overall.previous.count} last week`}
              badge={<DeltaBadge value={data.overall.delta.count} />}
            />
            <Kpi
              label="Negative reviews"
              value={`${data.overall.current.negative}`}
              sub={
                negShare(data.overall.current) === null
                  ? 'no reviews yet'
                  : `${negShare(data.overall.current)}% of this week's reviews`
              }
              badge={<DeltaBadge value={data.overall.current.negative - data.overall.previous.negative} goodWhenUp={false} />}
            />
          </div>
          {data.overall.current.count === 0 && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No reviews have been published this week yet, so there is no average to show. Pick a longer date range below to see trends.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Positive means a score of {data.thresholds.positiveMin} or higher. Negative means below {data.thresholds.negativeBelow}.
          </p>
        </>
      ) : null}
    </Card>
  );
}
