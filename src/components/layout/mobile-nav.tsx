"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo-mark";
import type { SidebarItem } from "@/components/layout/sidebar";

// Navegação pra telas pequenas: barra fixa no topo (logo + sair) e uma
// barra de abas fixa embaixo (os mesmos itens da sidebar de desktop) —
// padrão de app mobile, mais fácil de usar com o polegar do que um menu
// lateral que precisa abrir/fechar.
export function MobileNav({
  items,
  userName,
}: {
  items: SidebarItem[];
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-foreground">Vertix</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sair"
          aria-label="Sair"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className={cn("flex shrink-0 [&>svg]:h-5 [&>svg]:w-5", active && "text-primary")}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
