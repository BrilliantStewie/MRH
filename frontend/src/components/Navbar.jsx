import React, { useContext, useState, useEffect } from "react";
import { assets } from "../assets/assets";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import {
  Menu,
  X,
  User,
  LogOut,
  Calendar,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MessageSquare,
  Shield,
  CreditCard,
  Star,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDatePHT } from "../utils/dateTime";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, userData, backendUrl } = useContext(AppContext);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  /* ==========================================
     NAVBAR UI LOGIC
  ========================================== */
  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
    navigate("/login");
  };

  const openLogoutConfirm = () => {
    setShowLogoutConfirm(true);
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowMobileMenu(false);
  };

  /* ==========================================
     NOTIFICATION LOGIC
  ========================================== */
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications/get`, {
        headers: { token }
      });
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      // ✅ Handle Security Rejections (401/403) from authUser middleware
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error(err.response.data.message || "Session expired");
        logout();
      }
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read/${id}`, {}, {
        headers: { token }
      });
      fetchNotifications();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      console.error(err);
    }
  };

  const deleteNotification = async () => {
    if (!notificationToDelete) return;
    try {
      await axios.delete(`${backendUrl}/api/notifications/${notificationToDelete}`, {
        headers: { token }
      });
      setNotificationToDelete(null);
      fetchNotifications();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      console.error(err);
    }
  };

  const clearNotifications = async () => {
    try {
      await axios.delete(`${backendUrl}/api/notifications/clear`, {
        headers: { token }
      });
      setNotifications([]);
      setShowAllNotifications(false);
      setShowClearConfirm(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read-all`, {}, {
        headers: { token }
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logout();
      console.error(err);
    }
  };

  // ✅ Unified effect for Notifications
  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [token, backendUrl]);

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;
  const displayedNotifications = showAllNotifications ? notifications : notifications.slice(0, 5);
  const unreadBadgeText = unreadCount > 9 ? "9+" : unreadCount;
  const totalBadgeText = notifications.length > 99 ? "99+" : notifications.length;

  const formatNotificationDate = (createdAt) => {
    return formatDatePHT(createdAt, {
      month: "short",
      day: "numeric",
    });
  };

  const getNotificationSenderName = (notification) => {
    const sender = notification?.sender;
    if (!sender || typeof sender !== "object") return "";

    return [sender.firstName, sender.middleName, sender.lastName, sender.suffix]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
  };

  const getNotificationMeta = (notification) => {
    const rawMessage = notification?.message?.trim() || "";
    const senderName = getNotificationSenderName(notification);
    const reviewStars = rawMessage.match(/(\d+)-star/i)?.[1];

    switch (notification?.type) {
      case "booking_update":
        return {
          title: /approved/i.test(rawMessage) ? "Booking Approved" : "Booking Update",
          message: /approved/i.test(rawMessage)
            ? "Your booking was approved."
            : rawMessage || "Your booking was updated.",
          Icon: Calendar,
          link: "/my-bookings",
          accentClass: "border-l-blue-500",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-blue-50 text-blue-600",
        };
      case "new_review":
        return {
          title: "New Review",
          message: senderName
            ? `${senderName} submitted${reviewStars ? ` a ${reviewStars}-star` : " a"} review.`
            : rawMessage || "A new review was posted.",
          Icon: Star,
          link: "/reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-amber-50 text-amber-600",
        };
      case "review_hidden":
        return {
          title: "Review Hidden",
          message: rawMessage || "A review was hidden by Admin.",
          Icon: AlertTriangle,
          link: "/reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "new_reply":
        return {
          title: "Review Reply",
          message: senderName
            ? `${senderName} replied to your review.`
            : rawMessage || "Staff replied to your review.",
          Icon: MessageSquare,
          link: "/reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-amber-50 text-amber-600",
        };
      case "account_status":
        return {
          title: "Account Update",
          message: /disabled/i.test(rawMessage)
            ? "Your account was disabled."
            : /re-enabled|enabled/i.test(rawMessage)
              ? "Your account is active again."
              : rawMessage || "Your account status changed.",
          Icon: Shield,
          link: "/my-profile",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "payment_update":
        return {
          title: "Payment Update",
          message: rawMessage || "Your payment status was updated.",
          Icon: CreditCard,
          link: "/my-bookings",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-emerald-50 text-emerald-600",
        };
      default:
        return {
          title: "New Notification",
          message: rawMessage || "You have a new account update.",
          Icon: Bell,
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-slate-100 text-slate-600",
        };
    }
  };

  const appendFlashNonce = (link, nonce) => {
    if (!link) return link;
    const [path, query = ""] = link.split("?");
    const params = new URLSearchParams(query);
    params.set("flash", String(nonce));
    return `${path}?${params.toString()}`;
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
    setShowAllNotifications(false);
    setShowClearConfirm(false);
    setShowNotificationMenu(false);
    setShowLogoutConfirm(false);
    setNotificationToDelete(null);
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
        <div className="mx-auto flex max-w-[1750px] items-center justify-between px-4 lg:px-6 xl:px-[100px]">
          
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
            
            {token && (
              <div className="relative">
                <button 
                  onClick={() => {
                    const willShow = !showNotifications;
                    setShowNotifications(willShow);
                    setShowProfileMenu(false);
                    if (!willShow) {
                      setShowAllNotifications(false);
                      setShowClearConfirm(false);
                      setShowNotificationMenu(false);
                    } else {
                      setShowClearConfirm(false);
                      setShowNotificationMenu(false);
                    }
                  }}
                  className={`relative rounded-full p-1.5 transition-colors ${showNotifications ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white ring-2 ring-white">
                      {unreadBadgeText}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-md animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Bell size={11} className="text-slate-400" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">Notifications</h4>
                        {notifications.length > 0 && (
                          <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-white">
                            {totalBadgeText}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNotificationMenu((value) => !value)}
                          className={`rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ${showNotificationMenu ? "bg-slate-100 text-slate-700" : ""}`}
                          aria-label="Notification actions"
                        >
                          <MoreHorizontal size={12} />
                        </button>
                        {showNotificationMenu && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-md border border-slate-200 bg-white shadow-md">
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  markAllNotificationsRead();
                                  setShowNotificationMenu(false);
                                }}
                                className="flex w-full items-center gap-2 px-2.5 py-2 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Check size={10} />
                                Mark all read
                              </button>
                            )}
                            {notifications.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowClearConfirm(true);
                                  setShowNotificationMenu(false);
                                }}
                                className="flex w-full items-center gap-2 px-2.5 py-2 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Trash2 size={10} />
                                Clear all
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {notifications.length > 0 && (
                      showClearConfirm ? (
                        <div className="mx-2.5 my-2 rounded-lg border border-rose-200/70 bg-rose-50/80 px-2.5 py-2 text-[9px] text-rose-700 shadow-sm">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-500 ring-1 ring-rose-200">
                              <AlertTriangle size={12} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-rose-600">
                                Clear all notifications?
                              </p>
                              <p className="mt-0.5 text-[9px] font-medium text-rose-700">
                                This removes your notification history.
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowClearConfirm(false)}
                              className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-rose-600 transition-colors hover:bg-rose-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={clearNotifications}
                              className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-700"
                            >
                              Clear all
                            </button>
                          </div>
                        </div>
                      ) : null
                    )}
                    
                    <div className="max-h-[320px] overflow-y-auto hide-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                            <BellOff size={16} />
                          </div>
                          <p className="text-[10px] font-semibold text-slate-600">No notifications.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {displayedNotifications.map((n) => {
                            const meta = getNotificationMeta(n);
                            const NotificationIcon = meta.Icon;

                            return (
                            <div 
                               key={n._id} 
                               onClick={() => {
                                 markAsRead(n._id);
                                  const targetLink = n.link && (n.link.startsWith("/reviews") || n.link.startsWith("/my-bookings"))
                                    ? n.link
                                    : meta.link || n.link;
                                  if (targetLink) {
                                    const flashNonce = Date.now();
                                    const linkWithFlash = appendFlashNonce(targetLink, flashNonce);
                                    const linkQuery = linkWithFlash.includes("?") ? linkWithFlash.split("?")[1] : "";
                                    const bookingIdFromLink = linkQuery
                                      ? new URLSearchParams(linkQuery).get("bookingId")
                                      : null;
                                    navigate(linkWithFlash, {
                                      state: {
                                        highlightType: n.type,
                                        bookingId: bookingIdFromLink,
                                        notificationMessage: n.message,
                                        flashNonce
                                      }
                                    });
                                  }
                               }}
                               className={`group flex cursor-pointer items-start gap-2 border-b border-slate-100 px-2.5 py-2 transition-colors hover:bg-slate-50 ${!n.isRead ? "bg-slate-50" : "bg-white"}`}
                             >
                               <div className="relative mt-0.5 flex-shrink-0">
                                 <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${meta.iconClass}`}>
                                   <NotificationIcon size={12} />
                                 </div>
                                 {!n.isRead && (
                                   <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500"></span>
                                 )}
                               </div>

                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-1">
                                   <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                     {meta.title}
                                   </p>
                                   {!n.isRead && <span className="inline-flex h-1 w-1 rounded-full bg-blue-500"></span>}
                                 </div>
                                 <p className={`mt-0.5 line-clamp-2 text-[10px] leading-[1.3] ${!n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
                                   {meta.message}
                                 </p>
                                 <div className="mt-1 flex items-center gap-1 text-slate-400">
                                   <Calendar size={9} />
                                   <p className="text-[8px] font-bold uppercase tracking-[0.12em]">
                                     {formatNotificationDate(n.createdAt)}
                                   </p>
                                 </div>
                               </div>
                                <div className="ml-2 flex-shrink-0">
                                  <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    {!n.isRead && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          markAsRead(n._id);
                                        }}
                                        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                      >
                                        <Check size={9} />
                                        Mark read
                                      </button>
                                    )}
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setNotificationToDelete(n._id);
                                          }}
                                          className="flex items-center gap-1 rounded-full border border-rose-200 bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                                        >
                                      <Trash2 size={9} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                             </div>
                           )})}
                        </div>
                      )}
                    </div>

                    {notifications.length > 5 && (
                      <div className="border-t border-slate-100 px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() => setShowAllNotifications(!showAllNotifications)}
                          className="mx-auto flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:text-slate-800"
                        >
                          {showAllNotifications ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {showAllNotifications ? "Show less" : "Show all"}
                        </button>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
            )}

            {token && (
              <button
                onClick={() => navigate("/retreat-booking")}
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Book Retreat <ArrowRight size={14} className="opacity-70" />
              </button>
            )}

            {token ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileMenu((p) => !p);
                    setShowNotifications(false);
                    setShowAllNotifications(false);
                  }}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center bg-slate-50"
                >
                  {userProfileImage ? <img src={userProfileImage} alt="profile" className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
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
                    <button onClick={openLogoutConfirm} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <LogOut size={14}/> Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all">
                Login / Sign Up
              </button>
            )}

            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden text-slate-900">
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl p-4 flex flex-col gap-2 z-50">
             {navLinks.map((link) => (
                <NavLink 
                  key={link.name} 
                  to={link.path} 
                  onClick={() => setShowMobileMenu(false)} 
                  className={({ isActive }) => `block px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {link.name}
                </NavLink>
             ))}
             {token ? (
               <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
                 <button onClick={() => { setShowMobileMenu(false); navigate('/my-profile'); }} className="block w-full text-left px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">My Profile</button>
                 <button onClick={() => { setShowMobileMenu(false); navigate('/my-bookings'); }} className="block w-full text-left px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">My Bookings</button>
                 <button onClick={() => { setShowMobileMenu(false); openLogoutConfirm(); }} className="block w-full text-left px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50">Log Out</button>
               </div>
             ) : (
                <button onClick={() => { setShowMobileMenu(false); navigate('/login'); }} className="block w-full text-left px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 mt-2 border-t border-slate-100 pt-4">Login</button>
             )}
          </div>
        )}
      </nav>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Log out?</p>
                <p className="mt-1 text-sm text-slate-600">
                  You will need to sign in again to access your account.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {notificationToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Delete notification?</p>
                <p className="mt-1 text-sm text-slate-600">
                  This will remove the selected notification from your account list.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotificationToDelete(null)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteNotification}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
