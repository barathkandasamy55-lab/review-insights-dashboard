'use client';

import { useTopics } from '@/lib/hooks/useDashboard';
import { Card, Empty, ErrorBox, Spinner } from '@/components/common/States';
import type { Filters } from '@/lib/types';

interface Props {
  filters: Filters;
  selectedTopic?: string;
  onSelectTopic: (key: string | undefined) => void;
}

export function TopicInsights({ filters, selectedTopic, onSelectTopic }: Props) {
  const { data, loading, error, reload } = useTopics(filters);
  const ranked = data ? [...data.topics].sort((a, b) => b.complaintPct - a.complaintPct) : [];
  const maxPct = Math.max(1, ...ranked.map((t) => Math.max(t.complaintPct, t.praisePct)));

  return (
    <Card
      title="What guests talk about"
      subtitle="Topics are found in what guests wrote under 'disliked' (complaints) and 'liked' (praise). Click a topic to see those reviews below."
    >
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.reviews === 0 ? (
        <Empty title="No reviews in this period" hint="Try a wider date range." />
      ) : (
        <>
          {data.headlines.length > 0 && (
            <ul className="mb-4 space-y-1 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              {data.headlines.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          )}
          <p className="mb-2 text-xs text-slate-500">
            Based on {data.reviewsWithComplaints} reviews with a complaint and {data.reviewsWithPraise} with praise (out of {data.reviews} reviews).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Topic</th>
                  <th className="py-2 pr-3 font-medium">Complaints</th>
                  <th className="py-2 font-medium">Praise</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((t) => {
                  const active = selectedTopic === t.key;
                  return (
                    <tr key={t.key} className={`border-b border-slate-100 last:border-0 ${active ? 'bg-brand-50' : ''}`}>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => onSelectTopic(active ? undefined : t.key)}
                          className="text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                          aria-pressed={active}
                        >
                          {t.label}
                        </button>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 rounded-full bg-slate-100" aria-hidden>
                            <div className="h-2 rounded-full bg-rose-500" style={{ width: `${(t.complaintPct / maxPct) * 100}%` }} />
                          </div>
                          <span className="w-24 text-slate-700">
                            {t.complaintPct}% <span className="text-xs text-slate-400">({t.complaints})</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 rounded-full bg-slate-100" aria-hidden>
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(t.praisePct / maxPct) * 100}%` }} />
                          </div>
                          <span className="w-24 text-slate-700">
                            {t.praisePct}% <span className="text-xs text-slate-400">({t.praise})</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
