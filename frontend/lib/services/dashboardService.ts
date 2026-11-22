import { apiClient } from '@/lib/api/client';
import type { DataStatusItem, Filters, PropertyInfo, ReviewsResponse, SummaryResponse, TopicsResponse, TrendPoint } from '@/lib/types';

/** Builds query params, dropping empty values. */
function params(filters: Partial<Filters>, extra: Record<string, string | number | undefined> = {}) {
  const p: Record<string, string | number> = {};
  if (filters.propertyIds?.length) p.propertyIds = filters.propertyIds.join(',');
  if (filters.from) p.from = filters.from;
  if (filters.to) p.to = filters.to;
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== '') p[k] = v;
  return p;
}

export const dashboardService = {
  async getProperties(): Promise<PropertyInfo[]> {
    return (await apiClient.get('/properties')).data;
  },

  async getDataStatus(): Promise<DataStatusItem[]> {
    return (await apiClient.get('/data-status')).data;
  },

  /** This week vs last week. Only the property filter applies. */
  async getWeekSummary(propertyIds: number[]): Promise<SummaryResponse> {
    return (await apiClient.get('/dashboard/summary', { params: params({ propertyIds }, { period: 'week' }) })).data;
  },

  /** Per-property breakdown for the selected date range vs the equally long period before it. */
  async getRangeSummary(filters: Filters): Promise<SummaryResponse> {
    const custom = filters.from && filters.to;
    return (
      await apiClient.get('/dashboard/summary', {
        params: params(filters, { period: custom ? 'custom' : 'all' }),
      })
    ).data;
  },

  async getTrends(filters: Filters, bucket: 'day' | 'week' | 'month'): Promise<TrendPoint[]> {
    return (await apiClient.get('/dashboard/trends', { params: params(filters, { bucket }) })).data;
  },

  async getTopics(filters: Filters): Promise<TopicsResponse> {
    return (await apiClient.get('/insights/topics', { params: params(filters) })).data;
  },

  async getReviews(
    filters: Filters,
    opts: { page: number; sentiment?: string; topic?: string; q?: string; sort?: string },
  ): Promise<ReviewsResponse> {
    return (
      await apiClient.get('/reviews', {
        params: params(filters, { page: opts.page, pageSize: 10, sentiment: opts.sentiment, topic: opts.topic, q: opts.q, sort: opts.sort }),
      })
    ).data;
  },
};
