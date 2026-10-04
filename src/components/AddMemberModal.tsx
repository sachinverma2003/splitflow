"use client";

import React, { useState } from "react";
import { X, UserPlus, Sparkles, ShieldAlert, Check } from "lucide-react";
import { useToast } from "./Toast";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  onMemberAdded: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  groupSlug,
  onMemberAdded,
}: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please enter a member name", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/groups/${groupSlug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          upiId: upiId.trim() || undefined,
          phone: phone.trim() || undefined,
          isVirtual: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      toast(`Added ${name} to the group!`, "success");
      setName("");
      setUpiId("");
      setPhone("");
      onMemberAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error adding member";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Add Member</h3>
            <p className="text-xs text-slate-400">Add a friend or virtual ghost member</p>
          </div>
        </div>

        {/* Ghost member highlight banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Ghost Member Feature:</strong> They do not need to register, log in, or install anything. You can log expenses on their behalf, and SplitFlow calculates their exact settlements.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Member Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul, Sneha, Rohan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              UPI ID <span className="text-slate-500 font-normal">(Optional, for instant settle buttons)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. rahul@okhdfcbank or 9876543210@paytm"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phone Number <span className="text-slate-500 font-normal">(Optional, for WhatsApp alerts)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? "Adding..." : "Add to Group"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
