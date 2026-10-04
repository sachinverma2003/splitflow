"use client";

import React, { useState } from "react";
import {
  Receipt,
  Trash2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Tag,
  IndianRupee,
  PlusCircle,
} from "lucide-react";
import { useToast } from "./Toast";

interface ExpenseSplit {
  id: string;
  memberId: string;
  amountOwed: number;
  shareValue?: number | null;
  member: {
    id: string;
    name: string;
  };
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

interface ExpensesListProps {
  expenses: Expense[];
  groupSlug: string;
  onExpenseDeleted: () => void;
  onOpenAddExpense: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: "🍽️",
  Travel: "🚕",
  Stay: "🏨",
  Drinks: "🍸",
  Activities: "🏖️",
  Shopping: "🛍️",
  General: "📦",
};

export function ExpensesList({
  expenses,
  groupSlug,
  onExpenseDeleted,
  onOpenAddExpense,
}: ExpensesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (expenseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the expense "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(expenseId);
      const res = await fetch(`/api/groups/${groupSlug}/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete expense");
      }

      toast(`Deleted "${title}"`, "info");
      onExpenseDeleted();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error deleting expense";
      toast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Receipt className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-slate-200">No expenses logged yet</h4>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
          Start adding bills, dinners, or trip expenses. SplitFlow calculates everyone&apos;s share in real-time.
        </p>
        <button
          onClick={onOpenAddExpense}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          Add First Expense
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((exp) => {
        const isExpanded = expandedId === exp.id;
        const emoji = CATEGORY_EMOJIS[exp.category] || "📦";
        const formattedDate = new Date(exp.date).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div
            key={exp.id}
            className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all shadow-md"
          >
            {/* Main Header Row */}
            <div
              onClick={() => toggleExpand(exp.id)}
              className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Category Avatar */}
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
                  {emoji}
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-slate-100 text-base truncate">{exp.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <User className="w-3 h-3" />
                      Paid by {exp.payer.name}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formattedDate}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {exp.splitType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="flex items-center justify-end font-extrabold text-lg sm:text-xl text-white">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span>{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {exp.splits.length} {exp.splits.length === 1 ? "person" : "people"}
                  </span>
                </div>

                <div className="text-slate-400 p-1">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Collapsible Details */}
            {isExpanded && (
              <div className="px-5 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  <span>Split Allocation Details</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(exp.id, exp.title);
                    }}
                    disabled={deletingId === exp.id}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingId === exp.id ? "Deleting..." : "Delete Expense"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {exp.splits.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                    >
                      <span className="text-slate-300 truncate max-w-[90px]">{s.member.name}</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        ₹{s.amountOwed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
