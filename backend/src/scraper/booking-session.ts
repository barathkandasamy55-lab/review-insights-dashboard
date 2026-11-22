import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { jitter, sleep } from './retry';

export const PAGE_SIZE = 25; // largest page the ReviewList endpoint honours

export interface PropertyMeta {
  hotelId: number | null;
  ratingValue: number | null;
  reviewCount: number | null;
}

export interface ReviewPage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards: any[];
  total: number;
}

interface RequestTemplate {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Thrown when Booking.com refuses the request (bot protection) or returns an unexpected shape. */
export class BlockedError extends Error {}

/**
 * Drives a real (headed) Chrome session so the AWS WAF challenge is solved by the browser itself,
 * then replays the page's own `ReviewList` GraphQL request with different skip/sort values.
 * See README "Review collection method" for why this approach was chosen.
 */
export class BookingSession {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private template: RequestTemplate | null = null;

  static async open(channel?: string): Promise<BookingSession> {
    const s = new BookingSession();
    const launch = async (ch?: string) =>
      chromium.launch({
        headless: false, // headless browsers are rejected by the review endpoint (see README)
        channel: ch || undefined,
        args: ['--disable-blink-features=AutomationControlled', '--start-minimized'],
      });
    try {
      s.browser = await launch(channel);
    } catch (e) {
      console.warn(`  could not launch channel "${channel}" (${(e as Error).message.split('\n')[0]}); falling back to bundled Chromium`);
      s.browser = await launch(undefined);
    }
    s.context = await s.browser.newContext({ locale: 'en-AU', timezoneId: 'Australia/Sydney', viewport: { width: 1366, height: 900 } });
    s.page = await s.context.newPage();
    s.page.on('request', (r) => {
      if (r.url().includes('/dml/graphql') && (r.postData() ?? '').includes('"operationName":"ReviewList"')) {
        s.template = { url: r.url(), headers: r.headers(), body: r.postData() ?? '' };
      }
    });
    return s;
  }

  /** Loads the property page, opens the reviews dialog and captures the ReviewList request template. */
  async loadProperty(url: string): Promise<PropertyMeta> {
    this.template = null;
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const title = await this.page.title();
    if (!title) throw new BlockedError('Page title empty - bot-challenge page was served instead of the property page');

    const button = this.page.locator('[data-testid="fr-read-all-reviews"]').first();
    await button.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {
      throw new BlockedError('"Read all reviews" button not found - page layout may have changed');
    });

    for (let i = 0; i < 4 && !this.template; i++) {
      await sleep(3000); // let the page hydrate before clicking
      await button.click({ timeout: 10_000 }).catch(() => undefined);
      for (let j = 0; j < 16 && !this.template; j++) await sleep(500);
    }
    if (!this.template) throw new BlockedError('ReviewList request was never issued by the page');

    const ld = await this.page
      .$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent ?? ''))
      .catch(() => [] as string[]);
    let ratingValue: number | null = null;
    let reviewCount: number | null = null;
    for (const raw of ld) {
      try {
        const j = JSON.parse(raw);
        if (j?.aggregateRating) {
          ratingValue = Number(j.aggregateRating.ratingValue) || null;
          reviewCount = Number(j.aggregateRating.reviewCount) || null;
        }
      } catch {
        /* ignore malformed block */
      }
    }
    const captured = this.template as RequestTemplate;
    const hotelId = Number(JSON.parse(captured.body)?.variables?.input?.hotelId) || null;
    return { hotelId, ratingValue, reviewCount };
  }

  /** Fetches one page of reviews (newest first) by replaying the captured request. */
  async fetchPage(skip: number): Promise<ReviewPage> {
    if (!this.template) throw new BlockedError('no request template - call loadProperty first');
    const result = await this.page.evaluate(
      async ({ tpl, skip, limit }) => {
        const body = JSON.parse(tpl.body);
        Object.assign(body.variables.input, { sorter: 'NEWEST_FIRST', skip, limit, filters: { text: '' } });
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(tpl.headers)) if (/^(content-type|x-booking|accept$)/i.test(k)) headers[k] = v as string;
        const res = await fetch(tpl.url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        const json = await res.json();
        const data = json?.data?.reviewListFrontend;
        if (!data) return { error: 'response had no reviewListFrontend' };
        if (data.__typename === 'ReviewsFrontendError') return { error: `${data.statusCode} ${data.message}` };
        return { cards: data.reviewCard ?? [], total: data.reviewsCount ?? 0 };
      },
      { tpl: this.template, skip, limit: PAGE_SIZE },
    );
    if ('error' in result) throw new BlockedError(`ReviewList error: ${result.error}`);
    return result as ReviewPage;
  }

  async politeDelay(minMs: number, maxMs: number) {
    await sleep(jitter(minMs, maxMs));
  }

  async close() {
    await this.browser?.close().catch(() => undefined);
  }
}
