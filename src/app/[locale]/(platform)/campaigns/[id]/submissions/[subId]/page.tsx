import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { SubmissionDetailClient } from "./submission-detail-client";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const { id, subId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: subId },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          guidelines: true,
          creatorId: true,
          fixedPayPerClip: true,
          cprRate: true,
          viewBonusRate: true,
          targetPlatforms: true,
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
      snapshots: { orderBy: { capturedAt: "desc" }, take: 20 },
    },
  });

  if (!submission) notFound();

  // Access control: only campaign creator or the clipper themselves
  const isCreator = submission.campaign.creatorId === session.user.id;
  const isClipper = submission.clipperId === session.user.id;
  if (!isCreator && !isClipper) notFound();

  // Serialize for client
  const data = {
    id: submission.id,
    status: submission.status,
    pitch: submission.pitch,
    proposedPrice: submission.proposedPrice ? Number(submission.proposedPrice) : null,
    clipTitle: submission.clipTitle,
    clipUrl: submission.clipUrl,
    clipFileUrl: submission.clipFileUrl,
    thumbnailUrl: submission.thumbnailUrl,
    targetPlatform: submission.targetPlatform,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    revisionNotes: submission.revisionNotes,
    revisionCount: submission.revisionCount,
    latestViewCount: submission.latestViewCount,
    fixedAmount: submission.fixedAmount ? Number(submission.fixedAmount) : null,
    rewardAmount: submission.rewardAmount ? Number(submission.rewardAmount) : null,
    totalPaid: Number(submission.totalPaid),
    paidAt: submission.paidAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    campaign: {
      id: submission.campaign.id,
      title: submission.campaign.title,
      type: submission.campaign.type,
      status: submission.campaign.status,
      guidelines: submission.campaign.guidelines,
      fixedPayPerClip: submission.campaign.fixedPayPerClip ? Number(submission.campaign.fixedPayPerClip) : null,
      cprRate: submission.campaign.cprRate ? Number(submission.campaign.cprRate) : null,
      viewBonusRate: submission.campaign.viewBonusRate ? Number(submission.campaign.viewBonusRate) : null,
      targetPlatforms: submission.campaign.targetPlatforms,
    },
    clipper: {
      id: submission.clipper.id,
      nickname: submission.clipper.nickname,
      name: submission.clipper.name,
      image: submission.clipper.image,
      bio: submission.clipper.bio,
      clipperProfile: submission.clipper.clipperProfile,
    },
    snapshots: submission.snapshots.map((s) => ({
      viewCount: s.viewCount,
      capturedAt: s.capturedAt.toISOString(),
    })),
    isCreator,
    isClipper,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/campaigns/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            캠페인으로 돌아가기
          </Button>
        </Link>
      </div>

      <SubmissionDetailClient submission={data} />
    </div>
  );
}
