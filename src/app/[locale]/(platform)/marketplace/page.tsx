import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, SlidersHorizontal, FolderKanban } from "lucide-react";

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const tc = useTranslations("common");
  const tp = useTranslations("projects");

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Search & Filters */}
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

      {/* Category Tags */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant="outline"
            className="cursor-pointer hover:bg-accent"
          >
            {t(`categories.${cat}`)}
          </Badge>
        ))}
      </div>

      {/* Project Grid - Empty State */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
        <FolderKanban className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">{tc("noResults")}</p>
        <p className="text-sm text-muted-foreground/70">
          아직 등록된 프로젝트가 없습니다
        </p>
      </div>
    </div>
  );
}
