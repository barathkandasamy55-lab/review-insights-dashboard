export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface PeriodStats {
  count: number;
  avgScore: number | null;
  positive: number;
  neutral: number;
  negative: number;
}

export interface Delta {
  avgScore: number | null;
  count: number;
}

export interface PropertySummary {
  id: number;
  name: string;
  slug: string;
  overallScore: number | null;
  totalReviews: number | null;
  current: PeriodStats;
  previous: PeriodStats;
  delta: Delta;
}

export interface SummaryResponse {
  period: string;
  ranges: { current: { from: string; to: string }; previous: { from: string; to: string } };
  overall: { current: PeriodStats; previous: PeriodStats; delta: Delta };
  properties: PropertySummary[];
  thresholds: { positiveMin: number; negativeBelow: number };
}

export interface TrendPoint {
  date: string;
  count: number;
  avgScore: number | null;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TopicInsight {
  key: string;
  label: string;
  complaints: number;
  complaintPct: number;
  previousComplaintPct: number | null;
  praise: number;
  praisePct: number;
}

export interface TopicsResponse {
  reviews: number;
  reviewsWithComplaints: number;
  reviewsWithPraise: number;
  lowScoreReviews: number;
  topics: TopicInsight[];
  headlines: string[];
}

export interface TopicTag {
  key: string;
  label: string;
}

export interface ReviewItem {
  id: number;
  property: { id: number; name: string };
  score: number;
  sentiment: Sentiment;
  title: string | null;
  positiveText: string | null;
  negativeText: string | null;
  reviewedAt: string;
  checkIn: string | null;
  nights: number | null;
  roomType: string | null;
  travellerType: string | null;
  reviewerName: string | null;
  reviewerCountry: string | null;
  language: string | null;
  ownerReply: string | null;
  complaintTopics: TopicTag[];
  praiseTopics: TopicTag[];
}

export interface ReviewsResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ReviewItem[];
}

export interface PropertyInfo {
  id: number;
  name: string;
  slug: string;
  url: string;
  overallScore: number | null;
  reviewCountOnSite: number | null;
  reviewsCollected: number;
  latestReviewAt: string | null;
  lastScrapedAt: string | null;
}

export interface DataStatusItem {
  propertyId: number;
  name: string;
  lastScrapedAt: string | null;
  lastRun: {
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'RUNNING';
    mode: string;
    finishedAt: string | null;
    fetched: number;
    inserted: number;
    error: string | null;
  } | null;
}

/** Filters shared by the trend chart, topic insights and review feed. */
export interface Filters {
  propertyIds: number[];
  from: string | null;
  to: string | null;
}
