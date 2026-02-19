import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StaffContext = createContext();

const StaffContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [sToken, setSToken] = useState(
    localStorage.getItem("sToken") || null
  );

  /* =====================================================
     🛡️ AUTO LOGOUT INTERCEPTOR
  ===================================================== */
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("sToken");
          setSToken(null);
          toast.error(
            error.response.data.message || "Session expired. Please login again."
          );
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

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
        toast.success("Staff Login Successful");
        return data;
      } else {
        toast.error(data.message);
        return data;
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Login failed";
      toast.error(errorMessage);
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
  const staffLogout = () => {
    localStorage.removeItem("sToken");
    setSToken(null);
    toast.info("Logged out");
  };

  return (
    <StaffContext.Provider
      value={{
        sToken,
        setSToken,
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
