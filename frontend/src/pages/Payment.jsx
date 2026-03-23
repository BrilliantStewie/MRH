import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate("/my-bookings", { replace: true });
      return;
    }

    navigate(`/my-bookings?bookingId=${id}`, {
      replace: true,
      state: { bookingId: id }
    });
  }, [id, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-base font-semibold text-slate-900">Redirecting to your booking...</p>
        <p className="mt-2 text-sm text-slate-500">Please continue payment from My Bookings.</p>
      </div>
    </div>
  );
};

export default Payment;
