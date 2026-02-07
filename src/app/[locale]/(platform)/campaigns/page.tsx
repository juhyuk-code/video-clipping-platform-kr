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
import {
  Search,
  Plus,
  Megaphone,
  Calendar,
  Users,
  Wallet,
  Eye,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatKRW } from "@/lib/utils";

const TYPE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  PROJECT: "default",
  REWARD: "secondary",
  HYBRID: "outline",
};

async function getCampaigns(type?: string, category?: string) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (type) where.type = type;
  if (category) where.contentCategory = category;

  return prisma.campaign.findMany({
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
      _count: { select: { submissions: true } },
    },
  });
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const t = await getTranslations("campaigns");
  const tc = await getTranslations("common");
  const tm = await getTranslations("marketplace");
  const session = await auth();

  const campaigns = await getCampaigns(type, category);

  const categories = [
    "gaming", "beauty", "tech", "mukbang", "vlog",
    "music", "education", "comedy", "sports",
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("allCampaigns")}</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={tc("search")} className="pl-10" />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <Link href="/campaigns">
          <Badge variant={!type ? "default" : "outline"} className="cursor-pointer">
            {t("filter.allTypes")}
          </Badge>
        </Link>
        {(["PROJECT", "REWARD", "HYBRID"] as const).map((t_type) => (
          <Link key={t_type} href={`/campaigns?type=${t_type}`}>
            <Badge
              variant={type === t_type ? "default" : "outline"}
              className="cursor-pointer"
            >
              {t(`type.${t_type}`)}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Link href={type ? `/campaigns?type=${type}` : "/campaigns"}>
          <Badge variant={!category ? "secondary" : "outline"} className="cursor-pointer text-xs">
            {t("filter.allCategories")}
          </Badge>
        </Link>
        {categories.map((cat) => (
          <Link key={cat} href={`/campaigns?${type ? `type=${type}&` : ""}category=${cat}`}>
            <Badge
              variant={category === cat ? "secondary" : "outline"}
              className="cursor-pointer text-xs"
            >
              {tm(`categories.${cat}`)}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
          <Megaphone className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">{t("noCampaigns")}</p>
          <Link href="/campaigns/new" className="mt-4">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {t("createFirst")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2 text-base">
                      {campaign.title}
                    </CardTitle>
                    <Badge variant={TYPE_COLORS[campaign.type] ?? "outline"} className="ml-2 shrink-0">
                      {t(`type.${campaign.type}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {campaign.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {campaign.targetPlatforms.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  {/* Pricing info */}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {campaign.fixedPayPerClip && (
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {t("detail.perClip")}: {formatKRW(Number(campaign.fixedPayPerClip))}
                      </div>
                    )}
                    {campaign.cprRate && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {t("detail.perView")}: {formatKRW(Number(campaign.cprRate))}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {campaign.totalBudget && (
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatKRW(Number(campaign.totalBudget))}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {campaign._count.submissions}명
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(campaign.deadline).toLocaleDateString("ko-KR", {
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
