-- Add campaign workflow versioning with safe legacy backfill.
CREATE TYPE "CampaignWorkflow" AS ENUM ('LEGACY_CLIPPER_PUBLISH', 'CREATOR_PUBLISH');

ALTER TABLE "Campaign"
ADD COLUMN "workflow" "CampaignWorkflow" NOT NULL DEFAULT 'CREATOR_PUBLISH';

-- Existing campaigns keep current behavior until manually migrated.
UPDATE "Campaign"
SET "workflow" = 'LEGACY_CLIPPER_PUBLISH';
