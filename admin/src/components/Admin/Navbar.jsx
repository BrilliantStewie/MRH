// src/components/Navbar.jsx
import React, { useContext, useEffect, useState } from "react";
import { assets } from "../../assets/assets.js";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext.jsx";
import { Bell, BellOff, Calendar, MessageSquare, AlertTriangle, MoreHorizontal, Check, Trash2, ChevronDown, ChevronUp, Star, Shield, CreditCard } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { aToken, adminData, logoutAdmin, backendUrl } = useContext(AdminContext);

  const isAdmin = !!aToken;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const displayName = adminData?.name || "Administrator";

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchNotifications = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications/get`, {
        headers: { token: aToken }
      });
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error(err.response?.data?.message || "Session expired");
        logoutAdmin();
      }
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read/${id}`, {}, {
        headers: { token: aToken }
      });
      fetchNotifications();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logoutAdmin();
      console.error(err);
    }
  };

  const clearNotifications = async () => {
    try {
      await axios.delete(`${backendUrl}/api/notifications/clear`, {
        headers: { token: aToken }
      });
      setNotifications([]);
      setShowAllNotifications(false);
      setShowClearConfirm(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logoutAdmin();
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read-all`, {}, {
        headers: { token: aToken }
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) logoutAdmin();
      console.error(err);
    }
  };

  useEffect(() => {
    if (aToken) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
    setNotifications([]);
  }, [aToken, backendUrl]);

  useEffect(() => {
    setShowNotifications(false);
    setShowAllNotifications(false);
    setShowClearConfirm(false);
    setShowNotificationMenu(false);
  }, [location.pathname]);

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  const displayedNotifications = showAllNotifications ? notifications : notifications.slice(0, 5);
  const unreadBadgeText = unreadCount > 9 ? "9+" : unreadCount;
  const totalBadgeText = notifications.length > 99 ? "99+" : notifications.length;

  const formatNotificationDate = (createdAt) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const getNotificationMeta = (notification) => {
    const rawMessage = notification?.message?.trim() || "";

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
          link: "/all-bookings",
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
          message: rawMessage || "A new review was posted.",
          Icon: Star,
          link: "/admin-reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-amber-50 text-amber-600",
        };
      case "review_hidden":
        return {
          title: "Review Hidden",
          message: rawMessage || "A review was hidden by moderation.",
          Icon: AlertTriangle,
          link: "/admin-reviews",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "new_reply":
        return {
          title: "Review Reply",
          message: rawMessage || "A reply was added to a review.",
          Icon: MessageSquare,
          link: "/admin-reviews",
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
          link: "/admin-users",
          iconClass: notification?.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-rose-50 text-rose-600",
        };
      case "payment_update":
        return {
          title: "Payment Update",
          message: rawMessage || "A payment status was updated.",
          Icon: CreditCard,
          link: "/all-bookings",
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

  const normalizeAdminLink = (link) => {
    if (!link) return link;
    if (link.startsWith("/admin/bookings")) {
      return link.replace("/admin/bookings", "/all-bookings");
    }
    if (link.startsWith("/admin/reviews")) {
      return link.replace("/admin/reviews", "/admin-reviews");
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

  return (
    <>
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

          {/* Right Side: Notifications + User Profile & Logout */}
          <div className="flex items-center gap-4 sm:gap-6">
            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const willShow = !showNotifications;
                    setShowNotifications(willShow);
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
                    <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-md animate-in fade-in zoom-in-95 duration-200">
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
                              const targetLink = normalizeAdminLink(n.link || meta.link);
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
                                    {!n.isRead ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          markAsRead(n._id);
                                        }}
                                        className="pointer-events-none flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 hover:border-slate-300 hover:text-slate-700"
                                      >
                                        <Check size={9} />
                                        Mark read
                                      </button>
                                    ) : (
                                      <div className="mt-0.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Check size={10} />
                                      </div>
                                    )}
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
            )}
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
                  You will need to sign in again to access the admin panel.
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
                  if (isAdmin) logoutAdmin();
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
    </>
  );
};

export default Navbar;
