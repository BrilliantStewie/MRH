import React from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarCheck,
  LayoutDashboard,
  MessageSquare,
  X,
} from "lucide-react";

const StaffSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const navItems = [
    { name: "Dashboard", path: "/staff-dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Bookings", path: "/staff-bookings", icon: <CalendarCheck size={18} /> },
    { name: "Feedback", path: "/staff-reviews", icon: <MessageSquare size={18} /> },
  ];

  const linkClass = ({ isActive }) =>
    `group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
      isActive
        ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-slate-200 bg-[#f8fafc] px-4 pb-4 pt-20 shadow-xl transition-transform duration-300 md:static md:z-auto md:h-full md:w-60 md:max-w-none md:translate-x-0 md:px-3.5 md:py-3.5 md:shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1 md:hidden">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Navigation
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">Staff Menu</p>
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
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default StaffSidebar;
