// ============================================================
// utils/cleaner.js — QuickClip Text Cleaning Utility
// Responsibilities:
//   1. Strip HTML tags and entities
//   2. Remove inline CSS and style attributes
//   3. Clean up excessive whitespace and line breaks
//   4. Remove tracking parameters and ad artifacts
//   5. Normalize Unicode and special characters
//
// All functions are pure — no side effects, no external calls.
// Input: raw string → Output: cleaned string
// ============================================================


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Master clean function. Runs all cleaning steps in sequence.
 * Each step is independently documented below.
 *
 * @param {string} text - Raw input text (may contain HTML, junk, etc.)
 * @returns {string} - Cleaned plain text
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  result = decodeHtmlEntities(result);   // Step 1: &amp; → &
  result = stripHtmlTags(result);        // Step 2: <b>foo</b> → foo
  result = removeScriptStyle(result);    // Step 3: drop <script>/<style> blocks
  result = removeAdArtifacts(result);    // Step 4: drop common ad/tracking junk
  result = normalizeWhitespace(result);  // Step 5: collapse spaces & blank lines
  result = normalizeUnicode(result);     // Step 6: smart quotes → straight, etc.
  result = result.trim();

  return result;
}


// ============================================================
// STEP 1 — DECODE HTML ENTITIES
// ============================================================

/**
 * Converts HTML entities to their plain text equivalents.
 * Handles named entities (&amp;), numeric (&#38;), and hex (&#x26;).
 *
 * Examples:
 *   &amp;   → &
 *   &lt;    → <
 *   &nbsp;  → (space)
 *   &#169;  → ©
 *
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  const ENTITIES = {
    '&amp;'   : '&',
    '&lt;'    : '<',
    '&gt;'    : '>',
    '&quot;'  : '"',
    '&apos;'  : "'",
    '&nbsp;'  : ' ',
    '&copy;'  : '©',
    '&reg;'   : '®',
    '&trade;' : '™',
    '&mdash;' : '—',
    '&ndash;' : '–',
    '&hellip;': '…',
    '&laquo;' : '«',
    '&raquo;' : '»',
    '&bull;'  : '•',
    '&middot;': '·',
  };

  // Replace named entities
  let result = text.replace(
    /&[a-zA-Z]+;/g,
    (match) => ENTITIES[match] ?? match
  );

  // Replace numeric entities &#38; or &#x26;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
  result = result.replace(/&#([0-9]+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10))
  );

  return result;
}


// ============================================================
// STEP 2 — STRIP HTML TAGS
// ============================================================

/**
 * Removes all HTML/XML tags from text.
 * Preserves the text content inside tags.
 * Converts block-level tags to newlines before stripping
 * so paragraph breaks are retained naturally.
 *
 * Examples:
 *   <b>hello</b> world   → hello world
 *   <p>foo</p><p>bar</p> → foo\nbar
 *
 * @param {string} text
 * @returns {string}
 */
function stripHtmlTags(text) {
  // Block-level tags → newline before stripping
  const BLOCK_TAGS = /(<\/?(p|div|br|li|tr|h[1-6]|blockquote|pre|hr)[^>]*>)/gi;
  let result = text.replace(BLOCK_TAGS, '\n');

  // Strip all remaining tags
  result = result.replace(/<[^>]+>/g, '');

  return result;
}


// ============================================================
// STEP 3 — REMOVE SCRIPT & STYLE BLOCKS
// ============================================================

/**
 * Removes entire <script> and <style> blocks including their content.
 * These are not caught by the simple tag stripper above because
 * their inner content is not meant to be read as text.
 *
 * @param {string} text
 * @returns {string}
 */
function removeScriptStyle(text) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}


// ============================================================
// STEP 4 — REMOVE AD & TRACKING ARTIFACTS
// ============================================================

/**
 * Strips common copy-paste junk that appears when copying
 * from news sites, blogs, and content platforms:
 *   - "Read more:" / "Click here" type labels
 *   - Cookie/GDPR consent notice fragments
 *   - Social share button text
 *   - URL tracking parameters (utm_*, fbclid, etc.)
 *   - Bare URLs left over after tag stripping
 *
 * @param {string} text
 * @returns {string}
 */
function removeAdArtifacts(text) {
  const PATTERNS = [
    // Lines that START with a junk keyword — catches combined phrases too
    // e.g. "Read more: Click here to subscribe now!"
    /^(read more|click here|subscribe now|sign up|advertisement|sponsored|related:|tags?:|share this|follow us|newsletter)[^\n]*$/gim,

    // GDPR / cookie notice fragments
    /^(we use cookies|by (continuing|using)|accept (all )?cookies|cookie policy|privacy policy)[^.\n]*[.\n]?$/gim,

    // Social share labels (whole line only)
    /^(share on|tweet|pin it|share|like|follow|comment)[:\s]*$/gim,

    // Standalone URLs with tracking params — strip the params only
    /(https?:\/\/[^\s?]+)\?[^\s]*(utm_[^\s&]+|fbclid|gclid|ref|source)[^\s]*/gi,
  ];

  let result = text;
  PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, '');
  });

  return result;
}


// ============================================================
// STEP 5 — NORMALIZE WHITESPACE
// ============================================================

/**
 * Cleans up whitespace artifacts left after HTML stripping:
 *   - Collapses multiple spaces into one
 *   - Collapses 3+ consecutive newlines into 2 (preserve paragraphs)
 *   - Removes trailing spaces from each line
 *   - Removes lines that contain only whitespace
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')                  // multiple spaces/tabs → single space
    .replace(/[ \t]+$/gm, '')                  // trailing whitespace per line
    .replace(/^\s*[\r\n]/gm, '')               // blank/whitespace-only lines
    .replace(/\n{3,}/g, '\n\n');               // 3+ newlines → 2 (paragraph break)
}


// ============================================================
// STEP 6 — NORMALIZE UNICODE CHARACTERS
// ============================================================

/**
 * Replaces typographic / "smart" characters with their standard ASCII
 * equivalents. Useful for pasting into plain text fields, terminals,
 * code editors, or CSV/Excel.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeUnicode(text) {
  const REPLACEMENTS = [
    // Quotes
    [/[\u2018\u2019\u201A\u201B]/g, "'"],   // ' ' ‚ ‛ → '
    [/[\u201C\u201D\u201E\u201F]/g, '"'],   // " " „ ‟ → "
    [/[\u00AB\u00BB]/g,             '"'],   // « » → "

    // Dashes & hyphens
    [/[\u2013\u2014]/g, '-'],               // – — → -
    [/\u2212/g,         '-'],               // − (minus sign) → -
    [/\u2011/g,         '-'],               // ‑ (non-breaking hyphen) → -

    // Ellipsis
    [/\u2026/g, '...'],                     // … → ...

    // Spaces
    [/\u00A0/g, ' '],                       // non-breaking space → regular space
    [/[\u2002\u2003\u2009\u200A]/g, ' '],  // en/em/thin/hair space → space

    // Zero-width characters (invisible junk)
    [/[\u200B\u200C\u200D\uFEFF]/g, ''],   // ZWSP, ZWNJ, ZWJ, BOM → remove

    // Bullets & misc
    [/[\u2022\u2023\u25E6\u2043]/g, '-'],  // •‣◦⁃ → -
    [/\u00B7/g, '-'],                       // · (middle dot) → -
  ];

  let result = text;
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  return result;
}