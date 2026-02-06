import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const t = useTranslations("messages");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">대화 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("noMessages")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">
              대화를 선택하세요
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
