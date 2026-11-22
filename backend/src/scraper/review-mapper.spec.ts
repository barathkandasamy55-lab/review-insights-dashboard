import { mapReviewCard } from './review-mapper';

const card = (over: Record<string, unknown> = {}) => ({
  reviewUrl: 'abc123',
  reviewScore: 8,
  reviewedDate: 1795060642,
  textDetails: { title: 'Good', positiveText: 'Nice &amp; clean', negativeText: 'Noisy', lang: 'en' },
  bookingDetails: { checkinDate: '2026-10-23', checkoutDate: '2026-10-24', numNights: 1, roomType: { name: 'Double' }, customerType: 'COUPLES' },
  guestDetails: { username: 'Sam', countryName: 'Australia', guestTypeTranslation: 'Couple', anonymous: false },
  helpfulVotesCount: 2,
  partnerReply: { reply: 'Thanks &#39;Sam&#39;' },
  ...over,
});

describe('mapReviewCard', () => {
  it('maps a valid card and decodes HTML entities', () => {
    const r = mapReviewCard(card());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.review.externalId).toBe('abc123');
      expect(r.review.positiveText).toBe('Nice & clean');
      expect(r.review.ownerReply).toBe("Thanks 'Sam'");
      expect(r.review.reviewedAt.toISOString()).toBe('2026-11-19T03:57:22.000Z');
      expect(r.review.nights).toBe(1);
    }
  });

  it('hides anonymous reviewer names', () => {
    const r = mapReviewCard(card({ guestDetails: { username: 'Sam', anonymous: true } }));
    expect(r.ok && r.review.reviewerName).toBeNull();
  });

  it('rejects cards that would corrupt the data', () => {
    expect(mapReviewCard(card({ reviewUrl: undefined })).ok).toBe(false);
    expect(mapReviewCard(card({ reviewScore: 'x' })).ok).toBe(false);
    expect(mapReviewCard(card({ reviewScore: 42 })).ok).toBe(false);
    expect(mapReviewCard(card({ reviewedDate: 0 })).ok).toBe(false);
    expect(mapReviewCard(null).ok).toBe(false);
  });
});
