import React, { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  X, Building2, Calendar, Users, 
  Sparkles, Star, ArrowLeft, ArrowRight, Check, BedDouble, MapPin, PenLine, Package, Home
} from "lucide-react";
import venueOnlyImage from "../assets/mrh_about.jpg";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ReviewPage = ({ booking, onClose, user, onSuccess }) => {
  const { backendUrl, token } = useContext(AppContext);

  // --- 1. DETERMINE MODE (Create vs Edit) ---
  const isEditMode = Boolean(booking.reviewId || booking.rating > 0);

  // --- 2. INITIALIZE STATE ---
  const [step, setStep] = useState(isEditMode ? 2 : 1); 
  const [loading, setLoading] = useState(false);

  const [rating, setRating] = useState(booking.rating || 0); 
  const [reviewText, setReviewText] = useState(booking.review || booking.comment || ""); 
  const [hover, setHover] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);

  const MAX_REVIEW_IMAGES = 6;
  const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_REVIEW_IMAGES - reviewImages.length;
    if (availableSlots <= 0) {
      toast.warning("You can upload up to 6 images.");
      event.target.value = "";
      return;
    }

    const nextImages = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed.");
        continue;
      }
      if (file.size > MAX_REVIEW_IMAGE_SIZE) {
        toast.error(`${file.name} exceeds the 5MB limit.`);
        continue;
      }
      if (reviewImages.length + nextImages.length >= MAX_REVIEW_IMAGES) {
        toast.warning("You can upload up to 6 images.");
        break;
      }
      nextImages.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        preview: URL.createObjectURL(file)
      });
    }

    if (nextImages.length > 0) {
      setReviewImages((prev) => [...prev, ...nextImages]);
    }

    event.target.value = "";
  };

  const handleRemoveImage = (id) => {
    setReviewImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Data Mapping
  const bookingItems = Array.isArray(booking.bookingItems) ? booking.bookingItems : [];
  const rooms = bookingItems.map((item) => item.roomId).filter(Boolean);
  const mainRoom = rooms[0] || {};
  const roomNames = rooms.map((room) => room?.name).filter(Boolean);
  const roomLabel = roomNames.length > 1
    ? `${roomNames[0]} (+${roomNames.length - 1} more)`
    : roomNames[0] || "Venue-only booking";
  const packageName =
    bookingItems[0]?.packageId?.name ||
    booking.extraPackages?.[0]?.name ||
    "Venue-only package";
  const guestCount = bookingItems.reduce((sum, item) => sum + Number(item.participants || 0), 0)
    + Number(booking.venueParticipants || 0);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (Array.isArray(imagePath)) return imagePath.length > 0 ? getImageUrl(imagePath[0]) : null;
    if (typeof imagePath !== "string") return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };
  
  const selectedRoomItems = bookingItems;
  const selectedPackageObjects = bookingItems.map((item) => item.packageId).filter(Boolean);
  const selectedExtraPackages = Array.isArray(booking.extraPackages)
    ? booking.extraPackages.filter((pkg) => typeof pkg === "object" && pkg)
    : [];
  const uniquePackages = Array.from(
    new Map([...selectedPackageObjects, ...selectedExtraPackages].map((pkg) => [pkg._id || pkg, pkg])).values()
  ).filter((pkg) => typeof pkg === "object");

  const bookingData = {
    brandName: "Mercedarian Retreat House",
    location: "Poblacion, Dauis, Bohol, Philippines",
    guestName: user?.name || "Guest", 
    roomName: booking.bookingName || roomLabel,
    checkIn: formatDate(booking.checkIn),
    checkOut: formatDate(booking.checkOut),
    details: {
      booking: roomLabel,
      package: packageName,
      guests: guestCount ? `${guestCount} Guests` : "Guests N/A"
    },
    headerImage: getImageUrl(mainRoom?.coverImage || mainRoom?.images || mainRoom?.image) || venueOnlyImage
  };

  const COLORS = { black: "#1A1A1A", starYellow: "#FACC15" };

  const openDetails = () => {
    setShowAllRooms(false);
    setShowAllPackages(false);
    setShowDetails(true);
  };

  const handleBack = () => {
    if (!isEditMode && step === 2) {
      setStep(1);
      return;
    }

    onClose();
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      cancelled: "bg-rose-50 text-rose-700 border-rose-200",
      cancellation_pending: "bg-orange-50 text-orange-800 border-orange-200",
      declined: "bg-slate-100 text-slate-600 border-slate-200"
    };
    const label = status?.replace('_', ' ') || status;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || "bg-slate-100"}`}>
        {label}
      </span>
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
        toast.error("Please select a star rating");
        return;
    }

    setLoading(true);

    try {
        const reviewForm = new FormData();
        reviewForm.append("bookingId", booking._id);
        reviewForm.append("rating", rating);
        reviewForm.append("comment", reviewText);
        reviewImages.forEach((image) => {
          reviewForm.append("images", image.file);
        });

        const response = isEditMode && booking.reviewId
          ? await axios.put(
              `${backendUrl}/api/reviews/${booking.reviewId}`,
              reviewForm,
              { headers: { token } }
            )
          : await axios.post(
              `${backendUrl}/api/reviews`,
              reviewForm,
              { headers: { token } }
            );

        if (response.data.success) {
            toast.success(isEditMode ? "Review updated!" : "Review submitted!");
            setStep(3); 
            if (onSuccess) onSuccess(); 
        }
    } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || "Error connecting to server");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes checkReveal {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes progressCircle {
          from { stroke-dashoffset: 289; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes progressFade {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[520px] bg-white rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        {showDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl border border-slate-100 m-4">
              <div className="flex items-center justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-5 py-4 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <Package size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Booking Details</p>
                    <h3 className="text-lg font-bold">
                      {booking.bookingName || "Booking Details"}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
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
                      <p className="text-sm font-semibold text-slate-900">{formatDate(booking.checkIn)}</p>
                    </div>
                    <div className="hidden sm:block text-slate-300 text-sm font-bold">—</div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-out</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(booking.checkOut)}</p>
                    </div>
                    <div className="sm:ml-auto">{getStatusBadge(booking.status)}</div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Rooms ({selectedRoomItems.length})
                  </p>
                  {selectedRoomItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(showAllRooms ? selectedRoomItems : selectedRoomItems.slice(0, 2)).map((item, index) => {
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
                      onClick={() => setShowAllRooms((value) => !value)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {showAllRooms
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
                      {(showAllPackages ? uniquePackages : uniquePackages.slice(0, 1)).map((pkg) => (
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
                        onClick={() => setShowAllPackages((value) => !value)}
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {showAllPackages
                          ? "Show less"
                          : `Show all (+${Math.max(uniquePackages.length - 1, 0)} more)`}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Billing</p>
                    <p className="text-xl font-extrabold text-slate-900">₱{Number(booking.totalPrice || 0).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                    {booking.paymentStatus === "paid"
                      ? "Paid"
                      : booking.status === "approved"
                        ? "Waiting for payment"
                        : "Waiting for approval"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* HEADER SECTION */}
        <div className="relative h-52 w-full shrink-0">
            <img src={bookingData.headerImage} alt="Room" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black transition-colors border border-white/20 z-10">
                <X size={16} />
            </button>

            <div className="absolute top-4 left-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                  aria-label="Go back"
                >
                   <ArrowLeft size={14} />
                </button>
                <div>
                    <h3 className="text-[9px] font-bold text-white uppercase tracking-[0.2em] leading-tight">{bookingData.brandName}</h3>
                    <p className="text-[8px] text-white/70 flex items-center gap-1"><MapPin size={8} /> {bookingData.location}</p>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
                <h1 className="text-2xl font-serif italic mb-1 tracking-wide">
                  {step === 1 ? "How Was Your Stay?" 
                    : step === 2 
                        ? (isEditMode ? "Edit Your Review" : "Share Your Experience") 
                        : "Thank You!"}
                </h1>
            </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="overflow-y-auto custom-scrollbar">
            <div className="p-6">
            
            {/* STEP 1: SUMMARY */}
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                   <div>
                      <button
                        onClick={openDetails}
                        className="w-full mb-3 rounded-2xl border border-gray-200 bg-white py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View booking details
                      </button>
                      <button onClick={() => setStep(2)} className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/10 transition-all flex items-center justify-center gap-2 group">
                      <Sparkles size={14} className="text-[#FACC15] group-hover:rotate-12 transition-transform" /> Rate Your Experience
                      </button>
                      <NavLink
                        to="/reviews"
                        className="mt-4 block text-center text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        View all reviews
                      </NavLink>
                  </div>
                </div>
            )}

            {/* STEP 2: RATING AND REVIEW */}
            {step === 2 && (
                <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col">
                  
                  {/* Big Star Rating */}
                  <div className="text-center mb-6 bg-gray-50/50 py-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Tap to rate your stay</p>
                      <div className="flex justify-center gap-2 sm:gap-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                              key={star} 
                              onMouseEnter={() => setHover(star)} 
                              onMouseLeave={() => setHover(0)} 
                              onClick={() => setRating(star)} 
                              className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                          >
                              <Star 
                                size={38} 
                                className={`transition-all duration-200 ${ (hoverating) >= star ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200' }`} 
                                fill={(hoverating) >= star ? COLORS.starYellow : 'transparent'} 
                                strokeWidth={1.2} 
                              />
                          </button>
                          ))}
                      </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative mb-4">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 pl-1">
                        Your Feedback
                      </label>
                      <textarea 
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-sm focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 outline-none resize-none h-20 placeholder:text-gray-300 transition-all font-medium shadow-sm leading-relaxed" 
                          placeholder={isEditMode ? "Update your experience..." : "What did you love most about your stay?"} 
                      />
                  </div>

                  {/* Review Images */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 pl-1">
                        Add Photos (Optional)
                      </label>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                        {reviewImages.length}/{MAX_REVIEW_IMAGES}
                      </span>
                    </div>
                    <label className="flex items-center justify-center gap-2 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer hover:border-gray-300 hover:text-gray-700 transition-colors">
                      Upload Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-2 text-[9px] text-gray-400 font-semibold uppercase tracking-widest">
                      Up to 6 images, 5MB each
                    </p>

                    {reviewImages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reviewImages.map((image) => (
                          <div key={image.id} className="relative group h-12 w-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                            <img
                              src={image.preview}
                              alt="Review"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                      {!isEditMode && (
                          <button onClick={() => setStep(1)} className="px-5 py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">Back</button>
                      )}
                      
                      <button 
                          onClick={handleSubmit} 
                          disabled={rating === 0 || loading} 
                          className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-black transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                          {loading ? "Saving..." : (
                              <>
                                  {isEditMode ? "Update Review" : "Submit Review"} 
                                  {isEditMode ? <PenLine size={12} /> : <ArrowRight size={12} />}
                              </>
                          )}
                      </button>
                  </div>
                </div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 3 && (
                <div className="py-8 text-center animate-in zoom-in-95 duration-300">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                      <svg className="absolute inset-0" viewBox="0 0 100 100" style={{ animation: "progressFade 0.2s ease 0.9s forwards" }}>
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-slate-200"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="text-slate-900 animate-[progressCircle_0.9s_ease-out_1_forwards]"
                          style={{
                            strokeDasharray: 289,
                            strokeDashoffset: 289,
                            transform: "rotate(-90deg)",
                            transformOrigin: "50% 50%"
                          }}
                        />
                      </svg>
                      <div
                        className="absolute inset-2 rounded-full bg-[#1A1A1A] flex items-center justify-center shadow-2xl shadow-black/20 opacity-0"
                        style={{ animation: "checkReveal 0.2s ease 0.9s forwards" }}
                      >
                        <Check className="text-white" size={34} strokeWidth={2.5} />
                      </div>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-gray-900 mb-2 tracking-wide">
                      {isEditMode ? "Review Updated" : "Thank You!"}
                  </h2>
                  <p className="text-gray-500 text-[11px] mb-6 font-medium">Your feedback has been successfully saved.</p>
                  <NavLink
                    to="/reviews"
                    className="w-full block py-3 bg-white border border-gray-200 text-gray-900 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    View all reviews
                  </NavLink>
                  
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;


