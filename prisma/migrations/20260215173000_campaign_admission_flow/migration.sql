-- Add explicit application admission states and metadata for campaign submissions.

ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'APPLICATION_REJECTED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE "CampaignSubmission"
  ADD COLUMN "applicationDecisionNotes" TEXT,
  ADD COLUMN "applicationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "joinedAt" TIMESTAMP(3),
  ADD COLUMN "withdrawnAt" TIMESTAMP(3);

-- Backfill joinedAt for existing rows that are already effectively admitted.
UPDATE "CampaignSubmission"
SET "joinedAt" = "createdAt"
WHERE "status" = 'JOINED' AND "joinedAt" IS NULL;

UPDATE "CampaignSubmission"
SET "joinedAt" = COALESCE("submittedAt", "createdAt")
WHERE "joinedAt" IS NULL
  AND "status" IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REVISION_REQ', 'REJECTED', 'PAID');
