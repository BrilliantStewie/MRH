import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate, useLocation } from "react-router-dom"; // 👈 Added useLocation
import axios from "axios";
import {
  Users, Wind, Plus, X, ArrowRight, Filter, Building2,
  BedDouble, Layers, User, Ban, CalendarX, Sun, CheckCircle,
  CircleDashed, ChevronLeft, ChevronRight, Trash2
} from "lucide-react";

const Rooms = () => {
  const {
    rooms,
    selectedRooms,
    addRoom,
    removeRoom,
    clearRooms,
    getRoomsData,
    backendUrl
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation(); // 👈 Added location hook

  // --- STATE ---
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [viewingRoom, setViewingRoom] = useState(null); 

  // Filter States
  const [filterStatus, setFilterStatus] = useState("all");
  
  // 👈 UPDATED: Check for state passed from RoomTypeMenu
  const [roomType, setRoomType] = useState(() => {
    if (location.state && location.state.selectedRoomType) {
      return location.state.selectedRoomType;
    }
    return "all";
  });
  
  const [building, setBuilding] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getRoomsData();
    fetchOccupiedRooms();
    const interval = setInterval(fetchOccupiedRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOccupiedRooms = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/booking/occupied`);
      if (data.success) {
        const safeList = data.occupiedRoomIds || [];
        setOccupiedRooms(safeList.map(id => String(id)));
      }
    } catch (error) {
      console.error("Error fetching occupied rooms:", error);
    }
  };

  // 👈 UPDATED: Normalizer now keeps spaces intact for matching multi-word room types
  const normalize = (v = "") => v?.toString().toLowerCase().trim() || "";
  
  const isSelected = (id) => selectedRooms.some((r) => r._id === id);

  // --- FILTERING & SORTING ---
  useEffect(() => {
    let data = [...rooms];

    if (roomType !== "all") data = data.filter((r) => normalize(r.room_type) === normalize(roomType));
    if (building !== "all") data = data.filter((r) => normalize(r.building) === normalize(building));
    if (filterStatus === "available") {
      data = data.filter((r) => {
        const isBooked = occupiedRooms.some(oid => String(oid) === String(r._id));
        return !isBooked && r.available !== false;
      });
    } else if (filterStatus === "occupied") {
      data = data.filter((r) => occupiedRooms.some(oid => String(oid) === String(r._id)));
    }
    if (search) {
      data = data.filter((r) => normalize(r.name).includes(normalize(search)) || normalize(r.building).includes(normalize(search)));
    }

    // Sorting: Building > Floor > Name > Type
    data.sort((a, b) => {
      const b1 = a.building === "Margarita" ? 1 : 2;
      const b2 = b.building === "Margarita" ? 1 : 2;

      if (b1 !== b2) return b1 - b2;

      const getFloorRank = (f) => {
        const floor = f?.toLowerCase() || "";
        if (floor.includes("1st") || floor.includes("upper")) return 1;
        if (floor.includes("2nd") || floor.includes("basement")) return 2;
        return 3;
      };
      if (getFloorRank(a.floor) !== getFloorRank(b.floor)) return getFloorRank(a.floor) - getFloorRank(b.floor);

      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;

      return 0;
    });

    setFilteredRooms(data);
  }, [rooms, roomType, building, search, filterStatus, occupiedRooms]);

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
    `group w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase mb-1 flex items-center gap-3 transition-all duration-300 ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:pl-6 hover:text-slate-900"
    }`;


  // --- MODAL COMPONENT (Internal) ---
  const RoomDetailsModal = ({ room, onClose }) => {
    if (!room) return null;

    const images =
      Array.isArray(room.images) && room.images.length > 0
        ? room.images
        : room.cover_image
          ? [room.cover_image]
          : [];
    if (images.length === 0) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="bg-white p-8 rounded-xl text-slate-500">
            No images available for this room.
          </div>
        </div>
      );
    }

    const [activeImgIndex, setActiveImgIndex] = useState(0);
    const isRoomSelected = isSelected(room._id);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

          {/* LEFT: Image Gallery */}
          <div className="w-full md:w-1/2 bg-slate-100 relative group">
            <img
              src={getImageUrl(images[activeImgIndex])}
              alt={room.name}
              className="w-full h-64 md:h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {images.map((_, idx) => (
                    <div key={idx} className={`w-2 h-2 rounded-full ${idx === activeImgIndex ? "bg-white" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Content */}
          <div className="w-full md:w-1/2 p-8 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                  {room.building} &bull; {room.floor}
                </span>
                <h2 className="text-2xl font-bold text-slate-800">{room.name}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex gap-4 text-sm text-slate-500 font-medium mb-6">
              <span className="flex items-center gap-1"><User size={16} /> {room.capacity} Pax</span>
              <span className="flex items-center gap-1"><BedDouble size={16} /> {room.room_type}</span>
            </div>

            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Description</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              {room.description || "No specific description available for this room. It features standard amenities for a comfortable stay."}
            </p>

            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Amenities</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {room.amenities && Array.isArray(room.amenities) ? (
                room.amenities.map((am, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs text-slate-600 capitalize">
                    {am}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs italic">No specific amenities listed.</span>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (isRoomSelected) removeRoom(room._id);
                  else addRoom(room);
                  onClose(); 
                }}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${isRoomSelected
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-xl"
                  }`}
              >
                {isRoomSelected ? <>Remove from Booking <X size={18} /></> : <>Add to Booking <Plus size={18} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 pt-5 flex flex-col overflow-hidden relative">

      {/* RENDER MODAL IF OPEN */}
      {viewingRoom && (
        <RoomDetailsModal room={viewingRoom} onClose={() => setViewingRoom(null)} />
      )}

      <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-8 h-full overflow-hidden">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-72 h-full overflow-y-auto pb-20 pr-2">
          {/* ... Filter Logic ... */}
          <div className="space-y-6">
            <div className="bg-white border p-6 rounded-2xl shadow-sm">
              <h2 className="text-xs font-bold uppercase mb-6 tracking-wider text-slate-900 flex items-center gap-2">
                <Filter size={14} className="text-slate-400" /> Room Filter
              </h2>
              {/* 1. ROOM TYPE */}
              <div className="mb-6">
                <p className="text-[10px] uppercase text-slate-400 mb-2 font-bold tracking-widest flex items-center gap-1">
                  <BedDouble size={10} /> Room Type
                </p>
                {[{ val: "all", label: "All Types", icon: Layers }, { val: "Individual", label: "Individual", icon: User }, { val: "Individual with pullout", label: "Individual with Pullout", icon: User }, { val: "Dormitory", label: "Dormitory", icon: Users }].map((t) => (
                  <button key={t.val} onClick={() => setRoomType(t.val)} className={getFilterButtonClass(roomType === t.val)}>
                    <t.icon size={14} className={roomType === t.val ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"} />{t.label}
                  </button>
                ))}
              </div>
              {/* 2. BUILDING */}
              <div className="mb-6">
                <p className="text-[10px] uppercase text-slate-400 mb-2 font-bold tracking-widest flex items-center gap-1">
                  <Building2 size={10} /> Building
                </p>
                {["all", "margarita", "nolasco"].map((b) => (
                  <button key={b} onClick={() => setBuilding(b)} className={getFilterButtonClass(building === b)}>
                    {b === "all" ? <Layers size={14} className={building === b ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"} /> : <Building2 size={14} className={building === b ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"} />}
                    {b === "all" ? "All Buildings" : b}
                  </button>
                ))}
              </div>
              {/* 3. AVAILABILITY */}
              <div className="mb-6 border-t border-slate-100 pt-6">
                <p className="text-[10px] uppercase text-slate-400 mb-2 font-bold tracking-widest flex items-center gap-1">
                  <CheckCircle size={10} /> Availability
                </p>
                {[{ val: "all", label: "Show All", icon: Layers }, { val: "available", label: "Available", icon: CircleDashed }, { val: "occupied", label: "Occupied", icon: CalendarX }].map((s) => (
                  <button key={s.val} onClick={() => setFilterStatus(s.val)} className={getFilterButtonClass(filterStatus === s.val)}>
                    <s.icon size={14} className={filterStatus === s.val ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"} />{s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW & CLEAR SELECTION */}
            {selectedRooms.length > 0 ? (
              <div className="bg-white border rounded-2xl shadow-lg overflow-hidden ring-1 ring-slate-900/5">
                <div className="h-36 bg-slate-900 relative">
                  <img src={getImageUrl(getRoomImage(selectedRooms[0]))} alt="Selected Room" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white pr-4">
                    <p className="text-[10px] uppercase text-blue-200 mb-0.5 tracking-wider font-bold">Current Selection</p>
                    <div className="font-bold text-sm leading-tight text-white">{selectedRooms[0].name}
                      {extraCount > 0 && <span className="inline-flex items-center ml-2 bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">+{extraCount} others</span>}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <button onClick={() => navigate("/retreat-booking")} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                    Review & Book <ArrowRight size={14} />
                  </button>
                  {/* 👇 ADDED CLEAR BUTTON HERE */}
                  <button 
                    onClick={clearRooms}
                    className="w-full mt-2 py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Clear Selection <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-2xl shadow-sm">
                <h2 className="text-xs font-bold uppercase mb-3 tracking-wider text-blue-900 flex items-center gap-2"><Sun size={14} className="text-orange-500" /> Day Trip?</h2>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Booking the venue without accommodation? You can proceed directly to booking.</p>
                <button onClick={() => navigate("/retreat-booking")} className="w-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 py-3 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2">Book Venue Only <ArrowRight size={14} /></button>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN GRID */}
        <main className="flex-1 h-full overflow-y-auto pt-1 pb-32 pr-2 pl-2">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
              <Wind size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No rooms match your filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRooms.map((room) => {
                const selected = isSelected(room._id);
                const isUnderMaintenance = room.available === false;
                const isBookedToday = occupiedRooms.some((oid) => String(oid) === String(room._id));
                const isUnavailable = isUnderMaintenance || isBookedToday;

                return (
                  <div
                    key={room._id}
                    onClick={() => !isUnavailable && (selected ? removeRoom(room._id) : addRoom(room))}
                    className={`relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 ${isUnavailable
                        ? "border-slate-100 shadow-none"
                        : selected
                          ? "cursor-pointer border-slate-900 shadow-xl ring-4 ring-blue-600/10"
                          : "cursor-pointer border-transparent hover:border-slate-200 hover:shadow-lg"
                      }`}
                  >
                    <div
                      className="h-44 bg-slate-200 relative group overflow-hidden cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingRoom(room);
                      }}
                    >
                      <img
                        src={getImageUrl(getRoomImage(room))}
                        alt={room.name}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isUnavailable ? "opacity-40" : "opacity-100"
                          }`}
                        onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=No+Image"; }}
                      />

                      {isBookedToday && !isUnderMaintenance && (
                        <div className="absolute inset-0 bg-white/50 flex flex-col items-center justify-center z-10 pointer-events-none">
                          <CalendarX size={28} className="text-slate-500 mb-1" />
                          <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">Occupied</span>
                        </div>
                      )}
                      {isUnderMaintenance && (
                        <div className="absolute inset-0 bg-slate-100/80 flex flex-col items-center justify-center text-slate-400 p-4 text-center z-10 pointer-events-none">
                          <Ban size={28} className="mb-1" />
                          <span className="font-bold text-[10px] uppercase tracking-widest">Maintenance</span>
                        </div>
                      )}
                      {selected && !isUnavailable && (
                        <div className="absolute top-3 right-3 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20 pointer-events-none">
                          <CheckCircle size={10} strokeWidth={3} /> SELECTED
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-slate-900 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full shadow-sm">
                          View Details
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={`font-bold text-sm leading-tight ${isUnavailable ? "text-slate-400" : "text-slate-800"}`}>
                            {room.name}
                          </h3>
                          {room.building && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border tracking-wider whitespace-nowrap ${isUnavailable ? "bg-slate-50 text-slate-300 border-slate-100" : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                              <Building2 size={8} /> {room.building}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide">
                          {room.room_type?.replace(/_/g, " ")}
                        </p>
                      </div>

                      <div className={`flex flex-wrap gap-2 text-xs mb-5 font-medium ${isUnavailable ? "text-slate-300" : "text-slate-500"}`}>
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isUnavailable ? "bg-white border-slate-100" : "bg-slate-50 border-slate-100"
                          }`}>
                          <Users size={14} className={isUnavailable ? "text-slate-300" : "text-slate-900"} />
                          {room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}
                        </span>
                      </div>

                      <button
                        disabled={isUnavailable}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          !isUnavailable && (selected ? removeRoom(room._id) : addRoom(room))
                        }}
                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${isUnavailable
                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100"
                            : selected
                              ? "bg-red-50 text-red-600 border border-red-50 hover:bg-red-100"
                              : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 hover:shadow-xl"
                          }`}
                      >
                        {isUnderMaintenance ? "Maintenance" : isBookedToday ? "Occupied" : selected ? <><span className="hidden xl:inline">Remove</span><X size={14} className="stroke-[3]" /></> : <><span className="hidden xl:inline">Select</span><Plus size={14} className="stroke-[3]" /></>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default Rooms;