import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

const AppProvider = ({ children }) => {
  // ==============================
  // CONFIG
  // ==============================
  const backendUrl = import.meta.env.VITE_BACKEND_URL; // ✅ NO fallback
  const currencySymbol = "₱";

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // ==============================
  // AUTH
  // ==============================
  const loadUserProfileData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/profile`,
        {
          headers: { token },
        }
      );

      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUserData(null);
    setSelectedRooms([]);
    toast.info("Logged out");
  };

  // ==============================
  // ROOMS (PUBLIC)
  // ==============================
  const getRoomsData = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/room/list`
      );

      if (data.success) {
        setRooms(data.rooms);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to load rooms");
    }
  };

  const addRoom = (room) => {
    if (selectedRooms.some((r) => r._id === room._id)) {
      toast.warning("Room already added");
      return;
    }
    setSelectedRooms((prev) => [...prev, room]);
  };

  const removeRoom = (roomId) => {
    setSelectedRooms((prev) =>
      prev.filter((r) => r._id !== roomId)
    );
  };

  // ==============================
  // EFFECTS
  // ==============================
  useEffect(() => {
    getRoomsData();
  }, []);

  useEffect(() => {
    if (token) loadUserProfileData();
    else setLoading(false);
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        currencySymbol,
        loading,
        token,
        setToken,
        userData,
        logout,
        rooms,
        getRoomsData,
        selectedRooms,
        addRoom,
        removeRoom,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
