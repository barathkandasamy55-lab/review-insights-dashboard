'use client';

import { useEffect, useState } from 'react';
import { useReviews } from '@/lib/hooks/useDashboard';
import { Card, Empty, ErrorBox, Spinner } from '@/components/common/States';
import { formatDate, fmtScore } from '@/lib/utils/format';
import type { Filters, ReviewItem } from '@/lib/types';

const SENTIMENT_STYLE: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-800',
  neutral: 'bg-slate-200 text-slate-700',
  negative: 'bg-rose-100 text-rose-800',
};

function ReviewCard({ r }: { r: ReviewItem }) {
  const [open, setOpen] = useState(false);
  const long = (r.positiveText?.length ?? 0) + (r.negativeText?.length ?? 0) > 280;
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-1 text-sm font-semibold ${SENTIMENT_STYLE[r.sentiment]}`}>{fmtScore(r.score)}</span>
        <span className="font-medium text-slate-900">{r.title ?? 'Guest review'}</span>
        <span className="ml-auto text-xs text-slate-500">{formatDate(r.reviewedAt)}</span>
      </header>
      <p className="mt-1 text-xs text-slate-500">
        {r.property.name}
        {r.reviewerName ? ` · ${r.reviewerName}` : ''}
        {r.reviewerCountry ? ` (${r.reviewerCountry})` : ''}
        {r.travellerType ? ` · ${r.travellerType}` : ''}
        {r.roomType ? ` · ${r.roomType}` : ''}
        {r.nights ? ` · ${r.nights} night${r.nights > 1 ? 's' : ''}` : ''}
      </p>

      <div className={`mt-3 space-y-2 text-sm ${!open && long ? 'line-clamp-4' : ''}`}>
        {r.positiveText && (
          <p>
            <span className="mr-1 font-semibold text-emerald-700">Liked:</span>
            {r.positiveText}
          </p>
        )}
        {r.negativeText && (
          <p>
            <span className="mr-1 font-semibold text-rose-700">Disliked:</span>
            {r.negativeText}
          </p>
        )}
        {!r.positiveText && !r.negativeText && <p className="text-slate-500">The guest left a score without comments.</p>}
      </div>
      {long && (
        <button onClick={() => setOpen(!open)} className="mt-1 text-sm text-brand-600 hover:underline">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}

      {(r.complaintTopics.length > 0 || r.praiseTopics.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.complaintTopics.map((t) => (
            <span key={`n-${t.key}`} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
              − {t.label}
            </span>
          ))}
          {r.praiseTopics.map((t) => (
            <span key={`p-${t.key}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              + {t.label}
            </span>
          ))}
        </div>
      )}

      {r.ownerReply && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Hotel response:</span> {r.ownerReply}
        </div>
      )}
    </article>
  );
}

interface Props {
  filters: Filters;
  topic?: string;
  topicLabel?: string;
  onClearTopic: () => void;
}

export function ReviewFeed({ filters, topic, topicLabel, onClearTopic }: Props) {
  const [page, setPage] = useState(1);
  const [sentiment, setSentiment] = useState('');
  const [sort, setSort] = useState('newest');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  // Debounce search so we do not query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  // Any filter change goes back to page 1.
  const key = [filters.propertyIds.join(','), filters.from, filters.to, sentiment, topic, q, sort].join('|');
  useEffect(() => setPage(1), [key]);

  const { data, loading, error, reload } = useReviews(filters, { page, sentiment: sentiment || undefined, topic, q: q || undefined, sort });

  return (
    <Card
      title="Review feed"
      subtitle={data ? `${data.total} review${data.total === 1 ? '' : 's'} match your filters` : undefined}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search reviews..."
            className="w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Search reviews"
          />
          <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" aria-label="Sentiment">
            <option value="">All ratings</option>
            <option value="positive">Positive (8+)</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative (below 6)</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="lowest">Lowest rating first</option>
            <option value="highest">Highest rating first</option>
          </select>
        </div>
      }
    >
      {topic && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
          Complaints about: <strong>{topicLabel ?? topic}</strong>
          <button onClick={onClearTopic} className="font-bold hover:text-brand-600" aria-label="Clear topic filter">×</button>
        </div>
      )}

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <Empty title="No reviews match these filters" hint="Try removing a filter or widening the dates." />
      ) : (
        <>
          <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <span className="text-slate-600">
              Page {data.page} of {data.totalPages}
            </span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </nav>
        </>
      )}
    </Card>
  );
}
