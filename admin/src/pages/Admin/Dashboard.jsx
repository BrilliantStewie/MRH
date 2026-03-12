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

const formatCurrency = (value) => `\u20B1${Number(value || 0).toLocaleString()}`;

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

    const occupiedCount = rooms.filter((room) => room.available === false).length;
    const totalRooms = rooms.length || 1;
    const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

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

  const reportLabel =
    reportType === "monthly" ? `${MONTH_NAMES[reportMonth]} ${reportYear}` : `Annual ${reportYear}`;

  const reportRange =
    reportType === "monthly"
      ? `${MONTH_NAMES[reportMonth]} 1, ${reportYear} and ${MONTH_NAMES[reportMonth]} ${new Date(
          reportYear,
          reportMonth + 1,
          0
        ).getDate()}, ${reportYear}`
      : `January 1, ${reportYear} and December 31, ${reportYear}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-800 md:p-8 print:bg-white print:p-0">
      <div className="hidden min-h-screen w-full flex-col bg-white p-20 font-serif text-slate-800 print:flex">
        <div className="mb-16 flex items-center justify-between border-b-4 border-slate-900 pb-10">
          <div>
            <p className="text-5xl font-extrabold uppercase tracking-tighter text-slate-950">
              FINANCIAL <br /> STATEMENT
            </p>
            <p className="mt-2 text-sm font-bold text-slate-600">VANTAGE PROPERTY MANAGEMENT SYSTEMS</p>
          </div>
          <div className="flex flex-col items-end text-right">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white">
              <Zap size={30} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Range</p>
            <p className="text-2xl font-bold text-slate-900">{reportLabel}</p>
          </div>
        </div>

        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Executive Summary
        </p>
        <div className="mb-16 rounded-2xl border border-slate-100 bg-slate-100/50 p-10">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Confirmed Gross Revenue
          </p>
          <h1 className="mb-4 text-7xl font-black tracking-tighter text-slate-900">
            {formatCurrency(reportStats.totalIncome)}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600">
            This audit statement reflects performance metrics collected between {reportRange}. Data
            includes fully processed and approved transactions.
          </p>
        </div>

        <table className="w-full text-slate-800">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-5 text-left text-xs font-bold uppercase tracking-wider">
                Accounting Category
              </th>
              <th className="py-5 text-right text-xs font-bold uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-5 text-base font-medium">Total Transactions Processed</td>
              <td className="py-5 text-right text-lg font-bold">{reportStats.totalBookings} Bookings</td>
            </tr>
            <tr>
              <td className="py-5 text-base font-medium">Guest Capacity Handled</td>
              <td className="py-5 text-right text-lg font-bold">{reportStats.totalParticipants} Pax</td>
            </tr>
            <tr>
              <td className="py-5 text-base font-medium">Avg. System Revenue Per Booking</td>
              <td className="py-5 text-right text-lg font-bold">{formatCurrency(reportStats.avgValue)}</td>
            </tr>
            <tr>
              <td className="py-5 text-base font-medium">Taxes and Processing Fees</td>
              <td className="py-5 text-right text-lg font-bold">Calculated Separately</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-auto flex justify-between border-t border-slate-100 pt-10 text-center text-slate-400">
          <p className="text-[10px] font-bold uppercase tracking-widest">{"\u00A9"} Vantage Systems 2024</p>
          <p className="text-[10px] font-bold uppercase tracking-widest">Audit ID: {Date.now()}</p>
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

            <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-bold tracking-widest text-emerald-700">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div> LIVE
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-50 focus:outline-none"
              >
                <Bell size={20} className={stats.pendingRequests > 0 ? "text-slate-800" : ""} />
                {stats.pendingRequests > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-bounce rounded-full border-2 border-white bg-rose-500"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Action Center
                    </span>
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                      {stats.pendingRequests} New
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {stats.pendingRequests === 0 ? (
                      <div className="p-4 text-center text-sm font-medium text-slate-400">
                        All caught up! No actions required.
                      </div>
                    ) : (
                      <>
                        {stats.pendingBookings > 0 && (
                          <div className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                              <CalendarDays size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Pending Bookings</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                You have {stats.pendingBookings} bookings awaiting approval.
                              </p>
                            </div>
                          </div>
                        )}
                        {stats.pendingCancellations > 0 && (
                          <div className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50">
                            <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
                              <AlertCircle size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Cancellation Requests</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {stats.pendingCancellations} guests requested to cancel.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                  <span>Open Master Calendar</span>
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
