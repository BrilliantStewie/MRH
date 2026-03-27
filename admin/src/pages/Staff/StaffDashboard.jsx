import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import {
  matchesRealtimeEntity,
  STAFF_REALTIME_EVENT_NAME,
} from "../../utils/realtime";

const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const STAFF_DASHBOARD_SYNC_INTERVAL_MS = 15000;

const StaffDashboard = () => {
  const { backendUrl, sToken } = useContext(StaffContext);

  const [allBookings, setAllBookings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const syncInProgressRef = useRef(false);

  const fetchOperationalData = async ({ silent = false } = {}) => {
    if (!sToken || syncInProgressRef.current) return;

    syncInProgressRef.current = true;

    try {
      const headers = { token: sToken };
      const [bookingsRes, roomsRes, usersRes] = await Promise.all([
        axios.get(`${backendUrl}/api/staff/bookings`, { headers }),
        axios.get(`${backendUrl}/api/staff/rooms`, { headers }),
        axios.get(`${backendUrl}/api/staff/users`, { headers }),
      ]);

      if (bookingsRes.data.success) setAllBookings(bookingsRes.data.bookings || []);
      if (roomsRes.data.success) setAllRooms(roomsRes.data.rooms || []);
      if (usersRes.data.success) setAllUsers(usersRes.data.users || []);
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
      if (!silent) {
        toast.error("Failed to sync live data");
      }
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!sToken) return undefined;

    fetchOperationalData({ silent: true });

    const runVisibleSync = () => {
      if (document.visibilityState === "visible") {
        fetchOperationalData({ silent: true });
      }
    };

    const interval = setInterval(runVisibleSync, STAFF_DASHBOARD_SYNC_INTERVAL_MS);
    const handleFocus = () => fetchOperationalData({ silent: true });
    const handleVisibilityChange = () => runVisibleSync();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sToken, backendUrl]);

  useEffect(() => {
    if (!sToken || !backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (
        matchesRealtimeEntity(event.detail, [
          "bookings",
          "rooms",
          "users",
          "account_status",
        ])
      ) {
        fetchOperationalData({ silent: true });
      }
    };

    window.addEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(STAFF_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [sToken, backendUrl]);

  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];

    const today = normalizeDate(new Date());
    const occupiedRoomIds = new Set();

    bookings.forEach((booking) => {
      if ((booking.status || "").toLowerCase() !== "approved") return;

      const checkIn = normalizeDate(getBookingCheckInDateValue(booking));
      const checkOut = normalizeDate(getBookingCheckOutDateValue(booking));
      if (!today || !checkIn || !checkOut) return;

      if (today >= checkIn && today < checkOut) {
        (booking.bookingItems || []).forEach((item) => {
          const roomId = item?.roomId?._id ?? item?.roomId;
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
      const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
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
    <div className="flex min-h-full w-full flex-col bg-[#f8fafc] font-sans text-slate-800">
      <AvailabilityCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        bookings={allBookings || []}
      />

      <header className="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-center md:gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Good day, Staff</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">Property Overview & Real-time Analytics</p>
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-[14px] border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
                <BedDouble size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Live Occupancy
                </p>
                <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
                  {stats.occupancy}/{stats.totalRooms} Units
                </p>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${stats.occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex h-full min-h-[300px] flex-col justify-between rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:min-h-[320px] sm:rounded-[32px] sm:p-8">
            <div className="mb-6 flex items-end justify-between sm:mb-8">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
                  <BarChart3 size={18} className="text-emerald-500" /> Booking Overview
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Confirmed bookings over the last 6 months
                </p>
              </div>
            </div>

            <div className="relative mt-auto flex h-44 items-end justify-between gap-2 pt-4 sm:h-56 sm:gap-4">
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
          <div className="group relative flex min-h-[300px] w-full flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-300 hover:border-indigo-200 sm:min-h-[320px] sm:rounded-[32px] sm:p-8">
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
              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Check Availability</h3>
              <p className="mb-6 max-w-full text-sm font-medium leading-relaxed text-slate-500 sm:mb-8 sm:max-w-[90%]">
                Check available dates and reservation schedules in one place.
              </p>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="group/btn flex w-full items-center justify-between rounded-2xl bg-indigo-600 px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] transition-all hover:bg-indigo-700 active:scale-95 sm:px-6 sm:text-xs"
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
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const activeTheme = themes[color] || themes.indigo;

  return (
    <div className="group relative flex h-36 flex-col justify-between overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition-colors hover:border-slate-200">
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <div
          className={`shrink-0 rounded-[14px] border p-2.5 transition-transform duration-300 group-hover:scale-110 ${activeTheme}`}
        >
          {icon}
        </div>
        <p className="truncate text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <div className="relative z-10">
        <h3 className="truncate text-2xl font-black tracking-tight text-slate-900">{value}</h3>
        <p className="mt-1 truncate text-[10px] font-bold text-slate-400">{subValue}</p>
      </div>
    </div>
  );
};

export default StaffDashboard;


