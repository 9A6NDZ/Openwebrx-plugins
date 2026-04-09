# Welcome Screen Plugin for OpenWebRX+

**Author:** 9A6NDZ (Zoran) | **Version:** 4.0 | **License:** MIT

## What it does

1. Shows a fullscreen overlay blocking the SDR until the visitor enters their callsign
2. Saves callsign to `localStorage` — returning users skip the overlay
3. **Auto-fills the Chat name field** — this is what OWRX+ sends to the server, so the callsign appears in **admin Settings > Clients**
4. Sends a name announcement via WebSocket so the server knows the client immediately
5. Also fills the Settings callsign field
6. Shows a small badge with option to change callsign

## Installation

In your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');
```

## Configuration

```javascript
Plugins.welcome_screen_config = {
  title:       'Welcome to 9A6NDZ SDR',
  subtitle:    'Enter your callsign to start listening',
  buttonText:  'START',
};
await Plugins.load('welcome_screen');
```

## Single file — no CSS needed

```
welcome_screen/
└── welcome_screen.js
```

73 de 9A6NDZ!
