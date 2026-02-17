import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Star, Loader2, Send, MessageSquare } from "lucide-react";

const RateBooking = ({ booking, onClose, backendUrl, token, isModal = false }) => {
  const [rating, setRating] = useState(booking?.rating || 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(booking?.review || "");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic labels for instant feedback
  const getRatingLabel = (val) => {
    const labels = { 
      1: "Below Expectations", 
      2: "Average Experience", 
      3: "Good Stay", 
      4: "Great Experience", 
      5: "Exceptional Service" 
    };
    return labels[val] || "Tap stars to rate";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.warning("Please select a star rating");
    
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/rate-booking`, 
        { bookingId: booking._id, rating, review }, 
        { headers: { token } }
      );

      if (data.success) {
        toast.success("Thank you for your feedback!");
        // Slight delay to allow user to see the success state before closing
        setTimeout(() => {
            if (onClose) onClose();
            // Optional: Reload to reflect changes if needed
             window.location.reload();
        }, 800);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* 1. Star Rating Interactive Section */}
      <div className="flex flex-col items-center justify-center space-y-3 py-2">
        <div className="flex gap-2 relative">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="transition-transform duration-200 hover:scale-110 active:scale-90 focus:outline-none"
              aria-label={`Rate ${star} stars`}
            >
              <Star 
                size={isModal ? 36 : 42} 
                className={`transition-all duration-300 ${
                  star <= (hover || rating) 
                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" 
                    : "text-slate-100 fill-slate-100"
                }`} 
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        
        {/* Dynamic Rating Label */}
        <div className={`h-6 flex items-center justify-center transition-all duration-300 transform ${rating > 0 || hover > 0 ? "opacity-100 translate-y-0" : "opacity-50 translate-y-1"}`}>
           <span className={`text-xs font-black uppercase tracking-[0.2em] ${rating > 0 ? "text-indigo-600" : "text-slate-400"}`}>
             {getRatingLabel(hover || rating)}
           </span>
        </div>
      </div>

      {/* 2. Review Text Area */}
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
          <MessageSquare size={14} className="text-indigo-500" />
          Written Feedback <span className="text-slate-300 font-normal normal-case tracking-normal ml-auto">(Optional)</span>
        </label>
        <div className="relative">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share details about your room, service, or amenities..."
            className="w-full h-36 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all resize-none text-slate-700 text-sm leading-relaxed placeholder:text-slate-400"
          />
          {/* Character count or decoration could go here */}
        </div>
      </div>

      {/* 3. Action Buttons */}
      <button
        type="submit"
        disabled={submitting}
        className="group w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Posting...</span>
          </>
        ) : (
          <>
            <Send size={16} className="group-hover:translate-x-1 transition-transform" />
            <span>Submit Review</span>
          </>
        )}
      </button>

    </form>
  );
};

export default RateBooking;