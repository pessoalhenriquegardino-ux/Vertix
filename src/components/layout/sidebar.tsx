"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo-mark";

export type SidebarItem = {
  href: string;
  label: string;
  // ícone já renderizado (ex: <Building2 className="h-[18px] w-[18px]" />) —
  // não passar o componente em si, pois funções não podem cruzar a fronteira
  // Server → Client Component como prop.
  icon: React.ReactNode;
  exact?: boolean;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Sidebar({
  items,
  userName,
  userSubtitle,
}: {
  items: SidebarItem[];
  userName: string;
  userSubtitle: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar bg-noise text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-5 py-6", collapsed && "justify-center px-0")}>
        <LogoMark className="h-8 w-8 shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight text-white">Vertix</p>
            <p className="truncate text-[11px] text-sidebar-muted">CRM de performance</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-sidebar-muted hover:bg-white/[0.05] hover:text-white"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-active" />
              )}
              <span className={cn("flex shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]", active && "text-sidebar-active")}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-sidebar-muted transition-colors hover:bg-white/[0.05] hover:text-white",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Recolher"}
        </button>

        <div className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2", collapsed && "justify-center px-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
            {initials(userName || "U")}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-white">{userName}</p>
              <p className="truncate text-[11px] text-sidebar-muted">{userSubtitle}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
