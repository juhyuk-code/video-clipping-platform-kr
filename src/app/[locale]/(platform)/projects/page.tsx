import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Plus, FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{tc("projects")}</h1>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </Link>
      </div>

      {/* Tabs for status filtering */}
      <div className="flex gap-2 border-b">
        {(["DRAFT", "OPEN", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"] as const).map(
          (status) => (
            <button
              key={status}
              className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground first:border-primary first:text-foreground"
            >
              {t(`status.${status}`)}
            </button>
          )
        )}
      </div>

      {/* Empty State */}
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
    </div>
  );
}
