import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { StaffContext } from "../context/StaffContext"; 
import { Star, User, MessageSquare, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AllReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { backendUrl, sToken } = useContext(StaffContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReviewsFromBookings = async () => {
            try {
                const { data } = await axios.get(`${backendUrl}/api/staff/bookings`, {
                    headers: { token: sToken }
                }); 
                
                if (data.success) {
                    // Filter for bookings that have at least a review or a rating
                    const guestReviews = data.bookings.filter(b => b.review || b.rating);
                    setReviews(guestReviews);
                }
            } catch (error) {
                console.error("Error fetching reviews", error);
            } finally {
                setLoading(false);
            }
        };

        if (sToken) fetchReviewsFromBookings();
    }, [backendUrl, sToken]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="w-full p-8 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Guest Experiences</h1>
                    <p className="text-slate-500">Read what our guests have to say about their stay.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reviews.map((item, index) => (
                        <div key={index} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <img 
                                            src={item.user_id?.image || "/default-avatar.png"} 
                                            className="h-12 w-12 rounded-2xl object-cover shadow-sm" 
                                            alt="Guest"
                                        />
                                        <div>
                                            <h3 className="font-bold text-slate-900">{item.user_id?.name || "Guest"}</h3>
                                            <div className="flex items-center gap-1 text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < item.rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <p className="text-slate-600 italic leading-relaxed mb-6">"{item.review || "No written review provided."}"</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 mt-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <Calendar size={12} />
                                        {new Date(item.check_in).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/history/${item._id}`)}
                                        className="flex items-center gap-2 text-indigo-600 text-xs font-bold hover:underline"
                                    >
                                        <MessageSquare size={14} />
                                        View History
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {reviews.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-slate-400 font-medium text-lg">No guest reviews yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllReviews;