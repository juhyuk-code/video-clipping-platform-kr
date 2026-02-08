import { PlatformSidebar } from "@/components/layouts/platform-sidebar";
import { PlatformHeader } from "@/components/layouts/platform-header";
import { ModeProvider } from "@/contexts/mode-context";
import { SessionProvider } from "@/components/providers/session-provider";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
