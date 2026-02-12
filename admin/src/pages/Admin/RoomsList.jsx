import React, { useContext, useEffect, useState, useMemo } from "react";
import { AdminContext } from "../../context/AdminContext";
import AddRoom from "./AddRoom"; 
import { 
  RefreshCw, 
  Trash2, 
  Plus, 
  Edit3, 
  MapPin, 
  Users, 
  X,
  ChevronDown,
  Ban,
  CheckCircle2
} from "lucide-react";

const RoomsList = () => {
  const { aToken, allRooms, getAllRooms, changeAvailability, deleteRoom } = useContext(AdminContext);

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
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

  const getDisplayImage = (room) => {
    if (room.cover_image) return room.cover_image;
    return "/no-image.png";
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      
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
          <div key={room._id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-300 overflow-hidden flex flex-col hover:shadow-xl">
            {/* IMAGE AREA */}
            <div className="relative h-48 overflow-hidden bg-slate-100 m-2 rounded-[1.6rem]">
              <img 
                src={getDisplayImage(room)}
                alt={room.name} 
                className={`w-full h-full object-cover transition-all duration-700 ${!room.available ? 'grayscale opacity-40 blur-[1px]' : 'group-hover:scale-110'}`} 
              />
              
              {/* TOP RIGHT: AVAILABILITY (BLACK) */}
              {room.available && (
                <div className="absolute top-3 right-3">
                    <div className="px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 bg-slate-900 text-white border border-slate-800">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Available</span>
                    </div>
                </div>
              )}

              {!room.available && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[120px] border border-white/50 transform scale-90">
                    <Ban size={20} className="text-slate-600 mb-0.5" strokeWidth={2} />
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest mt-0.5">Unavailable</span>
                  </div>
                </div>
              )}
            </div>

            {/* CONTENT AREA */}
            <div className="px-5 py-5 flex-1 flex flex-col">
              
              {/* HEADER ROW: Name (Left) and Building (Right) */}
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-[17px] font-bold leading-tight max-w-[70%] ${room.available ? 'text-slate-800' : 'text-slate-500'}`}>
                  {room.name}
                </h3>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight flex items-center gap-1 whitespace-nowrap">
                  <MapPin size={10} className="text-slate-400" /> {room.building}
                </span>
              </div>

              {/* BELOW NAME: Room Type */}
              <div className="mb-5">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                  {room.room_type || room.type}
                </span>
              </div>

              {/* CAPACITY TAG */}
              <div className="flex gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-500 shadow-sm">
                  <Users size={14} className="text-slate-300" /> {room.capacity} People
                </div>
              </div>

              {/* ACTIONS FOOTER */}
              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ${room.available ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${room.available ? 'translate-x-3.5' : ''}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={room.available} onChange={() => changeAvailability(room._id)} />
                  <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${room.available ? "text-emerald-600" : "text-slate-400"}`}>
                    {room.available ? "Available" : "Unavailable"}
                  </span>
                </label>

                <div className="flex gap-1">
                  <button onClick={() => handleEdit(room)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => deleteRoom(room._id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL --- */}
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