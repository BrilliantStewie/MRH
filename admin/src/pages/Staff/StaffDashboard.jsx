// src/pages/Staff/StaffDashboard.jsx
import React, { useContext, useEffect } from "react";
import StaffContext from "../../context/StaffContext";     // default import
import { assets } from "../../assets/assets";

const StaffDashboard = () => {
  const { sToken, dashData, getDashData } = useContext(StaffContext);

  useEffect(() => {
    if (sToken) {
      getDashData();
    }
  }, [sToken]);

  return (
    <div className="m-5">
      {/* Stats Cards */}
      <div className="flex flex-wrap gap-3 mb-10">
        {/* Total Bookings */}
        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 hover:scale-105 transition-all">
          <img className="w-14" src={assets.appointments_icon} alt="Bookings" />
          <div>
            <p className="text-xl font-semibold text-gray-600">
              {dashData?.totalBookings || 0}
            </p>
            <p className="text-gray-400">Total Bookings</p>
          </div>
        </div>

        {/* Total Guests */}
        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 hover:scale-105 transition-all">
          <img className="w-14" src={assets.patients_icon} alt="Guests" />
          <div>
            <p className="text-xl font-semibold text-gray-600">
              {dashData?.totalGuests || 0}
            </p>
            <p className="text-gray-400">Total Guests</p>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 hover:scale-105 transition-all">
          <img className="w-14" src={assets.earning_icon} alt="Income" />
          <div>
            <p className="text-xl font-semibold text-gray-600">
              ₱{dashData?.monthlyIncome || 0}
            </p>
            <p className="text-gray-400">Monthly Income</p>
          </div>
        </div>
      </div>

      {/* Latest Bookings */}
      <div className="bg-white rounded border">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b">
          <img src={assets.list_icon} alt="List" className="w-5" />
          <p className="font-semibold">Latest Bookings</p>
        </div>
        <div className="divide-y">
          {dashData?.latestBookings?.map((item, index) => (
            <div
              className="flex items-center px-6 py-4 gap-3 hover:bg-gray-50"
              key={index}
            >
              <img
                className="rounded-full w-10 h-10 object-cover"
                src={item.userData?.image || assets.people_icon}
                alt="Guest"
              />
              <div className="flex-1">
                <p className="text-gray-800 font-medium">
                  {item.userData?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {item.roomData?.name} • {item.participants} pax
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(item.checkin).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : item.status === "approved"
                    ? "bg-blue-100 text-blue-800"
                    : item.status === "checked_in"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
          {!dashData?.latestBookings?.length && (
            <div className="px-6 py-6 text-sm text-gray-500">
              No recent bookings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
