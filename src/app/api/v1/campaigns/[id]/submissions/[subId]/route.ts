import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiResponse, apiError, requireAuth, parseBody } from "@/lib/api/helpers";
import { submitToCampaignSchema, reviewSubmissionSchema } from "@/lib/validations";
import { calculateFees } from "@/lib/payments/toss";
import {
  buildSubmissionAnalyticsPayload,
  computeNextMetricsSyncAt,
  deriveAnalyticsProvider,
  prepareVerifiedSubmissionContext,
} from "@/lib/social/submission-analytics";

// GET /api/v1/campaigns/[id]/submissions/[subId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: {
      campaign: {
        include: {
          creator: { select: { id: true, nickname: true, name: true, image: true } },
        },
      },
      clipper: {
        select: {
          id: true,
          nickname: true,
          name: true,
          image: true,
          bio: true,
          clipperProfile: {
            select: {
              editingTools: true,
              specializations: true,
              languages: true,
              tier: true,
              averageRating: true,
              totalProjectsCompleted: true,
            },
          },
        },
      },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 10 },
      fraudCheck: true,
    },
  });

  if (!submission) return apiError("Submission not found", 404);
  if (submission.clipperId !== user.id && submission.campaign.creatorId !== user.id) {
    return apiError("Forbidden", 403);
  }

  return apiResponse({
    ...submission,
    analytics: buildSubmissionAnalyticsPayload(submission as any),
  });
}

// PUT /api/v1/campaigns/[id]/submissions/[subId] — Submit clip OR review submission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: { campaign: true },
  });
  if (!submission) return apiError("Submission not found", 404);
  if (submission.campaignId !== id) return apiError("Submission does not belong to this campaign", 400);

  const body = await request.json();
  const isCreator = submission.campaign.creatorId === user.id;
  const isClipper = submission.clipperId === user.id;

  // ── Clipper submitting a clip ──
  if (isClipper && !isCreator) {
    if (submission.status === "APPLIED") {
      return apiError("지원이 아직 승인되지 않았습니다. 승인 후 클립을 제출해주세요.");
    }
    if (submission.status === "APPLICATION_REJECTED") {
      return apiError("반려된 지원서는 클립을 제출할 수 없습니다.");
    }
    if (submission.status === "WITHDRAWN") {
      return apiError("철회된 지원서는 클립을 제출할 수 없습니다.");
    }

    if (!["JOINED", "REVISION_REQ", "SUBMITTED"].includes(submission.status)) {
      return apiError("현재 상태에서는 클립을 제출할 수 없습니다");
    }

    if (submission.campaign.status !== "ACTIVE") {
      return apiError("캠페인이 활성 상태가 아니어서 제출할 수 없습니다.");
    }

    const parsed = parseBody(submitToCampaignSchema, body);
    if ("error" in parsed) return apiError(parsed.error);

    const analyticsProvider = deriveAnalyticsProvider(parsed.data.targetPlatform);
    let verifiedContext:
      | Awaited<ReturnType<typeof prepareVerifiedSubmissionContext>>
      | null = null;

    if (analyticsProvider) {
      if (!parsed.data.clipUrl) {
        return apiError("YouTube/Instagram 제출은 게시된 클립 URL이 필요합니다.");
      }

      try {
        verifiedContext = await prepareVerifiedSubmissionContext({
          clipperId: user.id,
          clipUrl: parsed.data.clipUrl,
          targetPlatform: parsed.data.targetPlatform,
        });
      } catch (err) {
        return apiError(err instanceof Error ? err.message : "클립 URL 검증에 실패했습니다.");
      }
    }

    const isFirstSubmission = !submission.submittedAt;
    const submittedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.campaignSubmission.update({
        where: { id: subId },
        data: {
          clipTitle: parsed.data.clipTitle,
          clipUrl: verifiedContext?.canonicalUrl ?? parsed.data.clipUrl,
          clipFileUrl: parsed.data.clipFileUrl,
          thumbnailUrl: parsed.data.thumbnailUrl,
          targetPlatform: parsed.data.targetPlatform,
          status: "SUBMITTED",
          submittedAt,
          analyticsProvider: verifiedContext?.providerEnum ?? null,
          platformVideoId: verifiedContext?.platformVideoId ?? null,
          linkedSocialConnectionId: verifiedContext?.linkedSocialConnectionId ?? null,
          postedAt: verifiedContext?.postedAt ?? null,
          ownershipVerifiedAt: verifiedContext?.ownershipVerifiedAt ?? null,
          baselineCapturedAt: verifiedContext ? submittedAt : null,
          baselineViewCount: verifiedContext?.current.viewCount ?? null,
          baselineLikeCount: verifiedContext?.current.likeCount ?? null,
          baselineCommentCount: verifiedContext?.current.commentCount ?? null,
          latestViewCount: verifiedContext?.current.viewCount ?? 0,
          lastSnapshotAt: verifiedContext ? submittedAt : null,
          lastMetricsSyncedAt: verifiedContext ? submittedAt : null,
          nextMetricsSyncAt: verifiedContext ? computeNextMetricsSyncAt(submittedAt, submittedAt) : null,
          metricsSyncStatus: verifiedContext ? "ACTIVE" : "IDLE",
          metricsLastError: null,
          metricsAuthErrorCount: 0,
        },
      } as any);

      if (verifiedContext) {
        await tx.viewSnapshot.create({
          data: {
            submissionId: subId,
            viewCount: verifiedContext.current.viewCount,
            likeCount: verifiedContext.current.likeCount,
            commentCount: verifiedContext.current.commentCount,
            shareCount: verifiedContext.current.shareCount,
            reachCount: verifiedContext.current.reachCount,
            impressionCount: verifiedContext.current.impressionCount,
            saveCount: verifiedContext.current.saveCount,
            estimatedMinutesWatched: verifiedContext.current.estimatedMinutesWatched,
            averageViewDurationSec: verifiedContext.current.averageViewDurationSec,
            averageViewPercentage: verifiedContext.current.averageViewPercentage,
            trafficExternalViews: verifiedContext.current.trafficExternalViews,
            trafficSearchViews: verifiedContext.current.trafficSearchViews,
            trafficSuggestedViews: verifiedContext.current.trafficSuggestedViews,
            trafficDirectViews: verifiedContext.current.trafficDirectViews,
            delta: verifiedContext.current.viewCount,
            source: verifiedContext.providerEnum === "YOUTUBE" ? "YOUTUBE_API" : "INSTAGRAM_API",
            rawPayload: verifiedContext.current.rawPayload as any,
            capturedAt: submittedAt,
          } as any,
        });
      }

      if (verifiedContext) {
        await tx.socialVideo.upsert({
          where: {
            socialConnectionId_platformVideoId: {
              socialConnectionId: verifiedContext.linkedSocialConnectionId,
              platformVideoId: verifiedContext.platformVideoId,
            },
          },
          create: {
            socialConnectionId: verifiedContext.linkedSocialConnectionId,
            platformVideoId: verifiedContext.platformVideoId,
            submissionId: subId,
            url: verifiedContext.canonicalUrl,
            title: parsed.data.clipTitle,
            thumbnailUrl: parsed.data.thumbnailUrl,
            viewCount: verifiedContext.current.viewCount,
            likeCount: verifiedContext.current.likeCount,
            commentCount: verifiedContext.current.commentCount,
            shareCount: verifiedContext.current.shareCount ?? 0,
            publishedAt: verifiedContext.postedAt ?? undefined,
            lastSyncedAt: submittedAt,
          },
          update: {
            submissionId: subId,
            url: verifiedContext.canonicalUrl,
            title: parsed.data.clipTitle,
            thumbnailUrl: parsed.data.thumbnailUrl,
            viewCount: verifiedContext.current.viewCount,
            likeCount: verifiedContext.current.likeCount,
            commentCount: verifiedContext.current.commentCount,
            shareCount: verifiedContext.current.shareCount ?? 0,
            publishedAt: verifiedContext.postedAt ?? undefined,
            lastSyncedAt: submittedAt,
          },
        });
      }

      if (isFirstSubmission) {
        await tx.campaign.update({
          where: { id },
          data: { submissionCount: { increment: 1 } },
        });
      }
      return sub;
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: submission.campaign.creatorId,
        type: "CLIP_SUBMITTED",
        title: "클립이 제출되었습니다",
        body: `"${submission.campaign.title}" 캠페인에 새 클립이 제출되었습니다.`,
        linkUrl: `/campaigns/${id}`,
      },
    });

    const analyticsSummary = buildSubmissionAnalyticsPayload({
      ...updated,
      snapshots: verifiedContext
        ? [
            {
              viewCount: verifiedContext.current.viewCount,
              likeCount: verifiedContext.current.likeCount,
              commentCount: verifiedContext.current.commentCount,
              shareCount: verifiedContext.current.shareCount ?? 0,
              reachCount: verifiedContext.current.reachCount ?? 0,
              impressionCount: verifiedContext.current.impressionCount ?? 0,
              saveCount: verifiedContext.current.saveCount ?? 0,
              estimatedMinutesWatched: verifiedContext.current.estimatedMinutesWatched ?? 0,
              averageViewDurationSec: verifiedContext.current.averageViewDurationSec ?? null,
              averageViewPercentage: verifiedContext.current.averageViewPercentage ?? null,
              trafficExternalViews: verifiedContext.current.trafficExternalViews ?? 0,
              trafficSearchViews: verifiedContext.current.trafficSearchViews ?? 0,
              trafficSuggestedViews: verifiedContext.current.trafficSuggestedViews ?? 0,
              trafficDirectViews: verifiedContext.current.trafficDirectViews ?? 0,
            },
          ]
        : [],
    });

    return apiResponse({
      ...updated,
      analyticsSummary,
      analyticsSyncStarted: Boolean(verifiedContext),
    });
  }

  // ── Creator reviewing a submission ──
  if (isCreator) {
    if (!["SUBMITTED", "IN_REVIEW"].includes(submission.status)) {
      return apiError("리뷰할 수 있는 상태가 아닙니다");
    }

    const parsed = parseBody(reviewSubmissionSchema, body);
    if ("error" in parsed) return apiError(parsed.error);

    const { status } = parsed.data;
    const revisionNotes = parsed.data.revisionNotes?.trim();

    if (status === "APPROVED") {
      // Process payment for PROJECT/HYBRID types
      const campaign = submission.campaign;
      let payAmount = 0;

      if (campaign.type === "PROJECT" || campaign.type === "HYBRID") {
        payAmount = Number(campaign.fixedPayPerClip ?? 0);
      }

      if (payAmount > 0) {
        const { platformFee, netPayeeAmount } = calculateFees(payAmount);

        await prisma.$transaction(async (tx) => {
          // Update submission
          await tx.campaignSubmission.update({
            where: { id: subId },
            data: {
              status: "APPROVED",
              reviewedAt: new Date(),
              fixedAmount: netPayeeAmount,
              totalPaid: netPayeeAmount,
              paidAt: new Date(),
            },
          });

          // Update campaign counters
          await tx.campaign.update({
            where: { id },
            data: {
              approvedCount: { increment: 1 },
              totalSpent: { increment: payAmount },
            },
          });

          // Release from escrow to clipper wallet
          const creatorWallet = await tx.wallet.findUnique({ where: { userId: campaign.creatorId } });
          if (creatorWallet) {
            await tx.wallet.update({
              where: { userId: campaign.creatorId },
              data: { escrowHeld: { decrement: payAmount } },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: creatorWallet.id,
                type: "ESCROW_RELEASE",
                status: "COMPLETED",
                amount: payAmount,
                balanceBefore: Number(creatorWallet.balance),
                balanceAfter: Number(creatorWallet.balance),
                description: `에스크로 릴리스: ${campaign.title}`,
                referenceId: subId,
                referenceType: "submission",
              },
            });
          }

          // Credit clipper wallet
          let clipperWallet = await tx.wallet.findUnique({ where: { userId: submission.clipperId } });
          if (!clipperWallet) {
            clipperWallet = await tx.wallet.create({
              data: { userId: submission.clipperId },
            });
          }
          const clipperBalanceBefore = Number(clipperWallet.balance);
          await tx.wallet.update({
            where: { userId: submission.clipperId },
            data: {
              balance: { increment: netPayeeAmount },
              totalEarned: { increment: netPayeeAmount },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: clipperWallet.id,
              type: "ESCROW_RELEASE",
              status: "COMPLETED",
              amount: netPayeeAmount,
              balanceBefore: clipperBalanceBefore,
              balanceAfter: clipperBalanceBefore + netPayeeAmount,
              description: `클립 승인 수익: ${campaign.title}`,
              referenceId: subId,
              referenceType: "submission",
            },
          });
        });
      } else {
        await prisma.$transaction([
          prisma.campaignSubmission.update({
            where: { id: subId },
            data: { status: "APPROVED", reviewedAt: new Date() },
          }),
          prisma.campaign.update({
            where: { id },
            data: { approvedCount: { increment: 1 } },
          }),
        ]);
      }

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "CAMPAIGN_APPROVED",
          title: "클립이 승인되었습니다!",
          body: `"${submission.campaign.title}" 캠페인의 클립이 승인되었습니다.`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      const updated = await prisma.campaignSubmission.findUnique({ where: { id: subId } });
      return apiResponse(updated);
    }

    if (status === "REVISION_REQ") {
      const updated = await prisma.campaignSubmission.update({
        where: { id: subId },
        data: {
          status: "REVISION_REQ",
          revisionNotes,
          revisionCount: { increment: 1 },
          reviewedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "REVISION_REQUESTED",
          title: "수정이 요청되었습니다",
          body: `"${submission.campaign.title}" 캠페인 클립에 수정 요청이 있습니다. 사유: ${revisionNotes}`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      return apiResponse(updated);
    }

    if (status === "REJECTED") {
      const updated = await prisma.campaignSubmission.update({
        where: { id: subId },
        data: {
          status: "REJECTED",
          revisionNotes,
          reviewedAt: new Date(),
          nextMetricsSyncAt: null,
          metricsSyncStatus: "IDLE",
        } as any,
      });

      await prisma.notification.create({
        data: {
          userId: submission.clipperId,
          type: "CAMPAIGN_REJECTED",
          title: "클립이 반려되었습니다",
          body: `"${submission.campaign.title}" 캠페인 클립이 반려되었습니다. 사유: ${revisionNotes}`,
          linkUrl: `/campaigns/${id}`,
        },
      });

      return apiResponse(updated);
    }
  }

  return apiError("Forbidden", 403);
}
