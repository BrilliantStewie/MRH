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
  TrendingUp, // Added for Analytics
} from "lucide-react";

const Sidebar = () => {
  const { aToken } = useContext(AdminContext);
  if (!aToken) return null;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <p className="text-xs font-bold text-slate-400 uppercase mb-2">
        Overview
      </p>

      <NavLink to="/admin-dashboard" className={linkClass}>
        <LayoutDashboard size={18} />
        Dashboard
      </NavLink>

      {/* New Analytics Link */}
      <NavLink to="/admin-analytics" className={linkClass}>
        <TrendingUp size={18} />
        Analytics
      </NavLink>

      <NavLink to="/all-bookings" className={linkClass}>
        <CalendarCheck size={18} />
        Bookings
      </NavLink>

      <p className="text-xs font-bold text-slate-400 uppercase mt-6 mb-2">
        Management
      </p>

      <NavLink to="/rooms-list" className={linkClass}>
        <BedDouble size={18} />
        Rooms
      </NavLink>

      <NavLink to="/admin-packages" className={linkClass}>
        <Package size={18} />
        Packages
      </NavLink>

      <p className="text-xs font-bold text-slate-400 uppercase mt-6 mb-2">
        People
      </p>

      <NavLink to="/admin-staff-list" className={linkClass}>
        <Users size={18} />
        Staff List
      </NavLink>

      <NavLink to="/admin-users" className={linkClass}>
        <User size={18} />
        User Accounts
      </NavLink>
    </aside>
  );
};

export default Sidebar;