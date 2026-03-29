import React, { useContext, useState, useEffect, useRef } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import VerifyFirebasePhoneOtp from "./VerifyFirebasePhoneOtp";
import VerifyOtp from "./VerifyOtp";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  User, Mail, Phone, Camera, Save, Edit3, Trash2, 
  Eye, EyeOff, UserCircle, Settings, CheckCircle, BadgeCheck, Info, Loader2, Calendar
} from "lucide-react";

const NAME_INPUT_REGEX = /[^a-zA-Z\u00D1\u00F1.'\s-]/g;
const NAME_CAPITALIZE_REGEX = /(^|[\s\-'.])([a-z\u00f1])/g;

const MyProfile = () => {
  const { userData, setUserData, token, backendUrl, loadUserProfileData } = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [image, setImage] = useState(null); 
  const [removeImage, setRemoveImage] = useState(false); 

  const [showPass, setShowPass] = useState({ old: false, new: false, confirmPassword: false });
  const [localEditData, setLocalEditData] = useState({
    firstName: "", middleName: "", lastName: "", suffix: "", phone: "", email: "", 
    oldPassword: "", newPassword: "", confirmPassword: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [phoneConflictError, setPhoneConflictError] = useState("");
  const [isCheckingPhoneAvailability, setIsCheckingPhoneAvailability] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [verifiedEmailForSave, setVerifiedEmailForSave] = useState("");
  const [emailOtpTarget, setEmailOtpTarget] = useState("");
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailConflictError, setEmailConflictError] = useState("");
  const [isCheckingEmailAvailability, setIsCheckingEmailAvailability] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [suffixError, setSuffixError] = useState("");
  const recaptchaRef = useRef(null);
  const phoneCheckRequestRef = useRef(0);
  const emailCheckRequestRef = useRef(0);

  // Sync Global Context Data to Local State
  useEffect(() => {
    if (userData) {
      const normalizedPhone = normalizePhoneInput(userData.phone || "");
      const normalizedEmail = normalizeEmailInput(userData.email || "");
      setOriginalPhone(normalizedPhone);
      setOriginalEmail(normalizedEmail);
      setVerifiedEmailForSave(normalizedEmail);
      setLocalEditData({
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        suffix: userData.suffix || "",
        phone: normalizedPhone,
        email: normalizedEmail,
        oldPassword: "", newPassword: "", confirmPassword: "",
      });
      setRemoveImage(false);
      setImage(null);
      setPhoneError("");
      setPhoneConflictError("");
      setIsCheckingPhoneAvailability(false);
      setSuffixError("");
      setPhoneOtpSent(false);
      setPhoneOtpVerified(false);
      setPhoneVerificationToken("");
      setEmailOtpTarget("");
      setShowEmailOtpModal(false);
      setEmailConflictError("");
      setIsCheckingEmailAvailability(false);
    }
  }, [userData]);

  const normalizePhoneInput = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits === "0000000000") {
      return "";
    }
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
      if (next && curr < next) {
        result -= curr;
      } else {
        result += curr;
      }
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
    const isRoman = /^[ivxlc]+$/.test(clean);
    if (isRoman) return val.toUpperCase();
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  const formatPersonName = (value) =>
    String(value || "")
      .replace(NAME_INPUT_REGEX, "")
      .toLowerCase()
      .replace(NAME_CAPITALIZE_REGEX, (_, separator, character) =>
        `${separator}${character.toUpperCase()}`
      );

  const handleRemoveImage = () => {
    setImage(null);          
    setRemoveImage(true);    
  };

  const trimmedFirstName = localEditData.firstName.trim();
  const trimmedLastName = localEditData.lastName.trim();
  const hasMissingRequiredName = !trimmedFirstName || !trimmedLastName;
  const normalizedLocalPhone = normalizePhoneInput(localEditData.phone);
  const isGoogleAuthUser = userData?.authProvider === "google";
  const phoneIsRequired = !isGoogleAuthUser;
  const hasMissingRequiredPhone = phoneIsRequired && !normalizedLocalPhone;
  const normalizedOriginalPhone = normalizePhoneInput(originalPhone);
  const phoneChanged = normalizedLocalPhone !== normalizedOriginalPhone;
  const normalizedEmail = normalizeEmailInput(localEditData.email);
  const normalizedOriginalEmail = normalizeEmailInput(originalEmail);
  const emailChanged = normalizedEmail !== normalizedOriginalEmail;
  const emailOtpVerified = !emailChanged || verifiedEmailForSave === normalizedEmail;
  const emailOtpSentForCurrent =
    emailChanged && emailOtpTarget === normalizedEmail && !emailOtpVerified;
  const isGooglePasswordSetup = isGoogleAuthUser && userData?.passwordSet !== true;
  const activeEmailError = emailConflictError;
  const activePhoneError = phoneError || phoneConflictError;
  const passwordFields = isGooglePasswordSetup
    ? [
        { key: "newPassword", placeholder: "Set Password" },
        { key: "confirmPassword", placeholder: "Confirm Password" }
      ]
    : [
        { key: "oldPassword", placeholder: "Current Password" },
        { key: "newPassword", placeholder: "New Password" },
        { key: "confirmPassword", placeholder: "Confirm New Password" }
      ];

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
          `${backendUrl}/api/user/check-phone-update`,
          { phone: normalizedLocalPhone },
          { headers: { token } }
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
  }, [backendUrl, isEdit, normalizedLocalPhone, phoneChanged, phoneError, token]);

  useEffect(() => {
    emailCheckRequestRef.current += 1;
    const requestId = emailCheckRequestRef.current;

    if (!isEdit || !emailChanged || !normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmailConflictError("");
      setIsCheckingEmailAvailability(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmailAvailability(true);
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/user/check-email-update`,
          { email: normalizedEmail },
          { headers: { token } }
        );

        if (emailCheckRequestRef.current !== requestId) return;
        setEmailConflictError(data.success && data.exists ? "Email address is already taken." : "");
      } catch (error) {
        if (emailCheckRequestRef.current !== requestId) return;
        setEmailConflictError("");
      } finally {
        if (emailCheckRequestRef.current === requestId) {
          setIsCheckingEmailAvailability(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [backendUrl, emailChanged, isEdit, normalizedEmail, token]);

  const handleDiscard = () => {
    if (!userData) return;

    const normalizedPhone = normalizePhoneInput(userData.phone || "");
    const normalizedEmail = normalizeEmailInput(originalEmail || userData.email || "");
    setLocalEditData({
      firstName: userData.firstName || "",
      middleName: userData.middleName || "",
      lastName: userData.lastName || "",
      suffix: userData.suffix || "",
      phone: normalizedPhone,
      email: normalizedEmail,
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOriginalPhone(normalizedPhone);
    setOriginalEmail(normalizedEmail);
    setVerifiedEmailForSave(normalizedEmail);
    setPhoneError("");
    setPhoneConflictError("");
    setIsCheckingPhoneAvailability(false);
    setSuffixError("");
    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
    setPhoneVerificationToken("");
    setEmailOtpTarget("");
    setShowEmailOtpModal(false);
    setEmailConflictError("");
    setIsCheckingEmailAvailability(false);
    setShowPhoneOtpModal(false);
    setFirebaseConfirmation(null);
    setImage(null);
    setRemoveImage(false);
    setIsEdit(false);
  };

  const sendEmailChangeOtp = async (targetEmail = normalizedEmail) => {
    if (!isValidEmail(targetEmail)) {
      toast.error("Please enter a valid email address.");
      return { success: false };
    }
    if (isCheckingEmailAvailability) {
      toast.error("Please wait while email availability is checked.");
      return { success: false };
    }
    if (activeEmailError) {
      toast.error(activeEmailError);
      return { success: false };
    }

    setEmailOtpLoading(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/send-email-change-otp`,
        { email: targetEmail },
        { headers: { token } }
      );

      if (data.success) {
        setEmailOtpTarget(targetEmail);
        setShowEmailOtpModal(true);
        return { success: true };
      }

      toast.error(data.message || "Failed to send OTP.");
      return { success: false, message: data.message };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to send OTP.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (otpCode) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/verify-email-change-otp`,
        { otp: otpCode },
        { headers: { token } }
      );

      if (!data.success) {
        return { success: false, message: data.message || "Failed to verify email." };
      }

      const verifiedEmail = normalizeEmailInput(data.email || emailOtpTarget);
      setVerifiedEmailForSave(verifiedEmail);
      setOriginalEmail(verifiedEmail);

      await updateUserProfileData({ skipEmailOtp: true, verifiedEmail });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to verify email."
      };
    }
  };

  const updateUserProfileData = async ({ skipEmailOtp = false, verifiedEmail = "" } = {}) => {
    const normalizedPhone = normalizedLocalPhone;
    const normalizedOriginal = normalizedOriginalPhone;
    const phoneWasChanged = normalizedPhone !== normalizedOriginal;
    const effectiveEmailVerified = verifiedEmail === normalizedEmail || emailOtpVerified;
    if (hasMissingRequiredName) {
      toast.error("First name and last name are required.");
      return;
    }
    if (phoneIsRequired && !normalizedPhone) {
      toast.error("Phone number is required.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (isCheckingEmailAvailability) {
      toast.error("Please wait while email availability is checked.");
      return;
    }
    if (activeEmailError) {
      toast.error(activeEmailError);
      return;
    }
    if (normalizedPhone && !isValidPHNumber(normalizedPhone)) {
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
    if (localEditData.newPassword && localEditData.newPassword !== localEditData.confirmPassword) {
      toast.error("Verification failed: Passwords mismatch");
      return;
    }
    if (phoneWasChanged && normalizedPhone && !phoneOtpVerified) {
      toast.error("Please verify your phone number first.");
      return;
    }
    if (emailChanged && !skipEmailOtp && !effectiveEmailVerified) {
      await sendEmailChangeOtp(normalizedEmail);
      return;
    }
    setIsUpdating(true);
    try {
      const formData = new FormData();
      // Sending Split Names to Backend
      formData.append("firstName", trimmedFirstName);
      formData.append("middleName", localEditData.middleName.trim());
      formData.append("lastName", trimmedLastName);
      formData.append("phone", normalizedPhone);
      formData.append("suffix", localEditData.suffix.trim() || "");
      formData.append("email", normalizedEmail);
      if (phoneWasChanged && normalizedPhone && phoneVerificationToken) {
        formData.append("phoneIdToken", phoneVerificationToken);
      }

      if (removeImage) formData.append("removeImage", "true");

      if (localEditData.newPassword) {
        if (!isGooglePasswordSetup) {
          formData.append("oldPassword", localEditData.oldPassword);
        }
        formData.append("newPassword", localEditData.newPassword);
      }

      if (image) formData.append("image", image);

      const { data } = await axios.post(
        backendUrl + "/api/user/update-profile", 
        formData, 
        { headers: { token } } 
      );

      if (data.success) {
        toast.success("Profile updated successfully!");
        setIsEdit(false);
        setImage(null);
        setRemoveImage(false);
        setOriginalEmail(normalizedEmail);
        setPhoneVerificationToken("");
        setVerifiedEmailForSave(normalizedEmail);
        setEmailOtpTarget("");
        setShowEmailOtpModal(false);
        setLocalEditData(prev => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
        if (loadUserProfileData) await loadUserProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible"
    });
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendFirebasePhoneOtp = async () => {
    const normalizedPhone = normalizePhoneInput(localEditData.phone);
    if (!isValidPHNumber(normalizedPhone)) {
      setPhoneError("Use an 11-digit PH number starting with 09.");
      return;
    }
    if (phoneConflictError) {
      return;
    }

    setPhoneError("");
    setPhoneOtpLoading(true);
    try {
      const verifier = await ensureRecaptcha();
      const e164 = `+63${normalizedPhone.slice(1)}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setFirebaseConfirmation(confirmation);
      setPhoneOtpSent(true);
      setShowPhoneOtpModal(true);
    } catch (err) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      toast.error(err?.message || "Failed to send OTP.");
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
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err?.message || "Failed to verify phone." };
    }
  };

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  const displayImage = image 
    ? URL.createObjectURL(image) 
    : (removeImage ? null : userData.image);

  const isSuffixFilled = localEditData.suffix?.length > 0 && !suffixError;

  // Read-only formatted full name
  const formattedFullName = `${localEditData.firstName} ${localEditData.middleName ? localEditData.middleName + ' ' : ''}${localEditData.lastName}${localEditData.suffix ? ' ' + localEditData.suffix : ''}`;

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 pt-24 pb-14 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div id="recaptcha-container" className="hidden"></div>
      {showPhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={normalizePhoneInput(localEditData.phone)}
          onClose={() => setShowPhoneOtpModal(false)}
          onVerify={handleVerifyFirebasePhone}
          onResend={sendFirebasePhoneOtp}
        />
      )}
      {showEmailOtpModal && (
        <VerifyOtp
          email={emailOtpTarget}
          backendUrl={backendUrl}
          onClose={() => setShowEmailOtpModal(false)}
          onResend={() => sendEmailChangeOtp(emailOtpTarget)}
          onVerify={handleVerifyEmailOtp}
        />
      )}
      <div className="w-full space-y-6">
        
        {/* --- HEADER CARD --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-32 bg-[#0F172A] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-[#1e1b4b] opacity-90"></div>
          </div>

          <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-14">
            <div className="relative group shrink-0">
              <div className="w-32 h-32 rounded-full border-[6px] border-white bg-slate-100 shadow-lg overflow-hidden transition-transform group-hover:scale-105 duration-300 flex justify-center items-center">
                {displayImage ? (
                  <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" strokeWidth={1.5} />
                )}
              </div>
              
              {isEdit && (
                <>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Camera className="text-white" size={24} />
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImage(e.target.files[0]);
                          setRemoveImage(false); 
                        }
                      }} 
                    />
                  </label>
                  {displayImage && (
                    <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors z-20" title="Remove photo" type="button">
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex-grow mb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{formattedFullName}</h1>
                <BadgeCheck className="text-blue-500 fill-blue-50" size={20}/>
              </div>
              <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mt-1 italic">
                <Calendar size={14} /> Member Since {new Date().getFullYear()}
              </p>
            </div>

            <div className="mb-2">
              {!isEdit ? (
                <button onClick={() => setIsEdit(true)} className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2">
                  <Edit3 size={16}/> Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handleDiscard} className="px-5 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors" disabled={isUpdating}>
                    Discard
                  </button>
                  <button onClick={() => updateUserProfileData()} disabled={isUpdating || emailOtpLoading || hasMissingRequiredName || hasMissingRequiredPhone} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-100 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          
          {/* LEFT: PERSONAL INFORMATION */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><UserCircle size={22}/></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Account Details</h2>
                <p className="text-slate-400 text-xs font-medium">Manage your personal identifying information.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6 flex-grow">
              
              {!isEdit ? (
                /* FULL NAME VIEW (READ ONLY) */
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <User size={14} className="text-slate-400"/>
                      <p className="text-sm font-bold text-slate-800">{formattedFullName}</p>
                  </div>
                </div>
              ) : (
                /* NAME EDIT VIEW */
                <div className="md:col-span-4 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 md:p-6">
                  <div className="space-y-4 md:space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                      <div className={`group flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all shadow-sm ${
                        trimmedFirstName ? "border-slate-200 focus-within:border-blue-500" : "border-red-300 focus-within:border-red-400"
                      }`}>
                          <input value={localEditData.firstName} onChange={(e) => setLocalEditData({ ...localEditData, firstName: formatPersonName(e.target.value) })} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" placeholder="First Name" />
                      </div>
                      {!trimmedFirstName && (
                        <p className="mt-2 text-[10px] font-bold text-red-500">First name is required.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Middle Name (Optional)</label>
                      <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 transition-all shadow-sm">
                          <input value={localEditData.middleName} onChange={(e) => setLocalEditData({ ...localEditData, middleName: formatPersonName(e.target.value) })} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" placeholder="Middle Name" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.9fr)] gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                        <div className={`group flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all shadow-sm ${
                          trimmedLastName ? "border-slate-200 focus-within:border-blue-500" : "border-red-300 focus-within:border-red-400"
                        }`}>
                            <input value={localEditData.lastName} onChange={(e) => setLocalEditData({ ...localEditData, lastName: formatPersonName(e.target.value) })} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" placeholder="Last Name" />
                        </div>
                        {!trimmedLastName && (
                          <p className="mt-2 text-[10px] font-bold text-red-500">Last name is required.</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Suffix</label>
                        <div className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-sm ${
                          isSuffixFilled ? "border border-green-300 bg-green-50" : "border border-slate-200 bg-white focus-within:border-blue-500"
                        }`}>
                            <input
                              value={localEditData.suffix}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                if (!isSuffixInputAllowed(nextValue)) {
                                  setSuffixError("Use Jr./Sr. or Roman numerals (I-C).");
                                  return;
                                }
                                setSuffixError("");
                                setLocalEditData({ ...localEditData, suffix: formatSuffixValue(nextValue) });
                              }}
                              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none text-center"
                              
                            />
                            {isSuffixFilled && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                        </div>
                        {isEdit && suffixError && (
                          <p className="mt-2 text-[10px] font-bold text-red-500">{suffixError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className={`group relative flex items-center gap-3 px-5 py-3.5 border rounded-xl transition-all ${isEdit ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                  <Mail size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.email}
                    onChange={(e) => setLocalEditData({ ...localEditData, email: e.target.value })}
                    className="bg-transparent outline-none w-full pr-24 text-sm font-bold text-slate-800 disabled:opacity-60"
                  />
                  {isEdit &&
                    emailChanged &&
                    isValidEmail(normalizedEmail) &&
                    !activeEmailError &&
                    !isCheckingEmailAvailability &&
                    !emailOtpVerified && (
                    <button
                      type="button"
                      onClick={() => sendEmailChangeOtp(normalizedEmail)}
                      disabled={emailOtpLoading}
                      className="absolute bottom-2 right-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {emailOtpLoading ? "Sending..." : (emailOtpSentForCurrent ? "OTP Sent" : "Send OTP")}
                    </button>
                  )}
                </div>
                {isEdit && emailChanged && !isValidEmail(normalizedEmail) && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">
                    Please enter a valid email address.
                  </p>
                )}
                {isEdit && emailChanged && activeEmailError && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">{activeEmailError}</p>
                )}
                {isEdit && emailChanged && isValidEmail(normalizedEmail) && isCheckingEmailAvailability && (
                  <p className="mt-2 text-[10px] text-slate-400">Checking email availability...</p>
                )}
                {isEdit &&
                  emailChanged &&
                  isValidEmail(normalizedEmail) &&
                  !activeEmailError &&
                  !isCheckingEmailAvailability &&
                  !emailOtpVerified && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    Send an OTP to the new email before saving your update.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  {phoneIsRequired ? "Phone Number" : "Phone Number (Optional)"}
                </label>
                <div className={`group relative flex items-center gap-3 px-5 py-3.5 border rounded-xl transition-all ${isEdit ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                  <Phone size={16} className="text-slate-400" />
                  <input
                    disabled={!isEdit}
                    value={localEditData.phone}
                    onChange={(e) => {
                      const normalized = normalizePhoneInput(e.target.value).slice(0, 11);
                      setLocalEditData({ ...localEditData, phone: normalized });
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
                    }}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 disabled:opacity-60 pr-24"
                    placeholder="Phone Number"
                  />
                  {isEdit && phoneChanged && isValidPHNumber(normalizePhoneInput(localEditData.phone)) && !activePhoneError && !isCheckingPhoneAvailability && (
                    <button
                      type="button"
                      onClick={sendFirebasePhoneOtp}
                      disabled={phoneOtpLoading}
                      className="absolute bottom-2 right-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {phoneOtpLoading ? "Sending..." : (phoneOtpSent ? "OTP Sent" : "Send OTP")}
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
                {isEdit && phoneOtpVerified && !activePhoneError && !isCheckingPhoneAvailability && (
                  <p className="mt-2 text-[10px] font-bold text-emerald-600">Phone verified.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: SECURITY SIDEBAR */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Settings size={22}/></div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security</h2>
              </div>

              {!isEdit ? (
                <div className="py-8 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                  <div className="inline-flex p-3 bg-green-50 text-green-600 rounded-full mx-auto mb-3 shadow-sm">
                    <CheckCircle size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Connection Secure</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">End-to-End Encrypted</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">
                      {isGooglePasswordSetup ? "Set Password" : "Update Password"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      {isGooglePasswordSetup
                        ? "Google account detected. Set a password if you also want to sign in with email and password."
                        : "Use your current password to set a new one."}
                    </p>
                  </div>
                  {passwordFields.map(({ key, placeholder }) => (
                    <div className="relative group" key={key}>
                      <input
                        type={showPass[key] ? "text" : "password"}
                        placeholder={placeholder}
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black tracking-widest outline-none focus:border-blue-500 transition-all shadow-sm"
                        value={localEditData[key]}
                        onChange={(e) => setLocalEditData({ ...localEditData, [key]: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowPass({...showPass, [key]: !showPass[key]})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500">
                        {showPass[key] ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-50">
                <div className="flex items-start gap-2 text-slate-400 italic">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">Changes to your legal name may take up to 24 hours to reflect.</p>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyProfile;
