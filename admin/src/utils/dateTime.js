const PH_LOCALE = "en-PH";
const PH_TIME_ZONE = "Asia/Manila";

const toValidDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getFormatter = (options, locale = PH_LOCALE) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: PH_TIME_ZONE,
    ...options,
  });

const formatDatePHT = (
  value,
  options = { month: "short", day: "numeric", year: "numeric" },
  locale = PH_LOCALE
) => {
  const date = toValidDate(value);
  if (!date) return "";
  return getFormatter(options, locale).format(date);
};

const formatDateTimePHT = (
  value,
  options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
  locale = PH_LOCALE
) => {
  const date = toValidDate(value);
  if (!date) return "";
  return getFormatter(options, locale).format(date);
};

const formatMonthYearPHT = (value, locale = PH_LOCALE) =>
  formatDatePHT(value, { month: "long", year: "numeric" }, locale);

const formatDateRangePHT = (start, end, locale = PH_LOCALE) => {
  if (!start || !end) return "";
  const startLabel = formatDatePHT(start, { month: "short", day: "numeric", year: "numeric" }, locale);
  const endLabel = formatDatePHT(end, { month: "short", day: "numeric", year: "numeric" }, locale);
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : "";
};

const getPHDateParts = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  const parts = getFormatter(
    { year: "numeric", month: "2-digit", day: "2-digit" },
    "en-US"
  )
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return parts.year && parts.month && parts.day ? parts : null;
};

const getPHDateValue = (value) => {
  const parts = getPHDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
};

const getPHMonthIndex = (value) => {
  const parts = getPHDateParts(value);
  return parts ? Number(parts.month) - 1 : -1;
};

const getPHYear = (value) => {
  const parts = getPHDateParts(value);
  return parts ? Number(parts.year) : Number.NaN;
};

const getCurrentPHYear = () => getPHYear(new Date());

const getMonthLabelPHT = (monthIndex, width = "long", locale = PH_LOCALE) =>
  formatDatePHT(new Date(Date.UTC(2024, monthIndex, 1)), { month: width }, locale);

export {
  PH_LOCALE,
  PH_TIME_ZONE,
  formatDatePHT,
  formatDateTimePHT,
  formatMonthYearPHT,
  formatDateRangePHT,
  getPHDateValue,
  getPHMonthIndex,
  getPHYear,
  getCurrentPHYear,
  getMonthLabelPHT,
};
