import React, { useContext, useState, useEffect } from "react";
import { assets } from "../../assets/assets"; 
import { useNavigate, useLocation } from "react-router-dom";
import { StaffContext } from "../../context/StaffContext";
import { User, LogOut, UserCircle, Bell, BellOff, MessageSquare, MoreHorizontal, Check, Trash2, AlertTriangle, Calendar, ChevronDown, ChevronUp, Star, Shield, CreditCard, Menu } from "lucide-react";
import axios from "axios";
import { formatDatePHT } from "../../utils/dateTime";

const StaffNavbar = ({ onMenuToggle = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { sToken, staffData, staffLogout, backendUrl } = useContext(StaffContext);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [notifications, setNotifications] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  // Close dropdowns automatically when changing pages
  useEffect(() => {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowAllNotifications(false);
    setShowClearConfirm(false);
    setShowNotificationMenu(false);
    setNotificationToDelete(null);
  }, [location.pathname]);

  // Reset image error state when staffData changes
  useEffect(() => {
    setImgError(false);
  }, [staffData]);

  const fetchNotifications = async () => {
    if (!sToken) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications/get`, {
        headers: { token: sToken }
      });
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        staffLogout();
        navigate("/");
      }
      console.error(error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read/${id}`, {}, {
        headers: { token: sToken }
      });
      fetchNotifications();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        staffLogout();
        navigate("/");
      }
      console.error(error);
    }
  };

  const deleteNotification = async () => {
    if (!notificationToDelete) return;
    try {
      await axios.delete(`${backendUrl}/api/notifications/${notificationToDelete}`, {
        headers: { token: sToken }
      });
      setNotificationToDelete(null);
      fetchNotifications();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        staffLogout();
        navigate("/");
      }
      console.error(error);
    }
  };

  const clearNotifications = async () => {
    try {
      await axios.delete(`${backendUrl}/api/notifications/clear`, {
        headers: { token: sToken }
      });
      setNotifications([]);
      setShowAllNotifications(false);
      setShowClearConfirm(false);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        staffLogout();
        navigate("/");
      }
      console.error(error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read-all`, {}, {
        headers: { token: sToken }
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        staffLogout();
        navigate("/");
      }
      console.error(error);
    }
  };

  useEffect(() => {
    if (sToken) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
    setNotifications([]);
  }, [sToken, backendUrl]);

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
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
      case "booking_update": {
        const isCancellation = /cancellation/i.test(rawMessage);
        const isApproved = /approved/i.test(rawMessage);
        return {
          title: isCancellation
            ? "Cancellation Request"
            : isApproved
              ? "Booking Approved"
              : "Booking Update",
          message: rawMessage
            ? rawMessage
            : isCancellation
              ? "A cancellation request was submitted."
              : isApproved
                ? "A booking was approved."
                : "A booking was updated.",
          Icon: isCancellation ? AlertTriangle : Calendar,
          link: "/staff-bookings",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : isCancellation
              ? "bg-rose-50 text-rose-600"
              : "bg-blue-50 text-blue-600",
        };
      }
      case "new_review":
        return {
          title: "New Review",
          message: senderName
            ? `${senderName} submitted${reviewStars ? ` a ${reviewStars}-star` : " a"} review.`
            : rawMessage || "A new review was posted.",
          Icon: Star,
          link: "/staff-reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-amber-50 text-amber-600",
        };
      case "review_hidden":
        return {
          title: "Review Hidden",
          message: rawMessage || "A review was hidden by Admin.",
          Icon: AlertTriangle,
          link: "/staff-reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "new_reply":
        return {
          title: "Review Reply",
          message: senderName
            ? `${senderName} replied to a review.`
            : rawMessage || "A reply was added to a review.",
          Icon: MessageSquare,
          link: "/staff-reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-amber-50 text-amber-600",
        };
      case "account_status":
        return {
          title: "Account Update",
          message: /disabled/i.test(rawMessage)
            ? "An account was disabled."
            : /re-enabled|enabled/i.test(rawMessage)
              ? "An account is active again."
              : rawMessage || "An account status changed.",
          Icon: Shield,
          link: "/staff-profile",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "payment_update":
        return {
          title: "Payment Update",
          message: rawMessage || "A payment status was updated.",
          Icon: CreditCard,
          link: "/staff-bookings",
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

  const normalizeStaffLink = (link) => {
    if (!link) return link;
    if (link.startsWith("/admin/bookings")) {
      return link.replace("/admin/bookings", "/staff-bookings");
    }
    if (link.startsWith("/all-bookings")) {
      return link.replace("/all-bookings", "/staff-bookings");
    }
    if (link.startsWith("/admin/reviews")) {
      return link.replace("/admin/reviews", "/staff-reviews");
    }
    if (link.startsWith("/admin-reviews")) {
      return link.replace("/admin-reviews", "/staff-reviews");
    }
    if (link.startsWith("/admin-users")) {
      return link.replace("/admin-users", "/staff-users");
    }
    return link;
  };

  const appendFlashNonce = (link, nonce) => {
    if (!link) return link;
    const [path, query = ""] = link.split("?");
    const params = new URLSearchParams(query);
    params.set("flash", String(nonce));
    return `${path}?${params.toString()}`;
  };

  const getLinkParam = (link, key) => {
    if (!link) return null;
    const query = link.includes("?") ? link.split("?")[1] : "";
    return new URLSearchParams(query).get(key);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // ✅ FIXED: Grabs your full first name (e.g., "Ken Melvin") but leaves out the last name
  const firstName = staffData?.firstName || staffData?.name?.split('|')[0] || "Staff";

  if (!sToken) return null; 

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f8fafc] py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-8">
        
        {/* --- LEFT: BRANDING --- */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div 
            className="group flex cursor-pointer items-center gap-3 select-none" 
            onClick={() => navigate('/Staff-dashboard')}
          >
          <img 
            src={assets.logo} 
            alt="Logo" 
            className="h-10 w-10 object-contain transition-transform group-hover:scale-105 sm:h-11 sm:w-11" 
          />
          <div className="flex flex-col justify-center">
            <h1 className="text-[15px] font-black text-slate-800 tracking-tight leading-none">
              MRH
            </h1>
            <span className="mt-1 hidden w-fit rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 sm:inline-flex">
              Staff Panel
            </span>
          </div>
          </div>
        </div>

        {/* --- RIGHT: NOTIFICATIONS + PROFILE SECTION --- */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const willShow = !showNotifications;
                setShowNotifications(willShow);
                setShowProfileMenu(false);
                setShowNotificationMenu(false);
                setShowClearConfirm(false);
                if (!willShow) {
                  setShowAllNotifications(false);
                }
              }}
              className={`relative rounded-full p-2 transition-colors ${
                showNotifications ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
              }`}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white ring-2 ring-white">
                  {unreadBadgeText}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowAllNotifications(false);
                    setShowClearConfirm(false);
                    setShowNotificationMenu(false);
                  }}
                ></div>
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-md border border-slate-200 bg-white shadow-md animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Bell size={11} className="text-slate-400" />
                      <h4 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">
                        Notifications
                      </h4>
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
                        className={`rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ${
                          showNotificationMenu ? "bg-slate-100 text-slate-700" : ""
                        }`}
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

                  {notifications.length > 0 && showClearConfirm ? (
                    <div className="mx-3 my-2 rounded-lg border border-rose-200/70 bg-rose-50/80 px-2.5 py-2 text-[9px] text-rose-700 shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-500 ring-1 ring-rose-200">
                          <AlertTriangle size={12} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-rose-600">
                            Clear all notifications?
                          </p>
                          <p className="mt-0.5 text-[9px] font-medium text-rose-700">
                            This removes your notification list.
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
                  ) : null}

                  <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                          <BellOff size={16} />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-600">
                          No notifications.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {displayedNotifications.map((n) => {
                          const meta = getNotificationMeta(n);
                          const NotificationIcon = meta.Icon;
                          const targetLink = normalizeStaffLink(n.link || meta.link);
                          const bookingIdFromLink = getLinkParam(targetLink, "bookingId");
                          const reviewIdFromLink = getLinkParam(targetLink, "reviewId");
                          const replyIdFromLink = getLinkParam(targetLink, "replyId");

                          return (
                            <div
                              key={n._id}
                              onClick={() => {
                                markAsRead(n._id);
                                setShowNotifications(false);
                                if (targetLink) {
                                  const flashNonce = Date.now();
                                  const linkWithFlash = appendFlashNonce(targetLink, flashNonce);
                                  navigate(linkWithFlash, {
                                    state: {
                                      bookingId: bookingIdFromLink,
                                      reviewId: reviewIdFromLink,
                                      replyId: replyIdFromLink,
                                      highlightType: n.type,
                                      notificationMessage: n.message,
                                      flashNonce
                                    }
                                  });
                                }
                              }}
                              className={`group flex cursor-pointer items-start gap-2 border-b border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 ${
                                !n.isRead ? "bg-slate-50" : "bg-white"
                              }`}
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
                                <p className={`mt-0.5 line-clamp-2 text-[10px] leading-[1.3] ${!n.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}>
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
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {notifications.length > 5 && (
                    <div className="border-t border-slate-100 px-3 py-2">
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
              </>
            )}
          </div>
          
         

         

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
    
    <div className="absolute right-0 mt-3 w-[min(224px,calc(100vw-1rem))] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
      
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
                  You will need to sign in again to access the staff panel.
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
                  staffLogout();
                  navigate("/");
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
                  This will remove the selected notification from your staff list.
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

export default StaffNavbar;
