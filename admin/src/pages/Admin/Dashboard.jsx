import React, { useEffect, useState, useContext, useRef } from "react";
import { AdminContext } from "../../context/AdminContext";
import {
  Search, User, RotateCcw, CalendarDays, ArrowRight,
  Moon, Home, Layers, Phone, CheckCircle,
  Package, Info, X, Clock, BarChart3, ChevronDown, Trash2,
  AlertCircle, CheckCircle2, XCircle, Banknote
} from "lucide-react";

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
  if (!isOpen || !booking) return null;

  const calculateNights = (inDate, outDate) => {
    const start = new Date(inDate);
    const end = new Date(outDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="relative h-28 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex items-end">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <Package size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-none">Booking Inventory</h2>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">Ref ID: {booking._id}</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold overflow-hidden">
                 {booking.user_id?.image ? (
                    <img src={booking.user_id.image.startsWith('http') ? booking.user_id.image : `${backendUrl}/${booking.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                 ) : (booking.user_id?.firstName?.[0])}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-800 truncate">{booking.user_id?.firstName} {booking.user_id?.lastName}</p>
                <p className="text-[11px] text-slate-500 truncate">{booking.user_id?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 px-1">
              <Phone size={14} className="text-emerald-500" /> {booking.user_id?.phone || "No Phone Info"}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</h3>
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="text-center">
                <p className="text-[9px] font-bold text-emerald-600 uppercase">Check-In</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_in || booking.date)}</p>
              </div>
              <ArrowRight size={14} className="text-emerald-300" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-emerald-600 uppercase">Check-Out</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_out || booking.checkOutDate)}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserved Units ({booking.room_ids?.length})</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Moon size={10} /> {calculateNights(booking.check_in || booking.date, booking.check_out || booking.checkOutDate)} Nights
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {booking.room_ids?.map((room, i) => {
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
                        <p className="text-[9px] text-slate-500 font-medium italic">{room.room_type}</p>
                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-md">Pax: {room.capacity}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billing</p>
            <p className="text-xl font-black text-slate-900">₱{booking.total_price?.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-200">
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const AllBookings = () => {
  const { aToken, allBookings, getAllBookings, approveBooking, paymentConfirmed, approveCancellation, backendUrl } = useContext(AdminContext);

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const filterRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Types");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [yearFilter, setYearFilter] = useState("All Years");

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => { if (aToken) getAllBookings(); }, [aToken]);
  useEffect(() => { if (allBookings) setBookings(allBookings); }, [allBookings]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsDateFilterActive(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDatePHT = (dateInput) => {
    if (!dateInput) return "N/A";
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? "N/A" : new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila", day: "2-digit", month: "short", year: "numeric",
    }).format(date);
  };

  useEffect(() => {
    if (!Array.isArray(bookings)) return;
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => `${b.user_id?.firstName} ${b.user_id?.lastName}`.toLowerCase().includes(term) || b._id.toLowerCase().includes(term));
    }
    
    if (buildingFilter !== "All Buildings") filtered = filtered.filter(b => b.room_ids?.some(r => r.building === buildingFilter));
    
    if (statusFilter !== "All Status") {
      filtered = filtered.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (roomTypeFilter !== "All Types") {
      filtered = filtered.filter(b => b.room_ids?.some(r => r.room_type?.toLowerCase() === roomTypeFilter.toLowerCase()));
    }

    if (startDate || endDate) {
      filtered = filtered.filter(b => {
        const bDate = new Date(b.check_in || b.date).toISOString().split('T')[0];
        return (!startDate || bDate >= startDate) && (!endDate || bDate <= endDate);
      });
    }
    
    if (monthFilter !== "All Months") filtered = filtered.filter(b => new Date(b.check_in || b.date).getMonth() === months.indexOf(monthFilter));
    if (yearFilter !== "All Years") filtered = filtered.filter(b => new Date(b.check_in || b.date).getFullYear() === parseInt(yearFilter));

    filtered.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, statusFilter, roomTypeFilter, sortOrder, startDate, endDate, monthFilter, yearFilter, bookings]);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status?.toLowerCase() === 'pending').length,
    revenue: bookings.filter(b => b.paymentStatus === 'paid' || b.payment === true).reduce((acc, curr) => acc + (curr.total_price || 0), 0)
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Booking Inventory</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage and track guest reservations</p>
          </div>
          
          <div className="relative" ref={filterRef}>
            <div 
              onClick={() => setIsDateFilterActive(!isDateFilterActive)}
              className={`flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border cursor-pointer transition-all shadow-sm ${isDateFilterActive ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <CalendarDays size={20} className={isDateFilterActive ? "text-emerald-500" : "text-slate-400"} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Stay Period</span>
                <span className="text-xs font-bold text-slate-700">
                  {startDate ? `${startDate} → ${endDate || '...'}` : monthFilter !== "All Months" ? `${monthFilter} ${yearFilter}` : "Select Date range"}
                </span>
              </div>
              <ChevronDown size={16} className={`ml-4 transition-transform duration-300 ${isDateFilterActive ? 'rotate-180 text-emerald-500' : 'text-slate-300'}`} />
            </div>

            {isDateFilterActive && (
              <div className="absolute right-0 mt-3 w-[340px] bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 z-[100] animate-in zoom-in-95 duration-200">
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Calendar Range</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check In</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer" value={startDate} onChange={(e) => {setStartDate(e.target.value); setMonthFilter("All Months");}} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check Out</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer" value={endDate} onChange={(e) => {setEndDate(e.target.value); setMonthFilter("All Months");}} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                    </div>
                  </div>
                  <div className="relative flex items-center"><div className="flex-grow border-t border-slate-100"></div><span className="px-3 text-[9px] font-black text-slate-300">OR QUICK SELECT</span><div className="flex-grow border-t border-slate-100"></div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="bg-slate-50 border-none rounded-xl text-xs font-bold p-3 outline-none cursor-pointer" value={monthFilter} onChange={(e) => {setMonthFilter(e.target.value); setStartDate(""); setEndDate("");}}>
                      <option>All Months</option>
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="bg-slate-50 border-none rounded-xl text-xs font-bold p-3 outline-none cursor-pointer" value={yearFilter} onChange={(e) => {setYearFilter(e.target.value); setStartDate(""); setEndDate("");}}>
                      <option>All Years</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button onClick={() => {setStartDate(""); setEndDate(""); setMonthFilter("All Months"); setYearFilter("All Years"); setIsDateFilterActive(false);}} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Reset & Close</button>
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
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Bookings</p><p className="text-xl font-black text-slate-800">{stats.total}</p></div>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={20}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Awaiting Action</p><p className="text-xl font-black text-slate-800">{stats.pending}</p></div>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><BarChart3 size={20}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Revenue</p><p className="text-xl font-black text-slate-800">₱{stats.revenue.toLocaleString()}</p></div>
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
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
              <option>All Types</option>
              <option value="Individual">Individual</option>
              <option value="Individual with Pullout">Individual with Pullout</option>
              <option value="Dormitory">Dormitory</option>
            </select>
            <select className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-600 outline-none cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All Status">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
              <option value="cancellation_pending">Cancel Pending</option>
              <option value="declined">Declined</option>
            </select>
            <button onClick={() => { setSearchTerm(""); setBuildingFilter("All Buildings"); setRoomTypeFilter("All Types"); setStatusFilter("All Status"); setSortOrder("Newest First"); setStartDate(""); setEndDate(""); setMonthFilter("All Months"); setYearFilter("All Years"); }} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing & Payment</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                        {b.user_id?.image ? <img src={b.user_id.image.startsWith('http') ? b.user_id.image : `${backendUrl}/${b.user_id.image}`} className="w-full h-full object-cover" alt="user" /> : <User size={18}/>}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{b.user_id?.firstName} {b.user_id?.lastName}</p>
                        <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-1">
                          <Info size={10}/> Details
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-100/50 px-2 py-1 rounded-lg w-fit">
                      {formatDatePHT(b.check_in || b.date)} <ArrowRight size={10} className="text-slate-300" /> {formatDatePHT(b.check_out || b.checkOutDate)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-800">₱{b.total_price?.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-[9px] font-bold uppercase mt-1 ${ (b.paymentStatus === 'paid' || b.payment === true) ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {(b.paymentStatus === 'paid' || b.payment === true) ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                        {(b.paymentStatus === 'paid' || b.payment === true) ? 'Paid' : 'Awaiting Payment'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {/* ACTION BUTTONS (Updated with case-insensitive check) */}
                       {b.status?.toLowerCase() === "pending" && (
                         <>
                            <button 
                                onClick={() => approveBooking(b._id)} 
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
                            >
                                <CheckCircle size={12}/> Approve
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm("Are you sure you want to DECLINE this booking request?")) {
                                        approveCancellation(b._id, "decline"); 
                                    }
                                }} 
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                            >
                                <X size={12}/> Decline
                            </button>
                         </>
                       )}

                       {/* PAYMENT BUTTON */}
                       {b.status?.toLowerCase() === "approved" && b.paymentStatus !== 'paid' && b.payment !== true && (
                         <button 
                            onClick={() => paymentConfirmed(b._id)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                         >
                            <Banknote size={12}/> Confirm Payment
                         </button>
                       )}

                       {/* CANCELLATION BUTTON */}
                       {b.status?.toLowerCase() === "cancellation_pending" && (
                         <button 
                            onClick={() => approveCancellation(b._id, "approve")} 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700"
                         >
                            <Trash2 size={12}/> Approve Cancel
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookingDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} booking={selectedBooking} formatDate={formatDatePHT} backendUrl={backendUrl} />
    </div>
  );
};

export default AllBookings;