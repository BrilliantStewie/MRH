import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import { Star, Calendar, CornerDownRight, Tag } from "lucide-react"; 
import axios from "axios";

const AllReviews = () => {
  const { backendUrl } = useContext(AppContext);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Fetches reviews using the public endpoint in userController.js
        const response = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
        if (response.data.success) {
          setReviews(response.data.reviews);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [backendUrl]);

  // Logic to calculate global average for the summary card
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, item) => acc + item.rating, 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        
        {/* --- LEFT SIDE: REVIEWS LIST --- */}
        <div className="space-y-10">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400 font-medium italic">
              Loading guest experiences...
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-medium">
              No reviews yet. 
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review._id}
                className="group relative bg-white rounded-[2rem] p-10 border border-gray-100 shadow-none transition-all duration-500 ease-in-out overflow-hidden hover:shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.05),_0_8px_10px_-6px_rgb(0_0_0_/_0.05)] before:absolute before:inset-y-0 before:left-0 before:w-[6px] before:bg-[#F6AD55] before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100"
              >
                {/* Header: User Info & Star Rating */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="shrink-0">
                     {/* USER INFO */}
{review.userId?.image ? (
  <img
    src={review.userId.image}
    alt={review.userId.firstName}
    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
  />
) : (
  <div className="w-14 h-14 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-bold text-lg">
    {review.userId?.firstName?.[0]}
    {review.userId?.lastName?.[0]}
  </div>
)}

<h3 className="font-bold text-[#1E293B] text-xl">
  {review.userId?.firstName} {review.userId?.lastName}
</h3>

                      <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1">
                        <Calendar size={14} className="opacity-70" />
                        Stayed in {new Date(review.check_in || review.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex gap-1 justify-end">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={i < review.rating ? "text-[#F6AD55] fill-[#F6AD55]" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 block">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* --- CONTENT SECTION: Booking Identity (Matches MyBookings) --- */}
                <div className="mt-8 relative z-10">

  {review.bookingId?.bookingName && (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[26px] font-serif text-[#1E293B] leading-tight font-medium">
        {review.bookingId.bookingName}
      </span>
    </div>
  )}


  <p className="mt-5 text-[#64748B] leading-relaxed text-lg italic">
    "{review.comment}"
  </p>
</div>

                {/* Admin Responses from reviewChat */}
                {review.reviewChat?.some(chat => chat.senderRole === 'admin') && (
                  <div className="mt-10 bg-[#F1F5F9]/50 rounded-[1.5rem] p-7 ml-6 border border-gray-50 relative z-10">
                    <div className="flex items-start gap-4">
                      <CornerDownRight size={22} className="text-[#F6AD55] mt-1 shrink-0" />
                      <div className="w-full">
                         {review.reviewChat.filter(c => c.senderRole === 'admin').map((chat, idx) => (
                           <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-lg font-bold text-[#334155]">{chat.senderName}</span>
                                <span className="bg-[#F6AD55] text-[10px] font-black text-white px-2.5 py-1 rounded-md uppercase tracking-tighter">Admin</span>
                              </div>
                              <p className="text-[#64748B] text-base leading-relaxed">{chat.message} 🌿</p>
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT SIDE: SUMMARY CARD --- */}
        <aside className="relative hidden lg:block">
          <div className="sticky top-32 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-gray-50">
            <div className="bg-[#1E293B] pt-12 pb-10 text-center text-white">
              <h2 className="text-7xl font-bold tracking-tight">{averageRating}</h2>
              <div className="flex justify-center gap-1.5 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={22}
                    className={i < Math.round(averageRating) ? "text-[#F6AD55] fill-[#F6AD55]" : "text-slate-500"}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-4 font-medium">Based on {reviews.length} reviews</p>
            </div>

            <div className="p-10 space-y-5">
              {[5, 4, 3, 2, 1].map((num) => {
                const count = reviews.filter((r) => Math.round(r.rating) === num).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={num} className="flex items-center gap-5">
                    <span className="text-sm font-bold text-slate-600 w-5">{num}★</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F6AD55] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-400 w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AllReviews;
