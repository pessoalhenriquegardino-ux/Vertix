import { Sidebar, type SidebarItem } from "@/components/layout/sidebar";

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
        <main className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
