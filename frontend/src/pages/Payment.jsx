import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext"; // Make sure this path is correct
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";

const Payment = () => {
  const { id } = useParams();
  const { backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // We use the existing booking endpoint to get details
        const { data } = await axios.get(`${backendUrl}/api/booking/user`, { headers: { token } });
        
        // Filter to find the specific booking by ID since the endpoint returns all
        if (data.success) {
          const specificBooking = data.bookings.find(b => b._id === id);
          if (specificBooking) setBooking(specificBooking);
        }
      } catch (error) {
        toast.error("Could not load booking details");
      }
    };
    if (token) fetchBookingDetails();
  }, [id, token, backendUrl]);

  const payWithGCash = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/payment/create-checkout-session`, 
        { bookingId: id },
        { headers: { token } }
      );

      if (data.success) {
        // Redirect user to the PayMongo/GCash page
        window.location.href = data.session_url;
      } else {
        toast.error("Payment initiation failed");
      }
    } catch (error) {
      toast.error("Error connecting to payment gateway");
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 hover:text-blue-200">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-xl font-bold">Confirm Payment</h2>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
             <p className="text-sm text-slate-500 font-bold uppercase">Total Amount</p>
             <p className="text-4xl font-bold text-slate-800">₱{booking.total_price.toLocaleString()}</p>
          </div>

          <button 
            onClick={payWithGCash}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                G
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 group-hover:text-blue-700">GCash / E-Wallet</p>
                <p className="text-xs text-slate-500">Fast & Secure</p>
              </div>
            </div>
            {loading ? <span className="text-xs">Processing...</span> : <CreditCard size={20} className="text-slate-400 group-hover:text-blue-600"/>}
          </button>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} />
            <span>Secure connection via PayMongo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;