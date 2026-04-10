# Default Zoom Plugin for OpenWebRX+

A plugin that sets the **default waterfall zoom level per SDR profile**. No more manual zooming every time you switch profiles.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-Plugin-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## What it does

When a profile loads, the waterfall automatically zooms to your configured level. Each profile can have its own zoom setting. Users can still zoom in and out freely — this only sets the *initial* zoom.

Perfect for RTL-SDR setups where you run a wide sample rate (e.g. 2.4 MHz) but only want to display a narrower portion of the spectrum by default.

## Screenshot

```
Without plugin:                          With plugin (zoom level 6):
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ ▓░▒▓░░░▒▓▓░░▒░░░▓▓▒░░▒▓░▒▓░ │        │                               │
│ ░▒▓▓░░▒░▓▓░▒░▓░▒▓░░▒▓░▒░░▒░ │        │      ▓▓▒▒▓▓░░▒▒▓▓▒▒▓▓        │
│ ▓░░▒▓░▒░░▓▓▒░▒▓░░▒▓░▒▓▒░░▒▓ │        │      ░▒▓▓░░▒▒▓▓░░▒▒▓▓        │
│ ░▒▓░▒▓░░▒░▓▓░▒░▒▓░▒▓░░▒▓░▒░ │        │      ▓▓▒░░▒▓▓▒▒░░▒▓▓▒        │
│◄──────── 2.4 MHz ──────────► │        │      ◄──── ~350 kHz ────►      │
│  full bandwidth, no zoom      │        │  zoomed to your band of interest│
└───────────────────────────────┘        └───────────────────────────────┘
```

## Installation

### Remote (from GitHub Pages)

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/default_zoom/default_zoom.js');
```

### Local

Copy the file to your OWRX+ plugins folder:

```bash
OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
mkdir -p "$OWRX_FOLDER/plugins/receiver/default_zoom"
cp default_zoom.js "$OWRX_FOLDER/plugins/receiver/default_zoom/"
```

Then add to your `init.js`:

```javascript
await Plugins.load('default_zoom');
```

### Docker

Make sure your plugins folder is mounted:

```yaml
volumes:
  - /opt/owrx-docker/plugins:/usr/lib/python3/dist-packages/htdocs/plugins
```

Then copy the file and edit `init.js` as described above.

## Configuration

Set zoom levels per profile in `init.js` **before** loading the plugin:

```javascript
Plugins.default_zoom = Plugins.default_zoom || {};
Plugins.default_zoom.profiles = {
  'rtlsdr|20m':  6,   // ~350 kHz visible
  'rtlsdr|40m':  5,   // ~500 kHz visible
  'rtlsdr|FM':   0,   // no zoom, full bandwidth
};
await Plugins.load('default_zoom');
```

### Options

| Option | Default | Description |
|---|---|---|
| `profiles` | `{}` | Map of profile ID → zoom level (0–14) |
| `delay` | `500` | Milliseconds to wait after profile switch before applying zoom. Increase on slow hardware. |

### Profile ID matching

The plugin matches in this order:

1. **Exact match** — `'rtlsdr|20m'` matches profile ID `rtlsdr|20m`
2. **Substring match** — `'20m'` matches any profile containing `20m`
3. **Wildcard** — `'*'` matches all profiles not matched above

### Zoom level reference

Approximate visible bandwidth for a 2.4 MHz RTL-SDR setup:

| Level | Visible bandwidth |
|---|---|
| 0 | ~2400 kHz (full, no zoom) |
| 1 | ~1800 kHz |
| 2 | ~1400 kHz |
| 3 | ~1000 kHz |
| 4 | ~750 kHz |
| 5 | ~500 kHz |
| 6 | ~350 kHz |
| 7 | ~250 kHz |
| 8 | ~180 kHz |
| 9 | ~120 kHz |
| 10 | ~80 kHz |
| 11–14 | progressively narrower |

> Actual values depend on screen width and `samp_rate`. Experiment and adjust.

### How to find your profile IDs

Open the browser console (F12) and switch profiles. Look for:
```
[default_zoom] Applied zoom level: 6
```

Or enable full debug logging:
```javascript
Plugins._enable_debug = true;
Plugins.utils._DEBUG_ALL_EVENTS = true;
```

Or check your settings file:
```bash
cat /var/lib/openwebrx/settings.json | python3 -m json.tool | grep -A2 '"profiles"'
```

### Full init.js example

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Default zoom
  Plugins.default_zoom = Plugins.default_zoom || {};
  Plugins.default_zoom.profiles = {
    'rtlsdr|20m':     6,
    'rtlsdr|40m':     5,
    'rtlsdr|80m':     4,
    'rtlsdr|2m':      3,
    'rtlsdr|70cm':    3,
    'rtlsdr|FM':      0,
    'rtlsdr|Airband': 4,
    // '*':            3,   // uncomment for a global fallback
  };
  // Plugins.default_zoom.delay = 500;
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/default_zoom/default_zoom.js');

  // Other plugins...
})();
```

## Dependencies

- [utils](https://0xaf.github.io/openwebrxplus-plugins/receiver/utils) plugin (>= 0.1)

## Files

```
default_zoom/
├── default_zoom.js
└── README.md
```

Single JavaScript file, no CSS needed. All logic is client-side only — no server settings are modified and other users are not affected.

## Compatibility

- OpenWebRX+ 1.2.x and newer
- All modern browsers
- Works with package installs, Docker, and Raspberry Pi images

## Author

**9A6NDZ** (Zoran)

## License

MIT

---

73 de 9A6NDZ!
