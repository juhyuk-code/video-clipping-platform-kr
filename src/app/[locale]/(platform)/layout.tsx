import { PlatformSidebar } from "@/components/layouts/platform-sidebar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <PlatformSidebar />
      <main className="flex-1 pl-64">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
