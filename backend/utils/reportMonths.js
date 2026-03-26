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

const MONTH_NAME_LOOKUP = MONTH_NAMES.reduce((lookup, monthName, index) => {
  lookup[monthName.toLowerCase()] = index;
  lookup[monthName.slice(0, 3).toLowerCase()] = index;
  return lookup;
}, {});

const normalizePeriodMonth = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isInteger(value)) {
    return MONTH_NAMES[value - 1] || null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const monthIndex = MONTH_NAME_LOOKUP[trimmed.toLowerCase()];
  return monthIndex >= 0 ? MONTH_NAMES[monthIndex] : null;
};

const getPeriodMonthIndex = (value) => {
  const monthName = normalizePeriodMonth(value);
  return monthName ? MONTH_NAMES.indexOf(monthName) + 1 : null;
};

const comparePeriodMonthsDesc = (left, right) =>
  getPeriodMonthIndex(right) - getPeriodMonthIndex(left);

export {
  MONTH_NAMES,
  comparePeriodMonthsDesc,
  getPeriodMonthIndex,
  normalizePeriodMonth,
};
