"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Receipt,
  Users,
  Check,
  Percent,
  Divide,
  Hash,
  Scale,
  IndianRupee,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { SplitType, calculateSplits } from "@/lib/settlement-engine";
import { useToast } from "./Toast";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
  isVirtual: boolean;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  members: Member[];
  onExpenseAdded: () => void;
}

const CATEGORIES = [
  { id: "Food", name: "Food & Dining", emoji: "🍽️" },
  { id: "Travel", name: "Travel & Transport", emoji: "🚕" },
  { id: "Stay", name: "Stay & Villa", emoji: "🏨" },
  { id: "Drinks", name: "Drinks & Party", emoji: "🍸" },
  { id: "Activities", name: "Activities", emoji: "🏖️" },
  { id: "Shopping", name: "Shopping", emoji: "🛍️" },
  { id: "General", name: "General Expense", emoji: "📦" },
];

export function AddExpenseModal({
  isOpen,
  onClose,
  groupSlug,
  members,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Food");
  const [payerId, setPayerId] = useState(members[0]?.id || "");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");

  // Selected participants for equal split or map of share values
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset state on open or members change
  useEffect(() => {
    if (members.length > 0) {
      if (!payerId || !members.some((m) => m.id === payerId)) {
        setPayerId(members[0].id);
      }
      setSelectedMemberIds(members.map((m) => m.id));
      const initVals: Record<string, string> = {};
      members.forEach((m) => {
        initVals[m.id] = "1";
      });
      setCustomValues(initVals);
    }
  }, [members, isOpen]);

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [amountStr]);

  // Handle participant toggling for EQUAL mode
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((mId) => mId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  // Compute live preview of splits
  const previewSplits = useMemo(() => {
    if (parsedAmount <= 0) return [];

    if (splitType === "EQUAL") {
      const participants = selectedMemberIds.map((id) => ({ memberId: id }));
      return calculateSplits(parsedAmount, "EQUAL", participants, payerId);
    }

    if (splitType === "EXACT") {
      const participants = members.map((m) => ({
        memberId: m.id,
        shareValue: parseFloat(customValues[m.id] || "0") || 0,
      }));
      return calculateSplits(parsedAmount, "EXACT", participants, payerId);
    }

    if (splitType === "PERCENTAGE") {
      const participants = members.map((m) => ({
        memberId: m.id,
        shareValue: parseFloat(customValues[m.id] || "0") || 0,
      }));
      return calculateSplits(parsedAmount, "PERCENTAGE", participants, payerId);
    }

    if (splitType === "SHARES") {
      const participants = members.map((m) => ({
        memberId: m.id,
        shareValue: Math.max(0, parseFloat(customValues[m.id] || "1") || 1),
      }));
      return calculateSplits(parsedAmount, "SHARES", participants, payerId);
    }

    return [];
  }, [parsedAmount, splitType, selectedMemberIds, customValues, members, payerId]);

  // Validation details
  const validationInfo = useMemo(() => {
    if (parsedAmount <= 0) return { isValid: false, message: "Enter an amount" };

    if (splitType === "EQUAL") {
      if (selectedMemberIds.length === 0) {
        return { isValid: false, message: "Select at least 1 person" };
      }
      return { isValid: true, message: "Split evenly" };
    }

    if (splitType === "EXACT") {
      const sum = previewSplits.reduce((acc, s) => acc + s.amountOwed, 0);
      const diff = Math.round((parsedAmount - sum) * 100) / 100;
      if (Math.abs(diff) > 0.05) {
        return {
          isValid: false,
          message: diff > 0 ? `₹${diff.toFixed(2)} remaining to assign` : `₹${Math.abs(diff).toFixed(2)} over allocated`,
        };
      }
      return { isValid: true, message: "Amounts match total exactly" };
    }

    if (splitType === "PERCENTAGE") {
      const totalPct = members.reduce(
        (sum, m) => sum + (parseFloat(customValues[m.id] || "0") || 0),
        0
      );
      const diff = Math.round((100 - totalPct) * 100) / 100;
      if (Math.abs(diff) > 0.05) {
        return {
          isValid: false,
          message: diff > 0 ? `${diff}% remaining (Total must be 100%)` : `${Math.abs(diff)}% over 100%`,
        };
      }
      return { isValid: true, message: "Percentages add up to 100%" };
    }

    if (splitType === "SHARES") {
      const totalShares = members.reduce(
        (sum, m) => sum + (parseFloat(customValues[m.id] || "0") || 0),
        0
      );
      if (totalShares <= 0) {
        return { isValid: false, message: "Total shares must be greater than 0" };
      }
      return { isValid: true, message: `Split proportionally (${totalShares} total shares)` };
    }

    return { isValid: true, message: "Valid" };
  }, [parsedAmount, splitType, selectedMemberIds, previewSplits, members, customValues]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast("Please enter a title for the expense", "error");
      return;
    }

    if (parsedAmount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }

    if (!validationInfo.isValid) {
      toast(validationInfo.message, "error");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/groups/${groupSlug}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parsedAmount,
          category,
          payerId,
          splitType,
          splits: previewSplits,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log expense");
      }

      toast(`Added "${title}" (₹${parsedAmount})`, "success");
      setTitle("");
      setAmountStr("");
      onExpenseAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving expense";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const payerName = members.find((m) => m.id === payerId)?.name || "Someone";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100">Add an Expense</h3>
              <p className="text-xs text-slate-400">Track bills, food, trips, and proxy payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form wrapping scrollable content and sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1 overscroll-contain">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Description <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner, Villa Booking, Fuel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-slate-200 outline-none transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total Amount <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-lg font-bold text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Proxy Payment: "Paid by" dropdown */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Paid by</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                    Proxy payment supported
                  </span>
                </label>
                <span className="text-xs text-slate-400">
                  Who put the cash/UPI?
                </span>
              </div>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-semibold text-slate-100 outline-none transition-all"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.upiId ? `• ${m.upiId}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">Split Method</label>
                <span className="text-xs text-slate-400">4 split modes supported</span>
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSplitType("EQUAL")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    splitType === "EQUAL"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Divide className="w-3.5 h-3.5" />
                  <span>Equal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType("EXACT")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    splitType === "EXACT"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Exact</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType("PERCENTAGE")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    splitType === "PERCENTAGE"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>% Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType("SHARES")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    splitType === "SHARES"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Shares</span>
                </button>
              </div>
            </div>

            {/* Participant Breakdown & Inputs based on Split Mode */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 max-h-56 overflow-y-auto">
              {splitType === "EQUAL" && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Include in split ({selectedMemberIds.length} of {members.length}):</span>
                    <button
                      type="button"
                      onClick={selectAllMembers}
                      className="text-emerald-400 hover:underline text-[11px] font-medium"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {members.map((m) => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border text-xs transition-all ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 text-slate-100"
                              : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                : "border-slate-700 bg-slate-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate font-medium">{m.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {splitType === "EXACT" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">
                    Enter exact amounts for each member (Total: ₹{parsedAmount.toFixed(2)}):
                  </p>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">{m.name}</span>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-2 text-slate-500 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={customValues[m.id] || ""}
                          onChange={(e) =>
                            setCustomValues({ ...customValues, [m.id]: e.target.value })
                          }
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-right font-mono text-slate-100 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === "PERCENTAGE" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">
                    Enter percentage share for each person (Total must be 100%):
                  </p>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">{m.name}</span>
                      <div className="relative w-28">
                        <input
                          type="number"
                          step="1"
                          placeholder="0"
                          value={customValues[m.id] || ""}
                          onChange={(e) =>
                            setCustomValues({ ...customValues, [m.id]: e.target.value })
                          }
                          className="w-full pr-6 pl-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-right font-mono text-slate-100 outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2.5 top-2 text-slate-500 font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === "SHARES" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">
                    Enter relative units (e.g. 2 shares for someone drinking, 1 share for food):
                  </p>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">{m.name}</span>
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="1"
                          value={customValues[m.id] ?? "1"}
                          onChange={(e) =>
                            setCustomValues({ ...customValues, [m.id]: e.target.value })
                          }
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-right font-mono text-slate-100 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Real-time Calculation Preview Card */}
            {parsedAmount > 0 && previewSplits.length > 0 && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Live Calculated Allocation Preview:
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      validationInfo.isValid
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {validationInfo.message}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-40 overflow-y-auto">
                  {previewSplits.map((s) => {
                    const mName = members.find((m) => m.id === s.memberId)?.name || "Member";
                    return (
                      <div
                        key={s.memberId}
                        className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60"
                      >
                        <span className="text-slate-400 truncate max-w-[70px]">{mName}</span>
                        <span className="font-mono font-bold text-slate-200">₹{s.amountOwed.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-md flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !validationInfo.isValid || parsedAmount <= 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Receipt className="w-4 h-4" />
              <span>{isSubmitting ? "Logging..." : "Save Expense"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
