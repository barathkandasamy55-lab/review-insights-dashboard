'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTrends } from '@/lib/hooks/useDashboard';
import { Card, Empty, ErrorBox, Spinner } from '@/components/common/States';
import { formatYmd } from '@/lib/utils/format';
import type { Filters } from '@/lib/types';

type Bucket = 'day' | 'week' | 'month';

export function TrendChart({ filters }: { filters: Filters }) {
  const [bucket, setBucket] = useState<Bucket>('week');
  const { data, loading, error, reload } = useTrends(filters, bucket);

  const rows = useMemo(
    () =>
      (data ?? []).map((d) => ({
        ...d,
        label: bucket === 'month' ? formatYmd(d.date, { month: 'short', year: '2-digit' }) : formatYmd(d.date),
      })),
    [data, bucket],
  );

  return (
    <Card
      title="Positive and negative reviews over time"
      subtitle={bucket === 'week' ? 'Reviews per week (week starting Monday)' : bucket === 'day' ? 'Reviews per day' : 'Reviews per month'}
      right={
        <div className="inline-flex rounded-md border border-slate-300 text-sm" role="group" aria-label="Group by">
          {(['day', 'week', 'month'] as Bucket[]).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              aria-pressed={bucket === b}
              className={`px-3 py-1 first:rounded-l-md last:rounded-r-md ${bucket === b ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {b === 'day' ? 'Daily' : b === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      }
    >
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <Empty title="No reviews in this period" hint="Try a wider date range or more properties." />
      ) : (
        <div className="h-72 w-full" role="img" aria-label="Stacked bar chart of positive, neutral and negative reviews over time">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" name="Positive (8+)" stackId="a" fill="#10b981" />
              <Bar dataKey="neutral" name="Neutral (6 to 7.9)" stackId="a" fill="#cbd5e1" />
              <Bar dataKey="negative" name="Negative (below 6)" stackId="a" fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
