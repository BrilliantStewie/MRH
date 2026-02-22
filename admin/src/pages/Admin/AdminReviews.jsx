import React, { useState, useEffect, useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
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
  Clock
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

const AdminReviews = () => {
  const { backendUrl, aToken } = useContext(AdminContext);

  const decoded = aToken ? jwtDecode(aToken) : null; 
  const loggedInUserId = decoded?.id; 

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editText, setEditText] = useState("");
  
  const [visibleHistoryId, setVisibleHistoryId] = useState(null); 
  const [visibleReviewHistoryId, setVisibleReviewHistoryId] = useState(null); 
  
  // State for child replies & main thread toggles
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedReviewThreads, setExpandedReviewThreads] = useState({});

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
      backgroundColor: '#0f172a', // slate-900
      color: '#f8fafc', // slate-50
      fontSize: '13px',
      fontWeight: '600',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      border: '1px solid #1e293b'
    }
  };

  /* ==========================================
     FETCH REVIEWS
  ========================================== */
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reviews/all-reviews`, {
        headers: { token: aToken }
      });

      if (response.data.success) {
        setReviews(response.data.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
      toast.error("Failed to load reviews", { 
        ...customToastOptions, 
        icon: <AlertCircle size={18} className="text-red-400" /> 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [backendUrl, aToken]);

  /* ==========================================
     SEND REPLY
  ========================================== */
  const handleSendReply = async (reviewId, parentReplyId = null) => {
    const message = replyText[reviewId];

    if (!message || message.trim() === "") {
      return toast.warning("Please type a response first.", {
        ...customToastOptions,
        style: { ...customToastOptions.style, border: '1px solid #f59e0b' },
        icon: <AlertCircle size={18} className="text-amber-400" />
      });
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { response: message, parentReplyId: parentReplyId },
        { headers: { token: aToken } }
      );

      if (data.success) {
        toast.success("Response sent successfully", { 
          ...customToastOptions, 
          icon: <CheckCircle2 size={18} className="text-blue-400" /> 
        });
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
      toast.error("Failed to send response", { ...customToastOptions, icon: <AlertCircle size={18} className="text-red-400" /> });
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
        { headers: { token: aToken } }
      );

      if (data.success) {
        toast.success("Reply permanently deleted", { 
          ...customToastOptions, 
          icon: <Trash2 size={18} className="text-red-400" /> 
        });
        setItemToDelete(null);
        fetchReviews();
      }
    } catch (error) {
      toast.error("Failed to delete reply", { ...customToastOptions, icon: <AlertCircle size={18} className="text-red-400" /> });
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
        { headers: { token: aToken } }
      );

      if (data.success) {
        toast.success("Reply updated", { 
          ...customToastOptions, 
          icon: <CheckCircle2 size={18} className="text-blue-400" /> 
        });
        setEditingReplyId(null);
        setEditText("");
        fetchReviews();
      }
    } catch (error) {
      toast.error("Failed to update reply", { ...customToastOptions, icon: <AlertCircle size={18} className="text-red-400" /> });
    }
  };

  /* ==========================================
     HELPER: Date Formatting
  ========================================== */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const formatStayDate = (start, end) => {
    if (!start) return "";
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const m = s.toLocaleString("default", { month: "short" });
    if (e) {
      const em = e.toLocaleString("default", { month: "short" });
      if (m === em) return `${m} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
      return `${m} ${s.getDate()} - ${em} ${e.getDate()}, ${s.getFullYear()}`;
    }
    return formatDate(start);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, item) => acc + (item.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-800 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
      
      {/* PAGE HEADER */}
      <div className="max-w-4xl mx-auto mb-10 flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Guest Reviews</h1>
          <p className="text-slate-500 mt-1">Manage feedback and staff responses</p>
        </div>

        {/* STATS BADGE */}
        <div className="flex items-center gap-5 bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Avg Rating</p>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xl font-bold text-slate-900">{averageRating}</span>
              <div className="flex text-amber-400 mb-1"><Star size={16} fill="currentColor" /></div>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total</p>
            <p className="text-xl font-bold text-slate-900 text-center">{reviews.length}</p>
          </div>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Loading feedback...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400 italic">No reviews found yet.</p>
          </div>
        ) : (
          reviews.map((review) => {
            const parentChats = review.reviewChat ? review.reviewChat.filter(chat => !chat.parentReplyId) : [];
            const isThreadExpanded = expandedReviewThreads[review._id];

            return (
              <div key={review._id} className="group bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="p-8 pl-10">
                  
                  {/* HEADER: User & Rating */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                        {review.userId?.image ? (
                          <img src={review.userId.image.startsWith('http') ? review.userId.image : `${backendUrl}/${review.userId.image}`} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-[16px] leading-tight">{formatName(review.userId, "guest")}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-medium">
                          <Calendar size={12} />
                          <span>{formatStayDate(review.check_in, review.check_out)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex gap-1 text-amber-400 mb-1 justify-end">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-slate-200"} />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex justify-end gap-1 mb-1">
                        {formatDate(review.createdAt)}
                        {review.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                      </p>

                      {/* 🌟 GUEST EDIT HISTORY TOGGLE */}
                      {review.isEdited && review.editHistory && review.editHistory.length > 0 && (
                        <div className="flex justify-end mt-1">
                          <button 
                            onClick={() => setVisibleReviewHistoryId(visibleReviewHistoryId === review._id ? null : review._id)}
                            className="mt-5 flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                          >
                            <Clock size={10} />
                            {visibleReviewHistoryId === review._id ? "Hide History" : "View History"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 🌟 GUEST EDIT HISTORY CONTENT (BELOW HEADER) */}
                  {visibleReviewHistoryId === review._id && review.editHistory && review.editHistory.length > 0 && (
                    <div className="mb-6 space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Previous Versions</p>
                      {/* Using .slice().reverse() to show latest edits at the top */}
                      {review.editHistory.slice().reverse().map((history, index) => (
                        <div key={index} className="relative pl-4 border-l-2 border-slate-200 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            {history.rating && (
                              <div className="flex items-center gap-0.5 text-amber-500 bg-white px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">
                                <span className="font-bold text-[10px]">{history.rating}</span>
                                <Star size={10} fill="currentColor" />
                              </div>
                            )}
                            <span className="text-[10px] font-semibold text-slate-400">
                              Edited on {new Date(history.editedAt).toLocaleString("en-US", { 
                                month: "short", 
                                day: "numeric", 
                                year: "numeric", 
                                hour: "numeric", 
                                minute: "2-digit", 
                                hour12: true 
                              })}
                            </span>
                          </div>
                          <p className="text-xs italic text-slate-500 leading-relaxed">
                            "{history.comment || "No written comment."}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MAIN REVIEW CONTENT */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-serif italic text-slate-800 mb-3 leading-snug">
                      "{review.bookingId?.bookingName || (review.bookingId?.room_ids?.length > 0 ? review.bookingId.room_ids.map((r) => r.name).join(", ") : "Retreat Stay")}"
                    </h2>

                    <p className="text-slate-600 text-[14px] leading-relaxed font-light">{review.comment || "No written review provided."}</p>
                  </div>

                  {/* REPLIES (THREADED VIEW) */}
                  {parentChats.length > 0 && (
                    <div className="mb-6 space-y-4">
                      
                      {/* SHOW ONLY 1 PARENT CHAT UNLESS EXPANDED */}
                      {(isThreadExpanded ? parentChats : parentChats.slice(0, 1)).map((parentChat) => {
                        const childReplies = review.reviewChat.filter(child => child.parentReplyId === parentChat._id);
                        const isExpanded = expandedReplies[parentChat._id];

                        return (
                          <div key={parentChat._id} className="space-y-3">
                            
                            {/* PARENT COMMENT BUBBLE */}
                            <div className={`relative group/thread rounded-lg p-5 text-sm transition ${parentChat.senderRole === "admin" || parentChat.senderRole === "staff" ? "bg-[#f8fafc] ml-8 border border-slate-100" : "bg-white border border-slate-100"}`}>
                              {(parentChat.senderRole === "admin" || parentChat.senderRole === "staff") && (
                                <div className="absolute -left-6 top-5 text-[#cbd5e1]"><CornerDownRight size={20} /></div>
                              )}

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
                                  <span className={`${parentChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                                    {parentChat.senderRole}
                                  </span>
                                )}

                                <div className="text-[10px] text-slate-400 ml-auto flex gap-3 items-center">
                                  <span className="flex items-center gap-1">
                                    {formatDate(parentChat.createdAt)}
                                    {parentChat.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                                  </span>
                                </div>
                              </div>

                              {/* EDIT MODE */}
                              {editingReplyId === parentChat._id ? (
                                <>
                                  <textarea className="w-full border border-slate-200 rounded-lg p-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={editText} onChange={(e) => setEditText(e.target.value)} />
                                  <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                                    <button onClick={() => handleEditReply(review._id, parentChat._id)} className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded">Save</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-slate-600 text-[13px] leading-relaxed pr-16">{parentChat.message}</p>

                                  <div className="mt-3 flex justify-between items-center">
                                    {(!activeReplyId || activeReplyId !== parentChat._id) ? (
                                      <button onClick={() => { setActiveReplyId(parentChat._id); setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true })); }} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all hover:bg-blue-50 px-2 py-1 rounded-md -ml-2">
                                        <Reply size={14} /> Reply
                                      </button>
                                    ) : <span />}

                                    {parentChat.editHistory && parentChat.editHistory.length > 0 && (
                                      <button onClick={() => setVisibleHistoryId(visibleHistoryId === parentChat._id ? null : parentChat._id)} className="text-[10px] text-slate-400 hover:text-blue-600 font-medium transition-colors">
                                        {visibleHistoryId === parentChat._id ? "Hide Edit History" : "View Edit History"}
                                      </button>
                                    )}
                                  </div>

                                  {visibleHistoryId === parentChat._id && (
                                    <div className="mt-3 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3">
                                      {[...parentChat.editHistory].reverse().map((history, index) => (
                                        <div key={index} className="flex flex-col items-end">
                                          <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{new Date(history.editedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                                          <p className="italic text-slate-600">"{history.message}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* ADMIN ONLY: FLOATING ACTION MENU */}
                                  {parentChat.senderRole === "admin" && (
                                    <div className="absolute top-12 right-4 opacity-0 group-hover/thread:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-md p-0.5 z-10">
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
                              <button onClick={() => toggleReplies(parentChat._id)} className="ml-12 mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                {isExpanded ? <><ChevronUp size={14} /> Hide replies</> : <><CornerDownRight size={14} /> View {childReplies.length} {childReplies.length === 1 ? "reply" : "replies"}</>}
                              </button>
                            )}

                            {/* CHILD REPLIES */}
                            {isExpanded && childReplies.length > 0 && (
                              <div className="ml-12 space-y-3 border-l-2 border-slate-100 pl-4 mt-2">
                                {childReplies.map((childChat) => (
                                  <div key={childChat._id} className={`relative group/thread rounded-lg p-4 text-sm transition ${childChat.senderRole === "admin" || childChat.senderRole === "staff" ? "bg-[#f8fafc] border border-slate-100" : "bg-white border border-slate-100"}`}>
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
                                        <span className={`${childChat.senderRole === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                                          {childChat.senderRole}
                                        </span>
                                      )}
                                      
                                      <div className="text-[10px] text-slate-400 ml-auto flex gap-1 items-center">
                                        {formatDate(childChat.createdAt)}
                                        {childChat.isEdited && <span className="italic text-slate-400 normal-case">(Edited)</span>}
                                      </div>
                                    </div>

                                    {/* EDIT OR MESSAGE */}
                                    {editingReplyId === childChat._id ? (
                                      <>
                                        <textarea className="w-full border border-slate-200 rounded-lg p-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={editText} onChange={(e) => setEditText(e.target.value)} />
                                        <div className="flex gap-2 mt-2 justify-end">
                                          <button onClick={() => setEditingReplyId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                                          <button onClick={() => handleEditReply(review._id, childChat._id)} className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded">Save</button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-slate-600 text-[13px] leading-relaxed pr-10">{childChat.message}</p>
                                        
                                        <div className="mt-2 flex justify-between items-center">
                                          {(!activeReplyId || activeReplyId !== parentChat._id) ? (
                                            <button onClick={() => { setActiveReplyId(parentChat._id); setExpandedReplies(prev => ({ ...prev, [parentChat._id]: true })); }} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all hover:bg-blue-50 px-2 py-1 rounded-md -ml-2">
                                              <Reply size={14} /> Reply
                                            </button>
                                          ) : <span />}

                                          {childChat.editHistory && childChat.editHistory.length > 0 && (
                                            <button onClick={() => setVisibleHistoryId(visibleHistoryId === childChat._id ? null : childChat._id)} className="text-[10px] text-slate-400 hover:text-blue-600 font-medium transition-colors">
                                              {visibleHistoryId === childChat._id ? "Hide Edit History" : "View Edit History"}
                                            </button>
                                          )}
                                        </div>

                                        {visibleHistoryId === childChat._id && (
                                          <div className="mt-3 text-xs text-slate-500 border-r-2 border-slate-200 pr-3 text-right space-y-3">
                                            {[...childChat.editHistory].reverse().map((history, index) => (
                                              <div key={index} className="flex flex-col items-end">
                                                <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{new Date(history.editedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                                                <p className="italic text-slate-600">"{history.message}"</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* ADMIN ONLY: FLOATING ACTION MENU */}
                                        {childChat.senderRole === "admin" && (
                                          <div className="absolute top-10 right-4 opacity-0 group-hover/thread:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-md p-0.5 z-10">
                                            <button onClick={() => { setEditingReplyId(childChat._id); setEditText(childChat.message); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={13} /></button>
                                            <div className="w-px h-3 bg-slate-200"></div>
                                            <button onClick={() => confirmDelete(review._id, childChat._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
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

                      {/* "VIEW X MORE RESPONSES" TOGGLE */}
                      {parentChats.length > 1 && (
                        <div className="flex justify-center mt-2">
                          <button onClick={() => toggleReviewThreads(review._id)} className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm">
                            {isThreadExpanded ? <><ChevronUp size={14} /> Show less responses</> : <><ChevronDown size={14} /> View {parentChats.length - 1} more {parentChats.length - 1 === 1 ? "response" : "responses"}</>}
                          </button>
                        </div>
                      )}
                    </div>
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
      </div>

      {/* 🌟 CUSTOM DELETE CONFIRMATION MODAL */}
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
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReviews;