"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Receipt,
  IndianRupee,
  Divide,
  Percent,
  Scale,
  Sparkles,
  Check,
  Calendar,
} from "lucide-react";
import { useToast } from "./Toast";
import { calculateSplits } from "@/lib/settlement-engine";
import { getAdminHeaders } from "@/lib/admin-client";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
}

interface ExpenseSplit {
  id: string;
  memberId: string;
  amountOwed: number;
  shareValue?: number | null;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  splitType: string;
  payerId: string;
  payer: {
    id: string;
    name: string;
  };
  splits: ExpenseSplit[];
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  members: Member[];
  expense: Expense;
  onExpenseUpdated: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  groupSlug,
  members,
  expense,
  onExpenseUpdated,
}: EditExpenseModalProps) {
  const [title, setTitle] = useState(expense.title);
  const [amountStr, setAmountStr] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category || "General");
  const [date, setDate] = useState(
    expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [payerId, setPayerId] = useState(expense.payerId);
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES">(
    (expense.splitType as "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES") || "EQUAL"
  );

  // Selected members for equal split
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    expense.splits.map((s) => s.memberId)
  );

  // Custom values for exact, percentage, or shares
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    expense.splits.forEach((s) => {
      init[s.memberId] = s.shareValue ? s.shareValue.toString() : s.amountOwed.toString();
    });
    return init;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const parsedAmount = parseFloat(amountStr) || 0;

  // Toggle member in EQUAL mode
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
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
      const totalPct = members.reduce((acc, m) => acc + (parseFloat(customValues[m.id] || "0") || 0), 0);
      const diff = Math.round((100 - totalPct) * 10) / 10;
      if (Math.abs(diff) > 0.1) {
        return {
          isValid: false,
          message: diff > 0 ? `${diff.toFixed(1)}% remaining` : `${Math.abs(diff).toFixed(1)}% over 100%`,
        };
      }
      return { isValid: true, message: "100% fully allocated" };
    }

    if (splitType === "SHARES") {
      const totalShares = members.reduce((acc, m) => acc + (parseFloat(customValues[m.id] || "1") || 0), 0);
      if (totalShares <= 0) return { isValid: false, message: "Total shares must be > 0" };
      return { isValid: true, message: `${totalShares} total shares` };
    }

    return { isValid: true, message: "" };
  }, [parsedAmount, splitType, selectedMemberIds, customValues, previewSplits, members]);

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

      const res = await fetch(`/api/groups/${groupSlug}/expenses/${expense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(groupSlug),
        },
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
        throw new Error(data.error || "Failed to update expense");
      }

      toast(`Updated "${title}" (₹${parsedAmount})`, "success");
      onExpenseUpdated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving changes";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[94vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Mobile Drag Pill */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Sticky Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/80 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-100">Edit / Review Expense</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Modify amounts, payer, or split distribution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-slate-100 outline-none transition-all"
                >
                  <option value="Food">🍽️ Food & Dining</option>
                  <option value="Travel">🚕 Travel / Fuel</option>
                  <option value="Stay">🏨 Stay / Hotel</option>
                  <option value="Drinks">🍸 Drinks & Party</option>
                  <option value="Activities">🏖️ Activities</option>
                  <option value="Shopping">🛍️ Shopping</option>
                  <option value="General">📦 General</option>
                </select>
              </div>
            </div>

            {/* Total Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total Amount <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-amber-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-base font-bold text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
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
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-slate-200 outline-none transition-all"
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Paid By Member Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Who Paid?</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-sm font-semibold text-slate-100 outline-none transition-all"
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
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
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
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
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
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
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
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Shares</span>
                </button>
              </div>
            </div>

            {/* Participant Breakdown based on Split Mode */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 max-h-56 overflow-y-auto">
              {splitType === "EQUAL" && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Include in split ({selectedMemberIds.length} of {members.length}):</span>
                    <button
                      type="button"
                      onClick={selectAllMembers}
                      className="text-amber-400 hover:underline text-[11px] font-medium"
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
                              ? "bg-amber-500/10 border-amber-500/40 text-slate-100"
                              : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? "bg-amber-500 border-amber-500 text-slate-950"
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
                          value={customValues[m.id] ?? ""}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-slate-100 outline-none text-right font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === "PERCENTAGE" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">Enter percentage shares (Total must equal 100%):</p>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">{m.name}</span>
                      <div className="relative w-28">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={customValues[m.id] ?? ""}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-full pl-2 pr-6 py-1.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-slate-100 outline-none text-right font-mono"
                        />
                        <span className="absolute right-2.5 top-1.5 text-slate-500 font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === "SHARES" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">Assign ratio shares (e.g. 1 share, 2 shares):</p>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">{m.name}</span>
                      <div className="relative w-28">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="1"
                          value={customValues[m.id] ?? "1"}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-slate-100 outline-none text-right font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Calculated Allocation Preview Card */}
            {parsedAmount > 0 && previewSplits.length > 0 && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    New Allocation Preview:
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      validationInfo.isValid
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
          <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none py-2.5 sm:py-2 px-4 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-800 sm:border-0 transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !validationInfo.isValid || parsedAmount <= 0}
              className="flex-2 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Updating..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
