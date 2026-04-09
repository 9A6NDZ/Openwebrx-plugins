# Welcome Screen Plugin for OpenWebRX+

**Author:** 9A6NDZ (Zoran)  
**Version:** 3.0  
**License:** MIT  

---

## Description

Simple fullscreen welcome overlay (like SDR Košutnjak style) that blocks the SDR until the visitor enters their callsign. No external CSS file — all styles are inline.

## Installation

### Remote (from GitHub Pages)

In your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');
```

### Local

```bash
export OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
mkdir -p "$OWRX_FOLDER/plugins/receiver/welcome_screen"
cp welcome_screen.js "$OWRX_FOLDER/plugins/receiver/welcome_screen/"
```

In `init.js`:
```javascript
await Plugins.load('welcome_screen');
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

## Files

```
welcome_screen/
└── welcome_screen.js    (single file — no CSS needed)
```

73 de 9A6NDZ!
