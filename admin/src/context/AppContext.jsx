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
  const [loading, setLoading] = useState(true); // Initial loading state

  // Rooms State
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // ==============================
  // 🔐 AUTH & PROFILE
  // ==============================
  const loadUserProfileData = async () => {
    // If no token exists, stop loading and return
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
      } else {
        // If token is invalid (e.g., expired), clear it to reset state
        toast.error(data.message);
        if (data.message === "Invalid token" || data.message === "Authentication failed") {
            setToken("");
            localStorage.removeItem("token");
        }
      }
    } catch (error) {
      console.error("Profile Load Error:", error);
      // Optional: Clear token on 401 Unauthorized
      if (error.response && error.response.status === 401) {
         setToken("");
         localStorage.removeItem("token");
      }
    } finally {
      setLoading(false);
    }
  };

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
      toast.error("Failed to load rooms");
    }
  };

  // ==============================
  // 🛒 ROOM SELECTION LOGIC
  // ==============================
  const addRoom = (room) => {
    // Prevent duplicates
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
        loadUserProfileData();
    } else {
        setUserData(null);
        setLoading(false);
    }
  }, [token]);

  // ==============================
  // 📤 EXPORT
  // ==============================
  const value = {
    backendUrl,
    currencySymbol,
    loading,
    
    // Auth
    token,
    setToken,
    userData,
    setUserData,
    loadUserProfileData,
    
    // Data
    rooms,
    getRoomsData,
    
    // Selection
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