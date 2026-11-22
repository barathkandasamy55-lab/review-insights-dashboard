import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ReviewRepository } from './review-repository';

async function main() {
  const prisma = new PrismaClient();
  const n = await new ReviewRepository(prisma).reclassifyAll();
  console.log(`Re-classified ${n} reviews`);
  await prisma.$disconnect();
}
main();
