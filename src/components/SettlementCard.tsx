"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, QrCode, Smartphone, CheckCircle, IndianRupee, AlertCircle } from "lucide-react";
import { SimplifiedTransaction } from "@/lib/settlement-engine";
import { SettlementQRModal } from "./SettlementQRModal";
import { useToast } from "./Toast";

interface SettlementCardProps {
  transaction: SimplifiedTransaction;
  groupSlug: string;
  onSettled: () => void;
  onAddUpiPrompt?: (memberId: string) => void;
}

export function SettlementCard({
  transaction,
  groupSlug,
  onSettled,
  onAddUpiPrompt,
}: SettlementCardProps) {
  const [showQR, setShowQR] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const { toast } = useToast();

  const handleMarkSettled = async () => {
    try {
      setIsSettling(true);

      const res = await fetch(`/api/groups/${groupSlug}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: transaction.fromMemberId,
          payeeId: transaction.toMemberId,
          amount: transaction.amount,
          notes: `Settled via SplitFlow (${transaction.fromMemberName} -> ${transaction.toMemberName})`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record settlement");
      }

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7", "#f59e0b", "#38bdf8"],
        });
      } catch {
        // Confetti fallback
      }

      toast(
        `Settled! ₹${transaction.amount} from ${transaction.fromMemberName} to ${transaction.toMemberName}`,
        "success"
      );
      onSettled();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error settling payment";
      toast(message, "error");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-5 transition-all shadow-lg hover:shadow-emerald-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Debtor & Creditor Flow */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 px-1">
          {/* Debtor Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm sm:text-base shadow-inner">
              {transaction.fromMemberName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-300 mt-1 max-w-[70px] sm:max-w-[80px] truncate text-center">
              {transaction.fromMemberName}
            </span>
          </div>

          {/* Flow Direction & Amount */}
          <div className="flex flex-col items-center px-2 flex-1 sm:flex-none">
            <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
              <span>owes</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center text-lg sm:text-2xl font-black text-white mt-0.5">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span>{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Creditor Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm sm:text-base shadow-inner">
              {transaction.toMemberName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-300 mt-1 max-w-[70px] sm:max-w-[80px] truncate text-center">
              {transaction.toMemberName}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-t-0">
          {transaction.toUpiId ? (
            <>
              {/* Pay via UPI deep link (GPay, PhonePe, Paytm) */}
              <a
                href={transaction.upiPaymentLink}
                className="col-span-2 sm:col-auto flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-center"
                title="Direct UPI App Deep Link (GPay / PhonePe / Paytm)"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-950" />
                <span>Pay ₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via UPI</span>
              </a>

              {/* Show Dynamic QR Code */}
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-700/60 active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Scan QR</span>
              </button>

              {/* Mark Settled Button */}
              <button
                onClick={handleMarkSettled}
                disabled={isSettling}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSettling ? "Settling..." : "Mark Settled"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAddUpiPrompt && onAddUpiPrompt(transaction.toMemberId)}
                className="flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-800/60 border border-slate-700/50 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 rounded-xl text-xs transition-colors"
              >
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>Add UPI ID</span>
              </button>

              <button
                onClick={handleMarkSettled}
                disabled={isSettling}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isSettling ? "Settling..." : "Mark Settled"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render QR Modal if opened */}
      {transaction.toUpiId && transaction.upiPaymentLink && (
        <SettlementQRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          payeeName={transaction.toMemberName}
          payeeUpi={transaction.toUpiId}
          amount={transaction.amount}
          upiPaymentLink={transaction.upiPaymentLink}
        />
      )}
    </div>
  );
}
