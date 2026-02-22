import React, { useContext, useState, useEffect, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  UploadCloud,
  X,
  Sparkles,
  ChevronDown,
  Trash2,
  Plus,
  Building2,
  BedSingle,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertCircle,
  Layout,
  Users,
  Edit3,
  Check,
  Lock,
  Image as ImageIcon
} from "lucide-react";

/**
 * Enhanced AddRoom Component
 * Includes: 6-image limit validation, hidden scrollbars, pinned footer button,
 * and inline management of buildings and room types with Show More/Less limit of 3.
 */
const AddRoom = ({ onSuccess, onClose, editRoom }) => {
  const { 
    backendUrl, 
    aToken, 
    buildings, 
    getBuildings, 
    roomTypes, 
    getRoomTypes 
  } = useContext(AdminContext);

  // --- FORM STATE ---
  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState(""); // State for password
  const [roomType, setRoomType] = useState("");
  const [building, setBuilding] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [currentAmenity, setCurrentAmenity] = useState("");
  const [loading, setLoading] = useState(false);

  // --- DROPDOWN & MANAGEMENT STATE ---
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  
  // States for Show More/Less logic
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  
  const [isAddingNewBuilding, setIsAddingNewBuilding] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState(null); 
  const [tempBuildingName, setTempBuildingName] = useState("");

  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [tempTypeName, setTempTypeName] = useState("");

  const buildingRef = useRef(null);
  const typeRef = useRef(null);

  // --- CUSTOM STYLES TO HIDE SCROLLBARS ---
  const scrollbarHideStyle = {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    WebkitScrollbar: 'none',
  };

  // --- INITIALIZATION & CLICK OUTSIDE ---
  useEffect(() => {
    getBuildings();
    getRoomTypes();
    
    if (editRoom) {
      setName(editRoom.name);
      setPassword(editRoom.password || ""); // Initialize password if editing
      setRoomType(editRoom.room_type);
      setBuilding(editRoom.building);
      setCapacity(editRoom.capacity);
      setDescription(editRoom.description);
      setAmenities(editRoom.amenities || []);
      setExistingImages(editRoom.images || []);
    }

    const handleClickOutside = (event) => {
      if (buildingRef.current && !buildingRef.current.contains(event.target)) {
        setShowBuildingDropdown(false);
        resetBuildingStates();
      }
      if (typeRef.current && !typeRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
        resetTypeStates();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editRoom, aToken]);

  // ==============================
  // 🏢 BUILDING CRUD HANDLERS
  // ==============================
  const handleSaveBuilding = async () => {
    if (!tempBuildingName.trim()) return toast.warn("Name cannot be empty");
    try {
      let response;
      if (editingBuildingId) {
        response = await axios.post(`${backendUrl}/api/admin/update-building`, { id: editingBuildingId, name: tempBuildingName }, { headers: { token: aToken } });
      } else {
        response = await axios.post(`${backendUrl}/api/admin/add-building`, { name: tempBuildingName }, { headers: { token: aToken } });
      }
      if (response.data.success) {
        toast.success("Building updated");
        await getBuildings();
        resetBuildingStates();
      }
    } catch (error) { toast.error("Building operation failed"); }
  };

  const handleDeleteBuilding = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete building? This may affect existing rooms.")) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/delete-building`, { id }, { headers: { token: aToken } });
      if (data.success) {
        toast.success("Removed");
        getBuildings();
        if (building === buildings.find(b => b._id === id)?.name) setBuilding("");
      }
    } catch (error) { toast.error("Delete failed"); }
  };

  const resetBuildingStates = () => { 
    setIsAddingNewBuilding(false); 
    setEditingBuildingId(null); 
    setTempBuildingName(""); 
    setShowAllBuildings(false);
  };

  // ==============================
  // 🏷️ ROOM TYPE CRUD HANDLERS
  // ==============================
  const handleSaveType = async () => {
    if (!tempTypeName.trim()) return toast.warn("Type name required");
    try {
      let response;
      if (editingTypeId) {
        response = await axios.post(`${backendUrl}/api/admin/update-room-type`, { id: editingTypeId, name: tempTypeName }, { headers: { token: aToken } });
      } else {
        response = await axios.post(`${backendUrl}/api/admin/add-room-type`, { name: tempTypeName }, { headers: { token: aToken } });
      }
      if (response.data.success) {
        toast.success("Category updated");
        await getRoomTypes();
        resetTypeStates();
      }
    } catch (error) { toast.error("Operation failed"); }
  };

  const handleDeleteType = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete room type? This may affect existing rooms.")) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/delete-room-type`, { id }, { headers: { token: aToken } });
      if (data.success) {
        toast.success("Removed");
        getRoomTypes();
        if (roomType === roomTypes.find(t => t._id === id)?.name) setRoomType("");
      }
    } catch (error) { toast.error("Delete failed"); }
  };

  const resetTypeStates = () => { 
    setIsAddingNewType(false); 
    setEditingTypeId(null); 
    setTempTypeName(""); 
    setShowAllTypes(false);
  };

  // ==============================
  // 📸 IMAGE VALIDATION & HANDLERS
  // ==============================
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const totalCurrent = files.length + existingImages.length;
    
    if (totalCurrent + selectedFiles.length > 6) {
      return toast.error("Strict Limit: You can only have 6 images total per room.");
    }
    
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingImage = (index) => setExistingImages((prev) => prev.filter((_, i) => i !== index));

  const addAmenity = (e) => {
    if (e) e.preventDefault();
    const clean = currentAmenity.trim();
    if (clean && !amenities.includes(clean)) {
      setAmenities([...amenities, clean]);
      setCurrentAmenity("");
    }
  };

  const removeAmenity = (index) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  // ==============================
  // 🚀 SUBMISSION WITH VALIDATION
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Validations
    if (!name || !capacity || !description) return toast.error("Please fill in all basic fields");
    if (!building) return toast.error("Please select or add a building");
    if (!roomType) return toast.error("Please select a room category");
    if ((files.length + existingImages.length) === 0) return toast.error("Upload at least one image");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("password", password); // Added Password to submission
      formData.append("room_type", roomType);
      formData.append("building", building);
      formData.append("capacity", capacity);
      formData.append("description", description);
      formData.append("amenities", JSON.stringify(amenities));
      
      files.forEach((file) => formData.append("images", file));

      if (editRoom) {
        formData.append("roomId", editRoom._id);
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      const url = editRoom ? `${backendUrl}/api/admin/update-room` : `${backendUrl}/api/admin/add-room`;
      const { data } = await axios.post(url, formData, { headers: { token: aToken } });

      if (data.success) {
        toast.success(editRoom ? "Room updated successfully" : "Room added successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Server error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
        
        {/* FIXED HEADER */}
        <div className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              {editRoom ? <Sparkles size={22} /> : <Plus size={22} />}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                {editRoom ? "Update Room" : "Add New Room"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 hover:text-rose-500 text-slate-300 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA (Scrollbar Hidden) */}
        <div 
          className="flex-1 overflow-y-auto bg-slate-50/30"
          style={scrollbarHideStyle}
        >
          <form id="room-form" onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
             {/* LEFT: MEDIA & VISUALS */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-slate-400" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Gallery</h3>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      (files.length + existingImages.length) >= 6 
                      ? 'bg-rose-50 text-rose-500 border-rose-100' 
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {files.length + existingImages.length} / 6 LIMIT
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(files.length + existingImages.length) < 6 && (
                      <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group order-first">
                        <UploadCloud size={24} className="text-slate-300 group-hover:text-blue-500 mb-1" />
                        <span className="text-[8px] font-black text-slate-400 uppercase">Upload</span>
                        <input type="file" onChange={handleFileChange} multiple hidden accept="image/*" />
                      </label>
                    )}

                    {existingImages.map((url, index) => (
                      <div key={`ex-${index}`} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={url} className="w-full h-full object-cover" alt="room" />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button" 
                            onClick={() => removeExistingImage(index)} 
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-md hover:bg-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {files.map((file, index) => (
                      <div key={`new-${index}`} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-blue-100">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="upload" />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button" 
                            onClick={() => removeFile(index)} 
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-md hover:bg-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AMENITIES SECTION WITH PROFILE ICON (Users) */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} className="text-blue-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Amenities</h3>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      value={currentAmenity} 
                      onChange={(e) => setCurrentAmenity(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAmenity(e)}
                      placeholder="e.g. Free Wi-Fi" 
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
                    />
                    <button type="button" onClick={addAmenity} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">
                        {item}
                        <button type="button" onClick={() => removeAmenity(idx)} className="text-blue-400 hover:text-rose-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                
              </div>

              {/* RIGHT: CONFIGURATION */}
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Diamond Executive Suite"
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Capacity</label>
                    <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required min="1" placeholder="0"
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ROOM TYPE DROPDOWN */}
                <div className="relative" ref={typeRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Type</label>
                  <button type="button" onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                    <span className="flex items-center gap-2"><BedSingle size={16} className="text-amber-500" /> {roomType || "Select Type"}</span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${showTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showTypeDropdown && (
                    <div className="absolute z-30 top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="flex flex-col">
                        <div className="max-h-48 overflow-y-auto no-scrollbar" style={scrollbarHideStyle}>
                          {roomTypes.slice(0, showAllTypes ? roomTypes.length : 3).map((t) => (
                            <div key={t._id} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer">
                              <span onClick={() => { setRoomType(t.name); setShowTypeDropdown(false); }} className="flex-1 text-sm font-bold text-slate-600">{t.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => { setEditingTypeId(t._id); setTempTypeName(t.name); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                                <button type="button" onClick={(e) => handleDeleteType(e, t._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {roomTypes.length > 3 && (
                          <button type="button" onClick={() => setShowAllTypes(!showAllTypes)} className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-amber-500 border-t border-slate-50 transition-colors">
                            {showAllTypes ? "Show Less" : `+ View ${roomTypes.length - 3} More`}
                          </button>
                        )}

                        {(isAddingNewType || editingTypeId) ? (
                          <div className="p-4 bg-slate-50 space-y-3 border-t">
                            <input autoFocus value={tempTypeName} onChange={(e)=>setTempTypeName(e.target.value)} placeholder="Category name..." className="w-full px-3 py-2 border rounded-xl text-sm font-bold outline-none focus:border-amber-500" />
                            <div className="flex gap-2">
                              <button type="button" onClick={handleSaveType} className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase">Save</button>
                              <button type="button" onClick={resetTypeStates} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setIsAddingNewType(true)} className="w-full p-4 bg-slate-50 text-amber-600 text-[9px] font-black uppercase border-t hover:bg-amber-50">
                            + Add Room Type
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  {/* BUILDING DROPDOWN */}
                  <div className="relative" ref={buildingRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building</label>
                    <button type="button" onClick={() => setShowBuildingDropdown(!showBuildingDropdown)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                      <span className="flex items-center gap-2"><Building2 size={16} className="text-blue-500" /> {building || "Select Building"}</span>
                      <ChevronDown size={18} className={`transition-transform duration-300 ${showBuildingDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showBuildingDropdown && (
                      <div className="absolute z-30 top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex flex-col">
                          <div className="max-h-48 overflow-y-auto no-scrollbar" style={scrollbarHideStyle}>
                            {buildings.slice(0, showAllBuildings ? buildings.length : 3).map((b) => (
                              <div key={b._id} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                <span onClick={() => { setBuilding(b.name); setShowBuildingDropdown(false); }} className="flex-1 text-sm font-bold text-slate-600">{b.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => { setEditingBuildingId(b._id); setTempBuildingName(b.name); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                                  <button type="button" onClick={(e) => handleDeleteBuilding(e, b._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {buildings.length > 3 && (
                            <button type="button" onClick={() => setShowAllBuildings(!showAllBuildings)} className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 border-t border-slate-50 transition-colors">
                              {showAllBuildings ? "Show Less" : `+ View ${buildings.length - 3} More`}
                            </button>
                          )}

                          {(isAddingNewBuilding || editingBuildingId) ? (
                            <div className="p-4 bg-slate-50 space-y-3 border-t">
                              <input autoFocus value={tempBuildingName} onChange={(e)=>setTempBuildingName(e.target.value)} placeholder="Building name..." className="w-full px-3 py-2 border rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                              <div className="flex gap-2">
                                <button type="button" onClick={handleSaveBuilding} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Save</button>
                                <button type="button" onClick={resetBuildingStates} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setIsAddingNewBuilding(true)} className="w-full p-4 bg-slate-50 text-blue-600 text-[9px] font-black uppercase border-t hover:bg-blue-50 transition-colors">
                              + Add Building
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Description</label>
                  <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe the ambiance, view, and specific features..."
                    style={scrollbarHideStyle}
                    className="w-full px-6 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-medium leading-relaxed outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 resize-none" />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* FIXED FOOTER */}
        <div className="px-6 md:px-10 py-5 border-t border-slate-100 bg-white/90 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4 z-40">
          <div className="flex items-center gap-3 text-slate-400">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Room Management</span>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button type="button" onClick={onClose} 
              className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button form="room-form" disabled={loading} 
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all disabled:opacity-50 active:scale-95">
              {loading ? <RotateCcw className="animate-spin" size={18} /> : (editRoom ? "Update" : "Create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRoom;