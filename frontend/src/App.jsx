import React, { useContext, useEffect, useRef } from "react";
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
import RetreatBooking from "./pages/RetreatBooking";
import Payment from "./pages/Payment";
import ReviewPage from "./pages/ReviewPage";
import AllReviews from "./pages/AllReviews";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { toast } from "react-toastify";
import VerifyOtp from "./pages/VerifyOtp";
import {
  isAccountDisabledMessage,
  storeDisabledAccountNotice,
} from "./utils/accountStatusNotice";

const SESSION_REFRESH_INTERVAL_MS = 15000;

// 👈 ADDED: ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
};

import StyledToastContainer from "./components/StyledToastContainer";

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, setToken, setUserData, backendUrl } = useContext(AppContext);
  const forcedLogoutRef = useRef(false);

  // ================= SECURITY & AUTO-LOGOUT LOGIC =================
  useEffect(() => {
    const handleForcedLogout = ({ disabled = false, message = "" } = {}) => {
      if (forcedLogoutRef.current || !token) return;

      forcedLogoutRef.current = true;
      localStorage.removeItem("token");
      setToken("");
      setUserData(null);

      if (disabled) {
        storeDisabledAccountNotice(message);
      } else {
        toast.error(message || "Session expired. Please log in again.");
      }

      navigate("/login", { replace: true });
    };

    const isDisabledResponse = (error) => {
      const status = error.response?.status;
      const message = error.response?.data?.message || "";

      return (
        status === 403 &&
        (error.response?.data?.isAccountDisabled === true ||
          isAccountDisabledMessage(message))
      );
    };

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || "";

        if (isDisabledResponse(error)) {
          handleForcedLogout({ disabled: true, message });
        } else if (status === 401 && token) {
          handleForcedLogout({ message });
        }

        return Promise.reject(error);
      }
    );

    const checkSession = () => {
      if (!token) return;

      axios
        .get(`${backendUrl}/api/user/profile`, { headers: { token } })
        .catch((err) => {
          const status = err.response?.status;
          const message = err.response?.data?.message || "";

          if (isDisabledResponse(err)) {
            handleForcedLogout({ disabled: true, message });
          } else if (status === 401) {
            handleForcedLogout({ message });
          }
        });
    };

    const runVisibleCheck = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    checkSession();

    const heartbeat = setInterval(runVisibleCheck, SESSION_REFRESH_INTERVAL_MS);
    const handleFocus = () => checkSession();
    const handleVisibilityChange = () => runVisibleCheck();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      axios.interceptors.response.eject(interceptor);
      clearInterval(heartbeat);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, backendUrl, setToken, setUserData, navigate]);

  useEffect(() => {
    if (!token) {
      forcedLogoutRef.current = false;
    }
  }, [token]);

  // Logic to hide Navbar/Footer on specific pages
  const isFullScreenPage = location.pathname === "/reviews";
  const guestPageFrameClassName = "w-full";

  return (
    <div className="w-full overflow-hidden">
      <StyledToastContainer />
      <ScrollToTop />

      {!isFullScreenPage && <Navbar />}

      <main className={isFullScreenPage ? "" : "min-h-screen pt-20"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reviews" element={<AllReviews />} />

          <Route
            path="/*"
            element={
              <div className={guestPageFrameClassName}>
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
                  <Route path="/verify-otp" element={<VerifyOtp />} />
                </Routes>
              </div>
            }
          />
        </Routes>
      </main>

      {!isFullScreenPage && <Footer />}
    </div>
  );
};

export default App;
