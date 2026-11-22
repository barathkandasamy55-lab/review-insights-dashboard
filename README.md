# Guest Review Insights - Azzurro Hotels

A dashboard for operations staff built on public Booking.com guest reviews for four Sydney properties
(Olympic Hotel Paddington, Potts Point, Central Sydney, Darling Harbour).

- **backend/** NestJS + Prisma + PostgreSQL: the review collector (CLI) and a read-only JSON API
- **frontend/** Next.js (App Router) + TypeScript + Tailwind + Recharts: the dashboard
- **data/** sample dataset exported from a real collection run

```
Booking.com ──(headed Chrome via Playwright)──> collector CLI ──> PostgreSQL ──> NestJS API ──> Next.js dashboard
```

## Quick start

Requirements: Node 20+, Docker (for Postgres), Google Chrome or Microsoft Edge installed.

```bash
# 1. database
docker compose up -d

# 2. backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run import          # loads data/sample-reviews.json (no scraping needed)
npm run start:dev       # API on http://localhost:4000/api  (Swagger: /api/docs)

# 3. frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

### Collecting live reviews

```bash
cd backend
npm run scrape                                   # incremental update, all four properties
npm run scrape -- --full                         # re-collect everything (also refreshes edited reviews)
npm run scrape -- --property=chateau-de-venus    # one property
npm run export:sample                            # refresh data/sample-reviews.json
npm run reclassify                               # re-run topic tagging after editing keywords
```

Sample data (`data/sample-reviews.json`, collected 22 Nov 2026) holds **9,274 reviews**: Olympic Hotel Paddington 125,
Potts Point 2,392, Central Sydney 2,448, Darling Harbour 4,309. Each count matched the total Booking.com listed,
with 0 cards rejected by validation.

A Chrome window opens while collecting. **Leave it open** until the run finishes; closing it aborts that
property (the next run resumes where it stopped). Collection of a large property takes a few minutes
because requests are deliberately paced.

Tests: `cd backend && npx jest --runInBand`.

## Review collection method

Booking.com has no API for us, so the collector drives a real browser and reads the data the page itself loads.

What I found by testing the pages first:

| Approach | Result |
|---|---|
| Plain HTTP request + HTML parsing | Blocked. Booking.com serves an AWS WAF JavaScript challenge (HTTP 202, no content). |
| Headless browser (Playwright Chromium or headless Chrome) | Page loads, but the review endpoint answers `400 Request not supported`. |
| **Headed (visible) Chrome via Playwright** | Works. The page loads and the "Read all reviews" dialog fetches reviews normally. |

So the collector:

1. Opens the property page in headed Chrome (the browser solves the bot challenge, like any visitor).
2. Opens the reviews dialog and captures the page's own `ReviewList` GraphQL request.
3. Replays that request from inside the page with `skip`/`limit` (25 per page, newest first), reusing the same
   cookies and headers. This returns structured JSON, which is far more reliable than scraping CSS classes.
4. Validates every card, then upserts into PostgreSQL.

Fields collected: review id, score, title, liked text, disliked text, language, review date, check-in/out
dates, nights, room type, traveller type, reviewer first name and country, helpful votes, hotel reply.
Reviewer avatars and photos are not stored.

### Reliability

- **No duplicates:** Booking.com's per-review hash is stored as `externalId`; `(propertyId, externalId)` is a
  unique key and writes are upserts, so re-running is always safe.
- **Updating:** incremental mode reads newest-first and stops once it reaches a page that is entirely known
  *and* the stored count matches the site total. If an earlier run was interrupted and left a gap, it keeps
  paging to backfill instead of stopping early. `--full` re-reads everything and updates edited reviews.
- **Retries:** page loads retry 3x and page fetches 4x with exponential backoff and jitter. If a session keeps
  failing, a fresh browser session is started once. Requests are paced (1.5-3.5 s) and properties are spaced out.
- **Failure isolation:** each property is its own run. A failure is recorded in `ScrapeRun` (status, counts,
  error) and does not stop the other properties. The dashboard shows "last updated" and warns on failed or
  stale runs. Runs left `RUNNING` by a killed process are marked failed on the next start.
- **Format-change detection:** cards missing an id, a valid 1-10 score or a date are rejected and counted. If
  more than 20% of cards are invalid, or fewer reviews are stored than the site reports after a full run,
  the run is flagged `PARTIAL` instead of silently succeeding. A missing "Read all reviews" button or an
  empty challenge page raises a clear "blocked / layout changed" error.
- **Offline fallback:** `data/sample-reviews.json` can be loaded with `npm run import`, so the app works even if
  collection is blocked.

### Limitations and assumptions

- **Terms of service:** Booking.com's terms restrict automated access. This collector only reads publicly visible
  reviews, at human-like pacing, for internal analysis. For production use, ask Booking.com for official partner/
  Connectivity API access; the collector is a stop-gap.
- **Headed browser required:** headless mode is rejected today. On a server this needs a virtual display (e.g.
  Xvfb) or a desktop session. This behaviour can change at any time.
- **Fragile by nature:** the GraphQL operation and its response shape are not a public contract. Validation and
  `PARTIAL`/`FAILED` statuses are there to make breakage visible quickly, not to prevent it.
- **Only guest-written reviews that Booking.com publishes** are visible. Removed or moderated reviews disappear
  from the site; incremental runs do not delete them locally (a `--full` run does not either).
- **Language:** reviews are collected in the language written. Topic keywords are English only.
- **Not real-time:** data is as fresh as the last collector run. Schedule `npm run scrape` (e.g. daily) via
  Task Scheduler/cron on a machine with Chrome.
- **Time zone:** weeks run Monday to Sunday in Sydney time (`Australia/Sydney`), including daylight saving.

## Dashboard

- **This week vs last week:** average rating, review count and negative reviews, with change badges.
- **Ratings by property:** average, change vs the previous period, positive/negative counts.
- **Positive and negative trend:** stacked daily/weekly/monthly chart.
- **What guests talk about:** topic breakdown with plain-English headlines; click a topic to filter the feed.
- **Review feed:** search, rating filter, sort, pagination, hotel replies, topic tags.
- **Filters:** property chips and date range apply to everything except the "this week" panel (always the
  current week, respecting only the property filter).
- **Data freshness:** last update time per property and warnings when a run failed or is stale.

Sentiment buckets (Booking.com 1-10 scale): **positive = 8 or higher**, **negative = below 6**, neutral in between.

## Review insights (topic methodology)

Booking.com reviews have two boxes: *liked* and *disliked*. The guest has already chosen the sentiment, so
polarity comes from the box rather than from guessing sentiment in free text.

1. Filler such as "Nothing", "N/A" or "No complaints" is discarded.
2. Each box is matched against hand-written keyword/regex lists for 11 topics: cleanliness, check-in experience,
   staff & service, noise, facilities, location, room condition, value for money, bed & comfort,
   breakfast & food, Wi-Fi.
3. A topic found in *disliked* text is a **complaint**, in *liked* text it is **praise**.
4. "40% of reviews with complaints mentioned cleanliness" = reviews whose disliked text mentions the topic divided by
   reviews that have non-trivial disliked text in the selected period.

**How it was checked:** I sampled ~14 random tagged complaints per topic from the real data and read them. The first
version was too loose (e.g. any mention of "bathroom" counted as *room condition*, "area" and "near" counted as
*location*, a bare "bed" counted as *comfort*). Those keywords now need a problem word next to them
("broken door lock", "bed too hard"), and `npm run reclassify` re-tags everything. Sampled precision after tuning is
roughly 70-85% for most topics (cleanliness is the strongest); recall is lower because guests phrase things in
many ways. Treat percentages as a reliable direction and ranking, not exact counts. A dev helper,
`backend/src/scraper/pattern-stats.ts`, shows which keywords fire most so over-broad ones are easy to spot.

Why not AI or sentiment models: keywords are transparent and cheap, there is no API key to leak and results are
reproducible, and the liked/disliked split removes most of the need for sentiment analysis. Limits: no
understanding of context or sarcasm ("not clean" and "clean" both match), a keyword can occasionally be too
broad (e.g. "old", "walk"), topics are not mutually exclusive, and non-English text is mostly missed. Swapping in
an LLM classifier would only require replacing `classifyReview()` in
`backend/src/modules/insights/topic-classifier.ts`.

## Architecture

```
backend/src
  scraper/        browser session, validation mapper, retry, runner, CLIs (scrape / import / export)
  modules/
    properties/   GET /api/properties, /api/data-status
    dashboard/    GET /api/dashboard/summary, /api/dashboard/trends
    insights/     GET /api/insights/topics (+ topic-classifier)
    reviews/      GET /api/reviews
  prisma/         PrismaService / module
  common/         Sydney date-range helpers, filter parsing
backend/prisma    schema + migrations (Property, Review, ReviewTopic, ScrapeRun)

frontend
  app/            Next.js pages
  components/     filters/, dashboard/, common/
  lib/            api/ (axios client)  services/  hooks/  utils/  types.ts
```

Controller -> service -> Prisma on the API side; component -> hook -> service -> axios on the UI side.

## Security

No credentials, cookies or API keys are committed or needed. `.env` files are git-ignored; only
`.env.example` files are tracked. The collector stores no browser cookies. Reviewer names are first names as shown
publicly (anonymous reviewers are stored as empty).
