import React, { useContext, useState, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
    UploadCloud,
    X,
    Sparkles,
    ChevronDown,
    Trash2
} from "lucide-react";

const AddRoom = ({ onSuccess, onClose, editRoom }) => {
    const { backendUrl, aToken } = useContext(AdminContext);

    // --- STATE MANAGEMENT ---
    const [files, setFiles] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const [name, setName] = useState("");
    const [roomType, setRoomType] = useState("");
    const [building, setBuilding] = useState("");
    const [capacity, setCapacity] = useState("");
    const [description, setDescription] = useState("");

    const [amenities, setAmenities] = useState([]);
    const [currentAmenity, setCurrentAmenity] = useState("");

    const [loading, setLoading] = useState(false);

    // Dropdown States
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);

    // --- CONSTANTS (Synced with Mongoose Schema) ---
    const typeOptions = ["Individual", "Individual with Pullout", "Dormitory"];
    const buildingOptions = ["Margarita", "Nolasco"];

    // 1. PREFILL DATA (EDIT MODE)
    useEffect(() => {
        if (editRoom) {
            setName(editRoom.name || "");
            // Use room_type primarily to match schema
            setRoomType(editRoom.room_type || editRoom.type || "");
            setBuilding(editRoom.building || "");
            setCapacity(editRoom.capacity || "");
            setDescription(editRoom.description || "");

            let parsedAmenities = [];
            if (editRoom.amenities) {
                if (Array.isArray(editRoom.amenities)) {
                    parsedAmenities = editRoom.amenities;
                } else if (typeof editRoom.amenities === "string") {
                    try {
                        parsedAmenities = JSON.parse(editRoom.amenities);
                    } catch (e) {
                        parsedAmenities = [editRoom.amenities];
                    }
                }
            }
            setAmenities(parsedAmenities);

            if (editRoom.images && Array.isArray(editRoom.images)) {
                setExistingImages(editRoom.images);
            }
        }
    }, [editRoom]);

    // 2. CLEANUP PREVIEW URLS
    useEffect(() => {
        return () => {
            files.forEach(file => URL.revokeObjectURL(file.preview));
        };
    }, [files]);

    // 3. IMAGE HANDLERS
    const handleImageChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []).filter(
            (file) => file && file.size > 0
        );

        if (selectedFiles.length === 0) return;

        if (files.length + selectedFiles.length + existingImages.length > 6) {
            toast.error("Maximum of 6 images total allowed");
            return;
        }

        const withPreview = selectedFiles.map(file =>
            Object.assign(file, { preview: URL.createObjectURL(file) })
        );

        setFiles(prev => [...prev, ...withPreview]);
        e.target.value = "";
    };

    const removeNewFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    // 4. AMENITY HANDLERS
    const handleAmenityKey = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (currentAmenity.trim() && !amenities.includes(currentAmenity.trim())) {
                setAmenities([...amenities, currentAmenity.trim()]);
                setCurrentAmenity("");
            }
        }
    };

    const removeAmenity = (index) => {
        setAmenities(amenities.filter((_, i) => i !== index));
    };

    // 5. SUBMIT HANDLER
    const onSubmitHandler = async (e) => {
        e.preventDefault();

        if (loading) return;
        
        if (files.length === 0 && existingImages.length === 0) {
            return toast.error("At least one room image is required");
        }

        if (!roomType || !building) {
            return toast.error("Please select Room Type and Building");
        }

        setLoading(true);

        try {
            const formData = new FormData();

            // Basic Fields
            formData.append("name", name);
            formData.append("description", description);
            formData.append("room_type", roomType); 
            formData.append("building", building);
            formData.append("capacity", Number(capacity));
            formData.append("amenities", JSON.stringify(amenities));

            // Handle New Images
            files.forEach(file => {
                formData.append("images", file);
            });

            // Handle Existing Images
            formData.append("existingImages", JSON.stringify(existingImages));

            const endpoint = editRoom
                ? `/api/admin/update-room/${editRoom._id}`
                : "/api/admin/add-room";

            const { data } = await axios.post(
                backendUrl + endpoint,
                formData,
                { headers: { token: aToken } }
            );

            if (data.success) {
                toast.success(editRoom ? "Room updated successfully" : "Room added successfully");
                onSuccess();
                onClose();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            toast.error(error.response?.data?.message || "Error submitting form");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white w-full max-w-5xl mx-auto rounded-2xl overflow-hidden flex flex-col h-[90vh]">
            {/* HEADER */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">
                        {editRoom ? "Edit Room Details" : "Add New Room"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {editRoom ? `Updating: ${editRoom.name}` : "Create a listing for Margarita or Nolasco."}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} className="text-slate-50" />
                </button>
            </div>

            {/* BODY */}
            <form id="room-form" onSubmit={onSubmitHandler} className="p-8 flex-1 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* LEFT COLUMN: IMAGES & AMENITIES */}
                    <div className="w-full md:w-5/12 flex flex-col gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Room Images ({files.length + existingImages.length}/6)
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                                    <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-500 mt-1">Add Photo</span>
                                    <input onChange={handleImageChange} type="file" multiple hidden accept="image/*" />
                                </label>

                                {existingImages.map((url, index) => (
                                    <div key={`exist-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={url.startsWith('http') ? url : `${backendUrl}/${url}`} alt="Existing" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={() => removeExistingImage(index)} className="bg-white/90 p-1.5 rounded-full text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {files.map((file, index) => (
                                    <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 ring-2 ring-blue-100 group">
                                        <img src={file.preview} alt="New" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={() => removeNewFile(index)} className="bg-white/90 p-1.5 rounded-full text-red-500">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amenities</label>
                            <div className="relative">
                                <Sparkles className="absolute left-3 top-3 text-slate-400" size={16} />
                                <input
                                    value={currentAmenity}
                                    onChange={(e) => setCurrentAmenity(e.target.value)}
                                    onKeyDown={handleAmenityKey}
                                    placeholder="Type amenity & press Enter..."
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {amenities.map((a, i) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                                        {a}
                                        <button type="button" onClick={() => removeAmenity(i)}><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: DETAILS FORM */}
                    <div className="flex-1 flex flex-col gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Room Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Room 6"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                                <button
                                    type="button"
                                    onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowBuildingDropdown(false); }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center"
                                >
                                    {roomType || "Select Type"}
                                    <ChevronDown size={16} />
                                </button>
                                {showTypeDropdown && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                                        {typeOptions.map((option) => (
                                            <div key={option} onClick={() => { setRoomType(option); setShowTypeDropdown(false); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">
                                                {option}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Building</label>
                                <button
                                    type="button"
                                    onClick={() => { setShowBuildingDropdown(!showBuildingDropdown); setShowTypeDropdown(false); }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex justify-between items-center"
                                >
                                    {building || "Select Building"}
                                    <ChevronDown size={16} />
                                </button>
                                {showBuildingDropdown && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                                        {buildingOptions.map((option) => (
                                            <div key={option} onClick={() => { setBuilding(option); setShowBuildingDropdown(false); }} className="px-4 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-slate-100">
                                                {option}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Capacity (Pax)</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                min="1"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the room layout and floor..."
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
                            />
                        </div>
                    </div>
                </div>
            </form>

            {/* FOOTER */}
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200">
                    Cancel
                </button>
                <button
                    form="room-form"
                    disabled={loading}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"
                >
                    {loading ? "Saving..." : (editRoom ? "Update Room" : "Create Room")}
                </button>
            </div>
        </div>
    );
};

export default AddRoom;