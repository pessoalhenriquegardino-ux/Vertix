"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/leads";
import { updateLeadStage } from "@/actions/leads";
import { cn } from "@/lib/utils";

export function MoveToPills({ leadId, currentStage }: { leadId: string; currentStage: Stage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const options = STAGES.filter((s) => s !== currentStage);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mover para</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => (
          <button
            key={s}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await updateLeadStage(leadId, s);
                router.refresh();
              })
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
            )}
          >
            <ArrowRight className="h-3 w-3 text-muted-foreground" /> {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
