import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Search, CalendarDays, MapPin, Loader2, CheckCircle2,
  Filter, ArrowUpDown, Calendar, ChevronDown, Banknote, Star, Home, Clock, CornerDownRight, Tag
} from "lucide-react"; // 👈 Added Tag icon here
import ReviewPage from "./ReviewPage"; // Ensure this path is correct

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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);

  // Filters State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Fetch Data
  const fetchUserBookings = async () => {
    try {
      const { data } = await axios.get(backendUrl + `/api/user/bookings?t=${Date.now()}`, { headers: { token } });
      if (data.success) setBookings(data.bookings);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };

  // Payment Verification
  const verifyPaymentStatus = async (bookingId) => {
    const toastId = toast.loading("Verifying payment...");
    try {
      const { data } = await axios.post(backendUrl + "/api/user/verify-payment", { bookingId }, { headers: { token } });
      if (data.success) {
        toast.update(toastId, { render: "Payment confirmed!", type: "success", isLoading: false, autoClose: 2000 });
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchUserBookings();
      } else {
        toast.update(toastId, { render: data.message, type: "warning", isLoading: false, autoClose: 3000 });
      }
    } catch {
      toast.dismiss();
      toast.error("Payment verification failed.");
    }
  };

  // Action Handlers
  const handleCashPayment = async (bookingId) => {
    if (!window.confirm("Do you want to mark this as Pay Over Counter (Cash)?")) return;
    const toastId = toast.loading("Processing...");
    try {
      const { data } = await axios.post(backendUrl + '/api/user/mark-cash', { bookingId }, { headers: { token } });
      if (data.success) {
        toast.update(toastId, { render: "Marked as Pay Now (Cash)", type: "success", isLoading: false, autoClose: 2000 });
        fetchUserBookings();
      } else { toast.update(toastId, { render: data.message, type: "error", isLoading: false, autoClose: 3000 }); }
    } catch (error) { toast.dismiss(); toast.error("Error updating payment method"); }
  }

  const handleOnlinePayment = async (bookingId) => {
    const booking = bookings.find(b => b._id === bookingId);
    if (booking?.paymentStatus === "pending") return toast.info("Payment already initiated.");

    try {
      const toastId = toast.loading("Connecting to GCash...");
      const { data } = await axios.post(backendUrl + "/api/user/create-checkout-session", { bookingId }, { headers: { token } });

      if (data.success) {
        toast.update(toastId, { render: "Redirecting...", type: "success", isLoading: false, autoClose: 1500 });
        window.location.href = data.checkoutUrl;
      } else {
        toast.update(toastId, { render: data.message, type: "error", isLoading: false, autoClose: 3000 });
      }
    } catch {
      toast.dismiss();
      toast.error("Payment connection failed.");
    }
  };

  const handleCancelBooking = async (bookingId, status) => {
    // If approved, it's a request. If pending, it's automatic.
    const isApproved = status === 'approved';
    const message = isApproved 
      ? "Since this booking is already approved, canceling it will send a request to the admin for review. Proceed?"
      : "Are you sure you want to cancel this booking?";

    if (!window.confirm(message)) return;

    const toastId = toast.loading(isApproved ? "Sending cancellation request..." : "Canceling booking...");
    try {
      const { data } = await axios.post(backendUrl + '/api/user/cancel-booking', { bookingId }, { headers: { token } });
      if (data.success) {
        toast.update(toastId, { 
          render: isApproved ? "Cancellation request sent to admin" : "Booking cancelled successfully", 
          type: "success", 
          isLoading: false, 
          autoClose: 2000 
        });
        fetchUserBookings();
      } else {
        toast.update(toastId, { render: data.message, type: "error", isLoading: false, autoClose: 3000 });
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error processing cancellation");
    }
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

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const mainRoom = (b.room_ids && b.room_ids.length > 0) ? b.room_ids[0] : {};
      const date = new Date(b.date || Date.now());

      if (activeTab !== 'all' && b.status !== activeTab) return false;
      if (buildingFilter !== 'all' && mainRoom.building?.toLowerCase() !== buildingFilter.toLowerCase()) return false;
      if (monthFilter !== 'all' && date.getMonth().toString() !== monthFilter) return false;
      if (yearFilter !== 'all' && date.getFullYear().toString() !== yearFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const roomName = mainRoom.name ? mainRoom.name.toLowerCase() : "";
        if (!roomName.includes(query) && !b._id.toLowerCase().includes(query)) return false;
      }
      return true;
    }).sort((a, b) => sortOrder === 'newest' 
      ? new Date(b.date) - new Date(a.date) 
      : new Date(a.date) - new Date(b.date));
  }, [bookings, activeTab, searchQuery, buildingFilter, monthFilter, yearFilter, sortOrder]);

  const buildingOptions = [{ label: "Margarita", value: "Margarita" }, { label: "Nolasco", value: "Nolasco" }];
  
  const uniqueYears = useMemo(() => {
    const years = bookings.map(b => new Date(b.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a).map(y => ({ label: y.toString(), value: y.toString() }));
  }, [bookings]);

  const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(0, i).toLocaleString('default', { month: 'long' }), value: i.toString() }));
  const sortOptions = [{ label: "Newest First", value: "newest" }, { label: "Oldest First", value: "oldest" }];

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
              placeholder="Search rooms or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all"
            />
          </div>
        </div>

        {/* FILTERS & TABS */}
        <div className="space-y-6">
          <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
            {['all', 'pending', 'approved', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <CustomDropdown icon={ArrowUpDown} value={sortOrder} onChange={setSortOrder} options={sortOptions} defaultText="Sort By" />
            <CustomDropdown icon={Filter} value={buildingFilter} onChange={setBuildingFilter} options={buildingOptions} defaultText="Building" />
            <div className="flex gap-3 flex-1">
              <CustomDropdown icon={Calendar} value={yearFilter} onChange={setYearFilter} options={uniqueYears} defaultText="Year" />
              <CustomDropdown icon={CalendarDays} value={monthFilter} onChange={setMonthFilter} options={months} defaultText="Month" />
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
            filteredBookings.map((booking) => {
              const mainRoom = (booking.room_ids && booking.room_ids.length > 0) 
                  ? booking.room_ids[0] 
                  : { name: "Room Details Unavailable" };
              
              const checkInDate = booking.check_in ? new Date(booking.check_in) : new Date();
              const checkOutDate = booking.check_out ? new Date(booking.check_out) : new Date();
              
              const isPaid = booking.paymentStatus === "paid" || booking.payment === true;
              const isCash = booking.paymentMethod === "cash";
              const isApproved = booking.status === "approved";
              const isCancellationPending = booking.status === "cancellation_pending";
              const hasPassed = new Date() > checkOutDate;
              const isGCashPending = booking.paymentMethod === "gcash" && booking.paymentStatus === "pending";
              
              const showPaymentButtons = isApproved && !isPaid && !hasPassed && !isGCashPending;
              const canRate = isApproved && (isPaid || isCash) && hasPassed && !booking.rating;
              const hasRated = booking.rating > 0;

              // Logic: Show cancel button if not passed, not already cancelled/declined, and not already pending admin review
              const showCancelButton = !hasPassed && 
                                       !booking.status.includes('cancelled') && 
                                       !booking.status.includes('declined') && 
                                       !isCancellationPending;

              const imageUrl = getImageUrl(mainRoom.cover_image || mainRoom.images || mainRoom.image);

              return (
                <div
                  key={booking._id}
                  onClick={() => setSelectedBooking(booking)}
                  className="group relative bg-white rounded-[2rem] p-4 md:p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* IMAGE SECTION */}
                    <div className="w-full md:w-72 h-48 md:h-56 shrink-0 relative rounded-2xl overflow-hidden bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={mainRoom.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e) => { e.target.src = "/placeholder-room.jpg"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Home size={40} /></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm border border-slate-100">
                          {mainRoom.room_type || "Room"}
                        </span>
                      </div>
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        {/* 👇 ADDED: BOOKING NAME DISPLAY */}
                        {booking.bookingName && (
                          <div className="flex items-center gap-2 mb-2">
                            <Tag size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                              {booking.bookingName}
                            </span>
                          </div>
                        )}
                        {/* End of Addition */}

                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-slate-900 line-clamp-1 pr-4">{mainRoom.name}</h3>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {mainRoom.building || "N/A"}</span>
                            <span className="hidden sm:block text-slate-300">•</span>
                            <span className="flex items-center gap-2">
                              <Clock size={16} className="text-slate-400" /> 
                              {formatDate(checkInDate)} — {formatDate(checkOutDate)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-400 font-mono bg-slate-50 inline-block px-2 py-1 rounded-md">
                            ID: {booking._id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* FOOTER: Price & Actions */}
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-5 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-2xl font-extrabold text-slate-900">₱{Number(booking.total_price).toLocaleString()}</span>
                            
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
                                <Banknote size={14} /> Cash (OTC)
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
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOnlinePayment(booking._id); }}
                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                              >
                                Pay Online
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCashPayment(booking._id); }}
                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                              >
                                Cash
                              </button>
                            </>
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
                              {isApproved ? 'Request Cancellation' : 'Cancel'}
                            </button>
                          )}

                          {isCancellationPending && (
                            <span className="flex-1 md:flex-none px-4 py-2.5 text-orange-600 bg-orange-50 font-bold text-sm rounded-xl border border-orange-100 flex items-center gap-2">
                              <Clock size={14} /> Cancellation Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
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
    </div>
  );
};

export default MyBookings;