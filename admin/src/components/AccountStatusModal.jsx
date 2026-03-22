import React from "react";
import { AlertTriangle } from "lucide-react";

const AccountStatusModal = ({ open, message, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">Account Disabled</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-black"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default AccountStatusModal;
