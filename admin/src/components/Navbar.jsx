// src/components/Navbar.jsx
import React, { useContext } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../context/AdminContext.jsx";
import { StaffContext } from "../context/StaffContext.jsx";

const Navbar = () => {
  const navigate = useNavigate();

  const { aToken, adminData, logoutAdmin } = useContext(AdminContext);
  const { sToken, staffData, logoutStaff } = useContext(StaffContext);

  const isAdmin = !!aToken;
  const isStaff = !!sToken;

  const handleLogout = () => {
    if (isAdmin) logoutAdmin();
    if (isStaff) logoutStaff();
    navigate("/");
  };

  const displayName = isAdmin
    ? adminData?.name || "Administrator"
    : staffData?.name || "Staff Member";

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Left Side: Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            {/* Using your specific logo asset */}
            <img 
              src={assets.logo} 
              alt="Logo" 
              className="w-12 h-12 object-contain" 
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-gray-800 leading-tight">
                Mercedarian Retreat House
              </h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md w-fit mt-0.5 ${
                isAdmin 
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}>
                {isAdmin ? "Admin Panel" : "Staff Panel"}
              </span>
            </div>
          </div>

          {/* Right Side: User Profile & Logout */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-700">{displayName}</p>
              <p className="text-xs text-gray-500">Logged in</p>
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors duration-200"
            >
              <span>Logout</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor" 
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;