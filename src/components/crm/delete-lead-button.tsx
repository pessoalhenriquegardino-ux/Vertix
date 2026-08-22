"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteLead } from "@/actions/leads";

export function DeleteLeadButton({ leadId, redirectTo }: { leadId: string; redirectTo: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Excluir este lead? Essa ação não pode ser desfeita.")) return;
        startTransition(async () => {
          await deleteLead(leadId);
          router.push(redirectTo);
        });
      }}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> {isPending ? "Excluindo..." : "Excluir lead"}
    </button>
  );
}
