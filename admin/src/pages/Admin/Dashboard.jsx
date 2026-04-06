import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import reportHero from "../../assets/report_hero.png?inline";
import reportLogo from "../../assets/logo.svg?inline";
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronRight,
  FileDown,
  MapPin,
  Printer,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import FilterDropdown from "../../components/Admin/FilterDropdown";

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
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const formatCurrency = (value) => `\u20B1${Number(value || 0).toLocaleString()}`;
const formatCount = (value) => Number(value || 0).toLocaleString();
const formatLongDate = (date) => LONG_DATE_FORMATTER.format(date);
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
const formatCompactCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}k`;
  }
  return amount.toLocaleString();
};
const getBookingLifecycleStatus = (booking) => String(booking?.status || "").trim().toLowerCase();
const getBookingReceivedRevenue = (booking) =>
  Math.max(
    Number(booking?.amountPaid || (booking?.payment === true ? booking?.totalPrice || booking?.amount : 0)) -
      Number(booking?.refundedAmount || 0),
    0
  ) || 0;
const isRevenueQualifiedBooking = (booking) => {
  return getBookingReceivedRevenue(booking) > 0;
};
const isScheduledBooking = (booking) => {
  const status = getBookingLifecycleStatus(booking);
  return booking?.downpaymentSatisfied === true || booking?.bookingSecured === true || booking?.paymentStatus === "paid" || status === "approved";
};
const getBookingIncomeRevenue = (booking) => getBookingReceivedRevenue(booking);
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
const getGuestInitials = (booking) =>
  getGuestName(booking)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MR";
const isNoShowBooking = (booking) =>
  Boolean(booking?.noShow) || String(booking?.stayStatus || "").trim().toLowerCase() === "noshow";
const formatStayRange = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "Schedule pending";
  return `${formatShortDate(checkIn)} - ${formatShortDate(checkOut)}`;
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
    backendUrl,
    allRooms,
    getAllRooms,
    allBookings,
    getAllBookings,
    getAllPackages,
  } = useContext(AdminContext);
  const navigate = useNavigate();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [revenueRange, setRevenueRange] = useState("month");
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
      getAllPackages();
    }
  }, [aToken]);

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
    const revenueBookings = bookings.filter(isRevenueQualifiedBooking);
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

    const pendingBookings = bookings.filter((booking) => booking.status === "pending");
    const pendingCancellations = bookings.filter((booking) => booking.status === "cancellation_pending");
    const roomsBooked30Days = revenueBookings
      .filter((booking) => {
        const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
        return bookingDate >= trailingThirtyDayStart && bookingDate <= todayEnd;
      })
      .reduce(
        (sum, booking) => sum + (Array.isArray(booking.bookingItems) ? booking.bookingItems.length : 0),
        0
      );
    const previousRoomsBooked30Days = revenueBookings
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

    return {
      occupancy: occupiedCount,
      totalRooms: rooms.length,
      occupancyRate,
      occupancyTrend: calculateTrendDelta(occupancyRate, yesterdayOccupancyRate),
      pendingRequests: pendingBookings.length + pendingCancellations.length,
      pendingSummary: `${pendingBookings.length} bookings, ${pendingCancellations.length} cancellations`,
      roomsBooked30Days,
      roomsBookedTrend: calculateTrendDelta(roomsBooked30Days, previousRoomsBooked30Days),
      upcomingArrivals,
    };
  }, [allBookings, allRooms]);

  const revenueChart = useMemo(() => {
    const currentDate = new Date();
    const revenueBookings = (allBookings || []).filter(isRevenueQualifiedBooking);
    let buckets = [];
    let currentWindowStart = null;
    let currentWindowEnd = null;
    let previousWindowStart = null;
    let previousWindowEnd = null;
    let summaryLabel = "";

    if (revenueRange === "day") {
      buckets = Array.from({ length: 7 }, (_, index) => {
        const start = startOfDay(shiftDays(currentDate, index - 6));
        return {
          key: `day-${start.toISOString()}`,
          label: WEEKDAY_FORMATTER.format(start),
          start,
          end: endOfDay(start),
          incomeRevenue: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || startOfDay(currentDate);
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfDay(currentDate);
      previousWindowStart = startOfDay(shiftDays(currentWindowStart, -7));
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 7 days";
    } else if (revenueRange === "week") {
      const currentWeekStart = startOfWeek(currentDate);
      buckets = Array.from({ length: 8 }, (_, index) => {
        const start = startOfWeek(shiftDays(currentWeekStart, (index - 7) * 7));
        return {
          key: `week-${start.toISOString()}`,
          label: formatShortDate(start),
          start,
          end: endOfWeek(start),
          incomeRevenue: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || currentWeekStart;
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfWeek(currentWeekStart);
      previousWindowStart = startOfWeek(shiftDays(currentWindowStart, -56));
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 8 weeks";
    } else if (revenueRange === "month") {
      buckets = Array.from({ length: 6 }, (_, index) => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() + index - 5, 1);
        return {
          key: `month-${start.getFullYear()}-${start.getMonth()}`,
          label: MONTH_NAMES_SHORT[start.getMonth()],
          start,
          end: endOfMonth(start),
          incomeRevenue: 0,
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
          incomeRevenue: 0,
        };
      });
      currentWindowStart = buckets[0]?.start || startOfYear(currentDate);
      currentWindowEnd = buckets[buckets.length - 1]?.end || endOfYear(currentDate);
      previousWindowStart = new Date(currentWindowStart.getFullYear() - 5, 0, 1);
      previousWindowEnd = endOfDay(shiftDays(currentWindowStart, -1));
      summaryLabel = "Last 5 years";
    }

    revenueBookings.forEach((booking) => {
      const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
      const bucket = buckets.find((item) => bookingDate >= item.start && bookingDate <= item.end);
      if (!bucket) return;

      bucket.incomeRevenue += getBookingIncomeRevenue(booking);
    });

    const getWindowRevenue = (start, end) =>
      revenueBookings
        .filter((booking) => {
          const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
          return bookingDate >= start && bookingDate <= end;
        })
        .reduce((sum, booking) => sum + getBookingIncomeRevenue(booking), 0);

    return {
      buckets,
      incomeRevenue: getWindowRevenue(currentWindowStart, currentWindowEnd),
      incomeRevenueTrend: calculateTrendDelta(
        getWindowRevenue(currentWindowStart, currentWindowEnd),
        getWindowRevenue(previousWindowStart, previousWindowEnd)
      ),
      summaryLabel,
    };
  }, [allBookings, revenueRange]);

  const revenueRangeOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Weeks" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  const availableYears = useMemo(() => {
    const years = new Set(
      (allBookings || [])
        .map((booking) => new Date(getBookingCheckInDateValue(booking) || booking.createdAt).getFullYear())
        .filter((year) => !Number.isNaN(year))
    );

    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allBookings]);
  const reportTypeOptions = [
    { value: "monthly", label: "Monthly Report", icon: CalendarDays },
    { value: "yearly", label: "Yearly Report", icon: BarChart3 },
  ];
  const reportMonthOptions = MONTH_NAMES.map((month, index) => ({
    value: index,
    label: month,
    icon: CalendarDays,
  }));
  const reportYearOptions = availableYears.map((year) => ({
    value: year,
    label: String(year),
    icon: BarChart3,
  }));

  const reportBookings = useMemo(() => {
    return (allBookings || []).filter((booking) => {
      const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);

      if (reportType === "monthly") {
        return bookingDate.getMonth() === reportMonth && bookingDate.getFullYear() === reportYear;
      }

      return bookingDate.getFullYear() === reportYear;
    });
  }, [allBookings, reportMonth, reportType, reportYear]);

  const reportStats = useMemo(() => {
    const filteredBookings = reportBookings;

    const totalIncome = filteredBookings
      .filter((booking) => getBookingIncomeRevenue(booking) > 0)
      .reduce((sum, booking) => sum + getBookingIncomeRevenue(booking), 0);

    const totalParticipants = filteredBookings.reduce((sum, booking) => {
      const roomGuests = Array.isArray(booking.bookingItems)
        ? booking.bookingItems.reduce((roomSum, item) => roomSum + Number(item?.roomGuests || 0), 0)
        : 0;
      const venueGuests = Number(booking.participants || 0);

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
    const dormitoryCount = rooms.filter((room) => (room.roomType || "").toLowerCase().includes("dorm")).length;
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
      (booking) => getBookingIncomeRevenue(booking) > 0
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
        const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
        if (bookingDate < start || bookingDate > end) return;
        const day = bookingDate.getDate();
        const bucket = buckets.find((b) => day >= b.start && day <= b.end);
        if (bucket) {
          bucket.revenue += getBookingIncomeRevenue(booking);
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
      const bookingDate = new Date(getBookingCheckInDateValue(booking) || booking.createdAt);
      if (bookingDate.getFullYear() !== reportYear) return;
      const bucket = months[bookingDate.getMonth()];
      if (bucket) {
        bucket.revenue += getBookingIncomeRevenue(booking);
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
                  <FilterDropdown
                    label="Report Type"
                    options={reportTypeOptions}
                    value={reportType}
                    onChange={setReportType}
                    icon={CalendarDays}
                    align="left"
                    neutralValue="monthly"
                    triggerClassName="w-full"
                    menuClassName="w-full min-w-[220px]"
                  />

                  {reportType === "monthly" && (
                    <FilterDropdown
                      label="Month"
                      options={reportMonthOptions}
                      value={reportMonth}
                      onChange={(value) => setReportMonth(Number(value))}
                      icon={CalendarDays}
                      align="left"
                      triggerClassName="w-full"
                      menuClassName="w-full min-w-[220px]"
                    />
                  )}

                  <div className={reportType === "monthly" ? "" : "sm:col-span-2"}>
                    <FilterDropdown
                      label="Year"
                      options={reportYearOptions}
                      value={reportYear}
                      onChange={(value) => setReportYear(Number(value))}
                      icon={BarChart3}
                      align="left"
                      triggerClassName="w-full"
                      menuClassName="w-full min-w-[220px]"
                    />
                  </div>
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
                    <span className="text-sm font-bold text-slate-500">Total Participants</span>
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

        <section className="relative overflow-hidden rounded-[34px] border border-[#d8e6f8] bg-[linear-gradient(135deg,#ffffff_0%,#fcfdff_44%,#eef6ff_100%)] p-4 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.18)] sm:p-5 xl:p-6">
          <div className="pointer-events-none absolute -left-12 top-10 h-44 w-44 rounded-full bg-[#dceeff] blur-3xl"></div>
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-10 translate-y-10 rounded-full bg-[#d8ebff] blur-3xl"></div>

          <div className="relative">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#d7e5f6] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                {getGreeting()}, Admin
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
                Whole data about your business here, from daily arrivals to booking activity and
                revenue movement across the property.
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
                      <h2 className="text-[24px] font-black tracking-tight text-slate-900">Income Revenue</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {revenueRangeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setRevenueRange(option.value)}
                            className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                              revenueRange === option.value
                                ? "bg-[#3478f6] text-white shadow-[0_16px_30px_-22px_rgba(52,120,246,0.95)]"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-[#f6faff] px-4 py-3 xl:text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Income Revenue
                      </p>
                      <p className="mt-1.5 text-[28px] font-black tracking-tight text-slate-900">
                        {formatCurrency(revenueChart.incomeRevenue)}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 xl:justify-end">
                        <TrendBadge value={revenueChart.incomeRevenueTrend} />
                        <span className="text-[10px] font-semibold text-slate-400">
                          {revenueChart.summaryLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500">
                    <ChartLegend label="Income Revenue" dotClassName="bg-[#3478f6]" />
                  </div>

                  <div className="mt-4">
                    <RevenueTrendChart data={revenueChart.buckets} />
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
                      onClick={() => navigate("/all-bookings")}
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
                          onOpen={() => navigate(`/all-bookings?bookingId=${booking._id}`)}
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
      <TrendingUp size={11} className={isNegative ? "rotate-180" : ""} />
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

const RevenueTrendChart = ({ data }) => {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-slate-500">No revenue data available for this period.</p>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map((item) => item.incomeRevenue), 1);
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

  const incomeSeries = buildSeries("incomeRevenue");
  const yAxisValues = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];

  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-4">
      <div className="flex h-[220px] flex-col justify-between text-[9px] font-bold text-slate-400">
        {yAxisValues.map((value, index) => (
          <span key={`${value}-${index}`}>{formatCompactCurrency(value)}</span>
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
              d={incomeSeries.path}
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
        <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-500">
          {bookingLabel}
        </p>
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

export default Dashboard;
