"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Trash2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  PlusCircle,
  Edit2,
  Lock,
  Search,
  X,
  Download,
  Printer,
  ArrowUpDown,
  Filter,
  Check,
} from "lucide-react";
import { useToast } from "./Toast";
import { getAdminHeaders } from "@/lib/admin-client";

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
  groupName?: string;
  onExpenseDeleted: () => void;
  onOpenAddExpense: () => void;
  hasAdmin?: boolean;
  isAdmin?: boolean;
  onOpenEditExpense?: (expense: Expense) => void;
  activeMemberId?: string | null;
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
  groupName = "Trip",
  onExpenseDeleted,
  onOpenAddExpense,
  hasAdmin = false,
  isAdmin = false,
  onOpenEditExpense,
  activeMemberId = null,
}: ExpensesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayer, setSelectedPayer] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const { toast } = useToast();

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Distinct Payers & Categories from active data
  const uniquePayers = useMemo(() => {
    const payers = new Map<string, string>();
    for (const exp of expenses) {
      if (exp.payer?.id) {
        payers.set(exp.payer.id, exp.payer.name);
      }
    }
    return Array.from(payers.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const exp of expenses) {
      if (exp.category) cats.add(exp.category);
    }
    return Array.from(cats);
  }, [expenses]);

  // Filter & Sort Logic
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // 1. Text Search (title, amount, payer name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = exp.title.toLowerCase().includes(q);
          const matchesPayer = exp.payer?.name?.toLowerCase().includes(q);
          const matchesAmount = exp.amount.toString().includes(q);
          if (!matchesTitle && !matchesPayer && !matchesAmount) return false;
        }

        // 2. Payer Filter
        if (selectedPayer !== "ALL" && exp.payerId !== selectedPayer) {
          return false;
        }

        // 3. Category Filter
        if (selectedCategory !== "ALL" && exp.category !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === "date-asc") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === "amount-desc") {
          return b.amount - a.amount;
        }
        if (sortBy === "amount-asc") {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [expenses, searchQuery, selectedPayer, selectedCategory, sortBy]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast("No expenses to export", "info");
      return;
    }

    const headers = [
      "Date",
      "Title",
      "Category",
      "Paid By",
      "Total Amount (INR)",
      "Split Type",
      "Participants Count",
      "Split Breakdown",
    ];

    const rows = filteredExpenses.map((exp) => {
      const formattedDate = new Date(exp.date).toISOString().split("T")[0];
      const splitsSummary = exp.splits
        .map((s) => `${s.member.name}: ₹${s.amountOwed.toFixed(2)}`)
        .join("; ");

      return [
        `"${formattedDate}"`,
        `"${exp.title.replace(/"/g, '""')}"`,
        `"${exp.category}"`,
        `"${exp.payer.name.replace(/"/g, '""')}"`,
        exp.amount.toFixed(2),
        `"${exp.splitType}"`,
        exp.splits.length,
        `"${splitsSummary.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeName = groupName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("download", `splitflow_${safeName}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast(`Exported ${filteredExpenses.length} expenses to CSV!`, "success");
  };

  // Print Statement Handler
  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPayer("ALL");
    setSelectedCategory("ALL");
    setSortBy("date-desc");
  };

  const handleDelete = async (expenseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the expense "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(expenseId);
      const res = await fetch(`/api/groups/${groupSlug}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: getAdminHeaders(groupSlug),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete expense");
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

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedPayer !== "ALL" ||
    selectedCategory !== "ALL" ||
    sortBy !== "date-desc";

  return (
    <div className="space-y-3.5">
      {/* 1. Search & Action Toolbar (Hidden during print) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3 no-print">
        {/* Row 1: Search Input & Quick Export Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, amounts, or payers..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Tools: Sort Dropdown + Export CSV + Print */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selector */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-slate-700 cursor-pointer"
                title="Sort expenses list"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest ₹</option>
                <option value="amount-asc">Lowest ₹</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 pointer-events-none" />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold border border-slate-750 transition-colors active:scale-95"
              title="Download CSV spreadsheet of expenses"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Print Statement Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold border border-slate-750 transition-colors active:scale-95"
              title="Print or save PDF statement"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category & Payer Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          {/* Category Chips (Horizontally Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              All Categories
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>{CATEGORY_EMOJIS[cat] || "📦"}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Payer Dropdown Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-500" />
              <span>Payer:</span>
            </span>
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg px-2 py-1 focus:outline-none focus:border-slate-700 cursor-pointer"
            >
              <option value="ALL">Everyone</option>
              {uniquePayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter & Active Filter Reset Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <div>
            <span>
              Showing <strong className="text-white">{filteredExpenses.length}</strong> of{" "}
              {expenses.length} expenses
            </span>
            <span className="mx-1.5">•</span>
            <span>
              Total:{" "}
              <strong className="text-emerald-400">
                ₹{totalFilteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Expenses List or Empty Search State */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-200">No matching expenses</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            No expenses found matching your search or active filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {/* Print-Only Formal Statement Header & Ledger Table */}
          <div className="hidden print:block printable-area mb-6">
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                    {groupName} • Expense Ledger
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Generated via SplitFlow • {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Spend</span>
                  <div className="text-xl font-black text-slate-950 font-mono">
                    ₹{totalFilteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-xs text-slate-600">
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"}
                  </span>
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[10px]">
                  <th className="py-2 px-1">Date</th>
                  <th className="py-2 px-1">Expense</th>
                  <th className="py-2 px-1">Category</th>
                  <th className="py-2 px-1">Paid By</th>
                  <th className="py-2 px-1">Split Between</th>
                  <th className="py-2 px-1 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredExpenses.map((exp) => (
                  <tr key={`print-${exp.id}`} className="py-1">
                    <td className="py-1.5 px-1 whitespace-nowrap text-slate-700">
                      {new Date(exp.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-1.5 px-1 font-semibold text-slate-900">{exp.title}</td>
                    <td className="py-1.5 px-1 text-slate-700">{exp.category}</td>
                    <td className="py-1.5 px-1 text-slate-800 font-medium">{exp.payer.name}</td>
                    <td className="py-1.5 px-1 text-slate-600 text-[11px]">
                      {exp.splits.map((s) => s.member.name).join(", ")}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900">
                      ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold">
                  <td colSpan={5} className="py-2 px-1 text-right text-slate-900 uppercase">Total Spend:</td>
                  <td className="py-2 px-1 text-right font-mono text-sm text-slate-900">
                    ₹{totalFilteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Interactive Screen Cards View (Hidden during print) */}
          <div className="space-y-3 print:hidden">
          {filteredExpenses.map((exp) => {
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
                  className="p-3 sm:p-5 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                    {/* Category Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-inner">
                      {emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-100 text-sm sm:text-base truncate leading-snug">
                          {exp.title}
                        </h4>
                        {activeMemberId && exp.payerId === activeMemberId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                            You Paid
                          </span>
                        )}
                        {activeMemberId && exp.payerId !== activeMemberId && exp.splits.some((s) => s.memberId === activeMemberId) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                            Your share: ₹{exp.splits.find((s) => s.memberId === activeMemberId)?.amountOwed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                        <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-500/20 truncate max-w-[120px] sm:max-w-none">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">Paid by {exp.payer.name}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {exp.splitType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end font-extrabold text-base sm:text-xl text-white">
                        <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        <span>
                          {exp.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-slate-400">
                        {exp.splits.length} {exp.splits.length === 1 ? "person" : "people"}
                      </span>
                    </div>

                    <div className="text-slate-400 p-0.5 sm:p-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="px-3.5 sm:px-5 pb-4 pt-1.5 border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                      <span>Split Breakdown</span>

                      <div className="flex items-center gap-2">
                        {hasAdmin && !isAdmin ? (
                          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 font-normal px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Admin Protected</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditExpense?.(exp);
                              }}
                              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 sm:px-2.5 py-1 rounded-lg transition-colors border border-amber-500/20 text-xs font-medium"
                              title="Review or edit split"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(exp.id, exp.title);
                              }}
                              disabled={deletingId === exp.id}
                              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-colors border border-rose-500/20 text-xs font-medium"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{deletingId === exp.id ? "Deleting..." : "Delete"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {exp.splits.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <span className="text-slate-300 truncate max-w-[90px]">{s.member.name}</span>
                          <span className="font-mono font-semibold text-emerald-400">
                            ₹
                            {s.amountOwed.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
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
        </>
      )}
    </div>
  );
}
