// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
// Version: 4
//
// Fullscreen overlay requiring callsign. Saves to localStorage, fills the
// chat name input (which OWRX+ sends to the server — visible in admin
// Settings > Clients), and sends a name announcement via WebSocket.
// ============================================================================

(function () {
  'use strict';

  Plugins.welcome_screen = {
    _version: 4,
    no_css: true,
    title:            'Welcome to my OWRX SDR',
    subtitle:         'Please enter your callsign to continue',
    placeholder:      'Your callsign',
    buttonText:       'START',
    storageKey:       'openwebrx-callsign',
    settingsKey:      'openwebrx-settings',
    minCallLength:    3,
    maxCallLength:    12,
    callsignPattern:  /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}[A-Z]?$/i,
    showChangeButton: true,
  };

  if (typeof Plugins.welcome_screen_config === 'object') {
    Object.assign(Plugins.welcome_screen, Plugins.welcome_screen_config);
  }

  var CFG = Plugins.welcome_screen;
  var _done = false;

  // --- localStorage ---------------------------------------------------------

  function getSaved() {
    try { return localStorage.getItem(CFG.storageKey) || ''; } catch(e) { return ''; }
  }

  function save(call) {
    var cs = call.trim().toUpperCase();
    try {
      localStorage.setItem(CFG.storageKey, cs);
      try {
        var s = JSON.parse(localStorage.getItem(CFG.settingsKey) || '{}');
        s.callsign = cs;
        localStorage.setItem(CFG.settingsKey, JSON.stringify(s));
      } catch(e) {}
    } catch(e) {}
    return cs;
  }

  // --- Fill callsign into ALL relevant DOM fields ---------------------------
  //
  // The chat panel in OWRX+ has an input next to "Message" where the user
  // types their name/callsign. When a chat message is sent, OWRX+ includes
  // this name in the WebSocket payload — the server then stores it as the
  // client's "chat name", visible in admin Settings > Clients.
  //
  // We target every possible selector for this field.

  function fillDOM(cs) {
    // Chat name field (the input left of "Message" / "Send")
    // In OWRX+ this is typically the first input in the chat/log panel,
    // or has specific classes/IDs depending on version.
    var chatSelectors = [
      '#openwebrx-panel-log input[type="text"]:first-of-type',
      '#openwebrx-panel-chat input[type="text"]:first-of-type',
      '.openwebrx-panel-chat input[type="text"]:first-of-type',
      '#openwebrx-chat-name',
      'input.chat-name',
      'input[name="chat-name"]',
      'input[name="callsign"]',
    ];

    chatSelectors.forEach(function(sel) {
      try {
        var els = document.querySelectorAll(sel);
        els.forEach(function(el) {
          if (el && (!el.value || el.value.length === 0)) {
            el.value = cs;
            el.dispatchEvent(new Event('input', {bubbles: true}));
            el.dispatchEvent(new Event('change', {bubbles: true}));
          }
        });
      } catch(e) {}
    });

    // Settings callsign field
    var settingsSelectors = [
      '#openwebrx-settings-callsign',
      '.settings-container input[name="callsign"]',
    ];

    settingsSelectors.forEach(function(sel) {
      try {
        var els = document.querySelectorAll(sel);
        els.forEach(function(el) {
          if (el && (!el.value || el.value.length === 0)) {
            el.value = cs;
            el.dispatchEvent(new Event('change', {bubbles: true}));
          }
        });
      } catch(e) {}
    });
  }

  // --- Send callsign to server via WebSocket --------------------------------
  //
  // OWRX+ uses a global WebSocket connection. When the chat panel sends a
  // message, it sends JSON like: {"type":"chat","name":"CALL","message":"..."}
  // The server stores the name for client identification.
  //
  // We send an empty chat-name announcement so the server immediately knows
  // who this client is, even before they type a chat message.

  function sendNameToServer(cs) {
    // Try multiple ways to find the OWRX+ WebSocket
    var ws = null;

    // Method 1: OWRX+ stores ws in a global variable
    if (typeof owrx_ws !== 'undefined' && owrx_ws && owrx_ws.readyState === 1) {
      ws = owrx_ws;
    }

    // Method 2: Check common OWRX+ global references
    if (!ws && typeof Openwebrx !== 'undefined' && Openwebrx.ws && Openwebrx.ws.readyState === 1) {
      ws = Openwebrx.ws;
    }

    // Method 3: Try the connection object
    if (!ws && typeof connection !== 'undefined' && connection && connection.readyState === 1) {
      ws = connection;
    }

    if (ws) {
      try {
        // Send a name-only message — OWRX+ server picks up the name
        // for the Clients list in admin Settings
        ws.send(JSON.stringify({type: 'name', value: cs}));
        console.log('[welcome_screen] Sent name to server via WebSocket:', cs);
      } catch(e) {
        console.warn('[welcome_screen] WebSocket send failed:', e);
      }
    } else {
      // WebSocket not ready yet — try again shortly
      setTimeout(function() { sendNameToServer(cs); }, 2000);
    }
  }

  // --- MutationObserver to catch late-rendered panels -----------------------

  function watchFill(cs) {
    var obs = new MutationObserver(function() { fillDOM(cs); });
    obs.observe(document.body, {childList:true, subtree:true});
    setTimeout(function() { obs.disconnect(); }, 30000);
  }

  // --- Build overlay --------------------------------------------------------

  function showOverlay() {
    if (document.getElementById('welcomeOverlay')) return;

    var ov = document.createElement('div');
    ov.id = 'welcomeOverlay';
    ov.style.cssText =
      'position:fixed; top:0; left:0; width:100%; height:100%;' +
      'background:rgba(0,0,20,0.92);' +
      'display:flex; flex-direction:column; align-items:center; justify-content:center;' +
      'text-align:center; color:#ffae00; font-size:20px; padding:20px;' +
      'z-index:999999;';

    var box = document.createElement('div');
    box.style.cssText = 'max-width:500px; width:90%;';

    var h2 = document.createElement('h2');
    h2.textContent = CFG.title;
    h2.style.cssText = 'margin:0 0 10px; font-size:32px; color:#ffae00;';

    var p = document.createElement('p');
    p.textContent = CFG.subtitle;
    p.style.cssText = 'margin:0 0 30px; font-size:18px; color:#cc8800; line-height:1.5;';

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'ws-callsign-input';
    input.placeholder = CFG.placeholder;
    input.maxLength = CFG.maxCallLength;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.cssText =
      'display:block; width:100%; box-sizing:border-box;' +
      'padding:14px 18px; margin:0 0 8px;' +
      'font-size:22px; font-family:monospace; letter-spacing:0.15em;' +
      'text-transform:uppercase; text-align:center;' +
      'color:#fff; background:rgba(0,0,40,0.8);' +
      'border:2px solid #ffae00; border-radius:8px; outline:none;';

    var err = document.createElement('p');
    err.id = 'ws-callsign-err';
    err.style.cssText = 'min-height:1.2em; margin:0 0 10px; font-size:14px; color:#ff4444;';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = CFG.buttonText;
    btn.style.cssText =
      'margin-top:10px; padding:12px 40px;' +
      'font-size:22px; font-weight:bold;' +
      'background:#ffae00; color:#000;' +
      'border:none; border-radius:8px; cursor:pointer;';

    box.appendChild(h2);
    box.appendChild(p);
    box.appendChild(input);
    box.appendChild(err);
    box.appendChild(btn);
    ov.appendChild(box);
    document.body.appendChild(ov);

    function submit() {
      var val = input.value.trim().toUpperCase();
      err.textContent = '';
      if (val.length < CFG.minCallLength) {
        err.textContent = 'Callsign too short (min ' + CFG.minCallLength + ' characters)';
        input.focus(); return;
      }
      if (!CFG.callsignPattern.test(val)) {
        err.textContent = 'Invalid callsign format';
        input.focus(); return;
      }
      var cs = save(val);
      ov.style.display = 'none';
      ov.remove();
      activate(cs);
    }

    btn.addEventListener('click', submit);

    input.addEventListener('keydown', function(e) {
      if (e.key.length === 1 && /[a-z]/.test(e.key)) {
        e.preventDefault();
        var pos = input.selectionStart;
        input.value = input.value.substring(0, pos) + e.key.toUpperCase() + input.value.substring(input.selectionEnd);
        input.setSelectionRange(pos + 1, pos + 1);
      }
      if (e.key === 'Enter') submit();
    });

    setTimeout(function() { input.focus(); }, 300);
  }

  // --- Activate: fill DOM + send to server + badge --------------------------

  function activate(cs) {
    fillDOM(cs);
    watchFill(cs);
    sendNameToServer(cs);
    if (CFG.showChangeButton) addBadge(cs);
    console.log('[welcome_screen] Activated callsign:', cs);
  }

  // --- Badge ----------------------------------------------------------------

  function addBadge(cs) {
    if (document.getElementById('ws-badge')) return;
    var b = document.createElement('div');
    b.id = 'ws-badge';
    b.style.cssText =
      'position:fixed; top:8px; right:60px; z-index:99999;' +
      'display:flex; align-items:center; gap:6px;' +
      'padding:4px 10px 4px 12px;' +
      'font-size:12px; font-family:monospace;' +
      'color:#ffae00; background:rgba(0,0,20,0.85);' +
      'border:1px solid rgba(255,174,0,0.3); border-radius:20px;' +
      'cursor:default; user-select:none;';

    var label = document.createElement('span');
    label.textContent = cs;
    label.style.cssText = 'letter-spacing:0.1em; font-weight:bold;';

    var cbtn = document.createElement('button');
    cbtn.innerHTML = '&#9998;';
    cbtn.title = 'Change callsign';
    cbtn.style.cssText =
      'display:inline-flex; align-items:center; justify-content:center;' +
      'width:20px; height:20px; font-size:13px;' +
      'color:#ffae00; background:rgba(255,174,0,0.1);' +
      'border:1px solid rgba(255,174,0,0.2); border-radius:50%;' +
      'cursor:pointer;';

    cbtn.addEventListener('click', function() {
      b.remove();
      localStorage.removeItem(CFG.storageKey);
      showOverlay();
    });

    b.appendChild(label);
    b.appendChild(cbtn);
    document.body.appendChild(b);
  }

  // --- Init -----------------------------------------------------------------

  function init() {
    if (_done) return true;
    _done = true;

    var saved = getSaved();
    if (saved && saved.length >= CFG.minCallLength) {
      activate(saved);
    } else {
      showOverlay();
    }
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  Plugins.welcome_screen.init = init;

})();
