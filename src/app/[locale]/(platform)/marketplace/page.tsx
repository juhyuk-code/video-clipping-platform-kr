import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, SlidersHorizontal, FolderKanban, Calendar, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatKRW } from "@/lib/utils";

async function getMarketplaceProjects(category?: string) {
  const where: Record<string, unknown> = { status: "OPEN" };
  if (category) where.contentCategory = category;

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      creator: {
        select: {
          id: true,
          nickname: true,
          name: true,
          image: true,
          creatorProfile: {
            select: { youtubeChannelName: true, subscriberCount: true },
          },
        },
      },
      _count: { select: { applications: true } },
    },
  });
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const t = await getTranslations("marketplace");
  const tc = await getTranslations("common");

  const projects = await getMarketplaceProjects(category);

  const categories = [
    "gaming",
    "beauty",
    "tech",
    "mukbang",
    "vlog",
    "music",
    "education",
    "comedy",
    "sports",
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={tc("search")} className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {tc("filter")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/marketplace">
          <Badge variant={!category ? "default" : "outline"} className="cursor-pointer">
            전체
          </Badge>
        </Link>
        {categories.map((cat) => (
          <Link key={cat} href={`/marketplace?category=${cat}`}>
            <Badge
              variant={category === cat ? "default" : "outline"}
              className="cursor-pointer"
            >
              {t(`categories.${cat}`)}
            </Badge>
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
          <FolderKanban className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">{tc("noResults")}</p>
          <p className="text-sm text-muted-foreground/70">
            아직 등록된 프로젝트가 없습니다
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2 text-base">
                      {project.title}
                    </CardTitle>
                    {project.contentCategory && (
                      <Badge variant="secondary" className="ml-2 shrink-0">
                        {t(`categories.${project.contentCategory}` as any)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {project.targetPlatforms.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {project.budgetAmount ? formatKRW(Number(project.budgetAmount)) : "협의"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project._count.applications}명
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(project.deadline).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
