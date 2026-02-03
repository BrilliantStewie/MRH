// src/context/StaffContext.jsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
} from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StaffContext = createContext(null);

const staffReducer = (state, action) => {
  switch (action.type) {
    case "STAFF_LOADING":
      return { ...state, loading: true };
    case "STAFF_SUCCESS":
      return { ...state, loading: false, error: null, ...action.payload };
    case "STAFF_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "CLEAR_STAFF":
      return {
        sToken: null,
        staffData: null,
        bookings: [],
        dashData: null,
        notifications: [],
        loading: false,
        error: null,
      };
    default:
      return state;
  }
};

const StaffContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(staffReducer, {
    sToken: localStorage.getItem("sToken"),
    staffData: null,
    bookings: [],
    dashData: null,
    notifications: [],
    loading: false,
    error: null,
  });

  const backendUrl = "http://localhost:4000";

  const getStaffData = async () => {
    try {
      dispatch({ type: "STAFF_LOADING" });
      const res = await axios.get(`${backendUrl}/api/staff/get-staff`, {
        headers: { Authorization: state.sToken },
      });
      dispatch({ type: "STAFF_SUCCESS", payload: { staffData: res.data } });
    } catch (err) {
      dispatch({
        type: "STAFF_ERROR",
        payload: err.response?.data?.message || err.message,
      });
    }
  };

  const getDashData = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/staff/dashboard`, {
        headers: { Authorization: state.sToken },
      });
      dispatch({ type: "STAFF_SUCCESS", payload: { dashData: res.data } });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const getBookings = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/staff/bookings`, {
        headers: { Authorization: state.sToken },
      });
      dispatch({ type: "STAFF_SUCCESS", payload: { bookings: res.data } });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const getNotifications = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/staff/notifications`, {
        headers: { Authorization: state.sToken },
      });
      dispatch({
        type: "STAFF_SUCCESS",
        payload: { notifications: res.data },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const checkIn = async (bookingId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/staff/check-in/${bookingId}`,
        {},
        { headers: { Authorization: state.sToken } }
      );
      toast.success(res.data.message);
      getBookings();
      getDashData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const checkOut = async (bookingId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/staff/check-out/${bookingId}`,
        {},
        { headers: { Authorization: state.sToken } }
      );
      toast.success(res.data.message);
      getBookings();
      getDashData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const uploadPaymentProof = async (bookingId, file) => {
    try {
      const formData = new FormData();
      formData.append("paymentProof", file);

      const res = await axios.post(
        `${backendUrl}/api/staff/upload-payment/${bookingId}`,
        formData,
        {
          headers: {
            Authorization: state.sToken,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success(res.data.message);
      getBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/staff/update-profile`,
        profileData,
        { headers: { Authorization: state.sToken } }
      );
      toast.success(res.data.message);
      getStaffData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.put(
        `${backendUrl}/api/staff/mark-read/${notificationId}`,
        {},
        { headers: { Authorization: state.sToken } }
      );
      getNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const logoutStaff = () => {
    localStorage.removeItem("sToken");
    dispatch({ type: "CLEAR_STAFF" });
  };

  useEffect(() => {
    if (state.sToken) {
      getStaffData();
      getDashData();
      getBookings();
      getNotifications();
    }
  }, [state.sToken]);

  const value = {
    ...state,
    getStaffData,
    getDashData,
    getBookings,
    getNotifications,
    checkIn,
    checkOut,
    uploadPaymentProof,
    updateProfile,
    markNotificationRead,
    logoutStaff,
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaffContext = () => useContext(StaffContext);

export default StaffContextProvider;
