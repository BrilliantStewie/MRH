import { createContext, useState, useEffect, useMemo } from "react"; // Added useMemo
import axios from "axios";
import { toast } from "react-toastify";
import {
  isAccountDisabledMessage,
  storeDisabledAccountNotice,
} from "../utils/accountStatusNotice";

export const AdminContext = createContext();

const SESSION_REFRESH_INTERVAL_MS = 15000;
const normalizeRoomRecord = (room) =>
  room
    ? {
        ...room,
        roomType: room.roomType || room.room_type || "",
        coverImage: room.coverImage || room.cover_image || room.images?.[0] || "",
      }
    : room;

const AdminContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");

  // 🔥 NEW
  const authHeader = {
    headers: { token: aToken }
  };

  const logoutAdmin = ({ silent = false, disabledMessage = "" } = {}) => {
    localStorage.removeItem("aToken");
    setAToken("");
    if (disabledMessage) {
      storeDisabledAccountNotice(disabledMessage);
    }
  };

  // ============================================================
  // 🛡️ GLOBAL SECURITY INTERCEPTOR (THE FIX)
  // ============================================================
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!aToken) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const msg = error.response?.data?.message || "";

        if ((status === 401 || status === 403) && isAccountDisabledMessage(msg)) {
          logoutAdmin({ silent: true, disabledMessage: msg });
        } else if (status === 401) {
          toast.error(msg || "Session expired. Please login again.");
          logoutAdmin({ silent: true });
        }

        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [aToken]);

  useEffect(() => {
    if (!aToken) return undefined;

    const verifySession = async () => {
      try {
        await axios.get(`${backendUrl}/api/admin/session`, authHeader);
      } catch (error) {
        if (!error.response) {
          console.error("Admin session check failed:", error.message);
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
  }, [aToken, backendUrl]);

  // ============================================================
  // 📊 STATE MANAGEMENT
  // ============================================================
  const [dashboardData, setDashboardData] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allStaff, setAllStaff] = useState([]); 

  // ⚙️ Settings State (For Dynamic Dropdowns)
  const [buildings, setBuildings] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  // ============================================================
  // 🔐 AUTHENTICATION
  // ============================================================
  const adminLogin = async (email, password) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/login`, {
        email,
        password,
      });

      if (data.success) {
        localStorage.setItem("aToken", data.token);
        setAToken(data.token);
        return data;
      } else {
        return data;
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  };

  // ============================================================
  // 📊 DASHBOARD
  // ============================================================
  const getDashboardData = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/dashboard`,
        authHeader
      );

      if (data.success) {
        setDashboardData(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // 👥 USERS & STAFF MANAGEMENT
  // ============================================================
  
  // Fetches Guests/Users
  const getAllUsers = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/users`, authHeader);

      if (data.success) {
        setAllUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ FIXED: Fetches from the correct users endpoint and filters for staff
  const getAllStaff = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/users`, authHeader);

      if (data.success) {
        // Filter by role to ensure only staff members are stored in allStaff state
        const staffOnly = data.users.filter(user => user.role === "staff" || user.role === "admin");
        setAllStaff(staffOnly);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to fetch staff list");
      console.error(error.message);
    }
  };

  const changeUserStatus = async (userId, status) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-user-status`,
        { userId, status },
        authHeader
      );

      if (data.success) {
        toast.success(data.message);
        getAllUsers(); 
        getAllStaff(); // Refresh both lists to keep UI in sync
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addGuestUser = async (guestData) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/add-guest`,
        guestData,
        authHeader
      );

      if (data.success) {
        toast.success(data.message);
        getAllUsers();
        return true;
      }

      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    }
  };

  const createStaff = async (formData) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/create-staff`,
        formData,
        authHeader
      );


      if (data.success) {
        toast.success(data.message);
        getAllStaff(); // Refresh staff list
        return true; 
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const updateStaff = async (id, formData) => {
    try {
      const payload =
        formData instanceof FormData
          ? formData
          : Object.entries(formData || {}).reduce((acc, [key, value]) => {
              if (value !== undefined && value !== null) {
                acc.append(key, value);
              }
              return acc;
            }, new FormData());
      payload.append('id', id); 
      const { data } = await axios.post(
        `${backendUrl}/api/admin/update-staff`,
        payload,
        authHeader
      );

      if (data.success) {
        toast.success(data.message);
        getAllStaff(); // Refresh staff list
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  // ============================================================
  // ⚙️ SETTINGS (BUILDINGS & ROOM TYPES)
  // ============================================================
  const getBuildings = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/buildings`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setBuildings(data.buildings);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getRoomTypes = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/room-types`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setRoomTypes(data.types);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ============================================================
  // 🛏️ ROOM MANAGEMENT
  // ============================================================
  const getAllRooms = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-rooms`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllRooms((data.rooms || []).map(normalizeRoomRecord));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const changeAvailability = async (roomId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-availability`,
        { roomId },
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllRooms();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteRoom = async (id) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-room`,
        { id },
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllRooms();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // 📅 BOOKING MANAGEMENT
  // ============================================================
  const getAllBookings = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-bookings`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllBookings(data.bookings);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const approveBooking = async (bookingId) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/bookings/${bookingId}/approve`,
        {},
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
        getDashboardData(); 
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const declineBooking = async (bookingId) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/bookings/${bookingId}/decline`,
        {},
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
        getDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const paymentConfirmed = async (bookingId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/confirm-payment`,
        { bookingId },
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const approveCancellation = async (bookingId, action = "approve") => {
    try {
        const { data } = await axios.post(
            `${backendUrl}/api/admin/resolve-cancellation`, 
            { bookingId, action }, // Sends "approve" or "reject"
            { headers: { token: aToken } }
        );

        if (data.success) {
            toast.success(data.message);
            getAllBookings(); // Refresh the list
        } else {
            toast.error(data.message);
        }
    } catch (error) {
        toast.error(error.message);
    }
};

  // ============================================================
  // 📦 PACKAGES MANAGEMENT
  // ============================================================
  const getAllPackages = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/packages`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllPackages(data.packages);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addPackage = async (formData) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/add-package`,
        formData,
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllPackages();
        return true;
      }
      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const updatePackage = async (id, formData) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/update-package/${id}`,
        formData,
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllPackages();
        return true;
      }
      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const deletePackage = async (id) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-package/${id}`,
        {},
        { headers: { token: aToken } }
      );
      if (data.success) {
        toast.success("Package deleted successfully");
        getAllPackages();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // 💬 REVIEWS MANAGEMENT
  // ============================================================
  const [allReviews, setAllReviews] = useState([]);

  const getAllReviews = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
      if (data.success) {
        setAllReviews(data.reviews);
      }
    } catch (error) {
      toast.error("Failed to fetch reviews");
    }
  };

  const postReviewReply = async (reviewId, message) => {
  try {
    const { data } = await axios.post(
      `${backendUrl}/api/reviews/reply/${reviewId}`,
      { response: message },
      {
        headers: {
          Authorization: `Bearer ${aToken}`
        }
      }
    );

    if (data.success) {
      toast.success("Reply posted successfully");
      getAllReviews();
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
    return false;
  }
};

  // ============================================================
  // 🔔 NOTIFICATION INDICATOR LOGIC
  // ============================================================
  // These use useMemo to only recalculate when the data lists change
  const hasNewBookings = useMemo(() => {
    return allBookings.some(b => b.status === "Pending" || b.status === "Cancellation Requested");
  }, [allBookings]);

  const pendingReviewsCount = useMemo(() => {
    // Counts reviews that have no replies yet
    return allReviews.filter(r => !r.replies || r.replies.length === 0).length;
  }, [allReviews]);

  // AUTO-FETCH DATA ONCE ADMIN IS AUTHENTICATED
  useEffect(() => {
    if (aToken) {
      getAllBookings();
      getAllReviews();
      getAllRooms();
      getAllUsers();
      getAllStaff();
    }
  }, [aToken]);

  // ============================================================
  // 📤 EXPORT CONTEXT VALUE
  // ============================================================
  const value = {
    backendUrl,
    aToken,
    setAToken,
    adminLogin,
    logoutAdmin,

    // Dashboard
    dashboardData,
    getDashboardData,

    // Users & Staff
    allUsers,
    getAllUsers,
    getAllStaff, 
    changeUserStatus,
    addGuestUser,
    createStaff, 
    updateStaff, 
    allStaff,   

    // Settings
    buildings,
    getBuildings,
    roomTypes,
    getRoomTypes,

    // Rooms
    allRooms,
    getAllRooms,
    changeAvailability,
    deleteRoom,

    // Bookings
    allBookings,
    getAllBookings,
    approveBooking,
    declineBooking,
    paymentConfirmed,
    approveCancellation,
    hasNewBookings, // ✅ Exported for Sidebar

    // Packages
    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,

    // Reviews
    allReviews,
    getAllReviews,
    postReviewReply,
    pendingReviewsCount // ✅ Exported for Sidebar
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;

