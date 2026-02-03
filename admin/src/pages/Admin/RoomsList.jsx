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
  CheckCircle, 
  Ban, 
  Filter,
  X,
  ChevronDown
} from "lucide-react";

const RoomsList = () => {
  // 1. GET backendUrl FROM CONTEXT
  const { backendUrl, aToken, allRooms, getAllRooms, changeAvailability, deleteRoom } = useContext(AdminContext);

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- FILTER STATES ---
  const [filterType, setFilterType] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
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
      // Backend uses 'room_type', ensure fallback
      const rType = room.room_type || room.type;
      
      const matchesType = filterType ? rType === filterType : true;
      const matchesBuilding = filterBuilding ? room.building === filterBuilding : true;
      const matchesStatus = filterStatus 
        ? (filterStatus === "Available" ? room.available : !room.available) 
        : true;

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

  // --- HELPER: GET DISPLAY IMAGE ---
  const getDisplayImage = (room) => {
  if (room.cover_image) return room.cover_image;
  return "/no-image.png";
};


  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Room Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your listings, availability, and details.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh} 
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
            title="Refresh List"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={handleAddNew} 
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95"
          >
            <Plus size={20} /> 
            <span>Add New Room</span>
          </button>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between relative z-40">
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Type Filter */}
            <div className="relative w-full md:w-48">
                <button
                    onClick={() => toggleDropdown('type')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all flex justify-between items-center text-slate-600"
                >
                    <span>{filterType || "All Types"}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-75 ${activeDropdown === 'type' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'type' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-75">
                         <div onClick={() => { setFilterType(""); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterType === "" ? "bg-slate-200" : ""}`}>All Types</div>
                        {["Single", "Single (Pullout)", "Dormitory"].map((type) => (
                            <div key={type} onClick={() => { setFilterType(type); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterType === type ? "bg-slate-200" : ""}`}>{type}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Building Filter */}
            <div className="relative w-full md:w-48">
                <button
                    onClick={() => toggleDropdown('building')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all flex justify-between items-center text-slate-600"
                >
                    <span>{filterBuilding || "All Buildings"}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-75 ${activeDropdown === 'building' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'building' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-75">
                         <div onClick={() => { setFilterBuilding(""); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterBuilding === "" ? "bg-slate-200" : ""}`}>All Buildings</div>
                        {["Nolasco", "Margarita"].map((bldg) => (
                            <div key={bldg} onClick={() => { setFilterBuilding(bldg); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterBuilding === bldg ? "bg-slate-200" : ""}`}>{bldg}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status Filter */}
            <div className="relative w-full md:w-48">
                <button
                    onClick={() => toggleDropdown('status')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all flex justify-between items-center text-slate-600"
                >
                    <span>{filterStatus || "All Status"}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-75 ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'status' && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-75">
                         <div onClick={() => { setFilterStatus(""); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterStatus === "" ? "bg-slate-200" : ""}`}>All Status</div>
                        {["Available", "Unavailable"].map((status) => (
                            <div key={status} onClick={() => { setFilterStatus(status); setActiveDropdown(null); }} className={`px-4 py-2.5 text-sm font-medium text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 ${filterStatus === status ? "bg-slate-200" : ""}`}>{status}</div>
                        ))}
                    </div>
                )}
            </div>

            {(filterType || filterBuilding || filterStatus) && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium transition-all">
                    <X size={16} /> Clear
                </button>
            )}
        </div>

        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Showing {filteredRooms.length} of {allRooms.length} {allRooms.length === 1 ? "room" : "rooms"}
        </div>
      </div>

      {/* --- EMPTY STATE --- */}
      {!loading && filteredRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            {allRooms.length === 0 ? (
                <>
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Plus size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No rooms found</h3>
                    <p className="text-slate-500 text-sm">Get started by adding a new room to your inventory.</p>
                </>
            ) : (
                <>
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Filter size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No matches found</h3>
                    <p className="text-slate-500 text-sm">Try adjusting your filters to see more results.</p>
                    <button onClick={clearFilters} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Clear all filters</button>
                </>
            )}
        </div>
      )}

      {/* --- ROOMS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => (
          <div 
            key={room._id} 
            className={`group bg-white rounded-2xl shadow-sm transition-all duration-300 overflow-hidden flex flex-col 
              ${!room.available 
                ? "grayscale border-2 border-rose-100 opacity-80" 
                : "border border-slate-100 hover:shadow-xl hover:-translate-y-1"
              }`}
          >
            {/* IMAGE AREA */}
            <div className="relative h-56 overflow-hidden bg-slate-200">
              <img 
                src={getDisplayImage(room)}
                alt={room.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                
              />
              
              <div className="absolute top-3 right-3">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                  room.available ? "bg-blue-600/90 text-white" : "bg-rose-600/90 text-white"
                }`}>
                  {room.available ? <CheckCircle size={12}/> : <Ban size={12}/>}
                  {room.available ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                       room.available ? "text-blue-600 bg-blue-50" : "text-slate-500 bg-slate-100"
                   }`}>
                      {room.room_type || room.type}
                   </span>
                   <h3 className="text-lg font-bold text-slate-800 mt-2 leading-tight">{room.name}</h3>
                </div>
              </div>

              <div className="space-y-2 mt-2 mb-6">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{room.building} Building</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Users size={16} className="text-slate-400" />
                  <span>Capacity: {room.capacity}</span>
                </div>
              </div>

              {/* ACTIONS FOOTER */}
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${room.available ? 'bg-blue-600' : 'bg-rose-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${room.available ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <input type="checkbox" className="hidden" checked={room.available} onChange={() => changeAvailability(room._id)} />
                  <span className={`text-xs font-bold transition-colors ${room.available ? "text-blue-600" : "text-rose-500"}`}>
                    {room.available ? "Available" : "Unavailable"}
                  </span>
                </label>

                <div className="flex gap-2">
                  <button onClick={() => handleEdit(room)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Details">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => deleteRoom(room._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Room">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5">
             <AddRoom
                editRoom={editingRoom}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                  handleRefresh();
                  setShowModal(false);
                }}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsList;