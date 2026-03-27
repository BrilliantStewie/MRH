import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  CalendarCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  BedDouble,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { aToken, hasNewBookings, pendingReviewsCount } = useContext(AdminContext);

  if (!aToken) return null;

  const navItems = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Analytics", path: "/admin-analytics", icon: <TrendingUp size={18} /> },
    { name: "Reports", path: "/admin-reports", icon: <FileText size={18} /> },
    {
      name: "Bookings",
      path: "/all-bookings",
      icon: <CalendarCheck size={18} />,
      indicator: <NotificationIndicator count={hasNewBookings ? 1 : 0} variant="dot" />,
    },
    { name: "Rooms", path: "/rooms-list", icon: <BedDouble size={18} /> },
    { name: "Packages", path: "/admin-packages", icon: <Package size={18} /> },
    {
      name: "Guest Reviews",
      path: "/admin-reviews",
      icon: <MessageSquare size={18} />,
      indicator: <NotificationIndicator count={pendingReviewsCount} variant="number" />,
    },
    { name: "Staff List", path: "/admin-staff-list", icon: <Users size={18} /> },
    { name: "Users", path: "/admin-users", icon: <User size={18} /> },
  ];

  const linkClass = ({ isActive }) =>
    `group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
      isActive
        ? "border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
    }`;

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-slate-200 bg-[#f8fafc] px-4 pb-4 pt-20 shadow-xl transition-transform duration-300 md:static md:z-auto md:h-full md:w-64 md:max-w-none md:translate-x-0 md:px-4 md:py-4 md:shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)] ${
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

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass} onClick={onClose}>
              <div className="flex items-center gap-3">
                <span className="text-current transition-transform duration-200 group-hover:scale-110">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>
              {item.indicator || null}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

const NotificationIndicator = ({ count, variant = "dot" }) => {
  if (!count) return null;

  if (variant === "number") {
    return (
      <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
        {count > 9 ? "9+" : count}
      </span>
    );
  }

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
    </span>
  );
};

export default Sidebar;
