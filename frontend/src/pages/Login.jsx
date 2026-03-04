import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Eye, EyeOff, Loader2, Info, Mail, ShieldCheck, Lock, Phone, UserCircle, ChevronRight, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
// ✅ IMPORT THE COMPONENT
import VerifyOtp from './VerifyOtp'; 

// ✅ VALIDATION CONSTANTS
const TEXT_SUFFIXES = ["Jr.", "Sr."];
const ROMAN_REGEX = /^(X{0,3})(IX|IV|V?I{0,3})$|^XL[IXV]{0,3}$|^L[X]{0,3}[IXV]{0,3}$|^XC[IXV]{0,3}$|^C$/i;

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext);
  const navigate = useNavigate();

  const [state, setState] = useState('Login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showVerificationNag, setShowVerificationNag] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false); 
  const [isResetMode, setIsResetMode] = useState(false); 
  const [verifiedOtp, setVerifiedOtp] = useState(''); 

  // New state for Forgot Password flow
  const [showForgotEmailField, setShowForgotEmailField] = useState(false);

  // Error & Success States
  const [isDisabled, setIsDisabled] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  useEffect(() => {
    setIsDisabled(false);
    setError("");
    setSuccessMessage("");
    setIsEmailVerified(false);
    setShowVerificationNag(false);
    setIsAccountTaken(false);
    setIsPhoneFieldTaken(false); // Reset
    
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
    const cleaned = val.replace(/[^a-zA-Z\s-]/g, ''); 
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      window.location.href = `${backendUrl}/api/user/google-auth`; 
    } catch (err) {
      setError("Google Sign-In failed.");
      setLoading(false);
    }
  };

  const handleVerifyClick = async (type = 'default') => {
    const targetValue = (type === 'phone') ? phone : email;
    const isEmail = validateEmail(targetValue);
    const isPhone = /^(09)\d{9}$/.test(targetValue);

    // Block if the specific input being verified is already taken
    if (state === 'Sign Up') {
      if (type === 'phone' && isPhoneFieldTaken) return;
      if (type === 'default' && isAccountTaken) return;
    }

    if (state === 'Sign Up' && type === 'default' && !isEmail) {
      return setError("Registration requires a valid email address.");
    }

    if (state === 'Sign Up' && type === 'phone' && !isPhone) {
      return setError("Please enter a valid 11-digit phone number (09XXXXXXXXX).");
    }
    
    setError("");
    setLoading(true);
    try {
      const endpoint = isEmail ? '/api/user/send-otp' : '/api/user/send-phone-otp';
      const payload = isEmail ? { email: targetValue } : { phone: targetValue };
      const { data } = await axios.post(backendUrl + endpoint, payload);
      
      if (data.success) {
        if (showForgotEmailField) setIsResetMode(true);
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
    const isPhone = /^(09)\d{9}$/.test(email);
    if (!isEmail && !isPhone) return setError("Please enter a valid email or 11-digit phone number.");
    
    setError("");
    setLoading(true);
    try {
      const endpoint = isEmail ? '/api/user/request-reset' : '/api/user/request-phone-reset'; 
      const payload = isEmail ? { email } : { phone: email };
      const { data } = await axios.post(backendUrl + endpoint, payload);
      
      if (data.success) {
        setIsResetMode(true);
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

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match!");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (!verifiedOtp) return setError("Verification code missing.");

    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + '/api/user/reset-password', {
        email: email.toLowerCase().trim(),
        otp: String(verifiedOtp).trim(),
        newPassword: password
      });
      
      if (data.success) {
        toast.success("Password reset successful!");
        setSuccessMessage("Password reset successful! You can now log in.");
        setState('Login');
        setPassword('');
        setConfirmPassword('');
        setVerifiedOtp(''); 
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
        if (image) formData.append('image', image);

        const { data } = await axios.post(backendUrl + '/api/user/register', formData);
        if (data.success) {
          toast.success("Registration successful!");
          setState('Login');
        } else {
          setError(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/user/login', { email, password });
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      setError("Authentication Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6 font-sans relative'>
      
      {showOtpModal && (
        <VerifyOtp 
          email={email} 
          phone={phone}
          backendUrl={backendUrl} 
          isResetMode={isResetMode} 
          onClose={() => setShowOtpModal(false)} 
          onSuccess={(otpCode) => {
            setVerifiedOtp(otpCode.toString().trim()); 
            isResetMode ? setTimeout(() => setState('Reset Password'), 50) : setIsEmailVerified(true);
          }}
        />
      )}

      <div className='bg-white w-full max-w-6xl rounded-[40px] overflow-hidden flex flex-col lg:flex-row shadow-[0_25px_70px_-15px_rgba(0,0,0,0.1)]'>
        <div className='w-full lg:w-[50%] p-10 sm:p-14 flex flex-col justify-center bg-white'>
          <div className='max-w-[400px] mx-auto w-full'>
            <div className='mb-8'>
              <h2 className='text-3xl font-bold text-gray-900 tracking-tight'>
                {state === 'Reset Password' ? "Set New Password" : (state === 'Sign Up' ? "Create Account" : (showForgotEmailField ? "Reset Password" : "Welcome Back"))}
              </h2>
              <p className='text-gray-400 text-sm mt-3 leading-relaxed'>
                {state === 'Reset Password' ? "Please choose a strong password." : (showForgotEmailField ? "Enter your email or phone to receive a code." : `Today is a new day. ${state === 'Sign Up' ? "Join us to start managing." : "Sign in to start managing."}`)}
              </p>
            </div>

            <form onSubmit={state === 'Reset Password' ? handleResetSubmit : onSubmitHandler} className='space-y-4'>
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

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>First Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => setFirstName(formatName(e.target.value))} value={firstName} required />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Last Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none' type="text" onChange={(e) => setLastName(formatName(e.target.value))} value={lastName} required />
                        </div>
                      </div>

                      <div className='grid grid-cols-4 gap-4'>
                        <div className='col-span-3 space-y-1.5'>
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
                            onChange={(e) => setPhone(formatPhone(e.target.value))} 
                            value={phone} 
                            placeholder="09XX-XXX-XXXX" 
                            required 
                          />
                          {state === 'Sign Up' && phone.length === 11 && !isPhoneFieldTaken && (
                            <button type="button" onClick={() => handleVerifyClick('phone')} className='absolute right-2 top-1/2 -translate-y-1/2 bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-50 uppercase tracking-tight'>Send OTP</button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className='space-y-1.5'>
                    <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>{state === 'Sign Up' ? "Email" : "Email or Phone"}</label>
                    <div className='relative'>
                      <input 
                        className={`w-full bg-gray-50 border rounded-xl p-3.5 text-sm transition-all outline-none ${isAccountTaken && state === 'Sign Up' ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-blue-500'}`}
                        type="text" 
                        onChange={(e) => setEmail(e.target.value.startsWith('0') ? e.target.value.replace(/\D/g, '').slice(0, 11) : e.target.value)} 
                        value={email} 
                        placeholder={state === 'Sign Up' ? "Enter email" : "09XXXXXXXXX or Email"} 
                        required 
                      />
                      
                      {((state === 'Sign Up' && validateEmail(email)) || (showForgotEmailField && (validateEmail(email) || /^(09)\d{9}$/.test(email)))) && !isEmailVerified && !isAccountTaken && (
                        <button type="button" onClick={() => handleVerifyClick('default')} className='absolute right-2 top-1/2 -translate-y-1/2 bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-50 uppercase tracking-tight'>Send OTP</button>
                      )}
                      
                      {state === 'Sign Up' && isEmailVerified && (
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase'><Check size={14} /> VERIFIED</div>
                      )}
                    </div>

                    {showForgotEmailField && state === 'Login' && (
                      <div className="mt-4 p-5 bg-white border border-gray-100 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-400">
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setShowForgotEmailField(false)} className="py-3.5 rounded-xl text-[10px] font-extrabold text-gray-400 border border-gray-100 uppercase tracking-widest">Cancel</button>
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
                        <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Password</label>
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
                      <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Confirm Password</label>
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
                   <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm' type="password" placeholder="New Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                   <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm' type="password" placeholder="Confirm New Password" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} required />
                </div>
              )}

              {error && <p className='text-[11px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2'><AlertCircle size={14}/> {error}</p>}
              {successMessage && <p className='text-[11px] text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2'><CheckCircle2 size={14}/> {successMessage}</p>}

              {/* ✅ UPDATED BUTTON DISABLED LOGIC */}
              {!showForgotEmailField && (
                <button 
                  disabled={loading || (state === 'Sign Up' && (isAccountTaken || isPhoneFieldTaken))} 
                  type='submit' 
                  className='w-full bg-[#1A2B32] text-white py-4 rounded-xl font-bold text-sm mt-6 hover:bg-black hover:shadow-lg transition-all active:scale-[0.99] disabled:bg-gray-200 disabled:cursor-not-allowed'
                >
                  {loading ? <Loader2 className='animate-spin mx-auto' size={20} /> : (state === 'Reset Password' ? "Update Password" : (state === 'Sign Up' ? "Sign up" : "Sign in"))}
                </button>
              )}

              {state !== 'Reset Password' && !showForgotEmailField && (
                <>
                  <div className='relative py-4 flex items-center'>
                    <div className='flex-grow border-t border-gray-100'></div>
                    <span className='px-4 text-[10px] text-gray-300 font-bold uppercase tracking-widest'>Or</span>
                    <div className='flex-grow border-t border-gray-100'></div>
                  </div>
                  <button type="button" onClick={handleGoogleSignIn} className='w-full border border-gray-200 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]'>
                    <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className='w-5 h-5' alt="Google" />
                    <span className="text-gray-700">Sign in with Google</span>
                  </button>
                  <p className='text-center mt-8 text-sm text-gray-400 font-medium'>
                    {state === 'Sign Up' ? "Already have an account?" : "Don't you have an account?"}
                    <button type="button" onClick={() => setState(state === 'Sign Up' ? 'Login' : 'Sign Up')} className='text-blue-600 ml-1 font-bold hover:underline'>{state === 'Sign Up' ? "Sign in" : "Sign up"}</button>
                  </p>
                </>
              )}
            </form>
          </div>
        </div>

        <div className='hidden lg:block lg:w-[50%] p-6'>
          <div className='w-full h-full rounded-[35px] bg-cover bg-center shadow-inner relative overflow-hidden' style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1968&auto=format&fit=crop')` }}>
             <div className='absolute inset-0 bg-black/5'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;