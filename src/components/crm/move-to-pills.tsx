"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/leads";
import { updateLeadStage } from "@/actions/leads";
import { WonValueDialog } from "@/components/crm/won-value-dialog";
import { cn } from "@/lib/utils";

export function MoveToPills({
  leadId,
  leadName,
  currentStage,
  currentValue,
}: {
  leadId: string;
  leadName: string;
  currentStage: Stage;
  currentValue: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showWonDialog, setShowWonDialog] = useState(false);

  const options = STAGES.filter((s) => s !== currentStage);

  function move(stage: Stage) {
    if (stage === "WON") {
      setShowWonDialog(true);
      return;
    }
    startTransition(async () => {
      await updateLeadStage(leadId, stage);
      router.refresh();
    });
  }

  function confirmWon(value: number) {
    startTransition(async () => {
      await updateLeadStage(leadId, "WON", value);
      setShowWonDialog(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {showWonDialog && (
        <WonValueDialog
          leadName={leadName}
          defaultValue={currentValue}
          submitting={isPending}
          onConfirm={confirmWon}
          onCancel={() => setShowWonDialog(false)}
        />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mover para</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => (
          <button
            key={s}
            disabled={isPending}
            onClick={() => move(s)}
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
