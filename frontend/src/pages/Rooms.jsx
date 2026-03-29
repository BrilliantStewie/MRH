import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Users,
  Wind,
  Plus,
  X,
  ArrowRight,
  Filter,
  Building2,
  BedDouble,
  Layers,
  User,
  Ban,
  CalendarX,
  Sun,
  Search,
  CheckCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  FRONTEND_REALTIME_EVENT_NAME,
  matchesRealtimeEntity,
} from "../utils/realtime";

const ROOMS_PER_PAGE = 8;
const FILTER_OPTION_PREVIEW_COUNT = 4;
const MODAL_AMENITIES_PREVIEW_COUNT = 4;

const Rooms = () => {
  const {
    rooms,
    selectedRooms,
    addRoom,
    removeRoom,
    clearRooms,
    getRoomsData,
    backendUrl,
    token,
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [filteredRooms, setFilteredRooms] = useState([]);
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [cleaningRooms, setCleaningRooms] = useState([]);
  const [rangeBookedRooms, setRangeBookedRooms] = useState([]);
  const [rangeBookedReasons, setRangeBookedReasons] = useState({});
  const [viewingRoom, setViewingRoom] = useState(null);

  const [filterStatus, setFilterStatus] = useState(() => (token ? "available" : "all"));
  const [roomType, setRoomType] = useState(() => location.state?.selectedRoomType || "all");
  const [building, setBuilding] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllRoomTypes, setShowAllRoomTypes] = useState(false);
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const getStoredDate = (key) => {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const [rangeStart] = useState(() => getStoredDate("draftStartDate"));
  const [rangeEnd] = useState(() => getStoredDate("draftEndDate"));
  const isLoggedIn = Boolean(token);

  const fetchOccupiedRooms = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/booking/occupied`);

      if (data.success) {
        setOccupiedRooms((data.occupiedRoomIds || []).map((id) => String(id)));
        setCleaningRooms((data.cleaningRoomIds || []).map((id) => String(id)));
      }
    } catch (error) {
      console.error("Error fetching occupied rooms:", error);
    }
  };

  const fetchRangeBookedRooms = async ({ silent = false } = {}) => {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) {
      setRangeBookedRooms([]);
      setRangeBookedReasons({});
      return;
    }

    if (rooms.length === 0) {
      return;
    }

    try {
      const { data } = await axios.post(`${backendUrl}/api/booking/booked-rooms`, {
        roomIds: rooms.map((room) => room._id),
        checkIn: rangeStart,
        checkOut: rangeEnd,
      });

      if (data.success) {
        const reasons = {};
        const ids = new Set();

        if (Array.isArray(data.bookedRooms)) {
          data.bookedRooms.forEach((entry) => {
            if (!entry?.roomId) return;
            const id = String(entry.roomId);
            ids.add(id);
            reasons[id] = entry.reason || "booked";
          });
        }

        (data.bookedRoomIds || []).forEach((id) => ids.add(String(id)));

        setRangeBookedRooms(Array.from(ids));
        setRangeBookedReasons(reasons);
      }
    } catch (error) {
      if (silent) {
        console.error("Error refreshing booked rooms for selected dates:", error);
      } else {
        console.error("Error fetching booked rooms for selected dates:", error);
      }
    }
  };

  useEffect(() => {
    getRoomsData();
    fetchOccupiedRooms();
    const interval = setInterval(fetchOccupiedRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchRangeBookedRooms({ silent: true });
  }, [backendUrl, rooms, rangeStart, rangeEnd]);

  useEffect(() => {
    if (location.state?.selectedRoomType) {
      setRoomType(location.state.selectedRoomType);
      setCurrentPage(1);
    }
  }, [location.state?.selectedRoomType]);

  useEffect(() => {
    if (!backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (!matchesRealtimeEntity(event.detail, ["bookings", "rooms", "settings"])) {
        return;
      }

      fetchOccupiedRooms();
      fetchRangeBookedRooms({ silent: true });
    };

    window.addEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [backendUrl, rooms, rangeStart, rangeEnd]);

  const normalize = (value = "") => value?.toString().toLowerCase().trim() || "";

  const roomTypeOptions = [
    "all",
    ...Array.from(
      new Set((rooms || []).map((room) => room.roomType).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  ];

  const buildingOptions = [
    "all",
    ...Array.from(
      new Set((rooms || []).map((room) => room.building).filter(Boolean))
    ).sort((a, b) => {
      const order = { margarita: 1, nolasco: 2 };
      const rankA = order[normalize(a)] ?? 99;
      const rankB = order[normalize(b)] ?? 99;

      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    }),
  ];

  const getVisibleFilterOptions = (options, selectedValue, isExpanded) => {
    if (isExpanded || options.length <= FILTER_OPTION_PREVIEW_COUNT) {
      return options;
    }

    const previewOptions = options.slice(0, FILTER_OPTION_PREVIEW_COUNT);

    if (!previewOptions.includes(selectedValue) && options.includes(selectedValue)) {
      return [...options.slice(0, FILTER_OPTION_PREVIEW_COUNT - 1), selectedValue];
    }

    return previewOptions;
  };

  const visibleRoomTypeOptions = getVisibleFilterOptions(
    roomTypeOptions,
    roomType,
    showAllRoomTypes
  );
  const visibleBuildingOptions = getVisibleFilterOptions(
    buildingOptions,
    building,
    showAllBuildings
  );
  const hasFilterOption = (options, value) =>
    value === "all" || options.some((option) => normalize(option) === normalize(value));

  const isSelected = (id) => selectedRooms.some((room) => String(room._id) === String(id));

  useEffect(() => {
    if (!hasFilterOption(roomTypeOptions, roomType)) {
      setRoomType("all");
    }
  }, [roomType, roomTypeOptions]);

  useEffect(() => {
    if (!hasFilterOption(buildingOptions, building)) {
      setBuilding("all");
    }
  }, [building, buildingOptions]);

  useEffect(() => {
    const statusFilter = isLoggedIn ? filterStatus : "all";
    let data = [...(rooms || [])];

    if (roomType !== "all") {
      data = data.filter((room) => normalize(room.roomType) === normalize(roomType));
    }

    if (building !== "all") {
      data = data.filter((room) => normalize(room.building) === normalize(building));
    }

    if (statusFilter === "available") {
      data = data.filter((room) => {
        const roomId = String(room._id);
        const isAdminUnavailable = room.available === false;
        const isBooked = occupiedRooms.some((id) => String(id) === roomId);
        const rangeReason = rangeBookedReasons[roomId] || "";
        const isCleaning =
          cleaningRooms.some((id) => String(id) === roomId) || rangeReason === "cleaning";
        const isBookedForRange =
          rangeBookedRooms.some((id) => String(id) === roomId) || Boolean(rangeReason);
        return (
          !isAdminUnavailable &&
          !isBooked &&
          !isCleaning &&
          !isBookedForRange &&
          room.status !== "maintenance"
        );
      });
    } else if (statusFilter === "unavailable") {
      data = data.filter((room) => room.available === false);
    } else if (statusFilter === "occupied") {
      data = data.filter(
        (room) =>
          room.available !== false &&
          occupiedRooms.some((id) => String(id) === String(room._id))
      );
    } else if (statusFilter === "cleaning") {
      data = data.filter((room) => {
        const roomId = String(room._id);
        return (
          room.available !== false &&
          (cleaningRooms.some((id) => String(id) === roomId) ||
            rangeBookedReasons[roomId] === "cleaning")
        );
      });
    }

    if (search) {
      data = data.filter(
        (room) =>
          normalize(room.name).includes(normalize(search)) ||
          normalize(room.building).includes(normalize(search))
      );
    }

    data.sort((a, b) => {
      const buildingRankA = a.building === "Margarita" ? 1 : 2;
      const buildingRankB = b.building === "Margarita" ? 1 : 2;

      if (buildingRankA !== buildingRankB) {
        return buildingRankA - buildingRankB;
      }

      const getFloorRank = (floorLabel) => {
        const floor = floorLabel?.toLowerCase() || "";
        if (floor.includes("1st") || floor.includes("upper")) return 1;
        if (floor.includes("2nd") || floor.includes("basement")) return 2;
        return 3;
      };

      const floorRankA = getFloorRank(a.floor);
      const floorRankB = getFloorRank(b.floor);

      if (floorRankA !== floorRankB) {
        return floorRankA - floorRankB;
      }

      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    setFilteredRooms(data);
  }, [
    rooms,
    roomType,
    building,
    search,
    filterStatus,
    occupiedRooms,
    cleaningRooms,
    rangeBookedRooms,
    rangeBookedReasons,
    isLoggedIn,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roomType, building, search, filterStatus]);

  useEffect(() => {
    if (!isLoggedIn && filterStatus !== "all") {
      setFilterStatus("all");
    }
  }, [isLoggedIn, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visiblePageCount = Math.min(3, totalPages);
  const halfVisiblePageCount = Math.floor(visiblePageCount / 2);
  let visiblePageStart = Math.max(1, currentPageSafe - halfVisiblePageCount);
  let visiblePageEnd = visiblePageStart + visiblePageCount - 1;

  if (visiblePageEnd > totalPages) {
    visiblePageEnd = totalPages;
    visiblePageStart = Math.max(1, visiblePageEnd - visiblePageCount + 1);
  }

  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, index) => visiblePageStart + index
  );
  const paginatedRooms = filteredRooms.slice(
    (currentPageSafe - 1) * ROOMS_PER_PAGE,
    currentPageSafe * ROOMS_PER_PAGE
  );
  const visibleRoomStart =
    filteredRooms.length === 0 ? 0 : (currentPageSafe - 1) * ROOMS_PER_PAGE + 1;
  const visibleRoomEnd = Math.min(currentPageSafe * ROOMS_PER_PAGE, filteredRooms.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const extraCount = selectedRooms.length - 1;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/400x300?text=No+Image";
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  const getRoomImage = (room) => {
    if (!room) return null;
    if (room.coverImage) return room.coverImage;
    if (Array.isArray(room.images) && room.images.length > 0) return room.images[0];
    return null;
  };

  const getFilterButtonClass = (isActive) =>
    `group mb-1 flex w-full items-center text-left font-bold uppercase transition-all duration-300 ${
      "gap-2.5 rounded-lg px-3 py-2.5 text-[11px] leading-[1.35]"
    } ${
      isActive
        ? isLoggedIn
          ? "bg-slate-900 text-white shadow-md"
          : "bg-slate-900 text-white shadow-lg shadow-slate-200"
        : isLoggedIn
          ? "text-slate-500 hover:bg-slate-100 hover:pl-3 hover:text-slate-900"
          : "text-slate-600 hover:bg-slate-100 hover:pl-4 hover:text-slate-900"
     }`;
  const filterIconSize = 13;
  const filterLabelIconSize = 12;
  const pageRootClassName = isLoggedIn
    ? "relative bg-slate-50 pt-2"
    : "relative bg-slate-50 pt-2";
  const pageShellClassName = isLoggedIn
    ? "mx-auto flex w-full flex-col gap-4 px-3 pb-[14px] sm:px-4 lg:flex-row lg:gap-4 lg:px-5"
    : "mx-auto flex w-full flex-col gap-4 px-3 pb-[14px] sm:px-4 lg:flex-row lg:gap-4 lg:px-5";
  const sidebarClassName = isLoggedIn
    ? "w-full pb-5 pr-2 lg:w-[340px] xl:w-[360px]"
    : "w-full pb-5 pr-2 lg:w-[340px] xl:w-[360px]";
  const filterPanelClassName = isLoggedIn
    ? "rounded-xl border bg-white p-3 shadow-sm sm:p-4"
    : "rounded-xl border bg-white p-3 shadow-sm sm:p-4";
  const roomContentClassName = "flex flex-col gap-4";
  const roomGridClassName = isLoggedIn
    ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
    : "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4";
  const directoryBarClassName = isLoggedIn
    ? "pt-1"
    : "pt-1";
  const roomMainClassName = isLoggedIn
    ? "flex-1 px-0.5 pt-0 pb-5"
    : "flex-1 px-0.5 pt-0 pb-5";

  const getRoomAvailabilityState = (room) => {
    const roomId = String(room?._id || "");
    const isAdminUnavailable = room?.available === false;
    const isUnderMaintenance = isLoggedIn && room?.status === "maintenance";
    const isCleaningDay = isLoggedIn && cleaningRooms.some((id) => String(id) === roomId);
    const isBookedToday = isLoggedIn && occupiedRooms.some((id) => String(id) === roomId);
    const rangeReason = isLoggedIn
      ? rangeBookedReasons[roomId] ||
        (rangeBookedRooms.some((id) => String(id) === roomId) ? "booked" : "")
      : "";
    const isBookedForRange = Boolean(rangeReason);
    const isUnavailable =
      isAdminUnavailable ||
      isUnderMaintenance ||
      isCleaningDay ||
      isBookedToday ||
      isBookedForRange;
    const unavailableLabel = isAdminUnavailable
      ? "Unavailable"
      : isUnderMaintenance
        ? "Maintenance"
        : isCleaningDay
          ? "Cleaning"
          : isBookedToday
            ? "Occupied"
            : isBookedForRange
              ? rangeReason === "cleaning"
                ? "Cleaning Day"
                : rangeReason === "daily_limit"
                  ? "Fully Booked"
                : "Booked"
              : "";

    return {
      isAdminUnavailable,
      isUnderMaintenance,
      isCleaningDay,
      isBookedToday,
      rangeReason,
      isBookedForRange,
      isUnavailable,
      unavailableLabel,
    };
  };

  const RoomDetailsModal = ({ room, onClose }) => {
    if (!room) return null;

    const [activeImgIndex, setActiveImgIndex] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const images =
      Array.isArray(room.images) && room.images.length > 0
        ? room.images
        : room.coverImage
          ? [room.coverImage]
          : [];
    const slides = images.length > 0 ? images : [null];
    const amenities =
      Array.isArray(room.amenities) && room.amenities.length > 0
        ? room.amenities.filter(Boolean)
        : [];
    const visibleAmenities = showAllAmenities
      ? amenities
      : amenities.slice(0, MODAL_AMENITIES_PREVIEW_COUNT);

    useEffect(() => {
      setActiveImgIndex(0);
      setShowAllAmenities(false);
    }, [room._id]);

    const isRoomSelected = isSelected(room._id);
    const roomTypeLabel = (room.roomType || room.type || "").replace(/_/g, " ");
    const {
      isAdminUnavailable: isRoomAdminUnavailable,
      isUnavailable: isRoomUnavailable,
      unavailableLabel: roomUnavailableLabel,
    } = getRoomAvailabilityState(room);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-500">
        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[3rem] border border-white/20 bg-white shadow-2xl md:flex-row">
          <div className="flex w-full flex-col bg-white p-5 md:w-[52%]">
            <div className="group/slider relative flex-1 overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-inner min-h-[400px]">
              <div
                className="flex h-full transition-transform will-change-transform"
                style={{
                  transform: `translateX(-${activeImgIndex * 100}%)`,
                  transitionDuration: "1200ms",
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              >
                {slides.map((img, index) => (
                  <div key={index} className="min-w-full h-full select-none">
                    <img
                      src={img ? getImageUrl(img) : "https://via.placeholder.com/1200x900?text=No+Image"}
                      alt={room.name}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  </div>
                ))}
              </div>

              {images.length > 1 && (
                <div className="absolute top-1/2 flex w-full -translate-y-1/2 justify-between px-4 opacity-0 transition-all duration-300 group-hover/slider:opacity-100">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                    }}
                    className="rounded-full bg-white/90 p-3 shadow-xl transition-transform hover:bg-white active:scale-90"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveImgIndex((prev) => (prev + 1) % images.length);
                    }}
                    className="rounded-full bg-white/90 p-3 shadow-xl transition-transform hover:bg-white active:scale-90"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 px-6">
                  <div className="flex flex-wrap justify-center gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImgIndex(idx)}
                        className={`relative h-11 w-11 overflow-hidden rounded-xl transition-all duration-500 ${
                          idx === activeImgIndex
                            ? "z-10 scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/20 shadow-lg"
                            : "opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0"
                        }`}
                      >
                        <img src={getImageUrl(img)} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col p-8 md:w-[48%]">
            <div className="mb-6 flex flex-col">
              <div className="mb-4 flex w-full items-center justify-between">
                <h2 className="text-xl font-extrabold leading-none tracking-tight text-slate-800">
                  {room.name}
                </h2>
                <div className="flex items-center gap-3">
                  {room.building && (
                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                      {room.building}
                    </span>
                  )}
                  {isRoomAdminUnavailable && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      <Ban size={10} />
                      Unavailable
                    </span>
                  )}
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-full bg-slate-50 p-2.5 transition-all hover:bg-red-50 hover:text-red-500 group"
                  >
                    <X size={20} className="text-slate-400 group-hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div className="flex w-full items-center justify-between pr-[52px] text-[11px] font-semibold text-slate-600">
                {roomTypeLabel && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                    <BedDouble size={14} className="text-slate-400" />
                    <span className="capitalize">{roomTypeLabel}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                  <User size={14} className="text-slate-400" />
                  <span>
                    {room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex-1 space-y-8 overflow-y-auto border-t border-slate-50 pt-6 pr-2 custom-scrollbar">
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Description
                </h3>
                <p className="text-sm leading-relaxed text-justify text-slate-600">
                  {room.description ||
                    "No specific description available for this room. It features standard amenities for a comfortable stay."}
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Included Amenities
                </h3>
                {amenities.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleAmenities.map((amenity, index) => (
                        <div
                          key={`${amenity}-${index}`}
                          className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700">
                            {String(amenity || "").replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                    {amenities.length > MODAL_AMENITIES_PREVIEW_COUNT && (
                      <button
                        type="button"
                        onClick={() => setShowAllAmenities((value) => !value)}
                        className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-700"
                      >
                        {showAllAmenities
                          ? "Show Less"
                          : `+${amenities.length - MODAL_AMENITIES_PREVIEW_COUNT} More`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-100 bg-slate-50 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    No Amenities Listed
                  </div>
                )}
              </section>
            </div>

            {isLoggedIn && (
              <div className="mt-8">
                <button
                  disabled={isRoomUnavailable}
                  onClick={() => {
                    if (isRoomUnavailable) return;
                    if (isRoomSelected) removeRoom(room._id);
                    else addRoom(room);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold uppercase tracking-wide transition-all ${
                    isRoomUnavailable
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : isRoomSelected
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-slate-900 text-white shadow-xl hover:bg-slate-800 hover:shadow-2xl"
                  }`}
                >
                  {isRoomUnavailable ? (
                    roomUnavailableLabel
                  ) : isRoomSelected ? (
                    <>
                      Remove from Booking <X size={18} />
                    </>
                  ) : (
                    <>
                      Add to Booking <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={pageRootClassName}>
      {viewingRoom && <RoomDetailsModal room={viewingRoom} onClose={() => setViewingRoom(null)} />}

      <div className={pageShellClassName}>
        <aside className={sidebarClassName}>
          <div className="flex min-h-full flex-col gap-4">
            <div className={filterPanelClassName}>
              <h2
                className={`flex items-center font-bold uppercase leading-none text-slate-900 ${
                  isLoggedIn
                    ? "mb-4 gap-2 text-[13px] tracking-[0.16em]"
                    : "mb-4 gap-2 text-[13px] tracking-[0.16em]"
                }`}
              >
                <Filter size={14} className="text-slate-400" /> Room Filter
              </h2>

              <div className="mb-3">
                <p
                  className={`flex items-center font-bold uppercase leading-[1.25] text-slate-400 ${
                    isLoggedIn
                      ? "mb-2 gap-1.5 text-[11px] tracking-[0.16em]"
                      : "mb-2 gap-1.5 text-[11px] tracking-[0.16em]"
                  }`}
                >
                  <BedDouble size={filterLabelIconSize} /> Room Type
                </p>
                {visibleRoomTypeOptions.map((type) => {
                  const active = normalize(roomType) === normalize(type);
                  const Icon =
                    type === "all" ? Layers : normalize(type).includes("dorm") ? Users : User;

                  return (
                    <button
                      key={type}
                      onClick={() => setRoomType(type)}
                      className={getFilterButtonClass(active)}
                    >
                      <Icon
                        size={filterIconSize}
                        className={active ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"}
                      />
                      {type === "all" ? "All Room Types" : type}
                    </button>
                  );
                })}
                {roomTypeOptions.length > FILTER_OPTION_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllRoomTypes((value) => !value)}
                    className={`mt-1 block w-full text-center font-bold uppercase leading-[1.25] text-slate-400 transition hover:text-slate-700 ${
                      isLoggedIn ? "text-[10px] tracking-[0.14em]" : "text-[10px] tracking-[0.14em]"
                    }`}
                  >
                    {showAllRoomTypes
                      ? "Show Less"
                      : `+${roomTypeOptions.length - visibleRoomTypeOptions.length} More`}
                  </button>
                )}
              </div>

              <div className="mb-3">
                <p
                  className={`flex items-center font-bold uppercase leading-[1.25] text-slate-400 ${
                    isLoggedIn
                      ? "mb-2 gap-1.5 text-[11px] tracking-[0.16em]"
                      : "mb-2 gap-1.5 text-[11px] tracking-[0.16em]"
                  }`}
                >
                  <Building2 size={filterLabelIconSize} /> Building
                </p>
                {visibleBuildingOptions.map((option) => {
                  const active = building === option;
                  const Icon = option === "all" ? Layers : Building2;

                  return (
                    <button
                      key={option}
                      onClick={() => setBuilding(option)}
                      className={getFilterButtonClass(active)}
                    >
                      <Icon
                        size={filterIconSize}
                        className={active ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"}
                      />
                      {option === "all" ? "All Buildings" : option}
                    </button>
                  );
                })}
                {buildingOptions.length > FILTER_OPTION_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllBuildings((value) => !value)}
                    className={`mt-1 block w-full text-center font-bold uppercase leading-[1.25] text-slate-400 transition hover:text-slate-700 ${
                      isLoggedIn ? "text-[10px] tracking-[0.14em]" : "text-[10px] tracking-[0.14em]"
                    }`}
                  >
                    {showAllBuildings
                      ? "Show Less"
                      : `+${buildingOptions.length - visibleBuildingOptions.length} More`}
                  </button>
                )}
              </div>

              {isLoggedIn && (
                <div className="mb-3 border-t border-slate-100 pt-3.5">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] leading-[1.25] text-slate-400">
                    <CheckCircle size={12} /> Availability
                  </p>
                  {[
                    { val: "all", label: "Show All", icon: Layers },
                    { val: "available", label: "Available", icon: CheckCircle },
                    { val: "unavailable", label: "Unavailable", icon: Ban },
                    { val: "occupied", label: "Occupied", icon: CalendarX },
                    { val: "cleaning", label: "Cleaning", icon: Sparkles },
                  ].map((status) => (
                    <button
                      key={status.val}
                      onClick={() => setFilterStatus(status.val)}
                      className={getFilterButtonClass(filterStatus === status.val)}
                    >
                      <status.icon
                        size={filterIconSize}
                        className={
                          filterStatus === status.val
                            ? "text-blue-400"
                            : "text-slate-400 group-hover:text-slate-600"
                        }
                      />
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoggedIn && (
              <div className="mt-[8px]">
                {selectedRooms.length > 0 ? (
                  <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-900/5">
                    <div className="relative h-28 bg-slate-900">
                      <img
                        src={getImageUrl(getRoomImage(selectedRooms[0]))}
                        alt="Selected Room"
                        className="h-full w-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                      <div className="absolute bottom-3 left-3 pr-3 text-white">
                        <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-200">
                          Current Selection
                        </p>
                        <div className="text-[12px] font-bold leading-tight text-white">
                          {selectedRooms[0].name}
                          {extraCount > 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-blue-600 px-1 py-0.5 text-[8px] font-bold text-white shadow-sm">
                              +{extraCount} others
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <button
                        onClick={() => navigate("/retreat-booking")}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-[10px] font-bold uppercase text-white shadow-lg shadow-slate-200 hover:bg-slate-800"
                      >
                        Review & Book <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={clearRooms}
                        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-bold uppercase text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        Clear Selection <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-900">
                      <Sun size={12} className="text-orange-500" /> No rooms selected
                    </h2>
                    <p className="mb-3.5 text-[11px] leading-relaxed text-slate-500">
                      Choose a room to add it to your booking, or continue with a venue-only
                      reservation.
                    </p>
                    <button
                      onClick={() => navigate("/retreat-booking")}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-700 hover:bg-blue-50"
                    >
                      Book Venue Only <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className={roomMainClassName}>
          <div className="mb-4 pt-3">
            <div className="relative max-w-2xl">
              <Search
                size={18}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rooms or buildings..."
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-5 text-[14px] font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200/60"
              />
            </div>
          </div>
          {filteredRooms.length === 0 ? (
            <div className="mt-20 flex flex-col items-center justify-center text-slate-400">
              <Wind size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No rooms match your filter</p>
            </div>
          ) : (
              <div className={roomContentClassName}>
              <div className={roomGridClassName}>
                {paginatedRooms.map((room) => {
                  const {
                    isAdminUnavailable,
                    isUnderMaintenance,
                    isCleaningDay,
                    isBookedToday,
                    rangeReason,
                    isBookedForRange,
                    isUnavailable,
                    unavailableLabel,
                  } = getRoomAvailabilityState(room);
                  const selected = isLoggedIn && isSelected(room._id);
                  const canSelectRoom = isLoggedIn && !isUnavailable;
                  const roomTypeLabel = (room.roomType || room.type || "").replace(/_/g, " ");

                  return (
                    <div
                      key={room._id}
                      onClick={() => {
                        if (!isLoggedIn) {
                          setViewingRoom(room);
                          return;
                        }
                        if (!canSelectRoom) return;
                        selected ? removeRoom(room._id) : addRoom(room);
                      }}
                      className={`group flex flex-col overflow-hidden border bg-white transition-all duration-300 ${
                        !isLoggedIn
                          ? "cursor-pointer rounded-[26px] border-slate-200 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.5)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)]"
                          : isUnavailable
                            ? "rounded-[26px] border-slate-100 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.18)]"
                            : selected
                              ? "cursor-pointer rounded-[26px] border-slate-900 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)] ring-4 ring-blue-600/10"
                              : "cursor-pointer rounded-[26px] border-slate-200 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.5)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)]"
                      }`}
                    >
                      <div
                        className={`group/image relative cursor-zoom-in overflow-hidden bg-slate-200 ${
                          isLoggedIn ? "h-32 xl:h-36" : "h-32 xl:h-36"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewingRoom(room);
                        }}
                      >
                        <img
                          src={getImageUrl(getRoomImage(room))}
                          alt={room.name}
                          className={`h-full w-full object-cover transition-transform duration-500 group-hover/image:scale-105 ${
                            isUnavailable ? "opacity-40" : "opacity-100"
                          }`}
                          onError={(event) => {
                            event.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                          }}
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />

                        {isAdminUnavailable && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/85">
                            <Ban size={22} className="mb-1 text-slate-700" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700">
                              Unavailable
                            </span>
                          </div>
                        )}
                        {isBookedToday && !isAdminUnavailable && !isUnderMaintenance && !isCleaningDay && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50">
                            <CalendarX size={22} className="mb-1 text-slate-500" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                              Occupied
                            </span>
                          </div>
                        )}
                        {isCleaningDay && !isAdminUnavailable && !isUnderMaintenance && !isBookedToday && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/80">
                            <Sparkles size={22} className="mb-1 text-slate-700" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700">
                              Cleaning
                            </span>
                          </div>
                        )}
                        {isBookedForRange &&
                          !isAdminUnavailable &&
                          !isUnderMaintenance &&
                          !isCleaningDay &&
                          !isBookedToday && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80">
                            <CalendarX size={22} className="mb-1 text-slate-600" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              {rangeReason === "cleaning" ? "Cleaning Day" : "Booked"}
                            </span>
                          </div>
                        )}
                        {isUnderMaintenance && !isAdminUnavailable && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/80 p-3 text-center text-slate-400">
                            <Ban size={22} className="mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                              Maintenance
                            </span>
                          </div>
                        )}
                        {selected && !isUnavailable && (
                          <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[8px] font-bold text-white shadow-lg">
                            <CheckCircle size={10} strokeWidth={3} /> SELECTED
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover/image:opacity-100">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-900 shadow-sm">
                            View Details
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3
                              className={`text-[14px] font-black leading-tight tracking-tight ${
                                isUnavailable ? "text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {room.name}
                            </h3>
                          </div>
                          {room.building && (
                            <span
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] ${
                                isUnavailable
                                  ? "border-slate-100 bg-slate-50 text-slate-300"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <Building2 size={11} /> {room.building}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Room Type
                            </p>
                            <div className="mt-1 flex items-start gap-1.5">
                              <BedDouble
                                size={13}
                                className={isUnavailable ? "mt-0.5 text-slate-300" : "mt-0.5 text-slate-500"}
                              />
                              <p
                                className={`line-clamp-2 text-[11px] font-bold leading-snug ${
                                  isUnavailable ? "text-slate-400" : "text-slate-700"
                                }`}
                              >
                                {roomTypeLabel}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Capacity
                            </p>
                            <div
                              className={`mt-1 inline-flex items-center justify-end gap-1.5 ${
                                isUnavailable ? "text-slate-400" : "text-slate-700"
                              }`}
                            >
                              <Users size={13} className={isUnavailable ? "text-slate-300" : "text-slate-500"} />
                              <span className="text-[11px] font-black leading-none">
                                {room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isLoggedIn && (
                          <div className="mt-auto pt-2">
                            <button
                              disabled={isUnavailable}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!isUnavailable) {
                                  selected ? removeRoom(room._id) : addRoom(room);
                                }
                              }}
                              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                                isUnavailable
                                  ? "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300"
                                  : selected
                                    ? "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl"
                              }`}
                            >
                              {isUnavailable ? unavailableLabel : selected ? "Remove" : "Select"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={directoryBarClassName}>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full text-left sm:w-auto">
                    <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-slate-400">
                      Room Directory
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-800">
                      Showing {visibleRoomStart}-{visibleRoomEnd} of {filteredRooms.length} rooms
                    </p>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2.5 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPageSafe === 1}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        {visiblePageNumbers.map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-[12px] font-bold transition ${
                              currentPageSafe === page
                                ? "bg-slate-900 text-white shadow-md"
                                : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPageSafe === totalPages}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Rooms;


