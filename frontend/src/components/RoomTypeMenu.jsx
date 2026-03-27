import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  Users,
} from "lucide-react";
import { AppContext } from "../context/AppContext";
import singleRoom from "../assets/singleRoom.svg";
import singleRoomPullout from "../assets/singleRoomPullout.svg";
import dormRoom from "../assets/dormRoom.svg";
import {
  FRONTEND_REALTIME_EVENT_NAME,
  matchesRealtimeEntity,
} from "../utils/realtime";

const normalize = (value = "") => String(value).trim().toLowerCase();
const ROOM_TYPE_REFRESH_INTERVAL_MS = 15000;

const ROOM_TYPE_DEFAULTS = [
  {
    key: "individual",
    roomtype: "Individual",
    filterValue: "Individual",
    image: singleRoom,
    description:
      "A private room for solo stays, quiet retreats, and guests who prefer a simple space to rest on their own.",
    setup: "Single Bed",
    price: "PHP 1,000",
  },
  {
    key: "individual with pullout",
    roomtype: "Individual with Pullout",
    filterValue: "Individual with Pullout",
    image: singleRoomPullout,
    description:
      "A private room with a main bed and pullout bed, ideal for two guests or anyone who needs extra sleeping space.",
    setup: "Main Bed + Pullout",
    price: "PHP 1,500",
  },
  {
    key: "dormitory",
    roomtype: "Dormitory",
    filterValue: "Dormitory",
    image: dormRoom,
    description:
      "A shared room setup for group stays, retreats, and budget-friendly bookings with a community-style arrangement.",
    setup: "Multiple Beds",
    price: "PHP 800",
  },
];

const ROOM_TYPE_DEFAULT_MAP = ROOM_TYPE_DEFAULTS.reduce((map, item) => {
  map[item.key] = item;
  return map;
}, {});

const ROOM_TYPE_ORDER = ROOM_TYPE_DEFAULTS.reduce((map, item, index) => {
  map[item.key] = index + 1;
  return map;
}, {});

const getFallbackImage = (roomType) => {
  const normalizedType = normalize(roomType);

  if (normalizedType.includes("pullout")) return singleRoomPullout;
  if (normalizedType.includes("dorm")) return dormRoom;
  return singleRoom;
};

const formatCapacity = (rooms) => {
  const capacities = rooms
    .map((room) => Number(room.capacity))
    .filter((capacity) => Number.isFinite(capacity) && capacity > 0);

  if (!capacities.length) return "Capacity Coming Soon";

  const minCapacity = Math.min(...capacities);
  const maxCapacity = Math.max(...capacities);

  if (minCapacity === maxCapacity) {
    return `${minCapacity} ${minCapacity === 1 ? "Guest" : "Guests"}`;
  }

  return `${minCapacity}-${maxCapacity} Guests`;
};

const inferSetup = (roomType) => {
  const normalizedType = normalize(roomType);

  if (normalizedType.includes("pullout")) return "Main Bed + Pullout";
  if (normalizedType.includes("dorm")) return "Multiple Beds";
  if (normalizedType.includes("individual")) return "Single Bed";
  if (normalizedType.includes("family")) return "Family Setup";
  if (normalizedType.includes("suite")) return "Suite Setup";

  return "Standard Setup";
};

const buildFallbackDescription = (roomType, roomCount) => {
  const label = String(roomType || "room").trim();
  const lowerLabel = label.toLowerCase();

  if (roomCount === 0) {
    return `A new ${lowerLabel} option will appear here once rooms are assigned to this type.`;
  }

  if (normalize(roomType).includes("dorm")) {
    return `A shared ${lowerLabel} option suited for retreats, group stays, and guests who prefer a community-style room.`;
  }

  if (normalize(roomType).includes("pullout")) {
    return `A flexible ${lowerLabel} option for guests who need extra sleeping space in one room.`;
  }

  return `A ${lowerLabel} accommodation designed for restful stays at Mercedarian Retreat House.`;
};

const sortRoomTypes = (types) =>
  [...types].sort((a, b) => {
    const normalizedA = normalize(a);
    const normalizedB = normalize(b);
    const rankA = ROOM_TYPE_ORDER[normalizedA] ?? 99;
    const rankB = ROOM_TYPE_ORDER[normalizedB] ?? 99;

    if (rankA !== rankB) return rankA - rankB;
    return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
  });

const RoomTypeMenu = () => {
  const { rooms, backendUrl } = useContext(AppContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [roomTypeNames, setRoomTypeNames] = useState([]);
  const navigate = useNavigate();

  const fetchRoomTypes = async ({ silent = false } = {}) => {
    if (!backendUrl) return;

    try {
      const { data } = await axios.get(`${backendUrl}/api/room/types`);

      if (data.success) {
        setRoomTypeNames(
          data.types
            .map((type) => String(type?.name || "").trim())
            .filter(Boolean)
        );
      }
    } catch (error) {
      if (!silent) {
        console.error("Error fetching room types:", error);
      }
    }
  };

  useEffect(() => {
    if (backendUrl) {
      fetchRoomTypes({ silent: true });
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRoomTypes({ silent: true });
      }
    }, ROOM_TYPE_REFRESH_INTERVAL_MS);

    const handleFocus = () => fetchRoomTypes({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchRoomTypes({ silent: true });
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

  useEffect(() => {
    if (!backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["rooms", "settings"])) {
        fetchRoomTypes({ silent: true });
      }
    };

    window.addEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [backendUrl]);

  const roomTypes = useMemo(() => {
    const roomsByType = new Map();

    (rooms || []).forEach((room) => {
      const roomType = String(room.roomType || "").trim();
      if (!roomType) return;

      const key = normalize(roomType);
      if (!roomsByType.has(key)) {
        roomsByType.set(key, { label: roomType, rooms: [] });
      }

      roomsByType.get(key).rooms.push(room);
    });

    const discoveredTypes = Array.from(roomsByType.values()).map((entry) => entry.label);
    const typeNames = roomTypeNames.length ? roomTypeNames : discoveredTypes;
    const uniqueTypeNames = [];
    const seenTypes = new Set();

    typeNames.forEach((type) => {
      const label = String(type || "").trim();
      const key = normalize(label);

      if (!label || seenTypes.has(key)) return;

      seenTypes.add(key);
      uniqueTypeNames.push(label);
    });

    const slides = sortRoomTypes(uniqueTypeNames).map((roomType) => {
      const key = normalize(roomType);
      const defaults = ROOM_TYPE_DEFAULT_MAP[key];
      const matchingRooms = roomsByType.get(key)?.rooms || [];
      const featuredRoom =
        matchingRooms.find((room) => room.coverImage || room.images?.length) ||
        matchingRooms[0];

      return {
        roomtype: roomType,
        filterValue: roomType,
        image:
          featuredRoom?.coverImage ||
          featuredRoom?.images?.[0] ||
          getFallbackImage(roomType),
        description:
          defaults?.description ||
          featuredRoom?.description ||
          buildFallbackDescription(roomType, matchingRooms.length),
        capacity: formatCapacity(matchingRooms),
        setup: defaults?.setup || inferSetup(roomType),
        price: defaults?.price || null,
      };
    });

    return slides.length ? slides : ROOM_TYPE_DEFAULTS;
  }, [roomTypeNames, rooms]);

  useEffect(() => {
    if (currentIndex >= roomTypes.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, roomTypes.length]);

  useEffect(() => {
    if (isPaused || roomTypes.length <= 1) return undefined;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % roomTypes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, roomTypes.length]);

  const handleNext = () => {
    if (!roomTypes.length) return;
    setCurrentIndex((prev) => (prev + 1) % roomTypes.length);
  };

  const handlePrev = () => {
    if (!roomTypes.length) return;
    setCurrentIndex((prev) => (prev - 1 + roomTypes.length) % roomTypes.length);
  };

  const currentRoom = roomTypes[currentIndex] || roomTypes[0];

  if (!currentRoom) return null;

  return (
    <section
      className="group/slider relative min-h-[70svh] w-full overflow-hidden bg-slate-900 text-white sm:min-h-[700px] lg:h-screen"
      id="room-type"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button
        onClick={handlePrev}
        className="absolute bottom-6 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all duration-300 group hover:bg-white hover:text-slate-900 sm:bottom-auto sm:top-1/2 sm:h-14 sm:w-14 sm:-translate-y-1/2 sm:hover:-translate-x-2 md:left-8"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 bottom-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all duration-300 group hover:bg-white hover:text-slate-900 sm:bottom-auto sm:top-1/2 sm:h-14 sm:w-14 sm:-translate-y-1/2 sm:hover:translate-x-2 md:right-8"
      >
        <ChevronRight size={28} />
      </button>

      {roomTypes.map((room, index) => (
        <div
          key={`${room.filterValue}-${index}`}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "z-10 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <img
            src={room.image}
            alt={room.roomtype}
            className={`h-full w-full object-cover object-center transition-transform ease-linear ${
              index === currentIndex && !isPaused ? "scale-110" : "scale-100"
            }`}
            style={{ transitionDuration: "10s" }}
          />
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
        <div className="pointer-events-auto mx-auto grid w-full max-w-7xl grid-cols-1 items-end gap-8 px-4 pb-20 sm:gap-10 sm:px-8 sm:pb-24 md:px-16 lg:grid-cols-12 lg:gap-12 lg:pb-0 xl:px-24">
          <div className="space-y-6 lg:col-span-7 lg:mb-12 lg:space-y-8">
            <div
              key={currentIndex}
              className="animate-in fade-in slide-in-from-left-8 duration-700"
            >
              <div className="mb-4 flex items-center gap-3 sm:mb-6">
                <span className="h-px w-12 bg-blue-400"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
                  Room {currentIndex + 1} of {roomTypes.length}
                </span>
              </div>

              <h2 className="mb-4 font-serif text-3xl leading-tight text-white drop-shadow-xl sm:mb-6 sm:text-5xl lg:text-7xl xl:whitespace-nowrap">
                {currentRoom.roomtype}
              </h2>

              <p className="mb-6 max-w-xl border-l-2 border-blue-500/50 pl-4 text-base font-light leading-relaxed text-slate-200 drop-shadow-md sm:mb-8 sm:pl-6 sm:text-lg">
                {currentRoom.description}
              </p>

              <div className="mb-8 flex flex-col gap-3 text-sm sm:mb-10 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2 text-slate-100">
                  <Users size={18} className="text-blue-400" />
                  <span>{currentRoom.capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-100">
                  <BedDouble size={18} className="text-blue-400" />
                  <span>{currentRoom.setup}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                <button
                  onClick={() =>
                    navigate("/rooms", {
                      state: { selectedRoomType: currentRoom.filterValue },
                    })
                  }
                  className="z-50 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-900 shadow-xl shadow-black/20 transition-all hover:scale-105 hover:bg-blue-50 sm:w-auto sm:px-8 sm:py-4"
                >
                  View Details <ArrowRight size={14} />
                </button>

                {currentRoom.price && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Starting at
                    </span>
                    <span className="font-serif text-xl text-white sm:text-2xl">
                      {currentRoom.price}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hidden flex-col items-end gap-4 lg:col-span-5 lg:mb-12 lg:flex">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {isPaused ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
              Next Up
            </span>

            <div className="flex gap-4">
              {roomTypes.map((room, index) => (
                <button
                  key={`${room.filterValue}-thumb-${index}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative h-16 w-24 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                    index === currentIndex
                      ? "scale-110 border-blue-400 shadow-lg shadow-blue-900/50"
                      : "border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
                  }`}
                >
                  <img
                    src={room.image}
                    alt={`${room.roomtype} thumbnail`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoomTypeMenu;


