# Listeners Panel Plugin for OpenWebRX+

A headphone icon in the main navbar that shows active listeners with their chat names and real-time tuned frequencies. No IP addresses — privacy first!

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-Plugin-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## What it does

Adds a 🎧 **Listeners** button to the main navbar (next to Help), matching the existing OWRX+ button style. Clicking it opens a dropdown panel showing:

- **Name / nickname** — from chat messages
- **Exact frequency** — read in real-time from the receiver, updates as users tune
- **Status indicator** — green dot for active, orange for idle

No IP addresses are ever shown or collected.

## Screenshot

```
 Help  🎧Listeners  Status  Chat  Receiver  Map  Files  Settings
        ┌───────────────────────────────────┐
        │ 🎧 Listeners                   ✕ │
        ├───┬───────────────┬──────────────┤
        │   │ Name          │   Frequency  │
        ├───┼───────────────┼──────────────┤
        │ 🟢│ Zoran         │ 14.205 MHz   │
        │ 🟢│ Marco         │  7.074 MHz   │
        │ 🟠│ Listener3     │  3.573 MHz   │
        └───┴───────────────┴──────────────┘
```

## How the frequency works

The plugin reads the frequency directly from the `#webrx-actual-freq` element in the OWRX+ DOM. This is the same element that displays the frequency on screen. It updates every 2 seconds, so when a user changes frequency, the table updates automatically.

For remote users (other clients), the plugin captures their names from WebSocket chat messages. Currently, the exact frequency of remote users can only be shown if OWRX+ broadcasts it via WebSocket — otherwise their name appears with "—" in the frequency column.

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
Plugins.listeners_panel = {
  panelTitle:   'Who is listening?',
  maxListeners: 30,
  staleTimeout: 600000,  // 10 minutes before removing idle users
};
await Plugins.load('listeners_panel');
```

### Options

| Option | Default | Description |
|---|---|---|
| `panelTitle` | `Listeners` | Title shown on the button and panel header |
| `maxListeners` | `50` | Maximum number of listeners displayed |
| `staleTimeout` | `300000` | Milliseconds before removing idle listeners (default 5 min) |

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

## Privacy

- ❌ Does **NOT** display IP addresses
- ❌ Does **NOT** send data to external services
- ✅ Only shows names from the chat
- ✅ Only shows the current frequency
- ✅ All data stays local in the browser

## Files

```
listeners_panel/
├── listeners_panel.js    # Plugin code
├── listeners_panel.css   # Styles (loaded automatically)
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
