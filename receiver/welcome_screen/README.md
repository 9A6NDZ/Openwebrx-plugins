# Welcome Screen Plugin for OpenWebRX+

A simple fullscreen welcome overlay for OpenWebRX+ that greets visitors with a custom message before they access the SDR receiver.

![OpenWebRX+](https://img.shields.io/badge/OpenWebRX+-Plugin-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## What it does

When someone opens your OpenWebRX+ receiver, a fullscreen overlay appears with your welcome message and a **START** button. The SDR interface is hidden behind the overlay until the visitor clicks START.

## Screenshot

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│        Welcome to 9A6NDZ SDR            │
│                                         │
│          Čuvaj HAM duh!                 │
│              PAZI!                      │
│          Deca slušaju.                  │
│         Budi za primer!                 │
│                                         │
│            [ START ]                    │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Installation

### Remote (from GitHub Pages)

Add this line to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');
```

### Local

Copy the file to your OWRX+ plugins folder:

```bash
OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
mkdir -p "$OWRX_FOLDER/plugins/receiver/welcome_screen"
cp welcome_screen.js "$OWRX_FOLDER/plugins/receiver/welcome_screen/"
```

Then add to your `init.js`:

```javascript
await Plugins.load('welcome_screen');
```

### Docker

Make sure your plugins folder is mounted:

```yaml
volumes:
  - /opt/owrx-docker/plugins:/usr/lib/python3/dist-packages/htdocs/plugins
```

Then copy the file and edit `init.js` as described above.

## Configuration

Customize the overlay by setting options in `init.js` **before** loading the plugin:

```javascript
Plugins.welcome_screen_config = {
  title:      'Welcome to 9A6NDZ SDR',
  subtitle:   'Čuvaj HAM duh!<br>PAZI!<br>Deca slušaju.<br>Budi za primer!',
  buttonText: 'START',
};
await Plugins.load('welcome_screen');
```

### Options

| Option | Default | Description |
|---|---|---|
| `title` | `Welcome to my OWRX SDR` | Main heading text |
| `subtitle` | *(empty)* | Text below the title. Supports HTML (`<br>`, `<b>`, etc.) |
| `buttonText` | `START` | Button label |

### Full init.js example

```javascript
(async () => {
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
  await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

  // Welcome screen
  Plugins.welcome_screen_config = {
    title:      'Welcome to 9A6NDZ SDR',
    subtitle:   'Čuvaj HAM duh!<br>PAZI!<br>Deca slušaju.<br>Budi za primer!',
    buttonText: 'START',
  };
  await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');

  // Other plugins...
})();
```

## Files

```
welcome_screen/
├── welcome_screen.js
└── README.md
```

Single JavaScript file, no CSS needed. All styles are inline.

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
