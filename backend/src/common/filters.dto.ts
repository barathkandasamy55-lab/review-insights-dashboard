import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DateRange, parseSydneyDate, addDays } from './date-range';

/** Sentiment buckets on Booking.com's 1-10 scale. Documented in the README. */
export const POSITIVE_MIN = 8;
export const NEGATIVE_MAX = 6; // score < 6 is negative

export class FiltersDto {
  @ApiPropertyOptional({ description: 'Comma separated property ids' })
  propertyIds?: string;

  @ApiPropertyOptional({ description: 'Start date yyyy-mm-dd (Sydney, inclusive)' })
  from?: string;

  @ApiPropertyOptional({ description: 'End date yyyy-mm-dd (Sydney, inclusive)' })
  to?: string;
}

export function parsePropertyIds(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const ids = raw.split(',').map((s) => Number(s.trim()));
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new BadRequestException('propertyIds must be a comma separated list of ids');
  return ids;
}

/** Turns inclusive from/to strings into a half-open range. Either side may be omitted. */
export function parseRange(from?: string, to?: string): Partial<DateRange> {
  const out: Partial<DateRange> = {};
  if (from) {
    const d = parseSydneyDate(from);
    if (!d) throw new BadRequestException('from must be yyyy-mm-dd');
    out.from = d;
  }
  if (to) {
    const d = parseSydneyDate(to);
    if (!d) throw new BadRequestException('to must be yyyy-mm-dd');
    out.to = addDays(d, 1);
  }
  if (out.from && out.to && out.from >= out.to) throw new BadRequestException('from must be before to');
  return out;
}
