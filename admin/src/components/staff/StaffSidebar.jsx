import React from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarCheck,
  LayoutDashboard,
  MessageSquare,
  X,
} from "lucide-react";

const StaffSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const baseStyle =
    "flex items-center gap-4 px-6 py-4 text-[13px] font-semibold text-slate-600 transition-all border-r-4 border-transparent hover:bg-emerald-50/50 hover:text-emerald-700 group";

  const activeStyle =
    "bg-emerald-50 border-emerald-600 text-emerald-700";

  const navItems = [
    {
      name: "Dashboard",
      path: "/staff-dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      name: "Bookings",
      path: "/staff-bookings",
      icon: <CalendarCheck size={20} />
    },
    {
      name: "Guest Reviews",
      path: "/staff-reviews",
      icon: <MessageSquare size={20} />
    }
  ];

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-[#f8fafc] pt-20 shadow-xl transition-transform duration-300 md:static md:z-auto md:h-full md:w-64 md:max-w-none md:translate-x-0 md:pt-0 md:shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="flex h-full flex-col py-6">
        <div className="mb-3 flex items-center justify-between px-6 md:hidden">
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
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `${baseStyle} ${isActive ? activeStyle : ""}`
              }
            >
              <span className="transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-6 py-10"></div>
      </div>
      </aside>
    </>
  );
};

export default StaffSidebar;
