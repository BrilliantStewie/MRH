import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import Navbar from "../components/Navbar";
import {
  Star, Send, MessageCircle, User, ShieldCheck, Reply, CornerDownRight
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AllReviews = () => {
  const { backendUrl, userData, token } = useContext(AppContext);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
      if (response.data.success) setReviews(response.data.reviews || []);
    } catch (err) {
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [backendUrl]);

  // 🚀 Updated to handle parentReplyId
  const handleSendReply = async (reviewId, parentReplyId = null) => {
    const message = replyText[reviewId];
    if (!message?.trim()) return toast.warning("Please type a response.");

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/reviews/reply/${reviewId}`,
        { 
          response: message,
          parentReplyId: parentReplyId // Sending the ID of the comment being replied to
        },
        { headers: { token } }
      );
      if (data.success) {
        toast.success("Response posted");
        setReplyText({ ...replyText, [reviewId]: "" });
        setActiveReplyId(null);
        fetchReviews();
      }
    } catch (err) {
      toast.error("Failed to reply");
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] font-sans text-slate-800">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Guest Experience</h1>

        <div className="space-y-12">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* 1. THE ORIGINAL GUEST REVIEW */}
              <div className="p-8 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <User size={20} className="text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{review.userId?.firstName} {review.userId?.lastName}</h3>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 text-amber-400 bg-amber-50 px-3 py-1 rounded-full">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />)}
                  </div>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed font-medium italic">"{review.comment}"</p>
                
                {/* General Reply Trigger for the main review */}
                {!activeReplyId && (
                   <button 
                    onClick={() => setActiveReplyId(review._id)}
                    className="mt-6 flex items-center gap-2 text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                   >
                     <MessageCircle size={16} /> Add to conversation
                   </button>
                )}
              </div>

              {/* 2. THE CONVERSATION THREAD */}
              <div className="bg-slate-50/50 border-t border-slate-100 p-8 space-y-6">
                
                {/* Logic: Only display Top-Level comments first (parentReplyId === null) */}
                {review.reviewChat?.filter(chat => !chat.parentReplyId).map((parentChat) => (
                  <div key={parentChat._id} className="space-y-4">
                    
                    {/* Admin/Staff Comment Card */}
                    <div className={`p-5 rounded-2xl border ${parentChat.senderRole === 'guest' ? 'bg-white border-slate-200' : 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className={parentChat.senderRole === 'guest' ? "text-slate-400" : "text-blue-200"} />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                            {parentChat.senderRole}
                          </span>
                        </div>
                        
                        {/* Only allow replying to Admin/Staff */}
                        {parentChat.senderRole !== 'guest' && (
                          <button 
                            onClick={() => setActiveReplyId(parentChat._id)}
                            className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-all uppercase"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{parentChat.message}</p>
                    </div>

                    {/* SUB-THREAD: Render replies TO this specific comment */}
                    <div className="ml-12 space-y-3 border-l-2 border-slate-200 pl-6">
                      {review.reviewChat?.filter(child => child.parentReplyId === parentChat._id).map((childChat) => (
                        <div key={childChat._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                          <CornerDownRight size={14} className="absolute -left-5 top-4 text-slate-300" />
                          <div className="flex items-center gap-2 mb-1">
                            <User size={12} className="text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Your Response</span>
                          </div>
                          <p className="text-sm text-slate-600">{childChat.message}</p>
                        </div>
                      ))}

                      {/* Targeted Input Box for this specific parent comment */}
                      {activeReplyId === parentChat._id && (
                        <div className="bg-white p-4 rounded-xl border-2 border-blue-400 animate-in fade-in zoom-in-95 duration-200">
                          <textarea
                            className="w-full bg-transparent text-sm outline-none resize-none"
                            rows="2"
                            placeholder={`Reply to ${parentChat.senderRole}...`}
                            value={replyText[review._id] || ""}
                            onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                            autoFocus
                          />
                          <div className="flex justify-end gap-3 mt-2 border-t pt-2">
                            <button onClick={() => setActiveReplyId(null)} className="text-[10px] font-bold text-slate-400 uppercase">Cancel</button>
                            <button 
                              onClick={() => handleSendReply(review._id, parentChat._id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase"
                            >
                              Post Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Main Level Input Box (When replying directly to the review) */}
                {activeReplyId === review._id && (
                  <div className="bg-slate-900 rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-4">
                    <textarea
                      className="w-full bg-slate-800 text-white border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none mb-4"
                      placeholder="Add a comment to this review thread..."
                      value={replyText[review._id] || ""}
                      onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                    />
                    <div className="flex justify-end gap-4">
                      <button onClick={() => setActiveReplyId(null)} className="text-xs font-bold text-slate-500 uppercase">Cancel</button>
                      <button onClick={() => handleSendReply(review._id, null)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700">Post Comment</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllReviews;