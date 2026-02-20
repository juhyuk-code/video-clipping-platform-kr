import { redirect } from "next/navigation";

export default async function MySubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localePrefix = locale === "ko" ? "" : `/${locale}`;

  redirect(`${localePrefix}/dashboard?tab=submissions`);
}
