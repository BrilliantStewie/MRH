import { createContext, useState, useEffect } from "react"; // Added useEffect
import axios from "axios";
import { toast } from "react-toastify";

export const AdminContext = createContext();

const AdminContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");

  // 🔥 NEW
  const authHeader = {
    headers: { token: aToken }
  };

  // ============================================================
  // 🛡️ GLOBAL SECURITY INTERCEPTOR (THE FIX)
  // ============================================================
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          const msg = error.response.data.message || "";
          if (msg.toLowerCase().includes("not authorized") || msg.toLowerCase().includes("disabled")) {
            toast.error(msg);
            logoutAdmin(); // Instantly clears state so App.jsx redirects
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

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
        toast.success("Welcome back, Admin!");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem("aToken");
    setAToken("");
    toast.info("Logged out successfully");
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
      formData.append('id', id); 
      const { data } = await axios.post(
        `${backendUrl}/api/admin/update-staff`,
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
        setAllRooms(data.rooms);
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

  const deletePackage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-package`,
        { id },
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
      { headers: { token: aToken } }
    );

    if (data.success) {
      toast.success("Reply posted successfully");
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

    // Packages
    allPackages,
    getAllPackages,
    deletePackage,

    // Reviews
    allReviews,
    getAllReviews,
    postReviewReply
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;