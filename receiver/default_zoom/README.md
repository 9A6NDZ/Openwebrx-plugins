# Default Zoom Plugin for OpenWebRX+

A plugin that sets the **default waterfall zoom level per SDR profile**. No more manual zooming every time you switch profiles.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-Plugin-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## What it does

When a profile loads, the waterfall automatically zooms to your configured level. Each profile can have its own zoom setting. Users can still zoom in and out freely — this only sets the *initial* zoom.

When switching to a profile that is not in the config, the zoom resets to full bandwidth automatically.

Perfect for RTL-SDR setups where you run a wide sample rate (e.g. 2.4 MHz) but only want to display a narrower portion of the spectrum by default.

## Screenshot

```
Without plugin:                          With plugin (zoom level 5):
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ ▓░▒▓░░░▒▓▓░░▒░░░▓▓▒░░▒▓░▒▓░ │        │                               │
│ ░▒▓▓░░▒░▓▓░▒░▓░▒▓░░▒▓░▒░░▒░ │        │      ▓▓▒▒▓▓░░▒▒▓▓▒▒▓▓        │
│ ▓░░▒▓░▒░░▓▓▒░▒▓░░▒▓░▒▓▒░░▒▓ │        │      ░▒▓▓░░▒▒▓▓░░▒▒▓▓        │
│ ░▒▓░▒▓░░▒░▓▓░▒░▒▓░▒▓░░▒▓░▒░ │        │      ▓▓▒░░▒▓▓▒▒░░▒▓▓▒        │
│◄──────── 2.4 MHz ──────────► │        │      ◄──── ~500 kHz ────►      │
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
  'c8f69a96-50da-4151-acf4-1cc2a3f3985f|1b7db61e-3d3f-477b-91e8-672ec02879da': 5,
};
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/default_zoom/default_zoom.js');
```

Only profiles listed in the config will be zoomed. All other profiles automatically reset to full bandwidth (zoom level 0).

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

Open your browser's developer console (F12 → Console tab) while OpenWebRX+ is running. Switch to the profile you want to configure, then use these commands:

**Get the ready-to-use profile ID string:**

```javascript
currentprofile.sdr_id + '|' + currentprofile.profile_id
```

This prints the exact string to copy into your config, e.g.:
```
'c8f69a96-50da-4151-acf4-1cc2a3f3985f|1b7db61e-3d3f-477b-91e8-672ec02879da'
```

**See all profile details at once:**

```javascript
currentprofile
```

This shows the full profile object with all properties:
```
{
  sdr_id: 'c8f69a96-50da-4151-acf4-1cc2a3f3985f',
  profile_id: '1b7db61e-3d3f-477b-91e8-672ec02879da',
  toString: ƒ
}
```

**Check the current zoom level:**

```javascript
zoom_level
```

**Test a zoom level before adding it to your config:**

```javascript
zoom_set(5)
```

This lets you try different zoom levels live to find the one you like, then put that number in your config.

**Alternative: check settings.json on the server:**

```bash
cat /var/lib/openwebrx/settings.json | python3 -m json.tool
```

Look for the UUID keys under `"sdrs"` → device → `"profiles"`. The SDR UUID is the key under `"sdrs"`, and the profile UUID is the key under `"profiles"`.

### Full init.js example

```javascript
const rp_url = 'https://0xaf.github.io/openwebrxplus-plugins/receiver';
const my_url = 'https://9a6ndz.github.io/Openwebrx-plugins/receiver';

Plugins.load(rp_url + '/utils/utils.js').then(async function () {

  await Plugins.load(rp_url + '/notify/notify.js');

  // --- DEFAULT ZOOM ---
  window.default_zoom_profiles = {
    'c8f69a96-50da-4151-acf4-1cc2a3f3985f|1b7db61e-3d3f-477b-91e8-672ec02879da': 5,  // RX04 HAM | 40M
  };
  await Plugins.load(my_url + '/default_zoom/default_zoom.js');

  // Other plugins...
})();
```

## No dependencies

This plugin is **fully standalone**. It does not require utils, notify, or any other plugin.

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
