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

Set zoom levels in `init.js` **before** loading the plugin using `window.default_zoom_profiles`:

```javascript
window.default_zoom_profiles = {
  'c8f69a96-...|1b7db61e-...':  5,   // specific profile by UUID
  '*':                          3,   // fallback for all others
};
await Plugins.load('default_zoom');
```

### Options

| Option | Default | Description |
|---|---|---|
| `window.default_zoom_profiles` | `{}` | Map of profile ID → zoom level (0–14) |
| `window.default_zoom_delay` | `800` | Milliseconds to wait after profile switch before applying zoom |

### Profile ID format

OpenWebRX+ uses UUIDs internally. The profile ID used by this plugin is:

```
<sdr_uuid>|<profile_uuid>
```

For example:
```
c8f69a96-50da-4151-acf4-1cc2a3f3985f|1b7db61e-3d3f-477b-91e8-672ec02879da
```

### Profile ID matching

The plugin matches in this order:

1. **Exact match** — full `sdr_uuid|profile_uuid` string
2. **Substring match** — any part of the ID (e.g. just the profile UUID)
3. **Wildcard** — `'*'` matches all profiles not matched above

This means you can use just the profile UUID as a shortcut:

```javascript
window.default_zoom_profiles = {
  '1b7db61e-3d3f-477b-91e8-672ec02879da': 5,
};
```

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

Open F12 → Console and type:

```javascript
currentprofile.sdr_id + '|' + currentprofile.profile_id
```

This prints the exact ID string to use in your config.

Or check your settings file:

```bash
cat /var/lib/openwebrx/settings.json | python3 -m json.tool
```

Look for the UUID keys under `"sdrs"` → device → `"profiles"`.

### Full init.js example

```javascript
const rp_url = 'https://0xaf.github.io/openwebrxplus-plugins/receiver';
const my_url = 'https://9a6ndz.github.io/Openwebrx-plugins/receiver';

Plugins.load(rp_url + '/utils/utils.js').then(async function () {

  await Plugins.load(rp_url + '/notify/notify.js');

  // --- DEFAULT ZOOM ---
  window.default_zoom_profiles = {
    'c8f69a96-50da-4151-acf4-1cc2a3f3985f|1b7db61e-3d3f-477b-91e8-672ec02879da': 5,  // RX04 HAM | 40M
    // '*': 3,   // uncomment for a global fallback
  };
  // window.default_zoom_delay = 800;
  await Plugins.load(my_url + '/default_zoom/default_zoom.js');

  // --- OTHER PLUGINS ---
  // await Plugins.load(rp_url + '/smeter/smeter.js');
  // await Plugins.load(rp_url + '/doppler/doppler.js');
})();
```

## No dependencies

This plugin is **fully standalone**. It does not require utils, notify, or any other plugin. It uses three detection methods to ensure it always works:

1. **Dropdown listener** — watches the profile selector for changes
2. **DOM observer** — waits for the UI to load if it's not ready yet
3. **Polling failsafe** — checks for profile changes every 2 seconds

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
