import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiResponse } from "@/lib/api/helpers";
import { syncSubmissionMetrics } from "@/lib/social/submission-analytics";

const JOB_BATCH_SIZE = 30;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_JOBS_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader === `Bearer ${expected}`;
}

async function runMetricsSyncJob(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiError("Unauthorized", 401);
  }

  const now = new Date();
  const dueSubmissions = await prisma.campaignSubmission.findMany({
    where: {
      analyticsProvider: { in: ["YOUTUBE", "INSTAGRAM"] },
      status: { in: ["SUBMITTED", "IN_REVIEW", "REVISION_REQ", "APPROVED", "PAID"] },
      metricsSyncStatus: { in: ["ACTIVE", "ERROR"] },
      nextMetricsSyncAt: { lte: now },
    },
    orderBy: { nextMetricsSyncAt: "asc" },
    take: JOB_BATCH_SIZE,
    select: { id: true },
  } as any);

  let success = 0;
  let failed = 0;
  const errors: Array<{ submissionId: string; error: string }> = [];

  for (const submission of dueSubmissions) {
    const result = await syncSubmissionMetrics(submission.id);
    if (result.ok) {
      success++;
      continue;
    }

    failed++;
    errors.push({
      submissionId: submission.id,
      error: result.reason || "unknown_error",
    });
  }

  return apiResponse({
    processedAt: now.toISOString(),
    fetched: dueSubmissions.length,
    success,
    failed,
    errors,
  });
}

// Vercel Cron invokes GET requests.
export async function GET(request: NextRequest) {
  return runMetricsSyncJob(request);
}

// Keep POST for manual/internal triggers.
export async function POST(request: NextRequest) {
  return runMetricsSyncJob(request);
}
