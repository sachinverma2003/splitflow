"use client";

import React, { useState, useEffect } from "react";
import { X, Edit2, Trash2 } from "lucide-react";
import { useToast } from "./Toast";

interface Member {
  id: string;
  name: string;
  upiId?: string | null;
  phone?: string | null;
  isVirtual: boolean;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupSlug: string;
  member: Member | null;
  onMemberUpdated: () => void;
}

export function EditMemberModal({
  isOpen,
  onClose,
  groupSlug,
  member,
  onMemberUpdated,
}: EditMemberModalProps) {
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setUpiId(member.upiId || "");
      setPhone(member.phone || "");
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Member name cannot be empty", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/groups/${groupSlug}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          upiId: upiId.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      toast("Member details updated successfully!", "success");
      onMemberUpdated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating member";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to remove ${member.name}? This will remove them from the group.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/groups/${groupSlug}/members/${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete member");
      }

      toast(`Removed ${member.name} from group`, "success");
      onMemberUpdated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error removing member";
      toast(message, "error");
    } finally {
      setIsDeleting(false);
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

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <Edit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Edit Member</h3>
            <p className="text-xs text-slate-400">Update UPI ID or details for {member.name}</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Member Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              UPI ID <span className="text-emerald-400 font-normal">(Enables 1-click Pay & QR codes)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. username@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? "Removing..." : "Remove Member"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-sky-500/20"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
