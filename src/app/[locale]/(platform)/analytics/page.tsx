import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye, DollarSign } from "lucide-react";

function AnalyticsCard({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {change && (
            <span className="text-xs text-green-600">{change}</span>
          )}
        </div>
        <p className="mt-3 text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tc("analytics")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard icon={Eye} label="총 조회수" value="0" />
        <AnalyticsCard icon={BarChart3} label="총 클립 수" value="0" />
        <AnalyticsCard icon={TrendingUp} label="평균 참여율" value="0%" />
        <AnalyticsCard icon={DollarSign} label="총 수입/지출" value="₩0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>클립 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-24">
            <p className="text-muted-foreground">
              아직 분석할 데이터가 없습니다. 클립이 게시되면 여기에 성과가 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
