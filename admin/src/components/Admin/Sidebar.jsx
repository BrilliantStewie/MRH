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
  const { aToken } = useContext(AdminContext);

  // Mock Notification Data - Replace these with your actual state/context data
  const notifications = {
    bookings: true,      // Red dot for new bookings
    reviews: 3,         // Number for pending reviews
    users: false,       // No notification
  };

  if (!aToken) return null;

  const linkClass = ({ isActive }) =>
    `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-blue-50 text-blue-700 shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  // Helper component for the Red Dot
  const NotificationDot = ({ count }) => {
    if (!count) return null;
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
    );
  };

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col gap-1">
      {/* OVERVIEW SECTION */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mt-2 mb-2">
        Overview
      </p>

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
        {/* Red dot for bookings */}
        <NotificationDot count={notifications.bookings} />
      </NavLink>

      {/* MANAGEMENT SECTION */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mt-6 mb-2">
        Management
      </p>

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
        {/* Red dot for reviews */}
        <NotificationDot count={notifications.reviews} />
      </NavLink>

      {/* PEOPLE SECTION */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mt-6 mb-2">
        People
      </p>

      <NavLink to="/admin-staff-list" className={linkClass}>
        <div className="flex items-center gap-3">
          <Users size={18} />
          Staff List
        </div>
      </NavLink>

      <NavLink to="/admin-users" className={linkClass}>
        <div className="flex items-center gap-3">
          <User size={18} />
          User Accounts
        </div>
        <NotificationDot count={notifications.users} />
      </NavLink>
    </aside>
  );
};

export default Sidebar;