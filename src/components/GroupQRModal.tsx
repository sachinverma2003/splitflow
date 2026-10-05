"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Share2, Smartphone } from "lucide-react";
import { useToast } from "./Toast";

interface GroupQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupUrl: string;
}

export function GroupQRModal({
  isOpen,
  onClose,
  groupName,
  groupUrl,
}: GroupQRModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(groupUrl);
      setCopied(true);
      toast("Group link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy link", "error");
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on SplitFlow`,
          text: `Join our group "${groupName}" to split expenses and settle debts seamlessly:`,
          url: groupUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-center pb-safe">
        {/* Mobile Drag Pill */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-100">Scan to Join Group</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Anyone can scan this QR with their phone camera to instantly view and log expenses for <strong className="text-slate-200">{groupName}</strong>. No login needed!
        </p>

        {/* QR Code Container */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-700/50">
            <QRCodeSVG
              value={groupUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* URL Pill */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 mb-4">
          <span className="text-xs font-mono text-slate-400 truncate flex-1 text-left px-2">
            {groupUrl}
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <button
          onClick={shareNative}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Share2 className="w-4 h-4" />
          Share Group Invite Link
        </button>
      </div>
    </div>
  );
}
