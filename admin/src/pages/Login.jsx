import React, { useState, useContext, useEffect, useRef } from "react";
import { AdminContext } from "../context/AdminContext";
import { StaffContext } from "../context/StaffContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
// Toast import removed
import BannerImage from "../assets/login_bg.png"; 
import VerifyOtp from "./VerifyOtp";
import VerifyFirebasePhoneOtp from "../components/VerifyFirebasePhoneOtp";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import AccountStatusModal from "../components/AccountStatusModal";
import {
  consumeDisabledAccountNotice,
  DEFAULT_DISABLED_ACCOUNT_MESSAGE,
  isAccountDisabledMessage,
} from "../utils/accountStatusNotice";

const Login = () => {
  const [state, setState] = useState("Admin"); 
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Staff forgot-password flow (mirrors user login)
  const [showForgotEmailField, setShowForgotEmailField] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [phoneIdToken, setPhoneIdToken] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [staffView, setStaffView] = useState("Login");
  const [showFirebasePhoneOtpModal, setShowFirebasePhoneOtpModal] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [firebasePhoneTarget, setFirebasePhoneTarget] = useState("");
  const recaptchaRef = useRef(null);
  
  // General error state for "Invalid Credentials" since toasts are removed
  const [error, setError] = useState("");
  const [disabledModalMessage, setDisabledModalMessage] = useState("");

  const { adminLogin } = useContext(AdminContext);
  const { staffLogin } = useContext(StaffContext);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const openDisabledAccountModal = (message) => {
    setDisabledModalMessage(message || DEFAULT_DISABLED_ACCOUNT_MESSAGE);
    setError("");
    setResetError("");
    setResetSuccess("");
    setPassword("");
    setConfirmPassword("");
    setShowForgotEmailField(false);
  };

  // Reset errors when switching roles or typing
  useEffect(() => {
    setError("");
  }, [state, identifier, password]);

  useEffect(() => {
    const notice = consumeDisabledAccountNotice();
    if (notice) {
      openDisabledAccountModal(notice);
      setShowForgotEmailField(false);
      setStaffView("Login");
    }
  }, []);

  // Reset staff-only flows when leaving Staff view
  useEffect(() => {
    if (state !== "Staff") {
      setShowForgotEmailField(false);
      setShowOtpModal(false);
      setIsResetMode(false);
      setVerifiedOtp("");
      setPhoneIdToken("");
      setConfirmPassword("");
      setResetError("");
      setResetSuccess("");
      setStaffView("Login");
      setShowFirebasePhoneOtpModal(false);
      setFirebaseConfirmation(null);
      setFirebasePhoneTarget("");
    }
  }, [state]);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (state === "Admin") {
        const response = await adminLogin(identifier, password);
        if (response?.success) {
          navigate("/admin-dashboard");
        } else if (isAccountDisabledMessage(response?.message)) {
          openDisabledAccountModal(response.message);
        } else {
          setError(response?.message || "Invalid admin credentials");
        }
      } else {
        // STAFF LOGIN
        const response = await staffLogin(identifier, password);
        
        if (response && response.success) {
            navigate("/staff-dashboard");
        } else if (isAccountDisabledMessage(response?.message)) {
            openDisabledAccountModal(response.message);
        } else if (response && response.message) {
            setError(response.message);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "";
      if (isAccountDisabledMessage(errMsg)) {
        openDisabledAccountModal(errMsg);
      } else {
        setError("Authentication Failed");
      }
    } finally {
        setLoading(false);
    }
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validatePhone = (value) => /^(09)\d{9}$/.test(String(value || "").replace(/\D/g, ""));

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;

    recaptchaRef.current = new RecaptchaVerifier(auth, "admin-login-recaptcha-container", {
      size: "invisible",
    });

    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendFirebasePhoneResetOtp = async (targetPhone = identifier) => {
    const normalizedPhone = String(targetPhone || "").replace(/\D/g, "").slice(0, 11);

    if (!validatePhone(normalizedPhone)) {
      const message = "Please enter a valid 11-digit phone number.";
      setResetError(message);
      return { success: false, message };
    }

    setResetError("");
    setResetLoading(true);

    try {
      const { data } = await axios.post(`${backendUrl}/api/user/request-phone-reset`, {
        phone: normalizedPhone,
      });

      if (!data?.success) {
        const message = data?.message || "No account found with this phone number.";
        setResetError(message);
        return { success: false, message };
      }

      const verifier = await ensureRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, `+63${normalizedPhone.slice(1)}`, verifier);

      setFirebaseConfirmation(confirmation);
      setFirebasePhoneTarget(normalizedPhone);
      setPhoneIdToken("");
      setShowFirebasePhoneOtpModal(true);
      setIsResetMode(true);
      return { success: true };
    } catch (err) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send reset code.";
      setResetError(message);
      return { success: false, message };
    } finally {
      setResetLoading(false);
    }
  };

  const verifyFirebasePhoneReset = async (otpCode) => {
    if (!firebaseConfirmation) {
      return { success: false, message: "Please request a new OTP." };
    }

    try {
      const result = await firebaseConfirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken(true);

      setPhoneIdToken(idToken);
      setVerifiedOtp("");
      setPassword("");
      setConfirmPassword("");
      setResetError("");
      setResetSuccess("");
      setShowForgotEmailField(false);
      setTimeout(() => setStaffView("Reset Password"), 50);

      await signOut(auth);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to verify phone number.",
      };
    }
  };

  const handleForgotToggle = () => {
    if (showForgotEmailField) {
      setResetError("");
      setResetSuccess("");
      setIsResetMode(false);
      setVerifiedOtp("");
      setPhoneIdToken("");
      setPassword("");
      setConfirmPassword("");
      setShowFirebasePhoneOtpModal(false);
      setFirebaseConfirmation(null);
      setFirebasePhoneTarget("");
    }
    setShowForgotEmailField((prev) => !prev);
    setResetError("");
    setResetSuccess("");
  };

  const handleForgotPassword = async () => {
    const isEmail = validateEmail(identifier);
    const isPhone = /^(09)\d{9}$/.test(identifier);
    if (!isEmail && !isPhone) {
      setResetError("Please enter a valid email or 11-digit phone number.");
      return;
    }

    setResetError("");
    setResetSuccess("");

    if (isPhone) {
      const result = await sendFirebasePhoneResetOtp(identifier);
      if (result?.success) {
        setShowForgotEmailField(false);
      }
      return;
    }

    setResetLoading(true);
    try {
      const endpoint = "/api/user/request-reset";
      const payload = { email: identifier };
      const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);

      if (data?.success) {
        setIsResetMode(true);
        setShowOtpModal(true);
        setShowForgotEmailField(false);
      } else {
        setResetError(data?.message || "Failed to send reset code.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to send reset code.";
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setResetError("Passwords do not match!");
    if (password.length < 8) return setResetError("Password must be at least 8 characters");

    const isPhoneReset = validatePhone(identifier);
    if (isPhoneReset && !phoneIdToken) return setResetError("Phone verification missing.");
    if (!isPhoneReset && !verifiedOtp) return setResetError("Verification code missing.");

    setResetLoading(true);
    setResetError("");
    setResetSuccess("");
    try {
      const payload = {
        identifier: identifier.trim(),
        newPassword: password
      };

      if (isPhoneReset) {
        payload.phoneIdToken = phoneIdToken;
      } else {
        payload.otp = String(verifiedOtp).trim();
      }

      const { data } = await axios.post(`${backendUrl}/api/user/reset-password`, payload);

      if (data?.success) {
        setResetSuccess("Password reset successful! You can now log in.");
        setStaffView("Login");
        setIsResetMode(false);
        setPassword("");
        setConfirmPassword("");
        setVerifiedOtp("");
        setPhoneIdToken("");
        setFirebaseConfirmation(null);
        setFirebasePhoneTarget("");
        setResetError("");
      } else {
        setResetError(data?.message || "Failed to reset password.");
      }
    } catch (err) {
      setResetError("Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const isAdmin = state === 'Admin';
  const isStaffResetView = !isAdmin && staffView === "Reset Password";
  const activeColor = isAdmin ? 'text-indigo-600' : 'text-gray-800';
  const ringColor = isAdmin ? 'focus:ring-indigo-100' : 'focus:ring-gray-200';
  const inputLabel = isAdmin ? "Email address" : "Email or phone number";
  const inputType = isAdmin ? "email" : "text"; 
  const inputPlaceholder = isAdmin ? "Email" : "Email or Phone Number";

  const buttonGradient = isAdmin 
    ? 'bg-gradient-to-r from-indigo-600 to-blue-600' 
    : 'bg-gradient-to-r from-gray-900 to-black';
  const submitLabel = isStaffResetView ? "Update Password" : "Log In";
  const submitBusyLabel = isStaffResetView ? "Updating..." : "Verifying...";

  return (
    <div className="flex min-h-[100svh] w-full flex-col overflow-auto bg-white font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <div id="admin-login-recaptcha-container" className="hidden"></div>
      <AccountStatusModal
        open={Boolean(disabledModalMessage)}
        message={disabledModalMessage}
        onClose={() => setDisabledModalMessage("")}
      />
      {showFirebasePhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={firebasePhoneTarget || identifier}
          onClose={({ verified } = {}) => {
            setShowFirebasePhoneOtpModal(false);
            setFirebaseConfirmation(null);
            setFirebasePhoneTarget("");
            if (!verified) {
              setIsResetMode(false);
              setPhoneIdToken("");
            }
          }}
          onVerify={verifyFirebasePhoneReset}
          onResend={() => sendFirebasePhoneResetOtp(firebasePhoneTarget || identifier)}
        />
      )}
      {showOtpModal && (
        <VerifyOtp
          identifier={identifier}
          identifierType="email"
          onClose={() => {
            setShowOtpModal(false);
            if (!isStaffResetView) {
              setIsResetMode(false);
              setVerifiedOtp("");
            }
          }}
          onSuccess={(otpCode) => {
            setVerifiedOtp(otpCode.toString().trim());
            if (isResetMode) {
              setPassword("");
              setConfirmPassword("");
              setResetError("");
              setResetSuccess("");
              setTimeout(() => setStaffView("Reset Password"), 50);
            }
          }}
          backendUrl={backendUrl}
          isResetMode={isResetMode}
          onResend={async () => {
            const endpoint = "/api/user/request-reset";
            const payload = { email: identifier };
            const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);
            return data;
          }}
        />
      )}
      
      {/* ---------------- LEFT SIDE: IMAGE (60%) ---------------- */}
      <div className="relative hidden h-full w-[60%] lg:flex">
        <img src={BannerImage} alt="Retreat House" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 transition-all duration-700 ${isAdmin ? 'bg-indigo-900/80' : 'bg-black/80'} mix-blend-multiply`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

        <div className="absolute inset-0 flex flex-col justify-between p-16 z-10 text-white">
            <div className="animate-fade-in-down">
                <div className="w-12 h-1 bg-white/80 mb-6 rounded-full"></div>
                <h1 className="text-6xl font-serif font-medium leading-tight">
                    {isAdmin ? 'Stewardship & Leadership.' : 'Service & Sanctuary.'}
                </h1>
                <p className="mt-4 text-lg text-white/80 font-light max-w-md">
                    {isAdmin 
                        ? 'Manage operations, oversee guest experiences, and ensure the retreat runs smoothly.' 
                        : 'Assist in daily operations and provide a welcoming environment for our guests.'}
                </p>
            </div>
            
            <div className="backdrop-blur-md bg-white/10 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-lg">
                <p className="text-xl font-light text-white/95 italic">
                    "To serve is to love. Welcome to the digital gateway for managing our retreat operations."
                </p>
            </div>
        </div>
      </div>

      {/* ---------------- RIGHT SIDE: FORM (40%) ---------------- */}
      <div className="relative flex h-full w-full flex-col justify-center bg-white px-4 py-6 sm:px-8 sm:py-8 lg:w-[40%] lg:px-12 xl:px-24">
        <div className="relative z-10 mx-auto w-full max-w-xl lg:max-w-none">
            <div className="mb-6 lg:hidden">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)]">
                    <img src={BannerImage} alt="Retreat House" className="h-44 w-full object-cover" />
                    <div className={`absolute inset-0 ${isAdmin ? 'bg-indigo-900/75' : 'bg-slate-950/75'} mix-blend-multiply`}></div>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                            {isAdmin ? "Admin Panel" : "Staff Panel"}
                        </p>
                        <h3 className="mt-2 text-xl font-bold leading-tight">
                            {isAdmin ? "Run the retreat with confidence." : "Stay connected to daily guest service."}
                        </h3>
                    </div>
                </div>
            </div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">
                {isStaffResetView ? "Set New Password" : "Welcome Back"}
                </h2>
                <p className="text-gray-400 text-sm">
                {isStaffResetView
                        ? "Please choose a strong password."
                        : <>Enter details to access the <span className={`font-semibold ${activeColor}`}>{state} Panel</span>.</>}
                </p>
            </div>

            <form onSubmit={isStaffResetView ? handleResetSubmit : onSubmitHandler} className="space-y-5 sm:space-y-6">
                
                <div className="relative mb-6 flex rounded-full bg-gray-100 p-1.5 sm:mb-8">
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-white shadow-sm transition-all duration-300 ${isAdmin ? 'left-1.5' : 'left-[50%]'}`}></div>
                    <button type="button" onClick={() => setState("Admin")} className={`relative z-10 flex-1 rounded-full py-3 text-sm font-semibold transition-colors sm:text-base ${isAdmin ? 'text-indigo-700' : 'text-gray-500'}`}>Admin</button>
                    <button type="button" onClick={() => setState("Staff")} className={`relative z-10 flex-1 rounded-full py-3 text-sm font-semibold transition-colors sm:text-base ${!isAdmin ? 'text-gray-900' : 'text-gray-500'}`}>Staff</button>
                </div>
                {!isStaffResetView && (
                  <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-500 ml-1">{inputLabel}</label>
                      <input 
                          type={inputType}
                          value={identifier}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isAdmin) {
                              setIdentifier(value);
                              return;
                            }
                            setPhoneIdToken("");
                            const looksLikeEmail = value.includes("@") || /[a-zA-Z]/.test(value);
                            if (looksLikeEmail) {
                              setIdentifier(value);
                              return;
                            }
                            const digits = value.replace(/\D/g, "").slice(0, 11);
                            setIdentifier(digits);
                          }}
                          className={`w-full px-6 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} transition-all`}
                          placeholder={inputPlaceholder}
                          required 
                      />
                  </div>
                )}
                {!isStaffResetView && (!showForgotEmailField || isAdmin) && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-500 ml-1">Password</label>
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={handleForgotToggle}
                          className="text-xs text-blue-600 font-bold hover:underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full px-6 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} transition-all`}
                        placeholder="Enter Password"
                        required 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
                {showForgotEmailField && !isAdmin && !isStaffResetView && (
                  <div className="mt-2 p-5 bg-white border border-gray-100 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-400">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotEmailField(false);
                          setIsResetMode(false);
                          setVerifiedOtp("");
                          setPhoneIdToken("");
                          setShowFirebasePhoneOtpModal(false);
                          setFirebaseConfirmation(null);
                          setFirebasePhoneTarget("");
                          setResetError("");
                          setResetSuccess("");
                        }}
                        className="py-3.5 rounded-xl text-[10px] font-extrabold text-gray-400 border border-gray-100 uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resetLoading}
                        className="bg-[#1A2B32] text-white py-3.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest active:scale-[0.98] disabled:opacity-70"
                      >
                        {resetLoading ? "Sending..." : "Send Code"}
                      </button>
                    </div>
                    {resetError && (
                      <div className="text-red-500 text-xs font-semibold mt-3">
                        ⚠️ {resetError}
                      </div>
                    )}
                  </div>
                )}
                {isStaffResetView && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm"
                        type={showPassword ? "text" : "password"}
                        placeholder="New Password"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
                      />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        value={confirmPassword}
                        required
                      />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
                {!isAdmin && !showForgotEmailField && resetError && (
                    <div className="text-red-500 text-sm font-medium ml-1">
                        ⚠️ {resetError}
                    </div>
                )}
                {!isAdmin && !showForgotEmailField && resetSuccess && (
                    <div className="text-emerald-600 text-sm font-medium ml-1">
                        ✅ {resetSuccess}
                    </div>
                )}
{/* --- ERROR MESSAGE (Invalid Credentials) --- */}
                {error && !isStaffResetView && (
                    <div className="text-red-500 text-sm font-medium ml-1">
                        ⚠️ {error}
                    </div>
                )}

                {!showForgotEmailField && (
                <div className="flex justify-center pt-2">
                    <button 
                        type="submit"
                        disabled={loading || resetLoading}
                        className={`w-full py-4 rounded-2xl text-white font-bold text-lg tracking-wide shadow-lg transition-all ${buttonGradient} disabled:opacity-70`}
                    >
                        {(loading || resetLoading) ? submitBusyLabel : submitLabel}
                    </button>
                </div>
)}
            </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
