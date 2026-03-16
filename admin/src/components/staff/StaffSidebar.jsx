import React from "react";
import { NavLink } from "react-router-dom";
import {
  BedDouble,
  CalendarCheck,
  LayoutDashboard,
  MessageSquare,
  Package,
  User,
} from "lucide-react";

const StaffSidebar = () => {
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
      name: "Guest Bookings",
      path: "/staff-bookings",
      icon: <CalendarCheck size={20} />
    },
    {
      name: "Guest Reviews",
      path: "/staff-reviews",   // ✅ FIXED ROUTE
      icon: <MessageSquare size={20} />
    },
    {
      name: "Rooms",
      path: "/staff-rooms",
      icon: <BedDouble size={20} />
    },
    {
      name: "Packages",
      path: "/staff-packages",
      icon: <Package size={20} />
    },
    {
      name: "Users",
      path: "/staff-users",
      icon: <User size={20} />
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] sticky top-16 shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col h-full py-6">
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
  );
};

export default StaffSidebar;
