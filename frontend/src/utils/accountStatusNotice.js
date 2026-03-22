export const DISABLED_ACCOUNT_NOTICE_KEY = "mrh_disabled_account_notice";

export const DEFAULT_DISABLED_ACCOUNT_MESSAGE =
  "Your account has been disabled. Please contact administration.";

export const isAccountDisabledMessage = (message = "") =>
  /disabled|frozen/.test(String(message).toLowerCase());

export const storeDisabledAccountNotice = (
  message = DEFAULT_DISABLED_ACCOUNT_MESSAGE
) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    DISABLED_ACCOUNT_NOTICE_KEY,
    message || DEFAULT_DISABLED_ACCOUNT_MESSAGE
  );
};

export const consumeDisabledAccountNotice = () => {
  if (typeof window === "undefined") return "";

  const message = sessionStorage.getItem(DISABLED_ACCOUNT_NOTICE_KEY) || "";
  if (message) {
    sessionStorage.removeItem(DISABLED_ACCOUNT_NOTICE_KEY);
  }

  return message;
};
