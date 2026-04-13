import React, { useContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { AdminContext } from "../../context/AdminContext";
import { StaffContext } from "../../context/StaffContext";
import AddRoom from "./AddRoom"; 
import { toast } from "react-toastify";
import {
  Archive,
  RefreshCw, 
  Plus, 
  Edit3, 
  Building2, 
  Users, 
  X,
  ChevronDown,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle, 
  XCircle, 
  Filter, 
  RotateCcw,
  BedSingle
} from "lucide-react";

const MODAL_AMENITIES_PREVIEW_COUNT = 4;
const normalizeRoomRecord = (room) =>
  room
    ? {
        ...room,
        roomType: room.roomType || "",
        coverImage: room.coverImage || room.images?.[0] || "",
      }
    : room;

const RoomsList = ({ readOnly = false }) => {
  const {
    aToken,
    allRooms,
    getAllRooms,
    changeAvailability,
    deleteRoom,
    buildings,
    getBuildings,
    roomTypes,
    getRoomTypes,
  } = useContext(AdminContext);
  const { sToken } = useContext(StaffContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const isStaffView = Boolean(readOnly);

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffRooms, setStaffRooms] = useState([]);
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [cleaningRooms, setCleaningRooms] = useState([]);

  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterArchive, setFilterArchive] = useState("Active");
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [showMoreBuildings, setShowMoreBuildings] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  const [deletingRoom, setDeletingRoom] = useState(null); // State for delete confirmation
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 8;

  const fetchStaffRooms = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/staff/rooms`, {
        headers: { token: sToken },
        params: { includeArchived: true },
      });

      if (data.success) {
        setStaffRooms((data.rooms || []).map(normalizeRoomRecord));
        return;
      }

      toast.error(data.message || "Failed to fetch rooms");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to fetch rooms");
    }
  };

  const fetchRoomOccupancy = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/booking/occupied`);
      if (data?.success) {
        setOccupiedRooms((data.occupiedRoomIds || []).map((id) => String(id)));
        setCleaningRooms((data.cleaningRoomIds || []).map((id) => String(id)));
      }
    } catch (error) {
      console.error("Failed to fetch room occupancy:", error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (isStaffView) {
        await fetchStaffRooms();
      } else {
        await getAllRooms();
      }
      await fetchRoomOccupancy();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaffView && aToken) {
      handleRefresh();
      getBuildings();
      getRoomTypes();
    }
  }, [aToken, isStaffView]);

  useEffect(() => {
    if (isStaffView && sToken) {
      handleRefresh();
    }
  }, [sToken, isStaffView]);

  useEffect(() => {
    if (backendUrl) {
      fetchRoomOccupancy();
    }
  }, [backendUrl]);

  const handleAddNew = () => {
    if (isStaffView) return;
    setEditingRoom(null);
    setShowModal(true);
  };

  const handleEdit = (room) => {
    if (isStaffView) return;
    setEditingRoom(room);
    setShowModal(true);
  };

  const roomDirectory = isStaffView ? staffRooms : allRooms;
  const availableBuildings = useMemo(() => {
    if (!isStaffView) return buildings;

    return Array.from(
      new Set(
        (roomDirectory || [])
          .map((room) => String(room?.building || "").trim())
          .filter(Boolean)
      )
    )
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
      .map((name) => ({ _id: name, name }));
  }, [buildings, isStaffView, roomDirectory]);

  const availableRoomTypes = useMemo(() => {
    if (!isStaffView) return roomTypes;

    return Array.from(
      new Set(
        (roomDirectory || [])
          .map((room) => String(room?.roomType || room?.type || "").trim())
          .filter(Boolean)
      )
    )
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
      .map((name) => ({ _id: name, name }));
  }, [isStaffView, roomDirectory, roomTypes]);

  const activeRoomsDirectory = useMemo(
    () => (roomDirectory || []).filter((room) => !room.isArchived),
    [roomDirectory]
  );
  const archivedRoomsDirectory = useMemo(
    () => (roomDirectory || []).filter((room) => room.isArchived),
    [roomDirectory]
  );
  const cleaningRoomIdSet = useMemo(
    () => new Set((cleaningRooms || []).map((id) => String(id))),
    [cleaningRooms]
  );
  const cleaningCount = useMemo(
    () =>
      (roomDirectory || []).filter((room) =>
        cleaningRoomIdSet.has(String(room?._id || ""))
      ).length,
    [cleaningRoomIdSet, roomDirectory]
  );

  const filteredRooms = useMemo(() => {
    const data = (roomDirectory || []).filter((room) => {
      const roomId = String(room?._id || "");
      const rType = room.roomType || room.type || "";
      const matchesType = filterType
        ? rType.toLowerCase().trim() === filterType.toLowerCase().trim()
        : true;
      const matchesBuilding = filterBuilding ? room.building === filterBuilding : true;
      const matchesArchive =
        filterArchive === "All"
          ? true
          : filterArchive === "Archived"
            ? Boolean(room.isArchived)
            : !room.isArchived;
      const isCleaning = cleaningRoomIdSet.has(roomId);
      const matchesStatus = filterStatus
        ? filterStatus === "Available"
          ? room.available && !isCleaning
          : filterStatus === "Unavailable"
            ? !room.available
            : filterStatus === "Cleaning"
              ? isCleaning
              : true
        : true;
      return matchesType && matchesBuilding && matchesArchive && matchesStatus;
    });

    const getFloorRank = (floorLabel) => {
      const floor = floorLabel?.toLowerCase() || "";
      if (floor.includes("1st") || floor.includes("upper")) return 1;
      if (floor.includes("2nd") || floor.includes("basement")) return 2;
      return 3;
    };

    data.sort((a, b) => {
      const buildingRankA = a.building === "Margarita" ? 1 : 2;
      const buildingRankB = b.building === "Margarita" ? 1 : 2;

      if (buildingRankA !== buildingRankB) {
        return buildingRankA - buildingRankB;
      }

      const floorRankA = getFloorRank(a.floor);
      const floorRankB = getFloorRank(b.floor);

      if (floorRankA !== floorRankB) {
        return floorRankA - floorRankB;
      }

      return (a.name || "").localeCompare(b.name || "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return data;
  }, [cleaningRoomIdSet, filterArchive, filterBuilding, filterStatus, filterType, roomDirectory]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / roomsPerPage));
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
    (currentPageSafe - 1) * roomsPerPage,
    currentPageSafe * roomsPerPage
  );
  const visibleRoomStart =
    filteredRooms.length === 0 ? 0 : (currentPageSafe - 1) * roomsPerPage + 1;
  const visibleRoomEnd = Math.min(currentPageSafe * roomsPerPage, filteredRooms.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterBuilding, filterStatus, filterArchive]);

  const clearFilters = () => {
    setFilterType("");
    setFilterBuilding("");
    setFilterStatus("");
    setFilterArchive("Active");
    setActiveDropdown(null);
    setShowMoreBuildings(false);
    setShowMoreTypes(false);
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/400x300?text=No+Image";
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  const getDisplayImage = (room) => {
    if (room.coverImage) return getImageUrl(room.coverImage);
    if (Array.isArray(room.images) && room.images.length > 0) return getImageUrl(room.images[0]);
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  const RoomDetailsModal = ({ room, onClose, handleEdit, readOnly: modalReadOnly = false }) => {
  if (!room) return null;

  const images = Array.isArray(room.images) && room.images.length > 0
    ? room.images
    : room.coverImage ? [room.coverImage] : [];
     
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const amenities = Array.isArray(room.amenities)
    ? room.amenities.filter(Boolean)
    : [];
  const visibleAmenities = showAllAmenities
    ? amenities
    : amenities.slice(0, MODAL_AMENITIES_PREVIEW_COUNT);

  useEffect(() => {
    setActiveImgIndex(0);
    setShowAllAmenities(false);
  }, [room._id]);

  useEffect(() => {
    if (images.length <= 1) return; 
    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % images.length);
    }, 4000); 
    return () => clearInterval(interval); 
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative border border-white/20">
        
        <div className="w-full md:w-[52%] p-5 flex flex-col bg-white">
          <div className="relative flex-1 overflow-hidden rounded-[2.5rem] group/slider bg-slate-100 shadow-inner min-h-[400px]">
            <div 
              className="flex h-full will-change-transform transition-transform"
              style={{
                transform: `translateX(-${activeImgIndex * 100}%)`,
                transitionDuration: "1200ms",
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            >
              {images.map((img, index) => (
                <div key={index} className="min-w-full h-full select-none">
                  <img
                    src={getImageUrl(img)}
                    alt="Room"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4 opacity-0 group-hover/slider:opacity-100 transition-all duration-300">
                <button onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }} 
                  className="bg-white/90 hover:bg-white p-3 rounded-full shadow-xl transition-transform active:scale-90">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev + 1) % images.length); }} 
                  className="bg-white/90 hover:bg-white p-3 rounded-full shadow-xl transition-transform active:scale-90">
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
                      className={`relative w-11 h-11 rounded-xl overflow-hidden transition-all duration-500 ${
                        idx === activeImgIndex 
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black/20 scale-110 z-10 shadow-lg" 
                          : "opacity-40 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
                      }`}
                    >
                      <img src={getImageUrl(img)} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-[48%] p-8 flex flex-col">
          <div className="flex flex-col mb-6">
            {/* Top Header Row: Name on Left, Building on Right */}
            <div className="flex justify-between items-center w-full mb-4">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">
                {room.name}
              </h2>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-blue-100">
                  {room.building}
                </span>
                <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all group shrink-0">
                  <X size={20} className="text-slate-400 group-hover:text-red-500" />
                </button>
              </div>
            </div>

            {/* Sub-Header Row: Room Type (Left) and Capacity (Right) */}
            {/* Added pr-[52px] to align Capacity with Building Tag above (Button 40px + Gap 12px) */}
            <div className="flex items-center justify-between w-full pr-[52px] text-[11px] font-bold">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl">
                <BedSingle size={16} className="text-slate-400" />
                <span>{room.roomType}</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl">
                <User size={16} className="text-slate-400" />
                <span>{room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar mt-2 border-t border-slate-50 pt-6">
            <section>
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Description</h3>
              <p className="text-xs leading-relaxed text-justify text-slate-600">
                {room.description || "Indulge in a space where modern luxury meets functional design, perfect for both relaxation and productivity."}
              </p>
            </section>

            <section>
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Included Amenities</h3>
              {amenities.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleAmenities.map((am, i) => (
                      <div key={`${am}-${i}`} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700">
                          {String(am || "").replace(/_/g, " ").toUpperCase()}
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

          {!modalReadOnly && (
            <div className="mt-8">
              <button
                onClick={() => { handleEdit(room); onClose(); }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl active:scale-95"
              >
                Edit Room Details <Edit3 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50 p-3 pb-6 font-sans text-slate-900 sm:p-4 xl:p-5">
      
      {viewingRoom && (
        <RoomDetailsModal
          room={viewingRoom}
          onClose={() => setViewingRoom(null)}
          handleEdit={handleEdit}
          readOnly={isStaffView}
        />
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {!isStaffView && deletingRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto">
              {deletingRoom.isArchived ? <RotateCcw size={32} /> : <Archive size={32} />}
            </div>
            
            <div className="text-center mb-8">
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                {deletingRoom.isArchived ? "Restore Room?" : "Archive Room?"}
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                {deletingRoom.isArchived ? (
                  <>
                    Restore <span className="font-bold text-slate-800">"{deletingRoom.name}"</span> so it can be used in new bookings again.
                  </>
                ) : (
                  <>
                    Archive <span className="font-bold text-slate-800">"{deletingRoom.name}"</span> so it disappears from new bookings while keeping existing records intact.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingRoom(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const success = await deleteRoom(deletingRoom._id);
                  if (success) {
                    setDeletingRoom(null);
                  }
                }}
                className={`flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${
                  deletingRoom.isArchived
                    ? "bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600"
                    : "bg-amber-500 shadow-amber-200 hover:bg-amber-600"
                }`}
              >
                {deletingRoom.isArchived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isStaffView ? "Room Directory" : "Room Management"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isStaffView
              ? "Browse room details, availability, and capacity without edit access."
              : "Manage your listings, availability, and details."}
          </p>
        </div>
        
        <div className="flex w-full flex-col items-end md:w-auto">
          {isStaffView ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              View Only
            </div>
          ) : (
            <button
              onClick={handleAddNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black md:w-auto"
            >
              <Plus size={20} />
              <span>Add New Room</span>
            </button>
          )}
        </div>
      </div>

     {/* --- DYNAMIC FILTER BAR --- */}
       <div className="relative z-40 mb-4 flex flex-col items-stretch gap-2.5 md:flex-row md:items-center">
        <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center">
         
         {/* BUILDING FILTER */}
         <div className="relative w-full md:w-44">
             <button 
               onClick={() => toggleDropdown('building')} 
                 className={`flex h-[38px] w-full items-center justify-between rounded-[18px] border px-3 text-[11px] font-normal transition-all ${
                  filterBuilding ? "border-slate-300 text-slate-900 bg-slate-50" : "border-slate-200 text-slate-600 bg-slate-50"
                }`}
             >
                 <span className="flex items-center gap-2">
                   <Building2 size={14} className="text-slate-400" />
                   <span className="truncate">{filterBuilding || "All Buildings"}</span>
                 </span>
                 <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'building' ? 'rotate-180' : ''}`} />
             </button>
             {activeDropdown === 'building' && (
                  <div className="absolute z-50 top-full left-0 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.32)] animate-in fade-in zoom-in-95 duration-200">
                       <div onClick={() => { setFilterBuilding(""); setActiveDropdown(null); }} className="flex cursor-pointer items-center gap-2.5 rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-400 hover:bg-slate-100">
                       <Building2 size={14} /> All Buildings
                     </div>
                     <div className="h-px bg-slate-100 my-1 mx-2" />
                     {availableBuildings.slice(0, showMoreBuildings ? availableBuildings.length : 3).map((b) => (
                           <div key={b._id} onClick={() => { setFilterBuilding(b.name); setActiveDropdown(null); }} className="cursor-pointer rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                           {b.name}
                         </div>
                     ))}
                     {availableBuildings.length > 3 && (
                         <button type="button" onClick={(e) => { e.stopPropagation(); setShowMoreBuildings(!showMoreBuildings); }} className="w-full border-t border-slate-50 py-2 text-[9px] font-normal uppercase tracking-[0.18em] text-slate-500 hover:bg-slate-100">
                         {showMoreBuildings ? "Show Less" : `+ ${availableBuildings.length - 3} More`}
                       </button>
                     )}
                 </div>
             )}
         </div>

         {/* ROOM TYPE FILTER */}
         <div className="relative w-full md:w-56">
             <button 
               onClick={() => toggleDropdown('type')} 
                 className={`flex h-[38px] w-full items-center justify-between rounded-[18px] border px-3 text-[11px] font-normal transition-all ${
                  filterType ? "border-slate-300 text-slate-900 bg-slate-50" : "border-slate-200 text-slate-600 bg-slate-50"
                }`}
             >
                 <span className="flex items-center gap-2">
                   <BedSingle size={14} className="text-slate-400" />
                   <span className="truncate">{filterType || "All Room Types"}</span>
                 </span>
                 <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'type' ? 'rotate-180' : ''}`} />
             </button>
             {activeDropdown === 'type' && (
                  <div className="absolute z-50 top-full left-0 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.32)] animate-in fade-in zoom-in-95 duration-200">
                        <div onClick={() => { setFilterType(""); setActiveDropdown(null); }} className="flex cursor-pointer items-center gap-2.5 rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-400 hover:bg-slate-100">
                        <BedSingle size={14} /> All Room Types
                      </div>
                     <div className="h-px bg-slate-100 my-1 mx-2" />
                     {availableRoomTypes.slice(0, showMoreTypes ? availableRoomTypes.length : 3).map((t) => (
                           <div key={t._id} onClick={() => { setFilterType(t.name); setActiveDropdown(null); }} className="cursor-pointer rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                           {t.name}
                         </div>
                     ))}
                     {availableRoomTypes.length > 3 && (
                         <button type="button" onClick={(e) => { e.stopPropagation(); setShowMoreTypes(!showMoreTypes); }} className="w-full border-t border-slate-50 py-2 text-[9px] font-normal uppercase tracking-[0.18em] text-slate-500 hover:bg-slate-100">
                         {showMoreTypes ? "Show Less" : `+ ${availableRoomTypes.length - 3} More`}
                       </button>
                     )}
                 </div>
             )}
         </div>

         <div className="relative w-full md:w-44">
           <button
             onClick={() => toggleDropdown('archive')}
             className={`flex h-[38px] w-full items-center justify-between rounded-[18px] border px-3 text-[11px] font-normal transition-all ${
              filterArchive && filterArchive !== "Active"
                ? "border-slate-300 text-slate-900 bg-slate-50"
                : "border-slate-200 text-slate-600 bg-slate-50"
            }`}
           >
             <span className="flex items-center gap-2">
               <Archive size={14} className="text-slate-400" />
               <span className="truncate">
                 {filterArchive === "Active" ? "Active Rooms" : filterArchive}
               </span>
             </span>
             <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'archive' ? 'rotate-180' : ''}`} />
           </button>

           {activeDropdown === 'archive' && (
             <div className="absolute z-50 top-full left-0 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.32)] animate-in fade-in zoom-in-95 duration-200">
               <div onClick={() => { setFilterArchive("Active"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                 <span>Active</span>
                 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                   {activeRoomsDirectory.length}
                 </span>
               </div>
               <div onClick={() => { setFilterArchive("Archived"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                 <span>Archived</span>
                 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                   {archivedRoomsDirectory.length}
                 </span>
               </div>
               <div onClick={() => { setFilterArchive("All"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                 <span>All Rooms</span>
                 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                   {(roomDirectory || []).length}
                 </span>
               </div>
             </div>
           )}
         </div>

         {/* STATUS FILTER */}
         <div className="relative w-full md:w-44">
           <button 
             onClick={() => toggleDropdown('status')} 
               className={`flex h-[38px] w-full items-center justify-between rounded-[18px] border px-3 text-[11px] font-normal transition-all ${
                filterStatus ? "border-slate-300 text-slate-900 bg-slate-50" : "border-slate-200 text-slate-600 bg-slate-50"
              }`}
           >
             <span className="flex items-center gap-2">
               {!filterStatus && <Filter size={14} className="text-slate-400" />}
               {filterStatus === "Available" && <CheckCircle size={14} className="text-slate-400" />}
               {filterStatus === "Unavailable" && <XCircle size={14} className="text-slate-400" />}
               {filterStatus === "Cleaning" && <RefreshCw size={14} className="text-slate-400" />}
               <span className="truncate">{filterStatus || "All Status"}</span>
             </span>
             <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
           </button>
           
           {activeDropdown === 'status' && (
              <div className="absolute z-50 top-full left-0 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.32)] animate-in fade-in zoom-in-95 duration-200">
                 <div onClick={() => { setFilterStatus(""); setActiveDropdown(null); }} className="flex cursor-pointer items-center gap-2.5 rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-400 hover:bg-slate-100">
                 <Filter size={14} className="text-slate-400" /> All Status
               </div>
               <div className="h-px bg-slate-100 my-1 mx-2" />
               <div onClick={() => { setFilterStatus("Available"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                  <span>Available</span>
                   <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                    {activeRoomsDirectory.filter(r => r.available).length}
                  </span>
                </div>
                <div onClick={() => { setFilterStatus("Unavailable"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                  <span>Unavailable</span>
                   <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                    {activeRoomsDirectory.filter(r => !r.available).length}
                  </span>
                </div>
                <div onClick={() => { setFilterStatus("Cleaning"); setActiveDropdown(null); }} className="flex cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-[11px] font-normal text-slate-700 transition-colors hover:bg-slate-100">
                  <span>Cleaning</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-normal text-slate-500">
                    {cleaningCount}
                  </span>
                </div>
             </div>
           )}
         </div>

         {/* RESET FILTERS BUTTON */}
         {(filterType || filterBuilding || filterStatus || (!isStaffView && filterArchive !== "Active")) && (
             <button 
               onClick={clearFilters} 
                 className="ml-auto flex h-[38px] items-center gap-1.5 rounded-[18px] border border-transparent px-3 text-[11px] font-normal text-slate-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
             >
               <RotateCcw size={14} />
               <span>Reset Filters</span>
             </button>
         )}
       </div>
      </div>

      {/* --- ROOMS GRID --- */}
      <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4">
        {paginatedRooms.map((room) => {
          const roomTypeLabel = room.roomType || room.type || "No type assigned";
          const capacityLabel = `${room.capacity} ${Number(room.capacity) === 1 ? "Person" : "People"}`;
          const isArchived = Boolean(room.isArchived);
          const isDimmed = isArchived || !room.available;

          return (
          <div key={room._id} className="group flex flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_20px_44px_-34px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)]">
            <div 
                className="group/image relative h-32 overflow-hidden bg-slate-200 cursor-zoom-in xl:h-36"
                onClick={() => setViewingRoom(room)}
            >
              <img 
                src={getDisplayImage(room)}
                alt={room.name} 
                className={`w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105 ${isDimmed ? 'opacity-40 grayscale' : ''}`} 
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent"></div>
              
              {isArchived ? (
                <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[8px] font-bold text-white shadow-lg">
                    <Archive size={10} strokeWidth={3} /> ARCHIVED
                </div>
              ) : room.available ? (
                <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[8px] font-bold text-white shadow-lg">
                    <CheckCircle2 size={10} strokeWidth={3} className="text-emerald-400" /> AVAILABLE
                </div>
              ) : null}

              {isArchived ? (
                <div className="absolute inset-0 bg-amber-50/85 flex flex-col items-center justify-center text-amber-700 p-4 text-center z-10 pointer-events-none">
                    <Archive size={24} className="mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Archived</span>
                </div>
              ) : !room.available ? (
                <div className="absolute inset-0 bg-slate-100/80 flex flex-col items-center justify-center text-slate-400 p-4 text-center z-10 pointer-events-none">
                    <Ban size={24} className="mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Unavailable</span>
                </div>
              ) : null}

              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-900 shadow-sm">
                    View Details
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 p-3.5">
              <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-[14px] font-black leading-tight tracking-tight ${isDimmed ? 'text-slate-400' : 'text-slate-900'}`}>
                        {room.name}
                    </h3>
                  </div>
                    {room.building && (
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] ${
                            isDimmed ? "border-slate-100 bg-slate-50 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
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
                    <BedSingle size={13} className={isDimmed ? "mt-0.5 text-slate-300" : "mt-0.5 text-slate-500"} />
                    <p className={`line-clamp-2 text-[11px] font-bold leading-snug ${
                      isDimmed ? "text-slate-400" : "text-slate-700"
                    }`}>
                      {roomTypeLabel}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Capacity
                  </p>
                  <div className={`mt-1 inline-flex items-center justify-end gap-1.5 ${
                    isDimmed ? "text-slate-400" : "text-slate-700"
                  }`}>
                    <Users size={13} className={isDimmed ? "text-slate-300" : "text-slate-500"} />
                    <span className="text-[11px] font-black leading-none">{capacityLabel}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-2">
                {isStaffView ? (
                  <>
                    <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ${
                      isArchived
                        ? "bg-amber-50 text-amber-700"
                        : room.available
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        isArchived
                          ? "bg-amber-500"
                          : room.available
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                      }`}></span>
                      {isArchived ? "Archived" : room.available ? "Available" : "Unavailable"}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      View Only
                    </span>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer group/toggle">
                      <div className={`h-4.5 w-8 rounded-full p-0.5 transition-colors duration-300 ${room.available && !isArchived ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${room.available && !isArchived ? 'translate-x-3.5' : ''}`}></div>
                      </div>
                      <input type="checkbox" className="hidden" checked={room.available && !isArchived} disabled={isArchived} onChange={() => changeAvailability(room._id)} />
                       <span className={`text-[8px] font-bold uppercase tracking-tight transition-colors ${room.available ? "text-emerald-600" : "text-slate-400"}`}>
                        {isArchived ? "Archived" : room.available ? "Available" : "Unavailable"}
                      </span>
                    </label>

                    <div className="flex gap-1.5">
                      <button onClick={() => handleEdit(room)} className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => setDeletingRoom(room)} className={`rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors ${isArchived ? "hover:bg-emerald-50 hover:text-emerald-600" : "hover:bg-amber-50 hover:text-amber-700"}`} title={isArchived ? "Restore" : "Archive"}>
                        {isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>

      <div className="sticky bottom-0 z-20 mt-4 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pt-4 pb-1">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full text-left sm:w-auto">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
              {!isStaffView && filterArchive === "Archived" ? "Archived Directory" : "Room Directory"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
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
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[9px] font-bold transition ${
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

      {/* --- EDIT MODAL --- */}
      {!isStaffView && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-3xl shadow-2xl">
              <AddRoom editRoom={editingRoom} onClose={() => setShowModal(false)} onSuccess={() => { handleRefresh(); setShowModal(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsList;


