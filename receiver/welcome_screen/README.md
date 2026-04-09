# Welcome Screen Plugin for OpenWebRX+

**Author:** 9A6NDZ (Zoran)  
**Version:** 1.0  
**License:** MIT  
**Repository:** [github.com/9A6NDZ/Openwebrx-plugins](https://github.com/9A6NDZ/Openwebrx-plugins)

---

## Description

A welcome overlay that greets visitors and requires them to enter their **callsign** before accessing the SDR receiver.

**Features:**

- Full-screen welcome overlay with animated radio-wave background
- Callsign input with automatic uppercase and format validation
- Saves callsign to `localStorage` — returning users skip the overlay
- Automatically populates the OWRX+ **Settings** callsign field
- Automatically populates the **Chat** name field
- Small floating badge shows current callsign with a one-click "change" option
- Fully responsive (mobile and desktop)
- Dark, SDR-themed design matching the OWRX+ aesthetic

---

## Screenshot

When a new visitor opens the receiver, they see:

```
┌──────────────────────────────────────┐
│         📡 (antenna icon)            │
│                                      │
│    Welcome to my OWRX SDR            │
│  Please enter your callsign          │
│                                      │
│  ┌──────────────┐  ┌───────────┐     │
│  │  e.g. 9A6NDZ │  │ Enter SDR │     │
│  └──────────────┘  └───────────┘     │
│                                      │
└──────────────────────────────────────┘
```

---

## Installation

### From GitHub (remote load)

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');
```

**Full example `init.js`:**

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Welcome screen — load BEFORE other plugins
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');

  // ... other plugins ...
})();
```

### Local installation

1. Copy the `welcome_screen/` folder into your OWRX+ plugins directory:

```bash
export OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
cp -r welcome_screen "$OWRX_FOLDER/plugins/receiver/"
```

2. Add to your `init.js`:

```javascript
await Plugins.load('welcome_screen');
```

---

## Configuration

You can customize the plugin by setting options in `init.js` **before** loading it:

```javascript
// Optional: customize before loading
Plugins.welcome_screen_config = {
  title:            'Welcome to 9A6NDZ SDR',
  subtitle:         'Enter your callsign to start listening',
  placeholder:      'e.g. 9A1ABC',
  buttonText:       'Start Listening',
  minCallLength:    3,
  maxCallLength:    12,
  showChangeButton: true,
  rememberDays:     365,
};

await Plugins.load('welcome_screen');
```

### Available options

| Option | Default | Description |
|---|---|---|
| `title` | `'Welcome to my OWRX SDR'` | Main heading text |
| `subtitle` | `'Please enter your callsign to continue'` | Text below the title |
| `placeholder` | `'e.g. 9A6NDZ'` | Input placeholder |
| `buttonText` | `'Enter SDR'` | Submit button label |
| `minCallLength` | `3` | Minimum callsign length |
| `maxCallLength` | `12` | Maximum callsign length |
| `callsignPattern` | Standard HAM regex | Regex for validation |
| `showChangeButton` | `true` | Show floating "change" badge |
| `rememberDays` | `365` | Days to remember (0 = session) |

---

## How It Works

1. On page load, the plugin checks `localStorage` for a saved callsign
2. **New visitor:** Shows the welcome overlay; the SDR interface is hidden behind it
3. **Returning visitor:** Skips the overlay and injects the saved callsign into Settings/Chat fields
4. When the callsign is submitted:
   - Saved to `localStorage` key `openwebrx-callsign` (same key OWRX+ chat uses)
   - Saved into the `openwebrx-settings` JSON object
   - Injected into any visible Settings or Chat input fields
   - A MutationObserver watches for late-rendered panels and fills them too
5. A small badge in the top-right shows the active callsign with a pencil icon to change it

---

## Files

```
welcome_screen/
├── welcome_screen.js    — Plugin logic
├── welcome_screen.css   — Styles (auto-loaded by OWRX+ plugin system)
└── README.md            — This file
```

---

## Compatibility

- OpenWebRX+ 1.2.x and newer
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Works with both package installs and Docker deployments

---

## Support

For questions or issues, contact **9A6NDZ** or open an issue on the [GitHub repository](https://github.com/9A6NDZ/Openwebrx-plugins).

73 de 9A6NDZ!
