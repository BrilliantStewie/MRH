import React, { useState, useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { StaffContext } from "../context/StaffContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import BannerImage from "../assets/login_bg.png"; 

const Login = () => {
  const [state, setState] = useState("Admin"); // 'Admin' or 'Staff'
  
  // 'identifier' stores either Email (for Admin) OR Email/Phone (for Staff)
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { adminLogin } = useContext(AdminContext);
  const { staffLogin } = useContext(StaffContext);
  const navigate = useNavigate();

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      let ok = false;
      if (state === "Admin") {
        // ADMIN: Identifier is strictly an email
        ok = await adminLogin(identifier, password);
        if (ok) {
           navigate("/admin-dashboard");
        }
      } else {
        // STAFF: Identifier can be email OR phone
        ok = await staffLogin(identifier, password);
        if (ok) {
           navigate("/staff-dashboard");
        }
      }
    } catch (error) {
      toast.error(error.message || "Authentication Failed");
    } finally {
        setLoading(false);
    }
  };

  // --- CONFIGURATION ---
  const isAdmin = state === 'Admin';
  
  // Colors
  const activeColor = isAdmin ? 'text-indigo-600' : 'text-gray-800';
  const ringColor = isAdmin ? 'focus:ring-indigo-100' : 'focus:ring-gray-200';
  
  // Dynamic Input Settings
  // Admin = Email Type (Validation), Staff = Text Type (Allows Phone)
  const inputLabel = isAdmin ? "Email Address" : "Email or Phone Number";
  const inputType = isAdmin ? "email" : "text"; 
  const inputPlaceholder = isAdmin ? "name@mercedarian.org" : "e.g. 09171234567 or email@...";

  // Button Gradient
  const buttonGradient = isAdmin 
    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/30' 
    : 'bg-gradient-to-r from-gray-900 to-black hover:shadow-black/30';

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white font-sans">
      
      {/* ---------------- LEFT SIDE: IMAGE (60%) ---------------- */}
      <div className="hidden lg:flex w-[60%] h-full relative">
        <img 
            src={BannerImage} 
            alt="Retreat House" 
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 transition-all duration-700 ${isAdmin ? 'bg-indigo-900/80' : 'bg-black/80'} mix-blend-multiply`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

        <div className="absolute inset-0 flex flex-col justify-between p-16 z-10 text-white">
            <div className="animate-fade-in-down">
                <div className="w-12 h-1 bg-white/80 mb-6 rounded-full"></div>
                <h1 className="text-6xl font-serif font-medium leading-tight shadow-sm">
                   {isAdmin ? 'Stewardship & Leadership.' : 'Service & Sanctuary.'}
                </h1>
                <p className="mt-4 text-lg text-white/80 font-light max-w-md">
                    {isAdmin 
                        ? 'Manage operations, oversee guest experiences, and ensure the retreat runs smoothly.' 
                        : 'Assist in daily operations and provide a welcoming environment for our guests.'}
                </p>
            </div>
            
            <div className="backdrop-blur-md bg-white/10 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-lg transform hover:scale-[1.02] transition-transform duration-500">
                <p className="text-xl font-light text-white/95 leading-relaxed italic">
                   "To serve is to love. Welcome to the digital gateway for managing our retreat operations and guest services."
                </p>
                <div className="mt-6 flex items-center gap-4">
                   <div className="h-px w-12 bg-white/50"></div>
                   <span className="text-xs uppercase tracking-widest font-semibold opacity-80">Mercedarian Retreat House</span>
                </div>
            </div>
        </div>
      </div>

      {/* ---------------- RIGHT SIDE: FORM (40%) ---------------- */}
      <div className="w-full lg:w-[40%] h-full flex flex-col justify-center px-12 xl:px-24 bg-white relative overflow-hidden">
        
        {/* Background blobs */}
        <div className={`absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-10 transition-colors duration-700 ${isAdmin ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
        <div className={`absolute -bottom-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-10 transition-colors duration-700 ${isAdmin ? 'bg-blue-500' : 'bg-gray-400'}`}></div>

        <div className="relative z-10">
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">Welcome Back</h2>
                <p className="text-gray-400 text-sm">
                    Enter your details to access the <span className={`font-semibold transition-colors duration-500 ${activeColor}`}>{state} Panel</span>.
                </p>
            </div>

            <form onSubmit={onSubmitHandler} className="space-y-6">
                
                {/* --- SWITCHER --- */}
                <div className="flex bg-gray-100 p-1.5 rounded-full mb-8 relative">
                    <div 
                        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${isAdmin ? 'left-1.5' : 'left-[50%]'}`}
                    ></div>
                    <button
                        type="button"
                        onClick={() => { setState("Admin"); setIdentifier(""); }} 
                        className={`flex-1 relative z-10 py-3 text-base font-semibold rounded-full transition-colors ${isAdmin ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => { setState("Staff"); setIdentifier(""); }} 
                        className={`flex-1 relative z-10 py-3 text-base font-semibold rounded-full transition-colors ${!isAdmin ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Staff
                    </button>
                </div>

                {/* --- DYNAMIC INPUT (EMAIL vs PHONE) --- */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">
                        {inputLabel}
                    </label>
                    <div className="relative group">
                        <span className={`absolute left-4 top-4 transition-colors duration-300 ${isAdmin ? 'group-focus-within:text-indigo-500' : 'group-focus-within:text-gray-800'} text-gray-400`}>
                            {/* Icon Changes: Mail for Admin, User for Staff */}
                            {isAdmin ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            )}
                        </span>
                        <input 
                            type={inputType}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} focus:shadow-lg transition-all duration-300`}
                            placeholder={inputPlaceholder}
                            required 
                        />
                    </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                    </div>
                    <div className="relative group">
                        <span className={`absolute left-4 top-4 transition-colors duration-300 ${isAdmin ? 'group-focus-within:text-indigo-500' : 'group-focus-within:text-gray-800'} text-gray-400`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} focus:shadow-lg transition-all duration-300`}
                            placeholder="••••••••"
                            required 
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* --- BUTTON --- */}
                <div className="flex justify-center pt-2">
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-72 py-4 rounded-2xl text-white font-bold text-lg tracking-wide shadow-xl shadow-gray-200 transform hover:-translate-y-0.5 transition-all duration-300 ${buttonGradient} disabled:opacity-70`}
                    >
                        {loading ? "Authenticating..." : "Log In"}
                    </button>
                </div>

            </form>

            <div className="mt-12 flex justify-center">
                 <p className="text-xs text-gray-300 text-center max-w-[200px]">
                    Authorized Personnel Only. <br/>© 2024 Mercedarian System
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;