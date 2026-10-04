"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  QrCode,
  MessageSquare,
  IndianRupee,
  CheckCircle,
  Play,
  Share2,
  Clock,
  Copy,
  Trash2,
} from "lucide-react";
import { ToastProvider, useToast } from "@/components/Toast";

interface RecentGroup {
  slug: string;
  name: string;
  currency?: string;
  membersCount?: number;
  lastVisited?: string;
}

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}

function HomeContent() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [initialMembers, setInitialMembers] = useState("Sachin, Rahul, Amit");
  const [isCreating, setIsCreating] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("splitflow_recent_groups");
        if (raw) {
          setRecentGroups(JSON.parse(raw));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleRemoveRecent = (slug: string) => {
    try {
      const updated = recentGroups.filter((g) => g.slug !== slug);
      setRecentGroups(updated);
      localStorage.setItem("splitflow_recent_groups", JSON.stringify(updated));
      toast("Removed from your recent list", "info");
    } catch {
      // ignore
    }
  };

  const handleCopyGroupLink = (slug: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/g/${slug}`;
      navigator.clipboard.writeText(url);
      toast("Group link copied to clipboard!", "success");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast("Please enter a group or trip name", "error");
      return;
    }

    try {
      setIsCreating(true);

      const parsedMembers = initialMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          currency: "INR",
          members: parsedMembers.length > 0 ? parsedMembers : ["You", "Friend"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      // Save to recent groups in localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("splitflow_recent_groups");
          const existing = raw ? JSON.parse(raw) : [];
          const filtered = existing.filter((g: { slug: string }) => g.slug !== data.slug);
          filtered.unshift({
            slug: data.slug,
            name: groupName.trim(),
            currency: "INR",
            membersCount: parsedMembers.length > 0 ? parsedMembers.length : 2,
            lastVisited: new Date().toISOString(),
          });
          localStorage.setItem("splitflow_recent_groups", JSON.stringify(filtered.slice(0, 10)));
        } catch {
          // ignore
        }
      }

      toast("Group created! Redirecting...", "success");
      router.push(`/g/${data.slug}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creating group";
      toast(message, "error");
      setIsCreating(false);
    }
  };

  const handleDemoClick = async () => {
    try {
      setIsSeedingDemo(true);
      const res = await fetch("/api/groups/seed-demo", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo");
      }

      toast("Loaded Goa Beach Trip demo!", "success");
      router.push(`/g/${data.slug}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading demo";
      toast(message, "error");
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-emerald-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto px-4 py-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">SplitFlow</span>
            <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
              v2.0
            </span>
          </div>
        </div>

        <button
          onClick={handleDemoClick}
          disabled={isSeedingDemo}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/80 transition-all"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
          <span>{isSeedingDemo ? "Launching Demo..." : "Explore Live Demo"}</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl w-full mx-auto px-4 py-12 sm:py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-6 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero-Friction Group Expenses & Debt Simplification</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight mb-4">
          Split bills effortlessly. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            Settle directly via UPI.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          No signups. No forced app installs. Add ghost members, log payments on behalf of anyone, and let our Min-Cash-Flow algorithm simplify 10 messy debts into a couple of direct UPI payments.
        </p>

        {/* Instant Creation Form Card */}
        <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

          <form onSubmit={handleCreateGroup} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Trip / Group Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kudremukh Trek, Goa Trip, Flat 402, Dinner Out"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl text-base text-white placeholder-slate-500 outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                2. Initial Friends / Members <span className="text-slate-500 font-normal lowercase">(comma separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sachin, Rahul, Amit, Sneha"
                value={initialMembers}
                onChange={(e) => setInitialMembers(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                You can always add more ghost members or update UPI IDs later.
              </span>
            </div>

            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 mt-4"
            >
              <span>{isCreating ? "Creating Your Ledger..." : "Create Group & Start Splitting"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </form>

          {/* Quick Demo Trigger */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Want to see it in action first?</span>
            <button
              onClick={handleDemoClick}
              disabled={isSeedingDemo}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline flex items-center gap-1"
            >
              Try Goa Road Trip Demo 🏝️
            </button>
          </div>
        </div>

        {/* Your Saved & Active Groups (Persisted in browser) */}
        {recentGroups.length > 0 && (
          <div className="max-w-xl mx-auto mt-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md text-left animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Your Saved & Active Groups</h3>
                  <p className="text-[11px] text-slate-400">Saved on this device — reopen anytime</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                {recentGroups.length} groups
              </span>
            </div>

            <div className="space-y-2">
              {recentGroups.map((g) => (
                <div
                  key={g.slug}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all group"
                >
                  <div
                    onClick={() => router.push(`/g/${g.slug}`)}
                    className="flex-1 cursor-pointer min-w-0 pr-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                        {g.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {g.currency || "INR"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                      /g/{g.slug} {g.membersCount ? `• ${g.membersCount} members` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyGroupLink(g.slug)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Copy Group Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => router.push(`/g/${g.slug}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/20"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => handleRemoveRecent(g.slug)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                      title="Remove from device list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Algorithm Demonstration Card */}
        <div className="mt-14 max-w-2xl mx-auto p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">How Debt Simplification Works</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <span className="font-bold text-rose-400 uppercase tracking-wider block mb-1">
                ❌ Without Simplification (Messy)
              </span>
              <p className="text-slate-300 leading-relaxed">
                Person A owes Person B ₹500.<br />
                Person B owes Person C ₹500.<br />
                Person C owes Person D ₹500.<br />
                <strong className="text-rose-300">Requires 3 back-and-forth bank transfers.</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                ✅ SplitFlow Min-Cash-Flow (Smart)
              </span>
              <p className="text-slate-200 leading-relaxed">
                Net Balances calculated with decimal precision.<br />
                Intermediaries eliminated automatically.<br />
                <strong className="text-emerald-300">Person A simply pays Person D ₹500 via UPI!</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 text-left">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Ghost Members & Proxy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add friends who don&apos;t have accounts. Pay on behalf of anyone. No one is locked out or forced to register.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Dynamic UPI QR Codes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tap &quot;Pay via UPI&quot; on mobile to open PhonePe or GPay directly, or scan dynamic QR codes with exact amounts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">1-Click WhatsApp Ledger</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate a formatted breakdown and payment link to paste right into your WhatsApp group chat in seconds.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto px-4 py-8 border-t border-slate-800/60 text-center text-xs text-slate-400">
        <p>
          Built for zero-friction group living, travel, and roommates • SplitFlow with Decimal Precision
        </p>
      </footer>
    </div>
  );
}
