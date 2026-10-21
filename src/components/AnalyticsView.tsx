"use client";

import React, { useMemo } from "react";
import {
  IndianRupee,
  Users,
  PieChart,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Calendar,
  Layers,
} from "lucide-react";
import { MemberBalance, SimplifiedTransaction } from "@/lib/settlement-engine";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
}

interface ExpenseSplit {
  id: string;
  memberId: string;
  amountOwed: number;
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

interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  settledAt: string;
}

interface AnalyticsViewProps {
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  simplifiedTransactions: SimplifiedTransaction[];
  netBalances: MemberBalance[];
  totalSpend: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string; emoji: string }> = {
  Food: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500", emoji: "🍽️" },
  Travel: { bg: "bg-sky-500/10", text: "text-sky-400", bar: "bg-sky-500", emoji: "🚕" },
  Stay: { bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500", emoji: "🏨" },
  Drinks: { bg: "bg-rose-500/10", text: "text-rose-400", bar: "bg-rose-500", emoji: "🍹" },
  Shopping: { bg: "bg-pink-500/10", text: "text-pink-400", bar: "bg-pink-500", emoji: "🛍️" },
  Entertainment: { bg: "bg-indigo-500/10", text: "text-indigo-400", bar: "bg-indigo-500", emoji: "🎟️" },
  General: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500", emoji: "📦" },
};

const DEFAULT_COLOR = { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500", emoji: "🏷️" };

export function AnalyticsView({
  members,
  expenses,
  settlements,
  simplifiedTransactions,
  netBalances,
  totalSpend,
}: AnalyticsViewProps) {
  // 1. Calculations: Total Settled vs Remaining Unsettled
  const totalSettledAmount = useMemo(() => {
    return settlements.reduce((sum, s) => sum + s.amount, 0);
  }, [settlements]);

  const remainingPendingDebt = useMemo(() => {
    return simplifiedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [simplifiedTransactions]);

  const averageSpendPerMember = useMemo(() => {
    return members.length > 0 ? totalSpend / members.length : 0;
  }, [totalSpend, members.length]);

  // 2. Highest Single Expense
  const biggestExpense = useMemo(() => {
    if (expenses.length === 0) return null;
    return [...expenses].sort((a, b) => b.amount - a.amount)[0];
  }, [expenses]);

  // 3. Category Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const exp of expenses) {
      const cat = exp.category || "General";
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += exp.amount;
      map[cat].count += 1;
    }

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percent: totalSpend > 0 ? (data.total / totalSpend) * 100 : 0,
        config: CATEGORY_COLORS[name] || DEFAULT_COLOR,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalSpend]);

  // 4. Financier Leaderboard: Who paid the bills upfront
  const payerLeaderboard = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members) map[m.id] = 0;
    for (const exp of expenses) {
      map[exp.payerId] = (map[exp.payerId] || 0) + exp.amount;
    }

    return members
      .map((m) => ({
        id: m.id,
        name: m.name,
        amountPaid: map[m.id] || 0,
        percent: totalSpend > 0 ? ((map[m.id] || 0) / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amountPaid - a.amountPaid);
  }, [members, expenses, totalSpend]);

  // 5. Beneficiary Leaderboard: Who consumed the most in splits
  const consumerLeaderboard = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members) map[m.id] = 0;
    for (const exp of expenses) {
      for (const split of exp.splits) {
        map[split.memberId] = (map[split.memberId] || 0) + split.amountOwed;
      }
    }

    return members
      .map((m) => ({
        id: m.id,
        name: m.name,
        amountOwed: map[m.id] || 0,
        percent: totalSpend > 0 ? ((map[m.id] || 0) / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amountOwed - a.amountOwed);
  }, [members, expenses, totalSpend]);

  // 6. Daily Timeline Breakdown
  const dailyTimeline = useMemo(() => {
    const map: Record<string, { total: number; count: number; date: Date }> = {};
    for (const exp of expenses) {
      const dateObj = new Date(exp.date);
      const key = dateObj.toISOString().slice(0, 10);
      if (!map[key]) {
        map[key] = { total: 0, count: 0, date: dateObj };
      }
      map[key].total += exp.amount;
      map[key].count += 1;
    }

    const items = Object.entries(map).map(([dateKey, val]) => ({
      dateKey,
      ...val,
    }));

    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    const maxDaySpend = Math.max(...items.map((i) => i.total), 1);

    return { items, maxDaySpend };
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <PieChart className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-slate-200">No Analytics Yet</h4>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
          Once you start logging expenses, visual breakdowns, leaderboards, and category insights will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Executive Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Spend */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Total Group Spend</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center text-lg sm:text-2xl font-black text-white">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <span>{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across {expenses.length} expenses</span>
        </div>

        {/* Average Per Member */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Average / Member</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-center text-lg sm:text-2xl font-black text-white">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
            <span>{averageSpendPerMember.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Fair share per person</span>
        </div>

        {/* Settled vs Remaining */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Total Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center text-lg sm:text-2xl font-black text-emerald-400">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <span>{totalSettledAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            ₹{remainingPendingDebt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending
          </span>
        </div>

        {/* Biggest Expense */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Biggest Single Bill</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center text-lg sm:text-2xl font-black text-amber-300">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span>
              {biggestExpense
                ? biggestExpense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "0"}
            </span>
          </div>
          <span className="text-[11px] text-slate-300 truncate block mt-1">
            {biggestExpense ? biggestExpense.title : "None"}
          </span>
        </div>
      </div>

      {/* 2. Category Distribution */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Category Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {categoryStats.length} active {categoryStats.length === 1 ? "category" : "categories"}
          </span>
        </div>

        {/* Proportional Multi-Segment Progress Bar */}
        <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner border border-slate-800">
          {categoryStats.map((cat) => (
            <div
              key={cat.name}
              style={{ width: `${Math.max(cat.percent, 2)}%` }}
              className={`${cat.config.bar} transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:opacity-90`}
              title={`${cat.name}: ₹${cat.total.toLocaleString("en-IN")} (${cat.percent.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
          {categoryStats.map((cat) => (
            <div
              key={cat.name}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 transition-all hover:border-slate-700"
            >
              <span className="text-xl shrink-0 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {cat.config.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">{cat.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{cat.percent.toFixed(0)}%</span>
                </div>
                <div className="text-xs font-black text-white mt-0.5">
                  ₹{cat.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400">
                  {cat.count} {cat.count === 1 ? "expense" : "expenses"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Leaderboards: Financiers vs Consumers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Financiers (Who Paid the Most) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Top Financiers (Paid Upfront)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Paid Bills</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {payerLeaderboard.map((item, index) => {
              const rankEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center font-bold text-slate-400 text-xs">
                      {rankEmoji || `#${index + 1}`}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-200 font-semibold truncate max-w-[110px] sm:max-w-[140px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-emerald-400">
                      ₹{item.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.percent.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Consumers (Highest Share) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Total Share Consumed
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Splits Owed</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {consumerLeaderboard.map((item, index) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-center font-bold text-slate-400 text-xs">#{index + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-semibold truncate max-w-[110px] sm:max-w-[140px]">
                    {item.name}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-white">
                    ₹{item.amountOwed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {item.percent.toFixed(1)}% of trip
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Daily Spend Timeline */}
      {dailyTimeline.items.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Day-by-Day Spending Timeline
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {dailyTimeline.items.length} {dailyTimeline.items.length === 1 ? "day" : "days"} logged
            </span>
          </div>

          <div className="space-y-2.5">
            {dailyTimeline.items.map((day) => {
              const formattedDate = day.date.toLocaleDateString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const barPercent = Math.min(Math.round((day.total / dailyTimeline.maxDaySpend) * 100), 100);

              return (
                <div key={day.dateKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{formattedDate}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{day.count} {day.count === 1 ? "item" : "items"}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{day.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${Math.max(barPercent, 4)}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
