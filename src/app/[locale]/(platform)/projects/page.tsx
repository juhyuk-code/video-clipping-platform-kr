import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderKanban, Calendar, Users, Film, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  OPEN: "default",
  ASSIGNED: "secondary",
  IN_PROGRESS: "secondary",
  IN_REVIEW: "secondary",
  REVISION_REQUESTED: "destructive",
  COMPLETED: "outline",
  CANCELLED: "outline",
  DISPUTED: "destructive",
};

async function getUserProjects(userId: string, status?: string) {
  const where: Record<string, unknown> = {
    OR: [{ creatorId: userId }, { assignedClipperId: userId }],
  };
  if (status) where.status = status;

  return prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { nickname: true, name: true } },
      assignedClipper: { select: { nickname: true, name: true } },
      _count: { select: { applications: true, clips: true } },
    },
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const t = useTranslations("projects");
  const tc = useTranslations("common");

  const session = await auth();
  const userId = session?.user?.id;
  const projects = userId ? await getUserProjects(userId, filterStatus) : [];

  const statusFilters = ["DRAFT", "OPEN", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{tc("projects")}</h1>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b">
        <Link href="/projects">
          <button
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              !filterStatus
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            전체
          </button>
        </Link>
        {statusFilters.map((s) => (
          <Link key={s} href={`/projects?status=${s}`}>
            <button
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                filterStatus === s
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`status.${s}`)}
            </button>
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg text-muted-foreground">{t("noProjects")}</p>
            <Link href="/projects/new" className="mt-4">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("create")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{project.title}</p>
                    <Badge variant={STATUS_COLORS[project.status] ?? "outline"}>
                      {t(`status.${project.status}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.budgetAmount && (
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatKRW(Number(project.budgetAmount))}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.deadline).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project._count.applications}명 지원
                    </span>
                    <span className="flex items-center gap-1">
                      <Film className="h-3 w-3" />
                      {project._count.clips}개 클립
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
