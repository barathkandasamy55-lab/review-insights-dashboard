/** Date helpers. All business reporting is in Sydney time (the properties' local time). */
export const TZ = 'Australia/Sydney';

export interface DateRange {
  from: Date; // inclusive
  to: Date; // exclusive
}

/** Offset (ms) of Sydney from UTC at the given instant. */
function sydneyOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Midnight (Sydney) at the start of the Sydney calendar day containing `at`, as a UTC instant. */
export function startOfSydneyDay(at: Date): Date {
  const off = sydneyOffsetMs(at);
  const local = new Date(at.getTime() + off);
  const midnightLocalAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // Re-derive the offset at that midnight to stay correct across daylight-saving changes.
  const guess = new Date(midnightLocalAsUtc - off);
  return new Date(midnightLocalAsUtc - sydneyOffsetMs(guess));
}

export function addDays(d: Date, days: number): Date {
  // Add calendar days in Sydney time (not 24h blocks) so DST boundaries stay aligned to midnight.
  const off = sydneyOffsetMs(d);
  const local = new Date(d.getTime() + off);
  const shifted = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days);
  const guess = new Date(shifted - off);
  return new Date(shifted - sydneyOffsetMs(guess));
}

/** Monday 00:00 Sydney of the week containing `at`. */
export function startOfSydneyWeek(at: Date): Date {
  const day = startOfSydneyDay(at);
  const local = new Date(day.getTime() + sydneyOffsetMs(day));
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -dow);
}

/** Parses "yyyy-mm-dd" as a Sydney calendar day. */
export function parseSydneyDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(probe.getTime())) return null;
  return startOfSydneyDay(probe);
}

export function weekRanges(now = new Date()): { current: DateRange; previous: DateRange } {
  const start = startOfSydneyWeek(now);
  return {
    current: { from: start, to: addDays(start, 7) },
    previous: { from: addDays(start, -7), to: start },
  };
}

/** The `days` days ending today (inclusive), plus the equally long period before it. */
export function rollingRanges(days: number, now = new Date()): { current: DateRange; previous: DateRange } {
  const end = addDays(startOfSydneyDay(now), 1);
  const from = addDays(end, -days);
  return { current: { from, to: end }, previous: { from: addDays(from, -days), to: from } };
}

/** Range of the same length immediately before `range`. */
export function previousRange(range: DateRange): DateRange {
  const len = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - len), to: range.from };
}
