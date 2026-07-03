const DEFAULT_TIMEZONE = "Africa/Nairobi";

const normalizeDate = (value) => {
  if (!value) return null;

  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    return null;
  }

  return normalized.toISOString().slice(0, 10);
};

const getTodayDateInTimezone = (timeZone = DEFAULT_TIMEZONE) =>
  new Date().toLocaleDateString("en-CA", { timeZone });

const formatDateRange = (value) => normalizeDate(value) || null;

module.exports = {
  DEFAULT_TIMEZONE,
  normalizeDate,
  formatDateRange,
  getTodayDateInTimezone,
};
