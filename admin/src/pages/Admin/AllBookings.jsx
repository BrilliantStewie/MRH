import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  ArrowUpDown, Search, User, RotateCcw, CalendarDays, ArrowRight,
  Moon, Home, Layers, Phone, CheckCircle, Building2,
  Package, Info, X, Clock, BarChart3, ChevronDown, Trash2,
  AlertCircle, CheckCircle2, XCircle, Banknote, Mail, Users, ChevronUp, ChevronLeft, ChevronRight
} from "lucide-react";
import FilterDropdown from "../../components/Admin/FilterDropdown";

const BOOKINGS_PER_PAGE = 8;
const getBookingRoomType = (item) =>
  String(item?.room_id?.roomType || item?.room_id?.room_type || item?.roomType || item?.room_type || "").trim();

const getBookingBuilding = (item) =>
  String(item?.room_id?.building || item?.building || "").trim();

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
  } else if (s === "cancelled") {
    styles = "bg-rose-50 text-rose-700 border-rose-100";
    Icon = XCircle;
  } else if (s === "declined") {
    // GRAY STYLE FOR DECLINED
    styles = "bg-slate-100 text-slate-600 border-slate-200 shadow-sm";
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
  if (!booking.bookingItems) return [];

  return booking.bookingItems
    .map(item => item.package_id)
    .filter(pkg => pkg); // remove null
};

  const packagesList = getPackagesList();
  const roomList = booking.bookingItems || [];
  const bookingTitle =
    String(booking.bookingName || "").trim() ||
    roomList[0]?.room_id?.name ||
    packagesList[0]?.name ||
    "Reservation";
  const showCustomerPhone = booking.user_id?.authProvider !== "google";

  const visibleRooms = showAllRooms ? roomList : roomList.slice(0, 2);
  const visiblePackages = showAllPackages ? packagesList : packagesList.slice(0, 1);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        <div className="relative h-28 bg-gradient-to-r from-slate-900 to-black p-6 flex items-end">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <CalendarDays size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-none">{bookingTitle}</h2>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                  {booking.user_id?.image ? (
                    <img src={booking.user_id.image.startsWith('http') ? booking.user_id.image : `${backendUrl}/${booking.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                  ) : (booking.user_id?.firstName?.[0])}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-black text-slate-800 truncate">{booking.user_id?.firstName} {booking.user_id?.lastName}</p>
                <div className="mt-1 space-y-1.5 w-full">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                        <Mail size={10} className="shrink-0" /> 
                        <span className="break-all leading-relaxed">{booking.user_id?.email || "No Email"}</span>
                    </div>
                    {showCustomerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <Phone size={10} className="shrink-0" /> 
                          <span>{booking.user_id?.phone || "No Phone"}</span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Period</h3>
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Check-In</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_in || booking.date)}</p>
              </div>
              <ArrowRight size={14} className="text-blue-300" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Check-Out</p>
                <p className="text-xs font-black text-slate-700">{formatDate(booking.check_out || booking.checkOutDate)}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserved Units ({roomList.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleRooms.map((room, i) => {
                const roomData = room.room_id;

const roomImg = (Array.isArray(roomData?.images) && roomData.images.length > 0)
  ? roomData.images[0]
  : roomData?.cover_image;

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
                        <p className="text-[11px] font-black text-slate-800">
  {room.room_id?.name || "Room"}
</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{room.room_id?.building}</p>
                      </div>
                      <div className="flex justify-between items-end mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium">{room.room_id?.roomType || room.room_id?.room_type}</p>
                        <p className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 rounded-md flex items-center gap-1"><Users size={10} /> {room.room_id?.capacity}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
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
                          <p className="text-sm font-black text-slate-800">{pkg?.name || "Package"}</p>
                          <p className="text-sm font-black text-violet-600">₱{pkg?.price ? pkg.price.toLocaleString() : "0"}</p>
                        </div>
                        {pkg.description && (
                          <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {pkg?.description}
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

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billing</p>
            <p className="text-xl font-black text-slate-900">₱{booking.total_price?.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionAlertModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  title,
  description,
  confirmLabel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-6">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
              <AlertCircle size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400">
                Booking Action
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
              Warning
            </p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700">
              Review this action carefully before proceeding.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const AllBookings = () => {
 const { aToken, allBookings, getAllBookings, approveBooking, declineBooking, paymentConfirmed, approveCancellation, backendUrl } = useContext(AdminContext);
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const filterRef = useRef(null);
  const [flashBookingId, setFlashBookingId] = useState(null);
  const handledFlashRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Room Types");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [yearFilter, setYearFilter] = useState("All Years");

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visiblePageCount = Math.min(3, totalPages);
  const halfVisiblePageCount = Math.floor(visiblePageCount / 2);
  let visiblePageStart = Math.max(1, currentPageSafe - halfVisiblePageCount);
  let visiblePageEnd = visiblePageStart + visiblePageCount - 1;

  if (visiblePageEnd > totalPages) {
    visiblePageEnd = totalPages;
    visiblePageStart = Math.max(1, visiblePageEnd - visiblePageCount + 1);
  }

  const visiblePageNumbers = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, index) => visiblePageStart + index
  );
  const pageStartIndex = (currentPageSafe - 1) * BOOKINGS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(pageStartIndex, pageStartIndex + BOOKINGS_PER_PAGE);
  const pageStart = filteredBookings.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = Math.min(pageStartIndex + BOOKINGS_PER_PAGE, filteredBookings.length);
  const sortOptions = [
    { value: "Newest First", label: "Newest First" },
    { value: "Oldest First", label: "Oldest First" },
  ];
  const buildingOptions = [
    { value: "All Buildings", label: "All Buildings" },
    ...Array.from(
      new Set(
        (bookings || [])
          .flatMap((booking) => booking.bookingItems || [])
          .map((item) => getBookingBuilding(item))
          .filter(Boolean)
      )
    )
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value })),
  ];
  const roomTypeOptions = [
    { value: "All Room Types", label: "All Room Types" },
    ...Array.from(
      new Set(
        (bookings || [])
          .flatMap((booking) => booking.bookingItems || [])
          .map((item) => getBookingRoomType(item))
          .filter(Boolean)
      )
    )
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value })),
  ];
  const statusOptions = [
    { value: "All Status", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "cancelled", label: "Cancelled" },
    { value: "cancellation_pending", label: "Cancel Pending" },
    { value: "declined", label: "Declined" },
  ];

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

  const triggerBookingFlash = (bookingId) => {
    if (!bookingId) return;
    setFlashBookingId(null);
    setTimeout(() => setFlashBookingId(`booking-${bookingId}`), 0);
  };

  const closeActionAlert = () => {
    if (isActionSubmitting) return;
    setActionAlert(null);
  };

  const handleActionAlertConfirm = async () => {
    if (!actionAlert?.bookingId) return;

    setIsActionSubmitting(true);

    try {
      if (actionAlert.type === "decline-booking") {
        await declineBooking(actionAlert.bookingId);
      }
      setActionAlert(null);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flashParam = params.get("flash");
    const bookingIdParam = params.get("bookingId");
    const stateBookingId = location.state?.bookingId;
    const hasFlash = Boolean(flashParam || location.state?.flashNonce);
    const resolvedBookingId = bookingIdParam || stateBookingId;

    if (!resolvedBookingId || !hasFlash) return;
    const flashKey = flashParam || location.state?.flashNonce;
    if (handledFlashRef.current === flashKey) return;
    handledFlashRef.current = flashKey;

    setSearchTerm("");
    setBuildingFilter("All Buildings");
    setStatusFilter("All Status");
    setRoomTypeFilter("All Room Types");
    setSortOrder("Newest First");
    setStartDate("");
    setEndDate("");
    setMonthFilter("All Months");
    setYearFilter("All Years");
    triggerBookingFlash(resolvedBookingId);

    if (flashParam) {
      params.delete("flash");
      const cleanedSearch = params.toString();
      const cleanedUrl = `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`;
      window.history.replaceState(window.history.state, "", cleanedUrl);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    if (!flashBookingId) return;
    const bookingId = flashBookingId.replace("booking-", "");
    const bookingIndex = filteredBookings.findIndex((booking) => booking._id === bookingId);
    if (bookingIndex >= 0) {
      const targetPage = Math.floor(bookingIndex / BOOKINGS_PER_PAGE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
        return;
      }
    }

    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(() => {
      const element = document.getElementById(flashBookingId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
      attempts += 1;
    }, 250);
    return () => clearInterval(interval);
  }, [flashBookingId, filteredBookings, currentPage]);

  useEffect(() => {
    if (!Array.isArray(bookings)) return;
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => `${b.user_id?.firstName} ${b.user_id?.lastName}`.toLowerCase().includes(term) || b._id.toLowerCase().includes(term));
    }
    
    if (buildingFilter !== "All Buildings") filtered = filtered.filter(b => b.bookingItems?.some(r => getBookingBuilding(r) === buildingFilter));
    
    if (statusFilter !== "All Status") {
      filtered = filtered.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (roomTypeFilter !== "All Room Types") {
      filtered = filtered.filter(b => b.bookingItems?.some(r => getBookingRoomType(r).toLowerCase() === roomTypeFilter.toLowerCase()));
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, buildingFilter, statusFilter, roomTypeFilter, sortOrder, startDate, endDate, monthFilter, yearFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleStartDateChange = (value) => {
    setDateRangeError("");
    setStartDate(value);
    setMonthFilter("All Months");

    if (value && endDate && endDate < value) {
      setEndDate("");
      setDateRangeError("Check out must not be earlier than check in.");
    }
  };

  const handleEndDateChange = (value) => {
    if (value && startDate && value < startDate) {
      setDateRangeError("Check out must not be earlier than check in.");
      return;
    }

    setDateRangeError("");
    setEndDate(value);
    setMonthFilter("All Months");
  };

  // Total Bookings now only counts "approved", "confirmed", or "checked_in" statuses
  const stats = {
    total: bookings.filter(b => ["approved", "confirmed", "checked_in"].includes(b.status?.toLowerCase())).length,
    pending: bookings.filter(b => b.status?.toLowerCase() === 'pending').length,
    revenue: bookings
      .filter(b => b.status?.toLowerCase() !== 'cancelled' && (b.paymentStatus === 'paid' || b.payment === true))
      .reduce((acc, curr) => acc + (curr.total_price || 0), 0)
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#f8fafc] px-3 pt-4 pb-0 font-sans md:px-5 md:pt-8 md:pb-0">
      <style>{`
        @keyframes bookingFlashRow {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.12); }
        }
        .booking-flash td {
          animation: bookingFlashRow 0.9s ease-in-out 0s 3;
        }
      `}</style>
      
      {/* HEADER SECTION */}
      <div className="mb-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">All Bookings</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage and track guest reservations</p>
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
                  {startDate ? `${startDate} → ${endDate || '...'}` : monthFilter !== "All Months" ? `${monthFilter} ${yearFilter}` : "Select Date range"}
                </span>
              </div>
              <ChevronDown size={16} className={`ml-4 transition-transform duration-300 ${isDateFilterActive ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} />
            </div>

            {isDateFilterActive && (
              <div className="absolute right-0 mt-3 w-[340px] bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 z-[100] animate-in zoom-in-95 duration-200">
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Calendar Range</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check In</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer text-slate-700" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 block px-1">Check Out</span>
                            <input type="date" className="w-full bg-transparent text-xs font-black p-1 outline-none cursor-pointer text-slate-700" value={endDate} min={startDate} onChange={(e) => handleEndDateChange(e.target.value)} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                    </div>
                    {dateRangeError && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-600">
                        <AlertCircle size={12} />
                        <span>{dateRangeError}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative flex items-center"><div className="flex-grow border-t border-slate-100"></div><span className="px-3 text-[9px] font-black text-slate-300">OR QUICK SELECT</span><div className="flex-grow border-t border-slate-100"></div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="bg-slate-50 border-none rounded-xl text-xs font-bold p-3 outline-none cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors" value={monthFilter} onChange={(e) => {setDateRangeError(""); setMonthFilter(e.target.value); setStartDate(""); setEndDate("");}}>
                      <option>All Months</option>
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="bg-slate-50 border-none rounded-xl text-xs font-bold p-3 outline-none cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors" value={yearFilter} onChange={(e) => {setDateRangeError(""); setYearFilter(e.target.value); setStartDate(""); setEndDate("");}}>
                      <option>All Years</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button onClick={() => {setStartDate(""); setEndDate(""); setDateRangeError(""); setMonthFilter("All Months"); setYearFilter("All Years"); setIsDateFilterActive(false);}} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Reset & Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="mb-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Revenue (Paid)</p><p className="text-xl font-black text-slate-800">₱{stats.revenue.toLocaleString()}</p></div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="mb-6 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search Guest..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Sort"
              options={sortOptions}
              value={sortOrder}
              onChange={setSortOrder}
              icon={ArrowUpDown}
              neutralValue="Newest First"
              triggerClassName="min-w-[148px] justify-between bg-slate-50 text-[13px] font-bold"
              menuClassName="w-52"
            />
            <FilterDropdown
              label="Building"
              options={buildingOptions}
              value={buildingFilter}
              onChange={setBuildingFilter}
              icon={Building2}
              neutralValue="All Buildings"
              triggerClassName="min-w-[156px] justify-between bg-slate-50 text-[13px] font-bold"
              menuClassName="w-56"
            />
            <FilterDropdown
              label="Room Type"
              options={roomTypeOptions}
              value={roomTypeFilter}
              onChange={setRoomTypeFilter}
              icon={Home}
              neutralValue="All Room Types"
              triggerClassName="min-w-[190px] justify-between bg-slate-50 text-[13px] font-bold"
              menuClassName="w-64"
            />
            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={AlertCircle}
              neutralValue="All Status"
              triggerClassName="min-w-[150px] justify-between bg-slate-50 text-[13px] font-bold"
              menuClassName="w-52"
            />
            <button onClick={() => { setSearchTerm(""); setBuildingFilter("All Buildings"); setRoomTypeFilter("All Room Types"); setStatusFilter("All Status"); setSortOrder("Newest First"); setStartDate(""); setEndDate(""); setMonthFilter("All Months"); setYearFilter("All Years"); }} className="p-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="mb-12 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Profile</th>
                <th className="pl-0 pr-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[63px] block">Booking Details</span>
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-4 inline-block">Stay Period</span>
                </th>
                <th className="pl-2 pr-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[10px] block">Current Status</span>
                </th>
                <th className="w-[220px] px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[25px] inline-block">Actions</span>
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing & Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.length > 0 ? paginatedBookings.map((b) => (
                <tr
                  id={`booking-${b._id}`}
                  key={b._id}
                  className={`hover:bg-slate-50/50 transition-colors group ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                        {b.user_id?.image ? <img src={b.user_id.image.startsWith('http') ? b.user_id.image : `${backendUrl}/${b.user_id.image}`} className="w-full h-full object-cover" alt="user" /> : <User size={20}/>}
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <p className="text-sm font-black text-slate-800 leading-tight">{b.user_id?.firstName} {b.user_id?.lastName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 min-w-0">
                          <Mail size={10} className="shrink-0 text-slate-300"/>
                          <span className="break-all leading-relaxed">{b.user_id?.email || "No Email"}</span>
                        </div>
                        {b.user_id?.authProvider !== "google" && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Phone size={10} className="shrink-0 text-slate-300"/>
                            <span>{b.user_id?.phone || "No Phone"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="pl-0 pr-4 py-5 align-top">
                    <div className="-ml-[63px] flex flex-col items-start gap-2 text-left">
                        <div className="flex w-full max-w-[220px] flex-col items-start gap-1">
                            {b.bookingItems?.slice(0, 1).map((room, idx) => (
                                <div key={idx} className="flex items-center justify-start gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                                    <Home size={10} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-600 truncate">
  {room.room_id?.name || "Room"}
</span>
                                    {room.room_id?.capacity && <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto border-l border-slate-200 pl-1.5"><Users size={8}/> {room.room_id?.capacity}</span>}
                                </div>
                            ))}
                            {b.bookingItems?.length > 1 && (
                                <span className="px-1 text-[9px] font-bold text-slate-400">
                                    +{b.bookingItems.length - 1} more room{b.bookingItems.length - 1 > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-1 flex w-fit items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-blue-600 hover:text-blue-700 hover:underline">
                          <Info size={10}/> View Full Details
                        </button>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="-ml-4 flex justify-center">
                      <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-100 bg-slate-100/50 px-2 py-1 text-[11px] font-bold text-slate-600">
                        {formatDatePHT(b.check_in || b.date)} <ArrowRight size={10} className="text-slate-300" /> {formatDatePHT(b.check_out || b.checkOutDate)}
                      </div>
                    </div>
                  </td>
                  <td className="pl-2 pr-4 py-5 align-top">
                    <div className="-ml-[10px] flex justify-start">
                      <StatusBadge status={b.status} />
                    </div>
                  </td>
                  <td className="w-[220px] px-4 py-5 align-top">
                    <div className="-ml-[25px] flex items-center justify-center gap-2">
                        {/* ACTION BUTTONS */}
                        {b.status?.toLowerCase() === "pending" && (
                          <>
                             <button 
                                 onClick={() => approveBooking(b._id)} 
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
                             >
                                 <CheckCircle size={12}/> Approve
                             </button>
                             <button 
                                 onClick={() =>
                                   setActionAlert({
                                     type: "decline-booking",
                                     bookingId: b._id,
                                     title: "Decline Booking Request",
                                     description: "This booking request will be declined and the guest will no longer proceed with this reservation unless they create a new request.",
                                     confirmLabel: "Decline Booking",
                                   })
                                 }
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                             >
                                 <X size={12}/> Decline
                             </button>
                          </>
                        )}

                        {/* PAYMENT BUTTON */}
                        {b.status?.toLowerCase() === "approved" && 
                          (b.paymentStatus !== 'paid' && b.payment !== true) && 
                          (b.paymentMethod === 'cash' || b.paymentMethod === 'gcash') && (
                          <button 
                            onClick={() => paymentConfirmed(b._id)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                          >
                            <Banknote size={12}/> Confirm Payment
                          </button>
                        )}

                        {/* CANCELLATION BUTTONS */}
                        {b.status?.toLowerCase() === "cancellation_pending" && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => approveCancellation(b._id, "approve")} 
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                            >
                              <Trash2 size={12}/> Approve
                            </button>
                            <button 
                              onClick={() => approveCancellation(b._id, "reject")} 
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                              <X size={12}/> Decline
                            </button>
                          </div>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-col items-start text-left">
                      <p className="text-sm font-black text-slate-800">₱{b.total_price?.toLocaleString()}</p>
                      <div className={`mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${ (b.paymentStatus === 'paid' || b.payment === true) ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {(b.paymentStatus === 'paid' || b.payment === true) ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                          {(b.paymentStatus === 'paid' || b.payment === true) ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
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
        {filteredBookings.length > 0 && (
          <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full text-left sm:w-auto">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Booking Directory
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-800">
                Showing {pageStart}-{pageEnd} of {filteredBookings.length} bookings
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPageSafe === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {visiblePageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[9px] font-bold transition ${
                        currentPageSafe === page
                          ? "bg-slate-900 text-white shadow-md"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPageSafe === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <BookingDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} booking={selectedBooking} formatDate={formatDatePHT} backendUrl={backendUrl} />
      <ActionAlertModal
        isOpen={Boolean(actionAlert)}
        onClose={closeActionAlert}
        onConfirm={handleActionAlertConfirm}
        isSubmitting={isActionSubmitting}
        title={actionAlert?.title}
        description={actionAlert?.description}
        confirmLabel={actionAlert?.confirmLabel}
      />
    </div>
  );
};

export default AllBookings;
