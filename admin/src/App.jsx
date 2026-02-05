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
import Analytics from "./pages/admin/Analytics";

const App = () => {
  const { aToken } = useContext(AdminContext);

  return (
    /* FIX 1: Set the root div to h-screen and overflow-hidden. 
      This prevents the browser window itself from ever scrolling.
    */
    <div className="bg-slate-50 h-screen flex flex-col overflow-hidden font-sans antialiased">
      <ToastContainer position="top-right" autoClose={3000} />

      {aToken ? (
        <>
          {/* Navbar stays fixed at the top because of the flex-col parent */}
          <Navbar />

          {/* FIX 2: This wrapper takes up the remaining height (flex-1).
            overflow-hidden ensures child components handle their own scrolling.
          */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            {/* FIX 3: Removed 'h-screen'. 
              'flex-1' makes it fill the remaining width.
              'overflow-y-auto' makes ONLY the main content area scrollable.
            */}
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8 transition-all">
              <div className="max-w-7xl mx-auto pb-20">
                <Routes>
                  {/* Redirect root "/" to Dashboard */}
                  <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />

                  {/* Operational Routes */}
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/admin-analytics" element={<Analytics />} />
                  <Route path="/rooms-list" element={<RoomsList />} />
                  <Route path="/all-bookings" element={<AllBookings />} />
                  <Route path="/admin-users" element={<Users />} />
                  <Route path="/admin-staff-list" element={<StaffList />} />
                  <Route path="/admin-packages" element={<Packages />} />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </>
      ) : (
        /* Login Layout */
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