import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { StaffContext } from "../../context/StaffContext";
import {
  Star,
  Send,
  CornerDownRight,
  Calendar,
  MessageCircle,
  User,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Reply,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import EmptyReviewsState from "../../components/EmptyReviewsState";
import FilterDropdown from "../../components/Admin/FilterDropdown";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import { formatDatePHT, formatDateRangePHT, formatDateTimePHT } from "../../utils/dateTime";
import {
  matchesRealtimeEntity,
  STAFF_REALTIME_EVENT_NAME,
} from "../../utils/realtime";

const StaffReviews = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const location = useLocation();

  const decoded = sToken ? jwtDecode(sToken) : null; 
  const loggedInUserId = decoded?.id; 

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const REVIEW_PAGE_SIZE = 5;
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEW_PAGE_SIZE);
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editText, setEditText] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [flashTargetId, setFlashTargetId] = useState(null);
  const handledFlashRef = useRef(null);
  
  const [visibleHistoryId, setVisibleHistoryId] = useState(null); 
  const [visibleReviewHistoryId, setVisibleReviewHistoryId] = useState(null); 
  
  // State for child replies & main thread toggles
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedReviewThreads, setExpandedReviewThreads] = useState({});
  const [expandedReplyMessages, setExpandedReplyMessages] = useState({});
  const [lightbox, setLightbox] = useState({ images: [], index: 0 });

  // 🌟 State for Custom Delete Modal
  const [itemToDelete, setItemToDelete] = useState(null);

  const toggleReplies = (parentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const toggleReviewThreads = (reviewId) => {
    setExpandedReviewThreads((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const ratingBuckets = [5, 4, 3, 2, 1];
  const ratingFilterOptions = [
    { value: "all", label: "All Ratings", icon: Star },
    ...ratingBuckets.map((rating) => ({
      value: String(rating),
      label: `${rating} Star${rating === 1 ? "" : "s"}`,
      icon: Star,
    })),
  ];
  const visibleReviews = useMemo(() => {
    if (ratingFilter === "all") {
      return reviews;
    }

    return reviews.filter((review) => Number(review.rating || 0) === Number(ratingFilter));
  }, [reviews, ratingFilter]);

  /* ==========================================
     HELPER: Name Formatting
  ========================================== */
  const formatName = (userObj, role) => {
    if (role === "admin") return "MRH";
    
    if (userObj?.firstName) {
      const first = userObj.firstName || "";
      const middle = userObj.middleName || "";
      const last = userObj.lastName || "";
      return `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim();
    }
    
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest";
  };

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

  useEffect(() => {
    if (!backendUrl || !sToken) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["reviews"])) {
        fetchReviews();
      }
    };

    window.addEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [backendUrl, sToken]);

  useEffect(() => {
    if (!reviews.length) return;
    const params = new URLSearchParams(location.search);
    const flashParam = params.get("flash");
    const hasFlash = Boolean(flashParam || location.state?.flashNonce);
    if (!hasFlash) return;
    const flashKey = flashParam || location.state?.flashNonce;
    if (handledFlashRef.current === flashKey) return;
    handledFlashRef.current = flashKey;
    const reviewIdParam = params.get("reviewId");
    const replyIdParam = params.get("replyId");
    const stateReviewId = location.state?.reviewId;
    const stateReplyId = location.state?.replyId;

    let resolvedReviewId = reviewIdParam || stateReviewId;
    let resolvedReplyId = replyIdParam || stateReplyId;
    let parentReplyId = null;

    if (resolvedReplyId) {
      const matchReview = reviews.find((review) =>
        review.reviewChat?.some((chat) => String(chat._id) === String(resolvedReplyId))
      );
      if (matchReview) {
        resolvedReviewId = resolvedReviewId || matchReview._id;
        const replyMatch = matchReview.reviewChat.find(
          (chat) => String(chat._id) === String(resolvedReplyId)
        );
        if (replyMatch?.parentReplyId) {
          parentReplyId = String(replyMatch.parentReplyId);
        }
      }
    }

    if (resolvedReviewId) {
      const reviewIndex = visibleReviews.findIndex(
        (review) => String(review?._id) === String(resolvedReviewId)
      );
      if (reviewIndex !== -1) {
        setVisibleReviewCount((prev) => Math.max(prev, reviewIndex + 1));
      }
      setExpandedReviewThreads((prev) => ({ ...prev, [resolvedReviewId]: true }));
    }
    if (parentReplyId) {
      setExpandedReplies((prev) => ({ ...prev, [parentReplyId]: true }));
    }

    const targetId = resolvedReplyId
      ? `reply-${resolvedReplyId}`
      : resolvedReviewId
        ? `review-${resolvedReviewId}`
        : null;

    if (!targetId) return;

    setFlashTargetId(null);
    setTimeout(() => setFlashTargetId(targetId), 80);
    if (flashParam) {
      params.delete("flash");
      const cleanedSearch = params.toString();
      const cleanedUrl = `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`;
      window.history.replaceState(window.history.state, "", cleanedUrl);
    }
  }, [reviews, visibleReviews, location.search, location.state]);

  useEffect(() => {
    if (!flashTargetId) return;
    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(() => {
      const element = document.getElementById(flashTargetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
      attempts += 1;
    }, 250);
    return () => clearInterval(interval);
  }, [flashTargetId, visibleReviews]);

  useEffect(() => {
    setVisibleReviewCount((prev) =>
      Math.min(Math.max(REVIEW_PAGE_SIZE, prev), visibleReviews.length || REVIEW_PAGE_SIZE)
    );
  }, [visibleReviews.length]);

  /* ==========================================
     SEND REPLY
  ========================================== */
  const handleSendReply = async (reviewId, parentReplyId = null) => {
    const message = replyText[reviewId];

    if (!message.trim() === "") {
      return toast.warning("Please type a response first.");
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { response: message, parentReplyId: parentReplyId },
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Response sent successfully");
        setReplyText({ ...replyText, [reviewId]: "" });
        setActiveReplyId(null);
        
        if (parentReplyId) {
          setExpandedReplies(prev => ({ ...prev, [parentReplyId]: true }));
        } else {
          setExpandedReviewThreads(prev => ({ ...prev, [reviewId]: true }));
        }

        fetchReviews();
      }
    } catch (err) {
      toast.error("Failed to send response");
    }
  };

  /* ==========================================
     DELETE REPLY (Handled by Modal)
  ========================================== */
  const confirmDelete = (reviewId, replyId) => {
    setItemToDelete({ reviewId, replyId });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const { reviewId, replyId } = itemToDelete;

    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/reviews/reply/${reviewId}/${replyId}`,
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Reply permanently deleted");
        setItemToDelete(null);
        fetchReviews();
      }
    } catch (error) {
      toast.error("Failed to delete reply");
      setItemToDelete(null);
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
    return formatDatePHT(dateString);
  };

  const formatDateTime = (dateString) => {
    return formatDateTimePHT(dateString);
  };

  const resolveReviewImage = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  const openLightbox = (images, index = 0) => {
    const resolvedImages = (images || [])
      .map(resolveReviewImage)
      .filter(Boolean);
    if (!resolvedImages.length) return;
    const safeIndex = Math.max(0, Math.min(index, resolvedImages.length - 1));
    setLightbox({ images: resolvedImages, index: safeIndex });
  };

  const closeLightbox = () => {
    setLightbox({ images: [], index: 0 });
  };

  const showNextImage = () => {
    setLightbox((prev) => {
      if (!prev.images.length) return prev;
      return { ...prev, index: (prev.index + 1) % prev.images.length };
    });
  };

  const showPrevImage = () => {
    setLightbox((prev) => {
      if (!prev.images.length) return prev;
      return {
        ...prev,
        index: (prev.index - 1 + prev.images.length) % prev.images.length
      };
    });
  };

  const formatStayDate = (start, end) => {
    if (!start) return "Stay date unavailable";
    return (end ? formatDateRangePHT(start, end) : formatDatePHT(start)) || "Stay date unavailable";
  };

  const ratingCounts = ratingBuckets.reduce((acc, rating) => {
    acc[rating] = reviews.filter((review) => Number(review.rating || 0) === rating).length;
    return acc;
  }, {});
  const maxRatingCount = Math.max(1, ...ratingBuckets.map((rating) => ratingCounts[rating]));
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? (reviews.reduce((acc, item) => acc + (item.rating || 0), 0) / totalReviews).toFixed(1)
    : "0.0";
  const hasNoReviews = !isLoading && reviews.length === 0;

  return (
    <div className="reviews-page w-full min-h-full text-slate-800 relative">
      <div className="pointer-events-none absolute inset-0 -z-10"></div>
      <style>{`
        .reviews-page {
          background-color: #ffffff;
        }
        .review-card {
          position: relative;
          overflow: hidden;
          box-shadow: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .review-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 30px -24px rgba(15, 23, 42, 0.45);
        }
        @keyframes reviewFlash {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            background-color: rgba(59, 130, 246, 0.06);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25);
            background-color: rgba(59, 130, 246, 0.12);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            background-color: transparent;
          }
        }
        .flash-highlight {
          animation: reviewFlash 0.9s ease-in-out 0s 3;
        }
      `}</style>

      <div className="mx-auto w-full max-w-none px-3 pt-3 pb-20 sm:px-4 sm:pt-4 lg:px-8 xl:px-10 2xl:px-12">
      
      <div className="mb-5 w-full max-w-[1200px] mx-0 sm:mb-10">
        <div className="flex w-full max-w-[1200px] flex-col gap-4 pb-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">Guest Reviews</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Manage guest reviews and responses.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterDropdown
                label="Rating"
                options={ratingFilterOptions}
                value={ratingFilter}
                onChange={setRatingFilter}
                icon={Star}
                neutralValue="all"
                align="left"
                triggerClassName="w-full sm:w-[230px]"
                menuClassName="w-full sm:w-[260px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full max-w-[1200px] mx-0 ${hasNoReviews ? "flex justify-center" : "grid gap-4 sm:gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start"}`}>
        {!hasNoReviews && (
          <aside className="h-fit">
            <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400 mb-3">Ratings</p>
              <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Overall</p>
                <div className="mt-1 flex items-center gap-2">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  <span className="text-[14px] font-bold text-slate-900">{averageRating}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">{totalReviews} reviews</p>
              </div>
              <div className="space-y-2">
                {ratingBuckets.map((rating) => (
                  <div key={rating} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1 w-9">
                      <span>{rating}</span>
                      <Star size={12} className="text-amber-400" fill="currentColor" />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${(ratingCounts[rating] / maxRatingCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-6 text-right">{ratingCounts[rating]}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className={`flex w-full flex-col items-start space-y-5 sm:space-y-6 ${hasNoReviews ? "max-w-none pl-0" : "pl-0 xl:pl-4"}`}>
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Loading feedback...</div>
        ) : visibleReviews.length === 0 ? (
          reviews.length === 0 ? (
            <div className="flex min-h-[320px] w-full items-center justify-center">
              <EmptyReviewsState />
            </div>
          ) : (
            <div className="flex min-h-[220px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  No matching reviews found.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Change the star filter to view other reviews.
                </p>
              </div>
            </div>
          )
        ) : (
          visibleReviews.slice(0, visibleReviewCount).map((review) => {
            const parentChats = review.reviewChat ? review.reviewChat.filter(chat => !chat.parentReplyId) : [];
            const isThreadExpanded = expandedReviewThreads[review._id];
            const booking = review.bookingId;
            const bookingName = booking?.bookingName;
            const reviewMessage = review.comment || "";
            const isReviewMessageExpanded = !!expandedReplyMessages[`review-${review._id}`];
            const shouldTruncateReviewMessage = reviewMessage.length > 300;

            return (
              <div
                id={`review-${review._id}`}
                key={review._id}
                className={`group review-card bg-white rounded-2xl border border-slate-200 min-h-[180px] max-w-none w-full sm:max-w-[700px] ${flashTargetId === `review-${review._id}` ? "flash-highlight" : ""}`}
              >
                  <div className="p-4 sm:pl-5">
                  
                  {/* --- MAIN REVIEW HEADER --- */}
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="mt-2 flex items-center gap-3 sm:mt-6">
                        <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {review.userId?.image ? (
                            <img src={review.userId.image.startsWith('http') ? review.userId.image : `${backendUrl}/${review.userId.image}`} alt="User" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-[17px] leading-tight">{formatName(review.userId, "guest")}</h3>
                          <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> {formatStayDate(getBookingCheckInDateValue(booking), getBookingCheckOutDateValue(booking))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:ml-auto">
                      <div className="inline-flex min-w-[120px] items-center justify-between gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-amber-200"} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-amber-700">{Number(review.rating || 0)}.0</span>
                      </div>
                      <p className="mt-2 text-[8px] font-bold text-slate-300 uppercase tracking-widest flex justify-end gap-1">
                        {formatDateTime(review.createdAt)} {review.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                      </p>

                      {review.isEdited && review.editHistory && review.editHistory.length > 0 && (
                        <div className="flex justify-end mt-1">
                          <button 
                            onClick={() => setVisibleReviewHistoryId(visibleReviewHistoryId === review._id ? null : review._id)}
                            className="mt-2 inline-flex items-center gap-1 text-[8px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Clock size={10} />
                            {visibleReviewHistoryId === review._id ? "Hide Previous Versions" : "View Previous Versions"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GUEST EDIT HISTORY CONTENT */}
                  {visibleReviewHistoryId === review._id && review.editHistory && review.editHistory.length > 0 && (
                    <div className="mb-6 space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Previous Versions</p>
                      {review.editHistory.slice().reverse().map((history, reversedIdx) => {
                        // Accurately calculate the exact time this specific version was submitted
                        const originalIdx = review.editHistory.length - 1 - reversedIdx;
                        const postedTime = originalIdx === 0 
                          ? review.createdAt 
                          : review.editHistory[originalIdx - 1].editedAt;

                        return (
                          <div key={reversedIdx} className="relative pl-4 border-l-2 border-slate-200 py-1">
                            <div className="flex items-center gap-2 mb-1">
                              {history.rating && (
                                <div className="flex items-center gap-0.5 text-amber-500 bg-white px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">
                                  <span className="font-bold text-[10px]">{history.rating}</span>
                                  <Star size={10} fill="currentColor" />
                                </div>
                              )}
                              <span className="text-[10px] font-semibold text-slate-400">
                                Posted on {formatDateTime(postedTime)}
                              </span>
                            </div>
                            <p className="text-xs italic text-slate-500 leading-relaxed">
                              "{history.comment || "No written comment."}"
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* MAIN REVIEW CONTENT */}
                  <div className="mb-5">
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      {bookingName && (
                        <p className="text-[20px] font-bold text-slate-900 mb-2">
                          {bookingName}
                        </p>
                      )}
                      <p className="text-slate-700 text-[13px] leading-relaxed text-justify">
                        {shouldTruncateReviewMessage && !isReviewMessageExpanded
                          ? `${reviewMessage.slice(0, 300)}...`
                          : (reviewMessage || "No written review provided.")}
                      </p>
                      {shouldTruncateReviewMessage && (
                        <div className="mt-1 flex justify-center">
                          <button
                            onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [`review-${review._id}`]: !prev[`review-${review._id}`] }))}
                            className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            {isReviewMessageExpanded ? "See less" : "See more"}
                          </button>
                        </div>
                      )}
                    </div>
                    {Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {review.images.slice(0, 2).map((image, index) => {
                          const resolvedImage = resolveReviewImage(image);
                          if (!resolvedImage) return null;
                          return (
                            <button
                              key={`${review._id}-image-${index}`}
                              type="button"
                              onClick={() => openLightbox(review.images, index)}
                              className="h-14 w-14 overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
                              title="View image"
                            >
                              <img
                                src={resolvedImage}
                                alt={`Review ${index + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          );
                        })}
                        {review.images.length > 2 && (
                          <button
                            type="button"
                            onClick={() => openLightbox(review.images, 2)}
                            className="h-14 w-14 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500"
                            title="View more images"
                          >
                            +{review.images.length - 2} more
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* REPLIES (THREADED VIEW) */}
                  {parentChats.length > 0 && (
                    <>
                    {isThreadExpanded && (
                      <div className="mb-6 space-y-4">
                      {parentChats.map((parentChat) => {
                        
                        // Check if there are any child replies to this parent reply
                        const childReplies = review.reviewChat.filter(child => child.parentReplyId === parentChat._id);
                        const isExpanded = expandedReplies[parentChat._id];
                        const parentMessage = parentChat.message || "";
                        const isParentMessageExpanded = !!expandedReplyMessages[parentChat._id];
                        const shouldTruncateParentMessage = parentMessage.length > 300;
                        const parentReplyOwnerId = parentChat.senderId?._id || parentChat.senderId;
                        const isMyReply = String(parentReplyOwnerId || "") === String(loggedInUserId || "") && parentChat.senderRole === "staff";

                        return (
                          <div key={parentChat._id} className="space-y-3">
                            
                            {/* PARENT COMMENT BUBBLE */}
                            <div
                              id={`reply-${parentChat._id}`}
                              className={`relative group/thread rounded-lg p-5 text-sm transition ${parentChat.senderRole === "admin" || parentChat.senderRole === "staff" ? "bg-[#f8fafc] ml-8 border border-slate-100" : "bg-white border border-slate-100"} ${flashTargetId === `reply-${parentChat._id}` ? "flash-highlight" : ""}`}
                            >
                              {(parentChat.senderRole === "admin" || parentChat.senderRole === "staff") && (
                                <div className="absolute -left-6 top-5 text-[#cbd5e1]"><CornerDownRight size={20} /></div>
                              )}

                              <div className="flex items-center gap-2.5 mb-2 pr-10">
                                {parentChat.senderRole !== "admin" && (
                                  <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    {parentChat.senderId?.image ? (
                                      <img src={parentChat.senderId.image.startsWith('http') ? parentChat.senderId.image : `${backendUrl}/${parentChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                )}

                                <span className="font-bold text-slate-900 text-sm">{formatName(parentChat.senderId, parentChat.senderRole)}</span>

                                {parentChat.senderRole !== "guest" && (
                                  <span className={`${parentChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                                    {parentChat.senderRole}
                                  </span>
                                )}

                                <div className="text-[10px] text-slate-400 ml-auto flex flex-col items-end gap-1">
                                  <div className="flex items-center justify-end w-full gap-1">
                                    {formatDateTime(parentChat.createdAt)}
                                    {parentChat.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                                  </div>
                                  {parentChat.editHistory && parentChat.editHistory.length > 0 && (
                                    <button onClick={() => setVisibleHistoryId(visibleHistoryId === parentChat._id ? null : parentChat._id)} className="hover:text-blue-600 font-medium transition-colors flex items-center justify-end w-full gap-1">
                                      <Clock size={10} />
                                      {visibleHistoryId === parentChat._id ? "Hide History" : "View History"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* EDIT MODE */}
                              {editingReplyId === parentChat._id ? (
                                <>
                                  <textarea
                                    className="w-full border border-slate-200 rounded-lg p-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                  />
                                  <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={() => setEditingReplyId(null)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                                    <button onClick={() => handleEditReply(review._id, parentChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm hover:bg-blue-700">Save</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-slate-600 text-[13px] leading-relaxed pr-16">
                                    {shouldTruncateParentMessage && !isParentMessageExpanded
                                      ? `${parentMessage.slice(0, 300)}...`
                                      : parentMessage}
                                  </p>
                                  {shouldTruncateParentMessage && (
                                    <div className="mt-1 flex justify-center">
                                      <button
                                        onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [parentChat._id]: !prev[parentChat._id] }))}
                                        className="text-[9px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                                      >
                                        {isParentMessageExpanded ? "See less" : "See more"}
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* PARENT HISTORY CONTENT */}
                                  {visibleHistoryId === parentChat._id && (
                                    <div className="mt-4 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3 bg-white p-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Previous Versions</p>
                                      {[...parentChat.editHistory].reverse().map((history, reversedIdx) => {
                                        // Accurately calculate the exact time this specific version was submitted
                                        const originalIdx = parentChat.editHistory.length - 1 - reversedIdx;
                                        const postedTime = originalIdx === 0 
                                          ? parentChat.createdAt 
                                          : parentChat.editHistory[originalIdx - 1].editedAt;

                                        return (
                                          <div key={reversedIdx} className="flex flex-col items-end">
                                            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">
                                              Posted on {formatDateTime(postedTime)}
                                            </p>
                                            <p className="italic text-slate-600">"{history.message}"</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* STAFF ONLY: FLOATING ACTION MENU */}
                                  {isMyReply && (
                                    <div className="absolute top-10 right-4 opacity-0 group-hover/thread:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-md p-0.5 z-10">
                                      <button onClick={() => { setEditingReplyId(parentChat._id); setEditText(parentChat.message); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={13} /></button>
                                      <div className="w-px h-3 bg-slate-200"></div>
                                      <button onClick={() => confirmDelete(review._id, parentChat._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* TOGGLE REPLIES BUTTON */}
                            {childReplies.length > 0 && (
                              <div className="mt-1 flex justify-start ml-12">
                                <button onClick={() => toggleReplies(parentChat._id)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                  {isExpanded ? <><ChevronUp size={14} /> Hide {childReplies.length === 1 ? "reply" : "replies"}</> : <><CornerDownRight size={14} /> View {childReplies.length} {childReplies.length === 1 ? "reply" : "replies"}</>}
                                </button>
                              </div>
                            )}

                            {/* CHILD REPLIES */}
                            {isExpanded && childReplies.length > 0 && (
                              <div className="ml-12 space-y-3 border-l-2 border-slate-100 pl-4 mt-2">
                                {childReplies.map((childChat) => {
                                  const childMessage = childChat.message || "";
                                  const isChildMessageExpanded = !!expandedReplyMessages[childChat._id];
                                  const shouldTruncateChildMessage = childMessage.length > 300;
                                  const childReplyOwnerId = childChat.senderId?._id || childChat.senderId;
                                  const isMyChildReply = String(childReplyOwnerId || "") === String(loggedInUserId || "") && childChat.senderRole === "staff";

                                  return (
                                  <div
                                    id={`reply-${childChat._id}`}
                                    key={childChat._id}
                                    className={`relative group/thread rounded-lg p-4 text-sm transition ${childChat.senderRole === "admin" || childChat.senderRole === "staff" ? "bg-[#f8fafc] border border-slate-100" : "bg-white border border-slate-100"} ${flashTargetId === `reply-${childChat._id}` ? "flash-highlight" : ""}`}
                                  >
                                    <div className="flex items-center gap-2.5 mb-2 pr-10">
                                      {childChat.senderRole !== "admin" && (
                                        <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                          {childChat.senderId?.image ? (
                                            <img src={childChat.senderId.image.startsWith('http') ? childChat.senderId.image : `${backendUrl}/${childChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                          ) : (
                                            <User size={12} className="text-slate-400" />
                                          )}
                                        </div>
                                      )}

                                      <span className="font-bold text-slate-900 text-sm">{formatName(childChat.senderId, childChat.senderRole)}</span>

                                      {childChat.senderRole !== "guest" && (
                                        <span className={`${childChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                                          {childChat.senderRole}
                                        </span>
                                      )}
                                      
                                      <div className="text-[10px] text-slate-400 ml-auto flex flex-col items-end gap-1">
                                        <div className="flex items-center justify-end w-full gap-1">
                                          {formatDateTime(childChat.createdAt)}
                                          {childChat.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                                        </div>
                                        {childChat.editHistory && childChat.editHistory.length > 0 && (
                                          <button onClick={() => setVisibleHistoryId(visibleHistoryId === childChat._id ? null : childChat._id)} className="hover:text-blue-600 font-medium transition-colors flex items-center justify-end w-full gap-1">
                                            <Clock size={10} />
                                            {visibleHistoryId === childChat._id ? "Hide History" : "View History"}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* EDIT MODE */}
                                    {editingReplyId === childChat._id ? (
                                      <>
                                        <textarea
                                          className="w-full border border-slate-200 rounded-lg p-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                        />
                                        <div className="flex gap-2 mt-2 justify-end">
                                          <button onClick={() => setEditingReplyId(null)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                                          <button onClick={() => handleEditReply(review._id, childChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm hover:bg-blue-700">Save</button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-slate-600 text-[13px] leading-relaxed pr-10">
                                          {shouldTruncateChildMessage && !isChildMessageExpanded
                                            ? `${childMessage.slice(0, 300)}...`
                                            : childMessage}
                                        </p>
                                        {shouldTruncateChildMessage && (
                                          <div className="mt-1 flex justify-center">
                                            <button
                                              onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [childChat._id]: !prev[childChat._id] }))}
                                              className="text-[9px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                              {isChildMessageExpanded ? "See less" : "See more"}
                                            </button>
                                          </div>
                                        )}
                                        
                                        <div className="mt-2 flex justify-start items-center">
                                          {(!activeReplyId !== parentChat._id) && (
                                            <button onClick={() => { setActiveReplyId(parentChat._id); setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true })); }} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all hover:bg-blue-50 px-2 py-1 rounded-md -ml-2">
                                              <Reply size={14} /> Reply
                                            </button>
                                          )}
                                        </div>

                                        {/* CHILD HISTORY CONTENT */}
                                        {visibleHistoryId === childChat._id && (
                                          <div className="mt-4 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3 bg-white p-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Previous Versions</p>
                                            {[...childChat.editHistory].reverse().map((history, reversedIdx) => {
                                              // Accurately calculate the exact time this specific version was submitted
                                              const originalIdx = childChat.editHistory.length - 1 - reversedIdx;
                                              const postedTime = originalIdx === 0 
                                                ? childChat.createdAt 
                                                : childChat.editHistory[originalIdx - 1].editedAt;

                                              return (
                                                <div key={reversedIdx} className="flex flex-col items-end">
                                                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">
                                                    Posted on {formatDateTime(postedTime)}
                                                  </p>
                                                  <p className="italic text-slate-600">"{history.message}"</p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* ADMIN ONLY: FLOATING ACTION MENU */}
                                        {isMyChildReply && (
                                          <div className="absolute top-10 right-4 opacity-0 group-hover/thread:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-md p-0.5 z-10">
                                            <button onClick={() => { setEditingReplyId(childChat._id); setEditText(childChat.message); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={13} /></button>
                                            <div className="w-px h-3 bg-slate-200"></div>
                                            <button onClick={() => confirmDelete(review._id, childChat._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* TARGETED INPUT BOX */}
                            {activeReplyId === parentChat._id && (
                              <div className="ml-12 pl-4 border-l-2 border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200 mt-3">
                                <textarea
                                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none placeholder:text-slate-400 shadow-sm"
                                  rows="2"
                                  placeholder={`Write a reply...`}
                                  value={replyText[review._id] || ""}
                                  onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                                  autoFocus
                                />
                                <div className="flex gap-3 mt-3 justify-end">
                                  <button onClick={() => setActiveReplyId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                                  <button onClick={() => handleSendReply(review._id, parentChat._id)} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
                                    <Send size={12} /> Send
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}

                      </div>
                    )}
                    <div className="flex justify-center mt-2">
                      <button onClick={() => toggleReviewThreads(review._id)} className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm">
                        {isThreadExpanded ? <><ChevronUp size={14} /> Hide {parentChats.length === 1 ? "reply" : "replies"}</> : <><ChevronDown size={14} /> See {parentChats.length} {parentChats.length === 1 ? "reply" : "replies"}</>}
                      </button>
                    </div>
                    </>
                  )}

                  {/* MAIN LEVEL "WRITE A REPLY" */}
                  <div className="pt-2 border-t border-slate-100 mt-4">
                    {!activeReplyId || (activeReplyId !== review._id && !review.reviewChat.find(c => c._id === activeReplyId)) ? (
                      <button onClick={() => setActiveReplyId(review._id)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-bold border border-blue-100 bg-blue-50 px-5 py-2 rounded-full mt-2">
                        <MessageCircle size={16} /> Write a reply
                      </button>
                    ) : activeReplyId === review._id && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-4">
                        <textarea className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none placeholder:text-slate-400 shadow-sm" rows="3" placeholder="Write a reply..." value={replyText[review._id] || ""} onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })} autoFocus />
                        <div className="flex gap-3 mt-3 justify-end">
                          <button onClick={() => setActiveReplyId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                          <button onClick={() => handleSendReply(review._id, null)} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
                            <Send size={12} /> Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
          {!isLoading && visibleReviews.length > visibleReviewCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleReviewCount((prev) => Math.min(prev + REVIEW_PAGE_SIZE, visibleReviews.length))}
                className="bg-white border border-slate-200 px-5 py-2 rounded-full text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm"
              >
                Show more reviews
              </button>
            </div>
          )}
      </div>
    </div>
  </div>

      {/* DELETION CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
              <Trash2 className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Reply?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              This action cannot be undone. This reply will be permanently removed from the thread.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setItemToDelete(null)} 
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete} 
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox.images.length > 0 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-3xl mx-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
              <img
                src={lightbox.images[lightbox.index]}
                alt={`Review image ${lightbox.index + 1}`}
                className="w-full max-h-[80vh] object-contain bg-black"
              />
              {lightbox.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    title="Previous"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    title="Next"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">
                    {lightbox.index + 1} / {lightbox.images.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReviews;


