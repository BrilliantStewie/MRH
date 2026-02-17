import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
// ✅ Use StaffContext and sToken to match your staffRoute.js middleware
import { StaffContext } from '../context/StaffContext'; 
import { Star, MessageCircle, User, Home, Loader2, Send, Clock, History } from 'lucide-react';

const Reviews = () => {
  const { backendUrl, sToken } = useContext(StaffContext); 
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      // ✅ Calls the staff bookings endpoint which populates user and room data
      const { data } = await axios.get(backendUrl + '/api/staff/bookings', { 
        headers: { token: sToken } 
      });

      if (data.success) {
        // ✅ Filter for bookings that have an initial review or a message history
        const withHistory = data.bookings.filter(b => 
          (b.review && b.review.trim() !== "") || (b.reviewChat && b.reviewChat.length > 0)
        );
        setReviews(withHistory);
      }
    } catch (error) {
      toast.error("Failed to load message history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplySubmit = async (bookingId) => {
    if (!replyText.trim()) return toast.warning("Message cannot be empty");
    setIsSubmitting(true);
    try {
      // ✅ Matches your staffRoute.js: router.post("/add-review-chat", ...)
      const { data } = await axios.post(
        backendUrl + '/api/staff/add-review-chat', 
        { bookingId, message: replyText }, 
        { headers: { token: sToken } }
      );

      if (data.success) {
        toast.success("Message added to history");
        setReplyText('');
        setActiveReplyId(null);
        fetchReviews(); // Refresh to show new message in the thread
      }
    } catch (error) {
      toast.error("Failed to post message");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (sToken) fetchReviews();
  }, [sToken]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <History className="text-indigo-600" size={28} />
        <h1 className="text-2xl font-bold text-slate-800">Review & Conversation History</h1>
      </div>

      <div className="space-y-8">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No guest interactions found yet.</p>
          </div>
        ) : (
          reviews.map((item) => (
            <div key={item._id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
              
              {/* 1. Header: Guest & Room Info */}
              <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm">
                    {item.user_id?.image ? (
                        <img src={item.user_id.image} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                        item.user_id?.name?.[0] || <User size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 leading-tight">{item.user_id?.name || "Guest"}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Home size={12} className="text-indigo-500" />
                        <span className="text-xs text-slate-500 font-medium">
                            {/* ✅ Displays rooms booked as populated in staffController.js */}
                            {item.room_ids?.map(r => r.name).join(", ") || "No room info"}
                        </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-0.5 mb-1 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < item.rating ? "#fbbf24" : "none"} className={i < item.rating ? "text-amber-400" : "text-slate-200"} />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Check-in: {new Date(item.check_in).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* 2. Threaded Message History */}
              <div className="p-6 space-y-6 bg-white">
                {/* Original Guest Review (The Start of the History) */}
                {item.review && (
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-2 tracking-widest">Initial Guest Review</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">"{item.review}"</p>
                        </div>
                    </div>
                )}

                {/* ✅ History Loop: Maps through every message in reviewChat array */}
                {item.reviewChat?.map((chat, idx) => (
                  <div key={idx} className={`flex gap-4 ${chat.senderRole !== 'guest' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 p-4 rounded-2xl text-sm ${
                      chat.senderRole !== 'guest' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    } max-w-[85%]`}>
                      <div className="flex justify-between items-center mb-2 gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">{chat.senderName}</span>
                        <span className="text-[9px] opacity-60 flex items-center gap-1">
                          <Clock size={10} /> {new Date(chat.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="leading-relaxed font-medium">{chat.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Reply Input Section */}
              <div className="p-5 bg-slate-50/50 border-t border-slate-100">
                {activeReplyId === item._id ? (
                  <div className="space-y-3">
                    <textarea 
                      className="w-full p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                      placeholder="Type your follow-up message to the guest..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows="3"
                    />
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setActiveReplyId(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                      <button 
                        onClick={() => handleReplySubmit(item._id)}
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Add to History
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setActiveReplyId(item._id); setReplyText(''); }}
                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border-dashed"
                  >
                    <MessageCircle size={18} className="text-indigo-600" /> 
                    Click to reply or add to conversation history
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;