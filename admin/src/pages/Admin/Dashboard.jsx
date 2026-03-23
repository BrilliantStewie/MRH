import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import reportHero from "../../assets/report_hero.png?inline";
import reportLogo from "../../assets/logo.svg?inline";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  FileDown,
  MapPin,
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
const formatAmenity = (value = "") =>
  value
    .toString()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const Dashboard = () => {
  const {
    aToken,
    allRooms,
    getAllRooms,
    allBookings,
    getAllBookings,
    allUsers,
    getAllUsers,
    allPackages,
    getAllPackages,
  } = useContext(AdminContext);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reportType, setReportType] = useState("monthly");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const reportRef = useRef(null);

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

  const reportBookings = useMemo(() => {
    return (allBookings || []).filter((booking) => {
      const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);

      if (reportType === "monthly") {
        return bookingDate.getMonth() === reportMonth && bookingDate.getFullYear() === reportYear;
      }

      return bookingDate.getFullYear() === reportYear;
    });
  }, [allBookings, reportMonth, reportType, reportYear]);

  const reportStats = useMemo(() => {
    const filteredBookings = reportBookings;

    const totalIncome = filteredBookings
      .filter((booking) => booking.paymentStatus === "paid" || booking.status === "approved")
      .reduce((sum, booking) => sum + (Number(booking.total_price || booking.amount) || 0), 0);

    const totalParticipants = filteredBookings.reduce((sum, booking) => {
      const roomGuests = Array.isArray(booking.bookingItems)
        ? booking.bookingItems.reduce((roomSum, item) => roomSum + Number(item?.participants || 0), 0)
        : 0;
      const venueGuests = Number(booking.venueParticipants || 0);

      if (roomGuests === 0 && venueGuests === 0) {
        const legacyCount = Array.isArray(booking.participants)
          ? booking.participants.length
          : Number(booking.participants) || 0;
        return sum + legacyCount;
      }

      return sum + roomGuests + venueGuests;
    }, 0);

    const totalRoomsBooked = filteredBookings.reduce((sum, booking) => {
      if (Array.isArray(booking.bookingItems)) {
        return sum + booking.bookingItems.length;
      }
      return sum;
    }, 0);

    return {
      totalBookings: filteredBookings.length,
      totalIncome,
      totalParticipants,
      totalRoomsBooked,
      avgValue: filteredBookings.length > 0 ? Math.round(totalIncome / filteredBookings.length) : 0,
    };
  }, [reportBookings]);

  const reportStatusBreakdown = useMemo(() => {
    return reportBookings.reduce(
      (acc, booking) => {
        const status = (booking.status || "").toLowerCase();
        if (status === "approved") acc.approved += 1;
        else if (status === "pending" || status === "cancellation_pending") acc.pending += 1;
        else if (status === "declined") acc.declined += 1;
        else if (status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { approved: 0, pending: 0, declined: 0, cancelled: 0 }
    );
  }, [reportBookings]);

  const roomUtilization = useMemo(() => {
    const rooms = allRooms || [];
    const total = rooms.length || 1;
    const dormitoryCount = rooms.filter((room) => (room.roomType || room.room_type || "").toLowerCase().includes("dorm")).length;
    const nolascoCount = rooms.filter((room) => (room.building || "").toLowerCase().includes("nolasco")).length;
    const margaritaCount = rooms.filter((room) => (room.building || "").toLowerCase().includes("margarita")).length;
    const toPercent = (count) => Math.round((count / total) * 100);

    return [
      { label: "Dormitory", value: toPercent(dormitoryCount) },
      { label: "Nolasco Building", value: toPercent(nolascoCount) },
      { label: "Margarita Building", value: toPercent(margaritaCount) },
    ];
  }, [allRooms]);

  const commonAmenities = useMemo(() => {
    const counts = new Map();

    (allRooms || []).forEach((room) => {
      (room.amenities || []).forEach((amenity) => {
        const label = formatAmenity(amenity);
        if (!label) return;
        const key = label.toLowerCase();
        counts.set(key, { label, count: (counts.get(key)?.count || 0) + 1 });
      });
    });

    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 3).map((item) => item.label);

    return top.length
      ? top
      : ["Air-conditioned Rooms", "Free Wi-Fi", "Chapel Access"];
  }, [allRooms]);

  const reportTrendData = useMemo(() => {
    const filtered = reportBookings.filter(
      (booking) => booking.paymentStatus === "paid" || booking.status === "approved"
    );

    if (reportType === "monthly") {
      const start = new Date(reportYear, reportMonth, 1);
      const end = new Date(reportYear, reportMonth + 1, 0);
      const buckets = [
        { label: "Week 1", start: 1, end: 7, revenue: 0 },
        { label: "Week 2", start: 8, end: 14, revenue: 0 },
        { label: "Week 3", start: 15, end: 21, revenue: 0 },
        { label: "Week 4", start: 22, end: end.getDate(), revenue: 0 },
      ];

      filtered.forEach((booking) => {
        const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
        if (bookingDate < start || bookingDate > end) return;
        const day = bookingDate.getDate();
        const bucket = buckets.find((b) => day >= b.start && day <= b.end);
        if (bucket) {
          bucket.revenue += Number(booking.total_price || booking.amount) || 0;
        }
      });

      return buckets;
    }

    const months = MONTH_NAMES_SHORT.map((label, index) => ({
      label,
      month: index,
      revenue: 0,
    }));

    filtered.forEach((booking) => {
      const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
      if (bookingDate.getFullYear() !== reportYear) return;
      const bucket = months[bookingDate.getMonth()];
      if (bucket) {
        bucket.revenue += Number(booking.total_price || booking.amount) || 0;
      }
    });

    return months;
  }, [reportBookings, reportMonth, reportType, reportYear]);

  const reportTrendLine = useMemo(() => {
    if (!reportTrendData.length) {
      return { path: "", points: [] };
    }

    const maxRevenue = Math.max(...reportTrendData.map((item) => item.revenue), 1);
    const points = reportTrendData.map((item, index) => {
      const x = reportTrendData.length === 1 ? 50 : (index / (reportTrendData.length - 1)) * 100;
      const height = Math.max(Math.round((item.revenue / maxRevenue) * 70), 8);
      const y = 100 - height;
      return {
        x,
        y,
        label: item.label,
        value: item.revenue,
        key: `${item.label}-${index}`,
      };
    });

    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");
    return { path, points };
  }, [reportTrendData]);

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
  const reportTitle = reportType === "monthly" ? "Monthly Report" : "Annual Report";

  const reportRange = `${formatLongDate(reportWindow.start)} to ${formatLongDate(reportWindow.end)}`;
  const generatedOn = formatLongDate(new Date());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const waitForReportImages = async () => {
    if (!reportRef.current) return;
    const images = Array.from(reportRef.current.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth !== 0) {
              resolve();
              return;
            }
            const onDone = () => {
              img.removeEventListener("load", onDone);
              img.removeEventListener("error", onDone);
              resolve();
            };
            img.addEventListener("load", onDone);
            img.addEventListener("error", onDone);
          })
      )
    );
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || isDownloading) return;
    setIsDownloading(true);
    setIsReportVisible(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await waitForReportImages();

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const safeLabel = reportLabel.replace(/\s+/g, "_");
      pdf.save(`MRH_Report_${safeLabel}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsReportVisible(false);
      setIsDownloading(false);
    }
  };

  const handlePrintReport = async () => {
    if (!reportRef.current || isPrinting) return;
    setIsPrinting(true);
    setIsReportVisible(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await waitForReportImages();
      const onAfterPrint = () => {
        window.removeEventListener("afterprint", onAfterPrint);
        setIsReportVisible(false);
        setIsPrinting(false);
      };
      window.addEventListener("afterprint", onAfterPrint);
      window.print();
    } finally {
      // no-op: handled in onAfterPrint
    }
  };

  return (
    <div className="bg-[#f8fafc] font-sans text-slate-800 print:bg-white print:p-0">
      <div
        ref={reportRef}
        className={`print:static print:z-auto print:block print:w-full print:bg-white print:text-slate-900 print:opacity-100 ${
          isReportVisible
            ? "pointer-events-none absolute left-0 top-0 z-10 block bg-white text-slate-900 opacity-100"
            : "hidden"
        }`}
      >
        <div className="print-sheet report-sheet flex flex-col gap-4 bg-white px-[12mm] py-[12mm] text-[#3f2a4e]">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <img
              src={reportHero}
              alt="Mercedarian Retreat House"
              crossOrigin="anonymous"
              loading="eager"
              decoding="sync"
              className="h-[190px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-white/10"></div>
            <div className="absolute inset-0 z-10 flex items-start justify-between gap-6 px-8 pt-7">
              <div className="max-w-[65%]">
                <p className="text-[56px] font-extrabold leading-none text-[#4a2b5f] tracking-tight">
                  MRH
                </p>
                <p className="mt-1 text-[22px] font-semibold text-[#5a3a6b]">{reportTitle}</p>
                <p className="mt-3 text-[12px] font-semibold text-[#5a3a6b]">
                  Mercedarian Retreat House (MRH)
                </p>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-[#5a3a6b]">
                  <MapPin size={14} />
                  <span>Sitio Union, Dauis, Bohol</span>
                </div>
              </div>
              <img
                src={reportLogo}
                alt="MRH Logo"
                crossOrigin="anonymous"
                loading="eager"
                className="h-16 w-auto object-contain opacity-90"
              />
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-[18px] font-bold text-[#4a2b5f]">Overview</h2>
            <p className="mt-2 text-[11px] leading-6 text-[#5f4b73]" style={{ textAlign: "justify" }}>
              The Mercedarian Retreat House (MRH) continues to serve as a center for spiritual renewal,
              reflection, and community formation. This {reportLabel.toLowerCase()} report highlights
              booking activity, guest participation, and operational performance to guide decisions and
              improve service delivery.
            </p>
          </div>

          <div className="grid grid-cols-[1.35fr_0.85fr] gap-4">
            <div className="space-y-4">
              <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#4a2b5f]">Booking &amp; Sales Performance</h3>
                <div className="mt-3 rounded-[14px] bg-[#f4eef8] p-3">
                  <svg viewBox="0 0 100 100" className="h-[80px] w-full">
                    <path d={reportTrendLine.path} fill="none" stroke="#8d61b5" strokeWidth="1.4" />
                    {reportTrendLine.points.map((point) => (
                      <circle key={point.key} cx={point.x} cy={point.y} r="2.6" fill="#8d61b5" />
                    ))}
                  </svg>
                  <div className="mt-2 flex justify-between text-[9px] font-semibold text-[#6b5a7a]">
                    {reportTrendLine.points.map((point) => (
                      <span key={point.key}>{point.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#4a2b5f]">Room Utilization</h3>
                <div className="mt-3 space-y-2 text-[11px] text-[#5f4b73]">
                  {roomUtilization.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#b58ad3]"></span>
                        {item.label} ({item.value}%)
                      </span>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#4a2b5f]">Common Amenities Used</h3>
                <ul className="mt-3 space-y-2 text-[11px] text-[#5f4b73]">
                  {commonAmenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#8d61b5]"></span>
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#4a2b5f]">Booking Status</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-[#5f4b73]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                    Approved {reportStatusBreakdown.approved}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                    Cancelled {reportStatusBreakdown.cancelled}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-100 bg-white p-4 text-[11px] text-[#5f4b73] shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold">Report Month</span>
                  <span className="font-semibold text-[#4a2b5f]">{reportLabel}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold">Coverage</span>
                  <span className="text-right font-semibold text-[#4a2b5f]">{reportRange}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold">Generated on</span>
                  <span className="font-semibold text-[#4a2b5f]">{generatedOn}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto rounded-[14px] border border-slate-100 bg-white px-4 py-2 text-[10px] font-semibold text-[#6b5a7a]">
            Generated by: MRH Web-Based Booking and Management System
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
                      Rooms Booked
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {Number(reportStats.totalRoomsBooked || 0).toLocaleString()}
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
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <FileDown size={16} /> {isDownloading ? "Generating..." : "Download Report"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    disabled={isPrinting}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Printer size={16} /> {isPrinting ? "Preparing..." : "Print"}
                    </span>
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
