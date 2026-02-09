import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlatformSidebar } from "@/components/layouts/platform-sidebar";
import { PlatformHeader } from "@/components/layouts/platform-header";
import { ModeProvider } from "@/contexts/mode-context";
import { SessionProvider } from "@/components/providers/session-provider";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Not logged in → login page
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user has completed onboarding (has a nickname)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true },
  });

  if (!user?.nickname) {
    redirect("/register/role");
  }

  return (
    <SessionProvider>
      <ModeProvider>
        <div className="flex min-h-screen">
          <PlatformSidebar />
          <div className="flex flex-1 flex-col pl-64">
            <PlatformHeader />
            <main className="flex-1">
              <div className="container mx-auto p-6">{children}</div>
            </main>
          </div>
        </div>
      </ModeProvider>
    </SessionProvider>
  );
}
