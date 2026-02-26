import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const AppProvider = ({ children }) => {
  // ==============================
  // CONFIG
  // ==============================
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const currencySymbol = "₱";

  // Auth State
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rooms State
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // ==============================
  // 🔐 AUTH & PROFILE LOGIC
  // ==============================

  // 🧹 Helper to clear storage and state (Now accessible globally)
  const logoutUser = () => {
    setToken("");
    setUserData(null);
    localStorage.removeItem("token");
    // This state change will trigger the ternary logic in App.jsx instantly
  };

  const loadUserProfileData = async () => {
    if (!token) {
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/profile`,
        { headers: { token } }
      );

      if (data.success) {
        setUserData(data.userData);
      } 
    } catch (error) {
      console.log("Profile Load Error:", error);
      // Note: 403 errors are now handled by the Interceptor below
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // 🛡️ GLOBAL SECURITY INTERCEPTOR
  // ==============================
  // This is the "secret sauce" that prevents needing a refresh.
  // It listens to EVERY axios call made in the app.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // If backend returns 403 (Forbidden) or 401 (Unauthorized)
        if (error.response && (error.response.status === 403 || error.response.status === 401)) {
          const msg = error.response.data.message || "";
          if (msg.toLowerCase().includes("disabled") || msg.toLowerCase().includes("not authorized")) {
            toast.error(msg || "Account disabled. Logging out...");
            logoutUser();
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // ==============================
  // 🛏️ DATA FETCHING
  // ==============================
  const getRoomsData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/room/list`);
      if (data.success) {
        setRooms(data.rooms);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ==============================
  // 🛒 ROOM SELECTION LOGIC
  // ==============================
  const addRoom = (room) => {
    if (selectedRooms.some((r) => r._id === room._id)) {
      toast.warning("Room already added");
      return;
    }
    setSelectedRooms((prev) => [...prev, room]);
  };

  const removeRoom = (roomId) => {
    setSelectedRooms((prev) => prev.filter((r) => r._id !== roomId));
  };

  const clearSelectedRooms = () => {
    setSelectedRooms([]);
  };

  // ==============================
  // 🔄 EFFECTS
  // ==============================
  
  // 1. Load Rooms on Mount
  useEffect(() => {
    getRoomsData();
  }, []);

  // 2. Load Profile when Token Changes
  useEffect(() => {
    if (token) {
        localStorage.setItem("token", token);
        loadUserProfileData();
    } else {
        logoutUser();
        setLoading(false);
    }
  }, [token]);

  const value = {
    backendUrl,
    currencySymbol,
    loading,
    token,
    setToken,
    userData,
    setUserData,
    loadUserProfileData,
    logoutUser,
    rooms,
    getRoomsData,
    selectedRooms,
    addRoom,
    removeRoom,
    clearSelectedRooms
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;