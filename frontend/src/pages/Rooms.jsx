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
  CheckCircle,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

const ROOMS_PER_PAGE = 8;
const FILTER_OPTION_PREVIEW_COUNT = 4;

const Rooms = () => {
  const {
    rooms,
    selectedRooms,
    addRoom,
    removeRoom,
    clearRooms,
    getRoomsData,
    backendUrl,
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [filteredRooms, setFilteredRooms] = useState([]);
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [cleaningRooms, setCleaningRooms] = useState([]);
  const [rangeBookedRooms, setRangeBookedRooms] = useState([]);
  const [rangeBookedReasons, setRangeBookedReasons] = useState({});
  const [viewingRoom, setViewingRoom] = useState(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [roomType, setRoomType] = useState(() => location.state?.selectedRoomType || "all");
  const [building, setBuilding] = useState("all");
  const [search] = useState("");
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

  useEffect(() => {
    getRoomsData();
    fetchOccupiedRooms();
    const interval = setInterval(fetchOccupiedRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRangeBookedRooms = async () => {
      if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) {
        setRangeBookedRooms([]);
        setRangeBookedReasons({});
        return;
      }
      if (!rooms || rooms.length === 0) {
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
        console.error("Error fetching booked rooms for selected dates:", error);
      }
    };

    fetchRangeBookedRooms();
  }, [backendUrl, rooms, rangeStart, rangeEnd]);

  useEffect(() => {
    if (location.state?.selectedRoomType) {
      setRoomType(location.state.selectedRoomType);
      setCurrentPage(1);
    }
  }, [location.state?.selectedRoomType]);

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

  const normalize = (value = "") => value?.toString().toLowerCase().trim() || "";

  const roomTypeOptions = [
    "all",
    ...Array.from(
      new Set((rooms || []).map((room) => room.room_type).filter(Boolean))
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

  const isSelected = (id) => selectedRooms.some((room) => String(room._id) === String(id));

  useEffect(() => {
    let data = [...(rooms || [])];

    if (roomType !== "all") {
      data = data.filter((room) => normalize(room.room_type) === normalize(roomType));
    }

    if (building !== "all") {
      data = data.filter((room) => normalize(room.building) === normalize(building));
    }

    if (filterStatus === "available") {
      data = data.filter((room) => {
        const isBooked = occupiedRooms.some((id) => String(id) === String(room._id));
        const isBookedForRange =
          rangeBookedRooms.some((id) => String(id) === String(room._id)) ||
          Boolean(rangeBookedReasons[String(room._id)]);
        return !isBooked && !isBookedForRange && room.available !== false;
      });
    } else if (filterStatus === "occupied") {
      data = data.filter((room) =>
        occupiedRooms.some((id) => String(id) === String(room._id))
      );
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
  }, [rooms, roomType, building, search, filterStatus, occupiedRooms, rangeBookedRooms, rangeBookedReasons]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roomType, building, search, filterStatus]);

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
    if (room.cover_image) return room.cover_image;
    if (Array.isArray(room.images) && room.images.length > 0) return room.images[0];
    return null;
  };

  const getFilterButtonClass = (isActive) =>
    `group mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[9px] font-bold uppercase leading-[1.35] transition-all duration-300 ${
      isActive
        ? "bg-slate-900 text-white shadow-md"
        : "text-slate-500 hover:bg-slate-100 hover:pl-3 hover:text-slate-900"
    }`;

  const RoomDetailsModal = ({ room, onClose }) => {
    if (!room) return null;

    const [activeImgIndex, setActiveImgIndex] = useState(0);
    const images =
      Array.isArray(room.images) && room.images.length > 0
        ? room.images
        : room.cover_image
          ? [room.cover_image]
          : [];

    useEffect(() => {
      setActiveImgIndex(0);
    }, [room._id]);

    if (images.length === 0) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="rounded-xl bg-white p-8 text-slate-500">
            No images available for this room.
          </div>
        </div>
      );
    }

    const isRoomSelected = isSelected(room._id);
    const isRoomUnderMaintenance = room.status === "maintenance";
    const isRoomCleaningDay = cleaningRooms.some((id) => String(id) === String(room._id));
    const isRoomBookedToday = occupiedRooms.some((id) => String(id) === String(room._id));
    const roomRangeReason =
      rangeBookedReasons[String(room._id)] ||
      (rangeBookedRooms.some((id) => String(id) === String(room._id)) ? "booked" : "");
    const isRoomBookedForRange = Boolean(roomRangeReason);
    const isRoomUnavailable =
      isRoomUnderMaintenance || isRoomCleaningDay || isRoomBookedToday || isRoomBookedForRange;

    return (
      <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm duration-200">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row">
          <div className="group relative w-full bg-slate-100 md:w-1/2">
            <img
              src={getImageUrl(images[activeImgIndex])}
              alt={room.name}
              className="h-64 w-full object-cover md:h-full"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 transition hover:bg-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 transition hover:bg-white"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full ${
                        index === activeImgIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex h-full w-full flex-col overflow-y-auto p-8 md:w-1/2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="mb-2 inline-block rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {room.building} &bull; {room.floor}
                </span>
                <h2 className="text-2xl font-bold text-slate-800">{room.name}</h2>
              </div>
              <button onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="mb-6 flex gap-4 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <User size={16} /> {room.capacity} Pax
              </span>
              <span className="flex items-center gap-1">
                <BedDouble size={16} /> {room.room_type}
              </span>
            </div>

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Description
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              {room.description ||
                "No specific description available for this room. It features standard amenities for a comfortable stay."}
            </p>

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Amenities
            </h3>
            <div className="mb-8 flex flex-wrap gap-2">
              {room.amenities && Array.isArray(room.amenities) ? (
                room.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-600"
                  >
                    {amenity}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-slate-400">
                  No specific amenities listed.
                </span>
              )}
            </div>

            <div className="mt-auto border-t border-slate-100 pt-4">
              <button
                disabled={isRoomUnavailable}
                onClick={() => {
                  if (isRoomUnavailable) return;
                  if (isRoomSelected) removeRoom(room._id);
                  else addRoom(room);
                  onClose();
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold uppercase tracking-wide transition-all ${
                  isRoomUnavailable
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : isRoomSelected
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-slate-900 text-white shadow-xl hover:bg-slate-800"
                }`}
              >
                {isRoomUnavailable ? (
                  <>
                    {isRoomUnderMaintenance
                      ? "Maintenance"
                      : isRoomCleaningDay
                        ? "Cleaning"
                        : isRoomBookedToday
                          ? "Occupied"
                          : isRoomBookedForRange
                            ? roomRangeReason === "cleaning"
                              ? "Cleaning Day"
                              : "Booked"
                            : "Unavailable"}
                  </>
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-50 pt-3">
      {viewingRoom && <RoomDetailsModal room={viewingRoom} onClose={() => setViewingRoom(null)} />}

      <div className="mx-auto flex h-full w-full max-w-[1750px] flex-col gap-5 overflow-hidden px-[14px] pb-[14px] lg:flex-row lg:gap-5 lg:px-[14px]">
        <aside className="h-full w-full overflow-y-auto pb-6 pr-2 lg:w-56">
          <div className="flex min-h-full flex-col gap-4">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider leading-none text-slate-900">
                <Filter size={11} className="text-slate-400" /> Room Filter
              </h2>

              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest leading-[1.25] text-slate-400">
                  <BedDouble size={8} /> Room Type
                </p>
                {visibleRoomTypeOptions.map((type) => {
                  const active = roomType === type;
                  const Icon =
                    type === "all" ? Layers : normalize(type).includes("dorm") ? Users : User;

                  return (
                    <button
                      key={type}
                      onClick={() => setRoomType(type)}
                      className={getFilterButtonClass(active)}
                    >
                      <Icon
                        size={10}
                        className={active ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"}
                      />
                      {type === "all" ? "All Types" : type}
                    </button>
                  );
                })}
                {roomTypeOptions.length > FILTER_OPTION_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllRoomTypes((value) => !value)}
                    className="mt-1 block w-full text-center text-[8px] font-bold uppercase tracking-[0.14em] leading-[1.25] text-slate-400 transition hover:text-slate-700"
                  >
                    {showAllRoomTypes
                      ? "Show Less"
                      : `+${roomTypeOptions.length - visibleRoomTypeOptions.length} More`}
                  </button>
                )}
              </div>

              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest leading-[1.25] text-slate-400">
                  <Building2 size={8} /> Building
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
                        size={10}
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
                    className="mt-1 block w-full text-center text-[8px] font-bold uppercase tracking-[0.14em] leading-[1.25] text-slate-400 transition hover:text-slate-700"
                  >
                    {showAllBuildings
                      ? "Show Less"
                      : `+${buildingOptions.length - visibleBuildingOptions.length} More`}
                  </button>
                )}
              </div>

              <div className="mb-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest leading-[1.25] text-slate-400">
                  <CheckCircle size={8} /> Availability
                </p>
                {[
                  { val: "all", label: "Show All", icon: Layers },
                  { val: "available", label: "Available", icon: CircleDashed },
                  { val: "occupied", label: "Occupied", icon: CalendarX },
                ].map((status) => (
                  <button
                    key={status.val}
                    onClick={() => setFilterStatus(status.val)}
                    className={getFilterButtonClass(filterStatus === status.val)}
                  >
                    <status.icon
                      size={10}
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
            </div>

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
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-900">
                    <Sun size={10} className="text-orange-500" /> No rooms selected
                  </h2>
                  <p className="mb-2.5 text-[9px] leading-relaxed text-slate-500">
                    Choose a room to add it to your booking, or continue with a venue-only reservation.
                  </p>
                  <button
                    onClick={() => navigate("/retreat-booking")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white py-2 text-[9px] font-bold uppercase text-blue-700 hover:bg-blue-50"
                  >
                    Book Venue Only <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 h-full overflow-y-auto pt-1 pb-6 pr-1 pl-1">
          {filteredRooms.length === 0 ? (
            <div className="mt-20 flex flex-col items-center justify-center text-slate-400">
              <Wind size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No rooms match your filter</p>
            </div>
          ) : (
            <div className="space-y-[20px]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {paginatedRooms.map((room) => {
                  const isUnderMaintenance = room.status === "maintenance";
                  const isCleaningDay = cleaningRooms.some((id) => String(id) === String(room._id));
                  const isBookedToday = occupiedRooms.some((id) => String(id) === String(room._id));
                  const rangeReason =
                    rangeBookedReasons[String(room._id)] ||
                    (rangeBookedRooms.some((id) => String(id) === String(room._id)) ? "booked" : "");
                  const isBookedForRange = Boolean(rangeReason);
                  const isUnavailable =
                    isUnderMaintenance || isCleaningDay || isBookedToday || isBookedForRange;
                  const selected = isSelected(room._id);

                  return (
                    <div
                      key={room._id}
                      onClick={() => !isUnavailable && (selected ? removeRoom(room._id) : addRoom(room))}
                      className={`relative overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 ${
                        isUnavailable
                          ? "border-slate-100 shadow-none"
                          : selected
                            ? "cursor-pointer border-slate-900 shadow-xl ring-4 ring-blue-600/10"
                            : "cursor-pointer border-transparent hover:border-slate-200 hover:shadow-lg"
                      }`}
                    >
                      <div
                        className="group relative h-[146px] cursor-zoom-in overflow-hidden bg-slate-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewingRoom(room);
                        }}
                      >
                        <img
                          src={getImageUrl(getRoomImage(room))}
                          alt={room.name}
                          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            isUnavailable ? "opacity-40" : "opacity-100"
                          }`}
                          onError={(event) => {
                            event.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                          }}
                        />

                        {isBookedToday && !isUnderMaintenance && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50">
                            <CalendarX size={22} className="mb-1 text-slate-500" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                              Occupied
                            </span>
                          </div>
                        )}
                        {isBookedForRange && !isUnderMaintenance && !isCleaningDay && !isBookedToday && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80">
                            <CalendarX size={22} className="mb-1 text-slate-600" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              {rangeReason === "cleaning" ? "Cleaning Day" : "Booked"}
                            </span>
                          </div>
                        )}
                        {isUnderMaintenance && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/80 p-3 text-center text-slate-400">
                            <Ban size={22} className="mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                              Maintenance
                            </span>
                          </div>
                        )}
                        {selected && !isUnavailable && (
                          <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-white shadow-lg">
                            <CheckCircle size={9} strokeWidth={3} /> SELECTED
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-bold uppercase text-slate-900 shadow-sm">
                            View Details
                          </span>
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-1.5">
                            <h3 className={`text-[11px] font-bold leading-tight ${isUnavailable ? "text-slate-400" : "text-slate-800"}`}>
                              {room.name}
                            </h3>
                            {room.building && (
                              <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${
                                  isUnavailable
                                    ? "border-slate-100 bg-slate-50 text-slate-300"
                                    : "border-slate-200 bg-slate-100 text-slate-500"
                                }`}
                              >
                                <Building2 size={8} /> {room.building}
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                            {room.room_type?.replace(/_/g, " ")}
                          </p>
                        </div>

                        <div className={`mb-3 flex flex-wrap gap-1.5 text-[10px] font-medium ${isUnavailable ? "text-slate-300" : "text-slate-500"}`}>
                          <span
                            className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
                              isUnavailable ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <Users size={11} className={isUnavailable ? "text-slate-300" : "text-slate-900"} />
                            {room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}
                          </span>
                        </div>

                        <button
                          disabled={isUnavailable}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isUnavailable) {
                              selected ? removeRoom(room._id) : addRoom(room);
                            }
                          }}
                          className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold uppercase transition-all ${
                            isUnavailable
                              ? "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300"
                              : selected
                                ? "border border-red-50 bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl"
                          }`}
                        >
                        {isUnderMaintenance
                          ? "Maintenance"
                          : isCleaningDay
                            ? "Cleaning"
                            : isBookedToday
                              ? "Occupied"
                              : isBookedForRange
                                  ? rangeReason === "cleaning" ? "Cleaning Day" : "Booked"
                                  : selected
                                    ? "Remove"
                                    : "Select"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                    Room Directory
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">
                    Showing {visibleRoomStart}-{visibleRoomEnd} of {filteredRooms.length} rooms
                  </p>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPageSafe === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {visiblePageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[10px] font-bold transition ${
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Rooms;
