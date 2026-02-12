import React, { useContext, useState, useEffect } from "react";
import { assets } from "../assets/assets";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import {
  Menu, X, User, LogOut, Calendar, ArrowRight, ChevronDown
} from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, userData } = useContext(AppContext);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
    navigate("/login");
  };

  const userProfileImage = userData?.image;

  // --- LOGIC TO GET ONLY THE FIRST NAME ---
  // This takes "John Quincy Doe" and returns "John"
  const firstName = userData?.firstName 
    ? userData.firstName 
    : userData?.name?.split(' ')[0] || "User";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "HOME", path: "/" },
    { name: "ROOMS", path: "/rooms" },
    { name: "ABOUT", path: "/about" },
    { name: "CONTACT", path: "/contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white shadow-sm py-4 border-b border-slate-100"
            : "bg-transparent py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-12">
          
          {/* --- LOGO --- */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            <img src={assets.logo} alt="logo" className="w-10 object-contain" />
          </div>

          {/* --- CENTER LINKS --- */}
          <ul className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <li key={link.name}>
                <NavLink
                  to={link.path}
                  className={({ isActive }) =>
                    `text-[11px] font-extrabold uppercase tracking-[0.15em] transition-colors duration-200 ${
                      isActive ? "text-slate-900 border-b-2 border-slate-900 pb-1" : "text-slate-500 hover:text-slate-800"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* --- RIGHT SIDE ACTIONS --- */}
          <div className="flex items-center gap-5">
            
            <button 
              onClick={() => navigate("/retreat-booking")}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Book Retreat <ArrowRight size={14} className="opacity-70"/>
            </button>

            {/* PROFILE SECTION */}
            {token ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu((p) => !p)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-slate-300 transition-colors focus:ring-2 focus:ring-slate-100 focus:ring-offset-2 flex items-center justify-center bg-slate-50"
                >
                  {userProfileImage ? (
                    <img
                      src={userProfileImage}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-slate-400" />
                  )}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Signed in as</p>
                      {/* UPDATED TO DISPLAY ONLY FIRST NAME */}
                      <p className="text-sm font-bold truncate text-slate-900">{firstName}</p>
                    </div>
                    
                    <button onClick={() => navigate("/my-profile")} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                        <User size={14}/> My Profile
                    </button>
                    <button onClick={() => navigate("/my-bookings")} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                        <Calendar size={14}/> My Bookings
                    </button>
                    
                    <div className="h-px bg-slate-100 my-1 mx-4"></div>
                    
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={14}/> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                 onClick={() => navigate("/login")}
                 className="px-6 py-2.5 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all"
              >
                  Login
              </button>
            )}

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden text-slate-900"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {showMobileMenu && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl p-4 flex flex-col gap-2">
             {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest ${
                      isActive ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;