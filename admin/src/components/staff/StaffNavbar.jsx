import React, { useContext, useState, useEffect } from "react";
import { assets } from "../../assets/assets"; 
import { useNavigate, useLocation } from "react-router-dom";
import { StaffContext } from "../../context/StaffContext";
import { User, LogOut, UserCircle } from "lucide-react";

const StaffNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutStaff, staffData } = useContext(StaffContext);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close dropdown automatically when changing pages
  useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logoutStaff();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 py-3 shadow-sm">
      {/* Container with "px-4" instead of "max-w-7xl" to keep items at the far edges */}
      <div className="flex items-center justify-between px-4 sm:px-8">
        
        {/* --- LEFT MOST: BRANDING --- */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none" 
          onClick={() => navigate('/Staff-dashboard')}
        >
          <img 
            src={assets.logo} 
            alt="Logo" 
            className="w-11 h-11 object-contain transition-transform group-hover:scale-105" 
          />
          <div className="flex flex-col justify-center">
            <h1 className="text-[15px] font-black text-slate-800 uppercase tracking-tight leading-none">
              Mercedarian Retreat House
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md w-fit bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest mt-1">
              Staff Panel
            </span>
          </div>
        </div>

        {/* --- RIGHT SIDE: NAME & PROFILE BUTTON --- */}
        <div className="flex items-center gap-4">
          
          {/* Staff Name & Status */}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-700 leading-none mb-1">
              {staffData?.name || "Staff Member"}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">
              Staff Logged in
            </p>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

          {/* Profile Button (Trigger) */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center justify-center rounded-full transition-all active:scale-90"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-emerald-500 ring-2 ring-emerald-50 shadow-md">
                {/* Image check: fallback to Person Icon if no image */}
                {staffData?.image ? (
                  <img 
                    src={staffData.image} 
                    alt="profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={22} className="text-emerald-600" />
                )}
              </div>
            </button>

            {/* --- DROPDOWN MENU --- */}
            {showProfileMenu && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-2 border-b border-slate-50 mb-1 bg-slate-50/50">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Account</p>
                  </div>

                  <button 
                    onClick={() => navigate("/Staff-profile")} 
                    className="w-full text-left px-5 py-3 text-[11px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                  >
                    <UserCircle size={16} className="text-emerald-500"/> My Profile
                  </button>

                  <div className="h-px bg-slate-100 my-1 mx-3"></div>

                  <button 
                    onClick={handleLogout} 
                    className="w-full text-left px-5 py-3 text-[11px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut size={16}/> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
};

export default StaffNavbar;