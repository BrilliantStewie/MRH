import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronRight,
  Zap,
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

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STAFF_DASHBOARD_SYNC_INTERVAL_MS = 15000;

const formatCount = (value) => Number(value || 0).toLocaleString();
const formatShortDate = (date) => SHORT_DATE_FORMATTER.format(date);
const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfDay = (value) => normalizeDate(value);
const endOfDay = (value) => {
  const d = normalizeDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};
const shiftDays = (value, amount) => {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d;
};
const startOfWeek = (value) => {
  const d = normalizeDate(value);
  if (!d) return null;
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
};
const endOfWeek = (value) => {
  const d = startOfWeek(value);
  if (!d) return null;
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};
const startOfMonth = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const endOfMonth = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};
const startOfYear = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), 0, 1);
};
const endOfYear = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
};
const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
const calculateTrendDelta = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};
const formatTrendDelta = (value) => {
  const amount = Number(value || 0);
  if (amount === 0) return "0%";
  const magnitude = Math.abs(amount) >= 10 ? Math.round(Math.abs(amount)) : Math.abs(amount).toFixed(1);
  return `${amount > 0 ? "+" : "-"}${magnitude}%`;
};
const getBookingLifecycleStatus = (booking) => String(booking?.status || "").trim().toLowerCase();
const isNoShowBooking = (booking) =>
  Boolean(booking?.noShow) || String(booking?.stayStatus || "").trim().toLowerCase() === "noshow";
const isScheduledBooking = (booking) => {
  const status = getBookingLifecycleStatus(booking);
  return (
    booking?.downpaymentSatisfied === true ||
    booking?.bookingSecured === true ||
    booking?.paymentStatus === "paid" ||
    status === "approved"
  );
};
const resolveMediaUrl = (backendUrl, value) => {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^https?:\/\//i.test(source)) return source;
  return `${backendUrl}/${source.replace(/^\/+/, "")}`;
};
const getGuestName = (booking) => {
  const fullName = [booking?.userId?.firstName, booking?.userId?.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
  return fullName || String(booking?.bookingName || "").trim() || "Guest";
};
const formatStayRange = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "Schedule pending";
  return `${formatShortDate(checkIn)} - ${formatShortDate(checkOut)}`;
};
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const StaffDashboard = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  const navigate = useNavigate();

  const [allBookings, setAllBookings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [bookingRange, setBookingRange] = useState("month");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const syncInProgressRef = useRef(false);

  const fetchOperationalData = async ({ silent = false } = {}) => {
    if (!sToken || syncInProgressRef.current) return;

    syncInProgressRef.current = true;

    try {
      const headers = { token: sToken };
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/staff/bookings`, { headers }),
        axios.get(`${backendUrl}/api/staff/rooms`, { headers }),
      ]);

      if (bookingsRes.data.success) setAllBookings(bookingsRes.data.bookings || []);
      if (roomsRes.data.success) setAllRooms(roomsRes.data.rooms || []);
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
    const currentDate = new Date();
    const today = startOfDay(currentDate);
    const todayEnd = endOfDay(currentDate);
    const yesterday = startOfDay(shiftDays(currentDate, -1));
    const trailingThirtyDayStart = startOfDay(shiftDays(currentDate, -29));
    const previousThirtyDayStart = startOfDay(shiftDays(currentDate, -59));
    const previousThirtyDayEnd = endOfDay(shiftDays(currentDate, -30));
    const scheduledBookings = bookings.filter(isScheduledBooking);

    const getOccupiedCountForDate = (targetDate) => {
      if (!targetDate) return 0;

      const occupiedRoomIds = new Set();
      scheduledBookings.forEach((booking) => {
        if (isNoShowBooking(booking)) return;

        const checkIn = normalizeDate(getBookingCheckInDateValue(booking));
        const checkOut = normalizeDate(getBookingCheckOutDateValue(booking));
        if (!checkIn || !checkOut) return;

        if (targetDate >= checkIn && targetDate < checkOut) {
          (booking.bookingItems || []).forEach((item) => {
            const roomId = item?.roomId?._id ?? item?.roomId;
            if (roomId) occupiedRoomIds.add(String(roomId));
          });
        }
      });

      return occupiedRoomIds.size;
    };

    const occupiedCount = getOccupiedCountForDate(today);
    const yesterdayOccupiedCount = getOccupiedCountForDate(yesterday);
    const totalRooms = rooms.length || 0;
    const occupancyRate = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;
    const yesterdayOccupancyRate = totalRooms ? Math.round((yesterdayOccupiedCount / totalRooms) * 100) : 0;

    const pendingBookings = bookings.filter((booking) => getBookingLifecycleStatus(booking) === "pending");
    const pendingCancellations = bookings.filter(
      (booking) => getBookingLifecycleStatus(booking) === "cancellation_pending"
    );

    const roomsBooked30Days = scheduledBookings
      .filter((booking) => {
        const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
        return bookingDate >= trailingThirtyDayStart && bookingDate <= todayEnd;
      })
      .reduce(
        (sum, booking) => sum + (Array.isArray(booking.bookingItems) ? booking.bookingItems.length : 0),
        0
      );

    const previousRoomsBooked30Days = scheduledBookings
      .filter((booking) => {
        const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
        return bookingDate >= previousThirtyDayStart && bookingDate <= previousThirtyDayEnd;
      })
      .reduce(
        (sum, booking) => sum + (Array.isArray(booking.bookingItems) ? booking.bookingItems.length : 0),
        0
      );

    const upcomingArrivals = scheduledBookings
      .filter((booking) => {
        const checkIn = startOfDay(getBookingCheckInDateValue(booking));
        return Boolean(today && checkIn && checkIn >= today);
      })
      .sort(
        (left, right) =>
          new Date(getBookingCheckInDateValue(left) || left.createdAt).getTime() -
          new Date(getBookingCheckInDateValue(right) || right.createdAt).getTime()
      )
      .slice(0, 8);

    const pendingSummaryParts = [];
    if (pendingBookings.length) pendingSummaryParts.push(`${formatCount(pendingBookings.length)} bookings`);
    if (pendingCancellations.length) {
      pendingSummaryParts.push(`${formatCount(pendingCancellations.length)} cancellations`);
    }

    return {
      occupancy: occupiedCount,
      totalRooms,
      occupancyRate,
      occupancyTrend: calculateTrendDelta(occupancyRate, yesterdayOccupancyRate),
      pendingRequests: pendingBookings.length + pendingCancellations.length,
      pendingSummary: pendingSummaryParts.join(", ") || "No pending requests",
      roomsBooked30Days,
      roomsBookedTrend: calculateTrendDelta(roomsBooked30Days, previousRoomsBooked30Days),
      upcomingArrivals,
    };
  }, [allRooms, allBookings]);

  const bookingActivity = useMemo(() => {
    const currentDate = new Date();
    const scheduledBookings = (allBookings || []).filter(isScheduledBooking);

    let buckets = [];
    let currentWindowStart = null;
    let currentWindowEnd = null;
    let previousWindowStart = null;
    let previousWindowEnd = null;
    let summaryLabel = "";

    if (bookingRange === "week") {
      const currentWeekStart = startOfWeek(currentDate);
      buckets = Array.from({ length: 8 }, (_, index) => {
        const start = startOfWeek(shiftDays(currentWeekStart, (index - 7) * 7));
        return {
          key: `week-${start.toISOString()}`,
          label: formatShortDate(start),
          start,
          end: endOfWeek(start),
          bookings: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || currentWeekStart;
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfWeek(currentWeekStart);
      previousWindowStart = startOfWeek(shiftDays(currentWindowStart, -56));
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 8 weeks";
    } else if (bookingRange === "month") {
      buckets = Array.from({ length: 6 }, (_, index) => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() + index - 5, 1);
        return {
          key: `month-${start.getFullYear()}-${start.getMonth()}`,
          label: MONTH_NAMES_SHORT[start.getMonth()],
          start,
          end: endOfMonth(start),
          bookings: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || startOfMonth(currentDate);
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfMonth(currentDate);
      previousWindowStart = new Date(
        currentWindowStart.getFullYear(),
        currentWindowStart.getMonth() - 6,
        1
      );
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 6 months";
    } else {
      buckets = Array.from({ length: 5 }, (_, index) => {
        const year = currentDate.getFullYear() + index - 4;
        return {
          key: `year-${year}`,
          label: String(year),
          start: startOfYear(new Date(year, 0, 1)),
          end: endOfYear(new Date(year, 0, 1)),
          bookings: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || startOfYear(currentDate);
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfYear(currentDate);
      previousWindowStart = new Date(currentWindowStart.getFullYear() - 5, 0, 1);
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 5 years";
    }

    scheduledBookings.forEach((booking) => {
      const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
      const bucket = buckets.find((item) => bookingDate >= item.start && bookingDate <= item.end);
      if (!bucket) return;
      bucket.bookings += 1;
    });

    const getWindowBookingCount = (start, end) =>
      scheduledBookings.filter((booking) => {
        const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
        return bookingDate >= start && bookingDate <= end;
      }).length;

    return {
      buckets,
      bookingCount: getWindowBookingCount(currentWindowStart, currentWindowEnd),
      bookingTrend: calculateTrendDelta(
        getWindowBookingCount(currentWindowStart, currentWindowEnd),
        getWindowBookingCount(previousWindowStart, previousWindowEnd)
      ),
      summaryLabel,
    };
  }, [allBookings, bookingRange]);

  const bookingRangeOptions = [
    { value: "week", label: "Weeks" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  return (
    <div className="flex min-h-full w-full flex-col bg-[#f8fafc] font-sans text-slate-800">
      <AvailabilityCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        bookings={allBookings || []}
      />

      <section className="relative overflow-hidden rounded-[34px] border border-[#d8e6f8] bg-[linear-gradient(135deg,#ffffff_0%,#fcfdff_44%,#eef6ff_100%)] p-4 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.18)] sm:p-5 xl:p-6">
        <div className="pointer-events-none absolute -left-12 top-10 h-44 w-44 rounded-full bg-[#dceeff] blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-10 translate-y-10 rounded-full bg-[#d8ebff] blur-3xl"></div>

        <div className="relative">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d7e5f6] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              {getGreeting()}, Staff
            </p>

            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
              <h1 className="text-[30px] font-black tracking-tight text-slate-900 sm:text-[2.1rem]">
                Overview
              </h1>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="inline-flex min-w-[240px] items-center justify-center gap-3 self-start rounded-full bg-[#3478f6] px-8 py-4 text-[13px] font-black uppercase tracking-[0.2em] text-white shadow-[0_22px_40px_-26px_rgba(52,120,246,0.95)] transition hover:bg-[#2563eb] hover:shadow-[0_26px_46px_-26px_rgba(37,99,235,0.95)]"
              >
                <CalendarDays size={18} />
                Check Availability
              </button>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-5 text-slate-500 sm:text-[14px]">
              Monitor reservation movement, pending actions, and live room usage without exposing
              finance or review metrics to staff.
            </p>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_300px]">
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <OverviewMetricCard
                  label="Rooms Booked"
                  value={formatCount(stats.roomsBooked30Days)}
                  trend={stats.roomsBookedTrend}
                  helper="Last 30 days"
                  icon={<BedDouble size={18} />}
                  tone="orange"
                />
                <OverviewMetricCard
                  label="Pending Action"
                  value={formatCount(stats.pendingRequests)}
                  helper={stats.pendingSummary}
                  icon={<AlertCircle size={18} />}
                  tone="blue"
                />
                <OverviewMetricCard
                  label="Live Occupancy"
                  value={`${stats.occupancyRate}%`}
                  trend={stats.occupancyTrend}
                  helper={`${stats.occupancy}/${stats.totalRooms || 0} rooms in use`}
                  icon={<Zap size={18} />}
                  tone="sky"
                />
              </div>

              <div className="rounded-[30px] border border-[#dce7f5] bg-white/95 p-4 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.18)] sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h2 className="text-[24px] font-black tracking-tight text-slate-900">
                      Booking Activity
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {bookingRangeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setBookingRange(option.value)}
                          className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                            bookingRange === option.value
                              ? "bg-[#3478f6] text-white shadow-[0_16px_30px_-22px_rgba(52,120,246,0.95)]"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="self-start xl:self-auto">
                    <div className="rounded-[22px] bg-[#f6faff] px-4 py-3 xl:text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Booking Activity
                      </p>
                      <p className="mt-1.5 text-[28px] font-black tracking-tight text-slate-900">
                        {formatCount(bookingActivity.bookingCount)}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 xl:justify-end">
                        <TrendBadge value={bookingActivity.bookingTrend} />
                        <span className="text-[10px] font-semibold text-slate-400">
                          {bookingActivity.summaryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500">
                  <ChartLegend label="Bookings" dotClassName="bg-[#3478f6]" />
                </div>

                <div className="mt-4">
                  <BookingTrendChart data={bookingActivity.buckets} />
                </div>
              </div>
            </div>

            <div className="flex">
              <div className="flex h-full w-full flex-col rounded-[30px] border border-[#dce7f5] bg-white p-4 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.18)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-black tracking-tight text-slate-900">
                      Upcoming Arrival
                    </h2>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                      Next scheduled guests and room assignments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/staff-bookings")}
                    className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    View all
                  </button>
                </div>

                <div
                  className={`mt-3 flex flex-1 flex-col ${
                    stats.upcomingArrivals.length >= 6 ? "justify-between" : "gap-2"
                  }`}
                >
                  {stats.upcomingArrivals.length > 0 ? (
                    stats.upcomingArrivals.map((booking) => (
                      <UpcomingArrivalRow
                        key={booking._id}
                        booking={booking}
                        backendUrl={backendUrl}
                        onOpen={() => navigate(`/staff-bookings?bookingId=${booking._id}`)}
                      />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-500">
                        No upcoming arrivals scheduled yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const OverviewMetricCard = ({ label, value, trend = null, helper, icon, tone = "orange" }) => {
  const tones = {
    orange: {
      card:
        "border-[#f5dcca] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] shadow-[0_24px_50px_-36px_rgba(255,138,61,0.45)]",
      icon: "border-[#ffd8bd] bg-white text-[#ff8a3d] shadow-[0_18px_30px_-24px_rgba(255,138,61,0.75)]",
      accent: "from-[#ffd1b0] via-[#ffb07a] to-[#ff8a3d]",
      glow: "bg-[#ffe9db]",
    },
    blue: {
      card:
        "border-[#d8e4ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] shadow-[0_24px_50px_-36px_rgba(52,120,246,0.32)]",
      icon: "border-[#cfddff] bg-white text-[#3478f6] shadow-[0_18px_30px_-24px_rgba(52,120,246,0.7)]",
      accent: "from-[#d6e4ff] via-[#83adff] to-[#3478f6]",
      glow: "bg-[#e5efff]",
    },
    sky: {
      card:
        "border-[#d7ecff] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbff_100%)] shadow-[0_24px_50px_-36px_rgba(91,184,255,0.34)]",
      icon: "border-[#cfe7ff] bg-white text-[#46a8ff] shadow-[0_18px_30px_-24px_rgba(91,184,255,0.72)]",
      accent: "from-[#d8f0ff] via-[#89d1ff] to-[#46a8ff]",
      glow: "bg-[#e4f5ff]",
    },
  };
  const activeTone = tones[tone] || tones.orange;

  return (
    <div className={`group relative h-full overflow-hidden rounded-[28px] border p-5 transition-all ${activeTone.card}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-80 blur-3xl ${activeTone.glow}`}></div>
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border ${activeTone.icon}`}
            >
              {icon}
            </div>
            <div className="min-w-0 pt-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">{helper}</p>
            </div>
          </div>
          {typeof trend === "number" && <TrendBadge value={trend} />}
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div
            className={`h-1.5 w-20 rounded-full bg-gradient-to-r shadow-[0_10px_20px_-16px_rgba(15,23,42,0.35)] ${activeTone.accent}`}
          ></div>
          <div className="shrink-0 text-right">
            <p className="text-[40px] font-black leading-none tracking-[-0.04em] text-slate-900">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TrendBadge = ({ value }) => {
  const numericValue = Number(value || 0);
  const isPositive = numericValue > 0;
  const isNegative = numericValue < 0;
  const toneClass = isPositive
    ? "border-emerald-100 bg-emerald-50/90 text-emerald-600"
    : isNegative
      ? "border-rose-100 bg-rose-50/90 text-rose-500"
      : "border-slate-200 bg-white/85 text-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur ${toneClass}`}
    >
      <BarChart3 size={11} className={isNegative ? "rotate-180" : ""} />
      {formatTrendDelta(numericValue)}
    </span>
  );
};

const ChartLegend = ({ label, dotClassName }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`}></span>
    {label}
  </span>
);

const BookingTrendChart = ({ data }) => {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-slate-500">No booking data available for this period.</p>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map((item) => item.bookings), 1);
  const buildSeries = (key) => {
    const points = chartData.map((item, index) => {
      const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
      const ratio = clampValue((Number(item[key]) || 0) / maxValue, 0, 1);
      const y = 58 - ratio * 50;
      return {
        key: `${item.key}-${key}`,
        x,
        y: clampValue(y, 4, 58),
      };
    });

    return {
      points,
      path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" "),
    };
  };

  const bookingSeries = buildSeries("bookings");
  const yAxisValues = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];

  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-4">
      <div className="flex h-[220px] flex-col justify-between text-[9px] font-bold text-slate-400">
        {yAxisValues.map((value, index) => (
          <span key={`${value}-${index}`}>{formatCount(Math.round(value))}</span>
        ))}
      </div>

      <div>
        <div className="relative h-[220px] overflow-hidden rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3 py-3 sm:px-4">
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full">
            {[0, 1, 2, 3, 4].map((index) => {
              const y = index * 15;
              return (
                <line
                  key={`grid-${index}`}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#d5e4f7"
                  strokeDasharray="1.8 1.8"
                  strokeWidth="0.45"
                />
              );
            })}

            <path
              d={bookingSeries.path}
              fill="none"
              stroke="#3478f6"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div
          className="mt-3 grid gap-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-400"
          style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))` }}
        >
          {chartData.map((item) => (
            <span key={item.key}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const UpcomingArrivalRow = ({ booking, backendUrl, onOpen }) => {
  const imageSrc = resolveMediaUrl(backendUrl, booking?.userId?.image);
  const guestName = getGuestName(booking);
  const bookingLabel = String(booking?.bookingName || "").trim() || "Reservation";
  const checkIn = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
  const checkOut = new Date(getBookingCheckOutDateValue(booking) || booking.createdAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[50px] w-full items-center gap-2.5 rounded-[16px] border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-[#cfe0f6] hover:bg-[#f8fbff]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {imageSrc ? (
          <img src={imageSrc} alt={guestName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[9px] font-black text-slate-500">
            {guestName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() || "")
              .join("") || "GU"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-black text-slate-900">{guestName}</p>
        <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-500">{bookingLabel}</p>
        <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {formatStayRange(checkIn, checkOut)}
        </p>
      </div>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:text-slate-700">
        <ChevronRight size={12} />
      </div>
    </button>
  );
};

export default StaffDashboard;
