const TZ = 'Australia/Sydney';

/** yyyy-mm-dd for a date in Sydney time. */
export function toSydneyYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type RangePreset = 'week' | '30d' | '90d' | 'year' | 'all';

export const PRESET_LABELS: Record<RangePreset, string> = {
  week: 'This week',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  year: 'Last 12 months',
  all: 'All time',
};

/** Resolves a preset to an inclusive from/to pair (null = unbounded). */
export function presetRange(preset: RangePreset, now = new Date()): { from: string | null; to: string | null } {
  const today = toSydneyYmd(now);
  switch (preset) {
    case 'week': {
      const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
      return { from: addDaysYmd(today, -dow), to: today };
    }
    case '30d':
      return { from: addDaysYmd(today, -29), to: today };
    case '90d':
      return { from: addDaysYmd(today, -89), to: today };
    case 'year':
      return { from: addDaysYmd(today, -364), to: today };
    default:
      return { from: null, to: null };
  }
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('en-AU', { timeZone: TZ, ...opts }).format(new Date(iso));
}

/** Formats a yyyy-mm-dd label (already a calendar date) without timezone shifting. */
export function formatYmd(ymd: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...opts }).format(new Date(`${ymd}T00:00:00Z`));
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export const fmtScore = (n: number | null | undefined) => (n === null || n === undefined ? '-' : n.toFixed(1));

export const fmtDelta = (n: number | null | undefined) => (n === null || n === undefined ? null : `${n > 0 ? '+' : ''}${n.toFixed(1)}`);
