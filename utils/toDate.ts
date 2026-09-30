// The API's timestamps do not all arrive in a shape `new Date()` understands, and the ones it
// refuses used to reach the page as "Invalid Date". Everything that shows a date goes through
// here instead, and gets null for a value it cannot read, so the page can print a dash.
//
// Handled, beyond what Date already parses:
//   - Jackson's default LocalDateTime, the array [year, month, day, hour, minute, second, nanos],
//     whose month is 1-based where the Date constructor's is 0-based;
//   - epoch seconds or milliseconds, as a number or a string of digits;
//   - "2026-09-20 14:33:12", a space where ISO wants a T, and a fractional second longer than
//     the three digits browsers accept.

// Anything past the year 3000 in milliseconds is seconds that were read as milliseconds.
const EPOCH_SECONDS_LIMIT = 32503680000;

const fromNumber = (value: number) => {
  const millis = Math.abs(value) < EPOCH_SECONDS_LIMIT ? value * 1000 : value;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDate = (value): Date | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  // [year, month, day, hour, minute, second, nanos] — anything past the day may be missing.
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    if (year == null || month == null || day == null) return null;
    const date = new Date(year, month - 1, day, hour, minute, second);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') return fromNumber(value);

  const text = String(value).trim();
  if (/^-?\d+$/.test(text)) return fromNumber(Number(text));

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;

  // A space instead of the T, and at most milliseconds in the fraction.
  const repaired = new Date(text.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(repaired.getTime()) ? null : repaired;
};

/** The date as text, or a dash where there is no reading it. */
export const formatDate = (value, locale?: string, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(value);
  return date ? date.toLocaleString(locale, options) : '—';
};
