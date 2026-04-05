// ============================================================
// utils/rephraser.js — QuickClip Rephrase Utility
//
// PHASE 1: Stub implementation.
//   - Returns a lightly processed version of the input text.
//   - No external API calls.
//   - Every swap point is clearly marked with TODO comments.
//
// PHASE 2 upgrade path:
//   1. Choose a provider (OpenAI, Claude, Azure, etc.)
//   2. Add API key handling in storage.js + settings UI
//   3. Replace the body of callRephraseAPI() below
//   4. Nothing else needs to change — the rest of the codebase
//      calls rephraseText() and is unaware of the implementation.
//
// All functions are pure except rephraseText() which is async
// to match the Phase 2 signature from day one.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

// Phase 1: stub mode always active
// Phase 2: set to false and implement callRephraseAPI()
const USE_STUB = true;

// Stub processing delay (ms) — simulates a real API call latency
// so the UI loading state is visible and feels realistic.
const STUB_DELAY_MS = 800;


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Rephrases the given text.
 *
 * Phase 1: Returns a stub-processed version with a notice.
 * Phase 2: Calls a real AI API and returns the result.
 *
 * @param {string} text - Input text to rephrase
 * @returns {Promise<string>} - Rephrased text
 */
export async function rephraseText(text) {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();
  if (!trimmed) return '';

  if (USE_STUB) {
    return runStub(trimmed);
  }

  // Phase 2: real API call
  return callRephraseAPI(trimmed);
}


// ============================================================
// PHASE 1 — STUB IMPLEMENTATION
// ============================================================

/**
 * Simulates rephrasing with basic local transformations:
 *   1. Normalizes punctuation and spacing
 *   2. Trims each sentence
 *   3. Ensures sentences end with punctuation
 *   4. Appends a clear "[Phase 1 stub]" notice
 *
 * This gives the user something useful while making it obvious
 * that real AI rephrasing is not yet active.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
async function runStub(text) {
  // Simulate network latency so the loading state is visible
  await delay(STUB_DELAY_MS);

  let result = text;

  result = normalizeSpacing(result);
  result = capitalizeSentences(result);
  result = ensureTerminalPunctuation(result);

  return `${result}\n\n[Note: AI rephrasing is coming in Phase 2. This is a lightly cleaned version of your text.]`;
}


// ============================================================
// PHASE 2 — REAL API CALL (swap this out)
// ============================================================

/**
 * TODO (Phase 2): Replace this function body with a real API call.
 *
 * Suggested implementation:
 *
 *   const { apiKey } = await getPreferences();
 *
 *   const response = await fetch('https://api.openai.com/v1/chat/completions', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${apiKey}`,
 *     },
 *     body: JSON.stringify({
 *       model: 'gpt-4o-mini',
 *       messages: [
 *         {
 *           role: 'system',
 *           content: 'Rephrase the following text to be clearer and more concise. Return only the rephrased text.',
 *         },
 *         { role: 'user', content: text },
 *       ],
 *       max_tokens: 500,
 *     }),
 *   });
 *
 *   const data = await response.json();
 *   return data.choices?.[0]?.message?.content?.trim() ?? text;
 *
 * For Claude API, the endpoint and body structure differ — see:
 * https://docs.anthropic.com/en/api/messages
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
async function callRephraseAPI(text) {
  // TODO (Phase 2): implement real API call here.
  // This line should never be reached in Phase 1 (USE_STUB = true).
  console.warn('[QuickClip] callRephraseAPI() called but not yet implemented.');
  return text;
}


// ============================================================
// LOCAL TEXT HELPERS (used by stub)
// ============================================================

/**
 * Collapses multiple spaces and normalizes common punctuation spacing.
 *   "hello ,  world"  → "hello, world"
 *   "foo .bar"        → "foo. bar"
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeSpacing(text) {
  return text
    .replace(/[ \t]+/g, ' ')                  // multiple spaces → one
    .replace(/\s+([,;:!?.])/g, '$1')          // space before punctuation → remove
    .replace(/([,;:])(?=[^\s])/g, '$1 ')      // missing space after , ; : → add
    .replace(/([.!?])(?=[A-Z])/g, '$1 ')      // missing space after sentence end
    .trim();
}

/**
 * Capitalizes the first letter of each sentence.
 * Sentences are split on `. `, `! `, `? `.
 *
 * @param {string} text
 * @returns {string}
 */
function capitalizeSentences(text) {
  return text
    .replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, prefix, letter) =>
      prefix + letter.toUpperCase()
    );
}

/**
 * Ensures the text ends with a terminal punctuation mark.
 * If the last non-whitespace character is a letter or digit,
 * appends a period.
 *
 * @param {string} text
 * @returns {string}
 */
function ensureTerminalPunctuation(text) {
  const trimmed = text.trimEnd();
  if (/[a-zA-Z0-9'"]$/.test(trimmed)) {
    return trimmed + '.';
  }
  return trimmed;
}


// ============================================================
// UTILITY
// ============================================================

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}