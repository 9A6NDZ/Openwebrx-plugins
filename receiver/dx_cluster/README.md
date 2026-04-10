# OpenWebRX+ DX Cluster Feed Plugin

A live DX cluster feed plugin for [OpenWebRX+](https://github.com/luarvique/openwebrx) that displays real-time DX spots directly in the receiver panel. Click any spot to instantly tune the receiver to that frequency.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-plugin-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Live DX cluster feed** — fetches real-time DX spots from a configurable web API
- **Click-to-tune** — click any spot row to instantly tune the receiver to that frequency
- **Band filter** — filter spots by band (All, 160m, 80m, 40m, 30m, 20m, 17m, 15m, 12m, 10m, 6m, 2m)
- **Auto-refresh** — configurable refresh interval (default: 60 seconds), can be toggled on/off
- **Color-coded bands** — each band has a distinct colour accent on the left of the row
- **Native UI** — collapsible section matching Settings/Display style, follows active theme
- **Persistent settings** — collapsed state, band filter, and auto-refresh saved in browser localStorage
- **CORS error handling** — friendly error message if the feed cannot be reached
- **Configurable feed URL** — override via `Plugins.dx_cluster_config`

## Installation

### From GitHub Pages

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/dx_cluster/dx_cluster.js');
```

### Local installation

```bash
cp -r dx_cluster/ /path/to/htdocs/plugins/receiver/dx_cluster/
```

Then in `init.js`:

```javascript
await Plugins.load('dx_cluster');
```

## Full init.js example

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Audio Equalizer
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/audio_equalizer/audio_equalizer.js');

  // DX Cluster Feed
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/dx_cluster/dx_cluster.js');

  // Other plugins...
})();
```

### With custom configuration

```javascript
(async () => {
  // Optional: configure before loading the plugin
  Plugins.dx_cluster_config = {
    feedUrl:         'https://dxlite.g7vjr.org/?json=1',  // DX cluster API URL
    refreshInterval: 60,    // Auto-refresh every 60 seconds
    maxSpots:        30,    // Maximum number of spots to display
    autoRefresh:     true,  // Enable auto-refresh on startup
    collapsed:       false, // Start with the section expanded
    band:            'all', // Default band filter ('all' or e.g. '20m')
  };

  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/dx_cluster/dx_cluster.js');
})();
```

## Usage

| Control | Action |
|---------|--------|
| **▼ DX Cluster** | Click to expand/collapse the section |
| **⟳** button | Refresh DX spots immediately |
| **Auto** button | Toggle automatic refresh on/off |
| **Band dropdown** | Filter spots by amateur band |
| **Spot row** | Click to tune receiver to that frequency |

## Spot columns

| Column | Description |
|--------|-------------|
| **Time** | UTC time of the spot |
| **DX Call** | Callsign of the spotted station |
| **Freq (kHz)** | Frequency in kHz |
| **Spotter** | Callsign of the station that spotted the DX |
| **Comment** | Spot comment (signal report, mode, etc.) |

## Technical details

The plugin fetches DX spots from `https://dxlite.g7vjr.org/?json=1` by default.
This endpoint returns JSON with an array of spot objects. The parser handles
multiple common JSON formats (`{spots:[...]}`, `{data:[...]}`, direct array).

Frequency tuning uses the OWRX+ API with multiple fallback methods:

1. `openwebrx.setFrequency(freqHz)` — primary OWRX+ API
2. `demodulatorPanel.setFrequency(freqHz)` — demodulator panel API
3. jQuery event `openwebrx:tune` — event-based fallback

If the feed cannot be reached due to CORS restrictions or network issues,
a friendly error message is shown in the panel. You can configure an alternative
feed URL via `Plugins.dx_cluster_config.feedUrl`.

## Files

```
dx_cluster/
├── dx_cluster.js    — plugin logic and UI
├── dx_cluster.css   — table and layout styles
└── README.md        — this file
```

## Compatibility

- OpenWebRX+ v1.2+
- Chrome, Firefox, Edge, Safari
- Mobile friendly (Comment column hidden on small screens)

## Author

**9A6NDZ**

## License

MIT
