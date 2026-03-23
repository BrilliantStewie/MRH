import { toast, ToastContainer } from "react-toastify";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  X,
} from "lucide-react";

const DUPLICATE_TOAST_WINDOW_MS = 1200;
const DEDUPED_TOAST_METHODS = ["success", "error", "info", "warning"];

const TOAST_THEME = {
  success: {
    title: "Success",
    icon: CheckCircle2,
    cardClass: "border-emerald-200 bg-emerald-50/70",
    iconClass: "bg-emerald-100 text-emerald-600",
    titleClass: "text-emerald-950",
  },
  error: {
    title: "Error",
    icon: AlertCircle,
    cardClass: "border-rose-200 bg-rose-50/70",
    iconClass: "bg-rose-100 text-rose-600",
    titleClass: "text-rose-950",
  },
  warning: {
    title: "Warning",
    icon: AlertTriangle,
    cardClass: "border-amber-200 bg-amber-50/80",
    iconClass: "bg-amber-100 text-amber-600",
    titleClass: "text-amber-950",
  },
  info: {
    title: "MRH Notice",
    icon: Info,
    cardClass: "border-blue-200 bg-blue-50/70",
    iconClass: "bg-blue-100 text-blue-600",
    titleClass: "text-blue-950",
  },
  loading: {
    title: "Processing",
    icon: RotateCcw,
    cardClass: "border-slate-200 bg-slate-50/90",
    iconClass: "bg-slate-200 text-slate-600",
    titleClass: "text-slate-900",
  },
  default: {
    title: "MRH Notice",
    icon: Info,
    cardClass: "border-slate-200 bg-slate-50/90",
    iconClass: "bg-slate-200 text-slate-600",
    titleClass: "text-slate-900",
  },
};

const getToastTheme = (type) => TOAST_THEME[type] || TOAST_THEME.default;

const ToastContent = ({ type, message }) => {
  const theme = getToastTheme(type);
  const Icon = theme.icon;
  const isLoading = type === "loading";

  return (
    <div className="flex min-w-0 items-start gap-3 pr-6">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${theme.iconClass}`}
      >
        <Icon size={15} className={isLoading ? "animate-spin" : ""} strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-bold leading-4 ${theme.titleClass}`}>
          {theme.title}
        </p>
        <p className="mt-1 break-words text-[12px] leading-5 text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
};

const wrapToastContent = (type, content) => {
  if (typeof content !== "string") return content;
  return <ToastContent type={type} message={content} />;
};

const installToastDeduper = () => {
  if (toast.__mrhToastDeduperInstalled) return;

  const recentToasts = new Map();

  const shouldSuppressDuplicate = (type, content, options) => {
    if (options?.toastId || typeof content !== "string") return false;

    const message = content.trim();
    if (!message) return false;

    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShownAt = recentToasts.get(key);

    recentToasts.set(key, now);

    for (const [recentKey, recentTime] of recentToasts.entries()) {
      if (now - recentTime > DUPLICATE_TOAST_WINDOW_MS * 4) {
        recentToasts.delete(recentKey);
      }
    }

    return typeof lastShownAt === "number" && now - lastShownAt < DUPLICATE_TOAST_WINDOW_MS;
  };

  DEDUPED_TOAST_METHODS.forEach((method) => {
    const originalMethod = toast[method].bind(toast);

    toast[method] = (content, options) => {
      if (shouldSuppressDuplicate(method, content, options)) {
        return undefined;
      }

      return originalMethod(wrapToastContent(method, content), options);
    };
  });

  const originalLoading = toast.loading.bind(toast);
  toast.loading = (content, options) =>
    originalLoading(wrapToastContent("loading", content), options);

  const originalUpdate = toast.update.bind(toast);
  toast.update = (toastId, options = {}) => {
    const nextOptions = { ...options };
    const nextType = nextOptions.type || "default";

    if (typeof nextOptions.render === "string") {
      nextOptions.render = wrapToastContent(nextType, nextOptions.render);
    }

    return originalUpdate(toastId, nextOptions);
  };

  toast.__mrhToastDeduperInstalled = true;
};

installToastDeduper();

const ToastCloseButton = ({ closeToast }) => (
  <button
    onClick={closeToast}
    className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
    aria-label="Close"
  >
    <X size={15} />
  </button>
);

const StyledToastContainer = () => (
  <ToastContainer
    position="bottom-right"
    autoClose={3400}
    icon={false}
    hideProgressBar
    newestOnTop
    closeButton={ToastCloseButton}
    pauseOnFocusLoss={false}
    pauseOnHover
    draggable={false}
    limit={4}
    theme="light"
    className="!p-0 sm:!mr-4 sm:!mb-4"
    toastStyle={{
      background: "#ffffff",
      color: "#0f172a",
      width: "272px",
      maxWidth: "calc(100vw - 24px)",
    }}
    toastClassName={({ type }) => {
      const theme = getToastTheme(type);
      return `relative mb-3 flex items-start rounded-2xl px-3 py-3 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.22)] ${theme.cardClass}`;
    }}
    bodyClassName={() => "!m-0 !flex-1 !p-0"}
  />
);

export default StyledToastContainer;
