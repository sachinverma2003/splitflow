"use client";

import React, { useState } from "react";
import { X, Send, Copy, Check, MessageSquare } from "lucide-react";
import { generateWhatsAppSummary, SimplifiedTransaction } from "@/lib/settlement-engine";
import { useToast } from "./Toast";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupUrl: string;
  totalSpend: number;
  simplifiedTransactions: SimplifiedTransaction[];
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  groupName,
  groupUrl,
  totalSpend,
  simplifiedTransactions,
}: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const summaryText = generateWhatsAppSummary({
    groupName,
    groupUrl,
    totalSpend,
    simplifiedTransactions,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast("WhatsApp summary copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy summary", "error");
    }
  };

  const handleSendToWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">WhatsApp Summary</h3>
            <p className="text-xs text-slate-400">Preview formatted settlement report before sending</p>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="relative mb-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed selection:bg-emerald-500/30">
            {summaryText}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied Text" : "Copy to Clipboard"}</span>
          </button>

          <button
            onClick={handleSendToWhatsApp}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-[#25D366]/20"
          >
            <Send className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
