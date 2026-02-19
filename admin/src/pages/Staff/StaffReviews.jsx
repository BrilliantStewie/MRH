import React, { useState, useEffect, useContext } from "react";
import { StaffContext } from "../../context/StaffContext";
import {
  Star,
  Send,
  CornerDownRight,
  Calendar,
  MessageCircle,
  User
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const StaffReviews = () => {
  const { backendUrl, sToken } = useContext(StaffContext);

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editText, setEditText] = useState("");

  /* ==========================================
     FETCH REVIEWS
  ========================================== */
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reviews/all-reviews`, {
        headers: { token: sToken }
      });

      if (response.data.success) {
        setReviews(response.data.reviews || []);
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
  }, [backendUrl, sToken]);

  /* ==========================================
     SEND REPLY
  ========================================== */
  const handleSendReply = async (reviewId) => {
    const message = replyText[reviewId];

    if (!message || message.trim() === "") {
      return toast.warning("Please type a response first.");
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { response: message },
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply added");
        setReplyText({ ...replyText, [reviewId]: "" });
        setActiveReplyId(null);
        fetchReviews(); // Refresh list to show new reply
      }
    } catch (err) {
      toast.error("Failed to reply");
    }
  };

  /* ==========================================
     DELETE REPLY
  ========================================== */
  const handleDeleteReply = async (reviewId, replyId) => {
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/reviews/reply/${reviewId}/${replyId}`,
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply deleted");
        fetchReviews();
      }
    } catch (error) {
      toast.error("Failed to delete reply");
    }
  };

  /* ==========================================
     EDIT REPLY
  ========================================== */
  const handleEditReply = async (reviewId, replyId) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/reviews/reply/${reviewId}/${replyId}`,
        { message: editText },
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply updated");
        setEditingReplyId(null);
        setEditText("");
        fetchReviews();
      }
    } catch (error) {
      toast.error("Failed to update reply");
    }
  };

  /* ==========================================
     HELPER: Date Formatting
  ========================================== */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatStayDate = (start, end) => {
    if (!start) return "";
    const s = new Date(start);
    const e = end ? new Date(end) : null;

    const m = s.toLocaleString("default", { month: "short" });
    if (e) {
      const em = e.toLocaleString("default", { month: "short" });
      if (m === em) {
        return `${m} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
      }
      return `${m} ${s.getDate()} - ${em} ${e.getDate()}, ${s.getFullYear()}`;
    }
    return formatDate(start);
  };

  /* ==========================================
     STATS
  ========================================== */
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, item) => acc + (item.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-800">
      {/* PAGE HEADER */}
      <div className="max-w-4xl mx-auto mb-10 flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Guest Reviews</h1>
          <p className="text-slate-500 mt-1">Manage feedback and staff responses</p>
        </div>

        {/* STATS BADGE */}
        <div className="flex items-center gap-5 bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
              Avg Rating
            </p>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xl font-bold text-slate-900">
                {averageRating}
              </span>
              <div className="flex text-amber-400 mb-1">
                <Star size={16} fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
              Total
            </p>
            <p className="text-xl font-bold text-slate-900 text-center">
              {reviews.length}
            </p>
          </div>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse font-medium">
            Loading feedback...
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400 italic">No reviews found yet.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden relative"
            >
              {/* GOLD LEFT BORDER */}
              <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#f59e0b]"></div>

              <div className="p-8 pl-10">
                {/* --- HEADER: User & Rating --- */}
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                      {review.userId?.image ? (
                        <img
                          src={review.userId.image}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-slate-400" />
                      )}
                    </div>

                    {/* User Details */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-[16px] leading-tight">
                        {review.userId?.firstName} {review.userId?.lastName || ""}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-medium">
                        <Calendar size={12} />
                        <span>
                          {formatStayDate(review.check_in, review.check_out)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stars & Date (Right Side) */}
                  <div className="text-right">
                    <div className="flex gap-1 text-[#f59e0b] mb-1 justify-end">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < review.rating ? "currentColor" : "none"}
                          className={i < review.rating ? "" : "text-slate-200"}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>

                {/* --- REVIEW CONTENT --- */}
                <div className="mb-8">
                  {/* TITLE MAPPED TO BOOKING NAME */}
                  <h2 className="text-2xl font-serif italic text-slate-800 mb-3 leading-snug">
                    "
                    {review.bookingId?.bookingName ||
                      (review.bookingId?.room_ids?.length > 0
                        ? review.bookingId.room_ids.map((r) => r.name).join(", ")
                        : "Retreat Stay")}
                    "
                  </h2>

                  <p className="text-slate-600 text-[14px] leading-relaxed font-light">
                    {review.comment || "No written review provided."}
                  </p>
                </div>

                {/* --- REPLIES --- */}
                {review.reviewChat && review.reviewChat.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {review.reviewChat.map((chat) => (
                      <div
                        key={chat._id}
                        className={`relative group rounded-lg p-5 text-sm transition ${
                          chat.senderRole === "admin" ||
                          chat.senderRole === "staff"
                            ? "bg-[#f8fafc] ml-8 border border-slate-100"
                            : "bg-white border border-slate-100"
                        }`}
                      >
                        {/* Arrow for Admin/Staff */}
                        {(chat.senderRole === "admin" ||
                          chat.senderRole === "staff") && (
                          <div className="absolute -left-6 top-5 text-[#cbd5e1]">
                            <CornerDownRight size={20} />
                          </div>
                        )}

                        {/* HEADER */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {chat.senderRole === "admin"
                              ? "Admin"
                              : chat.senderRole === "staff"
                              ? "Staff"
                              : "Guest"}
                          </span>

                          {chat.senderRole !== "guest" && (
                            <span className="bg-[#f59e0b] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {chat.senderRole}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 ml-auto">
                            {formatDate(chat.createdAt)}
                            {chat.isEdited && (
                              <span className="ml-1 italic text-slate-400">
                                (edited)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* EDIT MODE */}
                        {editingReplyId === chat._id ? (
                          <>
                            <textarea
                              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => setEditingReplyId(null)}
                                className="text-xs text-slate-500"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() =>
                                  handleEditReply(review._id, chat._id)
                                }
                                className="text-xs bg-slate-900 text-white px-3 py-1 rounded"
                              >
                                Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-600 text-[13px]">
                              {chat.message}
                            </p>

                            {/* HOVER EDIT/DELETE (Admin & Staff only) */}
                            {(chat.senderRole === "admin" ||
                              chat.senderRole === "staff") && (
                              <div className="absolute top-3 right-4 hidden group-hover:flex gap-3 text-[11px] font-bold">
                                <button
                                  onClick={() => {
                                    setEditingReplyId(chat._id);
                                    setEditText(chat.message);
                                  }}
                                  className="text-blue-600 hover:underline"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() =>
                                    handleDeleteReply(review._id, chat._id)
                                  }
                                  className="text-red-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* --- WRITE REPLY BUTTON / INPUT --- */}
                <div className="pt-2">
                  {!activeReplyId || activeReplyId !== review._id ? (
                    <button
                      onClick={() => setActiveReplyId(review._id)}
                      className="flex items-center gap-2 text-[#f59e0b] hover:text-[#d97706] transition-colors text-sm font-bold border border-[#fef3c7] bg-[#fffbeb] px-5 py-2 rounded-full"
                    >
                      <MessageCircle size={16} />
                      Write a Reply
                    </button>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b] transition-all resize-none placeholder:text-slate-400"
                        rows="3"
                        placeholder={`Reply to ${
                          review.userId?.firstName || "guest"
                        }...`}
                        value={replyText[review._id] || ""}
                        onChange={(e) =>
                          setReplyText({
                            ...replyText,
                            [review._id]: e.target.value,
                          })
                        }
                        autoFocus
                      />
                      <div className="flex gap-3 mt-3 justify-end">
                        <button
                          onClick={() => setActiveReplyId(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReply(review._id)}
                          className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <Send size={12} />
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffReviews;