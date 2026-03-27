import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Quote, ArrowRight, CheckCircle2, User } from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { formatMonthYearPHT } from "../utils/dateTime";
import {
  FRONTEND_REALTIME_EVENT_NAME,
  matchesRealtimeEntity,
} from "../utils/realtime";

const TESTIMONIALS_REFRESH_INTERVAL_MS = 15000;

const Testimonials = () => {
  const navigate = useNavigate();
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
    if (!backendUrl) return undefined;

    fetchReviews();

    const runVisibleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchReviews();
      }
    };

    const interval = setInterval(runVisibleRefresh, TESTIMONIALS_REFRESH_INTERVAL_MS);
    const handleFocus = () => fetchReviews();
    const handleVisibilityChange = () => runVisibleRefresh();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [backendUrl]);

  useEffect(() => {
    if (!backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["reviews"])) {
        fetchReviews();
      }
    };

    window.addEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [backendUrl]);

  const handleViewAllReviews = () => {
    navigate("/reviews");
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
      label,
    };
  }, [reviews]);

  const featuredReview = reviews[0];
  const recentReviews = reviews.slice(1, 3);

  const getReviewerName = (review) => {
    const user = review?.userId;
    if (!user) return "Guest";
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return null;
    if (imagePath.startsWith("http")) return imagePath;
    return `${backendUrl}/${imagePath.replace(/\\/g, "/")}`;
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  };

  const reviewCountLabel = stats.count
    ? `${stats.count} review${stats.count > 1 ? "s" : ""}`
    : "Reviews";

  return (
    <section className="border-b border-slate-200 bg-[#F8F9FA] py-16 font-sans text-slate-900 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px w-8 bg-blue-900"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-900">
                Guest Reflections
              </span>
            </div>
            <h2 className="font-serif text-3xl leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              A Sanctuary <span className="italic text-slate-400">remembered.</span>
            </h2>
          </div>

          <button
            onClick={handleViewAllReviews}
            className="group hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-900 md:flex"
          >
            Read all {reviewCountLabel}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div className="relative pt-2 sm:pt-4">
              <Quote size={80} className="absolute -top-4 -left-6 -z-10 text-blue-100/50" />
              <blockquote className="space-y-8">
                <p className="font-serif text-lg leading-tight text-slate-900 sm:text-2xl md:text-3xl lg:text-4xl">
                  {featuredReview?.comment
                    ? `"${truncateText(featuredReview.comment, 150)}"`
                    : loading
                      ? "Loading guest reflections..."
                      : "No reviews yet. Be the first to share your experience."}
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white text-blue-900 shadow-sm">
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

            {featuredReview && (
              <div className="mt-8 hidden items-center gap-2 border-t border-slate-200 pt-6 text-xs font-medium text-slate-400 lg:flex lg:pt-8">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Verified Stay | {formatMonthYearPHT(featuredReview.createdAt)}</span>
              </div>
            )}
          </div>

          <div className="space-y-8 sm:space-y-10 lg:col-span-5">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#0f172a] p-6 text-white shadow-xl shadow-slate-200 sm:flex-row sm:items-center sm:p-8">
              <div>
                <div className="mb-1 text-4xl font-bold tracking-tight">
                  {stats.avg}
                  <span className="text-2xl font-light text-slate-500">/5</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Based on {reviewCountLabel}
                </div>
              </div>
              <div className="space-y-2 text-left sm:text-right">
                <div className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i <= Math.round(Number(stats.avg)) ? "currentColor" : "transparent"}
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {stats.label}
                </div>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {recentReviews.length > 0 ? (
                recentReviews.map((review) => (
                  <div
                    key={review._id}
                    className="border-b border-slate-200 pb-6 last:border-0 last:pb-0 sm:pb-8"
                  >
                    <div className="mb-3 flex gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={10}
                          fill={i <= Number(review.rating || 0) ? "currentColor" : "transparent"}
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <p className="mb-3 text-sm font-light leading-relaxed text-slate-600">
                      "{review.comment}"
                    </p>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400">
                      - {getReviewerName(review)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  More guest reviews will appear here once available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 md:hidden sm:mt-12">
          <button
            onClick={handleViewAllReviews}
            className="w-full rounded-lg border border-slate-200 bg-white py-4 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-50"
          >
            Read all {reviewCountLabel}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
