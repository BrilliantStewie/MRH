import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Package,
  Users,
  User,
  TrendingUp,
  MessageSquare,
  X
} from "lucide-react";

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  // ✅ Get the actual notification data from your AdminContext
  // Example: bookings.length where status is 'pending' or a specific unread count
  const { aToken, bookings, reviews } = useContext(AdminContext);

  // Logic to determine if we show a dot
  // This checks if there are any bookings with status 'Pending'
  const hasNewBookings = bookings?.some(b => b.status === 'Pending') || false;
  
  // This checks for reviews that haven't been replied to or seen
  const pendingReviewsCount = reviews?.filter(r => !r.isRead).length || 0;

  if (!aToken) return null;

  const linkClass = ({ isActive }) =>
    `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
      isActive
        ? "bg-blue-50 text-blue-700 shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  // ✅ ENHANCED NOTIFICATION COMPONENT
  const NotificationIndicator = ({ count, variant = "dot" }) => {
    if (!count || count === 0) return null;

    if (variant === "number") {
      return (
        <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
          {count > 9 ? "9+" : count}
        </span>
      );
    }

    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-slate-200 bg-[#f8fafc] px-4 pb-4 pt-20 shadow-xl transition-transform duration-300 md:static md:z-auto md:h-full md:w-64 md:max-w-none md:translate-x-0 md:px-4 md:py-4 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1 md:hidden">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Navigation
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">Admin Menu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

      <NavLink to="/admin-dashboard" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <LayoutDashboard size={18} />
          Dashboard
        </div>
      </NavLink>

      <NavLink to="/admin-analytics" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <TrendingUp size={18} />
          Analytics
        </div>
      </NavLink>

      <NavLink to="/all-bookings" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <CalendarCheck size={18} />
          Bookings
        </div>
        {/* ✅ Shows an animated dot if there are pending bookings */}
        <NotificationIndicator count={hasNewBookings} variant="dot" />
      </NavLink>

      <NavLink to="/rooms-list" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <BedDouble size={18} />
          Rooms
        </div>
      </NavLink>

      <NavLink to="/admin-packages" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <Package size={18} />
          Packages
        </div>
      </NavLink>

      <NavLink to="/admin-reviews" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <MessageSquare size={18} />
          Guest Reviews
        </div>
        {/* ✅ Shows a number badge for reviews */}
        <NotificationIndicator count={pendingReviewsCount} variant="number" />
      </NavLink>

      <NavLink to="/admin-staff-list" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <Users size={18} />
          Staff List
        </div>
      </NavLink>

      <NavLink to="/admin-users" className={linkClass} onClick={onClose}>
        <div className="flex items-center gap-3">
          <User size={18} />
          Users
        </div>
      </NavLink>
      </aside>
    </>
  );
};

export default Sidebar;
