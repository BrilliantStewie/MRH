import React, { useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Contexts
import { AdminContext } from "./context/AdminContext";
import { StaffContext } from "./context/StaffContext";

// Components
import Sidebar from "./components/Admin/Sidebar";
import Navbar from "./components/Admin/Navbar";
import StaffNavbar from "./components/Staff/StaffNavbar";
import StaffSidebar from "./components/Staff/StaffSidebar";
import StyledToastContainer from "./components/StyledToastContainer";

// Pages
import Login from "./pages/Login";
import AdminReviews from "./pages/Admin/AdminReviews";
import StaffReviews from "./pages/Staff/StaffReviews";
import Dashboard from "./pages/Admin/Dashboard";
import RoomsList from "./pages/Admin/RoomsList";
import AllBookings from "./pages/Admin/AllBookings";
import Users from "./pages/Admin/Users";
import StaffList from "./pages/Admin/StaffList";
import Packages from "./pages/Admin/Packages";
import Analytics from "./pages/Admin/Analytics";
import Report from "./pages/Admin/Report";
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBookings from "./pages/Staff/StaffBookings";
import StaffProfile from "./pages/Staff/StaffProfile";

// Route Guard
import StaffProtectedRoute from "./routes/StaffProtectedRoute";

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { sToken } = useContext(StaffContext);
  const location = useLocation();
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [isStaffSidebarOpen, setIsStaffSidebarOpen] = useState(false);
  const isBookingsRoute =
    location.pathname === "/all-bookings" || location.pathname === "/staff-bookings";
  const isAdminDashboardRoute = location.pathname === "/admin-dashboard";
  const isAdminAnalyticsRoute = location.pathname === "/admin-analytics";
  const isAdminReportRoute = location.pathname === "/admin-reports";
  const isAdminRoomsRoute = location.pathname === "/rooms-list";
  const isAdminPackagesRoute = location.pathname === "/admin-packages";
  const isAdminUsersRoute = location.pathname === "/admin-users";
  const isAdminStaffListRoute = location.pathname === "/admin-staff-list";

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
                className={`flex-1 bg-[#f8fafc] print:overflow-visible print:bg-white print:p-0 ${
                  isAdminRoomsRoute
                    ? "overflow-hidden p-0"
                  : isAdminPackagesRoute
                      ? "overflow-hidden p-4 lg:p-8"
                    : isAdminUsersRoute || isAdminStaffListRoute
                      ? "overflow-hidden p-4 lg:p-8"
                    : isBookingsRoute
                      ? "overflow-hidden p-0"
                      : "overflow-y-auto p-4 lg:p-8"
                }`}
              >
              <div
                className={`w-full print:mx-0 print:max-w-none print:pb-0 ${
                  isAdminRoomsRoute
                    ? "h-full max-w-none pb-0"
                  : isAdminDashboardRoute
                      ? "mx-auto max-w-7xl pb-0"
                    : isAdminAnalyticsRoute
                      ? "mx-auto max-w-7xl pb-0"
                    : isAdminReportRoute
                      ? "mx-auto max-w-7xl pb-0"
                  : isAdminPackagesRoute
                      ? "h-full mx-auto max-w-7xl pb-0"
                    : isAdminUsersRoute
                      ? "h-full max-w-none pb-0"
                    : isAdminStaffListRoute
                      ? "h-full mx-auto max-w-7xl pb-0"
                    : isBookingsRoute
                      ? "h-full max-w-none pb-0"
                      : "mx-auto max-w-7xl pb-20"
                }`}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/admin-analytics" element={<Analytics />} />
                  <Route path="/rooms-list" element={<RoomsList />} />
                  <Route path="/all-bookings" element={<AllBookings />} />
                  <Route path="/admin-users" element={<Users />} />
                  <Route path="/admin-staff-list" element={<StaffList />} />
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
              className={`flex-1 bg-[#f8fafc] print:overflow-visible print:bg-white print:p-0 ${
                isBookingsRoute ? "overflow-hidden p-0" : "overflow-y-auto"
              }`}
            >
              <div
                className={`w-full print:mx-0 print:max-w-none print:pb-0 ${
                  isBookingsRoute ? "h-full max-w-none pb-0" : "mx-auto max-w-7xl"
                }`}
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
