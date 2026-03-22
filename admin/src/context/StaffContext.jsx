import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  isAccountDisabledMessage,
  storeDisabledAccountNotice,
} from "../utils/accountStatusNotice";

export const StaffContext = createContext();

const SESSION_REFRESH_INTERVAL_MS = 15000;

const StaffContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [sToken, setSToken] = useState(
    localStorage.getItem("sToken") || null
  );

  const [staffData, setStaffData] = useState(null);

  /* =====================================================
     🛡️ AUTO LOGOUT INTERCEPTOR
  ===================================================== */
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!sToken) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const message = error.response?.data?.message || "";

        if ((status === 401 || status === 403) && isAccountDisabledMessage(message)) {
          staffLogout({ silent: true, disabledMessage: message });
        } else if (status === 401) {
          staffLogout({ silent: true });
          toast.error(message || "Session expired. Please login again.");
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [sToken]);

  useEffect(() => {
    if (!sToken) return undefined;

    const verifySession = async () => {
      try {
        await axios.get(`${backendUrl}/api/staff/session`, {
          headers: { token: sToken },
        });
      } catch (error) {
        if (!error.response) {
          console.error("Staff session check failed:", error.message);
        }
      }
    };

    const runVisibleCheck = () => {
      if (document.visibilityState === "visible") {
        verifySession();
      }
    };

    verifySession();

    const interval = setInterval(runVisibleCheck, SESSION_REFRESH_INTERVAL_MS);
    const handleFocus = () => verifySession();
    const handleVisibilityChange = () => runVisibleCheck();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sToken, backendUrl]);

  /* =====================================================
     ✅ CORRECTED: FETCH STAFF PROFILE DATA
  ===================================================== */
  const loadStaffData = async () => {
    try {
      // THIS URL IS NOW CORRECTLY POINTING TO staffRoute.js
      const { data } = await axios.get(`${backendUrl}/api/staff/profile`, {
        headers: { token: sToken }
      });
      
      if (data.success) {
        setStaffData(data.userData); // Based on your staffController.js response
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Failed to load staff data", error);
    }
  };

  useEffect(() => {
    if (sToken) {
      loadStaffData();
    } else {
      setStaffData(null);
    }
  }, [sToken, backendUrl]);

  /* =====================================================
     STAFF LOGIN
  ===================================================== */
  const staffLogin = async (identifier, password) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/staff/login`,
        { identifier, password }
      );

      if (data.success) {
        localStorage.setItem("sToken", data.token);
        setSToken(data.token);
        return data;
      }

      return data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Login failed";
      return { success: false, message: errorMessage };
    }
  };

  /* =====================================================
     FETCH ALL REVIEWS
  ===================================================== */
  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/reviews/all-reviews`,
        {
          headers: { token: sToken }
        }
      );

      if (data.success) {
        return data.reviews;
      }
    } catch (error) {
      toast.error("Failed to load reviews");
      return [];
    }
  };

  /* =====================================================
     STAFF REPLY TO REVIEW
  ===================================================== */
  const postReviewReply = async (reviewId, message) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { response: message },
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply added");
        return true;
      }
    } catch (error) {
      toast.error("Failed to reply");
    }

    return false;
  };

  /* =====================================================
     EDIT REPLY
  ===================================================== */
  const editReviewReply = async (reviewId, replyId, message) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/reviews/reply/${reviewId}/${replyId}`,
        { message },
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply updated");
        return true;
      }
    } catch (error) {
      toast.error("Failed to update reply");
    }

    return false;
  };

  /* =====================================================
     DELETE REPLY
  ===================================================== */
  const deleteReviewReply = async (reviewId, replyId) => {
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/reviews/reply/${reviewId}/${replyId}`,
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply deleted");
        return true;
      }
    } catch (error) {
      toast.error("Failed to delete reply");
    }

    return false;
  };

  /* =====================================================
     STAFF LOGOUT
  ===================================================== */
  const staffLogout = ({ silent = false, disabledMessage = "" } = {}) => {
    localStorage.removeItem("sToken");
    setSToken(null);
    setStaffData(null); 
    if (disabledMessage) {
      storeDisabledAccountNotice(disabledMessage);
    }
  };

  return (
    <StaffContext.Provider
      value={{
        sToken,
        setSToken,
        staffData,
        setStaffData,
        loadStaffData,
        staffLogin,
        staffLogout,
        backendUrl,
        fetchReviews,
        postReviewReply,
        editReviewReply,
        deleteReviewReply
      }}
    >
      {children}
    </StaffContext.Provider>
  );
};

export default StaffContextProvider;
