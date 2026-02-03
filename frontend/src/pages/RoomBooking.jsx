// src/pages/RoomBooking.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const RoomBooking = () => {
  const { roomId } = useParams();
  const { rooms, backendUrl, token } = useContext(AppContext);

  const [roomInfo, setRoomInfo] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [participants, setParticipants] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  const navigate = useNavigate();

  // Load selected room
  useEffect(() => {
    const room = rooms.find((r) => r._id === roomId);
    setRoomInfo(room);
  }, [rooms, roomId]); // [file:212]

  // Calculate total price whenever inputs change
  useEffect(() => {
    if (!roomInfo || !checkIn || !checkOut) return;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) return;

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    setTotalPrice(days * roomInfo.price);
  }, [checkIn, checkOut, roomInfo]); // [file:212]

  const bookRoom = async () => {
    if (!token) {
      toast.warn("Login to continue");
      return navigate("/login");
    }

    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/booking/create`,
        {
          room_id: roomId,
          check_in: checkIn,
          check_out: checkOut,
          participants,
          total_price: totalPrice,
        },
        { headers: { token } }
      );

      if (data.success) {
        toast.success("Room booked successfully!");
        navigate("/my-bookings");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error("Booking failed");
    }
  };

  if (!roomInfo) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">Loading room information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* LEFT: room preview */}
      <div className="md:col-span-2 space-y-4">
        {/* Image preview of the booked room */}
        <div className="w-full h-60 md:h-72 bg-slate-100 rounded-xl overflow-hidden">
          <img
            src={roomInfo.image || roomInfo.image_url}
            alt={roomInfo.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">
          {roomInfo.name}
        </h1>

        <p className="text-sm text-gray-600">
          {roomInfo.room_type} • {roomInfo.building}
        </p>

        <p className="text-sm text-gray-600">
          Capacity: {roomInfo.capacity} pax
        </p>

        <p className="text-sm text-gray-700">
          Price per night: ₱{roomInfo.price}
        </p>

        {roomInfo.description && (
          <p className="text-sm text-gray-600">{roomInfo.description}</p>
        )}
      </div>

      {/* RIGHT: booking form */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Book this room
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in date
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-out date
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Participants
            </label>
            <input
              type="number"
              min={1}
              value={participants}
              onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <p className="text-sm font-semibold text-gray-900">
            Total Price: ₱{totalPrice}
          </p>

          <button
            onClick={bookRoom}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Confirm Booking
          </button>
        </div>
      </div>

      {/* Optional: related rooms section */}
      <div className="md:col-span-3 mt-10">
        <RelatedRooms currentRoomId={roomId} />
      </div>
    </div>
  );
};

export default RoomBooking;
