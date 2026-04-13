import React, { useContext, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

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
import Dashboard from "./pages/Admin/Dashboard";
import RoomsList from "./pages/Admin/RoomsList";
import AllBookings from "./pages/Admin/AllBookings";
import Users from "./pages/Admin/Users";
import Packages from "./pages/Admin/Packages";
import Report from "./pages/Admin/Report";
import AdminProfile from "./pages/Admin/AdminProfile";
import StaffReviews from "./pages/Staff/StaffReviews";
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBookings from "./pages/Staff/StaffBookings";
import StaffProfile from "./pages/Staff/StaffProfile";

// Route Guard
import StaffProtectedRoute from "./routes/StaffProtectedRoute";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL_MS = 15000;
const ADMIN_ACTIVITY_STORAGE_KEY = "mrh_admin_last_activity_at";
const STAFF_ACTIVITY_STORAGE_KEY = "mrh_staff_last_activity_at";

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
  "/admin-profile": "selfPadded",
  "/rooms-list": "immersive",
  "/all-bookings": "immersive",
  "/staff-bookings": "immersive",
  "/staff-rooms": "immersive",
  "/admin-reviews": "selfPadded",
  "/staff-reviews": "selfPadded",
  "/staff-profile": "selfPadded",
};

const getPanelShellLayout = (pathname) =>
  PANEL_SHELL_VARIANTS[ROUTE_SHELL_MAP[pathname] || "contained"];

const App = () => {
  const { aToken, logoutAdmin, backendUrl: adminBackendUrl } = useContext(AdminContext);
  const { sToken, staffLogout, backendUrl: staffBackendUrl } = useContext(StaffContext);
  const location = useLocation();
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [isStaffSidebarOpen, setIsStaffSidebarOpen] = useState(false);
  const inactivityTimeoutRef = useRef(null);
  const lastActivityWriteRef = useRef(0);
  const inactivityLogoutRef = useRef(false);
  const shellLayout = getPanelShellLayout(location.pathname);
  const backendUrl = adminBackendUrl || staffBackendUrl;

  useEffect(() => {
    setIsAdminSidebarOpen(false);
    setIsStaffSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const activeSession = aToken
      ? {
          token: aToken,
          tokenKey: "aToken",
          activityKey: ADMIN_ACTIVITY_STORAGE_KEY,
          logoutEndpoint: `${backendUrl}/api/admin/logout`,
          clearSession: () => logoutAdmin({ silent: true }),
        }
      : sToken
        ? {
            token: sToken,
            tokenKey: "sToken",
            activityKey: STAFF_ACTIVITY_STORAGE_KEY,
            logoutEndpoint: `${backendUrl}/api/staff/logout`,
            clearSession: () => staffLogout({ silent: true }),
          }
        : null;

    if (!activeSession || !backendUrl) return undefined;

    const getLastActivityAt = () =>
      Number(localStorage.getItem(activeSession.activityKey) || 0);

    const clearInactivityTimeout = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };

    const finalizeIdleLogout = () => {
      localStorage.removeItem(activeSession.activityKey);
      activeSession.clearSession();
      toast.error("Session expired after 30 minutes of inactivity.");
    };

    const triggerIdleLogout = async () => {
      if (inactivityLogoutRef.current || !activeSession.token) return;

      const lastActivityAt = getLastActivityAt();
      if (lastActivityAt && Date.now() - lastActivityAt < INACTIVITY_TIMEOUT_MS) {
        scheduleIdleCheck();
        return;
      }

      inactivityLogoutRef.current = true;

      try {
        await axios.post(
          activeSession.logoutEndpoint,
          {},
          { headers: { token: activeSession.token } }
        );
      } catch (error) {
        console.error("Idle logout request failed:", error.response?.data?.message || error.message);
      } finally {
        finalizeIdleLogout();
        inactivityLogoutRef.current = false;
      }
    };

    const scheduleIdleCheck = () => {
      clearInactivityTimeout();

      const lastActivityAt = getLastActivityAt() || Date.now();
      const remainingMs = INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt);

      if (remainingMs <= 0) {
        void triggerIdleLogout();
        return;
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        void triggerIdleLogout();
      }, remainingMs);
    };

    const recordActivity = ({ force = false } = {}) => {
      const now = Date.now();

      if (force || now - lastActivityWriteRef.current >= ACTIVITY_SYNC_INTERVAL_MS) {
        localStorage.setItem(activeSession.activityKey, String(now));
        lastActivityWriteRef.current = now;
      }

      scheduleIdleCheck();
    };

    const handleActivity = () => recordActivity();
    const handleVisibilityChange = () => {
      const lastActivityAt = getLastActivityAt();

      if (document.visibilityState === "visible" && lastActivityAt) {
        if (Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
          void triggerIdleLogout();
          return;
        }
      }

      scheduleIdleCheck();
    };

    const handleStorage = (event) => {
      if (event.key === activeSession.activityKey) {
        scheduleIdleCheck();
        return;
      }

      if (event.key === activeSession.tokenKey && !event.newValue) {
        activeSession.clearSession();
      }
    };

    if (!getLastActivityAt()) {
      recordActivity({ force: true });
    } else if (Date.now() - getLastActivityAt() >= INACTIVITY_TIMEOUT_MS) {
      void triggerIdleLogout();
    } else {
      scheduleIdleCheck();
    }

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInactivityTimeout();
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [aToken, sToken, backendUrl, logoutAdmin, staffLogout]);

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
                  <Route path="/admin-profile" element={<AdminProfile />} />
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
                    path="/staff-rooms"
                    element={
                      <StaffProtectedRoute>
                        <RoomsList readOnly />
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
