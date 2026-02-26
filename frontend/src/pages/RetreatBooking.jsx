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
  Utensils, Wind, Tag, ChevronDown, ChevronUp 
} from "lucide-react"; 

const RetreatBooking = () => {
  const { backendUrl, token, selectedRooms, removeRoom, clearRooms, currencySymbol } = useContext(AppContext);
  const navigate = useNavigate();

  // --- 1. STATE VARIABLES ---
  const [bookingName, setBookingName] = useState(""); 
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [participants, setParticipants] = useState(1);
  const [selectedPackageId, setSelectedPackageId] = useState(null); 
  
  // New expansion states
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);

  // Database Packages State
  const [dbPackages, setDbPackages] = useState([]);

  // Blocking State
  const [roomUnavailableDates, setRoomUnavailableDates] = useState([]); 
  const [userBookedDates, setUserBookedDates] = useState([]);        

  // --- 2. FETCH PACKAGES FROM API ---
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/package/list'); 
        if (data.success) {
          setDbPackages(data.packages);
          // REMOVED: Auto-setting the first package. selectedPackageId remains null.
        }
      } catch (error) {
        console.error("Error fetching packages", error);
        toast.error("Could not load packages");
      }
    };
    fetchPackages();
  }, [backendUrl]);

  const allPackages = [...dbPackages];

  // --- 3. AUTO-CALCULATE PARTICIPANTS ---
  useEffect(() => {
    const totalCapacity = selectedRooms.reduce((sum, room) => sum + (Number(room.capacity) || 0), 0);
    setParticipants(totalCapacity > 0 ? totalCapacity : 1);
  }, [selectedRooms]);

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

  const getPrice = (priceVal) => {
    return Number(priceVal?.$numberDecimal || priceVal || 0);
  };

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
      if (data.success) {
        setRoomUnavailableDates(data.blockedDates.map(toDateObj));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUserBookedDates = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/booking/user-dates", { headers: { token } });
      if (data.success) {
        setUserBookedDates(data.userBusyDates.map(toDateObj));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveRoom = (roomId) => {
    if (removeRoom) {
        removeRoom(roomId);
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
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    if (start.getTime() === end.getTime()) return 1; 
    const diff = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isSameDayBooking = startDate && endDate && toDateObj(startDate).getTime() === toDateObj(endDate).getTime();

  // --- 6. CALCULATION LOGIC ---
  const calculateTotal = () => {
    const duration = getDuration();
    const days = duration === 0 ? 0 : duration;

    // Room Cost
    const roomTotal = selectedRooms.reduce((acc, r) => acc + getPrice(r.price), 0);
    
    // Package Cost
    const selectedPkg = allPackages.find(p => p._id === selectedPackageId);
    const packagePrice = selectedPkg ? getPrice(selectedPkg.price) : 0;
    const packageTotal = packagePrice * participants * days; 
    
    return (roomTotal * days) + packageTotal;
  };

  const handleProceed = async () => {
    if (!startDate || !endDate) {
        toast.error("Please select dates.");
        return;
    }

    const startTimestamp = new Date(startDate).setHours(0,0,0,0);
    const endTimestamp = new Date(endDate).setHours(0,0,0,0);
    if (startTimestamp === endTimestamp && selectedRooms.length > 0) {
        toast.error("Rooms cannot be booked for a same-day event. Please remove the selected room(s) or adjust your dates.");
        return;
    }

    if (!token) {
        toast.error("Please login to book.");
        navigate('/login');
        return;
    }
    
    // VALIDATION: Ensure package is selected
    if (allPackages.length > 0 && !selectedPackageId) {
       toast.error("Please select a package.");
       return;
    }
    
    if (!bookingName.trim()) {
      toast.error("Please enter an Event Name (e.g. Family Reunion)"); 
      return;
    }

    const totalAmount = calculateTotal();
    const finalPackage = allPackages.find(p => p._id === selectedPackageId);

    try {
        const bookingPayload = {
            bookingName: bookingName, 
            room_ids: selectedRooms.map(r => r._id),
            check_in: startDate,
            check_out: endDate,
            participants: Number(participants),
            package_id: selectedPackageId,
            total_price: totalAmount,
            package_details: finalPackage,
        };

        const { data } = await axios.post(
            backendUrl + '/api/booking/create', 
            bookingPayload, 
            { headers: { token } }
        );

        if (data.success) {
            toast.success("Request Sent!");
            
            setStartDate(null);
            setEndDate(null);
            setParticipants(1);
            setSelectedPackageId(null);
            setBookingName(""); 
            
            if (clearRooms) clearRooms(); 
            
            navigate('/my-bookings'); 
        } else {
            toast.error(data.message);
        }

    } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed.");
    }
  };

  // Helper boolean to cleanly disable the button
  const isInvalidBookingState = (isSameDayBooking && selectedRooms.length > 0) || !selectedPackageId;

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-20 font-sans text-slate-900">
      
      {/* --- CUSTOM CSS --- */}
      <style>{`
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker {
            font-family: inherit; border: 1px solid #e2e8f0; border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: none; overflow: hidden;
        }
        .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; }
        .react-datepicker__day--disabled {
            opacity: 0.3; background-color: #e2e8f0; color: #94a3b8; cursor: not-allowed; text-decoration: line-through;
        }
        .my-booking-date {
            background-color: #dbeafe !important; color: #2563eb !important;
            font-weight: bold; position: relative;
        }
        .my-booking-date::after {
            content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
            width: 4px; height: 4px; background-color: #2563eb; border-radius: 50%;
        }
        .react-datepicker__day--selected, .react-datepicker__day--in-range {
            background-color: #0f172a !important; color: white !important;
        }
        .custom-input {
            width: 100%; padding: 12px 16px 12px 42px;
            border: 1px solid #e2e8f0; border-radius: 12px;
            font-size: 14px; font-weight: 600; color: #334155;
            outline: none; transition: all 0.2s; background: white;
        }
        .custom-input:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05); }
      `}</style>

      {/* --- HEADER --- */}
      <div className="max-w-6xl mx-auto mb-8 px-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700"/>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Complete Your Booking</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-8">
        
        {/* --- LEFT: FORM --- */}
        <div className="flex-1 space-y-6">
            
            {/* 1. DATES & PEOPLE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">1</span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Event Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                          Event Name / Group Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Tag size={18} className="absolute left-3.5 top-3 text-slate-400 z-10"/>
                            <input 
                                type="text" 
                                value={bookingName}
                                onChange={(e) => setBookingName(e.target.value)}
                                className="custom-input"
                                placeholder="e.g. HNU Retreat, Family Reunion, Youth Camp..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-in Date</label>
                        <div className="relative">
                            <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10"/>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                minDate={new Date()}
                                excludeDates={allBlockedDates}
                                dayClassName={getDayClass}
                                placeholderText="Select Date"
                                className="custom-input"
                                dateFormat="MM/dd/yyyy"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Check-out Date</label>
                        <div className="relative">
                            <Calendar size={18} className="absolute left-3.5 top-3 text-slate-400 z-10"/>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate || new Date()}
                                excludeDates={allBlockedDates}
                                dayClassName={getDayClass}
                                placeholderText="Select Date"
                                className="custom-input"
                                dateFormat="MM/dd/yyyy"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Participants</label>
                          <div className="relative">
                            <User size={18} className="absolute left-3.5 top-3 text-slate-400 z-10"/>
                            <input 
                                type="number" min="1"
                                value={participants}
                                onChange={(e) => setParticipants(e.target.value)}
                                className="custom-input"
                                placeholder="Total People"
                            />
                          </div>
                    </div>
                </div>
            </div>

            {/* 2. ROOMS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">2</span>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Rooms</h2>
                    </div>
                    {selectedRooms.length > 0 && !isSameDayBooking && (
                        <button onClick={() => navigate('/rooms')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase">
                            + Add Another
                        </button>
                    )}
                </div>

                {selectedRooms.length === 0 ? (
                    <div className={`p-4 rounded-xl border border-dashed flex flex-row items-center justify-between gap-4 ${isSameDayBooking ? "bg-slate-100 border-slate-300" : "bg-slate-50 border-slate-200"}`}>
                        <p className={`text-sm font-medium ml-2 ${isSameDayBooking ? "text-slate-400" : "text-slate-500"}`}>
                            {isSameDayBooking ? "Rooms are not available for same-day events." : "No accommodation selected."}
                        </p>
                        <button 
                            onClick={() => { if (!isSameDayBooking) navigate('/rooms') }} 
                            disabled={isSameDayBooking}
                            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors ${
                                isSameDayBooking 
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed border-transparent" 
                                : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            + Add Room
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {isSameDayBooking && (
                            <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
                                ⚠️ {selectedRooms.length === 1 ? "A room" : "Rooms"} cannot be booked for same-day events. Please remove the {selectedRooms.length === 1 ? "room" : "rooms"} or adjust your dates.
                            </div>
                        )}
                        {selectedRooms.slice(0, showAllRooms ? selectedRooms.length : 2).map((room) => {
                            const imagePath = getRoomImage(room);
                            const fullImageUrl = getImageUrl(imagePath);
                            const capacity = Number(room.capacity) || 0;
                            const price = getPrice(room.price);

                            return (
                                <div key={room._id} className={`group flex flex-row items-center gap-4 p-3 bg-white border rounded-xl transition-all duration-300 ${isSameDayBooking ? "border-red-200 opacity-50 grayscale" : "border-slate-200 hover:shadow-md hover:border-blue-300"}`}>
                                    <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                                        {fullImageUrl ? (
                                            <img 
                                                src={fullImageUrl} 
                                                alt="Room" 
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=No+Img" }} 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 w-full text-left">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h4 className="font-bold text-slate-900 text-sm leading-none">{room.name}</h4>
                                            {room.building && (
                                                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold uppercase text-slate-500 border border-slate-200 tracking-wider">
                                                    <Building2 size={8} /> {room.building}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide mb-2 flex items-center gap-2">
                                            {room.room_type}
                                            {room.building && <span className="sm:hidden">• {room.building}</span>}
                                        </p>
                                        
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100">
                                            <Users size={10} />
                                            {capacity} {capacity === 1 ? "Person" : "People"}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 pl-4 border-l border-slate-100 min-w-[80px]">
                                        <div className="text-right">
                                            <span className="font-bold text-sm text-slate-900">
                                                {currencySymbol}{price}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium ml-1">/night</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleRemoveRoom(room._id)}
                                            className="text-slate-500 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all group-hover:text-red-400"
                                            title="Remove Room"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ROOMS SHOW MORE/LESS */}
                        {selectedRooms.length > 2 && (
                          <button 
                            onClick={() => setShowAllRooms(!showAllRooms)}
                            className="w-full py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-tighter"
                          >
                            {showAllRooms ? (
                              <><ChevronUp size={14}/> Show Less</>
                            ) : (
                              <><ChevronDown size={14}/> Show All ({selectedRooms.length})</>
                            )}
                          </button>
                        )}
                    </div>
                )}
            </div>

            {/* 3. PACKAGES (DYNAMIC) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">3</span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Select Package</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPackages.slice(0, showAllPackages ? allPackages.length : 3).map((pkg) => {
                         const pkgPrice = getPrice(pkg.price);
                         const isSelected = selectedPackageId === pkg._id;

                         return (
                          <div 
                            key={pkg._id}
                            onClick={() => setSelectedPackageId(pkg._id)}
                            className={`cursor-pointer border rounded-xl p-5 transition-all relative flex flex-col h-full ${
                                isSelected 
                                ? "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500 shadow-md" 
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Package size={20} />
                                </div>
                                {isSelected && <CheckCircle size={20} className="text-blue-600" />}
                            </div>

                            <h3 className="font-bold text-sm text-slate-900 mb-1">{pkg.name}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-grow">
                                {pkg.description || "No description."}
                            </p>

                            {/* Amenities Icons */}
                            <div className="flex gap-2 mb-3">
                                {pkg.includesFood && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 uppercase">
                                        <Utensils size={10} /> Food
                                    </span>
                                )}
                                {pkg.includesAC && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-1 rounded border border-sky-100 uppercase">
                                        <Wind size={10} /> AC
                                    </span>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 mt-auto">
                                <p className="font-bold text-slate-900 text-sm">
                                    {pkgPrice === 0 
                                      ? "Free / Included" 
                                      : `+${currencySymbol}${pkgPrice}`}
                                      {pkgPrice > 0 && <span className="text-xs text-slate-400 font-medium"> /pax/day</span>}
                                </p>
                            </div>
                        </div>
                    )})}
                </div>

                {/* PACKAGES SHOW MORE/LESS */}
                {allPackages.length > 3 && (
                  <button 
                    onClick={() => setShowAllPackages(!showAllPackages)}
                    className="w-full mt-6 py-3 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest"
                  >
                    {showAllPackages ? (
                      <><ChevronUp size={16}/> Show Less</>
                    ) : (
                      <><ChevronDown size={16}/> Show All Packages ({allPackages.length})</>
                    )}
                  </button>
                )}
            </div>

        </div>

        {/* --- RIGHT: SUMMARY --- */}
        <div className="w-full lg:w-96">
            <div className="sticky top-6 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Booking Summary</h3>
                
                {/* --- DISPLAY BOOKING NAME IN SUMMARY --- */}
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
                        <span className="font-bold text-slate-900">
                            {participants} {Number(participants) === 1 ? "Person" : "People"}
                        </span>
                    </div>
                    
                    <div className="border-t border-dashed border-slate-200 my-4"></div>

                    <div className="flex justify-between text-xs italic text-slate-400">
                        <span>Rooms</span>
                        <span>{selectedRooms.length > 0 ? `${selectedRooms.length} selected` : "None selected"}</span>
                    </div>
                     <div className="flex justify-between text-xs italic text-slate-400">
                        <span>Package</span>
                        <span className="text-right truncate max-w-[150px]">
                            {allPackages.find(p => p._id === selectedPackageId)?.name || "None Selected"}
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Price</span>
                    <span className="font-extrabold text-3xl text-slate-900">{currencySymbol}{calculateTotal().toLocaleString()}</span>
                </div>

                <button 
                    onClick={handleProceed}
                    disabled={isInvalidBookingState}
                    className={`w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isInvalidBookingState
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200 active:scale-[0.98]"
                    }`}
                >
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