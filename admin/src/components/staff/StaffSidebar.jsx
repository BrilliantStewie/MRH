import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  CalendarDays, 
  ClipboardList,
  Star // 1. Added Star icon
} from "lucide-react";

const StaffSidebar = () => {
  const baseStyle = "flex items-center gap-4 px-6 py-4 text-[13px] font-bold uppercase tracking-wider text-slate-500 transition-all border-r-4 border-transparent hover:bg-emerald-50/50 hover:text-emerald-700 group";
  const activeStyle = "bg-emerald-50 border-emerald-600 text-emerald-700";

  const navItems = [
    {
      name: "Dashboard",
      path: "/Staff-dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      name: "Guest Bookings",
      path: "/Staff-bookings",
      icon: <CalendarDays size={20} />
    },
    // 2. Added the Reviews link here
    {
      name: "Reviews",
      path: "/all-reviews",
      icon: <Star size={20} />
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] sticky top-16 shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col h-full py-6">
        <p className="px-8 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Main Menu
        </p>
        
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

        <div className="mt-auto px-6 py-10">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <ClipboardList size={16} className="text-emerald-600" />
                    <p className="text-[10px] font-black text-slate-700 uppercase">Staff Tip</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Always verify guest IDs upon check-in to ensure security.
                </p>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default StaffSidebar;