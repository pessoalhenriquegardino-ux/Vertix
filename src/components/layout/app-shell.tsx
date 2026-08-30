import { Sidebar, type SidebarItem } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({
  items,
  userName,
  userSubtitle,
  children,
}: {
  items: SidebarItem[];
  userName: string;
  userSubtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} userName={userName} userSubtitle={userSubtitle} />
      <div className="min-w-0 flex-1">
        <MobileNav items={items} userName={userName} />
        {/* pb extra no mobile: espaço pra barra de abas fixa não cobrir o fim do conteúdo */}
        <main className="mx-auto max-w-[1400px] px-4 py-5 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
