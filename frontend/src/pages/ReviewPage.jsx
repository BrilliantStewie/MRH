import React, { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  X, Building2, Calendar, Users, 
  Sparkles, Star, ArrowRight, Check, BedDouble, MapPin, Heart, PenLine 
} from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ReviewPage = ({ booking, onClose, user, onSuccess }) => {
  const { backendUrl, token } = useContext(AppContext);

  // --- 1. DETERMINE MODE (Create vs Edit) ---
  const isEditMode = booking.rating > 0;

  // --- 2. INITIALIZE STATE ---
  const [step, setStep] = useState(isEditMode ? 2 : 1); 
  const [loading, setLoading] = useState(false);

  const [rating, setRating] = useState(booking.rating || 0); 
  const [reviewText, setReviewText] = useState(booking.review || booking.comment || ""); 
  const [hover, setHover] = useState(0);

  // Data Mapping
  const mainRoom = booking.room_ids && booking.room_ids.length > 0 ? booking.room_ids[0] : {};
  
  const bookingData = {
    brandName: "MRH Luxury Suites",
    location: "Tagbilaran City",
    guestName: user?.name || "Guest", 
    roomName: mainRoom.name || "Luxury Suite",
    checkIn: formatDate(booking.check_in),
    checkOut: formatDate(booking.check_out),
    details: {
      wing: mainRoom.building || "Main Wing",
      type: mainRoom.room_type || "Suite",
      guests: `${mainRoom.capacity || 2} Guests`
    },
    headerImage: mainRoom.cover_image || mainRoom.images?.[0] || mainRoom.image
      ? (mainRoom.cover_image || mainRoom.images?.[0] || mainRoom.image).startsWith('http') 
        ? (mainRoom.cover_image || mainRoom.images?.[0] || mainRoom.image)
        : `http://localhost:4000/${(mainRoom.cover_image || mainRoom.images?.[0] || mainRoom.image).replace(/\\/g, "/")}`
      : "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop"
  };

  const COLORS = { black: "#1A1A1A", gold: "#C5A059", starYellow: "#FACC15" };

  const handleSubmit = async () => {
    if (rating === 0) {
        toast.error("Please select a star rating");
        return;
    }

    setLoading(true);

    try {
        // 1. Update the Private Booking (for My Bookings tab)
        const bookingReq = axios.post(
            backendUrl + '/api/user/rate-booking', 
            {
                bookingId: booking._id,
                rating: rating,
                review: reviewText
            },
            { headers: { token } }
        );

        // 2. Create the Public Review (for All Reviews feed)
        const reviewReq = axios.post(
            backendUrl + '/api/reviews', 
            {
                bookingId: booking._id,
                rating: rating,
                comment: reviewText
            },
            { headers: { token } }
        );

        // Wait for both to finish
        const [res1, res2] = await Promise.all([bookingReq, reviewReq]);

        if (res1.data.success || res2.data.success) {
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[480px] bg-white rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER SECTION */}
        <div className="relative h-64 w-full shrink-0">
            <img src={bookingData.headerImage} alt="Room" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black transition-colors border border-white/20 z-10">
                <X size={16} />
            </button>

            <div className="absolute top-6 left-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
                   <Heart size={14} fill={COLORS.gold} stroke="none" />
                </div>
                <div>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] leading-tight">{bookingData.brandName}</h3>
                    <p className="text-[9px] text-white/70 flex items-center gap-1"><MapPin size={8} /> {bookingData.location}</p>
                </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
                <h1 className="text-3xl font-serif italic mb-1 tracking-wide">
                  {step === 1 ? "How Was Your Stay?" 
                    : step === 2 
                        ? (isEditMode ? "Edit Your Review" : "Detail Your Experience") 
                        : "Thank You"}
                </h1>
                <p className="text-xs text-white/80 font-light">
                  {step === 1 ? "Your feedback helps us curate the perfect stay." : `${bookingData.roomName}`}
                </p>
            </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="overflow-y-auto custom-scrollbar">
            <div className="p-8">
            
            {/* STEP 1: SUMMARY */}
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-gray-100">
                      <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                          <span className="text-sm font-bold text-gray-900 line-clamp-1">{bookingData.roomName}</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#C5A059] shrink-0 bg-[#C5A059]/10 px-3 py-1 rounded-full">Verified Stay</span>
                      </div>
                      <div className="flex gap-3 mb-5">
                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex flex-col gap-1.5 items-center text-center">
                              <Building2 size={18} className="text-gray-400 mb-1" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Wing</span>
                              <span className="text-xs font-bold text-gray-900">{bookingData.details.wing}</span>
                          </div>
                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex flex-col gap-1.5 items-center text-center">
                              <BedDouble size={18} className="text-gray-400 mb-1" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Type</span>
                              <span className="text-xs font-bold text-gray-900">{bookingData.details.type}</span>
                          </div>
                          <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex flex-col gap-1.5 items-center text-center">
                              <Users size={18} className="text-gray-400 mb-1" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Guests</span>
                              <span className="text-xs font-bold text-gray-900">{bookingData.details.guests}</span>
                          </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-medium bg-white py-3 rounded-xl border border-dashed border-gray-200">
                        <Calendar size={14} className="text-gray-400"/> <span>{bookingData.checkIn} &mdash; {bookingData.checkOut}</span>
                      </div>
                  </div>

                  <div>
                      <button onClick={() => setStep(2)} className="w-full py-4 bg-[#1A1A1A] hover:bg-black text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-black/10 transition-all flex items-center justify-center gap-2 group">
                      <Sparkles size={16} className="text-[#FACC15] group-hover:rotate-12 transition-transform" /> Rate Your Experience
                      </button>
                      <button onClick={onClose} className="w-full mt-5 text-center text-gray-400 text-[11px] font-bold uppercase tracking-widest hover:text-gray-900 transition-colors">Maybe later</button>
                  </div>
                </div>
            )}

            {/* STEP 2: RATING AND REVIEW */}
            {step === 2 && (
                <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col">
                  
                  {/* Big Star Rating */}
                  <div className="text-center mb-8 bg-gray-50/50 py-8 rounded-3xl border border-gray-100">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-5">Tap to rate your stay</p>
                      <div className="flex justify-center gap-2 sm:gap-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                              key={star} 
                              onMouseEnter={() => setHover(star)} 
                              onMouseLeave={() => setHover(0)} 
                              onClick={() => setRating(star)} 
                              className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                          >
                              <Star 
                                size={44} 
                                className={`transition-all duration-200 ${ (hover || rating) >= star ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200' }`} 
                                fill={(hover || rating) >= star ? COLORS.starYellow : 'transparent'} 
                                strokeWidth={1.2} 
                              />
                          </button>
                          ))}
                      </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 pl-1">
                        Your Feedback
                      </label>
                      <textarea 
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 outline-none resize-none h-24 placeholder:text-gray-300 transition-all font-medium shadow-sm leading-relaxed" 
                          placeholder={isEditMode ? "Update your experience..." : "What did you love most about your stay?"} 
                      />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                      {!isEditMode && (
                          <button onClick={() => setStep(1)} className="px-6 py-4 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">Back</button>
                      )}
                      
                      <button 
                          onClick={handleSubmit} 
                          disabled={rating === 0 || loading} 
                          className="flex-1 py-4 bg-[#1A1A1A] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-black transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                          {loading ? "Saving..." : (
                              <>
                                  {isEditMode ? "Update Review" : "Submit Review"} 
                                  {isEditMode ? <PenLine size={14} /> : <ArrowRight size={14} />}
                              </>
                          )}
                      </button>
                  </div>
                </div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 3 && (
                <div className="py-10 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-black/20 animate-bounce">
                      <Check className="text-white" size={48} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-wide">
                      {isEditMode ? "Review Updated" : "Thank You!"}
                  </h2>
                  <p className="text-gray-500 text-sm mb-10 font-medium">Your feedback has been successfully saved.</p>
                  <button onClick={onClose} className="w-full py-4 bg-gray-50 border border-gray-200 text-gray-900 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors">Close Window</button>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;