import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { StaffContext } from "../../context/StaffContext";
import {
  ArrowUpDown, Search, User, RotateCcw, CalendarDays, ArrowRight,
  Home, Layers, Phone, CheckCircle2, Building2,
  Clock, BarChart3, ChevronDown, 
  AlertCircle, XCircle, X, Mail, Users, ChevronUp, Tag,
  Package, Info, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";
import FilterDropdown from "../../components/Admin/FilterDropdown";
import {
  getAvailableStayActions,
  getStayConfirmationDetails,
  getStayStatusDescription,
  getStayStatusMeta,
  matchesBookingStatusFilter,
} from "../../utils/bookingStayStatus";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import {
  formatDatePHT as formatDatePHTValue,
  getPHDateValue,
} from "../../utils/dateTime";
import {
  matchesRealtimeEntity,
  STAFF_REALTIME_EVENT_NAME,
} from "../../utils/realtime";

const BOOKINGS_PER_PAGE = 8;
const getBookingRoomType = (item) =>
  String(item?.roomId?.roomType || item?.roomType || "").trim();

const getBookingBuilding = (item) =>
  String(item?.roomId?.building || item?.building || "").trim();

// --- HELPER COMPONENT: Status Badge ---
const StatusBadge = ({ status }) => {
  let styles = "bg-slate-100 text-slate-500 border-slate-200";
  let Icon = Clock;
  const s = String(status || "").replace(/[_-\s]/g, "").toLowerCase();

  if (["approved", "confirmed", "checkedin"].includes(s)) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-100";
    Icon = CheckCircle2;
  } else if (s === 'pending' || s === 'cancellationpending') {
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

const StayStatusBadge = ({ booking }) => {
  const meta = getStayStatusMeta(booking);

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${meta.className} inline-flex items-center gap-1.5`}>
      <CheckCircle2 size={10} />
      {meta.label}
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
    .map(item => item.packageId)
    .filter(pkg => pkg); // remove null packages
};

  const packagesList = getPackagesList();
  const roomList = booking.bookingItems || [];
  const bookingTitle =
    String(booking.bookingName || "").trim() ||
    roomList[0]?.roomId?.name ||
    packagesList[0]?.name ||
    "Reservation";
  const showCustomerPhone = booking.userId?.authProvider !== "google";

  const visibleRooms = showAllRooms ? roomList : roomList.slice(0, 2);
  const visiblePackages = showAllPackages ? packagesList : packagesList.slice(0, 1);
  const stayConfirmationDetails = getStayConfirmationDetails(booking);
  const stayMeta = getStayStatusMeta(booking);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-r from-slate-900 to-black p-6 flex items-end">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            aria-label="Close booking details"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <CalendarDays size={28} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                Booking Details
              </p>
              <h2 className="text-xl font-black text-white leading-none">{bookingTitle}</h2>
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
                  {booking.userId?.image ? (
                    <img src={booking.userId.image.startsWith('http') ? booking.userId.image : `${backendUrl}/${booking.userId.image}`} className="w-full h-full object-cover" alt="user" />
                  ) : (booking.userId?.firstName?.[0] || <User size={16}/>)}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-black text-slate-800 truncate">{booking.userId?.firstName} {booking.userId?.lastName || booking.userId?.name}</p>
                <div className="mt-1 space-y-1.5 w-full">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                        <Mail size={10} className="shrink-0" /> 
                        <span className="break-all leading-relaxed">{booking.userId?.email || "No Email"}</span>
                    </div>
                    {showCustomerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <Phone size={10} className="shrink-0" /> 
                          <span>{booking.userId?.phone || "No Phone"}</span>
                      </div>
                    )}
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
                <p className="text-xs font-black text-slate-700">{formatDate(getBookingCheckInDateValue(booking))}</p>
              </div>
              <ArrowRight size={14} className="text-blue-300" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Check-Out</p>
                <p className="text-xs font-black text-slate-700">{formatDate(getBookingCheckOutDateValue(booking))}</p>
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Stay Confirmation</p>
                <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${stayMeta.className}`}>
                  {stayMeta.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Check-In</p>
                    <span className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-600">
                      {stayConfirmationDetails.checkIn.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
                    {stayConfirmationDetails.checkIn.actorName || "No confirmer yet"}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    {stayConfirmationDetails.checkIn.timestamp || stayConfirmationDetails.checkIn.fallbackMessage}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Check-Out</p>
                    <span className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-600">
                      {stayConfirmationDetails.checkOut.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
                    {stayConfirmationDetails.checkOut.actorName || "No confirmer yet"}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    {stayConfirmationDetails.checkOut.timestamp || stayConfirmationDetails.checkOut.fallbackMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Units */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserved Units ({roomList.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleRooms.map((item, i) => {

  const room = item.roomId;
                const roomImg = (Array.isArray(room.images) && room.images.length > 0) 
                  ? room.images[0] 
                  : room.coverImage;

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
                        <p className="text-[10px] text-slate-500 font-medium">{room.roomType}</p>
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
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const StaffBookings = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [flashBookingId, setFlashBookingId] = useState(null);
  const handledFlashRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");
  const [typeFilter, setTypeFilter] = useState("All Room Types"); 
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("Newest First");
  
  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [activeStayActionKey, setActiveStayActionKey] = useState("");
  const filterRef = useRef(null);
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
    { value: "awaitingCheckIn", label: "Awaiting Check-In" },
    { value: "checkedIn", label: "Checked In" },
    { value: "checkedOut", label: "Checked Out" },
    { value: "noShow", label: "No-Show" },
    { value: "cancelled", label: "Cancelled" },
  ];

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
    if (!sToken || !backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["bookings"])) {
        fetchBookings();
      }
    };

    window.addEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [sToken, backendUrl]);

  const handleStayAction = async (bookingId, action) => {
    const actionKey = `${bookingId}:${action}`;
    setActiveStayActionKey(actionKey);

    try {
      const { data } = await axios.put(
        `${backendUrl}/api/staff/bookings/${bookingId}/stay-status`,
        { action },
        {
          headers: { token: sToken },
        }
      );

      if (data.success) {
        toast.success(data.message);
        await fetchBookings();
        return;
      }

      toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update stay status");
    } finally {
      setActiveStayActionKey("");
    }
  };

  useEffect(() => {
    if (sToken) fetchBookings();
  }, [sToken, backendUrl]);

  const triggerBookingFlash = (bookingId) => {
    if (!bookingId) return;
    setFlashBookingId(null);
    setTimeout(() => setFlashBookingId(`booking-${bookingId}`), 0);
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
    setTypeFilter("All Room Types");
    setStatusFilter("All Status");
    setSortOrder("Newest First");
    setStartDate("");
    setEndDate("");
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

  /* =======================================
     FILTERING & SORTING LOGIC
  ======================================= */
  useEffect(() => {
    let filtered = [...bookings];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((b) =>
        b.userId?.name?.toLowerCase().trim().includes(term) || 
        b._id?.toLowerCase().includes(term)
      );
    }

    if (buildingFilter !== "All Buildings") {
      filtered = filtered.filter((b) =>
        b.bookingItems?.some((item) => getBookingBuilding(item) === buildingFilter)
      );
    }

    if (typeFilter !== "All Room Types") {
      filtered = filtered.filter((b) =>
        b.bookingItems?.some((item) => getBookingRoomType(item).toLowerCase() === typeFilter.toLowerCase())
      );
    }

    if (statusFilter !== "All Status") {
      filtered = filtered.filter((b) => matchesBookingStatusFilter(b, statusFilter));
    }

    if (startDate || endDate) {
        filtered = filtered.filter((b) => {
          const rawDate = getBookingCheckInDateValue(b);
          if (!rawDate) return false;
          const bookingDateStr = getPHDateValue(rawDate);
          if (!bookingDateStr) return false;
          if (startDate && bookingDateStr < startDate) return false;
          if (endDate && bookingDateStr > endDate) return false;
          return true;
        });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookings(filtered);
  }, [searchTerm, buildingFilter, typeFilter, statusFilter, startDate, endDate, sortOrder, bookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, buildingFilter, typeFilter, statusFilter, startDate, endDate, sortOrder]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleStartDateChange = (value) => {
    setDateRangeError("");
    setStartDate(value);

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
  };

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
    setStatusFilter("All Status");
    setSortOrder("Newest First");
    setStartDate("");
    setEndDate("");
    setIsDateFilterActive(false);
  };

  const formatDatePHT = (dateInput) => {
    return formatDatePHTValue(dateInput) || "N/A";
  };

  // Stats matching the Admin Side logic exactly
  const stats = {
    total: bookings.filter((b) =>
      ["approved", "confirmed", "checkedin"].includes(
        String(b.status || "").replace(/[_-\s]/g, "").toLowerCase()
      )
    ).length,
    pending: bookings.filter(b => b.status?.toLowerCase() === 'pending').length,
    revenue: bookings
      .filter(b => b.status?.toLowerCase() !== 'cancelled' && (b.paymentStatus === 'paid' || b.payment === true))
      .reduce((acc, curr) => acc + (curr.totalPrice || curr.amount || 0), 0)
  };

  const renderStayActionButtons = (b) => (
    <>
      {getAvailableStayActions(b).canConfirmCheckIn && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "checkIn")}
          disabled={activeStayActionKey === `${b._id}:checkIn`}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          <CheckCircle2 size={12} />
          {activeStayActionKey === `${b._id}:checkIn` ? "Saving..." : "Confirm Check-In"}
        </button>
      )}

      {getAvailableStayActions(b).canMarkNoShow && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "noShow")}
          disabled={activeStayActionKey === `${b._id}:noShow`}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
        >
          <XCircle size={12} />
          {activeStayActionKey === `${b._id}:noShow` ? "Saving..." : "Mark No-Show"}
        </button>
      )}

      {getAvailableStayActions(b).canConfirmCheckOut && (
        <button
          type="button"
          onClick={() => handleStayAction(b._id, "checkOut")}
          disabled={activeStayActionKey === `${b._id}:checkOut`}
          className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-100 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          <CheckCircle2 size={12} />
          {activeStayActionKey === `${b._id}:checkOut` ? "Saving..." : "Confirm Check-Out"}
        </button>
      )}
    </>
  );

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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">Booking Schedules</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage guest stays and reservations</p>
          </div>
          
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <div 
              onClick={() => setIsDateFilterActive(!isDateFilterActive)}
              className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all sm:w-auto sm:px-6 ${isDateFilterActive ? 'border-blue-600 ring-4 ring-blue-600/5' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <CalendarDays size={20} className={isDateFilterActive ? "text-blue-600" : "text-slate-400"} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Stay Period</span>
                <span className="truncate text-xs font-bold text-slate-700">
                  {startDate ? `${startDate} → ${endDate || '...'}` : "Select Date range"}
                </span>
              </div>
              <ChevronDown size={16} className={`ml-2 shrink-0 transition-transform duration-300 sm:ml-4 ${isDateFilterActive ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} />
            </div>

            {/* DATE FILTER DROPDOWN */}
            {isDateFilterActive && (
              <div className="absolute right-0 z-[100] mt-3 w-[min(340px,calc(100vw-1.5rem))] rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 sm:w-[340px]">
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
                  <button onClick={() => {setStartDate(""); setEndDate(""); setDateRangeError(""); setIsDateFilterActive(false);}} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Reset Dates & Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

     

      {/* SEARCH AND FILTERS */}
      <div className="mb-6 w-full">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search Guest..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
            <FilterDropdown
              label="Sort"
              options={sortOptions}
              value={sortOrder}
              onChange={setSortOrder}
              icon={ArrowUpDown}
              neutralValue="Newest First"
              triggerClassName="w-full justify-between bg-white text-[13px] font-bold sm:w-auto sm:min-w-[148px]"
              menuClassName="w-full sm:w-52"
            />
            <FilterDropdown
              label="Building"
              options={buildingOptions}
              value={buildingFilter}
              onChange={setBuildingFilter}
              icon={Building2}
              neutralValue="All Buildings"
              triggerClassName="w-full justify-between bg-white text-[13px] font-bold sm:w-auto sm:min-w-[156px]"
              menuClassName="w-full sm:w-56"
            />
            <FilterDropdown
              label="Room Type"
              options={roomTypeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              icon={Home}
              neutralValue="All Room Types"
              triggerClassName="w-full justify-between bg-white text-[13px] font-bold sm:w-auto sm:min-w-[190px]"
              menuClassName="w-full sm:w-64"
            />
            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={AlertCircle}
              neutralValue="All Status"
              triggerClassName="w-full justify-between bg-white text-[13px] font-bold sm:w-auto sm:min-w-[145px]"
              menuClassName="w-full sm:w-48"
            />
            <button onClick={resetFilters} className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-100 sm:h-auto sm:w-auto sm:p-2.5">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="mb-12 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:hidden">
          {filteredBookings.length > 0 ? (
            paginatedBookings.map((b) => (
              <div
                id={`booking-${b._id}`}
                key={b._id}
                className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm">
                    {b.userId?.image ? (
                      <img
                        src={b.userId.image.startsWith('http') ? b.userId.image : `${backendUrl}/${b.userId.image}`}
                        className="h-full w-full object-cover"
                        alt="user"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-slate-800">
                      {b.userId?.name || `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim() || "Guest Name"}
                    </p>
                    <div className="mt-1 flex items-start gap-1.5 text-[11px] font-bold text-slate-500">
                      <Mail size={12} className="mt-0.5 shrink-0 text-slate-300" />
                      <span className="break-all">{b.userId?.email || "No Email"}</span>
                    </div>
                    {b.userId?.authProvider !== "google" && b.userId?.phone && (
                      <div className="mt-1 flex items-start gap-1.5 text-[11px] font-bold text-slate-400">
                        <Phone size={12} className="mt-0.5 shrink-0 text-slate-300" />
                        <span>{b.userId?.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="flex w-full flex-col gap-1">
                      {b.bookingItems?.slice(0, 1).map((item, idx) => {
                        const room = item.roomId;

                        return (
                          <div key={idx} className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5">
                            <Home size={10} className="text-slate-400" />
                            <span className="truncate text-[10px] font-black text-slate-600">
                              {room?.name || "Room"}
                            </span>
                            {room?.capacity && (
                              <span className="ml-auto flex items-center gap-0.5 border-l border-slate-200 pl-1.5 text-[9px] text-slate-400">
                                <Users size={8} /> {room.capacity}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {b.bookingItems?.length > 1 && (
                        <span className="px-1 text-[9px] font-bold text-slate-400">
                          +{b.bookingItems.length - 1} more room{b.bookingItems.length - 1 > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="mt-2 flex w-fit items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-blue-600 hover:text-blue-700 hover:underline">
                      <Info size={10} /> View Full Details
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <StatusBadge status={b.status} />
                    <StayStatusBadge booking={b} />
                  </div>

                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                    {getStayStatusDescription(b)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {renderStayActionButtons(b)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <Search size={32} className="opacity-50" />
                <p className="text-sm font-bold">No results found matching your filters.</p>
              </div>
            </div>
          )}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Profile</th>
                <th className="pl-0 pr-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[63px] block">Booking Details</span>
                </th>
                <th className="pl-2 pr-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[10px] block">Current Status</span>
                </th>
                <th className="w-[220px] px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="-ml-[15px] inline-block">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.length > 0 ? (
                paginatedBookings.map((b) => {
                  return (
                    <tr
                      id={`booking-${b._id}`}
                      key={b._id}
                      className={`hover:bg-slate-50/50 transition-colors group ${flashBookingId === `booking-${b._id}` ? "booking-flash" : ""}`}
                    >
                      
                      {/* GUEST PROFILE */}
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-start gap-4">
                          <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                            {b.userId?.image ? (
                              <img src={b.userId.image.startsWith('http') ? b.userId.image : `${backendUrl}/${b.userId.image}`} className="w-full h-full object-cover" alt="user" />
                            ) : <User size={20}/>}
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <p className="text-sm font-black text-slate-800 leading-tight">{b.userId?.name || `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim() || "Guest Name"}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 min-w-0">
                              <Mail size={10} className="shrink-0 text-slate-300"/>
                              <span className="break-all leading-relaxed">{b.userId?.email || "No Email"}</span>
                            </div>
                            {b.userId?.authProvider !== "google" && b.userId?.phone && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                <Phone size={10} className="shrink-0 text-slate-300"/>
                                <span>{b.userId?.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* BOOKING DETAILS */}
                      <td className="pl-0 pr-4 py-5 align-top">
                        <div className="-ml-[63px] flex flex-col items-start gap-2 text-left">
                          <div className="flex w-full max-w-[220px] flex-col items-start gap-1">
                              {b.bookingItems?.slice(0, 1).map((item, idx) => {
  const room = item.roomId;

  return (
    <div key={idx} className="flex items-center justify-start gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
        <Home size={10} className="text-slate-400" />

        <span className="text-[10px] font-black text-slate-600 truncate">
          {room?.name || "Room"}
        </span>

        {room?.capacity && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto border-l border-slate-200 pl-1.5">
            <Users size={8}/> {room.capacity}
          </span>
        )}
    </div>
  );
})}
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

                      {/* CURRENT STATUS */}
                      <td className="pl-2 pr-4 py-5 align-top">
                        <div className="-ml-[10px] flex max-w-[190px] flex-col items-start gap-2">
                          <StatusBadge status={b.status} />
                          <StayStatusBadge booking={b} />
                          <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
                            {getStayStatusDescription(b)}
                          </p>
                        </div>
                      </td>

                      <td className="w-[220px] px-4 py-5 align-top">
                        <div className="-ml-[15px] flex flex-wrap items-center justify-center gap-2">
                          {renderStayActionButtons(b)}
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


