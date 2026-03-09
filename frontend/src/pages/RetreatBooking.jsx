import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { toast } from "react-toastify";
import {
    ArrowLeft, Calendar, User, Package, CheckCircle,
    Trash2, Image as ImageIcon, Building2, Users,
    Utensils, Wind, Tag, ChevronDown, ChevronUp, Info
} from "lucide-react";

const RetreatBooking = () => {
    const { backendUrl, token, selectedRooms, addRoom, removeRoom, clearRooms, currencySymbol } = useContext(AppContext);
    const navigate = useNavigate();
    const [venueParticipants, setVenueParticipants] = useState("");


    // --- 1. STATE VARIABLES ---
    const [bookingName, setBookingName] = useState("");
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    // Load participants and packages from sessionStorage
    const [roomParticipants, setRoomParticipants] = useState(() => {
        const saved = sessionStorage.getItem("draftRoomParticipants");
        return saved ? JSON.parse(saved) : {};
    });

    // ✅ NEW: Tracks which package is selected for each specific room
    const [roomPackages, setRoomPackages] = useState(() => {
        const saved = sessionStorage.getItem("draftRoomPackages");
        return saved ? JSON.parse(saved) : {};
    });

    const [showAllRooms, setShowAllRooms] = useState(false);
    const [dbPackages, setDbPackages] = useState([]);
    const [roomUnavailableDates, setRoomUnavailableDates] = useState([]);
    const [userBookedDates, setUserBookedDates] = useState([]);
    const [capacityError, setCapacityError] = useState({});
    const [selectedPackages, setSelectedPackages] = useState({});

    // Save session state
    useEffect(() => {
        sessionStorage.setItem("draftRoomParticipants", JSON.stringify(roomParticipants));
    }, [roomParticipants]);

    useEffect(() => {
        sessionStorage.setItem("draftRoomPackages", JSON.stringify(roomPackages));
    }, [roomPackages]);

    const handleSelectPackage = (pkg) => {

        const type = (pkg.packageType || "").toLowerCase();

        setSelectedPackages(prev => {

            // ---------- AMENITIES (MULTIPLE) ----------
            if (type === "amenity") {

                const current = prev[type] || [];

                if (current.includes(pkg._id)) {
                    return {
                        ...prev,
                        [type]: current.filter(id => id !== pkg._id)
                    };
                }

                return {
                    ...prev,
                    [type]: [...current, pkg._id]
                };
            }

            // ---------- OTHER PACKAGE TYPES (ONLY ONE) ----------
            if (prev[type] === pkg._id) {

                const copy = { ...prev };
                delete copy[type];
                return copy;

            }

            return {
                ...prev,
                [type]: pkg._id
            };

        });

    };

    // --- 2. FETCH PACKAGES FROM API ---
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const { data } = await axios.get(backendUrl + '/api/package/list');
                if (data.success) {
                    setDbPackages(data.packages);
                }
            } catch (error) {
                console.error("Error fetching packages", error);
                toast.error("Could not load packages");
            }
        };
        fetchPackages();
    }, [backendUrl]);

    // ✅ NEW: Initialize default Participants AND Default Packages for newly added rooms
    useEffect(() => {
        setRoomParticipants(prev => {
            const updated = { ...prev };
            selectedRooms.forEach(room => {
                if (!updated[room._id]) {
                    const isDorm = room.room_type?.toLowerCase().includes("dorm");
                    updated[room._id] = isDorm ? 3 : 1;
                }
            });
            return updated;
        });

        setRoomPackages(prev => {
            const updated = { ...prev };
            let changed = false;
            selectedRooms.forEach(room => {
                if (!updated[room._id]) {
                    // Find packages that match this room's type
                    const availablePkgs = dbPackages.filter(pkg => pkg.roomType?.name?.toLowerCase() === room.room_type?.toLowerCase());
                    if (availablePkgs.length > 0) {
                        updated[room._id] = availablePkgs[0]._id; // Default to the first available package
                        changed = true;
                    }
                }
            });
            return changed ? updated : prev;
        });
    }, [selectedRooms, dbPackages]);

    const getTotalParticipants = () => {

        if (selectedRooms.length === 0) {
            return Number(venueParticipants) || 0;
        }

        return selectedRooms.reduce(
            (sum, room) => sum + Number(roomParticipants[room._id] || 0),
            0
        );

    };

    // --- 4. HELPERS ---
    const toDateObj = (dateString) => {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getRoomImage = (room) => {
        if (!room) return null;
        if (room.cover_image) return room.cover_image;
        if (Array.isArray(room.images) && room.images.length > 0) return room.images[0];
        return room.image_url || (Array.isArray(room.image) ? room.image[0] : room.image);
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http")) return imagePath;
        return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
    };

    const getPrice = (priceVal) => Number(priceVal?.$numberDecimal || priceVal || 0);

    // --- 5. AVAILABILITY CHECKS ---
    useEffect(() => {
        if (token) fetchUserBookedDates();
        fetchRoomUnavailableDates();
        // eslint-disable-next-line
    }, [token, selectedRooms]);

    const fetchRoomUnavailableDates = async () => {
        if (selectedRooms.length === 0) return;
        try {
            const { data } = await axios.post(backendUrl + "/api/booking/unavailable-dates", {
                roomIds: selectedRooms.map(r => r._id)
            });
            if (data.success) setRoomUnavailableDates(data.blockedDates.map(toDateObj));
        } catch (error) { console.error(error); }
    };

    const fetchUserBookedDates = async () => {
        try {
            const { data } = await axios.get(backendUrl + "/api/booking/user-dates", { headers: { token } });
            if (data.success) setUserBookedDates(data.userBusyDates.map(toDateObj));
        } catch (error) { console.error(error); }
    };

    const handleRemoveRoom = (roomId) => {
        if (removeRoom) {
            removeRoom(roomId);
            setRoomParticipants(prev => { const updated = { ...prev }; delete updated[roomId]; return updated; });
            setRoomPackages(prev => { const updated = { ...prev }; delete updated[roomId]; return updated; }); // Clear package memory
            toast.info("Room removed");
        }
    };

    const allBlockedDates = [...roomUnavailableDates, ...userBookedDates];

    const getDayClass = (date) => {
        const time = date.getTime();
        if (userBookedDates.some(d => d.getTime() === time)) return "my-booking-date";
        if (roomUnavailableDates.some(d => d.getTime() === time)) return "room-taken-date";
        return "available-date";
    };

    const getDuration = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (start.getTime() === end.getTime()) return 1;
        return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    };

    const isSameDayBooking = startDate && endDate && toDateObj(startDate).getTime() === toDateObj(endDate).getTime();

    // --- 6. CALCULATION LOGIC ---
    // ✅ FIXED: Calculates total dynamically based on EACH room's assigned package
    const calculateTotal = () => {

        const days = Math.max(getDuration(), 1);
        let total = 0;

        // Room packages
        selectedRooms.forEach(room => {

            const pax = roomParticipants[room._id] || 0;
            const pkgId = roomPackages[room._id];

            if (pkgId) {
                const pkg = dbPackages.find(p => p._id === pkgId);
                if (pkg) {
                    total += pax * getPrice(pkg.price) * days;
                }
            }

        });

        // Extra packages
        Object.values(selectedPackages).forEach(pkgId => {

            if (Array.isArray(pkgId)) {

                pkgId.forEach(id => {
                    const pkg = dbPackages.find(p => p._id === id);
                    if (pkg) total += getPrice(pkg.price) * getTotalParticipants() * days;
                });

            } else {

                const pkg = dbPackages.find(p => p._id === pkgId);
                if (pkg) total += getPrice(pkg.price) * getTotalParticipants() * days;

            }

        });

        return total;

    };

    const handleProceed = async () => {
        if (!startDate || !endDate) return toast.error("Please select dates.");
        if (!token) { toast.error("Please login first."); navigate("/login"); return; }
        if (!bookingName.trim()) return toast.error("Please enter an Event Name.");
        if (selectedRooms.length === 0 && Number(venueParticipants) <= 0) {
            return toast.error("Please enter venue participants.");
        }

        for (const room of selectedRooms) {
            if (!roomPackages[room._id]) {
                toast.error(`Please select a package for ${room.name}.`);
                return;
            }
            const isDorm = room.room_type?.toLowerCase().includes("dorm");
            const minPax = isDorm ? 3 : 1;
            const assignedPax = Number(roomParticipants[room._id]) || 0;
            if (assignedPax < minPax) {
                toast.error(`Minimum participants for ${room.name} is ${minPax}.`);
                return;
            }
        }

        try {
            const bookingPayload = {
                bookingName,
                room_ids: selectedRooms.map(r => r._id),
                check_in: startDate,
                check_out: endDate,

                bookingItems: selectedRooms.map(room => ({
                    room_id: room._id,
                    participants: Number(roomParticipants[room._id]) || 1,
                    package_id: roomPackages[room._id]
                })),

                extra_packages: Object.values(selectedPackages).flat()
            };

            const { data } = await axios.post(backendUrl + "/api/booking/create", bookingPayload, { headers: { token } });

            if (data.success) {
                toast.success("Booking request sent!");
                setStartDate(null); setEndDate(null); setRoomParticipants({}); setRoomPackages({}); setBookingName("");
                sessionStorage.removeItem("draftRoomParticipants");
                sessionStorage.removeItem("draftRoomPackages");
                if (clearRooms) clearRooms();
                navigate("/my-bookings");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Booking failed");
        }
    };

    const handleAutoRoomSelection = async () => {

        const participants = Number(venueParticipants);

        if (!participants || participants <= 0) {
            return toast.error("Enter venue participants first.");
        }

        try {
            const { data } = await axios.get(backendUrl + "/api/room/list");
            if (!data.success) return;

            clearRooms();
            let remaining = participants;
            const sortedRooms = [...data.rooms].sort((a, b) => b.capacity - a.capacity);
            const selected = [];

            for (const room of sortedRooms) {
                if (remaining <= 0) break;
                if (selectedRooms.some(r => r._id === room._id)) continue;
                const capacity = Number(room.capacity);
                if (room.room_type?.toLowerCase().includes("dorm") && remaining < 3) continue;
                selected.push(room);
                remaining -= capacity;
            }

            if (selected.length === 0) return toast.error("No suitable rooms found");

            let remainingPax = participants;
            const newParticipantsObj = {};

            selected.forEach(room => {
                addRoom(room);
                const capacity = Number(room.capacity);
                const assigned = Math.min(capacity, remainingPax);
                newParticipantsObj[room._id] = assigned;
                remainingPax -= assigned;
            });

            setRoomParticipants(newParticipantsObj);
            toast.success("Rooms auto selected");
        } catch (error) {
            console.log(error);
            toast.error("Error selecting rooms");
        }
    };

    const isInvalidBookingState =
        !bookingName.trim() ||
        !startDate ||
        !endDate ||
        (selectedRooms.length === 0 && venueParticipants <= 0) ||
        (isSameDayBooking && selectedRooms.length > 0) ||
        selectedRooms.some(room => !roomPackages[room._id]);

    // Get unique package IDs currently in use to display in Step 3
    const uniqueSelectedPackageIds = [
        ...new Set([
            ...Object.values(roomPackages),
            ...Object.values(selectedPackages).flat()
        ].filter(Boolean))
    ];

    // Packages WITHOUT room types (for Step 3)

    // --- PACKAGE INCLUSION DISPLAY LOGIC ---

    const hasRooms = selectedRooms.length > 0;

    const isSameDay =
        startDate &&
        endDate &&
        new Date(startDate).toDateString() === new Date(endDate).toDateString();

    // Venue packages
    const venuePackages = dbPackages.filter(
        pkg => pkg.packageType?.toLowerCase() === "venue package"
    );

    // Other packages except room package
    const otherPackages = dbPackages.filter(
        pkg => pkg.packageType?.toLowerCase() !== "room package"
    );

    let displayPackages = [];

    if (hasRooms) {

        // Rooms booked → hide venue packages
        displayPackages = otherPackages.filter(
            pkg => pkg.packageType?.toLowerCase() !== "venue package"
        );

    } else if (isSameDay) {

        // Same day + no rooms → show venue + other packages
        displayPackages = [
            ...venuePackages,
            ...otherPackages.filter(
                pkg => pkg.packageType?.toLowerCase() !== "venue package"
            )
        ];

    } else {

        // Default case
        displayPackages = otherPackages.filter(
            pkg => pkg.packageType?.toLowerCase() !== "venue package"
        );

    }

    return (
        <div className="min-h-screen bg-slate-50 pt-8 pb-20 font-sans text-slate-900">
            <style>{`
                .react-datepicker-wrapper { width: 100%; }
                .react-datepicker { font-family: inherit; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: none; overflow: hidden; }
                .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; }
                .react-datepicker__day--disabled { opacity: 0.3; background-color: #e2e8f0; color: #94a3b8; cursor: not-allowed; text-decoration: line-through; }
                .my-booking-date { background-color: #dbeafe !important; color: #2563eb !important; font-weight: bold; position: relative; }
                .my-booking-date::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background-color: #2563eb; border-radius: 50%; }
                .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: #0f172a !important; color: white !important; }
                .custom-input { width: 100%; padding: 12px 16px 12px 42px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 600; color: #334155; outline: none; transition: all 0.2s; background: white; }
                .custom-input:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05); }
            `}</style>

            <div className="max-w-6xl mx-auto mb-8 px-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-700" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Complete Your Booking</h1>
            </div>

            <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">

                    {/* 1. DATES & PEOPLE */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">1</span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Event Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Event Name / Group Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Tag size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <input type="text" value={bookingName} onChange={(e) => setBookingName(e.target.value)} className="custom-input" placeholder="e.g. HNU Retreat, Family Reunion, Youth Camp..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-in Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} minDate={new Date()} excludeDates={allBlockedDates} dayClassName={getDayClass} placeholderText="Select Date" className="custom-input" dateFormat="MM/dd/yyyy" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-out Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
                                    <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate || new Date()} excludeDates={allBlockedDates} dayClassName={getDayClass} placeholderText="Select Date" className="custom-input" dateFormat="MM/dd/yyyy" />
                                </div>
                            </div>

                            <div className="md:col-span-1 max-w-xs"> {/* Restricted width to shorten length */}
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Participants
                                    </label>
                                    {/* Compact Total Display as a Badge */}
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        Total: {getTotalParticipants()}
                                    </span>
                                </div>

                                <div className="group flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-slate-900 transition-all shadow-sm">
                                    {/* Icon Prefix */}
                                    <div className="pl-4 pr-2 text-slate-400 group-focus-within:text-slate-900">
                                        <User size={16} />
                                    </div>

                                    {selectedRooms.length === 0 ? (
                                        <input
                                            type="number"
                                            min="1"
                                            value={venueParticipants}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "" || Number(value) >= 0) setVenueParticipants(value);
                                            }}
                                            onKeyDown={(e) => ["-", "e"].includes(e.key) && e.preventDefault()}
                                            className="w-full py-2.5 pr-4 text-sm outline-none text-slate-700 font-bold bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                                            placeholder="0"
                                        />
                                    ) : (
                                        <div className="py-2.5 pr-4 text-sm font-bold text-slate-400 italic">
                                            Rooms Selected
                                        </div>
                                    )}
                                </div>

                                <p className="text-[9px] leading-tight text-slate-400 mt-2 ml-1">
                                    Enter count to auto-assign or add rooms manually.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. ROOMS & PACKAGES */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">

                        {/* Auto Room Selection */}


                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">2</span>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Rooms & Packages</h2>
                            </div>
                            <div className="flex items-center gap-3">

                                {Number(venueParticipants) > 0 && selectedRooms.length === 0 && !isSameDayBooking && (
                                    <button
                                        onClick={handleAutoRoomSelection}
                                        className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200"
                                    >

                                        Auto Select
                                    </button>
                                )}

                                {selectedRooms.length > 0 && (
                                    <button
                                        onClick={() => {
                                            clearRooms();
                                            setRoomParticipants({});
                                            setRoomPackages({});
                                            toast.info("All rooms removed");
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-tight transition-colors"
                                    >
                                        Remove All
                                    </button>
                                )}

                                {selectedRooms.length > 0 && !isSameDayBooking && (
                                    <button
                                        onClick={() => navigate('/rooms')}
                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                                    >
                                        <span className="text-sm">+</span> Add Another Room
                                    </button>
                                )}

                            </div>
                        </div>

                        {selectedRooms.length === 0 ? (
                            <div className={`p-4 rounded-xl border border-dashed flex flex-row items-center justify-between gap-4 ${isSameDayBooking ? "bg-slate-100 border-slate-300" : "bg-slate-50 border-slate-200"}`}>
                                <p className={`text-sm font-medium ml-2 ${isSameDayBooking ? "text-slate-400" : "text-slate-500"}`}>
                                    {isSameDayBooking ? "Rooms are not available for same-day events." : "No accommodation selected."}
                                </p>
                                <button onClick={() => { if (!isSameDayBooking) navigate('/rooms') }} disabled={isSameDayBooking} className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors ${isSameDayBooking ? "bg-slate-200 text-slate-400 cursor-not-allowed border-transparent" : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-100"}`}>+ Add Room</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isSameDayBooking && (
                                    <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
                                        ⚠️ {selectedRooms.length === 1 ? "A room" : "Rooms"} cannot be booked for same-day events. Please adjust dates.
                                    </div>
                                )}
                                {selectedRooms.slice(0, showAllRooms ? selectedRooms.length : 3).map((room) => {
                                    const fullImageUrl = getImageUrl(getRoomImage(room));
                                    const capacity = Number(room.capacity) || 0;
                                    const isDorm = room.room_type?.toLowerCase().includes("dorm");
                                    const minPax = isDorm ? 3 : 1;

                                    // Available packages for this specific room
                                    const availablePkgs = dbPackages.filter(pkg => pkg.roomType?.name?.toLowerCase() === room.room_type?.toLowerCase());

                                    return (
                                        <div key={room._id} className={`group flex flex-col sm:flex-row gap-4 p-4 bg-white border rounded-xl transition-all duration-300 ${isSameDayBooking ? "border-red-200 opacity-50 grayscale" : "border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300"}`}>
                                            {/* Left: Image & Room Details */}
                                            <div className="flex gap-4 flex-1">
                                                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                                                    {fullImageUrl ? (
                                                        <img src={fullImageUrl} alt="Room" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=No+Img" }} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left relative">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h4 className="font-bold text-slate-900 text-base leading-none pr-6">{room.name}</h4>
                                                        <button onClick={() => handleRemoveRoom(room._id)} className="absolute top-0 right-0 text-slate-400 hover:text-red-500 p-1 bg-white hover:bg-red-50 rounded-lg transition-all" title="Remove Room">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wide mb-2 flex items-center gap-2">
                                                        {room.room_type} {room.building && <span>• {room.building}</span>}
                                                    </p>
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                                                        <Users size={10} /> Max {capacity} {capacity === 1 ? "Person" : "People"}
                                                    </div>

                                                    {/* ✅ NEW: Inline Participants & Package Form */}
                                                    <div className="mt-4 flex flex-col sm:flex-row gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                                        <div className="w-full sm:w-1/3">
                                                            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Participants (Min {minPax})</label>
                                                            <input
                                                                type="number"
                                                                min={minPax}
                                                                max={capacity}
                                                                value={roomParticipants[room._id] ?? ""}
                                                                onChange={(e) => {
                                                                    let value = e.target.value;
                                                                    if (value === "") { setRoomParticipants(prev => ({ ...prev, [room._id]: "" })); setCapacityError(prev => ({ ...prev, [room._id]: "" })); return; }
                                                                    value = Number(value);
                                                                    if (value > capacity) { setCapacityError(prev => ({ ...prev, [room._id]: `Max is ${capacity}` })); value = capacity; }
                                                                    else if (value < minPax) { setCapacityError(prev => ({ ...prev, [room._id]: `Min is ${minPax}` })); }
                                                                    else { setCapacityError(prev => ({ ...prev, [room._id]: "" })); }
                                                                    setRoomParticipants(prev => ({ ...prev, [room._id]: value }));
                                                                }}
                                                                className={`w-full border rounded-md px-2 py-1.5 text-xs font-semibold ${capacityError[room._id] ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200'}`}
                                                            />
                                                        </div>
                                                        <div className="w-full sm:w-2/3">
                                                            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Assigned Package</label>
                                                            <div className="relative">
                                                                <Package size={14} className="absolute left-2.5 top-2 text-blue-500 z-10" />
                                                                <select
                                                                    value={roomPackages[room._id] || ""}
                                                                    onChange={(e) => setRoomPackages(prev => ({ ...prev, [room._id]: e.target.value }))}
                                                                    className={`w-full border rounded-md pl-8 pr-2 py-1.5 text-xs font-semibold appearance-none bg-white ${!roomPackages[room._id] ? 'border-red-400 ring-1 ring-red-400' : 'border-blue-200'}`}
                                                                >
                                                                    {availablePkgs.length === 0 ? (
                                                                        <option value="" disabled>No packages for this room type</option>
                                                                    ) : (
                                                                        <>
                                                                            <option value="" disabled>Select a package...</option>
                                                                            {availablePkgs.map(pkg => (
                                                                                <option key={pkg._id} value={pkg._id}>
                                                                                    {pkg.name} (+{currencySymbol}{getPrice(pkg.price)}/pax)
                                                                                </option>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {capacityError[room._id] && <p className="text-[10px] text-red-500 mt-1 font-semibold">⚠ {capacityError[room._id]}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {selectedRooms.length > 3 && (
                                    <button onClick={() => setShowAllRooms(!showAllRooms)} className="w-full py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-tighter bg-slate-50 rounded-lg">
                                        {showAllRooms ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show All Rooms ({selectedRooms.length})</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. PACKAGE DETAILS (Informational) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">3</span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Package Inclusions</h2>
                        </div>

                        {displayPackages.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Info size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-xs font-medium text-slate-500">Select rooms and assign packages above to see their inclusions here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayPackages.map((pkg) => {
                                    const type = pkg.packageType?.toLowerCase();

                                    const isSelected =
                                        type === "amenity"
                                            ? (selectedPackages[type] || []).includes(pkg._id)
                                            : selectedPackages[type] === pkg._id;
                                    if (!pkg) return null;
                                    const pkgPrice = getPrice(pkg.price);


                                    return (
                                        <div
                                            key={pkg._id}
                                            onClick={() => handleSelectPackage(pkg)}
                                            className={`border rounded-xl p-5 relative flex flex-col h-full shadow-sm cursor-pointer transition
  ${isSelected
                                                    ? "border-green-500 bg-green-50"
                                                    : "border-blue-100 bg-blue-50/20 hover:border-blue-400"}
`}
                                        >
                                            {isSelected && (
                                                <CheckCircle size={14} className="absolute top-2 right-2 text-green-500" />
                                            )}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Package size={18} /></div>
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 mb-1">{pkg.name}</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-grow">{pkg.description || "No description provided."}</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {pkg.amenities?.length > 0 ? (
                                                    pkg.amenities.map((amenity, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 uppercase"
                                                        >
                                                            {amenity}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">
                                                        No amenities
                                                    </span>
                                                )}
                                            </div>
                                            <div className="pt-3 border-t border-slate-200 mt-auto">
                                                <p className="font-bold text-slate-900 text-sm">
                                                    {pkgPrice === 0 ? "Free / Included" : `+${currencySymbol}${pkgPrice}`}
                                                    {pkgPrice > 0 && <span className="text-xs text-slate-400 font-medium"> /pax/day</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT: SUMMARY --- */}
                <div className="w-full lg:w-96">
                    <div className="sticky top-6 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Booking Summary</h3>
                        {bookingName && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Event Name</p>
                                <p className="text-sm font-bold text-blue-900 break-words">{bookingName}</p>
                            </div>
                        )}
                        <div className="space-y-4 text-sm text-slate-600 mb-8">
                            <div className="flex justify-between">
                                <span>Duration</span>
                                <span className="font-bold text-slate-900">{getDuration() > 0 ? getDuration() + " Days" : "--"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Participants</span>
                                <span className="font-bold text-slate-900">{getTotalParticipants()} {getTotalParticipants() === 1 ? "Person" : "People"}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 my-4"></div>
                            <div className="flex justify-between text-xs italic text-slate-400">
                                <span>Rooms</span>
                                <span>{selectedRooms.length > 0 ? `${selectedRooms.length} selected` : "None selected"}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-xs italic text-slate-400">
                                <div className="flex justify-between">
                                    <span>Packages</span>
                                    <span className="text-right truncate max-w-[150px] font-medium text-slate-600">
                                        {uniqueSelectedPackageIds.length > 0
                                            ? uniqueSelectedPackageIds.map(id => dbPackages.find(p => p._id === id)?.name).join(", ")
                                            : "None Selected"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Price</span>
                            <span className="font-extrabold text-3xl text-slate-900">{currencySymbol}{calculateTotal().toLocaleString()}</span>
                        </div>
                        <button onClick={handleProceed} disabled={isInvalidBookingState} className={`w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${isInvalidBookingState ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200 active:scale-[0.98]"}`}>
                            Book Now <CheckCircle size={16} />
                        </button>
                        <div className="text-center mt-4 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            <span className="w-3 h-3 flex items-center justify-center rounded-full border border-slate-300">🔒</span>
                            Secure Checkout
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetreatBooking;