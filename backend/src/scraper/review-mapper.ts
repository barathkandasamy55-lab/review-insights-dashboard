/** Raw GraphQL card -> normalised review, with validation so schema drift is detected, not ignored. */

export interface NormalisedReview {
  externalId: string;
  score: number;
  title: string | null;
  positiveText: string | null;
  negativeText: string | null;
  language: string | null;
  reviewedAt: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number | null;
  roomType: string | null;
  travellerType: string | null;
  reviewerName: string | null;
  reviewerCountry: string | null;
  helpfulVotes: number;
  ownerReply: string | null;
}

export type MapResult = { ok: true; review: NormalisedReview } | { ok: false; reason: string };

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const clean = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = decode(v.replace(/\r/g, '')).trim();
  return t.length ? t : null;
};

const toDate = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReviewCard(card: any): MapResult {
  if (!card || typeof card !== 'object') return { ok: false, reason: 'card is not an object' };
  const externalId = clean(card.reviewUrl);
  if (!externalId) return { ok: false, reason: 'missing reviewUrl (id)' };
  const score = Number(card.reviewScore);
  if (!Number.isFinite(score) || score < 1 || score > 10) {
    return { ok: false, reason: `invalid score "${card.reviewScore}"` };
  }
  const seconds = Number(card.reviewedDate);
  if (!Number.isFinite(seconds) || seconds < 946684800) {
    return { ok: false, reason: `invalid reviewedDate "${card.reviewedDate}"` };
  }
  const text = card.textDetails ?? {};
  const booking = card.bookingDetails ?? {};
  const guest = card.guestDetails ?? {};
  const reply = card.partnerReply;
  const replyText = typeof reply === 'string' ? reply : clean(reply?.reply);

  return {
    ok: true,
    review: {
      externalId,
      score,
      title: clean(text.title),
      positiveText: clean(text.positiveText),
      negativeText: clean(text.negativeText),
      language: clean(text.lang),
      reviewedAt: new Date(seconds * 1000),
      checkIn: toDate(booking.checkinDate),
      checkOut: toDate(booking.checkoutDate),
      nights: Number.isFinite(Number(booking.numNights)) ? Number(booking.numNights) : null,
      roomType: clean(booking.roomType?.name),
      travellerType: clean(guest.guestTypeTranslation) ?? clean(booking.customerType),
      reviewerName: guest.anonymous ? null : clean(guest.username),
      reviewerCountry: clean(guest.countryName),
      helpfulVotes: Number(card.helpfulVotesCount) || 0,
      ownerReply: replyText,
    },
  };
}
