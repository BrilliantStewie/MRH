const NO_SHOW_DISABLE_REASON = "no_show";

const formatDisableUntilLabel = (value) => {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
};

const clearUserDisableState = (user) => {
  if (!user) return;
  user.disabled = false;
  user.disabledUntil = null;
  user.disabledReason = "";
};

const isDisableExpired = (user) => {
  if (!user?.disabled || !user?.disabledUntil) return false;

  const disabledUntil = new Date(user.disabledUntil);
  return !Number.isNaN(disabledUntil.getTime()) && disabledUntil.getTime() <= Date.now();
};

const buildDisabledAccountMessage = (user) => {
  const untilLabel = formatDisableUntilLabel(user?.disabledUntil);

  if (user?.disabledReason === NO_SHOW_DISABLE_REASON && untilLabel) {
    return `Your account is temporarily disabled until ${untilLabel} due to a no-show booking.`;
  }

  if (user?.disabledReason === NO_SHOW_DISABLE_REASON) {
    return "Your account is temporarily disabled due to a no-show booking.";
  }

  if (untilLabel) {
    return `Your account is temporarily disabled until ${untilLabel}. Please contact administration if needed.`;
  }

  return "Your account has been disabled. Please contact administration.";
};

const resolveUserDisableState = async (user) => {
  if (!user?.disabled) {
    return {
      isDisabled: false,
      message: "",
    };
  }

  if (isDisableExpired(user)) {
    clearUserDisableState(user);
    await user.save({ validateBeforeSave: false });

    return {
      isDisabled: false,
      message: "",
    };
  }

  return {
    isDisabled: true,
    message: buildDisabledAccountMessage(user),
  };
};

const applyNoShowDisable = (user, baseDate = new Date()) => {
  const disabledUntil = new Date(baseDate);
  disabledUntil.setMonth(disabledUntil.getMonth() + 3);

  user.disabled = true;
  user.disabledUntil = disabledUntil;
  user.disabledReason = NO_SHOW_DISABLE_REASON;

  return disabledUntil;
};

export {
  NO_SHOW_DISABLE_REASON,
  applyNoShowDisable,
  buildDisabledAccountMessage,
  clearUserDisableState,
  formatDisableUntilLabel,
  resolveUserDisableState,
};
