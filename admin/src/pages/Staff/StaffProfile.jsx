import React, { useContext, useEffect, useRef, useState } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import { toast } from "react-toastify";
import VerifyFirebasePhoneOtp from "../../components/VerifyFirebasePhoneOtp";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  UserCircle,
  Shield,
  Settings,
  CheckCircle,
  Info,
  Loader2,
} from "lucide-react";

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  phone: "",
  email: "",
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const StaffProfile = () => {
  const { staffData, setStaffData, sToken, backendUrl, loadStaffData } = useContext(StaffContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [showPass, setShowPass] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [localEditData, setLocalEditData] = useState(EMPTY_FORM);
  const [phoneError, setPhoneError] = useState("");
  const [phoneConflictError, setPhoneConflictError] = useState("");
  const [isCheckingPhoneAvailability, setIsCheckingPhoneAvailability] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [suffixError, setSuffixError] = useState("");
  const recaptchaRef = useRef(null);
  const phoneCheckRequestRef = useRef(0);

  const normalizePhoneInput = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits === "0000000000") return "";
    if (digits.startsWith("63") && digits.length === 12) {
      return `0${digits.slice(2)}`;
    }
    return digits;
  };

  const isValidPHNumber = (value) => /^09\d{9}$/.test(value);
  const normalizeEmailInput = (value) => String(value || "").trim().toLowerCase();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailInput(value));

  const romanToInt = (value) => {
    if (!value) return 0;
    const map = { i: 1, v: 5, x: 10, l: 50, c: 100 };
    const str = value.toLowerCase();
    let result = 0;

    for (let i = 0; i < str.length; i += 1) {
      const curr = map[str[i]];
      const next = map[str[i + 1]];
      result += next && curr < next ? -curr : curr;
    }

    return result;
  };

  const isSuffixInputAllowed = (val) => {
    if (!val) return true;
    if (!/^[a-zA-Z.]+$/.test(val)) return false;
    if ((val.match(/\./g) || []).length > 1) return false;

    const clean = val.trim().toLowerCase().replace(/\./g, "");
    const wordOptions = ["jr", "sr", "junior", "senior"];
    if (wordOptions.some((opt) => opt.startsWith(clean))) return true;

    if (/^[ivxlc]+$/.test(clean)) {
      const validRomanStructure = /^c$|^(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
      if (validRomanStructure.test(clean)) {
        const value = romanToInt(clean);
        return value > 0 && value <= 100;
      }
    }

    return false;
  };

  const formatSuffixValue = (val) => {
    if (!val) return "";
    const clean = val.trim().toLowerCase().replace(/\./g, "");
    return /^[ivxlc]+$/.test(clean)
      ? val.toUpperCase()
      : val.charAt(0).toUpperCase() + val.slice(1);
  };

  const parseFullName = (fullName) => {
    const raw = String(fullName || "").trim();
    if (!raw) return { first: "", mid: "", last: "", suffix: "" };

    if (raw.includes("|")) {
      const [first = "", mid = "", last = "", suffix = ""] = raw.split("|");
      return {
        first: first.trim(),
        mid: mid.trim(),
        last: last.trim(),
        suffix: suffix.trim(),
      };
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { first: parts[0], mid: "", last: "", suffix: "" };

    return {
      first: parts[0] || "",
      mid: parts.slice(1, -1).join(" "),
      last: parts[parts.length - 1] || "",
      suffix: "",
    };
  };

  const extractSuffixFromLastName = (lastName) => {
    const raw = String(lastName || "").trim();
    if (!raw) return { lastName: "", suffix: "" };

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { lastName: raw, suffix: "" };

    const possibleSuffix = parts[parts.length - 1];
    if (!isSuffixInputAllowed(possibleSuffix)) {
      return { lastName: raw, suffix: "" };
    }

    return {
      lastName: parts.slice(0, -1).join(" "),
      suffix: formatSuffixValue(possibleSuffix),
    };
  };

  const mapStaffProfileToForm = (profile) => {
    const fallbackName = parseFullName(profile?.name || "");
    let firstName = profile?.firstName || fallbackName.first || "";
    let middleName = profile?.middleName || fallbackName.mid || "";
    let lastName = profile?.lastName || fallbackName.last || "";
    let suffix = profile?.suffix || fallbackName.suffix || "";

    if (!suffix && lastName) {
      const extracted = extractSuffixFromLastName(lastName);
      lastName = extracted.lastName || lastName;
      suffix = extracted.suffix || suffix;
    }

    return {
      firstName,
      middleName,
      lastName,
      suffix,
      phone: normalizePhoneInput(profile?.phone || ""),
      email: normalizeEmailInput(profile?.email || ""),
    };
  };

  useEffect(() => {
    if (!staffData) return;

    const mappedProfile = mapStaffProfileToForm(staffData);
    setLocalEditData({ ...EMPTY_FORM, ...mappedProfile });
    setOriginalPhone(mappedProfile.phone);
    setPhoneError("");
    setPhoneConflictError("");
    setIsCheckingPhoneAvailability(false);
    setSuffixError("");
    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
    setPhoneVerificationToken("");
    setShowPhoneOtpModal(false);
    setFirebaseConfirmation(null);
    setRemoveImage(false);
    setImage(null);
    setImagePreview("");
  }, [staffData]);

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleRemoveImage = () => {
    setImage(null);
    setRemoveImage(true);
  };

  const handlePhoneChange = (event) => {
    const normalized = normalizePhoneInput(event.target.value).slice(0, 11);
    if (!/^[0-9]*$/.test(normalized)) return;

    setLocalEditData((prev) => ({ ...prev, phone: normalized }));
    setPhoneConflictError("");
    setIsCheckingPhoneAvailability(false);
    setPhoneVerificationToken("");

    if (normalized && !isValidPHNumber(normalized)) {
      setPhoneError("Use an 11-digit PH number starting with 09.");
    } else {
      setPhoneError("");
    }

    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
  };

  const trimmedFirstName = localEditData.firstName.trim();
  const trimmedMiddleName = localEditData.middleName.trim();
  const trimmedLastName = localEditData.lastName.trim();
  const trimmedSuffix = localEditData.suffix.trim();
  const normalizedLocalPhone = normalizePhoneInput(localEditData.phone);
  const normalizedOriginalPhone = normalizePhoneInput(originalPhone);
  const normalizedEmail = normalizeEmailInput(localEditData.email);
  const hasMissingRequiredName = !trimmedFirstName || !trimmedLastName;
  const hasMissingRequiredPhone = !normalizedLocalPhone;
  const phoneChanged = normalizedLocalPhone !== normalizedOriginalPhone;
  const activePhoneError = phoneError || phoneConflictError;
  const phoneIsVerified =
    phoneOtpVerified ||
    (!phoneChanged &&
      normalizedLocalPhone === normalizePhoneInput(staffData?.phone || "") &&
      Boolean(staffData?.phoneVerified));

  useEffect(() => {
    phoneCheckRequestRef.current += 1;
    const requestId = phoneCheckRequestRef.current;

    if (
      !isEdit ||
      !phoneChanged ||
      !normalizedLocalPhone ||
      !isValidPHNumber(normalizedLocalPhone) ||
      Boolean(phoneError)
    ) {
      setPhoneConflictError("");
      setIsCheckingPhoneAvailability(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPhoneAvailability(true);
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/staff/check-phone`,
          { phone: normalizedLocalPhone },
          { headers: { token: sToken } }
        );

        if (phoneCheckRequestRef.current !== requestId) return;
        setPhoneConflictError(data.success && data.exists ? "Phone number is already taken." : "");
      } catch (error) {
        if (phoneCheckRequestRef.current !== requestId) return;
        setPhoneConflictError("");
      } finally {
        if (phoneCheckRequestRef.current === requestId) {
          setIsCheckingPhoneAvailability(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [backendUrl, isEdit, normalizedLocalPhone, phoneChanged, phoneError, sToken]);

  const handleDiscard = () => {
    if (!staffData) return;

    const mappedProfile = mapStaffProfileToForm(staffData);
    setLocalEditData({ ...EMPTY_FORM, ...mappedProfile });
    setOriginalPhone(mappedProfile.phone);
    setPhoneError("");
    setPhoneConflictError("");
    setIsCheckingPhoneAvailability(false);
    setSuffixError("");
    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
    setPhoneVerificationToken("");
    setShowPhoneOtpModal(false);
    setFirebaseConfirmation(null);
    setImage(null);
    setImagePreview("");
    setRemoveImage(false);
    setIsEdit(false);
  };

  const updateStaffProfileData = async () => {
    if (hasMissingRequiredName) {
      toast.error("First name and last name are required.");
      return;
    }

    if (!normalizedLocalPhone) {
      toast.error("Phone number is required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!isValidPHNumber(normalizedLocalPhone)) {
      toast.error("Please enter a valid PH number (09XXXXXXXXX).");
      return;
    }

    if (suffixError) {
      toast.error("Please fix the suffix format.");
      return;
    }
    if (activePhoneError) {
      toast.error(activePhoneError);
      return;
    }

    if (localEditData.newPassword && !localEditData.oldPassword) {
      toast.error("Current password is required.");
      return;
    }

    if (localEditData.newPassword && localEditData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (localEditData.newPassword && localEditData.newPassword !== localEditData.confirmPassword) {
      toast.error("Verification failed: Passwords mismatch");
      return;
    }

    if (phoneChanged && !phoneOtpVerified) {
      toast.error("Please verify your phone number first.");
      return;
    }

    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append("firstName", trimmedFirstName);
      formData.append("middleName", trimmedMiddleName);
      formData.append("lastName", trimmedLastName);
      formData.append("suffix", trimmedSuffix);
      formData.append(
        "name",
        [trimmedFirstName, trimmedMiddleName, trimmedLastName, trimmedSuffix].join("|")
      );
      formData.append("email", normalizedEmail);
      formData.append("phone", normalizedLocalPhone);
      if (phoneChanged && phoneVerificationToken) {
        formData.append("phoneIdToken", phoneVerificationToken);
      }

      if (removeImage) {
        formData.append("removeImage", "true");
      }

      if (localEditData.newPassword) {
        formData.append("oldPassword", localEditData.oldPassword);
        formData.append("newPassword", localEditData.newPassword);
      }

      if (image) {
        formData.append("image", image);
      }

      const { data } = await axios.post(`${backendUrl}/api/staff/update-profile`, formData, {
        headers: { token: sToken },
      });

      if (!data.success) {
        toast.error(data.message || "Update failed");
        return;
      }

      toast.success("Profile updated successfully!");
      setIsEdit(false);
      setImage(null);
      setImagePreview("");
      setRemoveImage(false);
      setOriginalPhone(normalizedLocalPhone);
      setPhoneVerificationToken("");
      setLocalEditData((prev) => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      if (data.userData) {
        setStaffData(data.userData);
      } else if (loadStaffData) {
        await loadStaffData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;

    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });

    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendFirebasePhoneOtp = async () => {
    if (!isValidPHNumber(normalizedLocalPhone)) {
      setPhoneError("Use an 11-digit PH number starting with 09.");
      return { success: false, message: "Invalid phone number" };
    }
    if (phoneConflictError) {
      return { success: false, message: phoneConflictError };
    }

    setPhoneError("");
    setPhoneOtpLoading(true);

    try {
      const verifier = await ensureRecaptcha();
      const e164 = `+63${normalizedLocalPhone.slice(1)}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setFirebaseConfirmation(confirmation);
      setPhoneOtpSent(true);
      setShowPhoneOtpModal(true);
      return { success: true };
    } catch (error) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

      const message = error?.message || "Failed to send OTP.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyFirebasePhone = async (otpCode) => {
    if (!firebaseConfirmation) {
      return { success: false, message: "Please request a new OTP." };
    }

    try {
      const result = await firebaseConfirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      const verifiedPhone = normalizePhoneInput(result.user?.phoneNumber || normalizedLocalPhone);

      if (verifiedPhone !== normalizedLocalPhone) {
        return { success: false, message: "Verified phone number does not match the current phone field." };
      }

      setPhoneVerificationToken(idToken);
      setPhoneOtpVerified(true);
      setPhoneOtpSent(true);
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to verify phone.",
      };
    }
  };

  if (!staffData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const displayImage = imagePreview || (removeImage ? null : staffData.image);
  const isSuffixFilled = localEditData.suffix?.length > 0 && !suffixError;
  const formattedFullName =
    [trimmedFirstName, trimmedMiddleName, trimmedLastName, trimmedSuffix].filter(Boolean).join(" ") ||
    "Staff Member";
  const roleLabel = String(staffData.role || "staff").trim();
  const formattedRoleLabel = roleLabel
    ? roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)
    : "Staff";

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">
      <div id="recaptcha-container" className="hidden"></div>
      {showPhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={normalizedLocalPhone}
          onClose={() => setShowPhoneOtpModal(false)}
          onVerify={handleVerifyFirebasePhone}
          onResend={sendFirebasePhoneOtp}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="relative h-32 bg-[#0F172A]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-[#1e1b4b] opacity-90"></div>
          </div>

          <div className="-mt-14 flex flex-col gap-6 px-8 pb-8 md:flex-row md:items-end">
            <div className="group relative shrink-0">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-slate-100 shadow-lg transition-transform duration-300 group-hover:scale-105">
                {displayImage ? (
                  <img src={displayImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" strokeWidth={1.5} />
                )}
              </div>

              {isEdit && (
                <>
                  <label className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="text-white" size={24} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(event) => {
                        if (event.target.files && event.target.files[0]) {
                          setImage(event.target.files[0]);
                          setRemoveImage(false);
                        }
                      }}
                    />
                  </label>

                  {displayImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -right-2 -top-2 z-20 rounded-full bg-red-500 p-1.5 text-white shadow-md transition-colors hover:bg-red-600"
                      title="Remove photo"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="mb-2 min-w-0 flex-grow -translate-y-6 md:-translate-y-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 max-w-full break-words text-2xl font-bold leading-tight tracking-tight text-slate-900">
                  {formattedFullName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
                  {formattedRoleLabel}
                </span>
              </div>
            </div>

            <div className="mb-2">
              {!isEdit ? (
                <button
                  onClick={() => setIsEdit(true)}
                  className="flex items-center gap-2 rounded-xl bg-[#0F172A] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black active:scale-95"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleDiscard}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-800"
                    disabled={isUpdating}
                  >
                    Discard
                  </button>
                  <button
                    onClick={updateStaffProfileData}
                    disabled={isUpdating || hasMissingRequiredName || hasMissingRequiredPhone || Boolean(suffixError)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex h-full flex-col rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm lg:col-span-2">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <UserCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Account Details</h2>
                <p className="text-xs font-medium text-slate-400">
                  Manage your personal identifying information.
                </p>
              </div>
            </div>

            <div className="grid flex-grow grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-4">
              {!isEdit ? (
                <div className="md:col-span-4">
                  <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <User size={14} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">{formattedFullName}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 md:col-span-4 md:p-6">
                  <div className="space-y-4 md:space-y-5">
                    <div>
                      <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        First Name
                      </label>
                      <div
                        className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all ${
                          trimmedFirstName
                            ? "border-slate-200 focus-within:border-blue-500"
                            : "border-red-300 focus-within:border-red-400"
                        }`}
                      >
                        <input
                          value={localEditData.firstName}
                          onChange={(event) =>
                            setLocalEditData((prev) => ({ ...prev, firstName: event.target.value }))
                          }
                          className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                          placeholder="First Name"
                        />
                      </div>
                      {!trimmedFirstName && (
                        <p className="mt-2 text-[10px] font-bold text-red-500">First name is required.</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Middle Name (Optional)
                      </label>
                      <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-500">
                        <input
                          value={localEditData.middleName}
                          onChange={(event) =>
                            setLocalEditData((prev) => ({ ...prev, middleName: event.target.value }))
                          }
                          className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                          placeholder="Middle Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.9fr)]">
                      <div>
                        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Last Name
                        </label>
                        <div
                          className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all ${
                            trimmedLastName
                              ? "border-slate-200 focus-within:border-blue-500"
                              : "border-red-300 focus-within:border-red-400"
                          }`}
                        >
                          <input
                            value={localEditData.lastName}
                            onChange={(event) =>
                              setLocalEditData((prev) => ({ ...prev, lastName: event.target.value }))
                            }
                            className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                            placeholder="Last Name"
                          />
                        </div>
                        {!trimmedLastName && (
                          <p className="mt-2 text-[10px] font-bold text-red-500">Last name is required.</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Suffix
                        </label>
                        <div
                          className={`group flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm transition-all ${
                            isSuffixFilled
                              ? "border border-green-300 bg-green-50"
                              : "border border-slate-200 bg-white focus-within:border-blue-500"
                          }`}
                        >
                          <input
                            value={localEditData.suffix}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (!isSuffixInputAllowed(nextValue)) {
                                setSuffixError("Use Jr./Sr. or Roman numerals (I-C).");
                                return;
                              }
                              setSuffixError("");
                              setLocalEditData((prev) => ({
                                ...prev,
                                suffix: formatSuffixValue(nextValue),
                              }));
                            }}
                            className="w-full bg-transparent text-center text-sm font-bold text-slate-800 outline-none"
                          />
                          {isSuffixFilled && <CheckCircle size={16} className="shrink-0 text-green-500" />}
                        </div>
                        {suffixError && (
                          <p className="mt-2 text-[10px] font-bold text-red-500">{suffixError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <div
                  className={`group flex items-center gap-3 rounded-xl border px-5 py-3.5 transition-all ${
                    isEdit ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <Mail size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.email}
                    onChange={(event) =>
                      setLocalEditData((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Phone Number
                </label>
                <div
                  className={`group relative flex items-center gap-3 rounded-xl border px-5 py-3.5 transition-all ${
                    isEdit ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <Phone size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-transparent pr-24 text-sm font-bold tracking-wide text-slate-800 outline-none placeholder:text-slate-300 disabled:opacity-60"
                    maxLength={11}
                  />
                  {isEdit && phoneChanged && isValidPHNumber(normalizedLocalPhone) && !activePhoneError && !isCheckingPhoneAvailability && (
                    <button
                      type="button"
                      onClick={sendFirebasePhoneOtp}
                      disabled={phoneOtpLoading}
                      className="absolute bottom-2 right-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {phoneOtpLoading ? "Sending..." : phoneOtpSent ? "OTP Sent" : "Send OTP"}
                    </button>
                  )}
                </div>
                {isEdit && hasMissingRequiredPhone && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">Phone number is required.</p>
                )}
                {isEdit && activePhoneError && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">{activePhoneError}</p>
                )}
                {isEdit && isCheckingPhoneAvailability && phoneChanged && !phoneError && (
                  <p className="mt-2 text-[10px] text-slate-400">Checking phone availability...</p>
                )}
                {isEdit && !activePhoneError && !isCheckingPhoneAvailability && phoneIsVerified && (
                  <p className="mt-2 text-[10px] font-bold text-emerald-600">Phone verified.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                  <Settings size={22} />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Security</h2>
              </div>

              {!isEdit ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                  <div className="mx-auto mb-3 inline-flex rounded-full bg-green-50 p-3 text-green-600 shadow-sm">
                    <CheckCircle size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Connection Secure</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    End-to-End Encrypted
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">Update Password</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      Use your current password to set a new one.
                    </p>
                  </div>

                  {[
                    { key: "oldPassword", placeholder: "Current Password" },
                    { key: "newPassword", placeholder: "New Password" },
                    { key: "confirmPassword", placeholder: "Confirm New Password" },
                  ].map(({ key, placeholder }) => (
                    <div className="group relative" key={key}>
                      <input
                        type={showPass[key] ? "text" : "password"}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[10px] font-black tracking-widest outline-none shadow-sm transition-all focus:border-blue-500"
                        value={localEditData[key]}
                        onChange={(event) =>
                          setLocalEditData((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPass((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                      >
                        {showPass[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-slate-50 pt-6">
              <div className="flex items-start gap-2 italic text-slate-400">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Changes to your personal details may take a short time to reflect across staff tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
