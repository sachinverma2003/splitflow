"use client";

import React, { useState, useEffect } from "react";
import { X, Crown, ArrowRight, Sparkles, AlertCircle, Check, IndianRupee } from "lucide-react";
import { MemberBalance } from "@/lib/settlement-engine";
import { useToast } from "./Toast";

interface CustomRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  netBalances: MemberBalance[];
  onRouteUpdated: () => void;
}

export function CustomRouteModal({
  isOpen,
  onClose,
  groupSlug,
  netBalances,
  onRouteUpdated,
}: CustomRouteModalProps) {
  const { toast } = useToast();

  // Debtors (owe money to the group: netBalance < -0.01)
  const debtors = netBalances.filter((b) => b.netBalance < -0.01);
  // Creditors (owed money by the group: netBalance > 0.01)
  const creditors = netBalances.filter((b) => b.netBalance > 0.01);

  const [fromMemberId, setFromMemberId] = useState<string>("");
  const [toMemberId, setToMemberId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize selections when opened
  useEffect(() => {
    if (isOpen) {
      if (debtors.length > 0) {
        setFromMemberId(debtors[0].memberId);
      } else {
        setFromMemberId("");
      }
      if (creditors.length > 0) {
        setToMemberId(creditors[0].memberId);
      } else {
        setToMemberId("");
      }
    }
  }, [isOpen, debtors.length, creditors.length]);

  const selectedDebtor = debtors.find((d) => d.memberId === fromMemberId);
  const selectedCreditor = creditors.find((c) => c.memberId === toMemberId);

  // Maximum directable amount between the selected pair
  const maxPossible =
    selectedDebtor && selectedCreditor
      ? Math.min(Math.abs(selectedDebtor.netBalance), selectedCreditor.netBalance)
      : 0;

  // Whenever selection changes, initialize amount to maxPossible
  useEffect(() => {
    if (maxPossible > 0) {
      setAmount(maxPossible.toFixed(2));
    } else {
      setAmount("");
    }
  }, [fromMemberId, toMemberId, maxPossible]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromMemberId || !toMemberId) {
      toast("Please select both who pays and who receives.", "error");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast("Please enter a valid amount.", "error");
      return;
    }

    if (parsedAmount > maxPossible + 0.01) {
      toast(`Amount cannot exceed ₹${maxPossible.toFixed(2)}.`, "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/groups/${groupSlug}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId,
          toMemberId,
          amount: parsedAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to set custom route");
      }

      toast(data.message || "Custom route applied! Settlements recalculated.", "success");
      onRouteUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error setting custom route";
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] sm:max-h-[90vh] pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-4" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <span>Direct Custom Payment</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct who pays whom, and SplitFlow recalculates the rest!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {debtors.length === 0 || creditors.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-xl my-4">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No active debts to direct</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              All members are settled up, or there are no pending debtors and creditors.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Who Pays (Debtor) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                1. Select Who Pays (Debtor)
              </label>
              <select
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                {debtors.map((d) => (
                  <option key={d.memberId} value={d.memberId}>
                    {d.name} (owes ₹{Math.abs(d.netBalance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Who Receives (Creditor) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                2. Select Who Receives (Payee)
              </label>
              <select
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                {creditors.map((c) => (
                  <option key={c.memberId} value={c.memberId}>
                    {c.name} (receives ₹{c.netBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Payment Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  3. Directed Amount
                </label>
                {maxPossible > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(maxPossible.toFixed(2))}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Max: ₹{maxPossible.toFixed(2)}
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-4 h-4 text-purple-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxPossible + 0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Preview Box */}
            {selectedDebtor && selectedCreditor && maxPossible > 0 && (
              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <span className="font-bold text-white">{selectedDebtor.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-bold text-white">{selectedCreditor.name}</span>
                </div>
                <span className="font-bold font-mono text-purple-300 shrink-0">
                  ₹{parseFloat(amount || "0").toFixed(2)}
                </span>
              </div>
            )}

            {/* Explanation Note */}
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                SplitFlow will pin this payment route first, and algorithmically recalculate all other group members' balances so nobody pays more than their fair share.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || maxPossible <= 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Recalculating...</span>
                ) : (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>Direct & Recalculate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
