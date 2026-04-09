# OpenWebRX+ Audio Equalizer Plugin

A 10-band graphic equalizer plugin for [OpenWebRX+](https://github.com/luarvique/openwebrx) that inserts into the receiver panel's audio chain using the Web Audio API.

## Features

- **10-band graphic EQ**: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 8kHz, 10kHz, 14kHz
- **Presets** optimized for SDR listening: Flat, Voice, DX, CW, SSB, Broadcast, Bass Cut, Treble Cut
- **Enable/disable** toggle with bypass (no audio artifacts)
- **Collapsible UI** to save panel space
- **Persistent settings** saved in browser localStorage
- **Theme-aware** styling using OpenWebRX+ CSS variables
- **Auto-reconnect** on profile changes

## Screenshot

The equalizer appears in the receiver panel between the controls (volume/squelch/NR) and the settings section (themes/waterfall):

```
┌──────────────────────────┐
│  Frequency Display       │
│  Mode Buttons (FM/AM/…)  │
│  Volume / Squelch / NR   │
│ ─────────────────────── │
│  ▼ EQUALIZER  [EQ] [R]  │
│  |  |  |  |  |  |  |  | │  ← 10 vertical sliders
│  60 170 310 600 1K ...   │
│ ─────────────────────── │
│  Theme / Waterfall / …   │
└──────────────────────────┘
```

## Installation

### Option 1: Load from your private GitHub Pages

1. Create a private GitHub repository (e.g., `my-owrx-plugins`)
2. Copy the `audio_equalizer/` folder into `receiver/audio_equalizer/`
3. Enable GitHub Pages (Settings → Pages → Deploy from branch `main`)
4. In your OpenWebRX+ `init.js`, add:

```javascript
await Plugins.load('https://YOUR_USERNAME.github.io/my-owrx-plugins/receiver/audio_equalizer/audio_equalizer.js');
```

> **Note:** For private repos, GitHub Pages must be enabled and accessible.
> If using a truly private repo (GitHub Pro/Team), you may need to use
> raw content URLs with a token, or host the files another way.

### Option 2: Local installation

1. Copy the `audio_equalizer/` folder to your OpenWebRX+ plugins directory:

```bash
cp -r audio_equalizer/ /path/to/htdocs/plugins/receiver/audio_equalizer/
```

2. In your `init.js`, add:

```javascript
await Plugins.load('audio_equalizer');
```

## Full init.js Example

```javascript
(async () => {
  // Load dependencies
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Load audio equalizer from your GitHub
  await Plugins.load('https://YOUR_USERNAME.github.io/my-owrx-plugins/receiver/audio_equalizer/audio_equalizer.js');

  // Other plugins...
})();
```

## Usage

- **EQ button**: Toggle the equalizer on/off (bypasses the filter chain)
- **Preset dropdown**: Select a preset (Voice, DX, CW, SSB, etc.)
- **R button**: Reset all bands to flat (0 dB)
- **▼ arrow**: Collapse/expand the equalizer UI
- **Sliders**: Drag up/down to boost/cut each frequency band (±12 dB)

All settings are automatically saved in your browser and restored on reload.

## Presets

| Preset    | Description                                        |
|-----------|----------------------------------------------------|
| Flat      | All bands at 0 dB                                  |
| Glas      | Boost mid-range for voice clarity                  |
| DX        | Optimize for weak/distant signals                  |
| CW        | Narrow bandpass emphasis around 1 kHz              |
| SSB       | Improve SSB voice intelligibility                  |
| Broadcast | Balanced enhancement for AM/FM broadcasts          |
| Bass rez  | Cut low frequencies to reduce hum/rumble           |
| Treble rez| Cut high frequencies to reduce hiss/noise          |

## Technical Details

The plugin uses the **Web Audio API** `BiquadFilterNode` to create a 10-band parametric/graphic equalizer:

- Band 1 (60 Hz): `lowshelf` filter
- Bands 2-9: `peaking` filters with Q=1.4
- Band 10 (14 kHz): `highshelf` filter

The filter chain is inserted between OpenWebRX+'s gain node and the audio destination. On bypass, the gain node connects directly to the destination.

## Compatibility

- OpenWebRX+ v1.2+ (tested with plugin system)
- Works with all modern browsers (Chrome, Firefox, Edge, Safari)
- Mobile-friendly with responsive slider heights

## License

MIT License
