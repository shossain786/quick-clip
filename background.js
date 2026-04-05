// ============================================================
// background.js — QuickClip Service Worker
// Responsibilities:
//   1. Listen for messages from content.js and popup.js
//   2. Delegate to appropriate handler
//   3. Respond back to caller
//
// NOTE: This file intentionally stays thin.
//       All logic lives in utils/ and storage/.
//       Add new message types in the MESSAGE HANDLERS section.
// ============================================================

import { cleanText }    from './utils/cleaner.js';
import { convertText }  from './utils/converter.js';
import { rephraseText } from './utils/rephraser.js';
import {
  saveToHistory,
  getHistory,
  clearHistory,
  getPreferences,
  savePreferences,
} from './storage/storage.js';


// ============================================================
// CONSTANTS
// ============================================================

const MSG = {
  // Inbound from content.js / popup.js
  PROCESS_CLIPBOARD : 'PROCESS_CLIPBOARD',   // clean + convert copied text
  REPHRASE          : 'REPHRASE',            // rephrase text (Phase 1: stub)
  GET_HISTORY       : 'GET_HISTORY',         // fetch clipboard history
  CLEAR_HISTORY     : 'CLEAR_HISTORY',       // wipe clipboard history
  GET_PREFERENCES   : 'GET_PREFERENCES',     // fetch user settings
  SAVE_PREFERENCES  : 'SAVE_PREFERENCES',    // persist user settings
};


// ============================================================
// MAIN MESSAGE LISTENER
// ============================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // All handlers are async; we return true to keep the message
  // channel open until sendResponse is called.
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('[QuickClip] Background error:', err);
      sendResponse({ success: false, error: err.message });
    });

  return true; // Required for async sendResponse
});


// ============================================================
// MESSAGE HANDLERS
// ============================================================

/**
 * Routes incoming messages to the correct handler.
 * @param {Object} message - { type, payload }
 * @returns {Promise<Object>} - { success, data?, error? }
 */
async function handleMessage(message) {
  const { type, payload } = message;

  switch (type) {

    case MSG.PROCESS_CLIPBOARD:
      return handleProcessClipboard(payload);

    case MSG.REPHRASE:
      return handleRephrase(payload);

    case MSG.GET_HISTORY:
      return handleGetHistory();

    case MSG.CLEAR_HISTORY:
      return handleClearHistory();

    case MSG.GET_PREFERENCES:
      return handleGetPreferences();

    case MSG.SAVE_PREFERENCES:
      return handleSavePreferences(payload);

    default:
      return { success: false, error: `Unknown message type: ${type}` };
  }
}


// ------------------------------------------------------------
// Handler: Process clipboard text (clean and/or convert)
// ------------------------------------------------------------

/**
 * @param {{ text: string, skipClean: boolean, skipConvert: boolean }} payload
 *
 * skipClean   — when true, formatting cleanup is skipped (Convert button)
 * skipConvert — when true, smart conversions are skipped (Clean button)
 */
async function handleProcessClipboard({ text, skipClean = false, skipConvert = false } = {}) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'No text provided.' };
  }

  const prefs = await getPreferences();

  let processed = text;

  // Step 1: Clean formatting
  // Runs when autoclean is enabled in prefs AND caller did not skip it
  if (prefs.autoclean && !skipClean) {
    processed = cleanText(processed);
  }

  // Step 2: Smart conversions
  // Runs when conversions are enabled in prefs AND caller did not skip it
  if (prefs.conversions && !skipConvert) {
    processed = convertText(processed, {
      numbers    : prefs.convertNumbers,
      currency   : prefs.convertCurrency,
      dates      : prefs.convertDates,
    });
  }

  // Step 3: Save to history
  await saveToHistory(processed);

  return { success: true, data: processed };
}


// ------------------------------------------------------------
// Handler: Rephrase text (Phase 1 stub)
// ------------------------------------------------------------

/**
 * @param {{ text: string }} payload
 */
async function handleRephrase({ text } = {}) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'No text provided.' };
  }

  const rephrased = await rephraseText(text);

  // Save rephrased version to history as well
  await saveToHistory(rephrased);

  return { success: true, data: rephrased };
}


// ------------------------------------------------------------
// Handler: Get clipboard history
// ------------------------------------------------------------

async function handleGetHistory() {
  const history = await getHistory();
  return { success: true, data: history };
}


// ------------------------------------------------------------
// Handler: Clear clipboard history
// ------------------------------------------------------------

async function handleClearHistory() {
  await clearHistory();
  return { success: true };
}


// ------------------------------------------------------------
// Handler: Get user preferences
// ------------------------------------------------------------

async function handleGetPreferences() {
  const prefs = await getPreferences();
  return { success: true, data: prefs };
}


// ------------------------------------------------------------
// Handler: Save user preferences
// ------------------------------------------------------------

/**
 * @param {Object} payload - Partial or full preferences object
 */
async function handleSavePreferences(payload = {}) {
  await savePreferences(payload);
  return { success: true };
}


// ============================================================
// EXTENSION LIFECYCLE
// ============================================================

// Runs once when extension is first installed or updated
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[QuickClip] Extension installed. Setting default preferences.');
    savePreferences({}); // triggers defaults inside storage.js
  }

  if (reason === 'update') {
    console.log('[QuickClip] Extension updated.');
  }
});