import React, { useState, useEffect, useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
import { 
  Star, MessageSquare, Send, CornerDownRight, Calendar, CheckCircle2
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AdminReviews = () => {
  const { backendUrl, aToken, postReviewReply } = useContext(AdminContext);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({}); // Stores text for each review ID

  const fetchReviews = async () => {
    try {
      // Using the public reviews endpoint you already have
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

  useEffect(() => {
    fetchReviews();
  }, [backendUrl]);

  const handleSendReply = async (reviewId) => {
    const message = replyText[reviewId];
    if (!message || message.trim() === "") {
      return toast.warning("Please type a response first.");
    }

    const success = await postReviewReply(reviewId, message);
    if (success) {
      setReplyText({ ...replyText, [reviewId]: "" }); // Clear input
      fetchReviews(); // Refresh list to show the new reply
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Guest Reviews</h1>
          <p className="text-sm text-slate-500 font-medium">Manage feedback and staff responses</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Avg Rating</p>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-xl font-black text-blue-600">{averageRating}</span>
              <Star size={14} className="text-blue-600 fill-current" />
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total</p>
            <p className="text-xl font-black text-slate-800">{reviews.length}</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">LOADING REVIEWS...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No reviews found yet</p>
          </div>
        ) : reviews.map((review) => (
          <div key={review._id} className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-all">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Guest Info Column */}
                <div className="w-full md:w-56 shrink-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase">
                      {review.userId?.firstName?.[0] || 'G'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 leading-tight">
                        {review.userId?.firstName} {review.userId?.lastName}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Verified Guest</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-blue-600 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-slate-200"} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                    <Calendar size={12} />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Content Area Column */}
                <div className="flex-grow">
                  <div className="mb-6">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <MessageSquare size={12} /> Guest Feedback
                    </h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Previous Admin Responses */}
                  {review.reviewChat
  ?.filter(chat => chat.senderRole === "admin")
  .map((chat, idx) => (
    <div
      key={idx}
      className="mt-4 ml-4 md:ml-8 bg-blue-50/50 rounded-2xl p-4 border border-blue-100 relative"
    >
      <CornerDownRight
        size={16}
        className="absolute -left-6 top-4 text-blue-200"
      />
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={14} className="text-blue-600" />
        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
          Management Reply
        </span>
      </div>
      <p className="text-xs text-slate-600 font-bold leading-relaxed">
        {chat.message}
      </p>
      <p className="text-[9px] text-slate-400 mt-2">
        {new Date(chat.createdAt).toLocaleString()}
      </p>
    </div>
))}



                  {/* Reply Input */}
                  <div className="mt-8 pt-6 border-t border-slate-50">
                    <div className="relative group">
                      <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[100px]"
                        placeholder="Write a professional reply..."
                        value={replyText[review._id] || ""}
                        onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                      />
                      <button 
                        onClick={() => handleSendReply(review._id)}
                        className="absolute bottom-3 right-3 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
                      >
                        <Send size={14} /> Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviews;