import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { TOPICS, isTrivialText } from '../modules/insights/topic-classifier';

/** Dev tool: which individual keyword patterns fire most in complaint text (to spot over-broad ones). */
async function main() {
  const wanted = process.argv.slice(2);
  const prisma = new PrismaClient();
  const rows = await prisma.review.findMany({ where: { hasComplaint: true }, select: { negativeText: true } });
  for (const topic of TOPICS.filter((t) => !wanted.length || wanted.includes(t.key))) {
    const counts = topic.patterns.map((p) => ({ p: p.source.slice(0, 60), n: rows.filter((r) => !isTrivialText(r.negativeText) && p.test(r.negativeText as string)).length }));
    console.log(`\n== ${topic.label}`);
    counts.sort((a, b) => b.n - a.n).slice(0, 8).forEach((c) => console.log(String(c.n).padStart(5), c.p));
  }
  await prisma.$disconnect();
}
main();
