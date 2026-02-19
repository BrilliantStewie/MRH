import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Contexts
import { AdminContext } from "./context/AdminContext";
import { StaffContext } from "./context/StaffContext";

// Admin Components - Matches folder "Admin"
import Sidebar from "./components/Admin/Sidebar";
import Navbar from "./components/Admin/Navbar";

// Staff Components - Matches folder "Staff"
import StaffNavbar from "./components/Staff/StaffNavbar";
import StaffSidebar from "./components/Staff/StaffSidebar";

// Pages
import Login from "./pages/Login";
// UPDATED: Matches the new page component name
import AdminReviews from "./pages/Admin/AdminReviews"; 

// Admin Pages - Matches folder "pages/Admin"
import Dashboard from "./pages/Admin/Dashboard";
import RoomsList from "./pages/Admin/RoomsList";
import AllBookings from "./pages/Admin/AllBookings";
import Users from "./pages/Admin/Users";
import StaffList from "./pages/Admin/StaffList";
import Packages from "./pages/Admin/Packages";
import Analytics from "./pages/Admin/Analytics";

// Staff Pages - Matches folder "pages/Staff"
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBookings from "./pages/Staff/StaffBookings";
import StaffProfile from "./pages/Staff/StaffProfile";

// Route Guard
import StaffProtectedRoute from "./routes/StaffProtectedRoute";

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { sToken } = useContext(StaffContext);

  return (
    <div className="bg-slate-50 h-screen flex flex-col overflow-hidden font-sans antialiased">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ================= ADMIN ================= */}
      {aToken ? (
        <>
          <Navbar />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
              <div className="max-w-7xl mx-auto pb-20">
                <Routes>
                  <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/admin-analytics" element={<Analytics />} />
                  <Route path="/rooms-list" element={<RoomsList />} />
                  <Route path="/all-bookings" element={<AllBookings />} />
                  <Route path="/admin-users" element={<Users />} />
                  <Route path="/admin-staff-list" element={<StaffList />} />
                  <Route path="/admin-packages" element={<Packages />} />
                  {/* UPDATED: Matches the Sidebar to link */}
                  <Route path="/admin-reviews" element={<AdminReviews />} /> 
                  <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </>
      ) : sToken ? (
        /* ================= STAFF ================= */
        <>
          <StaffNavbar />

          <div className="flex flex-1 overflow-hidden">
            <StaffSidebar />

            <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="max-w-7xl mx-auto">
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
                  
                  {/* UPDATED: Path to remain consistent */}
                  <Route path="/admin-reviews" element={<AdminReviews />} />

                  <Route
                    path="*"
                    element={<Navigate to="/staff-dashboard" replace />}
                  />
                </Routes>
              </div>
            </main>
          </div>
        </>
      ) : (
        /* ================= LOGIN & PUBLIC ================= */
        <div className="flex-1 flex items-center justify-center bg-slate-100">
          <Routes>
            <Route path="/" element={<Login />} />
            {/* UPDATED: Path to remain consistent */}
            <Route path="/admin-reviews" element={<AdminReviews />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
};

export default App;