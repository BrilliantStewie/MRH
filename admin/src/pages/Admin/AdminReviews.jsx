import React, { useState, useEffect, useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
import {
  Star,
  MessageSquare,
  Send,
  CornerDownRight,
  Calendar,
  CheckCircle2
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AdminReviews = () => {
  const { backendUrl, postReviewReply } = useContext(AdminContext);

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  /* ==========================================
     FETCH REVIEWS
  ========================================== */
  const fetchReviews = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/reviews/all-reviews`
      );

      if (response.data.success) {
        setReviews(response.data.reviews);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [backendUrl]);

  /* ==========================================
     SEND REPLY
  ========================================== */
  const handleSendReply = async (reviewId) => {
    const message = replyText[reviewId];

    if (!message || message.trim() === "") {
      return toast.warning("Please type a response first.");
    }

    const success = await postReviewReply(reviewId, message);

    if (success) {
      setReplyText({ ...replyText, [reviewId]: "" });
      fetchReviews();
    }
  };

  /* ==========================================
     AVERAGE RATING
  ========================================== */
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, item) => acc + item.rating, 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Guest Reviews
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage feedback and staff responses
          </p>
        </div>

        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
              Avg Rating
            </p>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-xl font-black text-blue-600">
                {averageRating}
              </span>
              <Star size={14} className="text-blue-600 fill-current" />
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100"></div>

          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
              Total
            </p>
            <p className="text-xl font-black text-slate-800">
              {reviews.length}
            </p>
          </div>
        </div>
      </div>

      {/* REVIEW LIST */}
      <div className="max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            LOADING REVIEWS...
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
              No reviews found yet
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  
                  {/* LEFT COLUMN */}
                  <div className="w-full md:w-56 shrink-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase">
                        {review.userId?.firstName?.[0] || "G"}
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-800">
                          {review.userId?.firstName}{" "}
                          {review.userId?.lastName}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          Verified Guest
                        </p>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex gap-0.5 text-blue-600 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < review.rating ? "currentColor" : "none"}
                          className={
                            i < review.rating ? "" : "text-slate-200"
                          }
                        />
                      ))}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                      <Calendar size={12} />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="flex-grow">
                    {/* COMMENT */}
                    <div className="mb-6">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase mb-2 flex items-center gap-2">
                        <MessageSquare size={12} />
                        Guest Feedback
                      </h4>

                      <p className="text-sm text-slate-700 italic bg-slate-50 p-5 rounded-2xl border">
                        "{review.comment}"
                      </p>
                    </div>

                    {/* ADMIN REPLIES */}
                    {review.reviewChat?.map((chat, idx) => (
  <div
    key={idx}
    className={`mt-4 ml-4 md:ml-8 rounded-2xl p-4 border relative
      ${chat.senderRole === "admin"
        ? "bg-blue-50 border-blue-100"
        : "bg-slate-50 border-slate-200"
      }`}
  >
    <div className="flex items-center gap-2 mb-2">
      <CheckCircle2
        size={14}
        className={chat.senderRole === "admin" ? "text-blue-600" : "text-slate-600"}
      />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {chat.senderRole === "admin" ? "Admin Reply" : "Guest Reply"}
      </span>
    </div>

    <p className="text-xs font-medium leading-relaxed">
      {chat.message}
    </p>

    <p className="text-[9px] text-slate-400 mt-2">
      {new Date(chat.createdAt).toLocaleString()}
    </p>
  </div>
))}


                    {/* REPLY BOX */}
                    <div className="mt-8 pt-6 border-t border-slate-50">
                      <div className="relative group">
                        <textarea
                          className="w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 min-h-[100px]"
                          placeholder="Write a professional reply..."
                          value={replyText[review._id] || ""}
                          onChange={(e) =>
                            setReplyText({
                              ...replyText,
                              [review._id]: e.target.value
                            })
                          }
                        />

                        <button
                          onClick={() =>
                            handleSendReply(review._id)
                          }
                          className="absolute bottom-3 right-3 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2"
                        >
                          <Send size={14} />
                          Send Reply
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
