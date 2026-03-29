import React, { useContext, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  CalendarCheck,
  ChevronDown,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  BedDouble,
  User,
  BriefcaseBusiness,
  X,
} from "lucide-react";

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { aToken, hasNewBookings, pendingReviewsCount } = useContext(AdminContext);
  const location = useLocation();

  if (!aToken) return null;

  const servicesPaths = ["/rooms-list", "/admin-packages"];
  const isServicesRoute = servicesPaths.includes(location.pathname);
  const [isServicesOpen, setIsServicesOpen] = useState(isServicesRoute);

  useEffect(() => {
    if (isServicesRoute) {
      setIsServicesOpen(true);
    }
  }, [isServicesRoute]);

  const primaryNavItems = [
    { name: "Dashboard", path: "/admin-dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Users", path: "/admin-users", icon: <User size={18} /> },
    {
      name: "Bookings",
      path: "/all-bookings",
      icon: <CalendarCheck size={18} />,
      indicator: <NotificationIndicator count={hasNewBookings ? 1 : 0} variant="dot" />,
    },
  ];

  const secondaryNavItems = [
    {
      name: "Feedback",
      path: "/admin-reviews",
      icon: <MessageSquare size={18} />,
      indicator: <NotificationIndicator count={pendingReviewsCount} variant="number" />,
    },
    { name: "Reports", path: "/admin-reports", icon: <FileText size={18} /> },
  ];

  const linkClass = ({ isActive }) =>
    `group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
      isActive
        ? "border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
    }`;

  const servicesButtonClass = `group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
    isServicesRoute
      ? "border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
  }`;

  const servicesChildren = [
    { name: "Rooms", path: "/rooms-list", icon: <BedDouble size={16} /> },
    { name: "Packages", path: "/admin-packages", icon: <Package size={16} /> },
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-slate-200 bg-[#f8fafc] px-4 pb-4 pt-20 shadow-xl transition-transform duration-300 md:static md:z-auto md:h-full md:w-60 md:max-w-none md:translate-x-0 md:px-3.5 md:py-3.5 md:shadow-[4px_0_24px_-15px_rgba(0,0,0,0.05)] ${
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
          {primaryNavItems.map((item) => (
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

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setIsServicesOpen((open) => !open)}
              className={servicesButtonClass}
              aria-expanded={isServicesOpen}
              aria-controls="admin-services-menu"
            >
              <div className="flex items-center gap-3">
                <span className="text-current transition-transform duration-200 group-hover:scale-110">
                  <BriefcaseBusiness size={18} />
                </span>
                <span>Services</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isServicesOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div
              id="admin-services-menu"
              className={`overflow-hidden pl-3 transition-all duration-200 ${
                isServicesOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-1 flex flex-col gap-1 border-l border-slate-200 pl-3">
                {servicesChildren.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-500 hover:bg-white hover:text-slate-700"
                      }`
                    }
                  >
                    <span className="text-current transition-transform duration-200 group-hover:scale-110">
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {secondaryNavItems.map((item) => (
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
