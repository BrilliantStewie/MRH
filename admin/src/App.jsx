import React, { useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Contexts
import { AdminContext } from "./context/AdminContext";
import { StaffContext } from "./context/StaffContext";

// Components
import Sidebar from "./components/Admin/Sidebar";
import Navbar from "./components/Admin/Navbar";
import StaffNavbar from "./components/staff/StaffNavbar";
import StaffSidebar from "./components/staff/StaffSidebar";
import StyledToastContainer from "./components/StyledToastContainer";

// Pages
import Login from "./pages/Login";
import AdminReviews from "./pages/Admin/AdminReviews";
import StaffReviews from "./pages/Staff/StaffReviews";
import Dashboard from "./pages/Admin/Dashboard";
import RoomsList from "./pages/Admin/RoomsList";
import AllBookings from "./pages/Admin/AllBookings";
import Users from "./pages/Admin/Users";
import Packages from "./pages/Admin/Packages";
import Report from "./pages/Admin/Report";
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBookings from "./pages/Staff/StaffBookings";
import StaffProfile from "./pages/Staff/StaffProfile";

// Route Guard
import StaffProtectedRoute from "./routes/StaffProtectedRoute";

const PANEL_SHELL_VARIANTS = {
  contained: {
    main: "overflow-y-auto p-2.5 sm:p-4 xl:p-5",
    container: "w-full max-w-none pb-5",
  },
  workspace: {
    main: "overflow-hidden p-2.5 sm:p-4 xl:p-5",
    container: "h-full w-full max-w-none pb-0",
  },
  immersive: {
    main: "overflow-hidden p-0",
    container: "h-full w-full max-w-none pb-0",
  },
  selfPadded: {
    main: "overflow-y-auto p-0",
    container: "h-full w-full max-w-none pb-0",
  },
};

const ROUTE_SHELL_MAP = {
  "/admin-dashboard": "contained",
  "/admin-reports": "contained",
  "/staff-dashboard": "contained",
  "/admin-packages": "workspace",
  "/admin-users": "workspace",
  "/rooms-list": "immersive",
  "/all-bookings": "immersive",
  "/staff-bookings": "immersive",
  "/admin-reviews": "selfPadded",
  "/staff-reviews": "selfPadded",
  "/staff-profile": "selfPadded",
};

const getPanelShellLayout = (pathname) =>
  PANEL_SHELL_VARIANTS[ROUTE_SHELL_MAP[pathname] || "contained"];

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { sToken } = useContext(StaffContext);
  const location = useLocation();
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [isStaffSidebarOpen, setIsStaffSidebarOpen] = useState(false);
  const shellLayout = getPanelShellLayout(location.pathname);

  useEffect(() => {
    setIsAdminSidebarOpen(false);
    setIsStaffSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc] font-sans antialiased print:block print:h-auto print:overflow-visible print:bg-white">
      <StyledToastContainer />
      {/* ================= ADMIN LAYOUT ================= */}
      {aToken ? (
        <>
          <div className="print:hidden">
            <Navbar onMenuToggle={() => setIsAdminSidebarOpen((open) => !open)} />
          </div>
          <div className="flex flex-1 overflow-hidden bg-[#f8fafc] print:block print:overflow-visible">
            <div className="print:hidden">
              <Sidebar
                isOpen={isAdminSidebarOpen}
                onClose={() => setIsAdminSidebarOpen(false)}
              />
            </div>
            <main
              className={`flex-1 bg-[#f8fafc] print:overflow-visible print:bg-white print:p-0 ${shellLayout.main}`}
            >
              <div
                className={`w-full print:mx-0 print:max-w-none print:pb-0 ${shellLayout.container}`}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/admin-analytics" element={<Navigate to="/admin-reports" replace />} />
                  <Route path="/rooms-list" element={<RoomsList />} />
                  <Route path="/all-bookings" element={<AllBookings />} />
                  <Route path="/admin-users" element={<Users />} />
                  <Route path="/admin-staff-list" element={<Navigate to="/admin-users" replace />} />
                  <Route path="/admin-packages" element={<Packages />} />
                  <Route path="/admin-reviews" element={<AdminReviews />} />
                  <Route path="/admin-reports" element={<Report />} />
                  <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </>
      ) : sToken ? (
        /* ================= STAFF LAYOUT ================= */
        <>
          <div className="print:hidden">
            <StaffNavbar onMenuToggle={() => setIsStaffSidebarOpen((open) => !open)} />
          </div>
          <div className="flex flex-1 overflow-hidden bg-[#f8fafc] print:block print:overflow-visible">
            <div className="print:hidden">
              <StaffSidebar
                isOpen={isStaffSidebarOpen}
                onClose={() => setIsStaffSidebarOpen(false)}
              />
            </div>
            <main
              className={`flex-1 bg-[#f8fafc] print:overflow-visible print:bg-white print:p-0 ${shellLayout.main}`}
            >
              <div
                className={`w-full print:mx-0 print:max-w-none print:pb-0 ${shellLayout.container}`}
              >
                <Routes>
                  <Route
                    path="/staff-dashboard"
                    element={
                      <StaffProtectedRoute>
                        <StaffDashboard />
                      </StaffProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff-bookings"
                    element={
                      <StaffProtectedRoute>
                        <StaffBookings />
                      </StaffProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff-profile"
                    element={
                      <StaffProtectedRoute>
                        <StaffProfile />
                      </StaffProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff-reviews"
                    element={
                      <StaffProtectedRoute>
                        <StaffReviews />
                      </StaffProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/staff-dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </>
      ) : (
        /* ================= LOGIN LAYOUT ================= */
        <div className="flex-1 flex items-center justify-center bg-slate-100">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
};

export default App;
