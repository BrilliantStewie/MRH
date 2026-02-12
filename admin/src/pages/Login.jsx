import React, { useState, useContext, useEffect } from "react";
import { AdminContext } from "../context/AdminContext";
import { StaffContext } from "../context/StaffContext";
import { useNavigate } from "react-router-dom";
// Toast import removed
import BannerImage from "../assets/login_bg.png"; 

const Login = () => {
  const [state, setState] = useState("Admin"); 
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Inline error state for disabled accounts
  const [isDisabled, setIsDisabled] = useState(false);
  // General error state for "Invalid Credentials" since toasts are removed
  const [error, setError] = useState("");

  const { adminLogin } = useContext(AdminContext);
  const { staffLogin } = useContext(StaffContext);
  const navigate = useNavigate();

  // Reset errors when switching roles or typing
  useEffect(() => {
    setIsDisabled(false);
    setError("");
  }, [state, identifier, password]);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setIsDisabled(false);
    setError("");

    try {
      if (state === "Admin") {
        const ok = await adminLogin(identifier, password);
        if (ok) {
          navigate("/admin-dashboard");
        } else {
          setError("Invalid admin credentials");
        }
      } else {
        // STAFF LOGIN
        const response = await staffLogin(identifier, password);
        
        if (response && response.success) {
            navigate("/staff-dashboard");
        } else if (response && response.message) {
            const msg = response.message.toLowerCase();
            
            if (msg.includes("disabled") || msg.includes("frozen")) {
                setIsDisabled(true);
            } else {
                setError(response.message);
            }
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "";
      if (errMsg.toLowerCase().includes("disabled") || errMsg.toLowerCase().includes("frozen")) {
        setIsDisabled(true);
      } else {
        setError("Authentication Failed");
      }
    } finally {
        setLoading(false);
    }
  };

  const isAdmin = state === 'Admin';
  const activeColor = isAdmin ? 'text-indigo-600' : 'text-gray-800';
  const ringColor = isAdmin ? 'focus:ring-indigo-100' : 'focus:ring-gray-200';
  const inputLabel = isAdmin ? "Email Address" : "Email or Phone Number";
  const inputType = isAdmin ? "email" : "text"; 
  const inputPlaceholder = isAdmin ? "name@mercedarian.org" : "e.g. 09171234567 or email@...";

  const buttonGradient = isAdmin 
    ? 'bg-gradient-to-r from-indigo-600 to-blue-600' 
    : 'bg-gradient-to-r from-gray-900 to-black';

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white font-sans">
      
      {/* ---------------- LEFT SIDE: IMAGE (60%) ---------------- */}
      <div className="hidden lg:flex w-[60%] h-full relative">
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
      <div className="w-full lg:w-[40%] h-full flex flex-col justify-center px-12 xl:px-24 bg-white relative">
        <div className="relative z-10">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">Welcome Back</h2>
                <p className="text-gray-400 text-sm">
                    Enter details to access the <span className={`font-semibold ${activeColor}`}>{state} Panel</span>.
                </p>
            </div>

            <form onSubmit={onSubmitHandler} className="space-y-6">
                
                <div className="flex bg-gray-100 p-1.5 rounded-full mb-8 relative">
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-white shadow-sm transition-all duration-300 ${isAdmin ? 'left-1.5' : 'left-[50%]'}`}></div>
                    <button type="button" onClick={() => setState("Admin")} className={`flex-1 relative z-10 py-3 text-base font-semibold rounded-full transition-colors ${isAdmin ? 'text-indigo-700' : 'text-gray-500'}`}>Admin</button>
                    <button type="button" onClick={() => setState("Staff")} className={`flex-1 relative z-10 py-3 text-base font-semibold rounded-full transition-colors ${!isAdmin ? 'text-gray-900' : 'text-gray-500'}`}>Staff</button>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">{inputLabel}</label>
                    <input 
                        type={inputType}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={`w-full px-6 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} transition-all`}
                        placeholder={inputPlaceholder}
                        required 
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full px-6 py-3.5 bg-gray-50 border-transparent rounded-2xl text-gray-700 focus:bg-white focus:outline-none focus:ring-4 ${ringColor} transition-all`}
                            placeholder="••••••••"
                            required 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {/* --- ERROR MESSAGE (Invalid Credentials) --- */}
                {error && !isDisabled && (
                    <div className="text-red-500 text-sm font-medium ml-1">
                        ⚠️ {error}
                    </div>
                )}

                {/* --- DISABLED WARNING BOX --- */}
                {isDisabled && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm font-bold text-red-800">Account Disabled</p>
                                <p className="text-xs text-red-600 mt-0.5">Please contact the administrator for assistance.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center pt-2">
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl text-white font-bold text-lg tracking-wide shadow-lg transition-all ${buttonGradient} disabled:opacity-70`}
                    >
                        {loading ? "Verifying..." : "Log In"}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Login;