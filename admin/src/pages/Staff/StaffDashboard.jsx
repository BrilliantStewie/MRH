import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  CalendarDays,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import AvailabilityCalendar from "../Admin/AvailabilityCalendar";
import { StaffContext } from "../../context/StaffContext";

const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const StaffDashboard = () => {
  const { backendUrl, sToken } = useContext(StaffContext);

  const [allBookings, setAllBookings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const fetchOperationalData = async () => {
      try {
        const headers = { token: sToken };
        const [bookingsRes, roomsRes, usersRes] = await Promise.all([
          axios.get(`${backendUrl}/api/staff/bookings`, { headers }),
          axios.get(`${backendUrl}/api/staff/rooms`, { headers }),
          axios.get(`${backendUrl}/api/staff/users`, { headers }),
        ]);

        if (bookingsRes.data.success) setAllBookings(bookingsRes.data.bookings);
        if (roomsRes.data.success) setAllRooms(roomsRes.data.rooms);
        if (usersRes.data.success) setAllUsers(usersRes.data.users);
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        toast.error("Failed to sync live data");
      }
    };

    if (sToken) fetchOperationalData();
  }, [sToken, backendUrl]);

  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];

    const today = normalizeDate(new Date());
    const occupiedRoomIds = new Set();

    bookings.forEach((booking) => {
      if ((booking.status || "").toLowerCase() !== "approved") return;

      const checkIn = normalizeDate(booking.check_in || booking.checkIn || booking.date);
      const checkOut = normalizeDate(booking.check_out || booking.checkOut);
      if (!today || !checkIn || !checkOut) return;

      if (today >= checkIn && today < checkOut) {
        (booking.bookingItems || []).forEach((item) => {
          const roomId = item?.room_id?._id ?? item?.room_id;
          if (roomId) occupiedRoomIds.add(String(roomId));
        });
      }
    });

    const occupiedCount = occupiedRoomIds.size;
    const totalRooms = rooms.length || 0;
    const occupancyRate = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;

    const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
    const pendingCancellations = bookings.filter(
      (booking) => booking.status === "cancellation_pending"
    ).length;

    return {
      totalBookings: bookings.length,
      totalUsers: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: rooms.length,
      occupancyRate,
      pendingRequests: pendingBookings + pendingCancellations,
    };
  }, [allRooms, allBookings, allUsers]);

  const chartData = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 5; i >= 0; i -= 1) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        label: monthLabels[targetMonth.getMonth()],
        month: targetMonth.getMonth(),
        year: targetMonth.getFullYear(),
        bookings: 0,
      });
    }

    (allBookings || []).forEach((booking) => {
      const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
      const monthBucket = months.find(
        (month) => month.month === bookingDate.getMonth() && month.year === bookingDate.getFullYear()
      );

      if (monthBucket) {
        monthBucket.bookings += 1;
      }
    });

    const maxBookings = Math.max(...months.map((month) => month.bookings), 1);
    return months.map((month) => ({
      ...month,
      height: Math.round((month.bookings / maxBookings) * 100),
    }));
  }, [allBookings]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-800 md:p-8">
      <AvailabilityCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        bookings={allBookings || []}
      />

      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Good day, Staff</h1>
          <p className="mt-1 font-medium text-slate-500">Property Overview & Real-time Analytics</p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon={<BarChart3 size={20} />}
          color="slate"
          subValue="All time"
        />
        <StatCard
          label="Total Guests"
          value={stats.totalUsers}
          icon={<Users size={20} />}
          color="emerald"
          subValue="Directory count"
        />
        <StatCard
          label="Actions Required"
          value={stats.pendingRequests}
          icon={<AlertCircle size={20} />}
          color="rose"
          subValue="Pending approvals"
        />

        <div className="flex h-36 flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="rounded-[14px] border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
              <BedDouble size={20} />
            </div>
            <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
          </div>
          <div className="mt-2">
            <div className="mb-2 flex items-end justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Live Occupancy
              </p>
              <p className="text-[10px] font-bold text-slate-500">
                {stats.occupancy}/{stats.totalRooms} Units
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${stats.occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
                  <BarChart3 size={18} className="text-emerald-500" /> Booking Overview
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Confirmed bookings over the last 6 months
                </p>
              </div>
            </div>

            <div className="relative mt-auto flex h-56 items-end justify-between gap-2 pt-4 sm:gap-4">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-0 w-full border-t border-dashed border-slate-100"></div>
                ))}
              </div>

              {chartData.map((data, index) => (
                <div
                  key={`${data.year}-${data.month}-${index}`}
                  className="group z-10 flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
                >
                  <div className="mb-2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {data.bookings} bookings
                  </div>
                  <div
                    className="relative w-full max-w-[48px] overflow-hidden rounded-t-xl bg-indigo-50 transition-all duration-500 group-hover:bg-indigo-500"
                    style={{ height: `${Math.max(data.height, 8)}%` }}
                  >
                    <div className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-indigo-200 to-transparent group-hover:from-indigo-600"></div>
                  </div>
                  <span className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-indigo-600">
                    {data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex lg:col-span-5">
          <div className="group relative flex min-h-[320px] w-full flex-col justify-between overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-colors duration-300 hover:border-indigo-200">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-indigo-50/80 blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-50/60 blur-3xl"></div>

            <div className="relative z-10 mb-6 flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm">
                <CalendarDays size={28} className="text-indigo-600" />
              </div>
              <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                Management
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <h3 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Check Availability</h3>
              <p className="mb-8 max-w-[90%] text-sm font-medium leading-relaxed text-slate-500">
                Check available dates and reservation schedules in one place.
              </p>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="group/btn flex w-full items-center justify-between rounded-2xl bg-indigo-600 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] transition-all hover:bg-indigo-700 active:scale-95"
              >
                <span>View Calendar</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors group-hover/btn:bg-white group-hover/btn:text-indigo-600">
                  <ArrowUpRight
                    size={16}
                    className="transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, subValue }) => {
  const themes = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const activeTheme = themes[color] || themes.indigo;

  return (
    <div className="flex h-40 flex-col justify-between rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-2xl border p-3 ${activeTheme}`}>{icon}</div>
      </div>
      <div>
        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">{value}</h3>
        <p className="mt-1 text-[10px] font-bold text-slate-400">{subValue}</p>
      </div>
    </div>
  );
};

export default StaffDashboard;
