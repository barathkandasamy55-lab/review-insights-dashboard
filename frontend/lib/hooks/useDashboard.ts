import { dashboardService } from '@/lib/services/dashboardService';
import type { Filters } from '@/lib/types';
import { useAsync } from './useAsync';

export const useProperties = () => useAsync(() => dashboardService.getProperties(), []);

export const useDataStatus = () => useAsync(() => dashboardService.getDataStatus(), []);

export const useWeekSummary = (propertyIds: number[]) =>
  useAsync(() => dashboardService.getWeekSummary(propertyIds), [propertyIds.join(',')]);

export const useRangeSummary = (filters: Filters) =>
  useAsync(() => dashboardService.getRangeSummary(filters), [filters.propertyIds.join(','), filters.from, filters.to]);

export const useTrends = (filters: Filters, bucket: 'day' | 'week' | 'month') =>
  useAsync(() => dashboardService.getTrends(filters, bucket), [filters.propertyIds.join(','), filters.from, filters.to, bucket]);

export const useTopics = (filters: Filters) =>
  useAsync(() => dashboardService.getTopics(filters), [filters.propertyIds.join(','), filters.from, filters.to]);

export const useReviews = (
  filters: Filters,
  opts: { page: number; sentiment?: string; topic?: string; q?: string; sort?: string },
) =>
  useAsync(
    () => dashboardService.getReviews(filters, opts),
    [filters.propertyIds.join(','), filters.from, filters.to, opts.page, opts.sentiment, opts.topic, opts.q, opts.sort],
  );
