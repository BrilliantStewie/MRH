import React, { useEffect, useState, useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
import {
  Search,
  User,
  Mail,
  RotateCcw,
  CalendarDays,
  ArrowRight,
  Moon,
  Home,
  Layers,
  Tag,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CheckCircle,
  XCircle,
  Banknote
} from "lucide-react";
import { toast } from "react-toastify";

const AllBookings = () => {
  const { 
    aToken, 
    allBookings, 
    getAllBookings, 
    approveBooking, 
    declineBooking, 
    paymentConfirmed, 
    approveCancellation,
    backendUrl 
  } = useContext(AdminContext);

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [expandedBookings, setExpandedBookings] = useState({}); 

  // ✅ FILTERS
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [typeFilter, setTypeFilter] = useState("All Room Types"); 
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const toggleRooms = (id) => {
    setExpandedBookings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "newest" ? "oldest" : "newest");
  };

  // 🛠️ DATE FORMATTER
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

  // 🛠️ NIGHT CALCULATOR
  const calculateNights = (inDate, outDate) => {
    if (!inDate || !outDate) return null;
    const start = new Date(inDate);
    const end = new Date(outDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (endDate && val > endDate) {
      setEndDate("");
      toast.warn("Check-out cleared to maintain valid range");
    }
  };

  const handleEndDateChange = (val) => {
    if (startDate && val < startDate) {
      toast.error("Invalid: Check-out cannot be before check-in");
      return; 
    }
    setEndDate(val);
  };

  // 🔄 FETCH DATA
  useEffect(() => {
    if (aToken) {
        getAllBookings();
    }
  }, [aToken]);

  useEffect(() => {
    if (allBookings) {
        setBookings(allBookings);
    }
  }, [allBookings]);

  // 🔍 FILTER LOGIC
  useEffect(() => {
    if (!Array.isArray(bookings)) return;
    
    let filtered = [...bookings];
    
    // Search
    if (searchTerm) {
      filtered = filtered.filter((b) => {
        const firstName = b.user_id?.firstName || "";
        const middleName = b.user_id?.middleName || "";
        const lastName = b.user_id?.lastName || "";
        const suffix = b.user_id?.suffix || ""; // Added suffix to filter logic
        const fullName = `${firstName} ${middleName} ${lastName} ${suffix}`.replace(/\s+/g, " ");
        return fullName.toLowerCase().trim().includes(searchTerm.toLowerCase().trim());
      });
    }

    // Building Filter
    if (buildingFilter !== "All Buildings") {
      filtered = filtered.filter((b) => b.room_ids?.some((r) => r.building === buildingFilter));
    }

    // Room Type Filter
    if (typeFilter !== "All Room Types") {
      filtered = filtered.filter((b) => b.room_ids?.some((r) => r.room_type?.toLowerCase() === typeFilter.toLowerCase()));
    }

    // Status Filter
    if (statusFilter !== "All Status") {
      filtered = filtered.filter((b) => b.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Payment Filter
    if (paymentFilter !== "All Payments") {
      filtered = filtered.filter((b) => {
         const status = b.paymentStatus?.toLowerCase() || 'unpaid';
         return paymentFilter === 'paid' ? status === 'paid' : status !== 'paid';
      });
    }

    // Date Range Filter
    if (startDate || endDate) {
        filtered = filtered.filter((b) => {
          const rawDate = b.check_in || b.date;
          if (!rawDate) return false;
          const bookingDateStr = new Date(rawDate).toISOString().split('T')[0];
          if (startDate && bookingDateStr < startDate) return false;
          if (endDate && bookingDateStr > endDate) return false;
          return true;
        });
    }

    // Sort
    filtered.sort((a, b) => {
      const dateB = new Date(b.check_in || b.date);
      const dateA = new Date(a.check_in || a.date);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, typeFilter, paymentFilter, statusFilter, startDate, endDate, sortOrder, bookings]);

  const resetFilters = () => {
    setSearchTerm("");
    setBuildingFilter("All Buildings");
    setTypeFilter("All Room Types");
    setPaymentFilter("All Payments");
    setStatusFilter("All Status");
    setStartDate("");
    setEndDate("");
    setSortOrder("newest");
  };

  // ✨ STYLES (Slightly larger text)
  const filterStyle = "px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 outline-none shadow-sm cursor-pointer hover:border-emerald-400 transition-all appearance-none";

  const getRoomTypeStyle = (type) => {
    const lowerType = type?.toLowerCase();
    if (lowerType === 'dormitory') return 'bg-purple-50 text-purple-600 border-purple-100';
    if (lowerType?.includes('individual')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="w-full p-4 bg-slate-50/50 min-h-screen font-sans overflow-y-auto scrollbar-hide">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Booking Schedules</h1>
          <p className="text-sm text-slate-500 font-medium italic mt-0.5">Admin Management Dashboard</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm scale-95 origin-right">
            <div className="relative flex flex-col px-4 py-1.5 min-w-[150px] group cursor-pointer hover:bg-slate-50 rounded-l-xl transition-colors">
                <span className="text-[10px] font-bold text-slate-400 mb-0.5">Check In</span>
                <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700">
                        {startDate ? formatDatePHT(startDate) : "Select date"}
                    </span>
                </div>
                <input 
                    type="date" className="absolute inset-0 opacity-0 cursor-pointer"
                    value={startDate} onChange={(e) => handleStartDateChange(e.target.value)}
                    onClick={(e) => e.target.showPicker()} 
                />
            </div>
            <div className="h-8 w-[1px] bg-slate-100 mx-1" />
            <div className="relative flex flex-col px-4 py-1.5 min-w-[150px] group cursor-pointer hover:bg-slate-50 rounded-r-xl transition-colors">
                <span className="text-[10px] font-bold text-slate-400 mb-0.5">Check Out</span>
                <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-slate-300" />
                    <span className="text-sm font-bold text-slate-700">
                        {endDate ? formatDatePHT(endDate) : "Select date"}
                    </span>
                </div>
                <input 
                    type="date" className="absolute inset-0 opacity-0 cursor-pointer"
                    value={endDate} min={startDate} onChange={(e) => handleEndDateChange(e.target.value)}
                    onClick={(e) => e.target.showPicker()} 
                />
            </div>
        </div>
      </div>

      {/* SEARCH AND SORT BAR */}
      <div className="flex flex-col lg:flex-row items-start justify-between mb-5 gap-4">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search Guest Name..."
              className="pl-11 pr-5 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-medium outline-none w-72 shadow-sm focus:ring-4 focus:ring-emerald-500/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={toggleSort}
            className="flex items-center gap-2 ml-4 text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
          >
            {sortOrder === "newest" ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
          </button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 px-3 rounded-[24px] border border-slate-100 shadow-sm">
            <select className={filterStyle} value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
              <option>All Buildings</option>
              <option value="Margarita">Margarita</option>
              <option value="Nolasco">Nolasco</option>
            </select>
            
            <select className={filterStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>All Room Types</option>
              <option value="Individual">Individual</option>
              <option value="Individual with Pullout">Individual with Pullout</option>
              <option value="Dormitory">Dormitory</option>
            </select>

            <select className={filterStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="cancellation_pending">Cancel Req</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
            </select>

            <select className={filterStyle} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option>All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <button onClick={resetFilters} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase mt-5 mb-10 mr-4 tracking-widest">
            <RotateCcw size={12} />
            Clear Filter
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Guest Profile</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest w-[280px]">Room Selection</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Stay Duration</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Billing</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredBookings.length ? (
              filteredBookings.map((b) => {
                const cin = b.check_in || b.slotDate || b.date;
                const cout = b.check_out || b.checkOutDate;
                const nights = calculateNights(cin, cout);
                const roomCount = b.room_ids?.length || 0;
                
                const isExpanded = expandedBookings[b._id];
                const visibleRooms = isExpanded ? b.room_ids : b.room_ids?.slice(0, 1);
                const hiddenCount = roomCount - 1;

                const userImage = b.user_id?.image;
                const fullImageUrl = userImage 
                  ? (userImage.startsWith('http') ? userImage : `${backendUrl}/${userImage}`)
                  : null;

                // ✅ Updated to include Suffix in the UI string
                const guestName = b.user_id 
                    ? `${b.user_id.firstName || ""} ${b.user_id.middleName || ""} ${b.user_id.lastName || ""} ${b.user_id.suffix || ""}`.replace(/\s+/g, " ").trim()
                    : "Unknown Guest";

                return (
                  <tr key={b._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* GUEST PROFILE */}
                    <td className="px-4 py-4 align-top pl-6">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center flex-shrink-0">
                          {fullImageUrl ? (
                             <img 
                               src={fullImageUrl} 
                               alt={guestName} 
                               className="h-full w-full object-cover"
                               onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                             />
                          ) : null}
                          <div className={`${fullImageUrl ? 'hidden' : 'block'} text-slate-300`}>
                             <User size={22} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-sm font-black text-slate-800 leading-none mb-0.5 capitalize">{guestName}</span>
                          <div className="flex items-center gap-1.5 text-slate-400">
                             <Mail size={12} />
                             <span className="text-xs font-medium tracking-tight truncate max-w-[140px]">{b.user_id?.email || "No email"}</span>
                          </div>
                          {b.user_id?.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                               <Phone size={12} className="text-emerald-400" />
                               <span className="text-xs font-bold tracking-tight">{b.user_id.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ROOM SELECTION */}
                    <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                            {roomCount > 1 && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    <Layers size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                        {roomCount} Rooms
                                    </span>
                                </div>
                            )}
                            
                            {visibleRooms?.map((room, idx) => (
                                <div key={idx} className="flex flex-col p-2 bg-slate-50/80 rounded-lg border border-slate-100 shadow-sm relative">
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Home size={13} className="text-slate-400" />
                                            <span className="text-xs font-bold text-slate-700 leading-tight">{room.name}</span>
                                        </div>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500 uppercase">
                                            {room.building}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Tag size={11} className="text-slate-300" />
                                        <span className={`text-[10px] font-bold uppercase tracking-tight px-1.5 rounded ${getRoomTypeStyle(room.room_type)}`}>
                                            {room.room_type || 'Individual'}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {roomCount > 1 && (
                                <button 
                                    onClick={() => toggleRooms(b._id)}
                                    className="flex items-center justify-center gap-1 py-1.5 px-2 mt-0.5 rounded-lg border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-[10px] font-bold text-slate-500 hover:text-emerald-600 transition-all group"
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp size={12} className="group-hover:-translate-y-0.5 transition-transform" />
                                            Less
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
                                            +{hiddenCount} more
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </td>

                    {/* STAY DURATION */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1.5 mt-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 bg-white border border-slate-100 w-fit px-2.5 py-1.5 rounded-md shadow-sm">
                           <span className="text-xs font-bold">{formatDatePHT(cin)}</span>
                           <ArrowRight size={12} className="text-slate-300" />
                           <span className="text-xs font-bold">{formatDatePHT(cout)}</span>
                        </div>
                        {nights && (
                           <div className="flex items-center gap-1">
                              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                                 <Moon size={11} /> {nights} {nights === 1 ? 'Night' : 'Nights'}
                              </span>
                           </div>
                        )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4 text-center align-top">
                      <div className="mt-1 flex justify-center">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border shadow-sm ${
                            b.status?.toLowerCase() === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : b.status?.toLowerCase() === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : b.status?.toLowerCase() === 'cancellation_pending'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {b.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* BILLING */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col mt-0.5">
                        <p className="text-[15px] font-black text-slate-800 tracking-tighter">
                            ₱{(b.total_price || 0).toLocaleString()}
                        </p>
                        <span className={`mt-1 w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          b.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {b.paymentStatus || 'Unpaid'}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">
                           {b.paymentMethod || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-4 align-top pr-6">
                      <div className="flex items-start justify-center gap-2 mt-0.5">
                        {b.status === "pending" && (
                          <>
                            <button onClick={() => approveBooking(b._id)} className='bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-md transition-colors shadow-sm' title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => declineBooking(b._id)} className='bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-red-500 p-2 rounded-md transition-colors shadow-sm' title="Decline">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}

                        {b.status === "approved" && b.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => paymentConfirmed(b._id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold text-white shadow-sm transition-all hover:scale-105 bg-indigo-500 hover:bg-indigo-600"
                            >
                              <Banknote size={12} />
                              Confirm
                            </button>
                        )}

                        {b.status === "cancellation_pending" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => approveCancellation(b._id, "approve")} className='px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-md text-[10px] font-bold'>
                              Accept
                            </button>
                            <button onClick={() => approveCancellation(b._id, "reject")} className='px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-md text-[10px] font-bold'>
                              Reject
                            </button>
                          </div>
                        )}

                        {(b.paymentStatus === 'paid' || ["cancelled", "declined"].includes(b.status)) && (
                          <span className='text-[10px] font-bold text-slate-300 uppercase tracking-wider py-1'>
                            Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="6" className="px-4 py-24 text-center text-slate-400 font-medium italic">No results found matching your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllBookings;