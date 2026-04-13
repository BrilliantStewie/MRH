import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { AdminContext } from "../../context/AdminContext";
import { auth } from "../../config/firebase";
import {
  X,
  User,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import PhilippinesPhoneField from "../../components/PhilippinesPhoneField";
import VerifyFirebasePhoneOtp from "../../components/VerifyFirebasePhoneOtp";
import VerifyOtp from "../VerifyOtp";

const TEXT_SUFFIXES = ["Jr.", "Sr.", "Jr", "Sr"];
const ROMAN_REGEX =
  /^(X{0,3})(IX|IV|V?I{0,3})$|^XL[IXV]{0,3}$|^L[X]{0,3}[IXV]{0,3}$|^XC[IXV]{0,3}$|^C$/i;
const NAME_INPUT_REGEX = /[^a-zA-Z\u00D1\u00F1.'\s-]/g;
const NAME_CAPITALIZE_REGEX = /(^|[\s\-'.])([a-z\u00f1])/g;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const normalizeEmailInput = (value) => String(value || "").trim().toLowerCase();

const normalizePhoneInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  return digits;
};

const sanitizePHPhoneDraft = (value) => {
  const normalized = normalizePhoneInput(value).slice(0, 11);

  if (!normalized) return "";
  if (normalized.startsWith("9")) return `0${normalized}`.slice(0, 11);
  if (!normalized.startsWith("0")) return "";
  if (normalized.length === 1) return normalized;
  if (!normalized.startsWith("09")) return "0";

  return normalized;
};

const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmailInput(value));
const isValidPHNumber = (value) => /^09\d{9}$/.test(normalizePhoneInput(value));

const AddStaff = ({ onClose, getAllUsers, editData = null }) => {
  const { createStaff, updateStaff, backendUrl, aToken } = useContext(AdminContext);
  const [loading, setLoading] = useState(false);
  const isEdit = !!editData;

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpTarget, setEmailOtpTarget] = useState("");
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [verifiedEmailTarget, setVerifiedEmailTarget] = useState("");

  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [verifiedPhoneTarget, setVerifiedPhoneTarget] = useState("");

  const recaptchaRef = useRef(null);

  const resetEmailVerification = () => {
    setShowEmailOtpModal(false);
    setEmailOtpTarget("");
    setEmailVerificationToken("");
    setVerifiedEmailTarget("");
  };

  const resetPhoneVerification = () => {
    setShowPhoneOtpModal(false);
    setFirebaseConfirmation(null);
    setPhoneVerificationToken("");
    setVerifiedPhoneTarget("");
  };

  useEffect(() => {
    if (editData) {
      setFirstName(editData.firstName || "");
      setLastName(editData.lastName || "");
      setMiddleName(editData.middleName || "");
      setSuffix(editData.suffix || "");
      setFormData({
        email: normalizeEmailInput(editData.email || ""),
        phone: normalizePhoneInput(editData.phone || ""),
        password: "",
        confirmPassword: "",
      });
      setPreviewUrl(editData.image || "");
      setIsImageRemoved(false);
    } else {
      setFirstName("");
      setLastName("");
      setMiddleName("");
      setSuffix("");
      setFormData(EMPTY_FORM);
      setPreviewUrl("");
      setImage(null);
      setIsImageRemoved(false);
    }

    resetEmailVerification();
    resetPhoneVerification();
  }, [editData]);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, []);

  const formatPersonName = (value) =>
    String(value || "")
      .replace(NAME_INPUT_REGEX, "")
      .toLowerCase()
      .replace(NAME_CAPITALIZE_REGEX, (_, separator, character) =>
        `${separator}${character.toUpperCase()}`
      );

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === "suffix") {
      let cleaned = value.replace(/[^a-zA-Z.]/g, "");
      if (cleaned.length > 0) {
        const isRomanInput = /^[IVXLC]+$/i.test(cleaned);
        cleaned = isRomanInput
          ? cleaned.toUpperCase()
          : cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      const isPartialSuffix = TEXT_SUFFIXES.some((item) => item.startsWith(cleaned));
      const isValidRoman = ROMAN_REGEX.test(cleaned);

      if (cleaned === "" || isPartialSuffix || isValidRoman) {
        setSuffix(cleaned);
      }
      return;
    }

    formatted = formatPersonName(value);
    if (name === "firstName") setFirstName(formatted);
    else if (name === "lastName") setLastName(formatted);
    else if (name === "middleName") setMiddleName(formatted);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsImageRemoved(false);
  };

  const handleRemoveImage = (e) => {
    e.preventDefault();
    setImage(null);
    setPreviewUrl("");
    setIsImageRemoved(true);
  };

  const handleEmailChange = (e) => {
    const nextEmail = normalizeEmailInput(e.target.value);
    setFormData((prev) => ({ ...prev, email: nextEmail }));

    if (!isEdit && nextEmail !== verifiedEmailTarget) {
      resetEmailVerification();
    }
  };

  const handlePhoneChange = (e) => {
    const nextPhone = sanitizePHPhoneDraft(e.target.value);
    setFormData((prev) => ({ ...prev, phone: nextPhone }));

    if (!isEdit && nextPhone !== verifiedPhoneTarget) {
      resetPhoneVerification();
    }
  };

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;

    recaptchaRef.current = new RecaptchaVerifier(auth, "staff-add-recaptcha-container", {
      size: "invisible",
    });

    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendStaffEmailOtp = async (targetEmail = normalizeEmailInput(formData.email)) => {
    if (!isValidEmail(targetEmail)) {
      const message = "Please enter a valid email address.";
      toast.error(message);
      return { success: false, message };
    }

    setEmailOtpLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/send-staff-email-otp`,
        { email: targetEmail },
        { headers: { token: aToken } }
      );

      if (!data.success) {
        const message = data.message || "Failed to send OTP.";
        toast.error(message);
        return { success: false, message };
      }

      setEmailOtpTarget(targetEmail);
      setShowEmailOtpModal(true);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to send OTP.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (otpCode) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/verify-staff-email-otp`,
        {
          email: emailOtpTarget,
          otp: otpCode,
        },
        { headers: { token: aToken } }
      );

      if (!data.success) {
        return { success: false, message: data.message || "Failed to verify email." };
      }

      const verifiedEmail = normalizeEmailInput(data.email || emailOtpTarget);
      setVerifiedEmailTarget(verifiedEmail);
      setEmailVerificationToken(String(data.verificationToken || ""));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Failed to verify email.",
      };
    }
  };

  const sendFirebasePhoneOtp = async () => {
    const normalizedPhone = normalizePhoneInput(formData.phone);

    if (!isValidPHNumber(normalizedPhone)) {
      const message = "Use an 11-digit PH number starting with 09.";
      toast.error(message);
      return { success: false, message };
    }

    setPhoneOtpLoading(true);

    try {
      const verifier = await ensureRecaptcha();
      const e164 = `+63${normalizedPhone.slice(1)}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setFirebaseConfirmation(confirmation);
      setShowPhoneOtpModal(true);
      return { success: true };
    } catch (error) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

      const message = error?.response?.data?.message || error?.message || "Failed to send OTP.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyFirebasePhone = async (otpCode) => {
    const normalizedPhone = normalizePhoneInput(formData.phone);

    if (!firebaseConfirmation) {
      return { success: false, message: "Please request a new OTP." };
    }

    try {
      const result = await firebaseConfirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      const verifiedPhone = normalizePhoneInput(result.user?.phoneNumber || normalizedPhone);

      if (verifiedPhone !== normalizedPhone) {
        return {
          success: false,
          message: "Verified phone number does not match the current phone field.",
        };
      }

      const { data } = await axios.post(
        `${backendUrl}/api/admin/verify-staff-phone-firebase`,
        { idToken },
        { headers: { token: aToken } }
      );

      await signOut(auth);

      if (!data.success) {
        return { success: false, message: data.message || "Failed to verify phone." };
      }

      const confirmedPhone = normalizePhoneInput(data.phone || verifiedPhone);
      setVerifiedPhoneTarget(confirmedPhone);
      setPhoneVerificationToken(String(data.verificationToken || ""));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Failed to verify phone.",
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = normalizeEmailInput(formData.email);
    const normalizedPhone = normalizePhoneInput(formData.phone);
    const emailVerifiedForCreate =
      isEdit ||
      (Boolean(normalizedEmail) &&
        verifiedEmailTarget === normalizedEmail &&
        Boolean(emailVerificationToken));
    const phoneVerifiedForCreate =
      isEdit ||
      (Boolean(normalizedPhone) &&
        verifiedPhoneTarget === normalizedPhone &&
        Boolean(phoneVerificationToken));

    if (!firstName || !lastName || !normalizedEmail || !normalizedPhone) {
      return toast.error("Please fill all required fields");
    }

    if (!isValidEmail(normalizedEmail)) {
      return toast.error("Please enter a valid email address");
    }

    if (!isValidPHNumber(normalizedPhone)) {
      return toast.error("Please enter a valid PH number (09XXXXXXXXX)");
    }

    if (!isEdit && !emailVerifiedForCreate) {
      return toast.error("Please verify the email address first");
    }

    if (!isEdit && !phoneVerifiedForCreate) {
      return toast.error("Please verify the phone number first");
    }

    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (!isEdit && !formData.password) {
      return toast.error("Password is required for new accounts");
    }

    setLoading(true);

    const data = new FormData();
    data.append("firstName", firstName);
    data.append("lastName", lastName);
    data.append("middleName", middleName || "");
    data.append("suffix", suffix || "");
    data.append("position", "Staff");
    data.append("phone", normalizedPhone);
    data.append("email", normalizedEmail);

    if (!isEdit) {
      data.append("emailVerificationToken", emailVerificationToken);
      data.append("phoneVerificationToken", phoneVerificationToken);
    }

    if (image) data.append("image", image);
    else if (isImageRemoved) data.append("removeImage", "true");

    if (formData.password) data.append("password", formData.password);

    try {
      const success = isEdit
        ? await updateStaff(editData._id, data)
        : await createStaff(data);

      if (success) {
        await getAllUsers();
        onClose();
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const normalizedEmail = normalizeEmailInput(formData.email);
  const normalizedPhone = normalizePhoneInput(formData.phone);
  const emailVerifiedForCreate =
    isEdit ||
    (Boolean(normalizedEmail) &&
      verifiedEmailTarget === normalizedEmail &&
      Boolean(emailVerificationToken));
  const phoneVerifiedForCreate =
    isEdit ||
    (Boolean(normalizedPhone) &&
      verifiedPhoneTarget === normalizedPhone &&
      Boolean(phoneVerificationToken));
  const emailOtpSentForCurrent =
    !isEdit && Boolean(normalizedEmail) && emailOtpTarget === normalizedEmail && !emailVerifiedForCreate;
  const phoneOtpVerifiedForCurrent =
    !isEdit && Boolean(normalizedPhone) && verifiedPhoneTarget === normalizedPhone && phoneVerifiedForCreate;
  const emailOtpButtonLabel = emailVerifiedForCreate
    ? "Verified"
    : emailOtpLoading
      ? "Sending..."
      : emailOtpSentForCurrent
        ? "Resend OTP"
        : "Send OTP";
  const phoneOtpButtonLabel = phoneVerifiedForCreate
    ? "Verified"
    : phoneOtpLoading
      ? "Sending..."
      : "Send OTP";
  const emailStatusText = emailVerifiedForCreate
    ? "Email verified"
    : emailOtpSentForCurrent
      ? "OTP sent to this email."
      : "Verify this email before creating the staff account.";
  const phoneStatusText = phoneVerifiedForCreate
    ? "Phone verified"
    : phoneOtpVerifiedForCurrent
      ? "Phone verified"
      : "Verify this phone number before creating the staff account.";
  const showEmailOtpAction = !isEdit && (emailVerifiedForCreate || isValidEmail(normalizedEmail));
  const showPhoneOtpAction = !isEdit && (phoneVerifiedForCreate || isValidPHNumber(normalizedPhone));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity">
      <div id="staff-add-recaptcha-container" className="hidden" />

      {!isEdit && showEmailOtpModal && (
        <VerifyOtp
          email={emailOtpTarget}
          onClose={() => setShowEmailOtpModal(false)}
          onResend={() => sendStaffEmailOtp(emailOtpTarget || normalizedEmail)}
          onVerify={handleVerifyEmailOtp}
        />
      )}

      {!isEdit && showPhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={normalizedPhone}
          onClose={() => setShowPhoneOtpModal(false)}
          onVerify={handleVerifyFirebasePhone}
          onResend={sendFirebasePhoneOtp}
        />
      )}

      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-up md:flex-row">
        <div className="relative flex w-full shrink-0 flex-col items-center justify-center bg-slate-900 p-6 text-center text-white md:w-[320px] md:p-8">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-full bg-white/10 p-2 md:hidden"
          >
            <X size={20} />
          </button>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {isEdit ? "Edit Profile" : "New Account"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Staff Access Control</p>
          </div>
          <div className="group relative mb-6">
            <label className="relative block h-32 w-32 cursor-pointer overflow-hidden rounded-full border-4 border-slate-700 bg-slate-800 shadow-2xl transition-colors hover:border-slate-500 sm:h-40 sm:w-40">
              {previewUrl ? (
                <img src={previewUrl} className="h-full w-full object-cover" alt="Profile" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-slate-600 transition-colors group-hover:text-slate-400">
                  <User size={48} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100">
                    Upload
                  </span>
                </div>
              )}
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </label>
            {previewUrl && (
              <button
                onClick={handleRemoveImage}
                className="absolute right-0 top-0 z-10 -translate-y-1 translate-x-1 rounded-full border-2 border-slate-900 bg-red-500 p-2.5 text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col bg-white">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 hidden text-slate-300 transition-colors hover:text-slate-600 md:block"
          >
            <X size={24} />
          </button>
          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide sm:p-6 md:p-10">
            <form id="split-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="border-b pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="firstName"
                      value={firstName}
                      onChange={handleNameChange}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="lastName"
                      value={lastName}
                      onChange={handleNameChange}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Middle Name (Optional)
                    </label>
                    <input
                      name="middleName"
                      value={middleName}
                      onChange={handleNameChange}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                      placeholder="Middle Name"
                    />
                  </div>
                  <div className="relative space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600">Suffix</label>
                    <input
                      name="suffix"
                      maxLength={8}
                      value={suffix}
                      onChange={handleNameChange}
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all ${
                        suffix && (TEXT_SUFFIXES.includes(suffix) || ROMAN_REGEX.test(suffix))
                          ? "border-emerald-500 bg-emerald-50/10 focus:ring-1 focus:ring-emerald-500"
                          : "border-slate-200 bg-slate-50 focus:border-indigo-500"
                      }`}
                    />
                    {suffix && (TEXT_SUFFIXES.includes(suffix) || ROMAN_REGEX.test(suffix)) && (
                      <CheckCircle2 size={12} className="absolute right-2 top-9 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="border-b pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Contact Info
                </h3>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all ${
                      emailVerifiedForCreate
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                    }`}
                  >
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="name@example.com"
                    />
                    {showEmailOtpAction && (
                      <button
                        type="button"
                        onClick={() => sendStaffEmailOtp(normalizedEmail)}
                        disabled={
                          !normalizedEmail ||
                          !isValidEmail(normalizedEmail) ||
                          emailOtpLoading ||
                          emailVerifiedForCreate
                        }
                        className={`shrink-0 rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.04em] transition-all ${
                          emailVerifiedForCreate
                            ? "cursor-not-allowed border-emerald-200 bg-white text-emerald-700"
                            : "border-indigo-100 bg-white text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                        }`}
                      >
                        {emailOtpButtonLabel}
                      </button>
                    )}
                  </div>
                  {!isEdit && (
                    <p
                      className={`mt-2 text-[11px] font-medium ${
                        emailVerifiedForCreate ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {emailStatusText}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <PhilippinesPhoneField
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    containerClassName={`rounded-2xl border px-3 py-2.5 transition-all ${
                      phoneVerifiedForCreate
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                    }`}
                    prefixClassName="border-slate-200 bg-slate-50 shadow-none"
                    inputClassName="min-w-0 flex-1 px-1 text-sm text-slate-900 placeholder:text-slate-400"
                    action={
                      showPhoneOtpAction ? (
                        <button
                          type="button"
                          onClick={sendFirebasePhoneOtp}
                          disabled={
                            !normalizedPhone ||
                            !isValidPHNumber(normalizedPhone) ||
                            phoneOtpLoading ||
                            phoneVerifiedForCreate
                          }
                          className={`shrink-0 rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.04em] transition-all ${
                            phoneVerifiedForCreate
                              ? "cursor-not-allowed border-emerald-200 bg-white text-emerald-700"
                              : "border-indigo-100 bg-white text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                          }`}
                        >
                          {phoneOtpButtonLabel}
                        </button>
                      ) : null
                    }
                  />
                  {!isEdit && (
                    <p
                      className={`mt-2 text-[11px] font-medium ${
                        phoneVerifiedForCreate ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {phoneStatusText}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Security
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Create Password {!isEdit && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:border-indigo-500"
                        placeholder="Enter Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      <span>
                        Re-enter Password {!isEdit && <span className="text-red-500">*</span>}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className={`w-full rounded-lg border bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none transition-all ${
                          !formData.confirmPassword
                            ? "border-slate-200"
                            : formData.password === formData.confirmPassword
                              ? "border-emerald-500 bg-emerald-50/30"
                              : "border-rose-500 bg-rose-50/30"
                        }`}
                        placeholder="Confirm Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="flex items-center gap-1 pt-1 text-[10px] font-bold text-rose-500">
                        <AlertCircle size={10} /> Passwords do not match
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 p-5 sm:flex-row sm:justify-end sm:p-6">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="split-form"
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${
                isEdit ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {loading ? "Processing..." : isEdit ? "Update Staff" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStaff;
