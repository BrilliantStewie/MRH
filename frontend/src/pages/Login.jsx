import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Eye, EyeOff, Loader2, Info, Mail, ShieldCheck, Lock, Phone, UserCircle, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { signInWithPopup, signInWithRedirect, getRedirectResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
// ✅ IMPORT THE COMPONENT
import VerifyOtp from './VerifyOtp'; 
import VerifyFirebasePhoneOtp from './VerifyFirebasePhoneOtp';
import AccountStatusModal from '../components/AccountStatusModal';
import loginVisual from "../assets/mrh_about.jpg";
import {
  consumeDisabledAccountNotice,
  DEFAULT_DISABLED_ACCOUNT_MESSAGE,
  isAccountDisabledMessage,
} from "../utils/accountStatusNotice";

// ✅ VALIDATION CONSTANTS
const TEXT_SUFFIXES = ["Jr.", "Sr."];
const ROMAN_REGEX = /^(X{0,3})(IX|IV|V?I{0,3})$|^XL[IXV]{0,3}$|^L[X]{0,3}[IXV]{0,3}$|^XC[IXV]{0,3}$|^C$/i;

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext);
  const navigate = useNavigate();

  const [state, setState] = useState('Login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showVerificationNag, setShowVerificationNag] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false); 
  const [isResetMode, setIsResetMode] = useState(false); 
  const [verifiedOtp, setVerifiedOtp] = useState(''); 
  const [otpTargetType, setOtpTargetType] = useState('email');
  const [otpTargetValue, setOtpTargetValue] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showFirebasePhoneOtpModal, setShowFirebasePhoneOtpModal] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [firebasePhoneTarget, setFirebasePhoneTarget] = useState('');
  const [firebasePhonePurpose, setFirebasePhonePurpose] = useState('');
  const [phoneIdToken, setPhoneIdToken] = useState('');
  const recaptchaRef = useRef(null);

  // New state for Forgot Password flow
  const [showForgotEmailField, setShowForgotEmailField] = useState(false);

  // Error & Success States
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [disabledModalMessage, setDisabledModalMessage] = useState("");

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [suffixError, setSuffixError] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);

  // ✅ NEW STATES FOR LIVE CHECKS
  const [isAccountTaken, setIsAccountTaken] = useState(false);
  const [isPhoneFieldTaken, setIsPhoneFieldTaken] = useState(false); // New state for registration phone field

  const resolveGoogleAuthError = (err) => {
    const code = err?.code;
    if (code === "auth/popup-closed-by-user") return "Sign-in popup closed.";
    if (code === "auth/cancelled-popup-request") return "Another sign-in is in progress.";
    if (code === "auth/popup-blocked") return "Popup blocked. We will redirect you to sign in.";
    if (code === "auth/operation-not-allowed") return "Google sign-in is not enabled in Firebase.";
    if (code === "auth/unauthorized-domain") return "This domain is not authorized for Google sign-in.";
    if (code === "auth/invalid-api-key") return "Invalid Firebase API key.";
    return err?.response?.data?.message || err?.message || "Google sign-in failed.";
  };

  const openDisabledAccountModal = (message) => {
    setDisabledModalMessage(message || DEFAULT_DISABLED_ACCOUNT_MESSAGE);
    setError("");
    setSuccessMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowForgotEmailField(false);
  };

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  useEffect(() => {
    const notice = consumeDisabledAccountNotice();
    if (notice) {
      openDisabledAccountModal(notice);
      setState('Login');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result?.user || !active) return;

        setGoogleLoading(true);
        const intent = localStorage.getItem("googleAuthIntent") || "login";
        localStorage.removeItem("googleAuthIntent");
        const idToken = await result.user.getIdToken();
        const { data } = await axios.post(backendUrl + '/api/user/google-auth', { idToken, intent });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else if (isAccountDisabledMessage(data.message)) {
          openDisabledAccountModal(data.message);
        } else {
          setError(data.message || "Google sign-in failed.");
        }
      } catch (err) {
        if (!active) return;
        const message = resolveGoogleAuthError(err);
        setError(message);
      } finally {
        if (active) setGoogleLoading(false);
      }
    };

    handleRedirectResult();
    return () => { active = false; };
  }, [backendUrl, setToken]);

  useEffect(() => {
    setError("");
    setSuccessMessage("");
    setIsEmailVerified(false);
    setIsPhoneVerified(false);
    setShowVerificationNag(false);
    setIsAccountTaken(false);
    setIsPhoneFieldTaken(false); // Reset
    setOtpTargetType('email');
    setOtpTargetValue('');
    
    if (state !== 'Reset Password') {
        setIsResetMode(false);
    }
  }, [state]);

  // ✅ LIVE AVAILABILITY CHECK FOR EMAIL/IDENTIFIER (DEBOUNCED)
  useEffect(() => {
    if (state !== 'Sign Up') return;

    const checkAvailability = async () => {
      const isEmail = validateEmail(email);
      const isPhone = /^(09)\d{9}$/.test(email);

      if (!isEmail && !isPhone) {
        setIsAccountTaken(false);
        return;
      }

      try {
        const endpoint = isEmail ? '/api/user/check-email' : '/api/user/check-phone';
        const payload = isEmail ? { email } : { phone: email };
        const { data } = await axios.post(backendUrl + endpoint, payload);
        
        if (data.exists) {
          setIsAccountTaken(true);
          setError(isEmail ? "This email is already registered." : "This phone number is already registered.");
        } else {
          setIsAccountTaken(false);
          setError("");
        }
      } catch (err) {
        console.error("Availability check failed", err);
      }
    };

    const delayDebounceFn = setTimeout(checkAvailability, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [email, state, backendUrl]);

  // ✅ NEW: LIVE CHECK FOR REGISTRATION PHONE FIELD (DEBOUNCED)
  useEffect(() => {
    if (state !== 'Sign Up' || phone.length < 11) {
      setIsPhoneFieldTaken(false);
      return;
    }

    const checkPhoneAvailability = async () => {
      try {
        const { data } = await axios.post(backendUrl + '/api/user/check-phone', { phone });
        if (data.exists) {
          setIsPhoneFieldTaken(true);
          setError("This phone number is already registered to another account.");
        } else {
          setIsPhoneFieldTaken(false);
          setError("");
        }
      } catch (err) {
        console.error("Phone check failed", err);
      }
    };

    const delayDebounceFn = setTimeout(checkPhoneAvailability, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [phone, state, backendUrl]);

  const formatName = (val) => {
    const cleaned = val.replace(/[^a-zA-Z\u00D1\u00F1\s-]/g, "");
    return cleaned
      .toLowerCase()
      .replace(/(^|[\s-])([a-z\u00f1])/g, (_, separator, character) =>
        `${separator}${character.toUpperCase()}`
      );
  };

  const handleSuffixChange = (val) => {
    let formatted = val.replace(/[^a-zA-Z.]/g, "");
    if (formatted.length > 0) {
      const isRoman = /^[IVXLC]+$/i.test(formatted);
      if (isRoman) formatted = formatted.toUpperCase();
      else formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    setSuffix(formatted);
    if (formatted === "" || TEXT_SUFFIXES.includes(formatted) || ROMAN_REGEX.test(formatted)) {
      setSuffixError("");
    } else {
      setSuffixError("Invalid Suffix");
    }
  };

  const formatPhone = (val) => val.replace(/\D/g, '');
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (value) => /^(09)\d{9}$/.test(value);

  const ensureRecaptcha = async () => {
    if (recaptchaRef.current) return recaptchaRef.current;

    recaptchaRef.current = new RecaptchaVerifier(auth, "login-recaptcha-container", {
      size: "invisible",
    });

    await recaptchaRef.current.render();
    return recaptchaRef.current;
  };

  const sendFirebasePhoneOtp = async ({ targetPhone, purpose }) => {
    const normalizedPhone = formatPhone(targetPhone);

    if (!validatePhone(normalizedPhone)) {
      const message = "Please enter a valid 11-digit phone number.";
      setError(message);
      return { success: false, message };
    }

    if (purpose === 'signup' && isPhoneFieldTaken) {
      const message = "This phone number is already registered to another account.";
      setError(message);
      return { success: false, message };
    }

    setError("");
    setLoading(true);

    try {
      if (purpose === 'reset') {
        const { data } = await axios.post(`${backendUrl}/api/user/request-phone-reset`, {
          phone: normalizedPhone,
        });

        if (!data.success) {
          setError(data.message || "No account found with this phone number.");
          return { success: false, message: data.message };
        }

        setIsResetMode(true);
      }

      const verifier = await ensureRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, `+63${normalizedPhone.slice(1)}`, verifier);

      setFirebaseConfirmation(confirmation);
      setFirebasePhoneTarget(normalizedPhone);
      setFirebasePhonePurpose(purpose);
      setPhoneIdToken('');
      setShowFirebasePhoneOtpModal(true);

      if (purpose === 'signup') {
        setPhone(normalizedPhone);
        setIsPhoneVerified(false);
      }

      return { success: true };
    } catch (err) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Could not send code. Please try again.";

      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const verifyFirebasePhoneCode = async (otpCode) => {
    if (!firebaseConfirmation) {
      return { success: false, message: "Please request a new OTP." };
    }

    try {
      const result = await firebaseConfirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken(true);

      if (firebasePhonePurpose === 'signup') {
        setPhoneIdToken(idToken);
        setIsPhoneVerified(true);
        setShowVerificationNag(false);
      } else {
        setPhoneIdToken(idToken);
        setVerifiedOtp('');
        setShowForgotEmailField(false);
        setError("");
        setTimeout(() => setState('Reset Password'), 50);
      }

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

  const handleVerifyClick = async (type = 'default') => {
    if (type === 'phone') {
      return sendFirebasePhoneOtp({ targetPhone: phone, purpose: 'signup' });
    }

    const targetValue = (type === 'phone') ? phone : email;
    const isEmail = validateEmail(targetValue);
    const nextTargetType = 'email';

    // Block if the specific input being verified is already taken
    if (state === 'Sign Up') {
      if (type === 'default' && isAccountTaken) return;
    }

    if (state === 'Sign Up' && type === 'default' && !isEmail) {
      return setError("Registration requires a valid email address.");
    }
    
    setError("");
    setLoading(true);
    try {
      const endpoint = '/api/user/send-otp';
      const payload = { email: targetValue };
      const { data } = await axios.post(backendUrl + endpoint, payload);
      
      if (data.success) {
        if (showForgotEmailField) setIsResetMode(true);
        setOtpTargetType(nextTargetType);
        setOtpTargetValue(targetValue);
        setShowOtpModal(true);
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Could not send code. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    const isEmail = validateEmail(email);
    const isPhone = validatePhone(email);
    if (!isEmail && !isPhone) return setError("Please enter a valid email or 11-digit phone number.");
    
    setError("");

    if (isPhone) {
      const result = await sendFirebasePhoneOtp({ targetPhone: email, purpose: 'reset' });
      if (result?.success) {
        setShowForgotEmailField(false);
      }
      return;
    }

    setLoading(true);
    try {
      const endpoint = '/api/user/request-reset'; 
      const payload = { email };
      const { data } = await axios.post(backendUrl + endpoint, payload);
      
      if (data.success) {
        setIsResetMode(true);
        setOtpTargetType('email');
        setOtpTargetValue(email);
        setShowOtpModal(true);
        setShowForgotEmailField(false); 
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Account not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpResend = async () => {
    const targetValue = otpTargetValue || (otpTargetType === 'phone' ? phone : email);
    const isPhoneTarget = otpTargetType === 'phone';
    const endpoint = isResetMode
      ? (isPhoneTarget ? '/api/user/request-phone-reset' : '/api/user/request-reset')
      : (isPhoneTarget ? '/api/user/send-phone-otp' : '/api/user/send-otp');
    const payload = isPhoneTarget ? { phone: targetValue } : { email: targetValue };
    const { data } = await axios.post(backendUrl + endpoint, payload);
    return data;
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match!");
    if (password.length < 8) return setError("Password must be at least 8 characters");

    const resetIdentifier = email.trim();
    const isPhoneReset = validatePhone(resetIdentifier);
    if (isPhoneReset && !phoneIdToken) return setError("Phone verification missing.");
    if (!isPhoneReset && !verifiedOtp) return setError("Verification code missing.");

    setLoading(true);
    try {
      const payload = {
        identifier: resetIdentifier,
        newPassword: password,
      };

      if (isPhoneReset) {
        payload.phoneIdToken = phoneIdToken;
      } else {
        payload.otp = String(verifiedOtp).trim();
      }

      const { data } = await axios.post(backendUrl + '/api/user/reset-password', payload);
      
      if (data.success) {
        setSuccessMessage("Password reset successful! You can now log in.");
        setState('Login');
        setPassword('');
        setConfirmPassword('');
        setVerifiedOtp(''); 
        setPhoneIdToken('');
        setFirebaseConfirmation(null);
        setFirebasePhoneTarget('');
        setFirebasePhonePurpose('');
        setError("");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (intent = "login") => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const { data } = await axios.post(backendUrl + '/api/user/google-auth', { idToken, intent });
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else if (isAccountDisabledMessage(data.message)) {
        openDisabledAccountModal(data.message);
      } else {
        setError(data.message || "Google sign-in failed.");
      }
    } catch (err) {
      const code = err?.code;
      if (code === "auth/popup-blocked") {
        setError("Popup blocked. Redirecting to Google sign-in...");
        localStorage.setItem("googleAuthIntent", intent);
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const message = resolveGoogleAuthError(err);
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    // ✅ BLOCK SUBMISSION IF FIELDS ARE TAKEN
    if (state === 'Sign Up' && (isAccountTaken || isPhoneFieldTaken)) return;

    if (state === 'Sign Up') {
      if (!isEmailVerified) {
        setShowVerificationNag(true);
        return; 
      }
      if (!isPhoneVerified) {
        setShowVerificationNag(true);
        return;
      }
      if (suffixError) return setError("Please provide a valid suffix");
      if (password !== confirmPassword) return setError("Passwords do not match!");
      if (password.length < 8) return setError("Password must be at least 8 characters");
      if (phone.length < 11) return setError("Please enter a valid phone number");
    }

    setLoading(true);
    try {
      if (state === 'Sign Up') {
        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('middleName', middleName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('suffix', suffix.trim());
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone', phone);
        formData.append('phoneIdToken', phoneIdToken);
        if (image) formData.append('image', image);

        const { data } = await axios.post(backendUrl + '/api/user/register', formData);
        if (data.success) {
          setState('Login');
          setPhoneIdToken('');
          setFirebaseConfirmation(null);
          setFirebasePhoneTarget('');
          setFirebasePhonePurpose('');
          setIsPhoneVerified(false);
        } else {
          setError(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/user/login', { email, password });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else if (isAccountDisabledMessage(data.message)) {
          openDisabledAccountModal(data.message);
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || "Authentication Failed.";
      if (isAccountDisabledMessage(message)) {
        openDisabledAccountModal(message);
      } else {
        setError("Authentication Failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    if (state === 'Reset Password') {
      return handleResetSubmit(e);
    }

    if (showForgotEmailField) {
      e.preventDefault();
      return handleForgotPassword();
    }

    return onSubmitHandler(e);
  };

  return (
    <div className='relative flex min-h-[100svh] items-center justify-center bg-[#F4F5F7] px-3 py-4 font-sans sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10'>
      <div id="login-recaptcha-container" className="hidden"></div>
      <AccountStatusModal
        open={Boolean(disabledModalMessage)}
        message={disabledModalMessage}
        onClose={() => setDisabledModalMessage("")}
      />

      {showFirebasePhoneOtpModal && (
        <VerifyFirebasePhoneOtp
          phone={firebasePhoneTarget || phone}
          onClose={({ verified } = {}) => {
            setShowFirebasePhoneOtpModal(false);
            setFirebaseConfirmation(null);
            setFirebasePhoneTarget('');
            setFirebasePhonePurpose('');
            if (!verified && firebasePhonePurpose === 'reset') {
              setIsResetMode(false);
              setPhoneIdToken('');
            }
          }}
          onVerify={verifyFirebasePhoneCode}
          onResend={() =>
            sendFirebasePhoneOtp({
              targetPhone: firebasePhoneTarget || phone,
              purpose: firebasePhonePurpose,
            })
          }
        />
      )}
      
      {showOtpModal && (
        <VerifyOtp 
          identifier={otpTargetValue || email}
          identifierType={otpTargetType}
          backendUrl={backendUrl} 
          isResetMode={isResetMode} 
          onResend={handleOtpResend}
          onClose={({ preserveVerification = false } = {}) => {
            setShowOtpModal(false);
            if (!preserveVerification && isResetMode && state !== 'Reset Password') {
              setIsResetMode(false);
              setVerifiedOtp('');
            }
          }} 
          onSuccess={(otpCode) => {
            setVerifiedOtp(otpCode.toString().trim()); 
            if (isResetMode) {
              setTimeout(() => setState('Reset Password'), 50);
            } else {
              setIsEmailVerified(true);
            }
          }}
        />
      )}

      <div className='flex w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.1)] sm:rounded-[40px] lg:flex-row'>
        <div className='flex w-full flex-col justify-center bg-white p-6 sm:p-10 lg:w-[46%] lg:p-14 xl:w-[44%]'>
          <div className='mx-auto w-full max-w-[480px] xl:max-w-[520px]'>
            <div className='mb-6 lg:hidden'>
              <div className='relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)]'>
                <img src={loginVisual} alt="Mercedarian Retreat House" className='h-44 w-full object-cover opacity-90' />
                <div className='absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/35 to-transparent'></div>
                <div className='absolute inset-x-0 bottom-0 p-5 text-white'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.28em] text-white/70'>Mercedarian Retreat House</p>
                  <h3 className='mt-2 text-xl font-bold leading-tight'>A calmer booking experience, sized for every screen.</h3>
                </div>
              </div>
            </div>
            <div className='mb-8'>
              <h2 className='text-3xl font-bold text-gray-900 tracking-tight'>
                {state === 'Reset Password' ? "Set New Password" : (state === 'Sign Up' ? "Create Account" : (showForgotEmailField ? "Reset Password" : "Welcome Back"))}
              </h2>
              <p className='text-gray-400 text-sm mt-3 leading-relaxed'>
                {state === 'Reset Password' ? "Please choose a strong password." : (showForgotEmailField ? "Enter your email or phone to receive a code." : `Today is a new day. ${state === 'Sign Up' ? "Join us to start managing." : "Sign in to start managing."}`)}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className='space-y-4'>
              {state !== 'Reset Password' && (
                <>
                  {state === 'Sign Up' && (
                    <>
                      <div className="flex flex-col items-center mb-6">
                        <label htmlFor="profile-pic" className="relative cursor-pointer group">
                          <div className="w-20 h-20 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                            {image ? <img src={URL.createObjectURL(image)} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle size={44} className="text-gray-200" />}
                          </div>
                          <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border-2 border-white shadow-sm">
                            <Camera size={12} />
                          </div>
                          <input type="file" id="profile-pic" hidden onChange={(e) => setImage(e.target.files[0])} accept="image/*" />
                        </label>
                      </div>

                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>First Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => setFirstName(formatName(e.target.value))} value={firstName} placeholder="First name" required />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Last Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => setLastName(formatName(e.target.value))} value={lastName} placeholder="Last name" required />
                        </div>
                      </div>

                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
                        <div className='space-y-1.5 sm:col-span-3'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Middle Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => setMiddleName(formatName(e.target.value))} value={middleName} placeholder="Optional" />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Suffix</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => handleSuffixChange(e.target.value)} value={suffix} />
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Phone Number</label>
                        <div className='relative flex items-center'>
                          <input 
                            className={`w-full bg-gray-50 border rounded-xl p-3 text-sm outline-none transition-all ${isPhoneFieldTaken ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-blue-500'}`}
                            type="tel" 
                            onChange={(e) => {
                              setPhone(formatPhone(e.target.value));
                              if (state === 'Sign Up') setIsPhoneVerified(false);
                              setPhoneIdToken('');
                            }} 
                            value={phone} 
                            placeholder="Phone Number" 
                            required 
                          />
                          {state === 'Sign Up' && phone.length === 11 && !isPhoneFieldTaken && (
                            <button type="button" onClick={() => handleVerifyClick('phone')} className='absolute right-2 top-1/2 -translate-y-1/2 bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-50 uppercase tracking-tight'>Send OTP</button>
                          )}
                        </div>

                        {state === 'Sign Up' && isPhoneVerified && (
                          <p className='mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600'>
                            <CheckCircle2 size={12} /> Phone verified
                          </p>
                        )}

                        {state === 'Sign Up' && showVerificationNag && !isPhoneVerified && !isPhoneFieldTaken && (
                          <p className='mt-2 text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-bounce'>
                            <AlertCircle size={12} /> PLEASE VERIFY PHONE OTP BEFORE SIGNING UP
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className='space-y-1.5'>
                    <label className='text-sm font-semibold text-gray-500'>{state === 'Sign Up' ? "Email" : "Email or phone"}</label>
                    <div className='relative'>
                      <input 
                        className={`w-full bg-gray-50 border rounded-xl p-3.5 text-sm transition-all outline-none ${isAccountTaken && state === 'Sign Up' ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-blue-500'}`}
                        type="text" 
                        onChange={(e) => {
                          const value = e.target.value;
                          const looksLikeEmail = value.includes("@") || /[a-zA-Z]/.test(value);
                          if (state === 'Sign Up') setIsEmailVerified(false);
                          if (state !== 'Sign Up') setPhoneIdToken('');
                          if (looksLikeEmail) {
                            setEmail(value);
                            return;
                          }
                          const digits = value.replace(/\D/g, "").slice(0, 11);
                          setEmail(digits);
                        }} 
                        value={email} 
                        placeholder={state === 'Sign Up' ? "name@example.com" : "Email or Phone Number"} 
                        required 
                      />
                      
                      {state === 'Sign Up' && validateEmail(email) && !isEmailVerified && !isAccountTaken && (
                        <button type="button" onClick={() => handleVerifyClick('default')} className='absolute right-2 top-1/2 -translate-y-1/2 bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-50 uppercase tracking-tight'>Send OTP</button>
                      )}
                    </div>

                    {state === 'Sign Up' && isEmailVerified && (
                      <p className='mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600'>
                        <CheckCircle2 size={12} /> Verified
                      </p>
                    )}

                    {state === 'Sign Up' && isAccountTaken && (
                      <p className='mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1'>
                        <AlertCircle size={12} /> This email is already registered.
                      </p>
                    )}

                    {showForgotEmailField && state === 'Login' && (
                      <div className="mt-4 p-5 bg-white border border-gray-100 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-400">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotEmailField(false);
                              setIsResetMode(false);
                              setVerifiedOtp('');
                              setPhoneIdToken('');
                              setFirebaseConfirmation(null);
                              setFirebasePhoneTarget('');
                              setFirebasePhonePurpose('');
                            }}
                            className="py-3.5 rounded-xl text-[10px] font-extrabold text-gray-400 border border-gray-100 uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                          <button type="button" onClick={handleForgotPassword} disabled={loading} className="bg-[#1A2B32] text-white py-3.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest active:scale-[0.98]">Send Code</button>
                        </div>
                      </div>
                    )}

                    {state === 'Sign Up' && showVerificationNag && !isEmailVerified && !isAccountTaken && (
                      <p className='text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1 animate-bounce'><AlertCircle size={12} /> PLEASE VERIFY OTP BEFORE SIGNING UP</p>
                    )}
                  </div>

                  {!showForgotEmailField && (
                    <div className='space-y-1.5'>
                      <div className='flex justify-between items-center'>
                        <label className='text-sm font-semibold text-gray-500'>Password</label>
                        {state === 'Login' && <button type="button" onClick={() => setShowForgotEmailField(true)} className='text-[11px] text-blue-600 font-bold hover:underline'>Forgot Password?</button>}
                      </div>
                      <div className='relative'>
                        <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:border-blue-500 outline-none' type={showPassword ? "text" : "password"} onChange={(e) => setPassword(e.target.value)} value={password} placeholder="Enter Password" required />
                        <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                      </div>
                    </div>
                  )}

                  {state === 'Sign Up' && (
                    <div className='space-y-1.5'>
                      <label className='text-sm font-semibold text-gray-500'>Confirm password</label>
                      <div className='relative'>
                        <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:border-blue-500 outline-none' type={showConfirmPassword ? "text" : "password"} onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} placeholder="Re-type password" required />
                        <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {state === 'Reset Password' && (
                <div className='space-y-4'>
                   <div className='relative'>
                     <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm' type={showPassword ? "text" : "password"} placeholder="New Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                     <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                   </div>
                   <div className='relative'>
                     <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm' type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} required />
                     <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                   </div>
                </div>
              )}

              {error && !(state === 'Sign Up' && isAccountTaken && error === "This email is already registered.") && <p className='text-[11px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2'><AlertCircle size={14}/> {error}</p>}
              {successMessage && <p className='text-[11px] text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2'><CheckCircle2 size={14}/> {successMessage}</p>}

              {/* ✅ UPDATED BUTTON DISABLED LOGIC */}
              {!showForgotEmailField && (
                <button 
                  disabled={loading || (state === 'Sign Up' && (isAccountTaken || isPhoneFieldTaken))} 
                  type='submit' 
                  className='w-full bg-[#1A2B32] text-white py-4 rounded-xl font-bold text-sm mt-6 hover:bg-black hover:shadow-lg transition-all active:scale-[0.99] disabled:bg-gray-200 disabled:cursor-not-allowed'
                >
                  {loading ? <Loader2 className='animate-spin mx-auto' size={20} /> : (state === 'Reset Password' ? "Update Password" : (state === 'Sign Up' ? "Sign up" : "Log in"))}
                </button>
              )}

              {(state === 'Login' || state === 'Sign Up') && !showForgotEmailField && (
                <>
                  <div className='flex items-center gap-3 mt-6'>
                    <div className='h-px flex-1 bg-gray-100'></div>
                    <span className='text-[10px] font-bold text-gray-300 uppercase tracking-widest'>or</span>
                    <div className='h-px flex-1 bg-gray-100'></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(state === 'Sign Up' ? "signup" : "login")}
                    disabled={googleLoading}
                    className='w-full mt-3 border border-gray-200 bg-white text-gray-700 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed'
                  >
                    {googleLoading ? (
                      <Loader2 className='animate-spin' size={18} />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.23 3.61l6.86-6.86C35.94 2.46 30.47 0 24 0 14.64 0 6.27 5.38 2.1 13.22l8.02 6.23C12.21 13.3 17.68 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.14-3.14-.4-4.5H24v9h12.7c-.58 3.12-2.34 5.77-4.98 7.55l7.62 5.9c4.45-4.11 7.16-10.17 7.16-17.95z"/>
                        <path fill="#FBBC05" d="M10.12 28.45c-.48-1.42-.75-2.94-.75-4.45s.27-3.03.75-4.45l-8.02-6.23C.74 16.23 0 20.05 0 24s.74 7.77 2.1 10.68l8.02-6.23z"/>
                        <path fill="#34A853" d="M24 48c6.47 0 11.94-2.13 15.92-5.78l-7.62-5.9c-2.11 1.42-4.8 2.25-8.3 2.25-6.32 0-11.79-3.8-13.88-9.45l-8.02 6.23C6.27 42.62 14.64 48 24 48z"/>
                      </svg>
                    )}
                    <span>{state === 'Sign Up' ? "Sign up with Google" : "Continue with Google"}</span>
                  </button>
                </>
              )}

              {state !== 'Reset Password' && !showForgotEmailField && (
                <p className='text-center mt-8 text-sm text-gray-400 font-medium'>
                  {state === 'Sign Up' ? "Already have an account?" : "Don't you have an account?"}
                  <button type="button" onClick={() => setState(state === 'Sign Up' ? 'Login' : 'Sign Up')} className='text-blue-600 ml-1 font-bold hover:underline'>{state === 'Sign Up' ? "Log in" : "Sign up"}</button>
                </p>
              )}
            </form>
          </div>
        </div>

        <div className='hidden p-6 lg:block lg:w-[54%] xl:w-[56%]'>
          <div className='relative h-full w-full overflow-hidden rounded-[35px] shadow-inner'>
             <img src={loginVisual} alt="Mercedarian Retreat House" className='absolute inset-0 h-full w-full object-cover' />
             <div className='absolute inset-0 bg-gradient-to-br from-slate-950/45 via-slate-900/15 to-transparent'></div>
             <div className='absolute inset-x-0 bottom-0 p-8'>
               <div className='max-w-sm rounded-[28px] border border-white/20 bg-white/12 p-6 text-white backdrop-blur-md'>
                 <p className='text-[11px] font-bold uppercase tracking-[0.35em] text-white/70'>Mercedarian Retreat House</p>
                 <h3 className='mt-3 text-2xl font-bold leading-tight'>A calm, intentional stay experience from booking to arrival.</h3>
                 <p className='mt-3 text-sm leading-6 text-white/80'>Secure access, clearer verification, and a more cohesive guest journey.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;



