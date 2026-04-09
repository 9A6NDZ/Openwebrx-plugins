// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
// ============================================================================

(function () {
  'use strict';

  // --- Plugin registration ---------------------------------------------------
  Plugins.welcome_screen = {
    _version: 2,
    no_css: false,
    title:            'Welcome to 9A6NDZ SDR',
    subtitle:         'Enter your callsign to start listening',
    placeholder:      'e.g. 9A6NDZ',
    buttonText:       'Start Listening',
    storageKey:       'openwebrx-callsign',
    settingsKey:      'openwebrx-settings',
    minCallLength:    3,
    maxCallLength:    12,
    callsignPattern:  /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}[A-Z]?$/i,
    showChangeButton: true,
  };

  // Merge any pre-set config
  if (typeof Plugins.welcome_screen_config === 'object') {
    Object.assign(Plugins.welcome_screen, Plugins.welcome_screen_config);
  }

  var CFG = Plugins.welcome_screen;
  var _initialized = false;

  // --- Helpers ---------------------------------------------------------------

  function getSavedCallsign() {
    try { return localStorage.getItem(CFG.storageKey) || ''; }
    catch (_) { return ''; }
  }

  function saveCallsign(call) {
    var upper = call.trim().toUpperCase();
    try {
      localStorage.setItem(CFG.storageKey, upper);
      try {
        var s = JSON.parse(localStorage.getItem(CFG.settingsKey) || '{}');
        s.callsign = upper;
        localStorage.setItem(CFG.settingsKey, JSON.stringify(s));
      } catch (_) {}
    } catch (_) {}
    return upper;
  }

  function applyCallsignToDOM(callsign) {
    document.querySelectorAll(
      '#openwebrx-settings-callsign,' +
      'input[name="callsign"],' +
      '.settings-container input[name="callsign"]'
    ).forEach(function (el) {
      if (!el.value) {
        el.value = callsign;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    var chat = document.querySelector('#openwebrx-chat-name') ||
               document.querySelector('input.chat-name');
    if (chat && !chat.value) {
      chat.value = callsign;
      chat.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function watchDOM(callsign) {
    var obs = new MutationObserver(function () { applyCallsignToDOM(callsign); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 20000);
  }

  // --- Build overlay ---------------------------------------------------------

  function buildOverlay() {
    // Prevent duplicates — this was the bug
    if (document.getElementById('ws-overlay')) return;

    var ov = document.createElement('div');
    ov.id = 'ws-overlay';

    ov.innerHTML =
      '<div id="ws-card">' +
        '<div id="ws-icon">' +
          '<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="32" y1="8" x2="32" y2="56"/>' +
            '<line x1="32" y1="16" x2="16" y2="32"/>' +
            '<line x1="32" y1="16" x2="48" y2="32"/>' +
            '<path d="M20 44 Q32 36 44 44"/>' +
            '<path d="M14 50 Q32 38 50 50"/>' +
            '<circle cx="32" cy="8" r="3" fill="currentColor"/>' +
          '</svg>' +
        '</div>' +
        '<h1 id="ws-title">' + CFG.title + '</h1>' +
        '<p id="ws-sub">' + CFG.subtitle + '</p>' +
        '<div id="ws-form">' +
          '<input type="text" id="ws-input" placeholder="' + CFG.placeholder + '" ' +
            'maxlength="' + CFG.maxCallLength + '" autocomplete="off" spellcheck="false">' +
          '<button type="button" id="ws-btn">' + CFG.buttonText + '</button>' +
        '</div>' +
        '<p id="ws-err"></p>' +
      '</div>';

    document.body.appendChild(ov);

    var input = document.getElementById('ws-input');
    var btn   = document.getElementById('ws-btn');
    var err   = document.getElementById('ws-err');

    function submit() {
      var val = input.value.trim().toUpperCase();
      err.textContent = '';
      if (val.length < CFG.minCallLength) {
        err.textContent = 'Callsign too short (min ' + CFG.minCallLength + ' chars)';
        input.focus(); return;
      }
      if (!CFG.callsignPattern.test(val)) {
        err.textContent = 'Invalid callsign format';
        input.focus(); return;
      }
      var cs = saveCallsign(val);
      dismiss(cs);
    }

    btn.addEventListener('click', submit);

    input.addEventListener('keydown', function (e) {
      if (e.key.length === 1 && /[a-z]/.test(e.key)) {
        e.preventDefault();
        var p = input.selectionStart;
        input.value = input.value.substring(0, p) + e.key.toUpperCase() + input.value.substring(input.selectionEnd);
        input.setSelectionRange(p + 1, p + 1);
      }
      if (e.key === 'Enter') submit();
    });

    // Animate in + focus
    requestAnimationFrame(function () {
      ov.classList.add('ws-visible');
      setTimeout(function () { input.focus(); }, 400);
    });
  }

  function dismiss(callsign) {
    var ov = document.getElementById('ws-overlay');
    if (ov) {
      ov.classList.add('ws-out');
      setTimeout(function () { ov.remove(); }, 500);
    }
    applyCallsignToDOM(callsign);
    watchDOM(callsign);
    if (CFG.showChangeButton) addBadge(callsign);
    console.log('[welcome_screen] Callsign:', callsign);
  }

  // --- Change-callsign badge -------------------------------------------------

  function addBadge(cs) {
    if (document.getElementById('ws-badge')) return;
    var b = document.createElement('div');
    b.id = 'ws-badge';
    b.innerHTML =
      '<span id="ws-badge-call">' + cs + '</span>' +
      '<button id="ws-badge-btn" title="Change callsign">&#9998;</button>';
    document.body.appendChild(b);

    document.getElementById('ws-badge-btn').addEventListener('click', function () {
      b.remove();
      localStorage.removeItem(CFG.storageKey);
      buildOverlay();
    });
  }

  // --- Init ------------------------------------------------------------------

  function init() {
    if (_initialized) return true;
    _initialized = true;

    var saved = getSavedCallsign();
    if (saved && saved.length >= CFG.minCallLength) {
      applyCallsignToDOM(saved);
      watchDOM(saved);
      if (CFG.showChangeButton) addBadge(saved);
      console.log('[welcome_screen] Returning user:', saved);
    } else {
      buildOverlay();
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
