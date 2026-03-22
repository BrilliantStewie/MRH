import { ToastContainer } from "react-toastify";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  RotateCcw,
  X,
} from "lucide-react";

const TOAST_THEME = {
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-100",
    toast: "border-emerald-100",
    accent: "from-emerald-400 to-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconWrap: "bg-rose-50 text-rose-500 border-rose-100",
    toast: "border-rose-100",
    accent: "from-rose-400 to-rose-500",
  },
  warning: {
    icon: AlertCircle,
    iconWrap: "bg-amber-50 text-amber-500 border-amber-100",
    toast: "border-amber-100",
    accent: "from-amber-400 to-amber-500",
  },
  info: {
    icon: Bell,
    iconWrap: "bg-blue-50 text-blue-600 border-blue-100",
    toast: "border-blue-100",
    accent: "from-blue-400 to-blue-500",
  },
  default: {
    icon: Info,
    iconWrap: "bg-slate-100 text-slate-500 border-slate-200",
    toast: "border-slate-200",
    accent: "from-slate-300 to-slate-400",
  },
};

const getToastTheme = (type) => TOAST_THEME[type] || TOAST_THEME.default;

const ToastCloseButton = ({ closeToast }) => (
  <button
    type="button"
    onClick={closeToast}
    className="mt-0.5 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
    aria-label="Close notification"
  >
    <X size={15} />
  </button>
);

const StyledToastContainer = () => (
  <ToastContainer
    position="bottom-right"
    autoClose={3200}
    hideProgressBar
    closeButton={ToastCloseButton}
    newestOnTop
    pauseOnFocusLoss={false}
    pauseOnHover
    draggable={false}
    limit={4}
    className="!w-auto !max-w-[420px] !p-0"
    icon={({ type, isLoading }) => {
      if (isLoading) {
        return (
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <RotateCcw size={18} className="animate-spin" />
          </div>
        );
      }

      const theme = getToastTheme(type);
      const Icon = theme.icon;

      return (
        <div className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${theme.iconWrap}`}>
          <Icon size={18} />
        </div>
      );
    }}
    toastClassName={({ type }) =>
      [
        "!mb-3 !flex !items-start !gap-3 relative overflow-hidden rounded-[22px] border bg-white/95 px-4 py-4 backdrop-blur-sm shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]",
        getToastTheme(type).toast,
      ]
        .filter(Boolean)
        .join(" ")
    }
    bodyClassName={() =>
      "!m-0 !min-h-0 !flex-1 !p-0 !pr-2 text-[14px] font-medium leading-6 text-slate-700"
    }
  />
);

export default StyledToastContainer;
