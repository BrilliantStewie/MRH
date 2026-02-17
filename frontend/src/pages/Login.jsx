import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

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

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState(''); // ✅ Added Suffix State
  const [suffixError, setSuffixError] = useState(''); // ✅ Added Suffix Error State
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  // --- VALIDATION & FORMATTING HELPERS ---

  const formatName = (val) => {
    const cleaned = val.replace(/[^a-zA-Z\s-]/g, ''); 
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ✅ Added Suffix Formatter & Validator
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

  const formatPhone = (val) => {
    return val.replace(/\D/g, '');
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // --- HANDLERS ---

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email address");
    }

    if (state === 'Sign Up') {
      if (suffixError) {
        return toast.error("Please provide a valid suffix (e.g., Jr., Sr., III)");
      }
      if (password !== confirmPassword) {
        return toast.error("Passwords do not match!");
      }
      if (password.length < 8) {
        return toast.error("Password must be at least 8 characters");
      }
      if (phone.length < 10) {
        return toast.error("Please enter a valid phone number");
      }
    }

    setLoading(true);

    try {
      if (state === 'Sign Up') {
        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('middleName', middleName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('suffix', suffix.trim()); // ✅ Added to FormData
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone', phone);
        if (image) formData.append('image', image);

        const { data } = await axios.post(backendUrl + '/api/user/register', formData);
        
        if (data.success) {
          toast.success("Account created! Please login with your credentials.");
          setState('Login');
          setPassword('');
          setConfirmPassword('');
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(backendUrl + '/api/user/login', { email, password });
        
        if (data.success) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
          toast.success("Login successful");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center py-10 px-4'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-[500px] border rounded-2xl text-zinc-600 text-sm shadow-xl bg-white transition-all'>
        
        <div className='w-full text-center mb-4'>
          <p className='text-3xl font-bold text-zinc-800'>{state === 'Sign Up' ? "Create Account" : "Login"}</p>
          <p className='text-zinc-500 mt-1'>Please {state === 'Sign Up' ? "sign up" : "log in"} to book an appointment</p>
        </div>

        {state === 'Sign Up' && (
          <div className="w-full flex justify-center mb-4">
            <label htmlFor="profile-pic" className="cursor-pointer relative group">
              <div className="w-24 h-24 rounded-full border-4 border-zinc-100 overflow-hidden bg-zinc-50 flex items-center justify-center shadow-inner">
                {image ? (
                  <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-zinc-300" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                <Camera size={14} />
              </div>
              <input type="file" id="profile-pic" hidden onChange={(e) => setImage(e.target.files[0])} accept="image/*" />
            </label>
          </div>
        )}

        <div className='w-full flex flex-col gap-4'>
          {state === 'Sign Up' && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1'>
                  <label className='font-semibold ml-1'>First Name</label>
                  <input className='border border-zinc-200 rounded-lg w-full p-2.5 outline-blue-500' type="text" onChange={(e) => setFirstName(formatName(e.target.value))} value={firstName} placeholder="John" required />
                </div>
                <div className='flex flex-col gap-1'>
                  <label className='font-semibold ml-1'>Last Name</label>
                  <input className='border border-zinc-200 rounded-lg w-full p-2.5 outline-blue-500' type="text" onChange={(e) => setLastName(formatName(e.target.value))} value={lastName} placeholder="Doe" required />
                </div>
              </div>
              
              {/* ✅ Added Middle Name and Suffix Grid */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='md:col-span-2 flex flex-col gap-1'>
                  <label className='font-semibold ml-1'>Middle Name (Optional)</label>
                  <input className='border border-zinc-200 rounded-lg w-full p-2.5 outline-blue-500' type="text" onChange={(e) => setMiddleName(formatName(e.target.value))} value={middleName} placeholder="Quincy" />
                </div>
                <div className='flex flex-col gap-1'>
                  <label className='font-semibold ml-1'>Suffix</label>
                  <input 
                    className={`border rounded-lg w-full p-2.5 outline-blue-500 ${suffixError ? 'border-red-500 bg-red-50' : 'border-zinc-200'}`} 
                    type="text" 
                    onChange={(e) => handleSuffixChange(e.target.value)} 
                    value={suffix} 
                    placeholder="Jr." 
                    maxLength={8}
                  />
                </div>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='font-semibold ml-1'>Phone Number</label>
                <input className='border border-zinc-200 rounded-lg w-full p-2.5 outline-blue-500' type="tel" onChange={(e) => setPhone(formatPhone(e.target.value))} value={phone} placeholder="09123456789" required />
              </div>
            </>
          )}

          <div className='flex flex-col gap-1'>
            <label className='font-semibold ml-1'>Email</label>
            <input className='border border-zinc-200 rounded-lg w-full p-2.5 outline-blue-500' type="email" onChange={(e) => setEmail(e.target.value)} value={email} placeholder="example@email.com" required />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='font-semibold ml-1'>Password</label>
            <div className='relative'>
              <input className='border border-zinc-200 rounded-lg w-full p-2.5 pr-10 outline-blue-500' type={showPassword ? "text" : "password"} onChange={(e) => setPassword(e.target.value)} value={password} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {state === 'Sign Up' && (
            <div className='flex flex-col gap-1'>
              <label className='font-semibold ml-1'>Confirm Password</label>
              <div className='relative'>
                <input className='border border-zinc-200 rounded-lg w-full p-2.5 pr-10 outline-blue-500' type={showConfirmPassword ? "text" : "password"} onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          disabled={loading} 
          type='submit' 
          className='bg-blue-600 text-white w-full py-3 rounded-xl text-base font-bold hover:bg-blue-700 transition-all mt-6 flex justify-center items-center shadow-md active:scale-[0.98]'
        >
          {loading ? <Loader2 className='animate-spin' size={20} /> : (state === 'Sign Up' ? "Create Account" : "Login")}
        </button>

        <div className='w-full text-center mt-4'>
          {state === 'Sign Up' ? (
            <p>Already have an account? <span onClick={() => { setState('Login'); setPassword(''); setConfirmPassword(''); }} className='text-blue-600 font-bold underline cursor-pointer hover:text-blue-800'>Login here</span></p>
          ) : (
            <p>Create a new account? <span onClick={() => { setState('Sign Up'); setPassword(''); }} className='text-blue-600 font-bold underline cursor-pointer hover:text-blue-800'>Click here</span></p>
          )}
        </div>
      </div>
    </form>
  );
};

export default Login;