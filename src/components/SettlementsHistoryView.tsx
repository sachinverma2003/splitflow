"use client";

import React, { useState } from "react";
import { CheckCircle2, RotateCcw, Calendar, ArrowRight, IndianRupee } from "lucide-react";
import { useToast } from "./Toast";

interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  notes?: string | null;
  settledAt: string;
  payer: {
    id: string;
    name: string;
  };
  payee: {
    id: string;
    name: string;
  };
}

interface SettlementsHistoryViewProps {
  settlements: Settlement[];
  groupSlug: string;
  onSettlementUndone: () => void;
}

export function SettlementsHistoryView({
  settlements,
  groupSlug,
  onSettlementUndone,
}: SettlementsHistoryViewProps) {
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUndo = async (settlementId: string) => {
    if (!confirm("Are you sure you want to undo this settlement? The balance will be restored.")) {
      return;
    }

    try {
      setUndoingId(settlementId);
      const res = await fetch(`/api/groups/${groupSlug}/settlements/${settlementId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to undo settlement");
      }

      toast("Settlement undone! Ledger balance restored.", "info");
      onSettlementUndone();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error undoing settlement";
      toast(message, "error");
    } finally {
      setUndoingId(null);
    }
  };

  if (settlements.length === 0) {
    return (
      <div className="text-center py-14 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-slate-200">No settlements recorded yet</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          When anyone clicks &quot;Mark Settled&quot; or pays via UPI in the Balances tab, the verified record will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((st) => {
        const formattedDate = new Date(st.settledAt).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={st.id}
            className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white flex-wrap">
                  <span>{st.payer.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{st.payee.name}</span>
                  <span className="flex items-center text-emerald-400 font-extrabold ml-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {st.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                  </span>
                  {st.notes && <span className="text-slate-400">• {st.notes}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUndo(st.id)}
              disabled={undoingId === st.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-colors self-end sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{undoingId === st.id ? "Undoing..." : "Undo Settlement"}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
