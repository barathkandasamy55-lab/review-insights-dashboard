'use client';

import { useMemo, useState } from 'react';
import { FilterBar } from '@/components/filters/FilterBar';
import { WeekKpis } from '@/components/dashboard/WeekKpis';
import { PropertyBreakdown } from '@/components/dashboard/PropertyBreakdown';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TopicInsights } from '@/components/dashboard/TopicInsights';
import { ReviewFeed } from '@/components/dashboard/ReviewFeed';
import { DataStatus } from '@/components/dashboard/DataStatus';
import { useProperties } from '@/lib/hooks/useDashboard';
import { RangePreset, presetRange } from '@/lib/utils/format';
import type { Filters } from '@/lib/types';

export default function DashboardPage() {
  const { data: properties } = useProperties();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [preset, setPreset] = useState<RangePreset | 'custom'>('90d');
  const [range, setRange] = useState(() => presetRange('90d'));
  const [topic, setTopic] = useState<string | undefined>();

  const filters: Filters = useMemo(
    () => ({ propertyIds: selectedIds, from: range.from, to: range.to }),
    [selectedIds, range.from, range.to],
  );

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <h1 className="text-2xl font-semibold text-slate-900">Guest review insights</h1>
          <p className="mt-1 text-sm text-slate-500">What guests are saying about our four Sydney properties on Booking.com.</p>
        </div>
      </header>
      <FilterBar
        properties={properties ?? []}
        selectedIds={selectedIds}
        onSelectedIds={setSelectedIds}
        preset={preset}
        onPreset={(p) => {
          setPreset(p);
          setRange(presetRange(p));
        }}
        from={range.from}
        to={range.to}
        onCustom={(from, to) => {
          setPreset('custom');
          setRange({ from, to });
        }}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <WeekKpis propertyIds={selectedIds} />
        <PropertyBreakdown filters={filters} />
        <TrendChart filters={filters} />
        <TopicInsights filters={filters} selectedTopic={topic} onSelectTopic={setTopic} />
        <ReviewFeed
          filters={filters}
          topic={topic}
          topicLabel={topic ? topic.replace('_', ' ') : undefined}
          onClearTopic={() => setTopic(undefined)}
        />
        <DataStatus />
      </main>
    </>
  );
}
