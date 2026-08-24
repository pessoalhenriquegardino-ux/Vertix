"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TrendingUp, KanbanSquare, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/brand/logo-mark";

const HIGHLIGHTS = [
  { icon: TrendingUp, text: "Pipeline de leads e investimento em um só lugar" },
  { icon: Megaphone, text: "Métricas de campanhas: CTR, CPC, CPA por contrato" },
  { icon: KanbanSquare, text: "CRM com Kanban, cadência e histórico por lead" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (!result || result.error) {
      setError("Email ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar bg-noise p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="text-[17px] font-semibold tracking-tight text-white">Vertix</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="max-w-md text-[2rem] font-semibold leading-tight tracking-tight text-white">
              O painel completo da sua operação de tráfego e leads.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-sidebar-muted">
              Pipeline, campanhas e CRM em um só lugar — para você e para cada cliente que você atende.
            </p>
          </div>
          <div className="space-y-4">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Icon className="h-4 w-4 text-sidebar-active" strokeWidth={2.25} />
                  </div>
                  <p className="text-sm text-sidebar-foreground/90">{h.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-[11px] text-sidebar-muted">© {new Date().getFullYear()} Vertix</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5 lg:hidden">
            <div className="mb-4 flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="text-sm font-semibold">Vertix</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Entrar</h2>
            <p className="text-sm text-muted-foreground">Use o email e a senha cadastrados para você.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
