import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
  Star, ThumbsUp, Filter, MoreHorizontal, 
  MapPin, TrendingUp, Reply, MessageSquare, ArrowLeft, Loader2, CheckCircle2 
} from "lucide-react";
import axios from "axios";

const AllReviews = () => {
  const navigate = useNavigate();
  
  // State
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Relevant');

  // --- 1. FETCH REAL DATA ---
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        // Replace with your actual endpoint
        const response = await axios.get("http://localhost:4000/api/reviews"); 
        setReviews(response.data); 
      } catch (err) {
        console.error("Error fetching reviews:", err);
        // Mock data fallback if API fails (so you can see the UI)
        setReviews([
            { id: 1, rating: 5, content: "Absolutely stunning architecture and peace.", author: { name: "Maria S." }, time: "2023-10-10" },
            { id: 2, rating: 4, content: "Great stay, but parking was tricky.", author: { name: "John D." }, time: "2023-11-05" }
        ]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // --- 2. HELPER: TIME AGO ---
  const timeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days > 365) return `${Math.floor(days / 365)} years ago`;
    if (days > 30) return `${Math.floor(days / 30)} months ago`;
    if (days > 0) return `${days} days ago`;
    return "Today";
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR: ANALYTICS */}
      <aside className="w-[400px] bg-white border-r border-slate-200 p-10 overflow-y-auto hidden lg:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        
        {/* Header */}
        <div className="mb-10">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-900 mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Grand Imperial</h1>
          <p className="text-slate-500 flex items-center gap-2 text-sm font-medium">
            <MapPin size={14} className="text-blue-600" /> 17 Redbrook Ln, London
          </p>
        </div>

        {/* Score Card - Blue Brand Color */}
        <div className="bg-[#1e293b] text-white p-8 rounded-2xl shadow-xl shadow-slate-200 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] -mr-10 -mt-10"></div>
          
          <div className="flex items-end justify-between mb-6 relative z-10">
            <div>
                <h2 className="text-6xl font-serif font-medium tracking-tight">4.8</h2>
                <div className="flex gap-1 mt-2 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Reviews</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs bg-white/10 py-2 px-3 rounded-lg w-fit backdrop-blur-sm border border-white/5">
            <TrendingUp size={14} />
            <span>Top 5% in Region</span>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Rating Distribution</p>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-600 w-3">{star}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 rounded-full" 
                  style={{ width: `${star === 5 ? 85 : star === 4 ? 10 : 5}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right font-medium">{star === 5 ? '85%' : '5%'}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10 border-t border-slate-100">
             <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Verified by Booking.com</span>
             </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT: FEED */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-12">
        
        {/* Mobile Back Button */}
        <button 
            onClick={() => navigate('/')} 
            className="lg:hidden mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200"
        >
            <ArrowLeft size={16} /> Back
        </button>

        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Top Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-30">
            <div className="flex gap-1">
              {['Relevant', 'Newest', 'Top Rated'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-5 py-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
               <Filter size={14} /> Filter
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-xs font-bold tracking-widest uppercase">Loading Reviews...</p>
            </div>
          )}

          {/* Review List */}
          {!isLoading && (
            <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id || review._id} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                    
                    {/* Review Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                            {/* Initials */}
                            {(review.author?.name || "Guest").charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{review.author?.name || "Verified Guest"}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                             <span>1 Review</span>
                             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                             <span>{review.author?.country || "United Kingdom"}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        {timeAgo(review.time || review.createdAt)}
                      </span>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex gap-1 mb-4 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                size={16} 
                                fill={i < review.rating ? "currentColor" : "none"} 
                                stroke={i < review.rating ? "none" : "#cbd5e1"} 
                                strokeWidth={i < review.rating ? 0 : 2}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <p className="text-slate-600 leading-relaxed text-base mb-6 font-light">
                        "{review.content || review.comment}"
                    </p>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                <ThumbsUp size={14} /> Helpful
                            </button>
                        </div>
                        
                        {/* Admin Reply Button */}
                        {!review.response && (
                             <button className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                                <MessageSquare size={14} /> Reply
                            </button>
                        )}
                    </div>

                    {/* Owner Response */}
                    {review.response && (
                      <div className="mt-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                           <Reply size={14} className="text-blue-600 transform rotate-180" />
                           <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Response from Management</span>
                        </div>
                        <p className="text-slate-500 text-sm italic">
                           "{review.response}"
                        </p>
                      </div>
                    )}

                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AllReviews;