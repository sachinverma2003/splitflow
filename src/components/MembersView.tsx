"use client";

import React from "react";
import { UserPlus, Edit3, Smartphone, Sparkles, Shield, UserCheck } from "lucide-react";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
  isVirtual: boolean;
}

interface MembersViewProps {
  members: Member[];
  onOpenAddMember: () => void;
  onOpenEditMember: (member: Member) => void;
}

export function MembersView({
  members,
  onOpenAddMember,
  onOpenEditMember,
}: MembersViewProps) {
  return (
    <div className="space-y-6">
      {/* Ghost Members Explainer Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Friends & Group Members</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-xl">
              Unlike traditional apps where everyone must download an app, create an account, and verify emails, SplitFlow allows you to add any friend instantly. Anyone in the group can log expenses on their behalf and generate ready-to-pay UPI links.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddMember}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-100 text-sm truncate">{m.name}</h5>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {m.upiId ? "UPI Ready" : "Member"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenEditMember(m)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Edit member details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* UPI & Phone Info */}
              <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">UPI ID:</span>
                  <span className={`font-mono text-[11px] truncate max-w-[150px] ${m.upiId ? "text-emerald-400 font-semibold" : "text-slate-500 italic"}`}>
                    {m.upiId || "None (Cash only)"}
                  </span>
                </div>
                {m.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Phone:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{m.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center justify-end">
              <button
                onClick={() => onOpenEditMember(m)}
                className="text-xs text-sky-400 hover:text-sky-300 hover:underline font-medium"
              >
                {m.upiId ? "Edit UPI ID" : "+ Set UPI ID for QR"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
