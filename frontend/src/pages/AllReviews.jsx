import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import {
  Star,
  Send,
  CornerDownRight,
  Calendar,
  Camera,
  User,
  ChevronDown,
  ChevronUp,
  Reply,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  BedDouble,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import EmptyReviewsState from "../components/EmptyReviewsState";

const AllReviews = () => {
  const { backendUrl, token, userData } = useContext(AppContext);
  const loggedInUserId = userData?._id; // Identifies the currently logged-in guest
  const location = useLocation();

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const REVIEW_PAGE_SIZE = 5;
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEW_PAGE_SIZE);
  
  // Replying State
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  
  // Editing State
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5); // <-- Added for star editing
  const [editReviewImages, setEditReviewImages] = useState([]);
  const [editReviewNewImages, setEditReviewNewImages] = useState([]);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [flashTargetId, setFlashTargetId] = useState(null);
  const handledFlashRef = useRef(null);

  // Deletion Modal State
  const [itemToDelete, setItemToDelete] = useState(null); 
  
  // History & Toggles State
  const [visibleHistoryId, setVisibleHistoryId] = useState(null); 
  const [visibleReviewHistoryId, setVisibleReviewHistoryId] = useState(null); 
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedReviewThreads, setExpandedReviewThreads] = useState({});
  const [expandedReplyMessages, setExpandedReplyMessages] = useState({});
  const [lightbox, setLightbox] = useState({ images: [], index: 0 });

  const toggleReplies = (parentId) => {
    setExpandedReplies(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const toggleReviewThreads = (reviewId) => {
    setExpandedReviewThreads(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  /* ==========================================
     API: FETCH REVIEWS
  ========================================== */
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      }
    } catch (err) {
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchReviews(); 
  }, [backendUrl]);

  useEffect(() => {
    setVisibleReviewCount((prev) => Math.min(Math.max(REVIEW_PAGE_SIZE, prev), reviews.length || REVIEW_PAGE_SIZE));
  }, [reviews.length]);

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
    const stateHighlightType = location.state?.highlightType;

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

    if (!resolvedReplyId && !resolvedReviewId && stateHighlightType === "new_reply") {
      const latestReply = reviews
        .filter((review) => String(review.userId?._id || review.userId) === String(loggedInUserId))
        .flatMap((review) =>
          (review.reviewChat || [])
            .filter((chat) => chat.senderRole === "admin" || chat.senderRole === "staff")
            .map((chat) => ({
              reviewId: review._id,
              replyId: chat._id,
              createdAt: chat.createdAt,
              parentReplyId: chat.parentReplyId
            }))
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (latestReply) {
        resolvedReviewId = latestReply.reviewId;
        resolvedReplyId = latestReply.replyId;
        if (latestReply.parentReplyId) {
          parentReplyId = String(latestReply.parentReplyId);
        }
      }
    }

    if (resolvedReviewId) {
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

    let canceled = false;
    const timeouts = [];

    setFlashTargetId(null);
    timeouts.push(setTimeout(() => setFlashTargetId(targetId), 80));
    timeouts.push(setTimeout(() => setFlashTargetId(null), 3000));

    const tryScroll = (attempt = 0) => {
      if (canceled) return;
      const element = document.getElementById(targetId);
      if (!element && attempt < 8) {
        timeouts.push(setTimeout(() => tryScroll(attempt + 1), 150));
        return;
      }
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    timeouts.push(setTimeout(() => tryScroll(0), 120));

    if (flashParam) {
      params.delete("flash");
      const cleanedSearch = params.toString();
      const cleanedUrl = `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`;
      window.history.replaceState(window.history.state, "", cleanedUrl);
    }

    return () => {
      canceled = true;
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [reviews, location.search, location.state, loggedInUserId]);

  /* ==========================================
     API: ACTIONS (Reply, Edit, Delete)
  ========================================== */
  const handleSendReply = async (reviewId, parentReplyId = null) => {
    const message = replyText[reviewId];
    if (!message?.trim()) return toast.warning("Please type a response first.");

    try {
      const { data } = await axios.post(`${backendUrl}/api/reviews/reply/${reviewId}`, 
        { response: message, parentReplyId }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

      if (data.success) {
        toast.success("Response posted");
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
      toast.error("Failed to post response"); 
    }
  };

  const MAX_REVIEW_IMAGES = 6;
  const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;

  const clearEditReviewNewImages = () => {
    editReviewNewImages.forEach((img) => {
      if (img?.preview) URL.revokeObjectURL(img.preview);
    });
    setEditReviewNewImages([]);
  };

  const handleEditReviewImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const usedSlots = editReviewImages.length + editReviewNewImages.length;
    const availableSlots = MAX_REVIEW_IMAGES - usedSlots;
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
      if (usedSlots + nextImages.length >= MAX_REVIEW_IMAGES) {
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
      setEditReviewNewImages((prev) => [...prev, ...nextImages]);
    }

    event.target.value = "";
  };

  const handleRemoveEditReviewImage = (image) => {
    setEditReviewImages((prev) => prev.filter((img) => img !== image));
  };

  const handleRemoveEditReviewNewImage = (id) => {
    setEditReviewNewImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleCancelEditReview = () => {
    clearEditReviewNewImages();
    setEditReviewImages([]);
    setEditingReviewId(null);
  };

  const handleEditReview = async (reviewId) => {
    if (!editReviewText.trim()) return toast.warning("Review cannot be empty.");
    try {
      const reviewForm = new FormData();
      reviewForm.append("comment", editReviewText);
      reviewForm.append("rating", editReviewRating);
      reviewForm.append("existingImages", JSON.stringify(editReviewImages));
      editReviewNewImages.forEach((image) => {
        reviewForm.append("images", image.file);
      });

      const { data } = await axios.put(`${backendUrl}/api/reviews/${reviewId}`, reviewForm, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (data.success) {
        toast.success("Review updated");
        setEditingReviewId(null);
        setEditReviewImages([]);
        clearEditReviewNewImages();
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to update review"); 
    }
  };

  const handleEditReply = async (replyId) => {
    if (!editReplyText.trim()) return toast.warning("Reply cannot be empty.");
    try {
      const { data } = await axios.put(`${backendUrl}/api/reviews/edit-reply/${replyId}`, { message: editReplyText }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
      if (data.success) {
        toast.success("Reply updated");
        setEditingReplyId(null);
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to update reply"); 
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const endpoint = itemToDelete.type === 'reply' 
        ? `${backendUrl}/api/reviews/delete-reply/${itemToDelete.id}`
        : `${backendUrl}/api/reviews/${itemToDelete.id}`; 

      const { data } = await axios.delete(endpoint, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
      
      if (data.success) {
        toast.success(`${itemToDelete.type === 'reply' ? 'Reply' : 'Review'} deleted`);
        setItemToDelete(null);
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to delete"); 
    }
  };

  /* ==========================================
     HELPERS
  ========================================== */
  const formatName = (userObj, role) => {
    if (role === "admin") return "MRH"; 
    if (userObj?.firstName) return `${userObj.firstName} ${userObj.middleName || ""} ${userObj.lastName || ""}`.replace(/\s+/g, ' ').trim();
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest";
  };
  
  const formatDateTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "";
  };
  const formatDateRange = (start, end) => {
    if (!start || !end) return "Dates not available";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startLabel = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endLabel = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startLabel} - ${endLabel}`;
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
  const ratingBuckets = [5, 4, 3, 2, 1];
  const ratingCounts = ratingBuckets.reduce((acc, rating) => {
    acc[rating] = reviews.filter((review) => Number(review.rating || 0) === rating).length;
    return acc;
  }, {});
  const maxRatingCount = Math.max(1, ...ratingBuckets.map((rating) => ratingCounts[rating]));
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews).toFixed(1)
    : "0.0";
  const hasNoReviews = !isLoading && reviews.length === 0;
  const totalEditImages = editReviewImages.length + editReviewNewImages.length;
  const remainingEditSlots = MAX_REVIEW_IMAGES - totalEditImages;


  return (
    <div className="reviews-page w-full min-h-screen text-slate-800 relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-slate-50 via-white to-transparent" />
      </div>
      <Navbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes flashPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            background-color: rgba(59, 130, 246, 0.08);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.35);
            background-color: rgba(59, 130, 246, 0.16);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            background-color: transparent;
          }
        }
        .flash-highlight {
          animation: flashPulse 0.9s ease-in-out 0s 3;
        }
        .reviews-page {
          font-family: 'Manrope', 'Segoe UI', system-ui, -apple-system, sans-serif;
          background-color: #f5f7fb;
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
      `}</style>
      
      <div className="w-full max-w-none mx-auto px-6 lg:px-24 xl:px-32 2xl:px-40 pt-28 pb-20">
        <div className="mb-10 w-full max-w-[1200px] mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-slate-400">
            All Reviews
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Guest Feedback</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Clear, organized feedback with booking context for quick responses.
          </p>
        </div>

        <div className={`w-full max-w-[1200px] mx-auto ${hasNoReviews ? "flex justify-center" : "grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start"}`}>
          {!hasNoReviews && (
            <aside className="sticky top-28 h-fit">
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

          <div className={`space-y-6 flex flex-col items-start w-full ${hasNoReviews ? "max-w-none pl-0" : "pl-8"}`}>
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Loading experiences...</div>
          ) : reviews.length === 0 ? (
            <div className="flex min-h-[320px] w-full items-center justify-center">
              <EmptyReviewsState />
            </div>
          ) : (
            reviews.slice(0, visibleReviewCount).map((review) => {
              const parentChats = review.reviewChat ? review.reviewChat.filter(chat => !chat.parentReplyId) : [];
              const isThreadExpanded = expandedReviewThreads[review._id];
              const RepliesToggleIcon = isThreadExpanded ? ChevronUp : ChevronDown;
              const repliesToggleText = isThreadExpanded
                ? "Hide replies"
                : `See ${parentChats.length} ${parentChats.length === 1 ? "reply" : "replies"}`;
              const booking = review.bookingId;
              const bookingName = booking?.bookingName;
              const reviewMessage = review.comment || "";
              const isReviewMessageExpanded = !!expandedReplyMessages[`review-${review._id}`];
              const shouldTruncateReviewMessage = reviewMessage.length > 300;
              const roomSummary = "";
              
              // Identify if the logged-in user owns this main review
              const reviewOwnerId = String(review.userId?._id || review.userId || "");
              const isMyReview = Boolean(reviewOwnerId) && String(loggedInUserId || "") === reviewOwnerId;
              const canReply = isMyReview || userData?.role === "admin" || userData?.role === "staff";

              return (
              <div id={`review-${review._id}`} key={review._id} className={`group review-card bg-white rounded-2xl border border-slate-200 min-h-[180px] max-w-[700px] w-full ${flashTargetId === `review-${review._id}` ? "flash-highlight" : ""}`}>
                  <div className="p-4 pl-5">
                    
                    {/* --- MAIN REVIEW HEADER --- */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                      <div className="flex flex-col gap-2">
                        <div className="mt-6 flex items-center gap-3">
                          {/* DYNAMIC AVATAR */}
                          <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {review.userId?.image ? (
                              <img src={review.userId.image.startsWith('http') ? review.userId.image : `${backendUrl}/${review.userId.image}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-[17px] leading-tight">{formatName(review.userId, "guest")}</h3>
                            <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} /> {formatDateRange(booking?.check_in, booking?.check_out)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:ml-auto">
                        <div className="inline-flex min-w-[120px] items-center justify-between gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                          <div className="flex gap-1 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={i < review.rating ? "currentColor" : "none"}
                                className={i < review.rating ? "" : "text-amber-200"}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-amber-700">{review.rating}.0</span>
                        </div>
                        <p className="mt-2 text-[8px] font-bold text-slate-300 uppercase tracking-widest flex justify-end gap-1">
                          {formatDateTime(review.createdAt)} {review.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                        </p>
                        
                        {/* MAIN REVIEW: EDIT HISTORY TOGGLE */}
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

                        {/* OWNERSHIP ACTIONS FOR MAIN REVIEW */}
                        {isMyReview && (
                          <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg p-1 shadow-sm">
                              <button onClick={() => { 
                                clearEditReviewNewImages();
                                setEditReviewImages(Array.isArray(review.images) ? review.images : []);
                                setEditingReviewId(review._id); 
                                setEditReviewText(review.comment);
                                setEditReviewRating(review.rating);
                              }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Review">
                                <Pencil size={14} />
                              </button>
                              <div className="w-px h-4 bg-slate-200"></div>
                              <button onClick={() => setItemToDelete({ type: 'review', id: review._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Review">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MAIN REVIEW: EDIT HISTORY CONTENT */}
                    {visibleReviewHistoryId === review._id && review.editHistory && review.editHistory.length > 0 && (
                      <div className="mb-6 space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Previous Versions</p>
                        {review.editHistory.slice().reverse().map((history, reversedIdx) => {
                          const originalIdx = review.editHistory.length - 1 - reversedIdx;
                          const postedTime = originalIdx === 0 ? review.createdAt : review.editHistory[originalIdx - 1].editedAt;

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

                    {/* --- MAIN REVIEW CONTENT (Hover to edit/delete) --- */}
                    <div className="mb-5 relative rounded-xl transition-all group/review">
                      {editingReviewId === review._id ? (
                        <div className="animate-in fade-in duration-200">
                          {/* INTERACTIVE STAR SELECTOR */}
                          <div className="flex items-center gap-1 mb-3 bg-slate-50 border border-slate-200 w-fit px-3 py-1.5 rounded-lg shadow-sm">
                            <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider">Rating:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setEditReviewRating(star)}
                                className={`transition-colors ${editReviewRating >= star ? 'text-amber-400 hover:text-amber-500' : 'text-slate-200 hover:text-slate-300'}`}
                              >
                                <Star size={18} fill={editReviewRating >= star ? "currentColor" : "none"} />
                              </button>
                            ))}
                          </div>

                          <textarea 
                            className="w-full bg-white border-2 border-blue-400 rounded-xl p-4 text-sm focus:outline-none resize-none shadow-sm mb-2" 
                            rows="3" 
                            value={editReviewText} 
                            onChange={(e) => setEditReviewText(e.target.value)} 
                            autoFocus 
                          />
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                              <span>Photos</span>
                              <span>{Math.max(0, totalEditImages)}/{MAX_REVIEW_IMAGES}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {editReviewImages.map((image) => {
                                const resolvedImage = resolveReviewImage(image);
                                if (!resolvedImage) return null;
                                return (
                                  <div key={image} className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                    <img
                                      src={resolvedImage}
                                      alt="Review"
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditReviewImage(image)}
                                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 flex items-center justify-center shadow-sm"
                                      title="Remove image"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                );
                              })}
                              {editReviewNewImages.map((image) => (
                                <div key={image.id} className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                  <img
                                    src={image.preview}
                                    alt="New upload"
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditReviewNewImage(image.id)}
                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 flex items-center justify-center shadow-sm"
                                    title="Remove image"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              {remainingEditSlots > 0 && (
                                <label className="h-12 w-12 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-semibold text-slate-500 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleEditReviewImageChange}
                                  />
                                  <Camera size={14} />
                                </label>
                              )}
                            </div>
                            <p className="mt-1 text-[9px] text-slate-400">Up to 6 images, 5MB each.</p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={handleCancelEditReview} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                            <button onClick={() => handleEditReview(review._id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Save Changes</button>
                          </div>
                        </div>
                      ) : (
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
                              <button
                                onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [`review-${review._id}`]: !prev[`review-${review._id}`] }))}
                                className="mt-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                {isReviewMessageExpanded ? "See less" : "See more"}
                              </button>
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
                      )}
                    </div>

                   


                    {/* --- REPLIES THREAD --- */}
                    {parentChats.length > 0 && (
                      <div className="mb-2 space-y-4">
                        {(isThreadExpanded ? parentChats : []).map((parentChat) => {
                          const childReplies = review.reviewChat.filter(child => child.parentReplyId === parentChat._id);
                          const isExpanded = expandedReplies[parentChat._id];
                          const parentMessage = parentChat.message || "";
                          const isParentMessageExpanded = !!expandedReplyMessages[parentChat._id];
                          const shouldTruncateParentMessage = parentMessage.length > 300;
                          
                          const replyOwnerId = parentChat.senderId?._id || parentChat.senderId;
                          const isMyReply = replyOwnerId === loggedInUserId && parentChat.senderRole === "guest";

                          return (
                            <div key={parentChat._id} className="space-y-3">
                              
                              <div id={`reply-${parentChat._id}`} className={`relative group/reply rounded-lg p-3 text-[12px] transition ${parentChat.senderRole === "admin" || parentChat.senderRole === "staff" ? "bg-[#f8fafc] ml-8 border border-slate-100" : "bg-white border border-slate-100 shadow-sm"} ${flashTargetId === `reply-${parentChat._id}` ? "flash-highlight" : ""}`}>
                                
                                <div className="flex items-start gap-2.5 mb-0.5">
                                  {parentChat.senderRole !== "admin" && (
                                    <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                      {parentChat.senderId?.image ? (
                                        <img src={parentChat.senderId.image.startsWith('http') ? parentChat.senderId.image : `${backendUrl}/${parentChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[11px] font-bold uppercase text-slate-500">{parentChat.senderId?.firstName ? parentChat.senderId.firstName.charAt(0) : parentChat.senderRole.charAt(0)}</span>
                                      )}
                                    </div>
                                  )}

                                  <span className="font-bold text-slate-900 text-[13px]">{formatName(parentChat.senderId, parentChat.senderRole)}</span>
                                  {parentChat.senderRole !== "guest" && (
                                    <span className={`${parentChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{parentChat.senderRole}</span>
                                  )}
                                  
                                  <div className="ml-auto text-[10px] text-slate-400 flex flex-col items-end gap-1">
                                    <div className="flex items-center justify-end w-full gap-1">
                                      {formatDateTime(parentChat.createdAt)} {parentChat.isEdited && "(Edited)"}
                                    </div>
                                    {parentChat.editHistory && parentChat.editHistory.length > 0 && (
                                      <button onClick={() => setVisibleHistoryId(visibleHistoryId === parentChat._id ? null : parentChat._id)} className="hover:text-blue-600 font-medium transition-colors flex items-center justify-end w-full gap-1 mt-1">
                                        <Clock size={10} />
                                        {visibleHistoryId === parentChat._id ? "Hide Previous Versions" : "View Previous Versions"}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {editingReplyId === parentChat._id ? (
                                  <div className="mt-2">
                                    <textarea className="w-full bg-white border-2 border-blue-400 rounded-lg p-2.5 text-[12px] focus:outline-none resize-none shadow-sm" rows="2" value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)} autoFocus />
                                    <div className="flex justify-end gap-2 mt-2">
                                      <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500">Cancel</button>
                                      <button onClick={() => handleEditReply(parentChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-slate-600 text-[13px] leading-relaxed">
                                      {shouldTruncateParentMessage && !isParentMessageExpanded
                                        ? `${parentMessage.slice(0, 300)}...`
                                        : parentMessage}
                                    </p>
                                    {shouldTruncateParentMessage && (
                                      <button
                                        onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [parentChat._id]: !prev[parentChat._id] }))}
                                        className="mt-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                                      >
                                        {isParentMessageExpanded ? "See less" : "See more"}
                                      </button>
                                    )}
                                    {isMyReply && (
                                      <div className="mt-1 flex justify-end">
                                        <div className="opacity-0 group-hover/reply:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm pointer-events-none group-hover/reply:pointer-events-auto">
                                          <button onClick={() => { setEditingReplyId(parentChat._id); setEditReplyText(parentChat.message); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Reply"><Pencil size={12} /></button>
                                          <div className="w-px h-3 bg-slate-200"></div>
                                          <button onClick={() => setItemToDelete({ type: 'reply', id: parentChat._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Reply"><Trash2 size={12} /></button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {visibleHistoryId === parentChat._id && (
                                  <div className="mt-4 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3 bg-white p-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Previous Versions</p>
                                    {[...parentChat.editHistory].reverse().map((history, reversedIdx) => {
                                      const originalIdx = parentChat.editHistory.length - 1 - reversedIdx;
                                      const postedTime = originalIdx === 0 ? parentChat.createdAt : parentChat.editHistory[originalIdx - 1].editedAt;

                                      return (
                                        <div key={reversedIdx} className="flex flex-col items-end">
                                          <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Posted on {formatDateTime(postedTime)}</p>
                                          <p className="italic text-slate-600">"{history.message}"</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="mt-2 flex justify-start items-center">
                                  {canReply && (!activeReplyId || activeReplyId !== parentChat._id) && (
  <button
    onClick={() => {
      setActiveReplyId(parentChat._id);
      setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true }));
    }}
    className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest px-2 py-1 rounded-md -ml-2 transition-colors hover:bg-blue-50"
  >
    <Reply size={14} /> Reply
  </button>
)}
                                </div>
                              </div>

                              {childReplies.length > 0 && (
                                <button onClick={() => toggleReplies(parentChat._id)} className="ml-12 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                  {isExpanded ? <><ChevronUp size={14} /> Hide replies</> : <><CornerDownRight size={14} /> View {childReplies.length} {childReplies.length === 1 ? "reply" : "replies"}</>}
                                </button>
                              )}

                              {isExpanded && childReplies.length > 0 && (
                                <div className="ml-12 space-y-3 border-l-2 border-slate-100 pl-4 mt-2">
                                  {childReplies.map((childChat) => {
                                    const childOwnerId = childChat.senderId?._id || childChat.senderId;
                                    const isMyChildReply = childOwnerId === loggedInUserId && childChat.senderRole === "guest";
                                    const childMessage = childChat.message || "";
                                    const isChildMessageExpanded = !!expandedReplyMessages[childChat._id];
                                    const shouldTruncateChildMessage = childMessage.length > 300;

                                    return (
                              <div id={`reply-${childChat._id}`} key={childChat._id} className={`relative group/child rounded-lg p-2.5 text-[12px] transition ${childChat.senderRole === "admin" || childChat.senderRole === "staff" ? "bg-[#f8fafc] border border-slate-100" : "bg-white border border-slate-100 shadow-sm"} ${flashTargetId === `reply-${childChat._id}` ? "flash-highlight" : ""}`}>
                                        
                                        <div className="flex items-start gap-2.5 mb-0.5">
                                          {childChat.senderRole !== "admin" && (
                                            <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                              {childChat.senderId?.image ? (
                                                <img src={childChat.senderId.image.startsWith('http') ? childChat.senderId.image : `${backendUrl}/${childChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                              ) : (
                                                <span className="text-[10px] font-bold uppercase text-slate-500">{childChat.senderId?.firstName ? childChat.senderId.firstName.charAt(0) : childChat.senderRole.charAt(0)}</span>
                                              )}
                                            </div>
                                          )}

                                          <span className="font-bold text-slate-900 text-[13px]">{formatName(childChat.senderId, childChat.senderRole)}</span>
                                          {childChat.senderRole !== "guest" && (
                                            <span className={`${childChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{childChat.senderRole}</span>
                                          )}
                                          
                                          <div className="ml-auto text-[10px] text-slate-400 flex flex-col items-end gap-1">
                                            <div className="flex items-center justify-end w-full gap-1">
                                              {formatDateTime(childChat.createdAt)} {childChat.isEdited && "(Edited)"}
                                            </div>
                                            {childChat.editHistory && childChat.editHistory.length > 0 && (
                                              <button onClick={() => setVisibleHistoryId(visibleHistoryId === childChat._id ? null : childChat._id)} className="hover:text-blue-600 font-medium transition-colors flex items-center justify-end w-full gap-1 mt-1">
                                                <Clock size={10} />
                                                {visibleHistoryId === childChat._id ? "Hide Previous Versions" : "View Previous Versions"}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {editingReplyId === childChat._id ? (
                                          <div className="mt-2">
                                            <textarea className="w-full bg-white border-2 border-blue-400 rounded-lg p-2.5 text-[12px] focus:outline-none resize-none shadow-sm" rows="2" value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)} autoFocus />
                                            <div className="flex justify-end gap-2 mt-2">
                                              <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500">Cancel</button>
                                              <button onClick={() => handleEditReply(childChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Save</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="text-slate-600 text-[13px] leading-relaxed">
                                              {shouldTruncateChildMessage && !isChildMessageExpanded
                                                ? `${childMessage.slice(0, 300)}...`
                                                : childMessage}
                                            </p>
                                            {shouldTruncateChildMessage && (
                                              <button
                                                onClick={() => setExpandedReplyMessages((prev) => ({ ...prev, [childChat._id]: !prev[childChat._id] }))}
                                                className="mt-1 text-[9px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                                              >
                                                {isChildMessageExpanded ? "See less" : "See more"}
                                              </button>
                                            )}
                                            {isMyChildReply && (
                                              <div className="mt-1 flex justify-end">
                                                <div className="opacity-0 group-hover/child:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm pointer-events-none group-hover/child:pointer-events-auto">
                                                  <button onClick={() => { setEditingReplyId(childChat._id); setEditReplyText(childChat.message); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Reply"><Pencil size={12} /></button>
                                                  <div className="w-px h-3 bg-slate-200"></div>
                                                  <button onClick={() => setItemToDelete({ type: 'reply', id: childChat._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Reply"><Trash2 size={12} /></button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {visibleHistoryId === childChat._id && (
                                          <div className="mt-4 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3 bg-white p-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Previous Versions</p>
                                            {[...childChat.editHistory].reverse().map((history, reversedIdx) => {
                                              const originalIdx = childChat.editHistory.length - 1 - reversedIdx;
                                              const postedTime = originalIdx === 0 ? childChat.createdAt : childChat.editHistory[originalIdx - 1].editedAt;

                                              return (
                                                <div key={reversedIdx} className="flex flex-col items-end">
                                                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Posted on {formatDateTime(postedTime)}</p>
                                                  <p className="italic text-slate-600">"{history.message}"</p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        <div className="mt-1 flex justify-start items-center">
                                          {canReply && (!activeReplyId || activeReplyId !== parentChat._id) && (
                                            <button onClick={() => { setActiveReplyId(parentChat._id); setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true })); }} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest px-2 py-1 rounded-md -ml-2 transition-colors hover:bg-blue-50">
                                              <Reply size={14} /> Reply
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {activeReplyId === parentChat._id && (
                                <div className="ml-12 pl-4 border-l-2 border-slate-100 mt-3 animate-in fade-in duration-200">
                                  <textarea className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 resize-none shadow-sm" rows="2" placeholder="Write a reply..." value={replyText[review._id] || ""} onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })} autoFocus />
                                  <div className="flex gap-3 mt-3 justify-end">
                                    <button onClick={() => setActiveReplyId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                                    <button onClick={() => handleSendReply(review._id, parentChat._id)} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-slate-800 transition-colors"><Send size={12} /> Send</button>
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}

                        {parentChats.length > 0 && (
                          <div className="flex justify-center mt-2">
                            <button
                              onClick={() => toggleReviewThreads(review._id)}
                              className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm"
                            >
                              <RepliesToggleIcon size={14} />
                              {repliesToggleText}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {!isLoading && reviews.length > visibleReviewCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleReviewCount((prev) => Math.min(prev + REVIEW_PAGE_SIZE, reviews.length))}
                className="bg-white border border-slate-200 px-5 py-2 rounded-full text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm"
              >
                Show more reviews
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 m-4 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
              <Trash2 className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete {itemToDelete.type === 'reply' ? 'Reply' : 'Review'}?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">This action cannot be undone. This {itemToDelete.type === 'reply' ? 'reply' : 'review'} will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setItemToDelete(null)} className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={executeDelete} className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm">Delete</button>
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

export default AllReviews;
