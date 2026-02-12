import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AdminContext = createContext();

const AdminContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");

  // ==============================
  // 📊 STATE
  // ==============================
  const [allUsers, setAllUsers] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [allPackages, setAllPackages] = useState([]);

  const getAuthHeaders = () => ({
    headers: { token: aToken }, 
  });

  // ==============================
  // 🔐 AUTH (STRICTLY EMAIL)
  // ==============================
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

  const logoutAdmin = () => {
    localStorage.removeItem("aToken");
    setAToken("");
    toast.info("Logged out successfully");
  };

  // ==============================
  // 📊 DASHBOARD
  // ==============================
  const getDashboardData = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/dashboard`,
        getAuthHeaders()
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

  // ==============================
  // 👥 USERS (FIXED RETURNS)
  // ==============================
  const getAllUsers = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/users`,
        getAuthHeaders()
      );
      if (data.success) setAllUsers(data.users);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ FIXED: Now returns TRUE on success
  const createStaff = async (formData) => {
    if (!aToken) return false;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/create-staff`,
        formData,
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllUsers(); // Refresh list
        return true;   // Tell component to close
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    }
  };

  // ✅ ADDED: Missing updateStaff function
  const updateStaff = async (userId, formData) => {
    if (!aToken) return false;
    try {
      // Append ID to formData if not already there, or send as query param/body
      // NOTE: Since we use FormData for images, we usually put ID inside FormData
      formData.append("userId", userId);

      const { data } = await axios.post(
        `${backendUrl}/api/admin/update-staff`, // Ensure this matches your route
        formData,
        getAuthHeaders()
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
      toast.error(error.response?.data?.message || error.message);
      return false;
    }
  };

  const changeUserStatus = async (userId) => {
    if (!aToken) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-user-status`,
        { userId },
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllUsers(); 
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ==============================
  // 🛏️ ROOMS
  // ==============================
  const getAllRooms = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/all-rooms`,
        getAuthHeaders()
      );
      if (data.success) setAllRooms(data.rooms);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const changeAvailability = async (roomId) => {
    if (!aToken) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-availability`,
        { roomId },
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllRooms();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteRoom = async (roomId) => {
    if (!aToken) return;
    if (!roomId) {
      toast.error("Room ID required");
      return;
    }

    if (!window.confirm("Delete this room?")) return;

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-room`,
        { id: roomId },
        getAuthHeaders()
      );

      if (data.success) {
        toast.success("Room deleted successfully");
        getAllRooms();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Delete Room Error:", error);
      toast.error(error.response?.data?.message || "Failed to delete room");
    }
  };

  // ==============================
  // 📅 BOOKINGS
  // ==============================
  const getAllBookings = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/all-bookings`,
        getAuthHeaders()
      );
      if (data.success) setAllBookings(data.bookings);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const approveBooking = async (bookingId) => {
    if (!aToken) return;
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/all-bookings/${bookingId}/approve`,
        {},
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const declineBooking = async (bookingId) => {
    if (!aToken) return;
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/all-bookings/${bookingId}/decline`,
        {},
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const approveCancellation = async (bookingId, action) => {
    if (!aToken) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/approve-cancellation`,
        { bookingId, action },
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const paymentConfirmed = async (bookingId) => {
    if (!aToken) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/confirm-payment`,
        { bookingId },
        getAuthHeaders()
      );
      if (data.success) {
        toast.success(data.message);
        getAllBookings();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ==============================
  // 📦 PACKAGES
  // ==============================
  const getAllPackages = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/packages`,
        getAuthHeaders()
      );
      if (data.success) setAllPackages(data.packages);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addPackage = async (pkg) => {
    if (!aToken) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/packages`,
        pkg,
        getAuthHeaders()
      );
      if (data.success) {
        toast.success("Package added");
        getAllPackages();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updatePackage = async (id, pkg) => {
    if (!aToken) return;
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/packages/${id}`,
        pkg,
        getAuthHeaders()
      );
      if (data.success) {
        toast.success("Package updated");
        getAllPackages();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deletePackage = async (id) => {
    if (!aToken) return;
    if (!window.confirm("Delete this package?")) return;

    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/packages/${id}`,
        getAuthHeaders()
      );
      if (data.success) {
        toast.success("Package deleted");
        getAllPackages();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ==============================
  // 📤 CONTEXT VALUE
  // ==============================
  const value = {
    backendUrl,
    aToken,
    setAToken,

    adminLogin,
    logoutAdmin,

    dashboardData,
    getDashboardData,

    allRooms,
    getAllRooms,
    changeAvailability,
    deleteRoom,

    allBookings,
    getAllBookings,
    approveBooking,
    declineBooking,
    approveCancellation,
    paymentConfirmed,

    allPackages,
    getAllPackages,
    addPackage,
    updatePackage,
    deletePackage,

    allUsers,
    getAllUsers,
    createStaff,
    updateStaff, // ✅ Exported here
    changeUserStatus, 
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;