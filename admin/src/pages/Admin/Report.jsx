import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BedDouble,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Download,
  FileText,
  Loader2,
  MapPin,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import reportHero from "../../assets/report_hero.png?inline";
import reportLogo from "../../assets/logo.svg?inline";
import FilterDropdown from "../../components/Admin/FilterDropdown";
import { AdminContext } from "../../context/AdminContext";

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
const REPORT_TYPE_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Annual", value: "annual" },
];
const REPORT_MONTH_OPTIONS = MONTH_NAMES.map((month, index) => ({
  label: month,
  value: index,
}));
const REPORT_MONTH_GRID_OPTION_LIST_CLASSNAME =
  "grid grid-cols-2 gap-1 !max-h-none !overflow-visible !pr-0 !space-y-0";
const BOOKING_BAR_COLOR = "#3466dd";
const INCOME_BAR_COLOR = "#12b981";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MANILA_START_HOUR_UTC = -8;
const MANILA_END_HOUR_UTC = 15;

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const createManilaBoundary = ({ year, monthIndex, day, endOfDay = false }) =>
  new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
      endOfDay ? MANILA_END_HOUR_UTC : MANILA_START_HOUR_UTC,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
  );

const getManilaDateParts = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return null;

  const manilaDate = new Date(parsed.getTime() + MANILA_OFFSET_MS);

  return {
    year: manilaDate.getUTCFullYear(),
    monthIndex: manilaDate.getUTCMonth(),
    day: manilaDate.getUTCDate(),
  };
};

const formatCurrency = (value) =>
  `₱ ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatExactNumber = (value) => {
  const numericValue = Number(value || 0);

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const formatExactCurrency = (value) => `₱ ${formatExactNumber(value)}`;

const formatCompactValue = (value) => {
  const numericValue = Number(value || 0);
  if (numericValue >= 1000000) return `${(numericValue / 1000000).toFixed(1)}M`;
  if (numericValue >= 1000) return `${(numericValue / 1000).toFixed(1)}K`;
  return numericValue.toLocaleString();
};

const formatGeneratedTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not generated yet" : LONG_DATE_FORMATTER.format(parsed);
};

const formatCoverageRange = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";

  const startMonth = SHORT_MONTH_FORMATTER.format(startDate);
  const endMonth = SHORT_MONTH_FORMATTER.format(endDate);
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear && startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear}-${endMonth} ${endDay}, ${endYear}`;
};

const formatAxisValue = (value, chartMode) => {
  if (chartMode === "income") return formatCompactValue(value);
  if (Number.isInteger(value)) return String(value);
  return Number(value || 0).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

const getBookingDate = (booking) => {
  const rawValue = booking?.checkIn;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getBookingAmount = (booking) => Number(booking?.totalPrice || 0);

const getBookingRooms = (booking) =>
  Array.isArray(booking?.bookingItems) ? booking.bookingItems : [];

const getBookingParticipants = (booking) => {
  const roomGuests = getBookingRooms(booking).reduce(
    (sum, item) => sum + Number(item?.participants || 0),
    0
  );
  const venueGuests = Number(booking?.venueParticipants || 0);

  return roomGuests + venueGuests;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const isPaidBooking = (booking) =>
  booking?.payment === true || normalizeStatus(booking?.paymentStatus) === "paid";

const getPaymentMethod = (booking) =>
  String(booking?.paymentMethod || "").trim().toLowerCase();

const getReportWindow = (reportType, reportMonth, reportYear) => {
  if (reportType === "monthly") {
    const lastDay = new Date(reportYear, reportMonth + 1, 0).getDate();

    return {
      start: createManilaBoundary({
        year: reportYear,
        monthIndex: reportMonth,
        day: 1,
      }),
      end: createManilaBoundary({
        year: reportYear,
        monthIndex: reportMonth,
        day: lastDay,
        endOfDay: true,
      }),
    };
  }

  return {
    start: createManilaBoundary({
      year: reportYear,
      monthIndex: 0,
      day: 1,
    }),
    end: createManilaBoundary({
      year: reportYear,
      monthIndex: 11,
      day: 31,
      endOfDay: true,
    }),
  };
};

const filterBookingsByReport = (bookings, reportType, reportMonth, reportYear) =>
  {
    const reportWindow = getReportWindow(reportType, reportMonth, reportYear);

    return bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      if (!bookingDate) return false;
      return bookingDate >= reportWindow.start && bookingDate <= reportWindow.end;
    });
  };

const summarizePeriodBookings = (bookings) =>
  bookings.reduce(
    (accumulator, booking) => {
      const amount = getBookingAmount(booking);

      accumulator.totalBookings += 1;
      accumulator.totalParticipants += getBookingParticipants(booking);
      accumulator.totalRoomsBooked += getBookingRooms(booking).length;
      if (isPaidBooking(booking)) {
        accumulator.totalIncome += amount;
      }

      if (getPaymentMethod(booking) === "cash") {
        accumulator.cashCount += 1;
      }

      if (getPaymentMethod(booking) === "gcash") {
        accumulator.gcashCount += 1;
      }

      return accumulator;
    },
    {
      totalBookings: 0,
      totalParticipants: 0,
      totalRoomsBooked: 0,
      totalIncome: 0,
      cashCount: 0,
      gcashCount: 0,
    }
  );

const buildMonthlyWeekBuckets = (bookings, reportMonth, reportYear) => {
  const daysInMonth = new Date(reportYear, reportMonth + 1, 0).getDate();
  const bucketCount = Math.ceil(daysInMonth / 7);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `W${index + 1}`,
    bookings: 0,
    income: 0,
  }));

  bookings.forEach((booking) => {
    const bookingDate = getBookingDate(booking);
    const manilaParts = getManilaDateParts(bookingDate);
    if (!manilaParts) return;
    if (manilaParts.year !== reportYear || manilaParts.monthIndex !== reportMonth) return;

    const bucketIndex = Math.floor((manilaParts.day - 1) / 7);
    const bucket = buckets[bucketIndex];
    if (!bucket) return;

    bucket.bookings += 1;
    if (isPaidBooking(booking)) {
      bucket.income += getBookingAmount(booking);
    }
  });

  return {
    labels: buckets.map((entry) => entry.label),
    bookingSeries: buckets.map((entry) => entry.bookings),
    incomeSeries: buckets.map((entry) => entry.income),
  };
};

const buildAnnualMonthBuckets = (bookings, reportYear) => {
  const buckets = MONTH_NAMES_SHORT.map((label, monthIndex) => ({
    label,
    monthIndex,
    bookings: 0,
    income: 0,
  }));

  bookings.forEach((booking) => {
    const bookingDate = getBookingDate(booking);
    const manilaParts = getManilaDateParts(bookingDate);
    if (!manilaParts) return;
    if (manilaParts.year !== reportYear) return;

    const bucket = buckets[manilaParts.monthIndex];
    if (!bucket) return;

    bucket.bookings += 1;
    if (isPaidBooking(booking)) {
      bucket.income += getBookingAmount(booking);
    }
  });

  return {
    labels: buckets.map((entry) => entry.label),
    bookingSeries: buckets.map((entry) => entry.bookings),
    incomeSeries: buckets.map((entry) => entry.income),
  };
};

const StatCard = ({ icon: Icon, label, value, detail, accent }) => {
  const accentClasses = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
  };

  return (
    <div className="group relative flex h-[132px] items-center gap-4 overflow-hidden rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-slate-200">
      <div
        className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border transition-transform duration-300 group-hover:scale-110 ${accentClasses[accent]}`}
      >
        <Icon size={18} />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="truncate text-2xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 truncate text-[10px] font-bold text-slate-400">{detail}</p>
      </div>
    </div>
  );
};

const SummaryMetric = ({ label, value, detail }) => (
  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-2 py-2">
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
    <p className="mt-1 text-[15px] font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{detail}</p>
  </div>
);

const ModalMonthSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!selectorRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={selectorRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className={`flex h-[32px] w-full items-center justify-between rounded-xl border px-2.5 text-left transition ${
          isOpen
            ? "border-indigo-300 bg-indigo-50/70 shadow-[0_10px_20px_-18px_rgba(79,70,229,0.55)]"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select report month"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
              isOpen ? "border-indigo-200 bg-white text-indigo-600" : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            <CalendarDays size={12} />
          </span>
          <span className="truncate text-[10px] font-black text-slate-800">{MONTH_NAMES[value] || "Select month"}</span>
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[248px] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Select Month</p>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">Choose the report coverage month.</p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-2">
            {REPORT_MONTH_OPTIONS.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-[10px] font-bold transition ${
                    isSelected
                      ? "bg-[#3466dd] text-white shadow-[0_12px_24px_-20px_rgba(52,102,221,0.95)]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={11} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PdfBreakdownTable = ({
  title,
  labels,
  bookingSeries,
  incomeSeries,
  detail,
  periodLabel,
  totalBookings,
  totalIncome,
}) => {
  const rows = (labels || []).map((label, index) => ({
    label,
    bookings: Number(bookingSeries?.[index] || 0),
    income: Number(incomeSeries?.[index] || 0),
  }));
  const hasData = rows.some((row) => row.bookings > 0 || row.income > 0);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-black tracking-tight text-slate-900">{title}</p>
          <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{detail}</p>
        </div>
        {!hasData && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
            No data
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                {periodLabel}
              </th>
              <th className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                Bookings
              </th>
              <th className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                Income
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${title}-${row.label}-${index}`}
                className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
              >
                <td className="border-t border-slate-200 px-3 py-2 text-[9px] font-bold text-slate-700">
                  {row.label}
                </td>
                <td className="border-t border-slate-200 px-3 py-2 text-right text-[9px] font-semibold text-slate-700">
                  {formatExactNumber(row.bookings)}
                </td>
                <td className="border-t border-slate-200 px-3 py-2 text-right text-[9px] font-semibold text-slate-700">
                  {formatExactCurrency(row.income)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100">
              <td className="border-t border-slate-300 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-900">
                Total
              </td>
              <td className="border-t border-slate-300 px-3 py-2 text-right text-[9px] font-black text-slate-900">
                {formatExactNumber(totalBookings)}
              </td>
              <td className="border-t border-slate-300 px-3 py-2 text-right text-[9px] font-black text-slate-900">
                {formatExactCurrency(totalIncome)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[9px] font-bold text-slate-600">
        {hasData ? "Exact values shown for each period." : "No values recorded for this period yet."}
      </div>
    </div>
  );
};

const PdfKeyValueTable = ({
  title,
  detail,
  labelHeader,
  valueHeader,
  rows,
}) => {
  const hasRows = (rows || []).length > 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-black tracking-tight text-slate-900">{title}</p>
          {detail ? (
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{detail}</p>
          ) : null}
        </div>
        {!hasRows && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
            No data
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                {labelHeader}
              </th>
              <th className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                {valueHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, index) => (
              <tr
                key={`${title}-${row.label}-${index}`}
                className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
              >
                <td className="border-t border-slate-200 px-3 py-2 text-[9px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    {row.color ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                    ) : null}
                    <span>{row.label}</span>
                  </div>
                </td>
                <td className="border-t border-slate-200 px-3 py-2 text-right text-[9px] font-semibold text-slate-800">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getChartTickValues = (maxValue) => {
  const safeMax = Math.max(Number(maxValue || 0), 1);
  return Array.from({ length: 5 }, (_, index) =>
    Number(((index / 4) * safeMax).toFixed(safeMax >= 10 ? 0 : 2))
  );
};

const ModalTrendChart = ({ title, data, color, axisMode, tooltipLabel }) => {
  const maxValue = Math.max(...data.map((entry) => Number(entry.value || 0)), 1);
  const tickValues = getChartTickValues(maxValue);
  const hasData = data.some((entry) => entry.value > 0);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black tracking-tight text-slate-900">{title}</p>
        {!hasData && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            No data
          </span>
        )}
      </div>

      <div className="mt-2" style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={data} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="#d9e5f4" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8a9fc0", fontSize: 9, fontWeight: 700 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={28}
              domain={[0, maxValue]}
              ticks={tickValues}
              tickFormatter={(value) => formatAxisValue(value, axisMode)}
              tick={{ fill: "#7d94bb", fontSize: 9, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(216,226,240,0.18)" }}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid #dbe4f0",
                boxShadow: "0 16px 32px -24px rgba(33,63,132,0.5)",
              }}
              formatter={(value) => [
                axisMode === "booking" ? formatCount(value) : formatCurrency(value),
                tooltipLabel,
              ]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={18} minPointSize={hasData ? 3 : 0}>
              {data.map((entry, index) => (
                <Cell key={`${title}-${entry.label}-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!hasData && (
        <p className="mt-1 text-center text-[9px] font-semibold text-[#93a5bf]">
          No data for this period yet.
        </p>
      )}
    </div>
  );
};

const getChartModeButtonStyles = (isActive, activeColor) =>
  isActive
    ? {
        backgroundColor: activeColor,
        borderColor: activeColor,
        color: "#ffffff",
        boxShadow:
          activeColor === "#3466dd"
            ? "0 12px 20px -16px rgba(52,102,221,0.55)"
            : "0 12px 20px -16px rgba(18,185,129,0.55)",
      }
    : {
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: "#1e3561",
        boxShadow: "none",
      };

const fetchReportData = async ({
  backendUrl,
  aToken,
  reportType,
  reportYear,
  reportMonth,
}) => {
  const params =
    reportType === "monthly"
      ? { reportType, periodYear: reportYear, periodMonth: reportMonth + 1 }
      : { reportType, periodYear: reportYear };

  const { data } = await axios.get(`${backendUrl}/api/report`, {
    headers: { token: aToken },
    params,
  });

  return data;
};

const Report = () => {
  const {
    aToken,
    backendUrl,
    allBookings,
    getAllBookings,
  } = useContext(AdminContext);

  const [reportType, setReportType] = useState("monthly");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [chartMode, setChartMode] = useState("booking");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExportVisible, setIsExportVisible] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [storedReports, setStoredReports] = useState([]);
  const [liveReportData, setLiveReportData] = useState(null);
  const [reportDataRefreshKey, setReportDataRefreshKey] = useState(0);

  const reportRef = useRef(null);

  useEffect(() => {
    if (!aToken) return;
    getAllBookings();
  }, [aToken]);

  useEffect(() => {
    if (!isSummaryModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSummaryModalOpen]);

  useEffect(() => {
    if (!aToken) return;

    let isMounted = true;

    const loadStoredReports = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/reports`, {
          headers: { token: aToken },
          params: { limit: 120 },
        });

        if (isMounted && data?.success) {
          setStoredReports(data.reports || []);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error.response?.data?.message || "Failed to load saved reports");
        }
      }
    };

    loadStoredReports();

    return () => {
      isMounted = false;
    };
  }, [aToken, backendUrl]);

  useEffect(() => {
    if (!aToken) return;

    let isMounted = true;

    const loadLiveReportData = async () => {
      try {
        const data = await fetchReportData({
          backendUrl,
          aToken,
          reportType,
          reportYear,
          reportMonth,
        });

        if (!isMounted) return;

        if (data?.success) {
          setLiveReportData(data);
          return;
        }

        setLiveReportData(null);
        toast.error(data?.message || "Failed to load report data");
      } catch (error) {
        if (!isMounted) return;
        setLiveReportData(null);
        toast.error(error.response?.data?.message || "Failed to load report data");
      }
    };

    loadLiveReportData();

    return () => {
      isMounted = false;
    };
  }, [aToken, backendUrl, reportDataRefreshKey, reportMonth, reportType, reportYear]);

  const bookings = useMemo(() => {
    return [...(allBookings || [])].sort((a, b) => {
      const first = getBookingDate(a)?.getTime() || 0;
      const second = getBookingDate(b)?.getTime() || 0;
      return second - first;
    });
  }, [allBookings]);

  const availableYears = useMemo(() => {
    const years = new Set(
      bookings
        .map((booking) => getManilaDateParts(getBookingDate(booking))?.year)
        .filter((value) => Number.isInteger(value))
    );
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [bookings]);

  const reportWindow = useMemo(
    () => getReportWindow(reportType, reportMonth, reportYear),
    [reportMonth, reportType, reportYear]
  );

  const reportLabel = useMemo(
    () => (reportType === "monthly" ? `${MONTH_NAMES[reportMonth]} ${reportYear}` : `Annual ${reportYear}`),
    [reportMonth, reportType, reportYear]
  );

  const coverageLabel = useMemo(
    () => formatCoverageRange(reportWindow.start, reportWindow.end),
    [reportWindow]
  );
  const reportYearOptions = useMemo(
    () =>
      availableYears.map((year) => ({
        label: String(year),
        value: year,
      })),
    [availableYears]
  );

  const reportBookings = useMemo(
    () => filterBookingsByReport(bookings, reportType, reportMonth, reportYear),
    [bookings, reportMonth, reportType, reportYear]
  );

  const reportSummary = useMemo(() => summarizePeriodBookings(reportBookings), [reportBookings]);

  const currentStoredReport = useMemo(
    () =>
      storedReports.find((report) =>
        report.reportType === reportType &&
        Number(report.periodYear) === Number(reportYear) &&
        (reportType !== "monthly" || Number(report.periodMonth) === reportMonth + 1)
      ) || null,
    [reportMonth, reportType, reportYear, storedReports]
  );

  const liveReportSummary = useMemo(() => {
    if (!liveReportData?.success) return null;

    return {
      totalBookings: Number(liveReportData.totalBookings || 0),
      totalParticipants: Number(liveReportData.totalParticipants || 0),
      totalRoomsBooked: Number(liveReportData.totalRoomsBooked || 0),
      totalIncome: Number(liveReportData.totalIncome || 0),
    };
  }, [liveReportData]);

  const activeReportSummary = useMemo(() => {
    if (liveReportSummary) return liveReportSummary;
    if (!currentStoredReport) return reportSummary;

    return {
      ...reportSummary,
      totalBookings: Number(currentStoredReport.totalBookings || 0),
      totalParticipants: Number(currentStoredReport.totalParticipants || 0),
      totalRoomsBooked: Number(currentStoredReport.totalRoomsBooked || 0),
      totalIncome: Number(currentStoredReport.totalIncome || 0),
    };
  }, [currentStoredReport, liveReportSummary, reportSummary]);

  const generatedLabel = formatGeneratedTimestamp(
    currentStoredReport?.updatedAt || currentStoredReport?.createdAt || new Date()
  );

  const pdfBreakdownBuckets = useMemo(() => {
    if (reportType === "monthly") {
      return liveReportData?.periodTrend
        ? {
            labels: liveReportData.periodTrend.labels || [],
            bookingSeries: (liveReportData.periodTrend.bookingSeries || []).map((value) => Number(value || 0)),
            incomeSeries: (liveReportData.periodTrend.incomeSeries || []).map((value) => Number(value || 0)),
          }
        : buildMonthlyWeekBuckets(reportBookings, reportMonth, reportYear);
    }

    return buildAnnualMonthBuckets(reportBookings, reportYear);
  }, [liveReportData, reportBookings, reportMonth, reportType, reportYear]);

  const bookingTrendData = useMemo(
    () =>
      pdfBreakdownBuckets.labels.map((label, index) => ({
        label,
        value: Number(pdfBreakdownBuckets.bookingSeries[index] || 0),
      })),
    [pdfBreakdownBuckets.bookingSeries, pdfBreakdownBuckets.labels]
  );

  const incomeTrendData = useMemo(
    () =>
      pdfBreakdownBuckets.labels.map((label, index) => ({
        label,
        value: Number(pdfBreakdownBuckets.incomeSeries[index] || 0),
      })),
    [pdfBreakdownBuckets.incomeSeries, pdfBreakdownBuckets.labels]
  );

  const chartSeries = chartMode === "booking" ? pdfBreakdownBuckets.bookingSeries : pdfBreakdownBuckets.incomeSeries;
  const chartMax = Math.max(...chartSeries, 1);
  const chartAxisValues = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) =>
        Number((((4 - index) / 4) * chartMax).toFixed(chartMax >= 10 ? 0 : 2))
      ),
    [chartMax]
  );
  const chartTickValues = useMemo(() => [...chartAxisValues].reverse(), [chartAxisValues]);
  const chartData = useMemo(
    () =>
      pdfBreakdownBuckets.labels.map((label, index) => ({
        label,
        value: Number(chartSeries[index] || 0),
      })),
    [chartSeries, pdfBreakdownBuckets.labels]
  );
  const hasChartData = chartData.some((entry) => entry.value > 0);
  const chartBarColor = chartMode === "booking" ? BOOKING_BAR_COLOR : INCOME_BAR_COLOR;

  const pdfReportDetailRows = useMemo(
    () => [
      {
        label: reportType === "monthly" ? "Report Month" : "Report Year",
        value: reportType === "monthly" ? reportLabel : String(reportYear),
      },
      {
        label: "Coverage",
        value: coverageLabel,
      },
      {
        label: "Generated on",
        value: generatedLabel,
      },
    ],
    [coverageLabel, generatedLabel, reportLabel, reportType, reportYear]
  );

  const waitForExportAssets = async () => {
    if (!reportRef.current) return;
    const images = Array.from(reportRef.current.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete && image.naturalWidth !== 0) {
              resolve();
              return;
            }

            const finish = () => {
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };

            image.addEventListener("load", finish);
            image.addEventListener("error", finish);
          })
      )
    );
  };

  const exportCanvasToPdf = (canvas) => {
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageData = canvas.toDataURL("image/png");
    const widthScale = pageWidth / canvas.width;
    const heightScale = pageHeight / canvas.height;
    const fitScale = Math.min(widthScale, heightScale);
    const imageWidth = canvas.width * fitScale;
    const imageHeight = canvas.height * fitScale;
    const xOffset = (pageWidth - imageWidth) / 2;
    const yOffset = (pageHeight - imageHeight) / 2;

    pdf.addImage(imageData, "PNG", xOffset, yOffset, imageWidth, imageHeight);

    pdf.save(`MRH_Report_${reportLabel.replace(/\s+/g, "_")}.pdf`);
  };

  const handleDownloadPdf = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      try {
        const latestReportData = await fetchReportData({
          backendUrl,
          aToken,
          reportType,
          reportYear,
          reportMonth,
        });

        if (latestReportData?.success) {
          setLiveReportData(latestReportData);
        }
      } catch (refreshError) {
        console.error("Failed to refresh report data before PDF export:", refreshError);
      }

      setIsExportVisible(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await waitForExportAssets();

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
      });

      exportCanvasToPdf(canvas);
    } catch (error) {
      console.error("Failed to generate report PDF:", error);
      toast.error("Failed to generate report PDF");
    } finally {
      setIsExportVisible(false);
      setIsDownloading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!aToken || isGeneratingReport) return;

    setIsGeneratingReport(true);

    try {
      const payload =
        reportType === "monthly"
          ? { reportType, periodMonth: reportMonth + 1, periodYear: reportYear }
          : { reportType, periodYear: reportYear };

      const { data } = await axios.post(`${backendUrl}/api/reports/generate`, payload, {
        headers: { token: aToken },
      });

      if (!data?.success) {
        toast.error(data?.message || "Failed to generate report");
        return;
      }

      try {
        const latestReportData = await fetchReportData({
          backendUrl,
          aToken,
          reportType,
          reportYear,
          reportMonth,
        });

        if (latestReportData?.success) {
          setLiveReportData(latestReportData);
        } else {
          setReportDataRefreshKey((current) => current + 1);
        }
      } catch (refreshError) {
        console.error("Failed to refresh report data after generation:", refreshError);
        setReportDataRefreshKey((current) => current + 1);
      }

      const savedReport = data.report;

      setStoredReports((previous) => {
        const next = (previous || []).filter((report) => {
          if (report.reportType !== savedReport.reportType) return true;
          if (Number(report.periodYear) !== Number(savedReport.periodYear)) return true;
          if (savedReport.reportType === "monthly") {
            return Number(report.periodMonth) !== Number(savedReport.periodMonth);
          }
          return false;
        });

        return [savedReport, ...next].sort((first, second) => {
          const firstYear = Number(first.periodYear || 0);
          const secondYear = Number(second.periodYear || 0);
          if (secondYear !== firstYear) return secondYear - firstYear;
          return Number(second.periodMonth || 0) - Number(first.periodMonth || 0);
        });
      });

      getAllBookings();
      setReportDataRefreshKey((current) => current + 1);
      toast.success(data.message || "Report generated successfully");
      setIsSummaryModalOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const overviewText =
    reportType === "monthly"
      ? `The Mercedarian Retreat House (MRH) continues to serve as a center for spiritual renewal, reflection, and community formation. This ${reportLabel} report highlights booking activity, guest participation, and operational performance to guide decisions and improve service delivery.`
      : `The Mercedarian Retreat House (MRH) continues to serve as a center for spiritual renewal, reflection, and community formation. This annual ${reportYear} report highlights booking activity, guest participation, and operational performance to guide decisions and improve service delivery.`;

  return (
    <div className="space-y-4 bg-slate-50 pb-8 font-sans text-slate-900 print:bg-white">
      <div
        ref={reportRef}
        className={`print:static print:block print:w-full print:bg-white ${isExportVisible ? "block w-[210mm] bg-white" : "hidden"}`}
        style={
          isExportVisible
            ? {
                position: "fixed",
                top: 0,
                left: "-10000px",
                zIndex: -1,
                pointerEvents: "none",
              }
            : undefined
        }
      >
        <div className="bg-white px-[12mm] py-[12mm] text-slate-900">
          <div className="mx-auto flex min-h-[273mm] max-w-[186mm] flex-col gap-3">
            <div className="relative overflow-hidden rounded-[28px] border border-[#ebe5f8] bg-white shadow-[0_20px_48px_-36px_rgba(92,55,170,0.45)]">
              <img
                src={reportHero}
                alt="Mercedarian Retreat House"
                crossOrigin="anonymous"
                className="h-[152px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-white/76 to-white/10" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02))]" />
              <div className="absolute inset-0 flex items-start justify-between gap-6 px-6 py-6">
                <div className="max-w-[60%] pt-1">
                  <div className="space-y-1">
                    <p className="font-serif text-[34px] font-black leading-[0.92] tracking-[-0.04em] text-black">
                      MRH
                    </p>
                    <p className="font-serif text-[18px] font-bold leading-none tracking-[-0.02em] text-black">
                      {reportType === "monthly" ? "Monthly Report" : "Annual Report"}
                    </p>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-[10px] font-bold leading-none tracking-[0.01em] text-black">
                      Mercedarian Retreat House (MRH)
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-[9px] font-semibold leading-none text-slate-700">
                      <MapPin size={10} className="shrink-0 text-black" />
                      <span>Sitio Union, Dauis, Bohol</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-start pt-1">
                  <img
                    src={reportLogo}
                    alt="MRH Emblem"
                    crossOrigin="anonymous"
                    className="h-11 w-11 object-contain opacity-95"
                    style={{ filter: "brightness(0) saturate(0)" }}
                  />
                </div>
              </div>
            </div>

            <div className="px-1 py-1">
              <h2 className="text-[22px] font-black tracking-tight text-[#4d2c70]">Overview</h2>
              <p className="mt-2 text-[10px] leading-[1.6] text-slate-600">{overviewText}</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-[20px] border border-[#ebe5f8] bg-[#faf7ff] px-3.5 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8b76ae]">Bookings</p>
                <p className="mt-1.5 text-[20px] font-black tracking-tight text-[#4d2c70]">
                  {formatCount(activeReportSummary.totalBookings)}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500">
                  {reportType === "monthly" ? "Recorded this month" : "Recorded this year"}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#ebe5f8] bg-[#f4fbf8] px-3.5 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5f9f88]">Income</p>
                <p className="mt-1.5 text-[20px] font-black tracking-tight text-[#2f6d58]">
                  {formatCurrency(activeReportSummary.totalIncome)}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500">Paid bookings only</p>
              </div>
              <div className="rounded-[20px] border border-[#ebe5f8] bg-[#fff9f1] px-3.5 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#c1892c]">Guests</p>
                <p className="mt-1.5 text-[20px] font-black tracking-tight text-[#8f6115]">
                  {formatCount(activeReportSummary.totalParticipants)}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500">Estimated participants</p>
              </div>
              <div className="rounded-[20px] border border-[#ebe5f8] bg-[#f6f8ff] px-3.5 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6f7db4]">Booked Rooms</p>
                <p className="mt-1.5 text-[20px] font-black tracking-tight text-[#4d2c70]">
                  {formatCount(activeReportSummary.totalRoomsBooked)}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500">Room entries for the period</p>
              </div>
            </div>

            <PdfBreakdownTable
              title="Period Breakdown"
              labels={pdfBreakdownBuckets.labels}
              bookingSeries={pdfBreakdownBuckets.bookingSeries}
              incomeSeries={pdfBreakdownBuckets.incomeSeries}
              periodLabel={reportType === "monthly" ? "Week" : "Month"}
              totalBookings={activeReportSummary.totalBookings}
              totalIncome={activeReportSummary.totalIncome}
              detail={
                reportType === "monthly"
                  ? "Tabulated weekly totals for the selected month"
                  : "Tabulated monthly totals for the selected year"
              }
            />

            <div className="grid grid-cols-1 gap-3">
              <PdfKeyValueTable
                title="Report Details"
                detail="Coverage and generation details"
                labelHeader="Field"
                valueHeader="Value"
                rows={pdfReportDetailRows}
              />
            </div>

          </div>
        </div>
      </div>

      <div className="-mt-10 print:hidden lg:-mt-12">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Reports</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Save monthly or yearly reports.</p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || isDownloading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingReport || isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Database size={16} />
            )}
            <span className="text-sm font-black uppercase tracking-wide">
              {isGeneratingReport ? "Generating..." : isDownloading ? "Preparing PDF..." : "Generate Report"}
            </span>
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Bookings"
            value={formatCount(activeReportSummary.totalBookings)}
            detail={reportType === "monthly" ? "This month" : "This year"}
            accent="indigo"
          />
          <StatCard
            icon={Wallet}
            label="Income"
            value={formatCurrency(activeReportSummary.totalIncome)}
            detail="From completed bookings"
            accent="emerald"
          />
          <StatCard
            icon={Users}
            label="Guests"
            value={formatCount(activeReportSummary.totalParticipants)}
            detail="Included bookings"
            accent="amber"
          />
          <StatCard
            icon={BedDouble}
            label="Booked Rooms"
            value={formatCount(activeReportSummary.totalRoomsBooked)}
            detail="Room entries"
            accent="indigo"
          />
        </div>
      </div>

      <section className="rounded-[32px] border border-[#dbe4f0] bg-[#fbfdff] px-4 py-4 shadow-[0_24px_50px_-38px_rgba(41,72,152,0.28)] print:hidden sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 pl-4 sm:pl-5">
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {chartMode === "booking" ? "Total Bookings" : "Total Income"}
            </h2>
            <p className="mt-1.5 mb-4 text-sm font-medium text-slate-500">
              {chartMode === "booking" ? `Total bookings for ${reportLabel}.` : `Paid income for ${reportLabel}.`}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:ml-auto lg:mr-4 lg:w-auto lg:flex-nowrap lg:justify-end">
            <FilterDropdown
              label="Report Type"
              options={REPORT_TYPE_OPTIONS}
              value={reportType}
              onChange={setReportType}
              icon={FileText}
              disableTriggerShadow
              flatTriggerDecorations
              neutralValue=""
              triggerClassName="min-w-[150px] justify-between bg-slate-50 text-[12px] font-bold"
              showMenuHeader={false}
              menuClassName="w-48"
            />

            {reportType === "monthly" && (
              <FilterDropdown
                label="Month"
                options={REPORT_MONTH_OPTIONS}
                value={reportMonth}
                onChange={setReportMonth}
                icon={CalendarDays}
                disableTriggerShadow
                flatTriggerDecorations
                neutralValue=""
                align="left"
                triggerClassName="min-w-[140px] justify-between bg-slate-50 text-[12px] font-bold"
                showMenuHeader={false}
                menuClassName="w-[248px]"
                optionListClassName={REPORT_MONTH_GRID_OPTION_LIST_CLASSNAME}
              />
            )}

            <FilterDropdown
              label="Year"
              options={reportYearOptions}
              value={reportYear}
              onChange={setReportYear}
              icon={Calendar}
              disableTriggerShadow
              flatTriggerDecorations
              neutralValue=""
              triggerClassName="min-w-[128px] justify-between bg-slate-50 text-[12px] font-bold"
              showMenuHeader={false}
              menuClassName="w-40"
            />
          </div>
        </div>

        <div className="mt-2 px-3 sm:px-4">
          <div
            className="inline-flex w-max shrink-0 items-center gap-1 rounded-full border border-[#d6e0ee] bg-[#eef4fb] p-1 shadow-[0_14px_26px_-28px_rgba(49,78,144,0.7)]"
            role="tablist"
            aria-label="Report chart mode"
          >
            <button
              type="button"
              onClick={() => setChartMode("booking")}
              aria-pressed={chartMode === "booking"}
              className="inline-flex min-w-[108px] shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-black leading-none outline-none transition hover:bg-white hover:text-[#11284d] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3466dd]/35 focus-visible:ring-offset-0"
              style={getChartModeButtonStyles(chartMode === "booking", BOOKING_BAR_COLOR)}
            >
              <FileText size={14} strokeWidth={2.4} />
              Booking
            </button>
            <button
              type="button"
              onClick={() => setChartMode("income")}
              aria-pressed={chartMode === "income"}
              className="inline-flex min-w-[108px] shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-black leading-none outline-none transition hover:bg-white hover:text-[#11284d] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12b981]/35 focus-visible:ring-offset-0"
              style={getChartModeButtonStyles(chartMode === "income", INCOME_BAR_COLOR)}
            >
              <Wallet size={14} strokeWidth={2.4} />
              Income
            </button>
          </div>
        </div>

        <div className="mt-[10px] px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="rounded-[24px] border border-[#d8e2f0] bg-transparent px-2 py-3 sm:px-4 sm:py-4">
            <div className="w-full min-w-0" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
                  <CartesianGrid vertical={false} stroke="#d9e5f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8a9fc0", fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    domain={[0, chartMax]}
                    ticks={chartTickValues}
                    tickFormatter={(value) => formatAxisValue(value, chartMode)}
                    tick={{ fill: "#7d94bb", fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(216,226,240,0.18)" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #dbe4f0",
                      boxShadow: "0 16px 32px -24px rgba(33,63,132,0.5)",
                    }}
                    formatter={(value) => [
                      chartMode === "booking" ? formatCount(value) : formatCurrency(value),
                      chartMode === "booking" ? "Bookings" : "Income",
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[16, 16, 0, 0]}
                    maxBarSize={reportType === "annual" ? 34 : 56}
                    minPointSize={hasChartData ? 8 : 0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`chart-bar-${entry.label}-${index}`} fill={chartBarColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {!hasChartData && (
              <p className="mt-2 text-center text-[12px] font-semibold text-[#93a5bf]">
                No data for this period yet.
              </p>
            )}
          </div>

          <div className="mt-6">
            <p className="text-center text-[9px] font-black uppercase tracking-[0.38em] text-[#8a9fc0] sm:text-[11px]">
              {reportType === "monthly" ? "Week" : "Month"}
            </p>
          </div>
        </div>
      </section>

      {isSummaryModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm print:hidden"
          onClick={() => setIsSummaryModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-indigo-500">
                  Report Summary
                </p>
                <h2 className="mt-0.5 text-[16px] font-black tracking-tight text-slate-900">{reportLabel}</h2>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  Coverage: {coverageLabel}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Download report PDF"
                >
                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close report summary"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] space-y-2.5 overflow-y-auto px-3 py-2.5">
              <div className={`grid gap-2 ${reportType === "monthly" ? "grid-cols-3" : "grid-cols-2"}`}>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Report type
                  </span>
                  <FilterDropdown
                    label="Report Type"
                    options={REPORT_TYPE_OPTIONS}
                    value={reportType}
                    onChange={setReportType}
                    icon={FileText}
                    disableTriggerShadow
                    flatTriggerDecorations
                    neutralValue=""
                    align="left"
                    showMenuHeader={false}
                    compact
                    triggerClassName="w-full justify-between rounded-xl bg-white px-1.5 text-[10px] font-bold shadow-none"
                    menuClassName="w-full"
                  />
                </label>

                {reportType === "monthly" && (
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Month
                    </span>
                    <ModalMonthSelector value={reportMonth} onChange={setReportMonth} />
                  </label>
                )}

                <label className={reportType === "monthly" ? "block" : "col-span-1 block"}>
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Year
                  </span>
                  <FilterDropdown
                    label="Year"
                    options={reportYearOptions}
                    value={reportYear}
                    onChange={setReportYear}
                    icon={Calendar}
                    disableTriggerShadow
                    flatTriggerDecorations
                    neutralValue=""
                    align="left"
                    showMenuHeader={false}
                    compact
                    triggerClassName="w-full justify-between rounded-xl bg-white px-1.5 text-[10px] font-bold shadow-none"
                    menuClassName="w-full"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SummaryMetric
                  label="Bookings"
                  value={formatCount(activeReportSummary.totalBookings)}
                  detail={reportType === "monthly" ? "For this month" : "For this year"}
                />
                <SummaryMetric
                  label="Income"
                  value={formatCurrency(activeReportSummary.totalIncome)}
                  detail="Paid bookings only"
                />
                <SummaryMetric
                  label="Guests"
                  value={formatCount(activeReportSummary.totalParticipants)}
                  detail="Estimated participants"
                />
                <SummaryMetric
                  label="Rooms"
                  value={formatCount(activeReportSummary.totalRoomsBooked)}
                  detail="Booked room entries"
                />
              </div>

              <div className="space-y-2">
                <ModalTrendChart
                  title="Bookings Trend"
                  data={bookingTrendData}
                  color={BOOKING_BAR_COLOR}
                  axisMode="booking"
                  tooltipLabel="Bookings"
                />
                <ModalTrendChart
                  title="Income Trend"
                  data={incomeTrendData}
                  color={INCOME_BAR_COLOR}
                  axisMode="income"
                  tooltipLabel="Income"
                />
              </div>

              {activeReportSummary.totalBookings === 0 && (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold text-amber-800">
                  No bookings were found for this report period yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
