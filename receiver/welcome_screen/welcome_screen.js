// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
// Version: 3
//
// Simple fullscreen overlay with callsign input.
// Callsign is saved to localStorage and auto-fills Settings + Chat fields.
// ============================================================================

(function () {
  'use strict';

  Plugins.welcome_screen = {
    _version: 3,
    no_css: true,  // no external CSS file — everything is inline
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

  // --- localStorage helpers ------------------------------------------------

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

  // --- Fill callsign into Settings + Chat fields ---------------------------

  function fillDOM(cs) {
    document.querySelectorAll(
      '#openwebrx-settings-callsign, input[name="callsign"], .settings-container input[name="callsign"]'
    ).forEach(function(el) {
      if (!el.value) { el.value = cs; el.dispatchEvent(new Event('change', {bubbles:true})); }
    });
    var ch = document.querySelector('#openwebrx-chat-name') || document.querySelector('input.chat-name');
    if (ch && !ch.value) { ch.value = cs; ch.dispatchEvent(new Event('change', {bubbles:true})); }
  }

  function watchFill(cs) {
    var obs = new MutationObserver(function() { fillDOM(cs); });
    obs.observe(document.body, {childList:true, subtree:true});
    setTimeout(function() { obs.disconnect(); }, 20000);
  }

  // --- Build the overlay ---------------------------------------------------

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

    // Title
    var h2 = document.createElement('h2');
    h2.textContent = CFG.title;
    h2.style.cssText = 'margin:0 0 10px; font-size:32px; color:#ffae00;';

    // Subtitle
    var p = document.createElement('p');
    p.textContent = CFG.subtitle;
    p.style.cssText = 'margin:0 0 30px; font-size:18px; color:#cc8800; line-height:1.5;';

    // Input
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

    // Error
    var err = document.createElement('p');
    err.id = 'ws-callsign-err';
    err.style.cssText = 'min-height:1.2em; margin:0 0 10px; font-size:14px; color:#ff4444;';

    // Button
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

    // --- Events ---

    function submit() {
      var val = input.value.trim().toUpperCase();
      err.textContent = '';

      if (val.length < CFG.minCallLength) {
        err.textContent = 'Callsign too short (min ' + CFG.minCallLength + ' characters)';
        input.focus();
        return;
      }
      if (!CFG.callsignPattern.test(val)) {
        err.textContent = 'Invalid callsign format';
        input.focus();
        return;
      }

      var cs = save(val);
      // Hide overlay
      ov.style.display = 'none';
      ov.remove();
      // Fill fields
      fillDOM(cs);
      watchFill(cs);
      if (CFG.showChangeButton) addBadge(cs);
      console.log('[welcome_screen] Callsign set:', cs);
    }

    btn.addEventListener('click', submit);

    input.addEventListener('keydown', function(e) {
      // Auto uppercase
      if (e.key.length === 1 && /[a-z]/.test(e.key)) {
        e.preventDefault();
        var pos = input.selectionStart;
        input.value = input.value.substring(0, pos) + e.key.toUpperCase() + input.value.substring(input.selectionEnd);
        input.setSelectionRange(pos + 1, pos + 1);
      }
      if (e.key === 'Enter') submit();
    });

    // Focus
    setTimeout(function() { input.focus(); }, 300);
  }

  // --- Small "change callsign" badge ---------------------------------------

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

  // --- Init ----------------------------------------------------------------

  function init() {
    if (_done) return true;
    _done = true;

    var saved = getSaved();
    if (saved && saved.length >= CFG.minCallLength) {
      // Returning user — no overlay
      fillDOM(saved);
      watchFill(saved);
      if (CFG.showChangeButton) addBadge(saved);
      console.log('[welcome_screen] Returning user:', saved);
    } else {
      // New user — show overlay
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
