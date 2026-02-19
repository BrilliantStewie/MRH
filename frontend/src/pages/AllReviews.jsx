import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import { Star, Calendar, CornerDownRight, Send } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AllReviews = () => {
  const { backendUrl, userData, token } = useContext(AppContext);

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  /* ============================================================
     FETCH REVIEWS
  ============================================================ */
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [backendUrl]);

  /* ============================================================
     HANDLE REPLY
  ============================================================ */
  const handleReply = async (reviewId) => {
    const message = replyText[reviewId];

    if (!message || message.trim() === "") {
      return toast.warning("Reply cannot be empty");
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { response: message },
        { headers: { token } }
      );

      if (data.success) {
        toast.success("Reply added successfully");
        setReplyText({ ...replyText, [reviewId]: "" });
        fetchReviews();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  /* ============================================================
     AVERAGE RATING
  ============================================================ */
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
        
        {/* LEFT SIDE */}
        <div className="space-y-10">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">
              Loading guest experiences...
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No reviews yet.
            </div>
          ) : (
            reviews.map((review) => {
              const isOwner =
                token &&
                userData?._id &&
                review.userId?._id === userData._id;

              return (
                <div
                  key={review._id}
                  className="bg-white rounded-[2rem] p-10 border border-gray-100"
                >
                  {/* USER INFO */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xl text-[#1E293B]">
                        {review.userId?.firstName}{" "}
                        {review.userId?.lastName}
                      </h3>

                      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={
                            i < review.rating
                              ? "text-[#F6AD55] fill-[#F6AD55]"
                              : "text-gray-200"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* REVIEW COMMENT */}
                  <p className="mt-6 text-lg italic text-[#64748B]">
                    "{review.comment}"
                  </p>

                  {/* REPLIES */}
                  {review.reviewChat?.length > 0 && (
                    <div className="mt-8 space-y-4">
                      {review.reviewChat.map((chat) => (
                        <div
                          key={chat._id}
                          className="ml-6 p-4 bg-gray-50 rounded-xl border"
                        >
                          <p className="text-sm font-bold text-gray-700">
                            {chat.senderRole === "admin"
                              ? "Management"
                              : chat.senderId === userData?._id
                              ? "You"
                              : "Guest"}
                          </p>

                          <p className="text-gray-600 mt-1">
                            {chat.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* OWNER REPLY BOX */}
                  {isOwner && (
                    <div className="mt-8">
                      <textarea
                        className="w-full border rounded-xl p-3 text-sm"
                        placeholder="Write a reply..."
                        value={replyText[review._id] || ""}
                        onChange={(e) =>
                          setReplyText({
                            ...replyText,
                            [review._id]: e.target.value
                          })
                        }
                      />
                      <button
                        onClick={() => handleReply(review._id)}
                        className="mt-3 bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2"
                      >
                        <Send size={16} /> Reply
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT SIDE SUMMARY */}
        <aside className="hidden lg:block">
          <div className="bg-white rounded-[2rem] p-10 shadow">
            <h2 className="text-6xl font-bold text-center">
              {averageRating}
            </h2>
            <p className="text-center text-gray-400 mt-2">
              Based on {reviews.length} reviews
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default AllReviews;
