# Welcome Screen Plugin for OpenWebRX+

**Author:** 9A6NDZ (Zoran)  
**Version:** 2.0  
**License:** MIT  
**Repository:** [github.com/9A6NDZ/Openwebrx-plugins](https://github.com/9A6NDZ/Openwebrx-plugins)

---

## Description

A fullscreen welcome overlay that covers the entire SDR interface and requires visitors to enter their **callsign** before they can use the receiver.

**Features:**

- Fullscreen overlay sits on top of the entire OWRX+ UI (waterfall, panels, everything)
- SDR does not become accessible until a valid callsign is entered
- Callsign is saved — returning users skip the overlay automatically
- Auto-populates the OWRX+ **Settings** callsign field and **Chat** name field
- Small floating badge shows current callsign with option to change
- Animated radio-wave background, dark SDR-themed design
- Responsive (mobile + desktop)

---

## Installation

### From GitHub (remote load)

Add to your `init.js`:

```javascript
await Plugins.load('https://9a6ndz.github.io/Openwebrx-plugins/receiver/welcome_screen/welcome_screen.js');
```

### Local installation

```bash
export OWRX_FOLDER=$(dirname "$(find / -name openwebrx.js 2>/dev/null | head -n1)")
cp -r welcome_screen "$OWRX_FOLDER/plugins/receiver/"
```

Then in `init.js`:
```javascript
await Plugins.load('welcome_screen');
```

---

## Configuration

Set options **before** loading the plugin:

```javascript
Plugins.welcome_screen_config = {
  title:       'Welcome to 9A6NDZ SDR',
  subtitle:    'Enter your callsign to start listening',
  placeholder: 'e.g. 9A1ABC',
  buttonText:  'Start Listening',
};
await Plugins.load('welcome_screen');
```

| Option | Default | Description |
|---|---|---|
| `title` | `'Welcome to 9A6NDZ SDR'` | Main heading |
| `subtitle` | `'Enter your callsign to start listening'` | Subheading |
| `placeholder` | `'e.g. 9A6NDZ'` | Input placeholder |
| `buttonText` | `'Start Listening'` | Button label |
| `minCallLength` | `3` | Min callsign length |
| `maxCallLength` | `12` | Max callsign length |
| `showChangeButton` | `true` | Show floating badge |

---

## Files

```
welcome_screen/
├── welcome_screen.js
├── welcome_screen.css
└── README.md
```

---

73 de 9A6NDZ!
