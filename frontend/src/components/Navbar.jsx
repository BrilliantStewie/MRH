import React, { useContext, useState, useEffect } from "react";
import { assets } from "../assets/assets";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import {
  Menu, X, User, LogOut, Calendar, ArrowRight, Bell, Trash2, Check
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, userData, backendUrl } = useContext(AppContext);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);

  /* ==========================================
     NOTIFICATION LOGIC
  ========================================== */
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications`, {
        headers: { token }
      });
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read/${id}`, {}, {
        headers: { token }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Set up an interval to poll for new notifications every 60s
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  /* ==========================================
     NAVBAR UI LOGIC
  ========================================== */
  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
    navigate("/login");
  };

  const userProfileImage = userData?.image;
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
    setShowNotifications(false);
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
          
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => navigate("/")}>
            <img src={assets.logo} alt="logo" className="w-10 object-contain" />
          </div>

          <ul className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <li key={link.name}>
                <NavLink to={link.path} className={({ isActive }) => `text-[11px] font-extrabold uppercase tracking-[0.15em] transition-colors duration-200 ${isActive ? "text-slate-900 border-b-2 border-slate-900 pb-1" : "text-slate-500 hover:text-slate-800"}`}>
                  {link.name}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 md:gap-5">
            
            {/* 🔔 NOTIFICATION BELL */}
            {token && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                  }}
                  className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</h4>
                      {unreadCount > 0 && <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <p className="text-xs text-slate-400">All caught up!</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n._id} 
                            onClick={() => {
                              markAsRead(n._id);
                              if(n.link) navigate(n.link);
                            }}
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-blue-50/20' : ''}`}
                          >
                            {!n.isRead && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                            <p className="text-[11px] text-slate-700 leading-normal mb-1">{n.message}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => navigate("/retreat-booking")} className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all shadow-lg active:scale-95">
              Book Retreat <ArrowRight size={14} className="opacity-70"/>
            </button>

            {token ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileMenu((p) => !p);
                    setShowNotifications(false);
                  }}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center bg-slate-50"
                >
                  {userProfileImage ? <img src={userProfileImage} alt="profile" className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Signed in as</p>
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
              <button onClick={() => navigate("/login")} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all">
                Login
              </button>
            )}

            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden text-slate-900">
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {showMobileMenu && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl p-4 flex flex-col gap-2">
             {navLinks.map((link) => (
                <NavLink key={link.name} to={link.path} onClick={() => setShowMobileMenu(false)} className={({ isActive }) => `block px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest ${isActive ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}>
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