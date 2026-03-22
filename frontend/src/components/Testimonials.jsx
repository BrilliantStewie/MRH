import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { Star, Quote, ArrowRight, CheckCircle2, User } from 'lucide-react';
import axios from "axios";
import { AppContext } from "../context/AppContext";

const Testimonials = () => {
  const navigate = useNavigate(); // 2. Initialize the hook
  const { backendUrl } = useContext(AppContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    if (!backendUrl) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/reviews/all-reviews`);
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [backendUrl]);

  // 3. Create the navigation function
  const handleViewAllReviews = () => {
    navigate('/reviews'); 
    // Scroll to top when navigating
    window.scrollTo(0, 0);
  };

  const stats = useMemo(() => {
    const count = reviews.length;
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    const avg = count ? total / count : 0;
    const label =
      avg >= 4.5 ? "Excellent" :
      avg >= 4.0 ? "Very Good" :
      avg >= 3.0 ? "Good" :
      count ? "Fair" : "New";
    return {
      count,
      avg: avg ? avg.toFixed(1) : "0.0",
      label
    };
  }, [reviews]);

  const featuredReview = reviews[0];
  const recentReviews = reviews.slice(1, 3);

  const getReviewerName = (review) => {
    const user = review?.userId;
    if (!user) return "Guest";
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
  };

  const getReviewerInitial = (review) => {
    const name = getReviewerName(review);
    return name?.trim()?.[0]?.toUpperCase() || "G";
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== "string") return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  const formatMonthYear = (dateInput) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  };

  const reviewCountLabel = stats.count
    ? `${stats.count} review${stats.count > 1 ? "s" : ""}`
    : "Reviews";

  return (
    // Matching the Header background color: bg-[#F8F9FA]
    <section className="bg-[#F8F9FA] min-h-[90vh] py-24 border-b border-slate-200 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
               {/* Accent: Blue-900 to match Header */}
               <div className="h-px w-8 bg-blue-900"></div>
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-900">
                 Guest Reflections
               </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
              A Sanctuary <span className="italic text-slate-400">remembered.</span>
            </h2>
          </div>
          
          {/* DESKTOP BUTTON - Added onClick */}
          <button 
            onClick={handleViewAllReviews}
            className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-900 transition-colors group"
          >
              Read all {reviewCountLabel} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* --- EDITORIAL GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* 1. LEFT: THE 'HERO' STORY (Featured Review) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
             <div className="relative pt-4">
                <Quote size={80} className="text-blue-100/50 absolute -top-4 -left-6 -z-10" />
                <blockquote className="space-y-8">
                   <p className="text-xl md:text-3xl lg:text-4xl font-serif leading-tight text-justify text-slate-900">
                      {featuredReview?.comment
                        ? `"${truncateText(featuredReview.comment, 150)}"`
                        : loading
                          ? "Loading guest reflections..."
                          : "No reviews yet. Be the first to share your experience."}
                   </p>
                   
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-900 shadow-sm overflow-hidden">
                         {featuredReview?.userId?.image ? (
                           <img
                             src={getImageUrl(featuredReview.userId.image)}
                             alt={getReviewerName(featuredReview)}
                             className="h-full w-full object-cover"
                           />
                         ) : (
                           <User size={20} />
                         )}
                      </div>
                      <div>
                          <div className="text-base font-bold tracking-wide text-slate-900">
                            {featuredReview ? getReviewerName(featuredReview) : "MRH Guest"}
                          </div>
                      </div>
                   </div>
                </blockquote>
             </div>
             
             {/* Verified Badge */}
              {featuredReview && (
                <div className="mt-12 pt-8 border-t border-slate-200 hidden lg:flex items-center gap-2 text-xs text-slate-400 font-medium">
                   <CheckCircle2 size={14} className="text-blue-600" />
                   <span>Verified Stay • {formatMonthYear(featuredReview.createdAt)}</span>
                </div>
              )}
          </div>

          {/* 2. RIGHT: DATA & RECENT FEED */}
          <div className="lg:col-span-5 space-y-10">
             
             {/* The "Scorecard" */}
             <div className="bg-[#0f172a] text-white p-8 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200">
                <div>
                   <div className="text-4xl font-bold tracking-tight mb-1">
                     {stats.avg}
                     <span className="text-slate-500 text-2xl font-light">/5</span>
                   </div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Based on {reviewCountLabel}
                   </div>
                </div>
                <div className="text-right space-y-2">
                   <div className="flex text-amber-400 gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star
                          key={i}
                          size={16}
                          fill={i <= Math.round(Number(stats.avg)) ? "currentColor" : "transparent"}
                          strokeWidth={0}
                        />
                      ))}
                   </div>
                   <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stats.label}</div>
                </div>
             </div>

             {/* Recent Reviews List */}
              <div className="space-y-8">
                {recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <div key={review._id} className="pb-8 border-b border-slate-200 last:border-0 last:pb-0">
                      <div className="flex gap-1 text-amber-500 mb-3">
                        {[1,2,3,4,5].map(i => (
                          <Star
                            key={i}
                            size={10}
                            fill={i <= Number(review.rating || 0) ? "currentColor" : "transparent"}
                            strokeWidth={0}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-justify text-slate-600 leading-relaxed mb-3 font-light">
                        "{review.comment}"
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">
                        — {getReviewerName(review)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">More guest reviews will appear here once available.</div>
                )}
              </div>
          </div>

        </div>
        
        {/* MOBILE BUTTON - Added onClick */}
        <div className="mt-12 md:hidden">
            <button 
                onClick={handleViewAllReviews}
                className="w-full py-4 bg-white border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-colors"
            >
                Read all {reviewCountLabel}
            </button>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
