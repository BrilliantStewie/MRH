import React, { useContext, useState, useEffect } from "react";
import { assets } from "../../assets/assets"; 
import { useNavigate, useLocation } from "react-router-dom";
import { StaffContext } from "../../context/StaffContext";
import { User, LogOut, UserCircle } from "lucide-react";

const StaffNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { sToken, staffData, staffLogout, backendUrl } = useContext(StaffContext);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [imgError, setImgError] = useState(false); 

  // Close dropdown automatically when changing pages
  useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname]);

  // Reset image error state when staffData changes
  useEffect(() => {
    setImgError(false);
  }, [staffData]);

  const handleLogout = () => {
    staffLogout(); 
    navigate("/");
  };

  // ✅ FIXED: Grabs your full first name (e.g., "Ken Melvin") but leaves out the last name
  const firstName = staffData?.firstName || staffData?.name?.split('|')[0] || "Staff";

  if (!sToken) return null; 

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 py-3 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-8">
        
        {/* --- LEFT: BRANDING --- */}
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

        {/* --- RIGHT: PROFILE SECTION --- */}
        <div className="flex items-center gap-4">
          
         

         

          {/* Profile Circle Button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center bg-slate-50"
            >
              {staffData?.image && !imgError ? (
                <img 
                  src={staffData.image.startsWith('http') ? staffData.image : `${backendUrl}/${staffData.image}`} 
                  alt="profile" 
                  className="w-full h-full object-cover" 
                  onError={() => setImgError(true)} 
                />
              ) : (
                <User size={20} className="text-slate-400" />
              )}
            </button>

            {/* --- DROPDOWN MENU --- */}
{showProfileMenu && (
  <>
    {/* Click-away backdrop */}
    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
    
    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
      
      {/* "SIGNED IN AS" Header */}
      <div className="px-5 py-3 border-b border-slate-50 mb-1 bg-slate-50/50 rounded-t-2xl">
          {/* Changed text to uppercase and added tracking for style */}
          <p className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-wider">
            Signed In As
          </p>
          <p className="text-sm font-bold text-slate-800 truncate">
            {firstName}
          </p>
      </div>

      <button 
        onClick={() => navigate("/Staff-profile")} 
        className="w-full text-left px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
      >
        <UserCircle size={16} className="text-emerald-500"/> My Profile
      </button>

      <div className="h-px bg-slate-100 my-1 mx-3"></div>

      <button 
        onClick={handleLogout} 
        className="w-full text-left px-5 py-3 text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
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