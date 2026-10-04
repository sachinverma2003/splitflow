"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ExternalLink, IndianRupee, ShieldCheck } from "lucide-react";
import { useToast } from "./Toast";

interface SettlementQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  payeeName: string;
  payeeUpi: string;
  amount: number;
  upiPaymentLink: string;
}

export function SettlementQRModal({
  isOpen,
  onClose,
  payeeName,
  payeeUpi,
  amount,
  upiPaymentLink,
}: SettlementQRModalProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(payeeUpi);
      setCopiedUpi(true);
      toast("UPI ID copied to clipboard!", "success");
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      toast("Failed to copy UPI ID", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified UPI Payment
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-100 mt-2">Pay {payeeName}</h3>
        <div className="flex items-center justify-center gap-1 text-3xl font-extrabold text-white my-2">
          <IndianRupee className="w-7 h-7 text-emerald-400" />
          <span>{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <p className="text-xs text-slate-400 mb-5">
          Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) to settle this debt directly.
        </p>

        {/* Dynamic UPI QR Code */}
        <div className="flex justify-center mb-5">
          <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-700/60">
            <QRCodeSVG
              value={upiPaymentLink}
              size={210}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Payee UPI ID display with copy */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mb-4">
          <div className="text-left overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payee UPI ID</p>
            <p className="text-xs font-mono font-medium text-slate-200 truncate">{payeeUpi}</p>
          </div>
          <button
            onClick={copyUpiId}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUpi ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Deep link button (for mobile users) */}
        <a
          href={upiPaymentLink}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
        >
          <ExternalLink className="w-4 h-4" />
          Open UPI App directly
        </a>
      </div>
    </div>
  );
}
