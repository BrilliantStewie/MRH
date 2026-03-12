import React, { useContext } from "react"; // Removed useEffect, axios
import { Routes, Route, Navigate } from "react-router-dom"; // Removed useNavigate
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Contexts
import { AdminContext } from "./context/AdminContext";
import { StaffContext } from "./context/StaffContext";

// Components
import Sidebar from "./components/Admin/Sidebar";
import Navbar from "./components/Admin/Navbar";
import StaffNavbar from "./components/Staff/StaffNavbar";
import StaffSidebar from "./components/Staff/StaffSidebar";

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
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBookings from "./pages/Staff/StaffBookings";
import StaffProfile from "./pages/Staff/StaffProfile";

// Route Guard
import StaffProtectedRoute from "./routes/StaffProtectedRoute";

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { sToken } = useContext(StaffContext);

  // NOTE: The Security Interceptor is now handled inside AdminContext.jsx
  // This makes the App.jsx much cleaner and prevents duplicate logic.

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans antialiased print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden">
        <ToastContainer position="top-right" autoClose={3000} />
      </div>

      {/* ================= ADMIN LAYOUT ================= */}
      {aToken ? (
        <>
          <div className="print:hidden">
            <Navbar />
          </div>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
            <div className="print:hidden">
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8 print:overflow-visible print:bg-white print:p-0">
              <div className="mx-auto max-w-7xl pb-20 print:mx-0 print:max-w-none print:pb-0">
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
            <StaffNavbar />
          </div>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
            <div className="print:hidden">
              <StaffSidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-slate-50 p-6 print:overflow-visible print:bg-white print:p-0">
              <div className="mx-auto max-w-7xl print:mx-0 print:max-w-none">
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
