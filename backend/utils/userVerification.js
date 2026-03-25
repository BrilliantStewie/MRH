export const isPendingVerificationUser = (user) =>
  String(user?.firstName || "").trim() === "Pending";

export const hasVerifiedEmail = (user) => {
  if (!user) return false;
  if (typeof user.emailVerified === "boolean") {
    return user.emailVerified;
  }

  return user.authProvider === "google" || ["admin", "staff"].includes(user.role);
};

export const hasVerifiedPhone = (user) =>
  Boolean(user && user.phoneVerified === true && String(user.phone || "").trim());

export const hasClaimedEmail = (user) =>
  hasVerifiedEmail(user) && !isPendingVerificationUser(user);

export const hasClaimedPhone = (user) =>
  hasVerifiedPhone(user) && !isPendingVerificationUser(user);
