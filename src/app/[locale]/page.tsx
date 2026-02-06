import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShoppingBag,
  Shield,
  Play,
  BarChart3,
  ArrowRight,
  Video,
  Scissors,
  CheckCircle,
  Wallet,
} from "lucide-react";

export default function LandingPage() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">{tc("appName")}</span>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">{tc("login")}</Button>
            </Link>
            <Link href="/login">
              <Button>{tc("register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center md:py-32">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl whitespace-pre-line">
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              <Video className="h-5 w-5" />
              {t("hero.ctaCreator")}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2">
              <Scissors className="h-5 w-5" />
              {t("hero.ctaClipper")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            {t("features.title")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShoppingBag,
                title: t("features.marketplace.title"),
                description: t("features.marketplace.description"),
              },
              {
                icon: Shield,
                title: t("features.escrow.title"),
                description: t("features.escrow.description"),
              },
              {
                icon: Play,
                title: t("features.review.title"),
                description: t("features.review.description"),
              },
              {
                icon: BarChart3,
                title: t("features.analytics.title"),
                description: t("features.analytics.description"),
              },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            {t("howItWorks.title")}
          </h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: 1,
                icon: Video,
                title: t("howItWorks.step1.title"),
                description: t("howItWorks.step1.description"),
              },
              {
                step: 2,
                icon: Scissors,
                title: t("howItWorks.step2.title"),
                description: t("howItWorks.step2.description"),
              },
              {
                step: 3,
                icon: CheckCircle,
                title: t("howItWorks.step3.title"),
                description: t("howItWorks.step3.description"),
              },
              {
                step: 4,
                icon: Wallet,
                title: t("howItWorks.step4.title"),
                description: t("howItWorks.step4.description"),
              },
            ].map((item, index) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-foreground text-xs font-bold text-accent">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
                {index < 3 && (
                  <ArrowRight className="mt-4 hidden h-5 w-5 text-muted-foreground md:block md:rotate-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-center">
          <h2 className="text-3xl font-bold">{t("cta.title")}</h2>
          <p className="max-w-xl text-primary-foreground/80">
            {t("cta.subtitle")}
          </p>
          <Link href="/login">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2"
            >
              {t("cta.button")}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              {t("footer.terms")}
            </a>
            <a href="#" className="hover:text-foreground">
              {t("footer.privacy")}
            </a>
            <a href="#" className="hover:text-foreground">
              {t("footer.support")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
