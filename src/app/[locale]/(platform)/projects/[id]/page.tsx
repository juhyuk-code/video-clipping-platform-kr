import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Video, Calendar, Wallet, User, MessageSquare, Film,
  FileText, ExternalLink, Star, Clock,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";
import { getValidTransitions } from "@/lib/projects/state-machine";
import { MessageThread } from "@/components/messages/message-thread";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline", OPEN: "default", ASSIGNED: "secondary",
  IN_PROGRESS: "secondary", IN_REVIEW: "secondary",
  REVISION_REQUESTED: "destructive", COMPLETED: "outline",
  CANCELLED: "outline", DISPUTED: "destructive",
};

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true, name: true, nickname: true, image: true,
          creatorProfile: { select: { youtubeChannelName: true, subscriberCount: true } },
        },
      },
      assignedClipper: {
        select: {
          id: true, name: true, nickname: true, image: true,
          clipperProfile: { select: { tier: true, averageRating: true, isVerified: true } },
        },
      },
      applications: {
        include: {
          clipper: {
            select: {
              id: true, name: true, nickname: true, image: true,
              clipperProfile: { select: { tier: true, averageRating: true, isVerified: true, specializations: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      clips: {
        include: { clipper: { select: { id: true, nickname: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { applications: true, clips: true, messages: true } },
    },
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");

  const session = await auth();
  const project = await getProject(id);
  if (!project) notFound();

  const isCreator = session?.user?.id === project.creatorId;
  const isClipper = session?.user?.id === project.assignedClipperId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge variant={STATUS_COLORS[project.status] ?? "outline"}>
              {t(`status.${project.status}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex gap-2">
          {isCreator && project.status === "DRAFT" && (
            <Button>공개로 전환</Button>
          )}
          {!isCreator && !isClipper && project.status === "OPEN" && (
            <Button>{t("apply")}</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {project.sourceVideoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="h-5 w-5" />
                  원본 영상
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href={project.sourceVideoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline">
                  {project.sourceVideoTitle ?? project.sourceVideoUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                클리핑 가이드라인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{project.brief}</p>
            </CardContent>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("applications")} ({project.applications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.applications.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  아직 지원서가 없습니다
                </p>
              ) : (
                <div className="space-y-4">
                  {project.applications.map((app) => (
                    <div key={app.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                            {(app.clipper.nickname ?? app.clipper.name ?? "?")[0]}
                          </div>
                          <div>
                            <p className="font-medium">{app.clipper.nickname ?? app.clipper.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {app.clipper.clipperProfile && (
                                <>
                                  <Badge variant="outline" className="text-xs">{app.clipper.clipperProfile.tier}</Badge>
                                  {app.clipper.clipperProfile.averageRating && (
                                    <span className="flex items-center gap-0.5">
                                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                      {app.clipper.clipperProfile.averageRating.toFixed(1)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={app.status === "ACCEPTED" ? "default" : app.status === "REJECTED" ? "destructive" : "secondary"}>
                          {app.status === "PENDING" ? "대기 중" : app.status === "ACCEPTED" ? "승인됨" : app.status === "REJECTED" ? "거절됨" : "철회됨"}
                        </Badge>
                      </div>
                      <p className="text-sm">{app.pitch}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {app.estimatedDeliveryDays}일
                        </span>
                        {app.proposedPrice && (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {formatKRW(Number(app.proposedPrice))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clips */}
          {project.clips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("clips")} ({project.clips.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.clips.map((clip) => (
                    <div key={clip.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Film className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{clip.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {clip.targetPlatform}{clip.durationSeconds ? ` · ${clip.durationSeconds}초` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={clip.status === "APPROVED" ? "default" : clip.status === "REVISION_REQUESTED" ? "destructive" : "secondary"}>
                        {clip.status === "SUBMITTED" ? "제출됨" : clip.status === "APPROVED" ? "승인됨" : clip.status === "REVISION_REQUESTED" ? "수정 요청" : "거절됨"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages — only visible to creator and assigned clipper */}
          {(isCreator || isClipper) && project.assignedClipperId && session?.user?.id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5" />
                  메시지 ({project._count.messages})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MessageThread
                  projectId={project.id}
                  projectTitle={project.title}
                  currentUserId={session.user.id}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">프로젝트 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">예산</p>
                  <p className="font-medium">{project.budgetAmount ? formatKRW(Number(project.budgetAmount)) : "협의"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">마감일</p>
                  <p className="font-medium">{new Date(project.deadline).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">요청 클립 수</p>
                  <p className="font-medium">{project.maxClipsRequested ?? "-"}개</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">크리에이터</p>
                  <p className="font-medium">{project.creator.nickname ?? project.creator.name}</p>
                  {project.creator.creatorProfile?.youtubeChannelName && (
                    <p className="text-xs text-muted-foreground">{project.creator.creatorProfile.youtubeChannelName}</p>
                  )}
                </div>
              </div>
              {project.assignedClipper && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">담당 클리퍼</p>
                    <p className="font-medium">{project.assignedClipper.nickname ?? project.assignedClipper.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">타겟 플랫폼</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.targetPlatforms.map((p) => (
                <Badge key={p} variant="outline">{p.replace("_", " ")}</Badge>
              ))}
            </CardContent>
          </Card>

          {project._count.messages > 0 && (
            <Card>
              <CardContent className="p-4">
                <span className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  메시지 {project._count.messages}개
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
