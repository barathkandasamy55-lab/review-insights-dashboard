import { parseSydneyDate, startOfSydneyWeek, weekRanges } from './date-range';

describe('Sydney date ranges', () => {
  it('starts the week on Monday 00:00 Sydney (AEDT, UTC+11)', () => {
    // Wed 18 Nov 2026 03:00 UTC = Wed 14:00 Sydney
    const start = startOfSydneyWeek(new Date('2026-11-18T03:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-15T13:00:00.000Z'); // Mon 16 Nov 00:00 AEDT
  });

  it('treats Sunday night Sydney time as part of the same week', () => {
    // Sun 22 Nov 2026 12:00 UTC = Sun 23:00 Sydney
    const start = startOfSydneyWeek(new Date('2026-11-22T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-15T13:00:00.000Z');
  });

  it('gives a 7 day current window and the 7 days before it', () => {
    const { current, previous } = weekRanges(new Date('2026-11-18T03:00:00Z'));
    expect(current.to.getTime() - current.from.getTime()).toBe(7 * 24 * 3600 * 1000);
    expect(previous.to.getTime()).toBe(current.from.getTime());
  });

  it('stays aligned to midnight across the April daylight-saving change', () => {
    // AEDT -> AEST on Sun 5 Apr 2026; week of Mon 30 Mar to Mon 6 Apr is 7 days minus nothing but 1h longer.
    const { current } = weekRanges(new Date('2026-04-02T03:00:00Z'));
    expect(current.from.toISOString()).toBe('2026-03-29T13:00:00.000Z'); // Mon 30 Mar 00:00 AEDT
    expect(current.to.toISOString()).toBe('2026-04-05T14:00:00.000Z'); // Mon 6 Apr 00:00 AEST
  });

  it('parses yyyy-mm-dd as a Sydney day and rejects junk', () => {
    expect(parseSydneyDate('2026-11-20')?.toISOString()).toBe('2026-11-19T13:00:00.000Z');
    expect(parseSydneyDate('20/11/2026')).toBeNull();
  });
});
