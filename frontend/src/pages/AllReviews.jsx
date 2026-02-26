import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import {
  Star,
  Send,
  CornerDownRight,
  Calendar,
  MessageCircle,
  User,
  ChevronDown,
  ChevronUp,
  Reply,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AllReviews = () => {
  const { backendUrl, token, userData } = useContext(AppContext);
  const loggedInUserId = userData?._id; // Identifies the currently logged-in guest

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Replying State
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  
  // Editing State
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5); // <-- Added for star editing
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");

  // Deletion Modal State
  const [itemToDelete, setItemToDelete] = useState(null); 
  
  // History & Toggles State
  const [visibleHistoryId, setVisibleHistoryId] = useState(null); 
  const [visibleReviewHistoryId, setVisibleReviewHistoryId] = useState(null); 
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedReviewThreads, setExpandedReviewThreads] = useState({});

  const toggleReplies = (parentId) => {
    setExpandedReplies(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const toggleReviewThreads = (reviewId) => {
    setExpandedReviewThreads(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  /* ==========================================
     CUSTOM TOAST STYLES
  ========================================== */
  const customToastOptions = {
    position: "bottom-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    style: {
      backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '13px',
      fontWeight: '600', borderRadius: '12px', padding: '12px 16px',
      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)', border: '1px solid #1e293b'
    }
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
      toast.error("Failed to load reviews", { ...customToastOptions, icon: <AlertCircle size={18} className="text-red-400" /> });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchReviews(); 
  }, [backendUrl]);

  /* ==========================================
     API: ACTIONS (Reply, Edit, Delete)
  ========================================== */
  const handleSendReply = async (reviewId, parentReplyId = null) => {
    const message = replyText[reviewId];
    if (!message?.trim()) return toast.warning("Please type a response first.", customToastOptions);

    try {
      const { data } = await axios.post(`${backendUrl}/api/reviews/reply/${reviewId}`, 
        { response: message, parentReplyId }, { headers: { token } });

      if (data.success) {
        toast.success("Response posted", { ...customToastOptions, icon: <CheckCircle2 size={18} className="text-blue-400" /> });
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
      toast.error("Failed to post response", customToastOptions); 
    }
  };

  const handleEditReview = async (reviewId) => {
    if (!editReviewText.trim()) return toast.warning("Review cannot be empty.", customToastOptions);
    try {
      // Send both comment and rating to the backend
      const { data } = await axios.put(`${backendUrl}/api/reviews/${reviewId}`, { 
        comment: editReviewText, 
        rating: editReviewRating 
      }, { headers: { token } });

      if (data.success) {
        toast.success("Review updated", { ...customToastOptions, icon: <CheckCircle2 size={18} className="text-blue-400" /> });
        setEditingReviewId(null);
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to update review", customToastOptions); 
    }
  };

  const handleEditReply = async (replyId) => {
    if (!editReplyText.trim()) return toast.warning("Reply cannot be empty.", customToastOptions);
    try {
      const { data } = await axios.put(`${backendUrl}/api/reviews/edit-reply/${replyId}`, { message: editReplyText }, { headers: { token } });
      if (data.success) {
        toast.success("Reply updated", { ...customToastOptions, icon: <CheckCircle2 size={18} className="text-blue-400" /> });
        setEditingReplyId(null);
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to update reply", customToastOptions); 
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const endpoint = itemToDelete.type === 'reply' 
        ? `${backendUrl}/api/reviews/delete-reply/${itemToDelete.id}`
        : `${backendUrl}/api/reviews/${itemToDelete.id}`; 

      const { data } = await axios.delete(endpoint, { headers: { token } });
      
      if (data.success) {
        toast.success(`${itemToDelete.type === 'reply' ? 'Reply' : 'Review'} deleted`, { ...customToastOptions, icon: <Trash2 size={18} className="text-red-400" /> });
        setItemToDelete(null);
        fetchReviews();
      }
    } catch (err) { 
      toast.error("Failed to delete", customToastOptions); 
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

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] font-sans text-slate-800 relative">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10 flex flex-col md:flex-row items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Guest Experience</h1>
            <p className="text-slate-500 mt-1">Read and join the conversation</p>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Loading experiences...</div>
          ) : reviews.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-400 italic">No reviews found yet.</p>
            </div>
          ) : (
            reviews.map((review) => {
              const parentChats = review.reviewChat ? review.reviewChat.filter(chat => !chat.parentReplyId) : [];
              const isThreadExpanded = expandedReviewThreads[review._id];
              
              // Identify if the logged-in user owns this main review
              const reviewOwnerId = review.userId?._id || review.userId;
              const isMyReview = reviewOwnerId === loggedInUserId;

              return (
                <div key={review._id} className="group bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="p-8 pl-10">
                    
                    {/* --- MAIN REVIEW HEADER --- */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-4">
                        {/* DYNAMIC AVATAR */}
                        <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {review.userId?.image ? (
                            <img src={review.userId.image.startsWith('http') ? review.userId.image : `${backendUrl}/${review.userId.image}`} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-[16px] leading-tight">{formatName(review.userId, "guest")}</h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex gap-1 text-amber-400 mb-1 justify-end">
                          {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-slate-200"} />)}
                        </div>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex justify-end gap-1 mb-1">
                          {formatDateTime(review.createdAt)} {review.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                        </p>
                        
                        {/* MAIN REVIEW: EDIT HISTORY TOGGLE */}
                        {review.isEdited && review.editHistory && review.editHistory.length > 0 && (
                          <div className="flex justify-end mt-1">
                            <button 
                              onClick={() => setVisibleReviewHistoryId(visibleReviewHistoryId === review._id ? null : review._id)}
                              className="mt-2 flex items-center justify-end w-full gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                            >
                              <Clock size={10} />
                              {visibleReviewHistoryId === review._id ? "Hide Previous Versions" : "View Previous Versions"}
                            </button>
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
                    <div className="mb-8 relative rounded-xl transition-all group/review">
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
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingReviewId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                            <button onClick={() => handleEditReview(review._id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Save Changes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-8">
                    <h2 className="text-2xl font-serif italic text-slate-800 mb-3 leading-snug">
                      "{review.bookingId?.bookingName || (review.bookingId?.room_ids?.length > 0 ? review.bookingId.room_ids.map((r) => r.name).join(", ") : "Retreat Stay")}"
                    </h2>
                    <p className="text-slate-600 text-[14px] leading-relaxed font-light">{review.comment || "No written review provided."}</p>
                          
                          {/* OWNERSHIP ACTIONS FOR MAIN REVIEW */}
                          {isMyReview && (
                            <div className="absolute -top-3 right-0 opacity-0 group-hover/review:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg p-1 shadow-sm z-10">
                                <button onClick={() => { 
                                  setEditingReviewId(review._id); 
                                  setEditReviewText(review.comment);
                                  setEditReviewRating(review.rating); // Populate current rating
                                }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Review">
                                  <Pencil size={14} />
                                </button>
                                <div className="w-px h-4 bg-slate-200"></div>
                                <button onClick={() => setItemToDelete({ type: 'review', id: review._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Review">
                                  <Trash2 size={14} />
                                </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                   


                    {/* --- REPLIES THREAD --- */}
                    {parentChats.length > 0 && (
                      <div className="mb-2 space-y-4">
                        {(isThreadExpanded ? parentChats : parentChats.slice(0, 1)).map((parentChat) => {
                          const childReplies = review.reviewChat.filter(child => child.parentReplyId === parentChat._id);
                          const isExpanded = expandedReplies[parentChat._id];
                          
                          const replyOwnerId = parentChat.senderId?._id || parentChat.senderId;
                          const isMyReply = replyOwnerId === loggedInUserId && parentChat.senderRole === "guest";

                          return (
                            <div key={parentChat._id} className="space-y-3">
                              
                              <div className={`relative group/reply rounded-lg p-5 text-sm transition ${parentChat.senderRole === "admin" || parentChat.senderRole === "staff" ? "bg-[#f8fafc] ml-8 border border-slate-100" : "bg-white border border-slate-100 shadow-sm"}`}>
                                
                                <div className="flex items-center gap-2.5 mb-2 pr-10">
                                  {parentChat.senderRole !== "admin" && (
                                    <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                      {parentChat.senderId?.image ? (
                                        <img src={parentChat.senderId.image.startsWith('http') ? parentChat.senderId.image : `${backendUrl}/${parentChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[11px] font-bold uppercase text-slate-500">{parentChat.senderId?.firstName ? parentChat.senderId.firstName.charAt(0) : parentChat.senderRole.charAt(0)}</span>
                                      )}
                                    </div>
                                  )}

                                  <span className="font-bold text-slate-900 text-sm">{formatName(parentChat.senderId, parentChat.senderRole)}</span>
                                  {parentChat.senderRole !== "guest" && (
                                    <span className={`${parentChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{parentChat.senderRole}</span>
                                  )}
                                  
                                  <div className="text-[10px] text-slate-400 ml-auto flex flex-col items-end gap-1">
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
                                    <textarea className="w-full bg-white border-2 border-blue-400 rounded-lg p-3 text-sm focus:outline-none resize-none shadow-sm" rows="2" value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)} autoFocus />
                                    <div className="flex justify-end gap-2 mt-2">
                                      <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500">Cancel</button>
                                      <button onClick={() => handleEditReply(parentChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-4">
                                    <p className="text-slate-600 text-[13px] leading-relaxed flex-1">{parentChat.message}</p>
                                    
                                    {isMyReply && (
                                      <div className="absolute top-2 right-2 opacity-0 group-hover/reply:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm z-10">
                                          <button onClick={() => { setEditingReplyId(parentChat._id); setEditReplyText(parentChat.message); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Reply"><Pencil size={12} /></button>
                                          <div className="w-px h-3 bg-slate-200"></div>
                                          <button onClick={() => setItemToDelete({ type: 'reply', id: parentChat._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Reply"><Trash2 size={12} /></button>
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

                                <div className="mt-3 flex justify-start items-center">
                                  {(!activeReplyId || activeReplyId !== parentChat._id) && (
                                    <button onClick={() => { setActiveReplyId(parentChat._id); setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true })); }} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest px-2 py-1 rounded-md -ml-2 transition-colors hover:bg-blue-50">
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

                                    return (
                                      <div key={childChat._id} className={`relative group/child rounded-lg p-4 text-sm transition ${childChat.senderRole === "admin" || childChat.senderRole === "staff" ? "bg-[#f8fafc] border border-slate-100" : "bg-white border border-slate-100 shadow-sm"}`}>
                                        
                                        <div className="flex items-center gap-2.5 mb-2 pr-10">
                                          {childChat.senderRole !== "admin" && (
                                            <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                              {childChat.senderId?.image ? (
                                                <img src={childChat.senderId.image.startsWith('http') ? childChat.senderId.image : `${backendUrl}/${childChat.senderId.image}`} alt="Profile" className="w-full h-full object-cover" />
                                              ) : (
                                                <span className="text-[10px] font-bold uppercase text-slate-500">{childChat.senderId?.firstName ? childChat.senderId.firstName.charAt(0) : childChat.senderRole.charAt(0)}</span>
                                              )}
                                            </div>
                                          )}

                                          <span className="font-bold text-slate-900 text-sm">{formatName(childChat.senderId, childChat.senderRole)}</span>
                                          {childChat.senderRole !== "guest" && (
                                            <span className={`${childChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{childChat.senderRole}</span>
                                          )}
                                          
                                          <div className="text-[10px] text-slate-400 ml-auto flex flex-col items-end gap-1">
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
                                            <textarea className="w-full bg-white border-2 border-blue-400 rounded-lg p-3 text-sm focus:outline-none resize-none shadow-sm" rows="2" value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)} autoFocus />
                                            <div className="flex justify-end gap-2 mt-2">
                                              <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500">Cancel</button>
                                              <button onClick={() => handleEditReply(childChat._id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Save</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex justify-between items-start gap-4">
                                            <p className="text-slate-600 text-[13px] leading-relaxed flex-1">{childChat.message}</p>
                                            
                                            {isMyChildReply && (
                                              <div className="absolute top-2 right-2 opacity-0 group-hover/child:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm z-10">
                                                  <button onClick={() => { setEditingReplyId(childChat._id); setEditReplyText(childChat.message); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="Edit Reply"><Pencil size={12} /></button>
                                                  <div className="w-px h-3 bg-slate-200"></div>
                                                  <button onClick={() => setItemToDelete({ type: 'reply', id: childChat._id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded transition-colors" title="Delete Reply"><Trash2 size={12} /></button>
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

                                        <div className="mt-2 flex justify-start items-center">
                                          {(!activeReplyId || activeReplyId !== parentChat._id) && (
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
                        
                        {parentChats.length > 1 && (
                          <div className="flex justify-center mt-2">
                            <button onClick={() => toggleReviewThreads(review._id)} className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm">
                              {isThreadExpanded ? <><ChevronUp size={14} /> Show less responses</> : <><ChevronDown size={14} /> View {parentChats.length - 1} more {parentChats.length - 1 === 1 ? "response" : "responses"}</>}
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
    </div>
  );
};

export default AllReviews;