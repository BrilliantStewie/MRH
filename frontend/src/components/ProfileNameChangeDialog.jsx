import React from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const ProfileNameChangeDialog = ({
  open = false,
  currentName = "",
  nextName = "",
  impactText = "",
  onClose = () => {},
  onConfirm = () => {},
  isLoading = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-4">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-slate-900">Confirm name change?</p>
            <p className="mt-1 text-sm text-slate-600">
              Please review your updated name before saving this change.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Current Name
              </p>
              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {currentName || "Not set"}
              </p>
            </div>

            <div className="flex justify-center text-slate-300">
              <ArrowRight size={18} />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                New Name
              </p>
              <p className="mt-1 break-words text-sm font-bold text-emerald-800">
                {nextName || "Not set"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          {impactText ||
            "This updated name will appear anywhere your profile name is shown in the system."}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {isLoading ? "Saving..." : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileNameChangeDialog;
