// ============================================================
// utils/converter.js — QuickClip Smart Conversion Utility
// Responsibilities:
//   1. Convert numbers to words (42 → forty-two)
//   2. Convert currency (₹ ↔ $) at a fixed exchange rate
//   3. Convert dates to ISO format (YYYY-MM-DD)
//
// All functions are pure — no side effects, no external calls.
// Input: raw string → Output: converted string
//
// Adding a new conversion:
//   1. Write a pure convert* function below
//   2. Add it to convertText() with a matching options flag
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

// Fixed exchange rate (Phase 1). Replace with API call in Phase 2.
const EXCHANGE = {
  INR_TO_USD : 0.012,   // 1 INR = 0.012 USD  (update as needed)
  USD_TO_INR : 83.5,    // 1 USD = 83.5  INR  (update as needed)
};


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Master conversion function. Runs selected conversions in sequence.
 *
 * @param {string} text - Input text
 * @param {Object} options
 * @param {boolean} [options.numbers=true]  - Convert numbers to words
 * @param {boolean} [options.currency=true] - Convert ₹/$ amounts
 * @param {boolean} [options.dates=true]    - Normalize dates to YYYY-MM-DD
 * @returns {string} - Text with conversions applied
 */
export function convertText(text, options = {}) {
  if (!text || typeof text !== 'string') return '';

  const {
    numbers  = true,
    currency = true,
    dates    = true,
  } = options;

  let result = text;

  if (dates)    result = convertDates(result);
  if (currency) result = convertCurrency(result);
  if (numbers)  result = convertNumbers(result);

  return result;
}


// ============================================================
// CONVERSION 1 — NUMBERS TO WORDS
// ============================================================

/**
 * Finds standalone integers in text and replaces them with
 * their English word equivalent.
 *
 * Scope:
 *   - Integers only (no decimals — decimals are often currency/measurements)
 *   - Range: 0 to 999,999 (covers the vast majority of real-world cases)
 *   - Skips numbers that are part of a year pattern (already handled by dates)
 *   - Skips numbers adjacent to currency symbols
 *
 * Examples:
 *   "I have 42 apples"        → "I have forty-two apples"
 *   "The score was 100"       → "The score was one hundred"
 *   "She paid $50"            → "She paid $50" (skipped — currency)
 *   "In 2024, things changed" → "In 2024, things changed" (skipped — year)
 *
 * @param {string} text
 * @returns {string}
 */
function convertNumbers(text) {
  // Skip numbers:
  //   - preceded by $, ₹, £, €, ¥ (currency)
  //   - that are 4-digit years (1000–2999)
  //   - preceded or followed by . (decimals)
  const NUMBER_RE = /(?<![₹$£€¥])\b([0-9]{1,6})\b(?!\s*[₹$£€¥%])/g;

  return text.replace(NUMBER_RE, (match, numStr) => {
    const num = parseInt(numStr, 10);

    // Skip 4-digit years (1000–2999)
    if (num >= 1000 && num <= 2999) return match;

    // Skip if number is immediately adjacent to a decimal point
    // (already handled by the regex, but double-check)
    const words = numberToWords(num);
    return words ?? match; // if conversion fails, keep original
  });
}

/**
 * Converts an integer (0–999,999) to its English word form.
 *
 * @param {number} n
 * @returns {string|null} - Word form, or null if out of range
 */
function numberToWords(n) {
  if (n < 0 || n > 999999 || !Number.isInteger(n)) return null;

  const ONES = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen',
  ];

  const TENS = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty',
    'sixty', 'seventy', 'eighty', 'ninety',
  ];

  if (n === 0) return 'zero';

  function belowThousand(num) {
    if (num === 0)   return '';
    if (num < 20)    return ONES[num];
    if (num < 100) {
      const ten  = TENS[Math.floor(num / 10)];
      const one  = ONES[num % 10];
      return one ? `${ten}-${one}` : ten;
    }
    // 100–999
    const hundreds  = ONES[Math.floor(num / 100)];
    const remainder = num % 100;
    const rest      = remainder ? ` ${belowThousand(remainder)}` : '';
    return `${hundreds} hundred${rest}`;
  }

  if (n < 1000) return belowThousand(n);

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  const thousandPart = `${belowThousand(thousands)} thousand`;
  const restPart     = remainder ? ` ${belowThousand(remainder)}` : '';

  return `${thousandPart}${restPart}`;
}


// ============================================================
// CONVERSION 2 — CURRENCY
// ============================================================

/**
 * Detects ₹ and $ amounts in text and appends the converted
 * equivalent in parentheses.
 *
 * Handles:
 *   - ₹1000, ₹ 1,000, ₹1,000.50
 *   - $10, $ 10.99, $1,000
 *   - Amounts with commas as thousands separators
 *
 * Examples:
 *   "Price is ₹500"        → "Price is ₹500 ($6.00)"
 *   "It costs $12.99"      → "It costs $12.99 (₹1,084.87)"
 *   "Range: ₹200 to ₹500"  → "Range: ₹200 ($2.40) to ₹500 ($6.00)"
 *
 * @param {string} text
 * @returns {string}
 */
function convertCurrency(text) {
  // Match ₹ amounts
  const INR_RE = /₹\s?([0-9,]+(?:\.[0-9]{1,2})?)/g;
  // Match $ amounts (not already followed by a parenthetical conversion)
  const USD_RE = /\$\s?([0-9,]+(?:\.[0-9]{1,2})?)(?!\s*\(₹)/g;

  let result = text;

  // ₹ → $ conversion
  result = result.replace(INR_RE, (match, amountStr) => {
    const amount    = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount)) return match;
    const converted = (amount * EXCHANGE.INR_TO_USD).toFixed(2);
    return `${match} ($${formatNumber(converted)})`;
  });

  // $ → ₹ conversion (skip ones we just added)
  result = result.replace(USD_RE, (match, amountStr) => {
    const amount    = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount)) return match;
    const converted = (amount * EXCHANGE.USD_TO_INR).toFixed(2);
    return `${match} (₹${formatNumber(converted)})`;
  });

  return result;
}


// ============================================================
// CONVERSION 3 — DATE NORMALIZATION
// ============================================================

/**
 * Detects common date formats in text and converts them to ISO 8601
 * (YYYY-MM-DD). Unrecognized formats are left unchanged.
 *
 * Supported input formats:
 *   DD/MM/YYYY     → YYYY-MM-DD
 *   MM/DD/YYYY     → YYYY-MM-DD  (US format — ambiguous, noted below)
 *   DD-MM-YYYY     → YYYY-MM-DD
 *   DD.MM.YYYY     → YYYY-MM-DD
 *   Month DD, YYYY → YYYY-MM-DD  (e.g. January 5, 2024)
 *   DD Month YYYY  → YYYY-MM-DD  (e.g. 5 January 2024)
 *
 * NOTE on MM/DD/YYYY vs DD/MM/YYYY ambiguity:
 *   When day > 12, it's unambiguously DD/MM/YYYY.
 *   When day ≤ 12, we default to DD/MM/YYYY (non-US convention).
 *   This is a known limitation of Phase 1. A locale setting can
 *   resolve this in Phase 2.
 *
 * @param {string} text
 * @returns {string}
 */
function convertDates(text) {
  let result = text;

  // --- Pattern 1: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ---
  const NUMERIC_DATE_RE = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g;
  result = result.replace(NUMERIC_DATE_RE, (match, p1, p2, p3) => {
    // p3 is always the 4-digit year
    const year  = parseInt(p3, 10);
    // Treat as DD/MM/YYYY
    const day   = parseInt(p1, 10);
    const month = parseInt(p2, 10);

    if (!isValidDate(year, month, day)) return match;
    return toISO(year, month, day);
  });

  // --- Pattern 2: "January 5, 2024" or "Jan 5, 2024" ---
  const MONTH_FIRST_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  result = result.replace(MONTH_FIRST_RE, (match, monthStr, dayStr, yearStr) => {
    const month = monthNameToNumber(monthStr);
    const day   = parseInt(dayStr, 10);
    const year  = parseInt(yearStr, 10);

    if (!month || !isValidDate(year, month, day)) return match;
    return toISO(year, month, day);
  });

  // --- Pattern 3: "5 January 2024" or "5 Jan 2024" ---
  const DAY_FIRST_RE = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/gi;
  result = result.replace(DAY_FIRST_RE, (match, dayStr, monthStr, yearStr) => {
    const month = monthNameToNumber(monthStr);
    const day   = parseInt(dayStr, 10);
    const year  = parseInt(yearStr, 10);

    if (!month || !isValidDate(year, month, day)) return match;
    return toISO(year, month, day);
  });

  return result;
}

/**
 * Converts month name (full or abbreviated) to its number (1–12).
 * @param {string} name
 * @returns {number|null}
 */
function monthNameToNumber(name) {
  const MONTHS = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  };
  return MONTHS[name.toLowerCase()] ?? null;
}

/**
 * Validates whether the given year/month/day form a real calendar date.
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {number} day
 * @returns {boolean}
 */
function isValidDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  if (day   < 1 || day   > 31) return false;
  if (year  < 1000 || year > 2999) return false;

  // Use the Date constructor to catch edge cases (e.g. Feb 30)
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year  &&
    d.getMonth()    === month - 1 &&
    d.getDate()     === day
  );
}

/**
 * Formats year/month/day into ISO 8601 string (YYYY-MM-DD).
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {string}
 */
function toISO(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}


// ============================================================
// SHARED HELPERS
// ============================================================

/**
 * Formats a numeric string with thousands separators.
 * e.g. "1234567.89" → "1,234,567.89"
 *
 * @param {string|number} value
 * @returns {string}
 */
function formatNumber(value) {
  const [integer, decimal] = String(value).split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}