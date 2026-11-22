'use client';

import { PRESET_LABELS, RangePreset } from '@/lib/utils/format';
import type { PropertyInfo } from '@/lib/types';

interface Props {
  properties: PropertyInfo[];
  selectedIds: number[];
  onSelectedIds: (ids: number[]) => void;
  preset: RangePreset | 'custom';
  onPreset: (p: RangePreset) => void;
  from: string | null;
  to: string | null;
  onCustom: (from: string | null, to: string | null) => void;
}

export function FilterBar({ properties, selectedIds, onSelectedIds, preset, onPreset, from, to, onCustom }: Props) {
  const allSelected = selectedIds.length === 0;
  const toggle = (id: number) =>
    onSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by property">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Property</span>
          <button
            onClick={() => onSelectedIds([])}
            className={`rounded-full px-3 py-1 text-sm ${allSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            aria-pressed={allSelected}
          >
            All properties
          </button>
          {properties.map((p) => {
            const on = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1 text-sm ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</span>
          <select
            value={preset}
            onChange={(e) => e.target.value !== 'custom' && onPreset(e.target.value as RangePreset)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            aria-label="Date range"
          >
            {(Object.keys(PRESET_LABELS) as RangePreset[]).map((k) => (
              <option key={k} value={k}>
                {PRESET_LABELS[k]}
              </option>
            ))}
            <option value="custom">Custom range</option>
          </select>
          <input
            type="date"
            value={from ?? ''}
            max={to ?? undefined}
            onChange={(e) => onCustom(e.target.value || null, to)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            aria-label="From date"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={to ?? ''}
            min={from ?? undefined}
            onChange={(e) => onCustom(from, e.target.value || null)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            aria-label="To date"
          />
        </div>
      </div>
    </div>
  );
}
