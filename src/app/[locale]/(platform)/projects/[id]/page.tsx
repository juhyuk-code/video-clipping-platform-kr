import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Video,
  Calendar,
  Wallet,
  User,
  MessageSquare,
  Film,
  FileText,
} from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = useTranslations("projects");
  const tc = useTranslations("common");

  // TODO: Fetch project from API
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">프로젝트 상세</h1>
            <Badge variant="secondary">{t("status.OPEN")}</Badge>
          </div>
          <p className="text-muted-foreground">프로젝트 ID: {id}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">{tc("edit")}</Button>
          <Button>{t("apply")}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                원본 영상
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <Video className="h-12 w-12 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                클리핑 가이드라인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                프로젝트 데이터를 불러오는 중입니다...
              </p>
            </CardContent>
          </Card>

          {/* Tabs: Applications / Clips / Messages */}
          <Card>
            <CardHeader>
              <div className="flex gap-4 border-b">
                <button className="border-b-2 border-primary pb-2 text-sm font-medium">
                  {t("applications")} (0)
                </button>
                <button className="pb-2 text-sm font-medium text-muted-foreground">
                  {t("clips")} (0)
                </button>
                <button className="pb-2 text-sm font-medium text-muted-foreground">
                  <MessageSquare className="mr-1 inline h-4 w-4" />
                  메시지
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">
                아직 지원서가 없습니다
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">프로젝트 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">예산</p>
                  <p className="font-medium">₩0</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">마감일</p>
                  <p className="font-medium">-</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">요청 클립 수</p>
                  <p className="font-medium">-</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">크리에이터</p>
                  <p className="font-medium">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">타겟 플랫폼</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="outline">YouTube Shorts</Badge>
              <Badge variant="outline">TikTok</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
