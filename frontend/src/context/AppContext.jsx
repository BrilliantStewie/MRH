import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "₱";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [rooms, setRooms] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userData, setUserData] = useState(null);

  const [selectedRooms, setSelectedRooms] = useState(() => {
    const savedRooms = localStorage.getItem("selectedRooms");
    return savedRooms ? JSON.parse(savedRooms) : [];
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
      console.log(error);
      // toast.error(error.message); 
    }
  };

  // Sync Token
  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(null);
      setSelectedRooms([]);
      localStorage.removeItem("token");
    }
  }, [token]);

  const getRoomsData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/room/list");
      if (data.success) setRooms(data.rooms);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addRoom = (room) => {
    setSelectedRooms((prev) =>
      prev.some((r) => r._id === room._id) ? prev : [...prev, room]
    );
  };

  const removeRoom = (roomId) => {
    setSelectedRooms((prev) => prev.filter((r) => r._id !== roomId));
  };

  const clearRooms = () => setSelectedRooms([]);

  const value = {
    rooms,
    getRoomsData,
    selectedRooms,
    addRoom,
    removeRoom,
    clearRooms,
    currencySymbol,
    token,
    setToken,
    userData,
    setUserData,         // ✅ Make sure this is here
    loadUserProfileData, // ✅ CRITICAL FIX: Make sure this is here
    backendUrl,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;