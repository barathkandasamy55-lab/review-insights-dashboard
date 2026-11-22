-- CreateEnum
CREATE TYPE "Polarity" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "Property" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "bookingHotelId" INTEGER,
    "overallScore" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "positiveText" TEXT,
    "negativeText" TEXT,
    "language" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "nights" INTEGER,
    "roomType" TEXT,
    "travellerType" TEXT,
    "reviewerName" TEXT,
    "reviewerCountry" TEXT,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "ownerReply" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTopic" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "polarity" "Polarity" NOT NULL,

    CONSTRAINT "ReviewTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'RUNNING',
    "mode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Review_propertyId_reviewedAt_idx" ON "Review"("propertyId", "reviewedAt");

-- CreateIndex
CREATE INDEX "Review_reviewedAt_idx" ON "Review"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_propertyId_externalId_key" ON "Review"("propertyId", "externalId");

-- CreateIndex
CREATE INDEX "ReviewTopic_topic_polarity_idx" ON "ReviewTopic"("topic", "polarity");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTopic_reviewId_topic_polarity_key" ON "ReviewTopic"("reviewId", "topic", "polarity");

-- CreateIndex
CREATE INDEX "ScrapeRun_startedAt_idx" ON "ScrapeRun"("startedAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTopic" ADD CONSTRAINT "ReviewTopic_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
