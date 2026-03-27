import { createContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  FRONTEND_REALTIME_EVENT_NAME,
  SOCKET_REALTIME_EVENT_NAME,
} from "../utils/realtime";

export const AppContext = createContext();

const ROOM_REFRESH_INTERVAL_MS = 15000;
const USER_PROFILE_REFRESH_INTERVAL_MS = 15000;
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
  const userProfileRefreshInProgressRef = useRef(false);
  const realtimeSocketRef = useRef(null);

  const [selectedRooms, setSelectedRooms] = useState(() => {
    const savedRooms = localStorage.getItem("selectedRooms");
    return savedRooms ? JSON.parse(savedRooms).map(normalizeRoomRecord) : [];
  });

  useEffect(() => {
    localStorage.setItem("selectedRooms", JSON.stringify(selectedRooms));
  }, [selectedRooms]);

  // Load User Profile
  const loadUserProfileData = async ({ silent = false } = {}) => {
    try {
      if (!token || !backendUrl || userProfileRefreshInProgressRef.current) return;
      userProfileRefreshInProgressRef.current = true;

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
      if (silent) {
        console.error("Profile refresh error:", error.message);
      } else {
        console.log("Profile Load Error:", error.message);
      }
    } finally {
      userProfileRefreshInProgressRef.current = false;
    }
  };

  // Sync Token and Profile
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadUserProfileData({ silent: true });
    } else {
      setUserData(null);
      setSelectedRooms([]);
      localStorage.removeItem("token");
    }
  }, [token, backendUrl]);

  useEffect(() => {
    if (!token || !backendUrl) return undefined;

    const refreshProfile = () => loadUserProfileData({ silent: true });

    refreshProfile();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshProfile();
      }
    }, USER_PROFILE_REFRESH_INTERVAL_MS);

    const handleFocus = () => refreshProfile();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProfile();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, backendUrl]);

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
    if (!backendUrl) return undefined;

    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      auth: token ? { token } : {},
    });

    realtimeSocketRef.current = socket;

    const handleRealtimeUpdate = (payload = {}) => {
      const entity = String(payload?.entity || "").toLowerCase();

      if (["rooms", "settings", "packages"].includes(entity)) {
        getRoomsData({ silent: true });
      }

      if (token && ["profile", "account_status"].includes(entity)) {
        loadUserProfileData({ silent: true });
      }

      window.dispatchEvent(
        new CustomEvent(FRONTEND_REALTIME_EVENT_NAME, {
          detail: payload,
        })
      );
    };

    socket.on(SOCKET_REALTIME_EVENT_NAME, handleRealtimeUpdate);

    return () => {
      socket.off(SOCKET_REALTIME_EVENT_NAME, handleRealtimeUpdate);
      socket.disconnect();
      if (realtimeSocketRef.current === socket) {
        realtimeSocketRef.current = null;
      }
    };
  }, [backendUrl, token]);

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


