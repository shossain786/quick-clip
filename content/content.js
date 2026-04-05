// ============================================================
// content/content.js — QuickClip Content Script
// Responsibilities:
//   1. Listen for copy events on every page
//   2. Read the selected text from the clipboard
//   3. Send to background.js for processing (clean + convert)
//   4. Write the processed text back to clipboard
//
// IMPORTANT:
//   - This script runs in the context of every web page.
//   - Keep it lean — no heavy logic here, delegate to background.
//   - Clipboard read/write requires user-initiated events (copy).
//   - Guard every operation so page behavior is never broken.
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const MSG = {
  PROCESS_CLIPBOARD : 'PROCESS_CLIPBOARD',
  GET_PREFERENCES   : 'GET_PREFERENCES',
};

// Minimum character length to bother processing
// (avoids processing single letters or whitespace)
const MIN_TEXT_LENGTH = 3;


// ============================================================
// RUNTIME GUARD
// ============================================================

// On some pages (e.g. chrome:// URLs, PDFs, sandboxed iframes)
// the extension runtime is unavailable. Bail out entirely rather
// than attaching a listener that will always fail.
if (typeof chrome === 'undefined' || !chrome?.runtime?.id) {
  // eslint-disable-next-line no-throw-literal
  throw '[QuickClip] Extension runtime unavailable on this page — skipping.';
}


// ============================================================
// MAIN — COPY EVENT LISTENER
// ============================================================

document.addEventListener('copy', handleCopyEvent, { capture: true });


/**
 * Fires on every Ctrl+C / Cmd+C or right-click → Copy.
 * Reads selected text, sends to background for processing,
 * then replaces clipboard contents with the clean version.
 *
 * @param {ClipboardEvent} event
 */
async function handleCopyEvent(event) {
  try {
    // Step 1: Get selected text
    const selectedText = window.getSelection()?.toString() || '';

    if (selectedText.length < MIN_TEXT_LENGTH) return;

    // Step 2: Check if auto-processing is enabled in preferences
    const prefResponse = await sendToBackground(MSG.GET_PREFERENCES);
    const prefs        = prefResponse?.data;

    // If both autoclean and conversions are off, nothing to do
    if (!prefs || (!prefs.autoclean && !prefs.conversions)) return;

    // Step 3: Send text to background for processing
    const response = await sendToBackground(MSG.PROCESS_CLIPBOARD, {
      text: selectedText,
    });

    if (!response?.success || !response.data) return;

    const processedText = response.data;

    // Step 4: If text was actually changed, override the clipboard
    if (processedText === selectedText) return;

    // Override clipboard using the event's clipboardData
    // This is the cleanest, most browser-safe method during a copy event
    event.preventDefault();
    event.clipboardData.setData('text/plain', processedText);

  } catch (err) {
    // Never let our script break page behaviour
    console.warn('[QuickClip] Copy handler error:', err);
  }
}


// ============================================================
// HELPER — Send message to background.js
// ============================================================

/**
 * Wraps chrome.runtime.sendMessage in a Promise with error handling.
 * Returns null on failure so callers can guard with optional chaining.
 *
 * @param {string} type    - Message type constant
 * @param {Object} payload - Data to send
 * @returns {Promise<Object|null>}
 */
async function sendToBackground(type, payload = {}) {
  try {
    // Guard: runtime may become unavailable if extension is reloaded
    // while the page is still open (common during development)
    if (!chrome?.runtime?.id) return null;

    return await chrome.runtime.sendMessage({ type, payload });
  } catch (err) {
    // Silently swallow — these are expected in two cases:
    //   1. Extension context invalidated after reload
    //   2. No listeners registered yet on startup
    return null;
  }
}