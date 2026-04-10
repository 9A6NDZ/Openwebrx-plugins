# OpenWebRX+ DX Cluster Feed Plugin

A live DX cluster feed plugin for [OpenWebRX+](https://github.com/luarvique/openwebrx) that displays real-time DX spots directly in the receiver panel. Click any spot to instantly tune the receiver to that frequency. Supports fallback feed URLs, WebSocket proxy for live Telnet bridging, and configurable DX cluster host/port.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-plugin-blue) ![Version](https://img.shields.io/badge/version-1.1-orange) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Live DX cluster feed** — fetches real-time DX spots from a configurable web API
- **Fallback feed URLs** — automatically tries alternative feeds if the primary URL fails
- **WebSocket proxy support** — connect to a Telnet→WebSocket bridge for live cluster data
- **Configurable DX cluster server** — set `clusterHost` and `clusterPort` for display and proxy login
- **Click-to-tune** — click any spot row to instantly tune the receiver to that frequency
- **Band filter** — filter spots by band (All, 160m, 80m, 40m, 30m, 20m, 17m, 15m, 12m, 10m, 6m, 2m)
- **Auto-refresh** — configurable refresh interval (default: 60 seconds), can be toggled on/off
- **Color-coded bands** — each band has a distinct colour accent on the left of the row
- **Native UI** — collapsible section matching Settings/Display style, follows active theme
- **Persistent settings** — collapsed state, band filter, and auto-refresh saved in browser localStorage
- **CORS error handling** — friendly error message if all feeds cannot be reached
- **Fully configurable** — override all options via `Plugins.dx_cluster_config`

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
    feedUrl:         'https://dxc.jo30.de/dxcache/spots', // Primary JSON feed URL
    fallbackUrls:    [                                     // Fallback URLs tried if primary fails
      'https://dxlite.g7vjr.org/?json=1',
    ],
    clusterHost:     'dxfun.com',  // Telnet DX cluster hostname (for proxy/display)
    clusterPort:     8000,         // Telnet DX cluster port
    callsign:        'N0CALL',     // Your callsign for proxy login
    // proxyUrl:     'ws://localhost:8080/dxcluster', // WebSocket proxy URL (optional)
    refreshInterval: 60,           // Auto-refresh every 60 seconds
    maxSpots:        30,           // Maximum number of spots to display
    autoRefresh:     true,         // Enable auto-refresh on startup
    collapsed:       false,        // Start with the section expanded
    band:            'all',        // Default band filter ('all' or e.g. '20m')
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

## Configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `feedUrl` | `https://dxc.jo30.de/dxcache/spots` | Primary JSON feed URL |
| `fallbackUrls` | `[...]` | Fallback feed URLs tried sequentially if primary fails |
| `clusterHost` | `dxfun.com` | Telnet DX cluster hostname (for proxy/display) |
| `clusterPort` | `8000` | Telnet DX cluster port |
| `callsign` | `''` | Your callsign for proxy login |
| `proxyUrl` | `''` | WebSocket proxy URL for live Telnet bridge |
| `refreshInterval` | `60` | Auto-refresh interval in seconds |
| `maxSpots` | `30` | Maximum spots to display |
| `autoRefresh` | `true` | Enable auto-refresh on startup |
| `collapsed` | `true` | Start with section collapsed |
| `band` | `'all'` | Default band filter |

## Popular DX Cluster Servers

| Cluster | Host | Port |
|---------|------|------|
| DXFun | `dxfun.com` | `8000` |
| WA9PIE-2 | `hrd.wa9pie.net` | `8000` |
| K1TTT | `k1ttt.net` | `7373` |
| NC7J | `dxc.nc7j.com` | `7373` |
| DL8LAS | `dl8las.dyndns.org` | `7300` |
| WB3FFV | `dxc.wb3ffv.us` | `7300` |
| pyCluster | `pycluster.ai3i.net` | `7300` |

> **Note:** Browsers cannot connect directly to Telnet clusters (TCP). The `clusterHost`/`clusterPort` settings are used for display in the UI and for authentication when using a WebSocket proxy (`proxyUrl`).

## Technical details

The plugin fetches DX spots from `https://dxc.jo30.de/dxcache/spots` by default (v1.1+).
If the primary URL fails, it automatically tries each URL in `fallbackUrls` sequentially until
one succeeds. The parser handles multiple common JSON formats (`{spots:[...]}`, `{data:[...]}`,
direct array).

If `proxyUrl` is configured, the plugin attempts a WebSocket connection first. This allows
live data from a Telnet→WebSocket bridge (e.g. a small Node.js proxy on your OWRX+ server).
On WebSocket close or error, it falls back to HTTP polling automatically.

The cluster host/port info is shown in small text in the controls row when `clusterHost` is set.

Frequency tuning uses the OWRX+ API with multiple fallback methods:

1. `openwebrx.setFrequency(freqHz)` — primary OWRX+ API
2. `demodulatorPanel.setFrequency(freqHz)` — demodulator panel API
3. jQuery event `openwebrx:tune` — event-based fallback

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
