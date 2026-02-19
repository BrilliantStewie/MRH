import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { StaffContext } from "../../context/StaffContext";
import {
  Search, User, RotateCcw, CalendarDays, ArrowRight,
  Home, Layers, Phone, CheckCircle2,
  Clock, BarChart3, ChevronDown, 
  AlertCircle, XCircle, Mail, Users, ChevronUp, Tag,
  Package, Info
} from "lucide-react";
import { toast } from "react-toastify";

// --- HELPER COMPONENT: Status Badge ---
const StatusBadge = ({ status }) => {
  let styles = "bg-slate-100 text-slate-500 border-slate-200";
  let Icon = Clock;
  const s = (status || "").toLowerCase();

  if (["approved", "confirmed", "checked_in"].includes(s)) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-100";
    Icon = CheckCircle2;
  } else if (s === 'pending' || s === 'cancellation_pending') {
    styles = "bg-amber-50 text-amber-700 border-amber-100";
    Icon = AlertCircle;
  } else if (["cancelled", "declined"].includes(s)) {
    styles = "bg-rose-50 text-rose-700 border-rose-100";
    Icon = XCircle;
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${styles} inline-flex items-center gap-1.5`}>
      <Icon size={10} />
      {status?.replace('_', ' ')}
    </span>
  );
};

// --- MODAL COMPONENT (High-End Details View) ---
const BookingDetailsModal = ({ isOpen, onClose, booking, formatDate, backendUrl }) => {
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAllRooms(false);
      setShowAllPackages(false);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const getPackagesList = () => {
    if (Array.isArray(booking.packages)) return booking.packages;
    if (Array.isArray(booking.package_ids)) return booking.package_ids;
    if (booking.package_id) return Array.isArray(booking.package_id) ? booking.package_id : [booking.package_id];
    return [];
  };

  const packagesList = getPackagesList();
  const roomList = booking.room_ids || [];

  const visibleRooms = showAllRooms ? roomList : roomList.slice(0, 2);
  const visiblePackages = showAllPackages ? packagesList : packagesList.slice(0, 1);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-r from-slate-900 to-black p-6 flex items-end">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <Package size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-none">Booking Inventory</h2>
            </div>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          
          {/* Customer Details */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                  {booking.user_id?.image ? (
                    <img src={booking.user_id.image.startsWith('http') ? booking.user_id.image : `${backendUrl}/${booking.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                  ) : (booking.user_id?.firstName?.[0] || <User size={16}/>)}
              </div>
              <div className="overflow-hidden w-full">
                <p className="text-sm font-black text-slate-800 truncate">{booking.user_id?.firstName} {booking.user_id?.lastName || booking.user_id?.name}</p>
                <div className="flex justify-between items-center mt-1 w-full">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate overflow-hidden">
                        <Mail size={10} className="shrink-0" /> 
                        <span className="truncate">{booking.user_id?.email || "No Email"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 font-bold ml-2">
                        <Phone size={10} className="shrink-0" /> 
                        <span>{booking.user_id?.phone || "No Phone"}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stay Period */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</h3>
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Check-In</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_in || booking.date || booking.slotDate)}</p>
              </div>
              <ArrowRight size={14} className="text-blue-300" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Check-Out</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_out || booking.checkOutDate)}</p>
              </div>
            </div>
          </div>

          {/* Reserved Units */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserved Units ({roomList.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleRooms.map((room, i) => {
                const roomImg = (Array.isArray(room.images) && room.images.length > 0) 
                  ? room.images[0] 
                  : room.cover_image;

                const imageUrl = (roomImg && typeof roomImg === 'string') 
                  ? (roomImg.startsWith('http') ? roomImg : `${backendUrl}/${roomImg}`)
                  : null;

                return (
                  <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="h-12 w-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-full h-full object-cover" alt="room" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Home size={14} className="text-slate-300" /></div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <p className="text-[11px] font-black text-slate-800">{room.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{room.building}</p>
                      </div>
                      <div className="flex justify-between items-end mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium">{room.room_type}</p>
                        {room.capacity && <p className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 rounded-md flex items-center gap-1"><Users size={10} /> {room.capacity}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Rooms See All Toggle */}
            {roomList.length > 2 && (
              <button 
                onClick={() => setShowAllRooms(!showAllRooms)}
                className="w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                {showAllRooms ? (
                  <><ChevronUp size={12} /> Show Less</>
                ) : (
                  <><ChevronDown size={12} /> See All (+{roomList.length - 2} More)</>
                )}
              </button>
            )}
          </div>

          {/* Package Availed */}
          <div className="md:col-span-2 space-y-3">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Availed ({packagesList.length})</h3>
             
             {packagesList.length > 0 ? (
                <div className="space-y-2">
                  {visiblePackages.map((pkg, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-violet-50 rounded-2xl border border-violet-100 relative overflow-hidden group">
                      <Package className="absolute -right-4 -bottom-4 text-violet-100 opacity-50 rotate-12" size={80} />
                      <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 border border-violet-200 relative z-10">
                        <Package size={24} />
                      </div>
                      <div className="flex-grow relative z-10">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-black text-slate-800">{pkg.name}</p>
                          <p className="text-sm font-black text-violet-600">₱{pkg.price?.toLocaleString()}</p>
                        </div>
                        {pkg.description && (
                          <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {packagesList.length > 1 && (
                    <button 
                      onClick={() => setShowAllPackages(!showAllPackages)}
                      className="w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      {showAllPackages ? (
                        <><ChevronUp size={12} /> Show Less</>
                      ) : (
                        <><ChevronDown size={12} /> See All (+{packagesList.length - 1} More)</>
                      )}
                    </button>
                  )}
                </div>
             ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-slate-400 italic text-xs">
                   <div className="h-8 w-8 rounded-lg bg-slate-200/50 flex items-center justify-center">
                     <Package size={14} />
                   </div>
                   No additional package selected for this booking.
                </div>
             )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billing</p>
            <p className="text-xl font-black text-slate-900">₱{(booking.total_price || booking.amount || 0).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const StaffBookings = () => {
  const { backendUrl, sToken } = useContext(StaffContext);

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  
  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [typeFilter, setTypeFilter] = useState("All Room Types"); 
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("Newest First");
  
  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const filterRef = useRef(null);

  /* =======================================
     FETCH LOGIC
  ======================================= */
  const fetchBookings = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/staff/bookings`, {
        headers: { token: sToken },
      });
      if (data.success) {
        setBookings(data.bookings);
        setFilteredBookings(data.bookings);
      }
    } catch (error) { 
      toast.error("Failed to load bookings"); 
    }
  };

  useEffect(() => {
    if (sToken) fetchBookings();
  }, [sToken, backendUrl]);

  /* =======================================
     FILTERING & SORTING LOGIC
  ======================================= */
  useEffect(() => {
    let filtered = [...bookings];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((b) =>
        b.user_id?.name?.toLowerCase().trim().includes(term) || 
        b._id?.toLowerCase().includes(term)
      );
    }

    if (buildingFilter !== "All Buildings") {
      filtered = filtered.filter((b) => b.room_ids?.some((r) => r.building === buildingFilter));
    }

    if (typeFilter !== "All Room Types") {
      filtered = filtered.filter((b) => b.room_ids?.some((r) => r.room_type?.toLowerCase() === typeFilter.toLowerCase()));
    }

    if (statusFilter !== "All Status") {
      filtered = filtered.filter((b) => b.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (paymentFilter !== "All Payments") {
      filtered = filtered.filter((b) => {
          if (paymentFilter === "paid") return b.paymentStatus?.toLowerCase() === 'paid' || b.payment === true;
          if (paymentFilter === "unpaid") return b.paymentStatus?.toLowerCase() !== 'paid' && b.payment !== true;
          return true;
      });
    }

    if (startDate || endDate) {
        filtered = filtered.filter((b) => {
          const rawDate = b.slotDate || b.check_in || b.date;
          if (!rawDate) return false;
          const bookingDateStr = new Date(rawDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
          if (startDate && bookingDateStr < startDate) return false;
          if (endDate && bookingDateStr > endDate) return false;
          return true;
        });
    }

    filtered.sort((a, b) => {
      const dateB = new Date(b.slotDate || b.check_in || b.date || b.createdAt);
      const dateA = new Date(a.slotDate || a.check_in || a.date || a.createdAt);
      return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, typeFilter, paymentFilter, statusFilter, startDate, endDate, sortOrder, bookings]);

  // Click outside to close date filter
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsDateFilterActive(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =======================================
     HELPERS
  ======================================= */
  const resetFilters = () => {
    setSearchTerm("");
    setBuildingFilter("All Buildings");
    setTypeFilter("All Room Types");
    setPaymentFilter("All Payments");
    setStatusFilter("All Status");
    setSortOrder("Newest First");
    setStartDate("");
    setEndDate("");
    setIsDateFilterActive(false);
  };

  const formatDatePHT = (dateInput) => {
    if (!dateInput) return "N/A";
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "N/A";
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch (e) { return "N/A"; }
  };

  // Stats calculation
  const stats = {
    total: bookings.length,
    activeStays: bookings.filter(b => ["approved", "checked_in"].includes(b.status?.toLowerCase())).length,
    revenue: bookings.filter(b => b.paymentStatus === 'paid' || b.payment === true).reduce((acc, curr) => acc + (curr.total_price || curr.amount || 0), 0)
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Booking Schedules</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage guest stays and reservations</p>
          </div>
          
          <div className="relative" ref={filterRef}>
            <div 
              onClick={() => setIsDateFilterActive(!isDateFilterActive)}
              className={`flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border cursor-pointer transition-all shadow-sm ${isDateFilterActive ? 'border-blue-600 ring-4 ring-blue-600/5' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <CalendarDays size={20} className={isDateFilterActive ? "text-blue-600" : "text-slate-400"} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Stay Period</span>
                <span className="text-xs font-bold text-slate-700">
                  {startDate ? `${startDate} → ${endDate || '...'}` : "Select Date range"}
                </span>
              </div>
              <ChevronDown size={16} className={`ml-4 transition-transform duration-300 ${isDateFilterActive ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} />
            </div>

            {/* DATE FILTER DROPDOWN */}
            {isDateFilterActive && (
              <div className="absolute right-0 mt-3 w-[340px] bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 z-[100] animate-in zoom-in-95 duration-200">
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Calendar Range</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check In</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer text-slate-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check Out</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer text-slate-700" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                    </div>
                  </div>
                  <button onClick={() => {setStartDate(""); setEndDate(""); setIsDateFilterActive(false);}} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Reset Dates & Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Layers size={20}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Schedules</p><p className="text-xl font-black text-slate-800">{stats.total}</p></div>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={20}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Active / Confirmed</p><p className="text-xl font-black text-slate-800">{stats.activeStays}</p></div>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600"><BarChart3 size={20}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Generated Revenue</p><p className="text-xl font-black text-slate-800">₱{stats.revenue.toLocaleString()}</p></div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search Guest..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
            </select>
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
              <option>All Buildings</option>
              <option value="Margarita">Margarita</option>
              <option value="Nolasco">Nolasco</option>
            </select>
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>All Room Types</option>
              <option value="Individual">Individual</option>
              <option value="Individual with Pullout">Individual with Pullout</option>
              <option value="Dormitory">Dormitory</option>
            </select>
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All Status">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="All Payments">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button onClick={resetFilters} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-7xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Profile</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[250px]">Room Selection</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => {
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* GUEST PROFILE */}
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-start gap-4">
                          <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                            {b.user_id?.image ? (
                              <img src={b.user_id.image.startsWith('http') ? b.user_id.image : `${backendUrl}/${b.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                            ) : <User size={20}/>}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-black text-slate-800 leading-tight">{b.user_id?.name || `${b.user_id?.firstName || ''} ${b.user_id?.lastName || ''}`.trim() || "Guest Name"}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                              <Mail size={10} className="text-slate-300"/>
                              <span className="truncate max-w-[120px]">{b.user_id?.email || "No Email"}</span>
                            </div>
                            {b.user_id?.phone && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                <Phone size={10} className="text-slate-300"/>
                                {b.user_id?.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ROOM SELECTION */}
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                              {b.room_ids?.slice(0, 1).map((room, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                                      <Home size={10} className="text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-600 truncate">{room.name}</span>
                                      {room.capacity && <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto border-l border-slate-200 pl-1.5"><Users size={8}/> {room.capacity}</span>}
                                  </div>
                              ))}
                              {b.room_ids?.length > 1 && (
                                  <span className="text-[9px] font-bold text-slate-400 px-1">
                                      +{b.room_ids.length - 1} more room{b.room_ids.length - 1 > 1 ? 's' : ''}
                                  </span>
                              )}
                          </div>
                          <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="text-[9px] font-black text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mt-1 uppercase tracking-tighter w-fit">
                            <Info size={10}/> View Full Details
                          </button>
                        </div>
                      </td>

                      {/* STAY PERIOD */}
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-100/50 px-2 py-1 rounded-lg w-fit border border-slate-100">
                          {formatDatePHT(b.check_in || b.slotDate || b.date)} <ArrowRight size={10} className="text-slate-300" /> {formatDatePHT(b.check_out || b.checkOutDate)}
                        </div>
                      </td>

                      {/* CURRENT STATUS */}
                      <td className="px-6 py-5 align-top">
                        <StatusBadge status={b.status} />
                      </td>

                      {/* BILLING */}
                      <td className="px-6 py-5 align-top">
                        <p className="text-sm font-black text-slate-800">₱{(b.total_price || b.amount || 0).toLocaleString()}</p>
                        <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-1 ${ (b.paymentStatus === 'paid' || b.payment === true) ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {(b.paymentStatus === 'paid' || b.payment === true) ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                            {(b.paymentStatus === 'paid' || b.payment === true) ? 'Paid' : 'Unpaid'}
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-50" />
                      <p className="text-sm font-bold">No results found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BookingDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        booking={selectedBooking} 
        formatDate={formatDatePHT} 
        backendUrl={backendUrl} 
      />
    </div>
  );
};

export default StaffBookings;