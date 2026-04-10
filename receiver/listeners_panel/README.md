# Listeners Panel Plugin for OpenWebRX+

A headphone icon plugin for OpenWebRX+ that shows a table of active listeners with their chat names and tuned frequencies. No IP addresses displayed — privacy first!

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-Plugin-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## What it does

Adds a 🎧 headphone icon to the OpenWebRX+ top bar. Clicking it opens a floating panel showing all active listeners:

- **Name / nickname** — picked up from chat messages
- **Exact frequency** — the frequency each user is currently tuned to
- **Status indicator** — green dot for active, orange for idle

No IP addresses are ever shown or collected.

## Screenshot

```
┌─────────────────────────────────────────┐
│  🎧 ②                                  │
│  ┌───────────────────────────────────┐  │
│  │ 🎧 Listeners                   ✕ │  │
│  ├───┬───────────────┬──────────────┤  │
│  │   │ Name          │   Frequency  │  │
│  ├───┼───────────────┼──────────────┤  │
│  │ 🟢│ Zoran         │ 14.205 MHz  │  │
│  │ 🟢│ Marco         │  7.074 MHz  │  │
│  │ 🟠│ Listener3     │  3.573 MHz  │  │
│  └───┴───────────────┴──────────────┘  │
└─────────────────────────────────────────┘
```

## Installation

### Remote (from GitHub Pages)

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/listeners_panel/listeners_panel.js');
```

### Local

Copy the files to your OWRX+ plugins folder:

```bash
OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
mkdir -p "$OWRX_FOLDER/plugins/receiver/listeners_panel"
cp listeners_panel.js listeners_panel.css "$OWRX_FOLDER/plugins/receiver/listeners_panel/"
```

Then add to your `init.js`:

```javascript
await Plugins.load('listeners_panel');
```

### Docker

Make sure your plugins folder is mounted:

```yaml
volumes:
  - /opt/owrx-docker/plugins:/usr/lib/python3/dist-packages/htdocs/plugins
```

Then copy the files and edit `init.js` as described above.

## Configuration

Customize the plugin by setting options in `init.js` **before** loading the plugin:

```javascript
Plugins.listeners_panel = Plugins.listeners_panel || {};
Plugins.listeners_panel.refreshInterval = 5000;
Plugins.listeners_panel.panelTitle = 'Who is listening?';
Plugins.listeners_panel.maxListeners = 30;
await Plugins.load('listeners_panel');
```

### Options

| Option | Default | Description |
|---|---|---|
| `refreshInterval` | `3000` | How often to refresh frequency data (in ms) |
| `panelTitle` | `Listeners` | Title shown in the panel header |
| `maxListeners` | `50` | Maximum number of listeners displayed |

### Full init.js example

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Welcome screen
  Plugins.welcome_screen_config = {
    title:      'Welcome to my OWRX SDR',
    subtitle:   'Thank you for visiting!<br>Please be respectful to other listeners.',
    buttonText: 'START',
  };
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');

  // Listeners panel
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/listeners_panel/listeners_panel.js');

  // Other plugins...
})();
```

## How it works

1. **WebSocket interception** — Captures chat messages and client info sent over the OWRX+ WebSocket
2. **DOM observation** — Watches the chat panel for new messages and extracts usernames
3. **Frequency detection** — Reads the current frequency from the OWRX+ interface (supports multiple methods)
4. **Periodic refresh** — Updates every 3 seconds and removes inactive users after 5 minutes

## Privacy

- ❌ Does **NOT** display IP addresses
- ❌ Does **NOT** send data to external services
- ✅ Only shows names from the chat
- ✅ Only shows the current frequency
- ✅ All data stays local

## Files

```
listeners_panel/
├── listeners_panel.js
├── listeners_panel.css
├── LICENSE
└── README.md
```

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
