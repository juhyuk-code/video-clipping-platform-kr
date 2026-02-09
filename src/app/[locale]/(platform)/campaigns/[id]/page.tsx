import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CampaignDetailClient } from "./campaign-detail-client";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, nickname: true, name: true, image: true },
      },
      submissions: {
        include: {
          clipper: {
            select: { id: true, nickname: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const mySubmission = campaign.submissions.find((s) => s.clipperId === userId);

  // Serialize data for client component (convert Decimal/Date to number/string)
  const data = {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    guidelines: campaign.guidelines,
    type: campaign.type,
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    creatorId: campaign.creator.id,
    creatorName: campaign.creator.nickname ?? campaign.creator.name ?? "Unknown",
    isOwner: userId === campaign.creatorId,
    participantCount: campaign.participantCount,
    submissionCount: campaign.submissionCount,
    approvedCount: campaign.approvedCount,
    totalBudget: campaign.totalBudget ? Number(campaign.totalBudget) : null,
    totalSpent: Number(campaign.totalSpent),
    fixedPayPerClip: campaign.fixedPayPerClip ? Number(campaign.fixedPayPerClip) : null,
    cprRate: campaign.cprRate ? Number(campaign.cprRate) : null,
    viewBonusRate: campaign.viewBonusRate ? Number(campaign.viewBonusRate) : null,
    deadline: campaign.deadline.toISOString(),
    maxParticipants: campaign.maxParticipants,
    targetPlatforms: campaign.targetPlatforms,
    submissions: campaign.submissions.map((s) => ({
      id: s.id,
      status: s.status,
      clipTitle: s.clipTitle,
      clipUrl: s.clipUrl,
      pitch: s.pitch,
      latestViewCount: s.latestViewCount,
      totalPaid: Number(s.totalPaid),
      revisionNotes: s.revisionNotes,
      createdAt: s.createdAt.toISOString(),
      clipper: s.clipper,
    })),
    mySubmission: mySubmission
      ? {
          id: mySubmission.id,
          status: mySubmission.status,
          revisionNotes: mySubmission.revisionNotes,
        }
      : null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
        </Link>
      </div>

      <CampaignDetailClient campaign={data} />
    </div>
  );
}
