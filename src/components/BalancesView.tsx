"use client";

import React from "react";
import {
  Scale,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  TrendingUp,
  Info,
  IndianRupee,
} from "lucide-react";
import { MemberBalance, SimplifiedTransaction } from "@/lib/settlement-engine";
import { SettlementCard } from "./SettlementCard";

interface BalancesViewProps {
  netBalances: MemberBalance[];
  simplifiedTransactions: SimplifiedTransaction[];
  groupSlug: string;
  onSettled: () => void;
  onAddUpiPrompt: (memberId: string) => void;
}

export function BalancesView({
  netBalances,
  simplifiedTransactions,
  groupSlug,
  onSettled,
  onAddUpiPrompt,
}: BalancesViewProps) {
  const allSettled = simplifiedTransactions.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Simplified Debt Settlement Section */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Min-Cash-Flow Settlements</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Smart
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Algorithmically simplified into the minimum direct payments.
              </p>
            </div>
          </div>
        </div>

        {allSettled ? (
          <div className="p-6 sm:p-8 text-center bg-slate-900/60 border border-emerald-500/20 rounded-2xl">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white">All Settled Up! 🎉</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Every balance in this group is currently zero. No one owes or is owed any money!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {simplifiedTransactions.map((tx) => (
              <SettlementCard
                key={tx.id}
                transaction={tx}
                groupSlug={groupSlug}
                onSettled={onSettled}
                onAddUpiPrompt={onAddUpiPrompt}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Individual Net Balances Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-2.5 sm:mb-3 px-1">
          <Scale className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
            Individual Balance Ledger
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {netBalances.map((b) => {
            const isCreditor = b.netBalance > 0.01;
            const isDebtor = b.netBalance < -0.01;
            const isZero = !isCreditor && !isDebtor;

            return (
              <div
                key={b.memberId}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all hover:border-slate-700 shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h5 className="font-bold text-slate-100 text-sm">{b.name}</h5>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {b.upiId || "No UPI ID set"}
                      </span>
                    </div>

                    {isCreditor && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <ArrowDownLeft className="w-3 h-3" />
                        Receives
                      </span>
                    )}

                    {isDebtor && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <ArrowUpRight className="w-3 h-3" />
                        Owes
                      </span>
                    )}

                    {isZero && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400">
                        Settled
                      </span>
                    )}
                  </div>

                  {/* Net Balance Number */}
                  <div
                    className={`text-2xl font-black flex items-center mt-1 ${
                      isCreditor
                        ? "text-emerald-400"
                        : isDebtor
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    <IndianRupee className="w-5 h-5" />
                    <span>
                      {isDebtor ? Math.abs(b.netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : b.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Sub-details */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div>
                    <span className="block text-slate-400 font-medium">Total Paid:</span>
                    <span className="font-mono text-slate-300 font-semibold">₹{b.totalPaid.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">Total Owed:</span>
                    <span className="font-mono text-slate-300 font-semibold">₹{b.totalOwed.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
