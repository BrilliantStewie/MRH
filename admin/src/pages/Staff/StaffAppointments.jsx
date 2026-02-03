import React, { useContext, useEffect } from "react";
import StaffContext from "../../context/StaffContext";
import { assets } from "../../assets/assets";   // ✅ named import

const StaffAppointments = () => {
  const { sToken, bookings, getBookings, checkIn, checkOut } =
    useContext(StaffContext);

  useEffect(() => {
    if (sToken) getBookings();
  }, [sToken]);

  const handlePaymentUpload = (bookingId) => {
    const file = selectedPayment;
    if (file) uploadPaymentProof(bookingId, file);
  };

  return (
    <div className="w-full max-w-6xl m-5 p-5">
      <p className="mb-3 text-lg font-medium">All Bookings</p>
      <div className="bg-white border rounded text-sm max-h-[80vh] min-h-[50vh] overflow-y-scroll">
        {/* Table Header */}
        <div className="max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-1 py-3 px-6 border-b bg-gray-50">
          <p>#</p><p>Guest</p><p>Room/Building</p><p>Participants</p><p>Date</p><p>Amount</p><p>Payment</p><p>Status/Action</p>
        </div>

        {bookings?.reverse()?.map((item, index) => (
          <div className="flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50" key={index}>
            <p className="max-sm:hidden">{index + 1}</p>
            
            {/* Guest Info */}
            <div className="flex items-center gap-2">
              <img className="w-8 rounded-full" src={item.userData?.image} alt="Guest" />
              <p>{item.userData?.name}</p>
            </div>

            {/* Room/Building */}
            <p>{item.roomData?.name} ({item.roomData?.building})</p>
            
            {/* Participants */}
            <p>{item.participants}</p>
            
            {/* Date */}
            <p>{slotDateFormat(item.checkIn)} - {slotDateFormat(item.checkOut)}</p>
            
            {/* Amount */}
            <p>{currency(item.totalPrice)}</p>

            {/* Payment Status & Upload */}
            <div className="flex flex-col gap-1">
              <p className={`text-xs inline border px-2 rounded-full ${item.payment?.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {item.payment?.status || 'Pending'}
              </p>
              {item.payment?.status === 'pending' && (
                <div className="flex gap-1">
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedPayment(e.target.files[0])}
                    className="text-xs"
                  />
                  <button 
                    onClick={() => handlePaymentUpload(item.id)}
                    className="text-xs bg-primary text-white px-2 py-1 rounded"
                  >
                    Upload
                  </button>
                </div>
              )}
            </div>

            {/* Status & Actions */}
            {item.status === 'cancelled' ? (
              <p className="text-red-400 text-xs font-medium">Cancelled</p>
            ) : item.status === 'completed' ? (
              <p className="text-green-500 text-xs font-medium">Completed</p>
            ) : item.status === 'checked_in' ? (
              <div className="flex gap-2">
                <img onClick={() => checkOut(item.id)} className="w-8 cursor-pointer" src={assets.checkoutIcon} alt="Check Out" />
              </div>
            ) : item.status === 'pending' ? (
              <div className="flex gap-2">
                <img onClick={() => approveBooking(item.id)} className="w-8 cursor-pointer" src={assets.approveIcon} alt="Approve" />
                <img onClick={() => declineBooking(item.id)} className="w-8 cursor-pointer" src={assets.declineIcon} alt="Decline" />
              </div>
            ) : (
              <div className="flex gap-2">
                <img onClick={() => checkIn(item.id)} className="w-8 cursor-pointer" src={assets.checkinIcon} alt="Check In" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffAppointments;
