"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Receipt,
  Users,
  Scale,
  Plus,
  Share2,
  QrCode,
  MessageCircle,
  IndianRupee,
  RefreshCw,
  Clock,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Crown,
  Lock,
} from "lucide-react";
import { ToastProvider, useToast } from "@/components/Toast";
import { ExpensesList } from "@/components/ExpensesList";
import { BalancesView } from "@/components/BalancesView";
import { MembersView } from "@/components/MembersView";
import { SettlementsHistoryView } from "@/components/SettlementsHistoryView";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { EditExpenseModal } from "@/components/EditExpenseModal";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { GroupQRModal } from "@/components/GroupQRModal";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { AdminModal } from "@/components/AdminModal";
import { CustomRouteModal } from "@/components/CustomRouteModal";
import { MemberBalance, SimplifiedTransaction } from "@/lib/settlement-engine";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
  isVirtual: boolean;
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
  splits: {
    id: string;
    memberId: string;
    amountOwed: number;
    shareValue?: number | null;
    member: {
      id: string;
      name: string;
    };
  }[];
}

interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  notes?: string | null;
  settledAt: string;
  payer: {
    id: string;
    name: string;
  };
  payee: {
    id: string;
    name: string;
  };
}

interface GroupData {
  group: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    createdAt: string;
  };
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  netBalances: MemberBalance[];
  simplifiedTransactions: SimplifiedTransaction[];
  totalSpend: number;
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <ToastProvider>
      <GroupDashboard slug={slug} />
    </ToastProvider>
  );
}

function GroupDashboard({ slug }: { slug: string }) {
  const [data, setData] = useState<GroupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "members" | "history">("balances");

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isGroupQROpen, setIsGroupQROpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCustomRouteModalOpen, setIsCustomRouteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [adminStatus, setAdminStatus] = useState<{
    hasAdmin: boolean;
    isAdminLoggedIn: boolean;
    adminMemberName: string | null;
  }>({
    hasAdmin: false,
    isAdminLoggedIn: false,
    adminMemberName: null,
  });

  const [originUrl, setOriginUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const fetchAdminStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${slug}/admin`);
      if (res.ok) {
        const json = await res.json();
        setAdminStatus(json);
      }
    } catch {
      // ignore
    }
  }, [slug]);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${slug}`);
      if (!res.ok) {
        // Check for local client backup to auto-restore if server container was recycled
        if (typeof window !== "undefined") {
          const backupRaw = localStorage.getItem(`splitflow_backup_${slug}`);
          if (backupRaw) {
            try {
              const backupData = JSON.parse(backupRaw);
              const restoreRes = await fetch("/api/groups/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(backupData),
              });
              if (restoreRes.ok) {
                // Successfully auto-restored! Re-fetch from server
                const retryRes = await fetch(`/api/groups/${slug}`);
                if (retryRes.ok) {
                  const retryJson = await retryRes.json();
                  setData(retryJson);
                  toast("Group ledger restored & synchronized!", "success");
                  return;
                }
              }
            } catch (restoreErr) {
              console.error("Auto-restore failed:", restoreErr);
            }
          }
        }
        throw new Error("Group not found");
      }
      const json = await res.json();
      setData(json);

      // Automatically backup group data to localStorage
      if (typeof window !== "undefined" && json?.group?.slug) {
        try {
          localStorage.setItem(`splitflow_backup_${json.group.slug}`, JSON.stringify(json));

          const raw = localStorage.getItem("splitflow_recent_groups");
          const existing = raw ? JSON.parse(raw) : [];
          const filtered = existing.filter((g: { slug: string }) => g.slug !== json.group.slug);
          filtered.unshift({
            slug: json.group.slug,
            name: json.group.name,
            currency: json.group.currency || "INR",
            membersCount: json.members?.length || 0,
            lastVisited: new Date().toISOString(),
          });
          localStorage.setItem("splitflow_recent_groups", JSON.stringify(filtered.slice(0, 10)));
        } catch {
          // ignore localStorage restrictions if private browsing
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading group";
      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [slug, toast]);

  const handleCopyLink = () => {
    if (!originUrl) return;
    const url = `${originUrl}/g/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast("Group link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    fetchGroup();
    fetchAdminStatus();
  }, [fetchGroup, fetchAdminStatus]);

  const groupUrl = `${originUrl}/g/${slug}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-spin mb-4">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-slate-400 text-sm font-medium">Loading group ledger...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Group Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The link you followed might be incorrect or the group was deleted.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all"
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  const { group, members, expenses, settlements, netBalances, simplifiedTransactions, totalSpend } = data;

  const handlePromptAddUpi = (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    if (mem) {
      setEditingMember(mem);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/"
              className="p-1.5 sm:p-2 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors shrink-0"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black text-white truncate leading-tight">
                  {group.name}
                </h1>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold border border-slate-700/60 shrink-0">
                  {group.currency}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {members.length} members • {expenses.length} expenses
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Admin Badge / Trigger Button */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                adminStatus.isAdminLoggedIn
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10"
                  : adminStatus.hasAdmin
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              }`}
              title={
                adminStatus.isAdminLoggedIn
                  ? `Admin mode active as ${adminStatus.adminMemberName}`
                  : adminStatus.hasAdmin
                  ? `Admin: ${adminStatus.adminMemberName} (Click to login)`
                  : "Click to claim 1-Admin control for this group"
              }
            >
              {adminStatus.isAdminLoggedIn ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden md:inline">Admin: {adminStatus.adminMemberName}</span>
                  <span className="md:hidden text-[11px] font-bold text-amber-400">Admin</span>
                </>
              ) : adminStatus.hasAdmin ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="hidden md:inline">Admin Login</span>
                  <span className="md:hidden text-[11px]">Login</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden md:inline">Claim Admin</span>
                  <span className="md:hidden text-[11px]">Claim</span>
                </>
              )}
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-semibold transition-colors shrink-0"
              title="Share Settlement Report on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700/60 shrink-0"
              title="Copy Group Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* QR Invite (Desktop) */}
            <button
              onClick={() => setIsGroupQROpen(true)}
              className="hidden sm:flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700/60 shrink-0"
              title="Show Group QR Invite"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Desktop Add Expense Button */}
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Group Overview Banner */}
      <div className="bg-slate-950/60 border-b border-slate-800/60 py-3 sm:py-6">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          {/* Mobile Sleek Compact Hero Card */}
          <div className="sm:hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Total Group Spend
                </span>
                <div className="flex items-center text-xl font-black text-white mt-0.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-right">
                {simplifiedTransactions.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> All Settled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {simplifiedTransactions.length} to settle
                  </span>
                )}
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1.5">
                  <span>{members.length} friends</span>
                  <span>•</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(groupUrl);
                      toast("Invite link copied!", "success");
                    }}
                    className="text-emerald-400 hover:underline font-mono"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop 4-Card Grid */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Spend */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Total Group Spend</span>
              <div className="flex items-center text-xl sm:text-2xl font-black text-white mt-1">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
                <span>{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Simplification Status */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Pending Settlements</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-1.5">
                {simplifiedTransactions.length === 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1 text-lg">
                    <CheckCircle2 className="w-5 h-5" /> All Settled
                  </span>
                ) : (
                  <span>{simplifiedTransactions.length} simplified {simplifiedTransactions.length === 1 ? "step" : "steps"}</span>
                )}
              </div>
            </div>

            {/* Members Count */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Group Members</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {members.length} <span className="text-xs text-slate-500 font-normal">friends</span>
              </div>
            </div>

            {/* Quick Invite Link */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Instant Ledger Link</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(groupUrl);
                  toast("Invite link copied to clipboard!", "success");
                }}
                className="flex items-center justify-between text-xs text-emerald-400 hover:text-emerald-300 font-mono mt-1 pt-1 border-t border-slate-800/80"
              >
                <span className="truncate">/{group.slug}</span>
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 pb-28 sm:pb-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 sm:mb-6 max-w-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 min-w-[70px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "balances"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Balances & Pay</span>
            <span className="sm:hidden">Balances</span>
            {simplifiedTransactions.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "balances"
                    ? "bg-slate-950 text-emerald-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {simplifiedTransactions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 min-w-[70px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "expenses"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Expenses</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "expenses"
                  ? "bg-slate-950 text-emerald-400"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 min-w-[70px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "members"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Members</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "members"
                  ? "bg-slate-950 text-emerald-400"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 min-w-[70px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "history"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Settled</span>
            {settlements.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "history"
                    ? "bg-slate-950 text-emerald-400"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {settlements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "balances" && (
          <BalancesView
            netBalances={netBalances}
            simplifiedTransactions={simplifiedTransactions}
            groupSlug={group.slug}
            onSettled={fetchGroup}
            onAddUpiPrompt={handlePromptAddUpi}
            isAdmin={adminStatus.isAdminLoggedIn}
            hasAdmin={adminStatus.hasAdmin}
            onOpenDirectRouteModal={() => setIsCustomRouteModalOpen(true)}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesList
            expenses={expenses}
            groupSlug={group.slug}
            onExpenseDeleted={fetchGroup}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            hasAdmin={adminStatus.hasAdmin}
            isAdmin={adminStatus.isAdminLoggedIn}
            onOpenEditExpense={(exp) => setEditingExpense(exp)}
          />
        )}

        {activeTab === "members" && (
          <MembersView
            members={members}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onOpenEditMember={(m) => setEditingMember(m)}
          />
        )}

        {activeTab === "history" && (
          <SettlementsHistoryView
            settlements={settlements}
            groupSlug={group.slug}
            onSettlementUndone={fetchGroup}
            hasAdmin={adminStatus.hasAdmin}
            isAdmin={adminStatus.isAdminLoggedIn}
          />
        )}
      </main>

      {/* Floating CTA for Mobile */}
      <div className="sm:hidden fixed bottom-5 right-5 z-30 pb-safe">
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-2xl shadow-emerald-500/50 active:scale-95 border border-emerald-400/40"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupSlug={group.slug}
        members={members}
        onExpenseAdded={fetchGroup}
      />

      {editingExpense && (
        <EditExpenseModal
          isOpen={Boolean(editingExpense)}
          onClose={() => setEditingExpense(null)}
          groupSlug={group.slug}
          members={members}
          expense={editingExpense}
          onExpenseUpdated={fetchGroup}
        />
      )}

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        groupSlug={group.slug}
        members={members}
        hasAdmin={adminStatus.hasAdmin}
        isAdminLoggedIn={adminStatus.isAdminLoggedIn}
        adminMemberName={adminStatus.adminMemberName}
        onAdminStateChanged={() => {
          fetchAdminStatus();
          fetchGroup();
        }}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        groupSlug={group.slug}
        onMemberAdded={fetchGroup}
      />

      <EditMemberModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        groupSlug={group.slug}
        member={editingMember}
        onMemberUpdated={fetchGroup}
      />

      <GroupQRModal
        isOpen={isGroupQROpen}
        onClose={() => setIsGroupQROpen(false)}
        groupName={group.name}
        groupUrl={groupUrl}
      />

      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        groupName={group.name}
        groupUrl={groupUrl}
        totalSpend={totalSpend}
        simplifiedTransactions={simplifiedTransactions}
      />

      <CustomRouteModal
        isOpen={isCustomRouteModalOpen}
        onClose={() => setIsCustomRouteModalOpen(false)}
        groupSlug={group.slug}
        netBalances={netBalances}
        onRouteUpdated={fetchGroup}
      />
    </div>
  );
}
