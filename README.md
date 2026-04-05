# QuickClip ✂️

> **Copy smarter, paste cleaner.**

QuickClip is an open-source Chrome and Edge extension that automates your copy-paste workflow — stripping junk formatting, converting numbers, currencies, and dates, and preparing text for wherever it's going next.

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-Manifest%20V3-0078D7?logo=microsoftedge&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-ff6600)
![Version](https://img.shields.io/badge/Version-1.0.0-ff6600)

---

## Why QuickClip?

Every time you copy text from the web, you get invisible baggage — HTML tags, inline styles, tracking junk, smart quotes, zero-width characters, and broken formatting. QuickClip intercepts your copy event and silently hands back clean text before it ever hits your clipboard.

---

## Features

### ✅ Phase 1 (Current)

| Feature | What it does |
|---|---|
| **Auto Clean Clipboard** | Strips HTML tags, CSS, inline styles, ad artifacts, and invisible Unicode characters |
| **Numbers to Words** | Converts integers to English — `42` → `forty-two` |
| **Currency Conversion** | Converts ₹ ↔ $ at a fixed rate — `₹500` → `₹500 ($6.00)` |
| **Date Normalization** | Converts common date formats to ISO 8601 — `15/08/2024` → `2024-08-15` |
| **Clipboard History** | Stores your last 10 processed items, persisted across sessions |
| **Light & Dark Mode** | Full theme support with your preference remembered |
| **Per-feature Toggles** | Turn any feature on or off independently |

### 🔜 Phase 2 (Planned)

- **AI-powered Rephrase** — tone options: Formal, Casual, Summarize
- **Context-Aware Paste** — auto-adjusts formatting for Docs, Excel, Email
- **Live Currency Rates** — real-time ₹ ↔ $ via exchange rate API
- **Locale setting** — resolve DD/MM vs MM/DD date ambiguity

---

## Installation

### From Source (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/shossain786/quick-clip.git
   cd quick-clip
   ```

2. Open your browser and navigate to the extensions page:
   - **Chrome:** `chrome://extensions`
   - **Edge:** `edge://extensions`

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `quickclip-extension/` folder.

5. The QuickClip icon will appear in your toolbar. Pin it for quick access.

> No build step required. No dependencies to install. Pure vanilla JS.

### From the Web Store

Coming soon to the Chrome Web Store and Microsoft Edge Add-ons.

---

## Usage

### Automatic (on every copy)

Just copy text normally — QuickClip processes it in the background based on your active settings. If cleaning or conversion is enabled, your clipboard will silently receive the cleaned version.

### Manual (via popup)

1. Click the QuickClip icon in your toolbar.
2. Paste or type text in the **Clipboard** tab.
3. Hit **Clean**, **Convert**, or **Rephrase**.
4. Click **Copy** to grab the result.

### History

Switch to the **History** tab to see your last 10 processed items. Click any item to copy it back to your clipboard instantly.

### Settings

Use the **Settings** tab to toggle individual features on or off. Sub-toggles for Numbers, Currency, and Dates are available under the Smart Conversions master switch.

---

## Project Structure

```
quickclip-extension/
│
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker — message router
│
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Styles with light/dark theme variables
│   └── popup.js               # Popup controller — tabs, actions, settings
│
├── content/
│   └── content.js             # Content script — intercepts copy events
│
├── utils/
│   ├── cleaner.js             # HTML stripping, whitespace, Unicode cleanup
│   ├── converter.js           # Number, currency, and date conversions
│   └── rephraser.js           # Rephrase stub (Phase 2 swap point)
│
├── storage/
│   └── storage.js             # All chrome.storage calls — history + prefs
│
└── icons/
    ├── icon.svg               # Source icon (master)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Architecture

QuickClip follows a clean separation of concerns:

```
Page copy event
      │
      ▼
 content.js         ← thin layer, no logic
      │  sendMessage
      ▼
 background.js      ← routes messages, orchestrates steps
      │
      ├── cleaner.js      ← pure functions, no side effects
      ├── converter.js    ← pure functions, no side effects
      ├── rephraser.js    ← async, swap-ready for Phase 2
      └── storage.js      ← all chrome.storage in one place
```

All utility files (`utils/`, `storage/`) are pure and side-effect free — they're independently testable without a browser environment.

---

## Configuration

All settings are controlled via the popup UI and persisted automatically. Default values on first install:

| Setting | Default |
|---|---|
| Auto Clean | ✅ On |
| Smart Conversions | ✅ On |
| Numbers to Words | ✅ On |
| Currency Conversion | ✅ On |
| Date Normalization | ✅ On |
| Quick Rephrase | ❌ Off (Phase 2) |

### Currency Exchange Rate

The Phase 1 fixed rate is set in `utils/converter.js`:

```js
const EXCHANGE = {
  INR_TO_USD: 0.012,  // update as needed
  USD_TO_INR: 83.5,   // update as needed
};
```

---

## Permissions

QuickClip requests only what it needs:

| Permission | Why |
|---|---|
| `clipboardRead` | To read selected text on copy |
| `clipboardWrite` | To write the cleaned text back |
| `activeTab` | To detect the current page context |
| `storage` | To persist history and preferences |
| `scripting` | To inject the content script |

No data is ever sent to external servers in Phase 1. Everything runs locally in your browser.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes — keep files focused and well-commented.
4. Test in both Chrome and Edge with Developer mode.
5. Open a pull request with a clear description of what changed and why.

### Good first issues to tackle

- Add a locale setting (DD/MM vs MM/DD date preference)
- Support more currency pairs
- Add unit tests for `cleaner.js` and `converter.js`
- Improve the number-to-words range beyond 999,999

---

## Roadmap

- [x] Auto Clean Clipboard
- [x] Smart Conversions (numbers, currency, dates)
- [x] Clipboard History (last 10, persisted)
- [x] Light & Dark mode
- [x] Per-feature toggles
- [ ] Chrome Web Store listing
- [ ] Edge Add-ons listing
- [ ] AI Rephrase (Phase 2)
- [ ] Context-Aware Paste (Phase 2)
- [ ] Live exchange rates (Phase 2)
- [ ] Locale preference for date format (Phase 2)

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

---

## Privacy Policy

See the full [Privacy Policy](https://shossain786.github.io/quick-clip/privacy.html).

---

## Author

Built by [@shossain786](https://github.com/shossain786).  
Found a bug or have a feature idea? [Open an issue](https://github.com/shossain786/quick-clip/issues).
