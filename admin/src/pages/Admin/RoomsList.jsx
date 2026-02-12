import React, { useContext, useEffect, useState, useMemo } from "react";
import { AdminContext } from "../../context/AdminContext";
import AddRoom from "./AddRoom"; 
import { 
  RefreshCw, 
  Trash2, 
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
  BedDouble,
  User
} from "lucide-react";

const RoomsList = () => {
  const { aToken, allRooms, getAllRooms, changeAvailability, deleteRoom } = useContext(AdminContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- FILTER STATES ---
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    if (aToken) {
      handleRefresh();
    }
  }, [aToken]);

  const handleRefresh = async () => {
    setLoading(true);
    await getAllRooms();
    setLoading(false);
  };

  const handleAddNew = () => {
    setEditingRoom(null);
    setShowModal(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowModal(true);
  };

  // --- FILTER LOGIC ---
  const filteredRooms = useMemo(() => {
    return allRooms.filter(room => {
      const rType = room.room_type || room.type || "";
      const matchesType = filterType ? rType.toLowerCase().trim() === filterType.toLowerCase().trim() : true;
      const matchesBuilding = filterBuilding ? room.building === filterBuilding : true;
      const matchesStatus = filterStatus ? (filterStatus === "Available" ? room.available : !room.available) : true;
      return matchesType && matchesBuilding && matchesStatus;
    });
  }, [allRooms, filterType, filterBuilding, filterStatus]);

  const clearFilters = () => {
    setFilterType("");
    setFilterBuilding("");
    setFilterStatus("");
    setActiveDropdown(null);
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
    if (room.cover_image) return getImageUrl(room.cover_image);
    if (Array.isArray(room.images) && room.images.length > 0) return getImageUrl(room.images[0]);
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  // --- VIEW DETAILS MODAL ---
  const RoomDetailsModal = ({ room, onClose, handleEdit }) => {
  if (!room) return null;

  const images = Array.isArray(room.images) && room.images.length > 0
    ? room.images
    : room.cover_image ? [room.cover_image] : [];
    
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Smooth Slideshow logic
  useEffect(() => {
    if (images.length <= 1) return; 
    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % images.length);
    }, 4000); // Slightly longer interval for a calmer feel
    return () => clearInterval(interval); 
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative border border-white/20">
        
        {/* LEFT: Image Section */}
        <div className="w-full md:w-[52%] p-5 flex flex-col bg-white">
          <div className="relative flex-1 overflow-hidden rounded-[2.5rem] group/slider bg-slate-100 shadow-inner min-h-[400px]">
            
            {/* THE SMOOTH SLIDER TRACK */}
            <div 
              className="flex h-full will-change-transform transition-transform duration-[1200ms] cubic-bezier(0.23, 1, 0.32, 1)" 
              style={{ transform: `translateX(-${activeImgIndex * 100}%)` }}
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

            {/* Premium Navigation Arrows */}
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

            {/* ALBUM: Wrapped & No Scrollbar */}
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

        {/* RIGHT: Content Section */}
        <div className="w-full md:w-[48%] p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-blue-100">
                  {room.building}
                </span>
                
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                {room.name}
              </h2>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all group">
              <X size={20} className="text-slate-400 group-hover:text-red-500" />
            </button>
          </div>

          <div className="flex gap-6 text-slate-500 mb-8 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-2 text-sm font-semibold"><User size={16} className="text-slate-400" /> {room.capacity} People</div>
            <div className="flex items-center gap-2 text-sm font-semibold"><BedDouble size={16} className="text-slate-400" /> {room.room_type}</div>
          </div>

          <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Description</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {room.description || "Indulge in a space where modern luxury meets functional design, perfect for both relaxation and productivity."}
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Included Amenities</h3>
              <div className="grid grid-cols-2 gap-2">
                {room.amenities?.map((am, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[11px] font-bold text-slate-700 capitalize">{am}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8">
            <button
              onClick={() => { handleEdit(room); onClose(); }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Update Room Details <Edit3 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* --- RENDER VIEW DETAILS MODAL --- */}
      {viewingRoom && (
        <RoomDetailsModal room={viewingRoom} onClose={() => setViewingRoom(null)} />
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Room Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your listings, availability, and details.</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleRefresh} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-black transition-all shadow-sm">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button onClick={handleAddNew} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-black transition-all">
            <Plus size={20} /> 
            <span>Add New Room</span>
          </button>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between relative z-40">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* ... Filters Logic ... */}
            <div className="relative w-full md:w-48">
                <button onClick={() => toggleDropdown('building')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center text-slate-600">
                    <span>{filterBuilding || "All Buildings"}</span>
                    <ChevronDown size={16} />
                </button>
                {activeDropdown === 'building' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                         <div onClick={() => { setFilterBuilding(""); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">All Buildings</div>
                        {["Nolasco", "Margarita"].map((bldg) => (
                            <div key={bldg} onClick={() => { setFilterBuilding(bldg); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">{bldg}</div>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative w-full md:w-60">
                <button onClick={() => toggleDropdown('type')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center text-slate-600">
                    <span>{filterType || "All Room Types"}</span>
                    <ChevronDown size={16} />
                </button>
                {activeDropdown === 'type' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                         <div onClick={() => { setFilterType(""); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">All Room Types</div>
                        {["Individual", "Individual with Pull-out", "Dormitory"].map((type) => (
                            <div key={type} onClick={() => { setFilterType(type); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">{type}</div>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative w-full md:w-48">
                <button onClick={() => toggleDropdown('status')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center text-slate-600">
                    <span>{filterStatus || "All Status"}</span>
                    <ChevronDown size={16} />
                </button>
                {activeDropdown === 'status' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                        <div onClick={() => { setFilterStatus(""); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">All Status</div>
                        <div onClick={() => { setFilterStatus("Available"); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">Available</div>
                        <div onClick={() => { setFilterStatus("Unavailable"); setActiveDropdown(null); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">Unavailable</div>
                    </div>
                )}
            </div>

            {(filterType || filterBuilding || filterStatus) && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium transition-all">
                    <X size={16} /> Clear Filters
                </button>
            )}
        </div>
      </div>

      {/* --- ROOMS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => (
          <div key={room._id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300 flex flex-col">
            
            {/* IMAGE AREA - Using 'group/image' to scope hover effects */}
            <div 
                className="relative h-44 bg-slate-200 overflow-hidden cursor-zoom-in group/image"
                onClick={() => setViewingRoom(room)}
            >
              <img 
                src={getDisplayImage(room)}
                alt={room.name} 
                className={`w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105 ${!room.available ? 'opacity-40 grayscale' : ''}`} 
              />
              
              {room.available && (
                <div className="absolute top-3 right-3 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20 pointer-events-none">
                    <CheckCircle2 size={10} strokeWidth={3} className="text-emerald-400" /> AVAILABLE
                </div>
              )}

              {!room.available && (
                <div className="absolute inset-0 bg-slate-100/80 flex flex-col items-center justify-center text-slate-400 p-4 text-center z-10 pointer-events-none">
                    <Ban size={28} className="mb-1" />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Unavailable</span>
                </div>
              )}

              {/* View Details Overlay - Only appears when hovering image container */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/90 text-slate-900 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full shadow-sm">
                    View Details
                </span>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-5 flex-1 flex flex-col">
              
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`font-bold text-sm leading-tight ${room.available ? 'text-slate-800' : 'text-slate-400'}`}>
                        {room.name}
                    </h3>
                    {room.building && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border tracking-wider whitespace-nowrap ${
                            room.available ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-slate-50 text-slate-300 border-slate-100"
                        }`}>
                            <Building2 size={8} /> {room.building}
                        </span>
                    )}
                </div>
                
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide">
                    {room.room_type || room.type}
                </p>
              </div>

              <div className={`flex flex-wrap gap-2 text-xs mb-5 font-medium ${!room.available ? "text-slate-300" : "text-slate-500"}`}>
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                    !room.available ? "bg-white border-slate-100" : "bg-slate-50 border-slate-100"
                }`}>
                    <Users size={14} className={!room.available ? "text-slate-300" : "text-slate-900"} />
                    {/* 👇 Singular/Plural Check */}
                    {room.capacity} {Number(room.capacity) === 1 ? "Person" : "People"}
                </span>
              </div>

              {/* ACTIONS FOOTER */}
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ${room.available ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${room.available ? 'translate-x-3.5' : ''}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={room.available} onChange={() => changeAvailability(room._id)} />
                  <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${room.available ? "text-emerald-600" : "text-slate-400"}`}>
                    {room.available ? "Active" : "Inactive"}
                  </span>
                </label>

                <div className="flex gap-1">
                  <button onClick={() => handleEdit(room)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => deleteRoom(room._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- EDIT MODAL --- */}
      {showModal && (
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