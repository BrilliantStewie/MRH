const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MANILA_START_HOUR_UTC = -8;

const toValidDate = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getManilaDateParts = (value) => {
  const parsed = toValidDate(value);
  if (!parsed) return null;

  const manilaDate = new Date(parsed.getTime() + MANILA_OFFSET_MS);

  return {
    year: manilaDate.getUTCFullYear(),
    monthIndex: manilaDate.getUTCMonth(),
    day: manilaDate.getUTCDate(),
  };
};

const createManilaDayStart = (value) => {
  const parts = getManilaDateParts(value);

  if (!parts) {
    return new Date(Number.NaN);
  }

  return new Date(
    Date.UTC(parts.year, parts.monthIndex, parts.day, MANILA_START_HOUR_UTC, 0, 0, 0)
  );
};

const getManilaDateValue = (value) => {
  const parts = getManilaDateParts(value);
  if (!parts) return "";

  return [
    String(parts.year),
    String(parts.monthIndex + 1).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

export {
  createManilaDayStart,
  getManilaDateParts,
  getManilaDateValue,
};
