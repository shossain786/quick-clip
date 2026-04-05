// ============================================================
// storage/storage.js — QuickClip Storage Utility
// Responsibilities:
//   1. Persist and retrieve clipboard history (last 10 items)
//   2. Persist and retrieve user preferences
//   3. Provide clear defaults for all preference keys
//
// All chrome.storage calls are isolated here.
// No other file should call chrome.storage directly.
//
// Storage keys:
//   QC_HISTORY  → string[]  (array of last 10 clipboard items)
//   QC_PREFS    → Object    (user preferences)
//
// Adding a new preference:
//   1. Add its key + default value to DEFAULT_PREFS below
//   2. That's it — loadPreferences() and savePreferences() handle the rest
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEYS = {
  HISTORY : 'QC_HISTORY',
  PREFS   : 'QC_PREFS',
};

// Maximum number of history items to retain
const MAX_HISTORY = 10;

/**
 * Default preferences applied on first install or
 * when a key is missing from stored preferences.
 *
 * Keep this as the single source of truth for all preference keys.
 * popup.js, background.js, and content.js all depend on these defaults.
 */
const DEFAULT_PREFS = {
  autoclean      : true,   // Auto Clean Clipboard
  conversions    : true,   // Smart Conversions master toggle
  convertNumbers : true,   // Numbers → words sub-toggle
  convertCurrency: true,   // Currency conversion sub-toggle
  convertDates   : true,   // Date normalization sub-toggle
  rephrase       : false,  // Quick Rephrase (Phase 2 — off by default)
};


// ============================================================
// PUBLIC API — HISTORY
// ============================================================

/**
 * Saves a new item to clipboard history.
 * Deduplicates: if the same text already exists, it is moved to
 * the top instead of being added again.
 * Trims the list to MAX_HISTORY items.
 *
 * @param {string} text - The processed text to save
 * @returns {Promise<void>}
 */
export async function saveToHistory(text) {
  if (!text || typeof text !== 'string') return;

  const trimmed = text.trim();
  if (!trimmed) return;

  const current = await getHistory();

  // Remove duplicate if it already exists
  const deduped = current.filter((item) => item !== trimmed);

  // Add new item at the top
  const updated = [trimmed, ...deduped].slice(0, MAX_HISTORY);

  await chromeSet({ [STORAGE_KEYS.HISTORY]: updated });
}

/**
 * Retrieves the full clipboard history array.
 * Returns an empty array if nothing is stored yet.
 *
 * @returns {Promise<string[]>}
 */
export async function getHistory() {
  const result = await chromeGet(STORAGE_KEYS.HISTORY);
  return Array.isArray(result) ? result : [];
}

/**
 * Wipes all clipboard history.
 *
 * @returns {Promise<void>}
 */
export async function clearHistory() {
  await chromeSet({ [STORAGE_KEYS.HISTORY]: [] });
}


// ============================================================
// PUBLIC API — PREFERENCES
// ============================================================

/**
 * Retrieves stored preferences, merged with DEFAULT_PREFS.
 * Any key missing from storage will fall back to its default value.
 * This makes adding new preferences backward-compatible.
 *
 * @returns {Promise<Object>} - Full preferences object
 */
export async function getPreferences() {
  const stored = await chromeGet(STORAGE_KEYS.PREFS);
  const prefs  = (stored && typeof stored === 'object') ? stored : {};

  // Merge stored values over defaults so new keys always have a value
  return { ...DEFAULT_PREFS, ...prefs };
}

/**
 * Saves preferences to storage.
 * Performs a partial merge — only the keys in `updates` are changed.
 * Unspecified keys retain their current stored values.
 *
 * @param {Object} updates - Partial preferences object to merge in
 * @returns {Promise<void>}
 */
export async function savePreferences(updates = {}) {
  const current = await getPreferences();
  const merged  = { ...current, ...updates };
  await chromeSet({ [STORAGE_KEYS.PREFS]: merged });
}


// ============================================================
// PRIVATE HELPERS — chrome.storage.local wrappers
// ============================================================

/**
 * Promisified wrapper for chrome.storage.local.get.
 * Returns the value for the given key, or null if not found.
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
function chromeGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[key] ?? null);
      }
    });
  });
}

/**
 * Promisified wrapper for chrome.storage.local.set.
 *
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
function chromeSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}