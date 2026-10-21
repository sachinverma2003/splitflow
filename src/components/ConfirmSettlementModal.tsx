"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  ArrowRight,
  IndianRupee,
  ShieldAlert,
  FileText,
  Smartphone,
  Loader2,
} from "lucide-react";

interface ConfirmSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  fromMemberName: string;
  toMemberName: string;
  amount: number;
  toUpiId?: string | null;
  hasAdmin?: boolean;
  isAdmin?: boolean;
}

export function ConfirmSettlementModal({
  isOpen,
  onClose,
  onConfirm,
  fromMemberName,
  toMemberName,
  amount,
  toUpiId,
  hasAdmin = false,
  isAdmin = false,
}: ConfirmSettlementModalProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(notes.trim() || undefined);
      setNotes("");
      onClose();
    } catch {
      // Error handled by caller toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Confirm Settlement</h3>
              <p className="text-[11px] text-slate-400">Verify and record payment to balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Payment Card */}
        <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            {/* Payer */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm shadow-inner mb-1.5">
                {fromMemberName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 text-center truncate max-w-[90px]">
                {fromMemberName}
              </span>
              <span className="text-[10px] text-rose-400 font-medium">Payer</span>
            </div>

            {/* Direction & Amount */}
            <div className="flex flex-col items-center px-2">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                <span>pays</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex items-center text-xl sm:text-2xl font-black text-white">
                <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span>{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Payee */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-inner mb-1.5">
                {toMemberName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 text-center truncate max-w-[90px]">
                {toMemberName}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Receiver</span>
            </div>
          </div>

          {/* Payee UPI info if available */}
          {toUpiId && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-xs text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Receiver UPI:</span>
              <span className="font-mono text-white font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {toUpiId}
              </span>
            </div>
          )}
        </div>

        {/* Optional Note Field */}
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Optional Note / Transaction ID</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. GPay UTR 4293819 or Cash handed over"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
          />
        </div>

        {/* Admin note notice if group has admin and user is non-admin */}
        {hasAdmin && !isAdmin && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              This group has an admin. Please ensure that this payment has actually been sent and received before recording it.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yes, Mark Settled</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
