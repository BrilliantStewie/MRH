import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const AppProvider = ({ children }) => {
  // ------------------------------------------------
  // 1. CONFIGURATION & STATE
  // ------------------------------------------------
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const currencySymbol = '₱';
  
  const [token, setToken] = useState(localStorage.getItem('token') || false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Room State (Required for Rooms.jsx & Booking Flow)
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // ------------------------------------------------
  // 2. AUTHENTICATION FUNCTIONS
  // ------------------------------------------------
  
  // Load user profile
  const loadUserProfileData = async () => {
    if (!token) {
        setLoading(false);
        return;
    }
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/profile`, {
        headers: { token } // Using custom header 'token' to match your middleware
      });
      
      if (data.success) {
        setUserData(data.userData); 
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log('Profile load error:', error);
      // If token is invalid (expired/manipulated), clear it to prevent loops
      if (error.response?.status === 401 || error.response?.status === 403) {
          logout(); 
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: Logout Function
  const logout = () => {
      setToken(false);
      setUserData(null);
      localStorage.removeItem('token');
      // Optional: Clear selected rooms on logout
      setSelectedRooms([]); 
      toast.info("Logged out successfully");
  };

  // ------------------------------------------------
  // 3. ROOM MANAGEMENT FUNCTIONS
  // ------------------------------------------------

  // Fetch all rooms (Publicly accessible)
  const getRoomsData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/room/list`);
      if (data.success) {
        setRooms(data.rooms);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load rooms");
    }
  };

  // Add room to selection (for booking)
  const addRoom = (room) => {
    const isAlreadySelected = selectedRooms.some((r) => r._id === room._id);
    if (isAlreadySelected) {
        toast.warning("Room already added!");
        return;
    }
    setSelectedRooms((prev) => [...prev, room]);
    toast.success("Room added to selection");
  };

  // Remove room from selection
  const removeRoom = (roomId) => {
    setSelectedRooms((prev) => prev.filter((r) => r._id !== roomId));
    toast.info("Room removed");
  };

  // ------------------------------------------------
  // 4. INITIALIZATION EFFECTS
  // ------------------------------------------------

  useEffect(() => {
    getRoomsData(); // Fetch rooms immediately when app loads
  }, []);

  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(null);
      setLoading(false);
    }
  }, [token]);

  // ------------------------------------------------
  // 5. EXPORTED VALUES
  // ------------------------------------------------

  const value = {
    // Config
    backendUrl,
    currencySymbol,
    loading,

    // Auth
    token, setToken,
    userData, setUserData,
    loadUserProfileData,
    logout, // ✅ Exported logout so Navbar can use it

    // Room Logic
    rooms, 
    getRoomsData,
    selectedRooms, 
    setSelectedRooms,
    addRoom, 
    removeRoom
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;