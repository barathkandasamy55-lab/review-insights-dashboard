import { PrismaClient, ScrapeStatus } from '@prisma/client';
import { BlockedError, BookingSession, PAGE_SIZE, ReviewPage } from './booking-session';
import { NormalisedReview, mapReviewCard } from './review-mapper';
import { PropertyConfig } from './properties.config';
import { ReviewRepository } from './review-repository';
import { withRetry } from './retry';

export type ScrapeMode = 'full' | 'incremental';

export interface RunnerOptions {
  mode: ScrapeMode;
  channel?: string;
  minDelayMs: number;
  maxDelayMs: number;
  /** Max fraction of cards that may fail validation before the run is flagged as drifted. */
  maxInvalidRatio?: number;
}

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

/**
 * Scrapes one property. Never throws: failures are recorded on a ScrapeRun row so one broken
 * property does not stop the others and the UI can show data freshness honestly.
 */
export async function scrapeProperty(prisma: PrismaClient, cfg: PropertyConfig, opts: RunnerOptions): Promise<ScrapeStatus> {
  const repo = new ReviewRepository(prisma);
  const property = await prisma.property.upsert({
    where: { slug: cfg.slug },
    update: { name: cfg.name, url: cfg.url },
    create: { slug: cfg.slug, name: cfg.name, url: cfg.url },
  });
  // A run that is still RUNNING from an earlier process was killed mid-way: record that honestly.
  await prisma.scrapeRun.updateMany({
    where: { propertyId: property.id, status: 'RUNNING' },
    data: { status: 'FAILED', finishedAt: new Date(), error: 'Interrupted (process stopped before the run finished)' },
  });
  const run = await prisma.scrapeRun.create({ data: { propertyId: property.id, mode: opts.mode } });

  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let invalid = 0;
  let attempts = 0;
  const notes: string[] = [];
  let status: ScrapeStatus = 'SUCCESS';
  let session = null as BookingSession | null;

  const openSession = async () => {
    await session?.close();
    session = await BookingSession.open(opts.channel);
    return withRetry(
      async () => {
        attempts++;
        return session!.loadProperty(cfg.url);
      },
      { attempts: 3, baseMs: 4000, label: 'load property page', onRetry: (e, n, w) => log(`  load retry ${n}: ${e.message} (waiting ${w}ms)`) },
    );
  };

  try {
    log(`${cfg.name}: starting ${opts.mode} run`);
    const meta = await openSession();
    await prisma.property.update({
      where: { id: property.id },
      data: { bookingHotelId: meta.hotelId, overallScore: meta.ratingValue, reviewCount: meta.reviewCount },
    });

    let skip = 0;
    let total = Infinity;
    while (skip < total) {
      let page: ReviewPage;
      try {
        page = await withRetry(
          async () => {
            attempts++;
            return session!.fetchPage(skip);
          },
          { attempts: 4, baseMs: 3000, label: `fetch reviews @${skip}`, onRetry: (e, n, w) => log(`  page retry ${n}: ${e.message} (waiting ${w}ms)`) },
        );
      } catch {
        // Escalate once: the browser session itself may have been flagged. Start a fresh one.
        log('  re-establishing browser session after repeated failures');
        await openSession();
        attempts++;
        page = await session!.fetchPage(skip);
      }

      total = page.total;
      if (page.cards.length === 0) break;
      fetched += page.cards.length;

      const valid: NormalisedReview[] = [];
      for (const card of page.cards) {
        const m = mapReviewCard(card);
        if (m.ok) valid.push(m.review);
        else {
          invalid++;
          if (notes.length < 5) notes.push(m.reason);
        }
      }

      const known = await repo.knownIds(property.id, valid.map((v) => v.externalId));
      const stats = await repo.upsertMany(property.id, valid);
      inserted += stats.inserted;
      updated += stats.updated;
      log(`  ${cfg.label}: ${Math.min(skip + PAGE_SIZE, total)}/${total} (new ${stats.inserted}, updated ${stats.updated})`);

      // Incremental: reviews arrive newest-first, so a page made up entirely of already-known
      // reviews means we have caught up with everything previously collected.
      // It only stops if the stored count also matches the site total; otherwise an earlier
      // interrupted run left a gap further back, and we keep paging to backfill it.
      if (opts.mode === 'incremental' && valid.length > 0 && known.size === valid.length) {
        const stored = await prisma.review.count({ where: { propertyId: property.id } });
        if (stored >= total) {
          log('  caught up with existing data, stopping early');
          break;
        }
      }
      skip += PAGE_SIZE;
      if (skip < total) await session!.politeDelay(opts.minDelayMs, opts.maxDelayMs);
    }

    const maxRatio = opts.maxInvalidRatio ?? 0.2;
    if (fetched > 0 && invalid / fetched > maxRatio) {
      status = 'PARTIAL';
      notes.push(`${invalid}/${fetched} cards failed validation - the page format may have changed`);
    }
    if (opts.mode === 'full' && total !== Infinity) {
      const stored = await prisma.review.count({ where: { propertyId: property.id } });
      if (stored < total) {
        status = 'PARTIAL';
        notes.push(`collected ${stored} of ${total} reviews listed on the site`);
      }
    }
    await prisma.property.update({ where: { id: property.id }, data: { lastScrapedAt: new Date() } });
  } catch (e) {
    status = 'FAILED';
    notes.push((e as Error).message);
    log(`${cfg.name}: FAILED - ${(e as Error).message}${e instanceof BlockedError ? ' (blocked / format change)' : ''}`);
  } finally {
    await session?.close();
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        fetched,
        inserted,
        updated,
        attempts,
        error: notes.length ? notes.join(' | ').slice(0, 1000) : null,
      },
    });
  }
  log(`${cfg.name}: ${status} - fetched ${fetched}, new ${inserted}, updated ${updated}, invalid ${invalid}`);
  return status;
}
