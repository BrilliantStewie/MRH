import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

const ROOM_REFRESH_INTERVAL_MS = 15000;
const normalizeRoomRecord = (room) =>
  room
    ? {
        ...room,
        roomType: room.roomType || "",
        coverImage: room.coverImage || room.images?.[0] || "",
      }
    : room;

const AppContextProvider = (props) => {
  const currencySymbol = "₱";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [rooms, setRooms] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userData, setUserData] = useState(null);

  const [selectedRooms, setSelectedRooms] = useState(() => {
    const savedRooms = localStorage.getItem("selectedRooms");
    return savedRooms ? JSON.parse(savedRooms).map(normalizeRoomRecord) : [];
  });

  useEffect(() => {
    localStorage.setItem("selectedRooms", JSON.stringify(selectedRooms));
  }, [selectedRooms]);

  // Load User Profile
  const loadUserProfileData = async () => {
    try {
      if (!token) return;

      const { data } = await axios.get(
        backendUrl + "/api/user/profile",
        { headers: { token } }
      );

      if (data.success) {
        setUserData(data.userData);
      } else {
        console.log("Failed to load profile:", data.message);
      }
    } catch (error) {
      console.log("Profile Load Error:", error.message);
    }
  };

  // Sync Token and Profile
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadUserProfileData();
    } else {
      setUserData(null);
      setSelectedRooms([]);
      localStorage.removeItem("token");
    }
  }, [token]);

  const getRoomsData = async ({ silent = false } = {}) => {
    try {
      const { data } = await axios.get(backendUrl + "/api/room/list");
      if (data.success) setRooms((data.rooms || []).map(normalizeRoomRecord));
      else if (!silent) toast.error(data.message);
    } catch (error) {
      if (!silent) {
        toast.error(error.message);
      } else {
        console.error("Rooms refresh error:", error.message);
      }
    }
  };

  useEffect(() => {
    const refreshRooms = () => getRoomsData({ silent: true });

    refreshRooms();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshRooms();
      }
    }, ROOM_REFRESH_INTERVAL_MS);

    const handleFocus = () => refreshRooms();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshRooms();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [backendUrl]);

  const addRoom = (room) => {
    const normalizedRoom = normalizeRoomRecord(room);
    setSelectedRooms((prev) =>
      prev.some((r) => r._id === normalizedRoom._id) 
        ? prev 
        : [...prev, { ...normalizedRoom, useAircon: false }] // 👈 Updated: Added default AC state
    );
  };

  const removeRoom = (roomId) => {
    setSelectedRooms((prev) => prev.filter((r) => r._id !== roomId));
  };

  // 👈 NEW: Function to toggle AC state for a specific selected room
  const toggleAircon = (roomId) => {
    setSelectedRooms((prev) =>
      prev.map((room) =>
        room._id === roomId ? { ...room, useAircon: !room.useAircon } : room
      )
    );
  };

  const toggleAllAircon = (enable) => {
  setSelectedRooms((prev) =>
    prev.map((room) => ({ ...room, useAircon: enable }))
  );
};

  const clearRooms = () => setSelectedRooms([]);

  const value = {
    rooms,
    getRoomsData,
    selectedRooms,
    addRoom,
    removeRoom,
    toggleAircon,
    toggleAllAircon,
    clearRooms,
    currencySymbol,
    token,
    setToken,
    userData,
    setUserData,
    loadUserProfileData,
    backendUrl,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;


