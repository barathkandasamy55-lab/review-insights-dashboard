'use client';

import { useDataStatus } from '@/lib/hooks/useDashboard';
import { timeAgo } from '@/lib/utils/format';

const DAY = 24 * 60 * 60 * 1000;

/** Small footer so staff always know how fresh the data is, and when a collection run failed. */
export function DataStatus() {
  const { data } = useDataStatus();
  if (!data) return null;
  const problems = data.filter((d) => d.lastRun && d.lastRun.status !== 'SUCCESS');
  const stale = data.filter((d) => !d.lastScrapedAt || Date.now() - new Date(d.lastScrapedAt).getTime() > 3 * DAY);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
      <h2 className="text-base font-semibold">Data freshness</h2>
      {(problems.length > 0 || stale.length > 0) && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800">
          Some data may be out of date. {problems.length > 0 && 'The last update did not fully succeed for: ' + problems.map((p) => p.name).join(', ') + '. '}
          {stale.length > 0 && 'No update in over 3 days for: ' + stale.map((p) => p.name).join(', ') + '.'}
        </p>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.propertyId} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="font-medium">{d.name}</span>
            <span className="text-slate-500">
              updated {timeAgo(d.lastScrapedAt)}
              {d.lastRun && d.lastRun.status !== 'SUCCESS' && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">{d.lastRun.status.toLowerCase()}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Reviews come from public Booking.com pages and are refreshed when the collector is run.</p>
    </section>
  );
}
