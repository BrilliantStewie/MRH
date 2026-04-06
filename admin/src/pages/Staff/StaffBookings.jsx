import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { StaffContext } from "../../context/StaffContext";
import { BookingsPage } from "../Admin/AllBookings";
import {
  matchesRealtimeEntity,
  STAFF_REALTIME_EVENT_NAME,
} from "../../utils/realtime";

const StaffBookings = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const [bookings, setBookings] = useState([]);

  const fetchBookings = async ({ silent = false } = {}) => {
    if (!backendUrl || !sToken) {
      setBookings([]);
      return;
    }

    try {
      const { data } = await axios.get(`${backendUrl}/api/staff/bookings`, {
        headers: { token: sToken },
      });

      if (data.success) {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } else if (!silent) {
        toast.error(data.message || "Failed to load bookings");
      }
    } catch (error) {
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to load bookings"
        );
      }
    }
  };

  const updateStayStatus = async (bookingId, action) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/staff/bookings/${bookingId}/stay-status`,
        { action },
        {
          headers: { token: sToken },
        }
      );

      if (data.success) {
        toast.success(data.message);
        await fetchBookings({ silent: true });
        return true;
      }

      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update stay status");
      return false;
    }
  };

  useEffect(() => {
    if (sToken) {
      fetchBookings({ silent: true });
    } else {
      setBookings([]);
    }
  }, [sToken, backendUrl]);

  useEffect(() => {
    if (!sToken || !backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["bookings"])) {
        fetchBookings({ silent: true });
      }
    };

    window.addEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);

    return () => {
      window.removeEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [sToken, backendUrl]);

  return (
    <BookingsPage
      bookingsSource={bookings}
      backendUrl={backendUrl}
      pageTitle="Booking Schedules"
      pageSubtitle="Review reservations and update guest stay status"
      bookingsPerPage={10}
      showBilling={false}
      onUpdateStayStatus={updateStayStatus}
    />
  );
};

export default StaffBookings;
