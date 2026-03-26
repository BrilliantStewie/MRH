import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Search, CalendarDays, MapPin, Loader2, CheckCircle2,
  ArrowUpDown, Calendar, ChevronDown, ChevronRight, Banknote, Star, Home, Clock, CornerDownRight, Tag, Wallet, X, Package, AlertTriangle
} from "lucide-react"; // 👈 Added Tag and Wallet icons here
import ReviewPage from "./ReviewPage"; // Ensure this path is correct
import venueOnlyImage from "../assets/mrh_about.jpg";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../utils/bookingDateFields";

// --- HELPER: Date Formatter ---
const formatDate = (dateInput) => {
  if (!dateInput) return "N/A";
  return new Date(dateInput).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// --- REUSABLE DROPDOWN COMPONENT ---
const CustomDropdown = ({ icon: Icon, value, onChange, options, defaultText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || defaultText;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1 md:flex-none" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full md:w-auto md:min-w-[180px] px-5 py-3 rounded-2xl border transition-all duration-300 outline-none ${isOpen
            ? "bg-slate-800 text-white border-slate-800 shadow-lg"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-md"
          }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon size={16} className={isOpen ? "text-slate-300" : "text-slate-400"} />
          <span className="text-sm font-semibold truncate">{value === 'all' ? defaultText : selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`ml-2 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : "text-slate-400"}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full min-w-[220px] bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
            <button
              onClick={() => { onChange('all'); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${value === 'all' ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
            >
              {defaultText}
              {value === 'all' && <CheckCircle2 size={14} className="text-emerald-500" />}
            </button>
            <div className="h-px bg-slate-100 my-1 mx-2"></div>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${value === opt.value ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <CheckCircle2 size={14} className="text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const MyBookings = () => {
  const { backendUrl, token, userData } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [slideTick, setSlideTick] = useState(0);
  const [showAllModalRooms, setShowAllModalRooms] = useState(false);
  const [showAllModalPackages, setShowAllModalPackages] = useState(false);
  const [showPaymentOptionsId, setShowPaymentOptionsId] = useState(null);
  const [flashBookingId, setFlashBookingId] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, bookingId: null, isApproved: false });
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cashDialog, setCashDialog] = useState({ open: false, bookingId: null });

  // Filters State
  const [activeTab, setActiveTab] = useState('all');
  const [showStatusTabs, setShowStatusTabs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    if (activeTab !== "all") {
      setShowStatusTabs(true);
    }
  }, [activeTab]);

  const handleStatusTabChange = (tab) => {
    if (tab === "all") {
      if (activeTab === "all") {
        setShowStatusTabs((current) => !current);
      } else {
        setActiveTab("all");
        setShowStatusTabs(true);
      }
      return;
    }

    setActiveTab(tab);
    setShowStatusTabs(true);
  };

  // Fetch Data
  const fetchUserBookings = async () => {
    try {
      const { data } = await axios.get(backendUrl + `/api/booking/user/bookings?t=${Date.now()}`, { headers: { token } });
      if (data.success) setBookings(data.bookings);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };

  // Payment Verification
  const verifyPaymentStatus = async (bookingId) => {
    const toastId = toast.loading("Verifying payment...");
    try {
      const { data } = await axios.post(backendUrl + "/api/user/verify-payment", { bookingId }, { headers: { token } });
      if (data.success) {
        toast.update(toastId, { render: data.message || "Payment submitted. Awaiting admin confirmation.", type: "info", isLoading: false, autoClose: 2500 });
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchUserBookings();
      } else {
        toast.update(toastId, { render: data.message, type: "warning", isLoading: false, autoClose: 3000 });
      }
    } catch {
      toast.update(toastId, { render: "Payment verification failed.", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  // Action Handlers
  const submitCashPayment = async (bookingId) => {
    const toastId = toast.loading("Setting cash payment...");
    try {
      const { data } = await axios.post(backendUrl + '/api/user/mark-cash', { bookingId }, { headers: { token } });
      if (data.success) {
        toast.update(toastId, { render: "Cash payment set. Proceed to counter.", type: "success", isLoading: false, autoClose: 2200 });
        fetchUserBookings();
      } else {
        toast.update(toastId, { render: data.message || "Unable to update payment method.", type: "error", isLoading: false, autoClose: 3000 });
      }
    } catch {
      toast.update(toastId, { render: "Cash payment update failed.", type: "error", isLoading: false, autoClose: 3000 });
    }
  }

  const handleCashPayment = (bookingId) => {
    setCashDialog({ open: true, bookingId });
  };

  const handleOnlinePayment = async (bookingId) => {
    const booking = bookings.find(b => b._id === bookingId);
    if (booking?.paymentStatus === "pending") {
      toast.warning("GCash checkout is already initiated.");
      return;
    }

    try {
      const toastId = toast.loading("Preparing GCash checkout...");
      const { data } = await axios.post(backendUrl + "/api/user/create-checkout-session", { 
  bookingId: booking._id,
  amount: booking.totalPrice, 
  description: `Room Booking ID: ${booking._id}`
}, { headers: { token } });

      if (data.success) {
        toast.update(toastId, { render: "Opening GCash checkout...", type: "success", isLoading: false, autoClose: 1200 });
        window.location.href = data.checkoutUrl;
      } else {
        toast.update(toastId, { render: data.message || "Unable to start GCash checkout.", type: "error", isLoading: false, autoClose: 3000 });
      }
    } catch {
      toast.error("GCash connection failed.");
    }
  };

  const handleCancelBooking = async (bookingId, status) => {
    // If approved, it's a request. If pending, it's automatic.
    const isApproved = status === 'approved';
    setCancelDialog({ open: true, bookingId, isApproved });
  };

  const handleOpenReview = (e, booking) => {
    e.stopPropagation(); 
    setReviewBooking(booking); 
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (Array.isArray(imagePath)) return imagePath.length > 0 ? getImageUrl(imagePath[0]) : null;
    if (typeof imagePath !== 'string') return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  useEffect(() => {
    if (token) {
      fetchUserBookings();
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true' && urlParams.get('bookingId')) {
        verifyPaymentStatus(urlParams.get('bookingId'));
      }
    }
  }, [token]);

  const triggerBookingFlash = (bookingId) => {
    if (!bookingId) return;
    setFlashBookingId(null);
    setTimeout(() => setFlashBookingId(`booking-${bookingId}`), 0);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookingIdParam = params.get("bookingId");
    const stateBookingId = location.state?.bookingId;
    const stateHighlightType = location.state?.highlightType;
    const stateMessage = location.state?.notificationMessage || "";
    const resolvedBookingId = bookingIdParam || stateBookingId;

    if (resolvedBookingId) {
      setActiveTab("all");
      setSearchQuery("");
      setMonthFilter("all");
      setYearFilter("all");
      triggerBookingFlash(resolvedBookingId);
      return;
    }
    
    if (
      stateHighlightType === "booking_update" &&
      /approved/i.test(stateMessage) &&
      bookings.length > 0
    ) {
      const latestApproved = [...bookings]
        .filter((b) => b.status === "approved")
        .sort((a, b) => {
          const aDate = new Date(a.updatedAt || a.createdAt || getBookingCheckInDateValue(a) || 0).getTime();
          const bDate = new Date(b.updatedAt || b.createdAt || getBookingCheckInDateValue(b) || 0).getTime();
          return bDate - aDate;
        })[0];
      if (latestApproved?._id) {
        setActiveTab("all");
        setSearchQuery("");
        setMonthFilter("all");
        setYearFilter("all");
        triggerBookingFlash(latestApproved._id);
      }
    }
  }, [location.search, location.state, bookings]);

  useEffect(() => {
    if (!flashBookingId) return;
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
  }, [flashBookingId, bookings]);

  useEffect(() => {
    setShowAllModalRooms(false);
    setShowAllModalPackages(false);
  }, [selectedBooking?._id]);

  useEffect(() => {
    const id = setInterval(() => setSlideTick((tick) => tick + 1), 3500);
    return () => clearInterval(id);
  }, []);

  const getBookingSortTimestamp = (booking) => {
    const status = String(booking?.status || "").toLowerCase();
    const sortSource =
      status === "pending" || status === "cancellation_pending"
        ? booking?.createdAt || booking?.date || booking?.updatedAt || getBookingCheckInDateValue(booking)
        : getBookingCheckInDateValue(booking) || booking?.slotDate || booking?.date || booking?.createdAt;

    const parsedDate = new Date(sortSource);
    return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

  const filteredBookings = useMemo(() => {
  return bookings.filter(b => {

    const mainRoom =
  b.bookingItems && b.bookingItems.length > 0
    ? b.bookingItems[0].roomId
    : { name: "Room Details Unavailable" };

    const date = new Date(getBookingCheckInDateValue(b) || Date.now());

    if (activeTab !== 'all' && b.status !== activeTab) return false;
    if (monthFilter !== 'all' && date.getMonth().toString() !== monthFilter) return false;
    if (yearFilter !== 'all' && date.getFullYear().toString() !== yearFilter) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const roomName = mainRoom.name ? mainRoom.name.toLowerCase() : "";
      if (!roomName.includes(query) && !b._id.toLowerCase().includes(query)) return false;
    }

    return true;

  }).sort((a, b) =>
    sortOrder === 'newest'
      ? getBookingSortTimestamp(b) - getBookingSortTimestamp(a)
      : getBookingSortTimestamp(a) - getBookingSortTimestamp(b)
  );
}, [bookings, activeTab, searchQuery, monthFilter, yearFilter, sortOrder]);
  
  const uniqueYears = useMemo(() => {
    const years = bookings.map(b => new Date(getBookingCheckInDateValue(b)).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a).map(y => ({ label: y.toString(), value: y.toString() }));
  }, [bookings]);

  const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(0, i).toLocaleString('default', { month: 'long' }), value: i.toString() }));
  const sortOptions = [{ label: "Newest First", value: "newest" }, { label: "Oldest First", value: "oldest" }];
  const displayedBookings = showAllBookings ? filteredBookings : filteredBookings.slice(0, 5);
  const selectedRoomItems = selectedBooking?.bookingItems || [];
  const selectedPackageObjects = selectedRoomItems.map(item => item.packageId).filter(Boolean);
  const selectedExtraPackages = Array.isArray(selectedBooking?.extraPackages)
    ? selectedBooking.extraPackages.filter(pkg => typeof pkg === "object" && pkg)
    : [];
  const uniquePackages = Array.from(
    new Map(
      [...selectedPackageObjects, ...selectedExtraPackages].map(pkg => [pkg._id || pkg, pkg])
    ).values()
  ).filter(pkg => typeof pkg === "object");

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      cancelled: "bg-rose-50 text-rose-700 border-rose-200",
      cancellation_pending: "bg-orange-50 text-orange-800 border-orange-200",
      declined: "bg-slate-100 text-slate-600 border-slate-200"
    };
    const label = status?.replace('_', ' ') || status;
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || "bg-slate-100"}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 relative p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {cancelDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Cancel booking?</p>
                <p className="mt-1 text-sm text-slate-600">
                  {cancelDialog.isApproved
                    ? "This will send a cancellation request to the admin for review."
                    : "This booking will be canceled immediately."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                onClick={() => setCancelDialog({ open: false, bookingId: null, isApproved: false })}
                disabled={cancelSubmitting}
              >
                Keep
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={cancelSubmitting}
                onClick={async () => {
                  if (!cancelDialog.bookingId) return;
                  setCancelSubmitting(true);
                  try {
                    const { data } = await axios.post(
                      backendUrl + "/api/user/cancel-booking",
                      { bookingId: cancelDialog.bookingId },
                      { headers: { token } }
                    );
                    if (data.success) {
                      toast.success(cancelDialog.isApproved ? "Cancellation request sent" : "Booking cancelled successfully");
                      fetchUserBookings();
                      setCancelDialog({ open: false, bookingId: null, isApproved: false });
                    } else {
                      toast.error(data.message);
                    }
                  } catch (error) {
                    toast.error(error.response?.data?.message || "Error processing cancellation");
                  } finally {
                    setCancelSubmitting(false);
                  }
                }}
              >
                {cancelSubmitting ? "Processing..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
      {cashDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Banknote size={20} />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Pay over counter?</p>
                <p className="mt-1 text-sm text-slate-600">
                  We will mark this booking as cash payment and notify the admin.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                onClick={() => setCashDialog({ open: false, bookingId: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-blue-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-blue-700"
                onClick={async () => {
                  if (!cashDialog.bookingId) return;
                  setCashDialog({ open: false, bookingId: null });
                  await submitCashPayment(cashDialog.bookingId);
                }}
              >
                Pay over the counter
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes bookingFlash {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
            border-color: rgba(148, 163, 184, 0.7);
            background-color: rgba(255, 255, 255, 0.95);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.3);
            border-color: rgba(147, 197, 253, 1);
            background-color: rgba(239, 246, 255, 0.9);
          }
        }
        .booking-flash {
          animation: bookingFlash 0.9s ease-in-out 0s 3;
        }
      `}</style>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-100 rounded-full blur-[100px] opacity-60"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">My Bookings</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage your stays, track payments, and view history.</p>
          </div>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all"
            />
          </div>
        </div>

        {/* FILTERS & TABS */}
        <div className="space-y-6">
          <div className="flex items-center overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => handleStatusTabChange("all")}
              aria-expanded={showStatusTabs || activeTab !== "all"}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-md"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>All</span>
              <ChevronRight
                size={14}
                className={`transition-transform duration-300 ${
                  showStatusTabs || activeTab !== "all" ? "rotate-90" : ""
                }`}
              />
            </button>

            <div
              className={`ml-2 flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                showStatusTabs || activeTab !== "all"
                  ? "max-w-[520px] translate-x-0 opacity-100"
                  : "pointer-events-none max-w-0 -translate-x-4 opacity-0"
              }`}
            >
              {["pending", "approved", "cancelled"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleStatusTabChange(tab)}
                  className={`rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab
                      ? "bg-slate-900 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <CustomDropdown icon={ArrowUpDown} value={sortOrder} onChange={setSortOrder} options={sortOptions} defaultText="Sort By" />
            <div className="flex gap-3 flex-1">
              <CustomDropdown icon={CalendarDays} value={monthFilter} onChange={setMonthFilter} options={months} defaultText="Month" />
              <CustomDropdown icon={Calendar} value={yearFilter} onChange={setYearFilter} options={uniqueYears} defaultText="Year" />
              
            </div>
          </div>
        </div>

        {/* BOOKINGS LIST */}
        <div className="space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-medium">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No bookings found</h3>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <>
              {displayedBookings.map((booking) => {
                const roomSlides = booking.bookingItems
                  ? booking.bookingItems.map(item => item.roomId).filter(Boolean)
                  : [];
              const roomNames = roomSlides.map(room => room?.name).filter(Boolean);
              const primaryRoomName = roomNames[0] || "Venue only";
              const extraRoomCount = Math.max(0, roomNames.length - 1);
              const isMultiRoom = roomNames.length > 1;
              const isVenueOnly = roomSlides.length === 0;
              const mainRoom =
                booking.bookingItems && booking.bookingItems.length > 0
                  ? booking.bookingItems[0].roomId
                  : { name: "Venue only" };
              const slideIndex = isMultiRoom ? slideTick % roomSlides.length : 0;
              const slideRoom = isMultiRoom ? roomSlides[slideIndex] : mainRoom;
              
              const checkInDate = getBookingCheckInDateValue(booking) ? new Date(getBookingCheckInDateValue(booking)) : new Date();
              const checkOut = getBookingCheckOutDateValue(booking) ? new Date(getBookingCheckOutDateValue(booking)) : new Date();
              
              const isPaid = booking.paymentStatus === "paid" || booking.payment === true;
              const isCash = booking.paymentMethod === "cash";
              const isApproved = booking.status === "approved";
              const isCancellationPending = booking.status === "cancellation_pending";
              const hasPassed = new Date() > checkOut;
              const isGCashPending = booking.paymentMethod === "gcash" && booking.paymentStatus === "pending";
              
              const showPaymentButtons =
                booking.status === "approved" &&
                booking.paymentStatus === "unpaid" &&
                !isPaid &&
                !isCash &&
                booking.paymentMethod !== "gcash";
              const canRate = isApproved && hasPassed && !booking.rating;
              const hasRated = booking.rating > 0;

              // Logic: Show cancel button if not passed, not already cancelled/declined, and not already pending admin review
              const showCancelButton = !hasPassed && 
                                       !booking.status.includes('cancelled') && 
                                       !booking.status.includes('declined') && 
                                       !isCancellationPending;

              const imageUrl = isVenueOnly
                ? venueOnlyImage
                : getImageUrl(slideRoom?.coverImage || slideRoom?.imageslideRoom?.image);

              return (
                <div
                  id={`booking-${booking._id}`}
                  key={booking._id}
                  className={`group relative bg-white/95 rounded-[28px] p-4 md:p-5 border border-slate-200/70 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] hover:border-slate-200 transition-all duration-300 cursor-pointer overflow-hidden ${flashBookingId === `booking-${booking._id}` ? "booking-flash" : ""}`}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* IMAGE SECTION */}
                    <div className="w-full md:w-72 h-48 md:h-56 shrink-0 relative rounded-3xl overflow-hidden bg-slate-100 ring-1 ring-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={slideRoom?.name || mainRoom.name}
                          className="w-full h-full object-cover transition-opacity duration-500"
                          onError={(e) => { e.target.src = "/placeholder-room.jpg"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-300">
                          <Home size={36} />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600 shadow-sm border border-slate-100">
                          {slideRoom?.name || (isMultiRoom ? "Rooms" : "Venue")}
                        </span>
                      </div>
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        {/* 👇 ADDED: BOOKING NAME DISPLAY */}
                        {/* End of Addition */}


                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[20px] font-bold text-slate-900 line-clamp-1 pr-2">
                              {booking.bookingName || (isMultiRoom ? "Room Group" : primaryRoomName)}
                            </h3>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>

                          <div className="space-y-3 mb-6">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-500">
                             <span className="flex items-center gap-2">
                               <Clock size={16} className="text-slate-400" /> 
                               {formatDate(checkInDate)} — {formatDate(checkOut)}
                             </span>
                           </div>
                           <button
                             onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                             className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 hover:text-blue-700"
                           >
                             View details
                           </button>
                          
                        </div>
                      </div>

                      {/* FOOTER: Price & Actions */}
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-5 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-2xl font-extrabold text-slate-900">₱{Number(booking.totalPrice).toLocaleString()}</span>
                            
                            {isPaid && (
                              <span className="flex items-center gap-1.5 pl-2 text-emerald-600 text-[11px] font-bold uppercase">
                                <CheckCircle2 size={14} className="fill-emerald-100" /> Paid
                              </span>
                            )}

                            {isGCashPending && (
                              <span className="flex items-center gap-1.5 pl-2 text-amber-600 text-[11px] font-bold uppercase">
                                <Loader2 size={14} className="animate-spin" /> Verifying
                              </span>
                            )}

                            {isCash && !isPaid && (
                              <span className="flex items-center gap-1.5 pl-2 text-blue-600 text-[11px] font-bold uppercase">
                                <Banknote size={14} /> Cash (Proceed to Counter)
                              </span>
                            )}
                          </div>
                          
                           {hasRated && (
                             <div className="flex items-center gap-1 mt-2">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} size={14} className={i < booking.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                               ))}
                               <span className="text-xs text-slate-500 ml-1 font-semibold">Stay Rated</span>
                             </div>
                           )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          {showPaymentButtons && (
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
                              {showPaymentOptionsId === booking._id ? (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOnlinePayment(booking._id); }}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-sm hover:bg-blue-50 hover:border-blue-300 transition-all"
                                  >
                                    <Wallet size={16} className="text-blue-500" />
                                    GCash
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCashPayment(booking._id); }}
                                    className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                                  >
                                    Cash
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowPaymentOptionsId(null); }}
                                    className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center justify-center"
                                    aria-label="Cancel payment options"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPaymentOptionsId(booking._id);
                                  }}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
                                >
                                  <Wallet size={16} className="text-blue-100" />
                                  Pay now
                                </button>
                              )}
                            </div>
                          )}

                          {canRate && (
                            <button
                              onClick={(e) => handleOpenReview(e, booking)}
                              className="flex-1 md:flex-none px-6 py-2.5 bg-amber-400 text-amber-950 rounded-xl font-bold text-sm hover:bg-amber-300 hover:-translate-y-0.5 transition-all shadow-sm"
                            >
                              Rate Stay
                            </button>
                          )}

                          {hasRated && (
                            <button
                              onClick={(e) => handleOpenReview(e, booking)}
                              className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                              Edit Review
                            </button>
                          )}

                          {showCancelButton && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking._id, booking.status); }}
                              className="flex-1 md:flex-none px-4 py-2.5 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
              {filteredBookings.length > 5 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowAllBookings((value) => !value)}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {showAllBookings
                      ? "Show less"
                      : `Show all (+${Math.max(filteredBookings.length - 5, 0)} more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RENDER THE POPUP HERE */}
      {reviewBooking && (
        <ReviewPage 
            booking={reviewBooking} 
            onClose={() => setReviewBooking(null)} 
            user={userData}
            onSuccess={() => {
                fetchUserBookings(); // Refresh the list to show the new rating/review
            }}
        />
      )}

      {selectedBooking && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl border border-slate-100 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-5 py-4 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <Package size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Booking Details</p>
                  <h3 className="text-lg font-bold">
                    {selectedBooking.bookingName || "Booking Details"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Stay Period</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-in</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(getBookingCheckInDateValue(selectedBooking))}</p>
                  </div>
                  <div className="hidden sm:block text-slate-300 text-sm font-bold">—</div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-out</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(getBookingCheckOutDateValue(selectedBooking))}</p>
                  </div>
                  <div className="sm:ml-auto">{getStatusBadge(selectedBooking.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Rooms ({selectedRoomItems.length})
                </p>
                {selectedRoomItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(showAllModalRooms ? selectedRoomItems : selectedRoomItems.slice(0, 2)).map((item, index) => {
                      const room = item.roomId;
                      const roomImage = getImageUrl(room?.coverImage || room?.images || room?.image);
                      return (
                        <div key={room?._id || index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <div className="h-16 w-20 overflow-hidden rounded-xl bg-slate-100">
                            {roomImage ? (
                              <img
                                src={roomImage}
                                alt={room?.name || "Room"}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.target.src = "/placeholder-room.jpg"; }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <Home size={22} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{room?.name || "Room"}</p>
                          <p className="text-[10px] text-slate-500">
                            {(room?.roomType || "Room type")
                              .toString()
                              .replace(/_/g, " ")
                              .toUpperCase()}
                          </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {room?.building || "N/A"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                              {item.participants || 0} pax
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Venue Only (no rooms selected).
                  </div>
                )}
                {selectedRoomItems.length > 2 && (
                  <button
                    onClick={() => setShowAllModalRooms((value) => !value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {showAllModalRooms
                      ? "Show less"
                      : `Show all (+${Math.max(selectedRoomItems.length - 2, 0)} more)`}
                  </button>
                )}
              </div>

              {uniquePackages.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Package Availed ({uniquePackages.length})
                  </p>
                  <div className="space-y-3">
                    {(showAllModalPackages ? uniquePackages : uniquePackages.slice(0, 1)).map((pkg) => (
                      <div key={pkg._id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{pkg.name}</p>
                          <p className="text-xs text-slate-500">{pkg.description || "Package details available upon request."}</p>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          ₱{Number(pkg.price || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {uniquePackages.length > 1 && (
                    <button
                      onClick={() => setShowAllModalPackages((value) => !value)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {showAllModalPackages
                        ? "Show less"
                        : `Show all (+${Math.max(uniquePackages.length - 1, 0)} more)`}
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Billing</p>
                  <p className="text-xl font-extrabold text-slate-900">₱{Number(selectedBooking.totalPrice || 0).toLocaleString()}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                  {selectedBooking.paymentStatus === "paid"
                    ? "Paid"
                    : selectedBooking.status === "approved"
                      ? "Waiting for payment"
                      : "Waiting for approval"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;


