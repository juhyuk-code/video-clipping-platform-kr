-- Submission analytics for verified social ownership + automated sync

-- Enums
CREATE TYPE "SubmissionAnalyticsProvider" AS ENUM ('YOUTUBE', 'INSTAGRAM');
CREATE TYPE "MetricsSyncStatus" AS ENUM ('IDLE', 'ACTIVE', 'ERROR', 'DISCONNECTED');

-- CampaignSubmission analytics fields
ALTER TABLE "CampaignSubmission"
  ADD COLUMN "analyticsProvider" "SubmissionAnalyticsProvider",
  ADD COLUMN "platformVideoId" TEXT,
  ADD COLUMN "linkedSocialConnectionId" TEXT,
  ADD COLUMN "postedAt" TIMESTAMP(3),
  ADD COLUMN "ownershipVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "baselineCapturedAt" TIMESTAMP(3),
  ADD COLUMN "baselineViewCount" INTEGER,
  ADD COLUMN "baselineLikeCount" INTEGER,
  ADD COLUMN "baselineCommentCount" INTEGER,
  ADD COLUMN "lastMetricsSyncedAt" TIMESTAMP(3),
  ADD COLUMN "nextMetricsSyncAt" TIMESTAMP(3),
  ADD COLUMN "metricsSyncStatus" "MetricsSyncStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "metricsLastError" TEXT,
  ADD COLUMN "metricsAuthErrorCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CampaignSubmission"
  ADD CONSTRAINT "CampaignSubmission_linkedSocialConnectionId_fkey"
  FOREIGN KEY ("linkedSocialConnectionId") REFERENCES "SocialConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CampaignSubmission_metricsSyncStatus_nextMetricsSyncAt_idx"
  ON "CampaignSubmission"("metricsSyncStatus", "nextMetricsSyncAt");
CREATE INDEX "CampaignSubmission_linkedSocialConnectionId_idx"
  ON "CampaignSubmission"("linkedSocialConnectionId");

-- ViewSnapshot richer metrics payload
ALTER TABLE "ViewSnapshot"
  ADD COLUMN "reachCount" INTEGER,
  ADD COLUMN "impressionCount" INTEGER,
  ADD COLUMN "saveCount" INTEGER,
  ADD COLUMN "estimatedMinutesWatched" INTEGER,
  ADD COLUMN "averageViewDurationSec" DOUBLE PRECISION,
  ADD COLUMN "averageViewPercentage" DOUBLE PRECISION,
  ADD COLUMN "trafficExternalViews" INTEGER,
  ADD COLUMN "trafficSearchViews" INTEGER,
  ADD COLUMN "trafficSuggestedViews" INTEGER,
  ADD COLUMN "trafficDirectViews" INTEGER,
  ADD COLUMN "rawPayload" JSONB;
