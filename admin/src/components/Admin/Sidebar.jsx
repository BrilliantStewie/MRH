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
  MessageSquare
} from "lucide-react";

const Sidebar = () => {
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
    `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
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
    <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col gap-1">
      <NavLink to="/admin-dashboard" className={linkClass}>
        <div className="flex items-center gap-3">
          <LayoutDashboard size={18} />
          Dashboard
        </div>
      </NavLink>

      <NavLink to="/admin-analytics" className={linkClass}>
        <div className="flex items-center gap-3">
          <TrendingUp size={18} />
          Analytics
        </div>
      </NavLink>

      <NavLink to="/all-bookings" className={linkClass}>
        <div className="flex items-center gap-3">
          <CalendarCheck size={18} />
          Bookings
        </div>
        {/* ✅ Shows an animated dot if there are pending bookings */}
        <NotificationIndicator count={hasNewBookings} variant="dot" />
      </NavLink>

      <NavLink to="/rooms-list" className={linkClass}>
        <div className="flex items-center gap-3">
          <BedDouble size={18} />
          Rooms
        </div>
      </NavLink>

      <NavLink to="/admin-packages" className={linkClass}>
        <div className="flex items-center gap-3">
          <Package size={18} />
          Packages
        </div>
      </NavLink>

      <NavLink to="/admin-reviews" className={linkClass}>
        <div className="flex items-center gap-3">
          <MessageSquare size={18} />
          Guest Reviews
        </div>
        {/* ✅ Shows a number badge for reviews */}
        <NotificationIndicator count={pendingReviewsCount} variant="number" />
      </NavLink>

      <NavLink to="/admin-staff-list" className={linkClass}>
        <div className="flex items-center gap-3">
          <Users size={18} />
          Staff List
        </div>
      </NavLink>

      <NavLink to="/admin-users" className={linkClass}>
        <div className="flex items-center gap-3">
          <User size={18} />
          Users
        </div>
      </NavLink>
    </aside>
  );
};

export default Sidebar;
