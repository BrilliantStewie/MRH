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
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL_MS = 15000;
const USER_ACTIVITY_STORAGE_KEY = "mrh_guest_last_activity_at";

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
  const inactivityTimeoutRef = useRef(null);
  const lastActivityWriteRef = useRef(0);
  const inactivityLogoutRef = useRef(false);

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

  useEffect(() => {
    if (!token || !backendUrl) return undefined;

    const getLastActivityAt = () =>
      Number(localStorage.getItem(USER_ACTIVITY_STORAGE_KEY) || 0);

    const clearInactivityTimeout = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };

    const finalizeIdleLogout = () => {
      forcedLogoutRef.current = true;
      localStorage.removeItem(USER_ACTIVITY_STORAGE_KEY);
      localStorage.removeItem("token");
      setToken("");
      setUserData(null);
      toast.error("Session expired after 30 minutes of inactivity.");
      navigate("/login", { replace: true });
    };

    const triggerIdleLogout = async () => {
      if (inactivityLogoutRef.current || !token) return;

      const lastActivityAt = getLastActivityAt();
      if (lastActivityAt && Date.now() - lastActivityAt < INACTIVITY_TIMEOUT_MS) {
        scheduleIdleCheck();
        return;
      }

      inactivityLogoutRef.current = true;

      try {
        await axios.post(
          `${backendUrl}/api/user/logout`,
          {},
          { headers: { token } }
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
        localStorage.setItem(USER_ACTIVITY_STORAGE_KEY, String(now));
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
      if (event.key === USER_ACTIVITY_STORAGE_KEY) {
        scheduleIdleCheck();
        return;
      }

      if (event.key === "token" && !event.newValue) {
        forcedLogoutRef.current = true;
        setToken("");
        setUserData(null);
        navigate("/login", { replace: true });
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
  }, [token, backendUrl, navigate, setToken, setUserData]);

  // Logic to hide Navbar/Footer on specific pages
  const isFullScreenPage = location.pathname === "/reviews";
  const isLoginPage = location.pathname === "/login";
  const guestPageFrameClassName = isLoginPage ? "w-full bg-[#F4F5F7]" : "w-full";
  const shouldCollapseGuestRoomsGap = !token && location.pathname === "/rooms";
  const mainClassName = isFullScreenPage
    ? ""
    : shouldCollapseGuestRoomsGap
      ? "pt-20"
      : isLoginPage
        ? "pt-20 bg-[#F4F5F7]"
        : "min-h-screen pt-20";

  return (
    <div className="w-full overflow-hidden">
      <StyledToastContainer />
      <ScrollToTop />

      {!isFullScreenPage && <Navbar />}

      <main className={mainClassName}>
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
