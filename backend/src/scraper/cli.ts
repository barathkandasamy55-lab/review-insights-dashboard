import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PROPERTIES } from './properties.config';
import { ScrapeMode, scrapeProperty } from './scrape-runner';
import { jitter, sleep } from './retry';

/**
 * Usage:
 *   npm run scrape                       incremental update of all properties
 *   npm run scrape -- --full             re-collect every review (also refreshes edited ones)
 *   npm run scrape -- --property=chateau-de-venus
 */
async function main() {
  const args = process.argv.slice(2);
  const mode: ScrapeMode = args.includes('--full') ? 'full' : 'incremental';
  const only = args.find((a) => a.startsWith('--property='))?.split('=')[1];
  const targets = PROPERTIES.filter((p) => !only || p.slug === only);
  if (!targets.length) throw new Error(`Unknown property "${only}". Known: ${PROPERTIES.map((p) => p.slug).join(', ')}`);

  const prisma = new PrismaClient();
  const results: string[] = [];
  try {
    for (const [i, cfg] of targets.entries()) {
      const status = await scrapeProperty(prisma, cfg, {
        mode,
        channel: process.env.SCRAPER_CHANNEL,
        minDelayMs: Number(process.env.SCRAPER_MIN_DELAY_MS ?? 1500),
        maxDelayMs: Number(process.env.SCRAPER_MAX_DELAY_MS ?? 3500),
      });
      results.push(`${cfg.label}: ${status}`);
      if (i < targets.length - 1) await sleep(jitter(4000, 8000)); // pause between properties
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log('\nSummary\n  ' + results.join('\n  '));
  if (results.some((r) => r.endsWith('FAILED'))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
