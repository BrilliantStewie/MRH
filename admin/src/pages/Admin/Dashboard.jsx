import { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bell,
  CalendarDays,
  FileDown,
  Printer,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const formatCurrency = (value) => `\u20B1${Number(value || 0).toLocaleString()}`;
const formatLongDate = (date) => LONG_DATE_FORMATTER.format(date);
const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const Dashboard = () => {
  const {
    aToken,
    allRooms,
    getAllRooms,
    allBookings,
    getAllBookings,
    allUsers,
    getAllUsers,
    getAllPackages,
  } = useContext(AdminContext);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reportType, setReportType] = useState("monthly");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (aToken) {
      getAllRooms();
      getAllBookings();
      getAllUsers();
      getAllPackages();
    }
  }, [aToken]);

  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];
    const currentDate = new Date();
    const today = normalizeDate(currentDate);

    const yearlyRevenue = bookings
      .filter((booking) => {
        if (booking.paymentStatus !== "paid" && booking.status !== "approved") return false;
        const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
        return bookingDate.getFullYear() === currentDate.getFullYear();
      })
      .reduce((sum, booking) => sum + (Number(booking.total_price || booking.amount) || 0), 0);

    const monthlyIncome = bookings
      .filter((booking) => {
        if (booking.paymentStatus !== "paid" && booking.status !== "approved") return false;
        const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
        return (
          bookingDate.getMonth() === currentDate.getMonth() &&
          bookingDate.getFullYear() === currentDate.getFullYear()
        );
      })
      .reduce((sum, booking) => sum + (Number(booking.total_price || booking.amount) || 0), 0);

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

    const pendingBookings = bookings.filter((booking) => booking.status === "pending");
    const pendingCancellations = bookings.filter((booking) => booking.status === "cancellation_pending");

    return {
      revenue: yearlyRevenue,
      monthlyIncome,
      totalUsers: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: rooms.length,
      occupancyRate,
      pendingRequests: pendingBookings.length + pendingCancellations.length,
      pendingBookings: pendingBookings.length,
      pendingCancellations: pendingCancellations.length,
    };
  }, [allBookings, allRooms, allUsers]);

  const chartData = useMemo(() => {
    const months = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        label: MONTH_NAMES_SHORT[targetMonth.getMonth()],
        month: targetMonth.getMonth(),
        year: targetMonth.getFullYear(),
        revenue: 0,
      });
    }

    (allBookings || []).forEach((booking) => {
      if (booking.paymentStatus === "paid" || booking.status === "approved") {
        const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
        const monthBucket = months.find(
          (month) => month.month === bookingDate.getMonth() && month.year === bookingDate.getFullYear()
        );

        if (monthBucket) {
          monthBucket.revenue += Number(booking.total_price || booking.amount) || 0;
        }
      }
    });

    const maxRevenue = Math.max(...months.map((month) => month.revenue), 1000);
    return months.map((month) => ({
      ...month,
      height: Math.round((month.revenue / maxRevenue) * 100),
    }));
  }, [allBookings]);

  const availableYears = useMemo(() => {
    const years = new Set(
      (allBookings || [])
        .map((booking) => new Date(booking.check_in || booking.date || booking.createdAt).getFullYear())
        .filter((year) => !Number.isNaN(year))
    );

    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allBookings]);

  const reportStats = useMemo(() => {
    const filteredBookings = (allBookings || []).filter((booking) => {
      const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);

      if (reportType === "monthly") {
        return bookingDate.getMonth() === reportMonth && bookingDate.getFullYear() === reportYear;
      }

      return bookingDate.getFullYear() === reportYear;
    });

    const totalIncome = filteredBookings
      .filter((booking) => booking.paymentStatus === "paid" || booking.status === "approved")
      .reduce((sum, booking) => sum + (Number(booking.total_price || booking.amount) || 0), 0);

    const totalParticipants = filteredBookings.reduce((sum, booking) => {
      const count = Array.isArray(booking.participants)
        ? booking.participants.length
        : Number(booking.participants) || 0;
      return sum + count;
    }, 0);

    return {
      totalBookings: filteredBookings.length,
      totalIncome,
      totalParticipants,
      avgValue: filteredBookings.length > 0 ? Math.round(totalIncome / filteredBookings.length) : 0,
    };
  }, [allBookings, reportMonth, reportType, reportYear]);

  const trendInsight = useMemo(() => {
    if (!chartData.length) {
      return {
        peakLabel: "N/A",
        peakRevenue: 0,
        averageRevenue: 0,
      };
    }

    const peakMonth = chartData.reduce((peak, month) => (month.revenue > peak.revenue ? month : peak), chartData[0]);
    const totalRevenue = chartData.reduce((sum, month) => sum + month.revenue, 0);

    return {
      peakLabel: peakMonth.label,
      peakRevenue: peakMonth.revenue,
      averageRevenue: Math.round(totalRevenue / chartData.length),
    };
  }, [chartData]);

  const reportWindow = useMemo(() => {
    if (reportType === "monthly") {
      return {
        start: new Date(reportYear, reportMonth, 1),
        end: new Date(reportYear, reportMonth + 1, 0),
      };
    }

    return {
      start: new Date(reportYear, 0, 1),
      end: new Date(reportYear, 11, 31),
    };
  }, [reportMonth, reportType, reportYear]);

  const reportLabel =
    reportType === "monthly" ? `${MONTH_NAMES[reportMonth]} ${reportYear}` : `Annual ${reportYear}`;

  const reportRange = `${formatLongDate(reportWindow.start)} to ${formatLongDate(reportWindow.end)}`;
  const reportDescriptor =
    reportType === "monthly" ? "Monthly operating digest" : "Annual operating digest";
  const revenuePerGuest =
    reportStats.totalParticipants > 0 ? Math.round(reportStats.totalIncome / reportStats.totalParticipants) : 0;
  const generatedOn = formatLongDate(new Date());
  const auditId = `VPMS-${reportYear}-${reportType === "monthly" ? String(reportMonth + 1).padStart(2, "0") : "YR"}-${String(reportStats.totalBookings).padStart(3, "0")}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-800 md:p-8 print:bg-white print:p-0">
      <div className="hidden bg-white text-slate-900 print:block">
        <div className="print-sheet flex flex-col gap-6 px-[14mm] py-[15mm]">
          <div className="grid grid-cols-[1.45fr_0.85fr] gap-4">
            <div className="rounded-[30px] border-2 border-slate-950 px-8 py-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                    Mercedarian Retreat House
                  </p>
                  <h1 className="mt-5 text-[30px] font-black uppercase leading-none tracking-[-0.08em] text-slate-950">
                    Trend
                    <br />
                    Overview
                  </h1>
                  <p className="mt-4 max-w-md text-[12px] leading-6 text-slate-600">
                    Six-month booking revenue trend used as the lead visual for this {reportDescriptor.toLowerCase()}.
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-950 text-white">
                  <Zap size={24} />
                </div>
              </div>

              <div className="mt-8 rounded-[24px] bg-slate-50 px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Last Six Months
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="inline-flex h-2.5 w-2.5 rounded-sm bg-blue-600"></span>
                      <span>Monthly revenue bar indicator</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Peak Month
                    </p>
                    <p className="mt-1 text-sm font-black text-blue-700">
                      {trendInsight.peakLabel} {formatCurrency(trendInsight.peakRevenue)}
                    </p>
                  </div>
                </div>

                <div className="relative h-[180px]">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="border-t border-dashed border-slate-200"></div>
                    ))}
                  </div>

                  <div className="relative z-10 flex h-full items-end justify-between gap-3 pt-4">
                    {chartData.map((month) => (
                      <div key={`${month.year}-${month.month}`} className="flex h-full flex-1 flex-col items-center justify-end">
                        <div className="mb-2 text-[10px] font-bold text-slate-500">
                          {month.revenue > 0 ? formatCurrency(month.revenue) : "0"}
                        </div>
                        <div
                          className="relative w-full max-w-[50px] rounded-t-[14px] bg-blue-600"
                          style={{ height: month.revenue > 0 ? `${Math.max(month.height, 10)}%` : "6px" }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-[14px] bg-blue-300/40"></div>
                        </div>
                        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          {month.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Period
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{reportLabel}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Avg. Monthly
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {formatCurrency(trendInsight.averageRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Generated
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{generatedOn}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-slate-50 px-6 py-7">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                Executive Signal
              </p>
              <p className="mt-4 text-4xl font-black leading-none tracking-[-0.08em] text-slate-950">
                {formatCurrency(reportStats.totalIncome)}
              </p>
              <p className="mt-3 text-[12px] leading-6 text-slate-600">
                Confirmed revenue captured from {reportStats.totalBookings} bookings between{" "}
                {formatLongDate(reportWindow.start)} and {formatLongDate(reportWindow.end)}.
              </p>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-500">Average booking value</span>
                  <span className="font-black text-slate-900">{formatCurrency(reportStats.avgValue)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-500">Current occupancy</span>
                  <span className="font-black text-slate-900">{stats.occupancyRate}%</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-500">Pending actions</span>
                  <span className="font-black text-slate-900">{stats.pendingRequests}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                Summary
              </p>
              <p className="mt-3 text-[12px] leading-7 text-slate-700">
                The property generated {formatCurrency(reportStats.totalIncome)} from{" "}
                {reportStats.totalBookings} confirmed bookings during {reportLabel}. Average booking
                value closed at {formatCurrency(reportStats.avgValue)}, with the strongest recent month
                recorded in <span className="font-black text-blue-700">{trendInsight.peakLabel}</span>.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                Report Meta
              </p>
              <div className="mt-4 space-y-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Period</span>
                  <span className="font-black text-slate-900">{reportLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Coverage</span>
                  <span className="text-right font-black text-slate-900">{reportRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Generated</span>
                  <span className="font-black text-slate-900">{generatedOn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Audit ID</span>
                  <span className="font-black text-slate-900">{auditId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
            <p>Official internal performance statement</p>
            <p>{"\u00A9"} Vantage Systems 2024</p>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <AvailabilityCalendar
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          bookings={allBookings || []}
        />

        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/50 px-8 py-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">Performance Report</h2>
                  <p className="text-xs font-medium text-slate-500">Analytics for {reportLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  <select
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-indigo-400"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>

                  {reportType === "monthly" && (
                    <select
                      value={reportMonth}
                      onChange={(event) => setReportMonth(Number(event.target.value))}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-indigo-400"
                    >
                      {MONTH_NAMES.map((month, index) => (
                        <option key={month} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={reportYear}
                    onChange={(event) => setReportYear(Number(event.target.value))}
                    className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-indigo-400 ${
                      reportType === "monthly" ? "" : "sm:col-span-2"
                    }`}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-indigo-500">
                      Total Revenue
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {formatCurrency(reportStats.totalIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      Avg. Per Booking
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {formatCurrency(reportStats.avgValue)}
                    </p>
                  </div>
                </div>

                <div className="mb-8 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-50 py-2">
                    <span className="text-sm font-bold text-slate-500">Confirmed Bookings</span>
                    <span className="text-sm font-black text-slate-900">{reportStats.totalBookings}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 py-2">
                    <span className="text-sm font-bold text-slate-500">Guest Count</span>
                    <span className="text-sm font-black text-slate-900">
                      {reportStats.totalParticipants}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
                  >
                    <Printer size={16} /> Print PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{getGreeting()}, Admin</h1>
            <p className="mt-1 font-medium text-slate-500">Property Overview & Real-time Analytics</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95"
            >
              <FileDown size={18} /> Generate Report
            </button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Yearly Revenue"
            value={formatCurrency(stats.revenue)}
            icon={<Wallet size={20} />}
            color="slate"
            subValue={`For ${new Date().getFullYear()}`}
          />
          <StatCard
            label="Monthly Income"
            value={formatCurrency(stats.monthlyIncome)}
            icon={<TrendingUp size={20} />}
            color="emerald"
            subValue={`For ${MONTH_NAMES[new Date().getMonth()]}`}
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
                    <BarChart3 size={18} className="text-emerald-500" /> Income Overview
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Gross revenue over the last 6 months
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
                      {formatCurrency(data.revenue)}
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
                <h3 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Availability Map</h3>
                <p className="mb-8 max-w-[90%] text-sm font-medium leading-relaxed text-slate-500">
                  Visually track room occupancies, manage upcoming reservations, and block out dates
                  across all properties instantly.
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
      <div className="relative z-10 flex items-start justify-between">
        <div className={`rounded-[14px] border p-2.5 transition-transform duration-300 group-hover:scale-110 ${activeTheme}`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <h3 className="truncate text-2xl font-black tracking-tight text-slate-900">{value}</h3>
        <p className="mt-1 truncate text-[10px] font-bold text-slate-400">{subValue}</p>
      </div>
    </div>
  );
};

export default Dashboard;
