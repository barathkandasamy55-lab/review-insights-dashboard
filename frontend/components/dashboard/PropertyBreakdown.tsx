'use client';

import { useRangeSummary } from '@/lib/hooks/useDashboard';
import { Card, DeltaBadge, Empty, ErrorBox, Spinner } from '@/components/common/States';
import { fmtScore } from '@/lib/utils/format';
import type { Filters } from '@/lib/types';

function ScoreBar({ value }: { value: number | null }) {
  const pct = value ? (value / 10) * 100 : 0;
  const color = value === null ? 'bg-slate-300' : value >= 8 ? 'bg-emerald-500' : value >= 6 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-2 w-full rounded-full bg-slate-100" aria-hidden>
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PropertyBreakdown({ filters }: { filters: Filters }) {
  const { data, loading, error, reload } = useRangeSummary(filters);
  const ranged = Boolean(filters.from && filters.to);

  return (
    <Card
      title="Ratings by property"
      subtitle={ranged ? 'For the selected dates. The arrow compares with the period of the same length just before.' : 'All reviews collected. Choose dates to compare with an earlier period.'}
    >
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.properties.length === 0 ? (
        <Empty title="No properties found" hint="Run the collector to load data." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Property</th>
                <th className="py-2 pr-3 font-medium">Average rating</th>
                <th className="py-2 pr-3 font-medium">Change</th>
                <th className="py-2 pr-3 font-medium text-right">Reviews</th>
                <th className="py-2 pr-3 font-medium text-right">Positive</th>
                <th className="py-2 font-medium text-right">Negative</th>
              </tr>
            </thead>
            <tbody>
              {data.properties.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-3 font-medium text-slate-900">
                    {p.name}
                    {p.overallScore !== null && <div className="text-xs font-normal text-slate-500">Booking.com overall {fmtScore(p.overallScore)}</div>}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-base font-semibold">{fmtScore(p.current.avgScore)}</span>
                      <div className="w-24"><ScoreBar value={p.current.avgScore} /></div>
                    </div>
                  </td>
                  <td className="py-3 pr-3"><DeltaBadge value={p.delta.avgScore} /></td>
                  <td className="py-3 pr-3 text-right">{p.current.count}</td>
                  <td className="py-3 pr-3 text-right text-emerald-700">{p.current.positive}</td>
                  <td className="py-3 text-right text-rose-700">{p.current.negative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
