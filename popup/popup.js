// ============================================================
// popup.js — QuickClip Popup Controller
// Responsibilities:
//   1. Tab navigation
//   2. Theme toggle (light / dark) with persistence
//   3. Clipboard panel — clean, convert, rephrase actions
//   4. History panel — render, copy item, clear all
//   5. Settings panel — load & save preferences
//   6. All chrome.runtime.sendMessage calls to background.js
//
// Pattern: Each section is a self-contained init function.
//          initApp() wires everything together on DOMContentLoaded.
// ============================================================


// ============================================================
// CONSTANTS — Message types (must match background.js MSG)
// ============================================================

const MSG = {
  PROCESS_CLIPBOARD : 'PROCESS_CLIPBOARD',
  REPHRASE          : 'REPHRASE',
  GET_HISTORY       : 'GET_HISTORY',
  CLEAR_HISTORY     : 'CLEAR_HISTORY',
  GET_PREFERENCES   : 'GET_PREFERENCES',
  SAVE_PREFERENCES  : 'SAVE_PREFERENCES',
};

// Storage key for theme preference
const THEME_KEY = 'qc_theme';


// ============================================================
// ENTRY POINT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initClipboardPanel();
  initHistoryPanel();
  initSettingsPanel();
});


// ============================================================
// SECTION 1 — THEME
// ============================================================

function initTheme() {
  const html       = document.documentElement;
  const toggleBtn  = document.getElementById('qc-theme-toggle');
  const themeIcon  = document.getElementById('qc-theme-icon');

  // Load saved theme or default to light
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);

  toggleBtn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next    = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}


// ============================================================
// SECTION 2 — TAB NAVIGATION
// ============================================================

function initTabs() {
  const tabs   = document.querySelectorAll('.qc-tab');
  const panels = document.querySelectorAll('.qc-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Update tab states
      tabs.forEach((t) => {
        t.classList.toggle('qc-tab--active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });

      // Show matching panel, hide others
      panels.forEach((panel) => {
        const isTarget = panel.id === `panel-${target}`;
        panel.hidden = !isTarget;
      });

      // Refresh history list every time the tab is opened
      if (target === 'history') {
        loadHistory();
      }
    });
  });
}


// ============================================================
// SECTION 3 — CLIPBOARD PANEL
// ============================================================

function initClipboardPanel() {
  const input       = document.getElementById('qc-input');
  const btnClean    = document.getElementById('btn-clean');
  const btnConvert  = document.getElementById('btn-convert');
  const btnRephrase = document.getElementById('btn-rephrase');
  const btnCopy     = document.getElementById('btn-copy-result');
  const outputGroup = document.getElementById('qc-output-group');
  const outputEl    = document.getElementById('qc-output');

  // --- Clean button ---
  btnClean.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return showStatus('Please enter some text first.', 'error');

    setButtonLoading(btnClean, true);

    const response = await sendMessage(MSG.PROCESS_CLIPBOARD, { text });

    setButtonLoading(btnClean, false);

    if (response?.success) {
      showOutput(response.data, outputGroup, outputEl);
      showStatus('✓ Text cleaned successfully.', 'success');
    } else {
      showStatus(response?.error || 'Something went wrong.', 'error');
    }
  });

  // --- Convert button ---
  btnConvert.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return showStatus('Please enter some text first.', 'error');

    setButtonLoading(btnConvert, true);

    // Send with a flag so background skips cleaning, only converts
    const prefs    = await sendMessage(MSG.GET_PREFERENCES);
    const response = await sendMessage(MSG.PROCESS_CLIPBOARD, {
      text,
      skipClean: true,
      prefs: prefs?.data,
    });

    setButtonLoading(btnConvert, false);

    if (response?.success) {
      showOutput(response.data, outputGroup, outputEl);
      showStatus('✓ Conversions applied.', 'success');
    } else {
      showStatus(response?.error || 'Something went wrong.', 'error');
    }
  });

  // --- Rephrase button ---
  btnRephrase.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return showStatus('Please enter some text first.', 'error');

    setButtonLoading(btnRephrase, true);

    const response = await sendMessage(MSG.REPHRASE, { text });

    setButtonLoading(btnRephrase, false);

    if (response?.success) {
      showOutput(response.data, outputGroup, outputEl);
      showStatus('✓ Text rephrased.', 'success');
    } else {
      showStatus(response?.error || 'Something went wrong.', 'error');
    }
  });

  // --- Copy result button ---
  btnCopy.addEventListener('click', async () => {
    const text = outputEl.textContent;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const original     = btnCopy.textContent;
      btnCopy.textContent = '✓ Copied!';
      setTimeout(() => { btnCopy.textContent = original; }, 1500);
    } catch {
      showStatus('Could not copy to clipboard.', 'error');
    }
  });
}


// ============================================================
// SECTION 4 — HISTORY PANEL
// ============================================================

function initHistoryPanel() {
  const btnClear = document.getElementById('btn-clear-history');

  btnClear.addEventListener('click', async () => {
    const confirmed = confirm('Clear all clipboard history?');
    if (!confirmed) return;

    await sendMessage(MSG.CLEAR_HISTORY);
    loadHistory();
  });
}

/**
 * Fetches history from background and renders it.
 * Called on tab open and after clear.
 */
async function loadHistory() {
  const listEl   = document.getElementById('qc-history-list');
  const emptyEl  = document.getElementById('qc-history-empty');
  const response = await sendMessage(MSG.GET_HISTORY);

  const items = response?.data || [];

  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.hidden  = true;
    emptyEl.hidden = false;
    return;
  }

  listEl.hidden  = false;
  emptyEl.hidden = true;

  items.forEach((text) => {
    const li = buildHistoryItem(text);
    listEl.appendChild(li);
  });
}

/**
 * Builds a single history list item element.
 * @param {string} text
 * @returns {HTMLLIElement}
 */
function buildHistoryItem(text) {
  const li = document.createElement('li');
  li.className = 'qc-history-item';
  li.title     = text; // Full text on hover

  const textSpan = document.createElement('span');
  textSpan.className   = 'qc-history-item__text';
  textSpan.textContent = text;

  const copySpan = document.createElement('span');
  copySpan.className   = 'qc-history-item__copy';
  copySpan.textContent = '📋';

  li.appendChild(textSpan);
  li.appendChild(copySpan);

  // Click anywhere on item to copy
  li.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      copySpan.textContent = '✓';
      setTimeout(() => { copySpan.textContent = '📋'; }, 1500);
    } catch {
      // silently fail — clipboard may not be available in all contexts
    }
  });

  return li;
}


// ============================================================
// SECTION 5 — SETTINGS PANEL
// ============================================================

function initSettingsPanel() {
  // Map of checkbox id → preference key
  const PREF_MAP = {
    'pref-autoclean'  : 'autoclean',
    'pref-conversions': 'conversions',
    'pref-numbers'    : 'convertNumbers',
    'pref-currency'   : 'convertCurrency',
    'pref-dates'      : 'convertDates',
  };

  const subRows = {
    'pref-conversions': [
      document.getElementById('sub-numbers'),
      document.getElementById('sub-currency'),
      document.getElementById('sub-dates'),
    ],
  };

  // Load and apply saved preferences to checkboxes
  loadPreferences(PREF_MAP, subRows);

  // Save on any toggle change
  Object.entries(PREF_MAP).forEach(([id, prefKey]) => {
    const checkbox = document.getElementById(id);
    if (!checkbox || checkbox.disabled) return;

    checkbox.addEventListener('change', async () => {
      await sendMessage(MSG.SAVE_PREFERENCES, { [prefKey]: checkbox.checked });

      // Enable/disable sub-rows when parent conversions toggle changes
      if (id === 'pref-conversions') {
        toggleSubRows(subRows['pref-conversions'], checkbox.checked);
      }
    });
  });
}

/**
 * Fetches preferences and sets checkbox states.
 */
async function loadPreferences(prefMap, subRows) {
  const response = await sendMessage(MSG.GET_PREFERENCES);
  const prefs    = response?.data || {};

  Object.entries(prefMap).forEach(([id, prefKey]) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;
    checkbox.checked = !!prefs[prefKey];
  });

  // Set initial sub-row state based on conversions pref
  const conversionsOn = !!prefs.conversions;
  toggleSubRows(subRows['pref-conversions'], conversionsOn);
}

/**
 * Enables or disables sub-setting rows.
 * @param {HTMLElement[]} rows
 * @param {boolean} enabled
 */
function toggleSubRows(rows, enabled) {
  rows.forEach((row) => {
    row.classList.toggle('qc-disabled', !enabled);
  });
}


// ============================================================
// HELPERS
// ============================================================

/**
 * Sends a message to background.js and returns the response.
 * @param {string} type
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function sendMessage(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, payload });
  } catch (err) {
    console.error(`[QuickClip] sendMessage error (${type}):`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Shows the result output area with given text.
 * @param {string} text
 * @param {HTMLElement} groupEl
 * @param {HTMLElement} outputEl
 */
function showOutput(text, groupEl, outputEl) {
  outputEl.textContent = text;
  groupEl.hidden       = false;
}

/**
 * Shows a status message with a given type, auto-hides after 3s.
 * @param {string} message
 * @param {'success'|'error'} type
 */
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('qc-status');

  statusEl.textContent = message;
  statusEl.className   = `qc-status qc-status--${type}`;
  statusEl.hidden      = false;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusEl.hidden = true;
  }, 3000);
}

/**
 * Sets a button into loading state with a spinner label.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 */
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML            = '<span class="qc-btn__icon">⏳</span> Working…';
    btn.disabled             = true;
  } else {
    btn.innerHTML  = btn.dataset.originalText || btn.innerHTML;
    btn.disabled   = false;
  }
}