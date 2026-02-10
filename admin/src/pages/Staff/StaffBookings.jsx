import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { StaffContext } from "../../context/StaffContext";
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
  Phone
} from "lucide-react";
import { toast } from "react-toastify";

const StaffBookings = () => {
  const { backendUrl, sToken } = useContext(StaffContext);

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [typeFilter, setTypeFilter] = useState("All Room Types"); 
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/staff/bookings`, {
          headers: { token: sToken },
        });
        if (data.success) {
          setBookings(data.bookings);
          setFilteredBookings(data.bookings);
        }
      } catch (error) { toast.error("Failed to load bookings"); }
    };
    if (sToken) fetchBookings();
  }, [sToken, backendUrl]);

  useEffect(() => {
    let filtered = [...bookings];
    
    // UPDATED SEARCH LOGIC: Match from start of the string only
    if (searchTerm) {
      filtered = filtered.filter((b) =>
        b.user_id?.name?.toLowerCase().trim().startsWith(searchTerm.toLowerCase().trim())
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
      filtered = filtered.filter((b) => b.paymentStatus?.toLowerCase() === paymentFilter.toLowerCase());
    }

    if (startDate || endDate) {
        filtered = filtered.filter((b) => {
          const rawDate = b.slotDate || b.check_in || b.date;
          if (!rawDate) return false;

          const bookingDateStr = new Date(rawDate).toLocaleDateString('en-CA', { 
            timeZone: 'Asia/Manila' 
          });

          if (startDate && bookingDateStr < startDate) return false;
          if (endDate && bookingDateStr > endDate) return false;
          return true;
        });
    }

    filtered.sort((a, b) => {
      const dateB = new Date(b.slotDate || b.check_in || b.date);
      const dateA = new Date(a.slotDate || a.check_in || a.date);
      return dateB - dateA;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, typeFilter, paymentFilter, statusFilter, startDate, endDate, bookings]);

  const resetFilters = () => {
    setSearchTerm("");
    setBuildingFilter("All Buildings");
    setTypeFilter("All Room Types");
    setPaymentFilter("All Payments");
    setStatusFilter("All Status");
    setStartDate("");
    setEndDate("");
  };

  const filterStyle = "px-5 py-2.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 outline-none shadow-sm cursor-pointer hover:border-emerald-400 transition-all appearance-none";

  const getRoomTypeStyle = (type) => {
    const lowerType = type?.toLowerCase();
    if (lowerType === 'dormitory') return 'bg-purple-50 text-purple-600 border-purple-100';
    if (lowerType === 'individual with pullout' || lowerType === 'individual pullout') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="w-full p-8 bg-slate-50/50 min-h-screen font-sans overflow-y-auto scrollbar-hide">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Booking Schedules</h1>
          <p className="text-sm text-slate-500 font-medium italic mt-1">Schedule Management</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex flex-col px-5 py-2 min-w-[150px] group cursor-pointer hover:bg-slate-50 rounded-l-xl transition-colors">
                <span className="text-[10px] font-bold text-slate-400 mb-0.5">Check In</span>
                <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-emerald-500" />
                    <span className="text-[13px] font-bold text-slate-700">
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
            <div className="relative flex flex-col px-5 py-2 min-w-[150px] group cursor-pointer hover:bg-slate-50 rounded-r-xl transition-colors">
                <span className="text-[10px] font-bold text-slate-400 mb-0.5">Check Out</span>
                <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-slate-300" />
                    <span className="text-[13px] font-bold text-slate-700">
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

      {/* FILTERS */}
      <div className="flex flex-col lg:flex-row items-start justify-between mb-8 gap-6">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Guest Name..."
            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-full text-[12px] font-medium outline-none w-80 shadow-sm focus:ring-4 focus:ring-emerald-500/5 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 px-4 rounded-[32px] border border-slate-100 shadow-sm">
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
              <option value="cancelled">Cancelled</option>
            </select>

            <select className={filterStyle} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option>All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <button onClick={resetFilters} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase mr-4 tracking-widest">
            <RotateCcw size={11} />
            Clear Filter
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest Profile</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room Selection</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stay Duration</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredBookings.length ? (
              filteredBookings.map((b) => {
                const cin = b.check_in || b.slotDate || b.date;
                const cout = b.check_out || b.checkOutDate;
                const nights = calculateNights(cin, cout);
                const roomCount = b.room_ids?.length || 0;

                const userImage = b.user_id?.image;
                const fullImageUrl = userImage 
                  ? (userImage.startsWith('http') ? userImage : `${backendUrl}/${userImage}`)
                  : null;

                return (
                  <tr key={b._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-8 py-6 align-top">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center flex-shrink-0">
                          {fullImageUrl ? (
                             <img 
                               src={fullImageUrl} 
                               alt={b.user_id?.name} 
                               className="h-full w-full object-cover"
                               onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                             />
                          ) : null}
                          <div className={`${fullImageUrl ? 'hidden' : 'block'} text-slate-300`}>
                             <User size={24} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-[13px] font-black text-slate-800 leading-none mb-1">{b.user_id?.name || "Guest Name"}</span>
                          <div className="flex items-center gap-1.5 text-slate-400">
                             <Mail size={10} />
                             <span className="text-[10px] font-medium tracking-tight">{b.user_id?.email || "No email"}</span>
                          </div>
                          {b.user_id?.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                               <Phone size={10} className="text-emerald-400" />
                               <span className="text-[10px] font-bold tracking-tight">{b.user_id.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6 align-top">
                        <div className="flex flex-col gap-2.5">
                            {roomCount > 1 && (
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <Layers size={11} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Multi-Room ({roomCount})</span>
                                </div>
                            )}
                            {b.room_ids?.map((room, idx) => (
                                <div key={idx} className="flex flex-col p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 shadow-sm relative">
                                    <div className="flex items-center justify-between mb-1.5 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Home size={13} className="text-slate-400" />
                                            <span className="text-[11px] font-bold text-slate-700 leading-tight">{room.name}</span>
                                        </div>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            {room.building}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Tag size={10} className="text-slate-300 ml-0.5" />
                                        <span className={`text-[9px] font-bold uppercase tracking-tight px-1 rounded ${getRoomTypeStyle(room.room_type)}`}>
                                            {room.room_type || 'Individual'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </td>

                    <td className="px-8 py-6 align-top">
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2 text-slate-700 bg-white border border-slate-100 w-fit px-3 py-1.5 rounded-lg shadow-sm">
                           <span className="text-[11px] font-bold">{formatDatePHT(cin)}</span>
                           <ArrowRight size={12} className="text-slate-300" />
                           <span className="text-[11px] font-bold">{formatDatePHT(cout)}</span>
                        </div>
                        {nights && (
                           <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                                 <Moon size={10} /> {nights} {nights === 1 ? 'Night' : 'Nights'}
                              </span>
                           </div>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center align-top">
                      <div className="mt-1">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border shadow-sm ${
                            b.status?.toLowerCase() === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : b.status?.toLowerCase() === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {b.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6 align-top">
                      <div className="flex flex-col mt-1">
                        <p className="text-base font-black text-slate-800 tracking-tighter">
                            ₱{(b.total_price || b.amount || 0).toLocaleString()}
                        </p>
                        <span className={`mt-1.5 w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          b.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {b.paymentStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="5" className="px-8 py-24 text-center text-slate-400 font-medium italic">No results found matching your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffBookings;