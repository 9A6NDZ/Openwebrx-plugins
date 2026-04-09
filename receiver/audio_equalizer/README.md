# OpenWebRX+ Audio Equalizer Plugin

A 10-band graphic equalizer plugin for [OpenWebRX+](https://github.com/luarvique/openwebrx) that processes audio in real-time using the Web Audio API.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-plugin-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **10-band graphic EQ** — 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 8kHz, 10kHz, 14kHz
- **8 presets** — Flat, Voice, DX, CW, SSB, Broadcast, Bass Cut, Treble Cut
- **Native UI** — collapsible section matching Settings/Display style, follows active theme
- **Enable/disable** toggle with clean audio bypass
- **Persistent settings** — saved in browser localStorage, restored on reload
- **Auto-reconnect** on SDR profile changes

## Installation

### From GitHub Pages

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/audio_equalizer/audio_equalizer.js');
```

### Local installation

```bash
cp -r audio_equalizer/ /path/to/htdocs/plugins/receiver/audio_equalizer/
```

Then in `init.js`:

```javascript
await Plugins.load('audio_equalizer');
```

## Full init.js example

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Audio Equalizer
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/audio_equalizer/audio_equalizer.js');

  // Other plugins...
})();
```

## Usage

| Control | Action |
|---------|--------|
| **▼ Equalizer** | Click to expand/collapse the section |
| **EQ** button | Toggle equalizer on/off (bypass) |
| **Preset dropdown** | Select a preset (Voice, DX, CW, SSB, etc.) |
| **R** button | Reset all bands to Flat (0 dB) |
| **Sliders** | Drag up/down to boost/cut ±12 dB per band |

## Presets

| Preset | Best for |
|--------|----------|
| Flat | No processing, all bands at 0 dB |
| Voice | Voice clarity on FM/AM |
| DX | Weak/distant signals |
| CW | Morse code, emphasis around 1 kHz |
| SSB | SSB voice intelligibility |
| Broadcast | AM/FM broadcast enhancement |
| Bass Cut | Remove hum and low-frequency rumble |
| Treble Cut | Reduce hiss and high-frequency noise |

## Technical details

The plugin uses Web Audio API `BiquadFilterNode` chain:

- Band 1 (60 Hz) — `lowshelf` filter
- Bands 2–9 — `peaking` filters, Q = 1.4
- Band 10 (14 kHz) — `highshelf` filter

The filter chain is inserted between the OWRX+ gain node and audio destination. Bypass reconnects gain directly to destination.

## Files

```
audio_equalizer/
├── audio_equalizer.js   — plugin logic and UI
├── audio_equalizer.css  — slider and layout styles
└── README.md            — this file
```

## Compatibility

- OpenWebRX+ v1.2+
- Chrome, Firefox, Edge, Safari
- Mobile friendly

## Author

**9A6NDZ**

## License

MIT
