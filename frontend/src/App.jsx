import React, { useContext, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "./context/AppContext";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyProfile from "./pages/MyProfile";
import MyBookings from "./pages/MyBookings";
import RoomBooking from "./pages/RoomBooking";
import UploadPayment from "./pages/UploadPayment";
import RetreatBooking from "./pages/RetreatBooking";
import Payment from "./pages/Payment";
import ReviewPage from "./pages/ReviewPage"; 
import AllReviews from "./pages/AllReviews"; 
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, setToken, backendUrl } = useContext(AppContext);

  // ================= SECURITY & AUTO-LOGOUT LOGIC =================
  useEffect(() => {
    // 1. AXIOS INTERCEPTOR: Kicks user if any active request returns 403
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 403) {
          logoutUser();
        }
        return Promise.reject(error);
      }
    );

    // 2. LOGOUT FUNCTION: Clears state and storage
    const logoutUser = () => {
      localStorage.removeItem("token");
      setToken("");
      toast.error("Account disabled or session expired.");
      navigate("/login");
    };

    // 3. HEARTBEAT: Checks the server every 2 minutes even if user is idle
    const heartbeat = setInterval(() => {
      if (token) {
        axios.get(`${backendUrl}/api/user/get-profile`, { headers: { token } })
          .catch((err) => {
            if (err.response && err.response.status === 403) {
              logoutUser();
            }
          });
      }
    }, 120000); // 120,000ms = 2 minutes

    // CLEANUP: Stop the heartbeat and remove interceptor when app closes
    return () => {
      axios.interceptors.response.eject(interceptor);
      clearInterval(heartbeat);
    };
  }, [token, backendUrl, setToken, navigate]);

  // Logic to hide Navbar/Footer on specific pages
  const isFullScreenPage = location.pathname === '/reviews';

  return (
    <div className="w-full overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {!isFullScreenPage && <Navbar />}

      <main className={isFullScreenPage ? "" : "min-h-screen pt-20"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reviews" element={<AllReviews />} />

          <Route path="/*" element={
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <Routes>
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/login" element={<Login />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/retreat-booking" element={<RetreatBooking />} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/rooms/:roomId" element={<RoomBooking />} />
                <Route path="/payment/:id" element={<Payment />} />
                <Route path="/review/:bookingId" element={<ReviewPage />} />
                <Route path="/upload-payment" element={<UploadPayment />} />
              </Routes>
            </div>
          } />
        </Routes>
      </main>

      {!isFullScreenPage && <Footer />}
    </div>
  );
};

export default App;