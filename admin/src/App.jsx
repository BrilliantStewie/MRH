import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Context
import { AdminContext } from "./context/AdminContext";

// Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";

// Pages
import Dashboard from "./pages/admin/Dashboard";
import RoomsList from "./pages/admin/RoomsList";
import AllBookings from "./pages/admin/AllBookings";
import Users from "./pages/admin/Users";
import StaffList from "./pages/admin/StaffList";
import Packages from "./pages/admin/Packages";

const App = () => {
  // Get Admin Token (aToken) from AdminContext to manage session
  const { aToken } = useContext(AdminContext);

  return (
    <div className="bg-slate-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} />

      {aToken ? (
        // --------------------------------------------------
        // 🔐 AUTHENTICATED ADMIN LAYOUT
        // --------------------------------------------------
        <>
          <Navbar />
          <div className="flex items-start">
            <Sidebar />

            <main className="flex-1 h-screen overflow-y-auto bg-slate-50 p-4 transition-all pb-20">
              <Routes>
                {/* Redirect root "/" to Dashboard when logged in */}
                <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />

                {/* Main Admin Pages */}
                <Route path="/admin-dashboard" element={<Dashboard />} />
                <Route path="/rooms-list" element={<RoomsList />} />
                <Route path="/all-bookings" element={<AllBookings />} />
                <Route path="/admin-users" element={<Users />} />
                <Route path="/admin-staff-list" element={<StaffList />} />
                <Route path="/admin-packages" element={<Packages />} />

                {/* Catch-all: Redirect unknown routes to Dashboard */}
                <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </>
      ) : (
        // --------------------------------------------------
        // 🔓 PUBLIC / LOGIN LAYOUT
        // --------------------------------------------------
        <Routes>
          <Route path="/" element={<Login />} />
          {/* Redirect any random URL to Login if not authenticated */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
};

export default App;