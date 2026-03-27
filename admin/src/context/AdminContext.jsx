import { createContext, useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  isAccountDisabledMessage,
  storeDisabledAccountNotice,
} from "../utils/accountStatusNotice";
import {
  ADMIN_REALTIME_EVENT_NAME,
  SOCKET_REALTIME_EVENT_NAME,
} from "../utils/realtime";

export const AdminContext = createContext();

const SESSION_REFRESH_INTERVAL_MS = 15000;
const ADMIN_REALTIME_SYNC_INTERVAL_MS = 15000;
const normalizeRoomRecord = (room) =>
  room
    ? {
        ...room,
        roomType: room.roomType || "",
        coverImage: room.coverImage || room.images?.[0] || "",
      }
    : room;

const deriveStaffUsers = (users = []) =>
  users.filter((user) => user.role === "staff" || user.role === "admin");

const getRequestErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

const AdminContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");

  // 🔥 NEW
  const authHeader = {
    headers: { token: aToken }
  };
  const adminRealtimeSyncInProgressRef = useRef(false);
  const adminRealtimeSocketRef = useRef(null);

  const logoutAdmin = ({ silent = false, disabledMessage = "" } = {}) => {
    localStorage.removeItem("aToken");
    setAToken("");
    if (disabledMessage) {
      storeDisabledAccountNotice(disabledMessage);
    }
  };

  const reportRequestError = (error, fallbackMessage, { silent = false } = {}) => {
    const message = getRequestErrorMessage(error, fallbackMessage);
    if (silent) {
      console.error(fallbackMessage, message);
      return;
    }
    toast.error(message);
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
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const { data } = await axios.post(`${backendUrl}/api/admin/login`, {
        email: normalizedEmail,
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
        message: error.response?.data?.messagerror.message,
      };
    }
  };

  // ============================================================
  // 📊 DASHBOARD
  // ============================================================
  const getDashboardData = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/dashboard`,
        authHeader
      );

      if (data.success) {
        setDashboardData(data.dashData);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch dashboard data", { silent });
    }
  };

  // ============================================================
  // 👥 USERS & STAFF MANAGEMENT
  // ============================================================
  
  const applyUserDirectoryState = (users = []) => {
    setAllUsers(users);
    setAllStaff(deriveStaffUsers(users));
  };

  // Fetches Guests/Users
  const getAllUsers = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/users`, authHeader);

      if (data.success) {
        applyUserDirectoryState(data.users || []);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch users", { silent });
    }
  };

  // ✅ FIXED: Fetches from the correct users endpoint and filters for staff
  const getAllStaff = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/users`, authHeader);

      if (data.success) {
        applyUserDirectoryState(data.users || []);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch staff list", { silent });
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
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to update user status");
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
      toast.error(error.response?.data?.messagerror.message);
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
        getAllUsers();
        return true; 
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      reportRequestError(error, "Failed to create staff");
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
        getAllUsers();
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      reportRequestError(error, "Failed to update staff");
      return false;
    }
  };

  // ============================================================
  // ⚙️ SETTINGS (BUILDINGS & ROOM TYPES)
  // ============================================================
  const getBuildings = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/buildings`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setBuildings(data.buildings);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch buildings", { silent });
    }
  };

  const getRoomTypes = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/room-types`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setRoomTypes(data.types);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch room types", { silent });
    }
  };

  // ============================================================
  // 🛏️ ROOM MANAGEMENT
  // ============================================================
  const getAllRooms = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-rooms`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllRooms((data.rooms || []).map(normalizeRoomRecord));
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch rooms", { silent });
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
  const getAllBookings = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-bookings`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllBookings(data.bookings);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch bookings", { silent });
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

  const updateBookingStayStatus = async (bookingId, action) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/bookings/${bookingId}/stay-status`,
        { action },
        { headers: { token: aToken } }
      );

      if (data.success) {
        toast.success(data.message);
        getAllBookings();
        getDashboardData();
        return true;
      }

      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    }
  };

  // ============================================================
  // 📦 PACKAGES MANAGEMENT
  // ============================================================
  const getAllPackages = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/packages`, {
        headers: { token: aToken },
      });
      if (data.success) {
        setAllPackages(data.packages);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch packages", { silent });
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

  const getAllReviews = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
      if (data.success) {
        setAllReviews(data.reviews);
      } else if (!silent) {
        toast.error(data.message);
      }
    } catch (error) {
      reportRequestError(error, "Failed to fetch reviews", { silent });
    }
  };

  const syncAdminRealtimeData = async ({ silent = true } = {}) => {
    if (!aToken || adminRealtimeSyncInProgressRef.current) {
      return;
    }

    adminRealtimeSyncInProgressRef.current = true;

    try {
      await Promise.allSettled([
        getDashboardData({ silent }),
        getAllBookings({ silent }),
        getAllReviews({ silent }),
        getAllRooms({ silent }),
        getAllUsers({ silent }),
        getAllPackages({ silent }),
        getBuildings({ silent }),
        getRoomTypes({ silent }),
      ]);
    } finally {
      adminRealtimeSyncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!backendUrl || !aToken) return undefined;

    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      auth: { token: aToken },
    });

    adminRealtimeSocketRef.current = socket;

    const handleRealtimeUpdate = (payload = {}) => {
      const entity = String(payload?.entity || "").toLowerCase();

      if (
        [
          "bookings",
          "reviews",
          "rooms",
          "packages",
          "settings",
          "users",
          "profile",
          "account_status",
        ].includes(entity)
      ) {
        syncAdminRealtimeData({ silent: true });
      }

      window.dispatchEvent(
        new CustomEvent(ADMIN_REALTIME_EVENT_NAME, {
          detail: payload,
        })
      );
    };

    socket.on(SOCKET_REALTIME_EVENT_NAME, handleRealtimeUpdate);

    return () => {
      socket.off(SOCKET_REALTIME_EVENT_NAME, handleRealtimeUpdate);
      socket.disconnect();
      if (adminRealtimeSocketRef.current === socket) {
        adminRealtimeSocketRef.current = null;
      }
    };
  }, [backendUrl, aToken]);

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
    toast.error(error.response?.data?.messagerror.message);
    return false;
  }
};

  // ============================================================
  // 🔔 NOTIFICATION INDICATOR LOGIC
  // ============================================================
  // These use useMemo to only recalculate when the data lists change
  const hasNewBookings = useMemo(() => {
    return allBookings.some((booking) => {
      const normalizedStatus = String(booking?.status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

      return normalizedStatus === "pending" || normalizedStatus === "cancellation_pending";
    });
  }, [allBookings]);

  const pendingReviewsCount = useMemo(() => {
    // Counts reviews that do not yet have an admin/staff reply.
    return allReviews.filter((review) => {
      const reviewChat = Array.isArray(review?.reviewChat) ? review.reviewChat : [];
      return !reviewChat.some((chat) =>
        chat && ["admin", "staff"].includes(String(chat.senderRole || "").toLowerCase())
      );
    }).length;
  }, [allReviews]);

  useEffect(() => {
    if (!aToken) return undefined;

    syncAdminRealtimeData({ silent: true });

    const runVisibleSync = () => {
      if (document.visibilityState === "visible") {
        syncAdminRealtimeData({ silent: true });
      }
    };

    const interval = setInterval(runVisibleSync, ADMIN_REALTIME_SYNC_INTERVAL_MS);
    const handleFocus = () => syncAdminRealtimeData({ silent: true });
    const handleVisibilityChange = () => runVisibleSync();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [aToken, backendUrl]);

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
    updateBookingStayStatus,
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



