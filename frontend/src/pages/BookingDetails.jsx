import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  ArrowRight, CalendarDays, Loader2, Smartphone
} from "lucide-react";

const MyBookings = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Bookings
  const fetchUserBookings = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/bookings", {
        headers: { token },
      });
      if (data.success) {
        setBookings(data.bookings.reverse());
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Payment Logic
  const handlePayment = async (bookingId) => {
    try {
        const toastId = toast.loading("Connecting to GCash...");
        
        const { data } = await axios.post(
            backendUrl + "/api/user/payment",
            { bookingId },
            { headers: { token } }
        );

        toast.dismiss(toastId);

        if (data.success) {
            // Redirect to PayMongo
            window.location.href = data.checkoutUrl;
        } else {
            toast.error(data.message);
        }
    } catch (error) {
        toast.dismiss();
        toast.error("Payment Error: " + error.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserBookings();
    }

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("payment_success") === "true") {
        toast.success("GCash Payment Successful!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (queryParams.get("payment_cancelled") === "true") {
        toast.error("GCash Payment Cancelled.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  if (loading) {
     return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Bookings</h1>
        
        <div className="space-y-4">
          {bookings.map((booking, index) => {
             const isPayable = booking.status === 'pending'; 

             return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        <div className="flex-grow">
                            <h3 className="font-bold text-lg mb-2">Booking #{booking._id.slice(-6)}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><CalendarDays size={14}/> {new Date(booking.check_in).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isPayable && (
                                <button 
                                    onClick={() => handlePayment(booking._id)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                                >
                                    <Smartphone size={16} /> Pay via GCash
                                </button>
                            )}
                            <button className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                                Details <ArrowRight size={14}/>
                            </button>
                        </div>
                    </div>
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyBookings;