"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, Unlock, Crown, X, KeyRound, UserCheck, AlertCircle } from "lucide-react";
import { useToast } from "./Toast";
import { setAdminToken } from "@/lib/admin-client";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  members: Member[];
  hasAdmin: boolean;
  isAdminLoggedIn: boolean;
  adminMemberName: string | null;
  onAdminStateChanged: () => void;
}

export function AdminModal({
  isOpen,
  onClose,
  groupSlug,
  members,
  hasAdmin,
  isAdminLoggedIn,
  adminMemberName,
  onAdminStateChanged,
}: AdminModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      toast("Password must be at least 4 characters", "error");
      return;
    }
    if (password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/groups/${groupSlug}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          memberId: selectedMemberId,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim admin");
      }

      if (data.token) {
        setAdminToken(groupSlug, data.token);
      }

      toast(data.message, "success");
      onAdminStateChanged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error claiming admin";
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast("Please enter your password", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/groups/${groupSlug}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.token) {
        setAdminToken(groupSlug, data.token);
      }

      toast(data.message, "success");
      onAdminStateChanged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsSubmitting(true);
      await fetch(`/api/groups/${groupSlug}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setAdminToken(groupSlug, null);
      toast("Logged out of Admin mode", "info");
      onAdminStateChanged();
      onClose();
    } catch {
      toast("Logout failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl pb-safe">
        {/* Mobile Drag Pill */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LOGGED IN ACTIVE STATE */}
        {isAdminLoggedIn ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Admin Mode Active</h3>
                <p className="text-xs text-amber-300 font-medium">Logged in as {adminMemberName}</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2 mb-6">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Privileges Unlocked:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Edit wrong splits or amounts on any expense.</li>
                <li>Delete incorrect or accidental expenses.</li>
                <li>Undo / revert settlements if someone clicked &quot;Mark as Paid&quot; without paying.</li>
              </ul>
            </div>

            <button
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors border border-slate-700"
            >
              Lock / Logout from Admin Mode
            </button>
          </div>
        ) : !hasAdmin ? (
          /* CLAIM ADMIN RIGHTS (FIRST TIME) */
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Claim Group Admin</h3>
                <p className="text-xs text-slate-400">Only 1 person can be Admin for this group</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Once claimed, only the Admin can modify past expenses, delete mistakes, or revert false settlements. Regular members can still log expenses and pay via UPI.
              </span>
            </div>

            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Who Is Admin <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.upiId ? `• ${m.upiId}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Set Admin Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Admin Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? "Securing Group..." : "Claim Admin & Secure Group"}
              </button>
            </form>
          </div>
        ) : (
          /* LOGIN AS EXISTING ADMIN */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Admin Login</h3>
                <p className="text-xs text-slate-400">Group Admin: <strong className="text-slate-200">{adminMemberName}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter the admin password set by <strong>{adminMemberName}</strong> to unlock editing, deleting, and settlement reversal powers.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20"
              >
                {isSubmitting ? "Verifying..." : "Unlock Admin Controls"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
