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

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  useEffect(() => {
    setIsDisabled(false);
    setError("");
    setSuccessMessage("");
    setIsEmailVerified(false);
    setShowVerificationNag(false);
    
    if (state !== 'Reset Password') {
        setIsResetMode(false);
    }
  }, [state, email]);

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

  const handleVerifyClick = async () => {
    if (!validateEmail(email)) return setError("Please enter a valid email address");
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + '/api/user/send-otp', { email });
      if (data.success) {
        setIsResetMode(false);
        setShowOtpModal(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) return setError("Please enter your email to reset password");
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + '/api/user/request-reset', { email });
      if (data.success) {
        setIsResetMode(true);
        setShowOtpModal(true);
        setShowForgotEmailField(false); // Hide the extra field once modal opens
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to send reset code. Email might not exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match!");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (!verifiedOtp) return setError("Verification code missing. Please try again.");

    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + '/api/user/reset-password', {
        email: email.toLowerCase().trim(),
        otp: String(verifiedOtp).trim(),
        newPassword: password
      });
      
      if (data.success) {
        toast.success("Password reset successful! Please login.");
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
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsDisabled(false);

    if (!validateEmail(email)) {
      return setError("Please enter a valid email address");
    }

    if (state === 'Sign Up') {
      if (!isEmailVerified) {
        setShowVerificationNag(true);
        return; 
      }
      if (suffixError) return setError("Please provide a valid suffix");
      if (password !== confirmPassword) return setError("Passwords do not match!");
      if (password.length < 8) return setError("Password must be at least 8 characters");
      if (phone.length < 10) return setError("Please enter a valid phone number");
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
          toast.success("Registration successful! Please login.");
          setSuccessMessage("Account created successfully! Please log in.");
          setPassword('');
          setConfirmPassword('');
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
          const msg = data.message.toLowerCase();
          if (msg.includes("verify your email")) {
            setError("Please verify your email before logging in.");
          } else if (msg.includes("disabled") || msg.includes("frozen")) {
            setIsDisabled(true);
          } else {
            setError(data.message);
          }
        }
      }
    } catch (err) {
      setError("Authentication Failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6 font-sans relative'>
      
      {showOtpModal && (
        <VerifyOtp 
          email={email} 
          backendUrl={backendUrl} 
          isResetMode={isResetMode} 
          onClose={() => setShowOtpModal(false)} 
          onSuccess={(otpCode) => {
            const cleanOtp = otpCode.toString().trim();
            setVerifiedOtp(cleanOtp); 
            if (isResetMode) {
                setTimeout(() => { setState('Reset Password'); }, 50);
            } else {
                setIsEmailVerified(true);
            }
          }}
        />
      )}

      <div className='bg-white w-full max-w-6xl rounded-[40px] overflow-hidden flex flex-col lg:flex-row shadow-[0_25px_70px_-15px_rgba(0,0,0,0.1)]'>
        
        <div className='w-full lg:w-[50%] p-10 sm:p-14 flex flex-col justify-center bg-white'>
          <div className='max-w-[400px] mx-auto w-full'>
            
            <div className='mb-8'>
              <h2 className='text-3xl font-bold text-gray-900 flex items-center gap-2 tracking-tight'>
                {state === 'Reset Password' ? "Set New Password" : (state === 'Sign Up' ? "Create Account" : (showForgotEmailField ? "Reset Password" : "Welcome Back"))}
              </h2>
              <p className='text-gray-400 text-sm mt-3 leading-relaxed'>
                {state === 'Reset Password' 
                  ? "Please choose a strong password to secure your account." 
                  : (showForgotEmailField ? "Enter your email to receive a verification code." : `Today is a new day. ${state === 'Sign Up' ? "Join us to start managing your projects." : "Sign in to start managing your projects."}`)}
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
                            {image ? (
                              <img src={URL.createObjectURL(image)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle size={44} className="text-gray-200" />
                            )}
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
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type="text" onChange={(e) => setFirstName(formatName(e.target.value))} value={firstName} required />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Last Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type="text" onChange={(e) => setLastName(formatName(e.target.value))} value={lastName} required />
                        </div>
                      </div>

                      <div className='grid grid-cols-4 gap-4'>
                        <div className='col-span-3 space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Middle Name</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type="text" onChange={(e) => setMiddleName(formatName(e.target.value))} value={middleName} placeholder="Optional" />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Suffix</label>
                          <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type="text" onChange={(e) => handleSuffixChange(e.target.value)} value={suffix} />
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Phone Number</label>
                        <div className='relative flex items-center'>
                          <input 
                            className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' 
                            type="tel" 
                            onChange={(e) => setPhone(formatPhone(e.target.value))} 
                            value={phone} 
                            placeholder="09XX-XXX-XXXX" 
                            required 
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* EMAIL FIELD */}
<div className='space-y-1.5'>
  <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Email</label>
  <div className='relative'>
    <input 
      className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 pr-24 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' 
      type="email" 
      onChange={(e) => setEmail(e.target.value)} 
      value={email} 
      /* Updated Placeholder Logic */
      placeholder={showForgotEmailField ? "Enter email or phone number" : "Email or Phone Number"} 
      required 
    />
                      
                      {state === 'Sign Up' && validateEmail(email) && !isEmailVerified && (
                        <button 
                          type="button" 
                          onClick={handleVerifyClick}
                          className='absolute right-2 top-1/2 -translate-y-1/2 bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-50 transition-colors uppercase tracking-tight'
                        >
                          Send OTP
                        </button>
                      )}
                      {state === 'Sign Up' && isEmailVerified && (
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase'>
                            <Check size={14} /> VERIFIED
                        </div>
                      )}
                    </div>

{showForgotEmailField && state === 'Login' && (
  <div className="mt-4 p-5 bg-white border border-gray-100 rounded-3xl animate-in fade-in slide-in-from-top-2 duration-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
    
    {/* Context Message */}
    <div className="mb-5 px-1">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
        Ready to reset? 
      </p>
      <p className="text-[10px] text-gray-400 mt-1 italic">
        We'll send a 6-digit verification code to the email above.
      </p>
    </div>

    {/* Professional Grid Alignment */}
    <div className="grid grid-cols-2 gap-3">
      <button 
        type="button"
        onClick={() => setShowForgotEmailField(false)}
        className="w-full py-3.5 rounded-xl text-[10px] font-extrabold text-gray-400 border border-gray-100 hover:bg-gray-50 transition-all uppercase tracking-widest"
      >
        Cancel
      </button>
      
      <button 
        type="button" 
        onClick={handleForgotPassword}
        disabled={loading || !validateEmail(email)}
        className="w-full bg-[#1A2B32] text-white py-3.5 rounded-xl text-[10px] font-extrabold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest shadow-sm active:scale-[0.98]"
      >
        {loading ? <Loader2 className="animate-spin" size={14} /> : "Send Code"}
      </button>
    </div>
  </div>
)}

                    {state === 'Sign Up' && showVerificationNag && !isEmailVerified && (
                      <p className='text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1 ml-1 animate-bounce'>
                        <AlertCircle size={12} /> PLEASE VERIFY EMAIL OTP BEFORE SIGNING UP
                      </p>
                    )}
                  </div>

                  {/* ✅ WRAPPED PASSWORD FIELD IN CONDITIONAL: HIDDEN IF showForgotEmailField IS TRUE */}
                  {!showForgotEmailField && (
                    <div className='space-y-1.5'>
                      <div className='flex justify-between items-center'>
                        <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Password</label>
                        {state === 'Login' && (
                          <button 
                            type="button" 
                            onClick={() => setShowForgotEmailField(true)}
                            className='text-[11px] text-blue-600 font-bold hover:underline'
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className='relative'>
                        <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type={showPassword ? "text" : "password"} onChange={(e) => setPassword(e.target.value)} value={password} placeholder="Enter Password" required />
                        <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {state === 'Sign Up' && (
                    <div className='space-y-1.5'>
                      <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Confirm Password</label>
                      <div className='relative'>
                        <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type={showConfirmPassword ? "text" : "password"} onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} placeholder="Re-type password" required />
                        <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {state === 'Reset Password' && (
                <>
                  <div className='space-y-1.5'>
                    <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>New Password</label>
                    <div className='relative'>
                      <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type={showPassword ? "text" : "password"} onChange={(e) => setPassword(e.target.value)} value={password} placeholder="Enter your new password" required />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Confirm New Password</label>
                    <div className='relative'>
                      <input className='w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-500 transition-all outline-none' type={showConfirmPassword ? "text" : "password"} onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} placeholder="Confirm your new password" required />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Form Alerts */}
              {error && <p className='text-[11px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2'><AlertCircle size={14}/> {error}</p>}
              {successMessage && <p className='text-[11px] text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2'><CheckCircle2 size={14}/> {successMessage}</p>}

              {/* ✅ DYNAMIC BUTTON TEXT */}
              {!showForgotEmailField && (
                <button 
                  disabled={loading} 
                  type='submit' 
                  className='w-full bg-[#1A2B32] text-white py-4 rounded-xl font-bold text-sm mt-6 hover:bg-black hover:shadow-lg transition-all active:scale-[0.99] disabled:bg-gray-200'
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

                  <button type="button" className='w-full border border-gray-100 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors'>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className='w-4' alt="Google" />
                    Sign in with Google
                  </button>

                  <p className='text-center mt-8 text-sm text-gray-400 font-medium'>
                    {state === 'Sign Up' ? "Already have an account?" : "Don't you have an account?"}
                    <button type="button" onClick={() => { setState(state === 'Sign Up' ? 'Login' : 'Sign Up'); setError(''); setSuccessMessage(''); setShowForgotEmailField(false); }} className='text-blue-600 ml-1 font-bold hover:underline'>
                      {state === 'Sign Up' ? "Sign in" : "Sign up"}
                    </button>
                  </p>
                </>
              )}

              {(state === 'Reset Password' || showForgotEmailField) && (
                <button type="button" onClick={() => {setState('Login'); setShowForgotEmailField(false);}} className='w-full text-center text-sm text-gray-400 hover:text-blue-600 transition-colors mt-4 font-bold'>
                  Back to Login
                </button>
              )}
            </form>
          </div>
        </div>

        <div className='hidden lg:block lg:w-[50%] p-6'>
          <div 
            className='w-full h-full rounded-[35px] bg-cover bg-center shadow-inner relative overflow-hidden'
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1968&auto=format&fit=crop')` }}
          >
             <div className='absolute inset-0 bg-black/5'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;