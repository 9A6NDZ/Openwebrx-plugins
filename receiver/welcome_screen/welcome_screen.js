// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
//
// Shows a welcome overlay requiring visitors to enter their callsign
// before accessing the SDR receiver. The callsign is saved to
// localStorage and automatically populates the OWRX+ Settings
// callsign field and the Chat callsign field.
// ============================================================================

(function () {
  'use strict';

  // --- Plugin registration ---------------------------------------------------
  Plugins.welcome_screen = {
    _version: 1,
    no_css: false,                       // plugin has a companion CSS file

    // Configurable defaults (override from init.js before loading)
    title:            'Welcome to my OWRX SDR',
    subtitle:         'Please enter your callsign to continue',
    placeholder:      'e.g. 9A6NDZ',
    buttonText:       'Enter SDR',
    storageKey:       'openwebrx-callsign',  // same key OWRX+ uses for chat
    settingsKey:      'openwebrx-settings',  // OWRX+ settings object key
    minCallLength:    3,                     // minimum characters to accept
    maxCallLength:    12,                    // maximum characters to accept
    callsignPattern:  /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}[A-Z]?$/i,
    showChangeButton: true,                  // show a small "change callsign" button after login
    rememberDays:     365,                   // how many days to remember (0 = session only)
  };

  // Allow overrides set before the script loaded
  if (typeof Plugins.welcome_screen_config === 'object') {
    Object.assign(Plugins.welcome_screen, Plugins.welcome_screen_config);
  }

  const CFG = Plugins.welcome_screen;

  // --- Helpers ---------------------------------------------------------------

  /** Read saved callsign from localStorage */
  function getSavedCallsign() {
    try {
      return localStorage.getItem(CFG.storageKey) || '';
    } catch (_) { return ''; }
  }

  /** Persist callsign into all relevant localStorage slots */
  function saveCallsign(call) {
    const upper = call.trim().toUpperCase();
    try {
      // 1. Primary key used by OWRX+ chat
      localStorage.setItem(CFG.storageKey, upper);

      // 2. Also inject into the OWRX+ settings object if it exists
      //    The settings panel stores a JSON blob with user preferences.
      try {
        var settings = JSON.parse(localStorage.getItem(CFG.settingsKey) || '{}');
        settings.callsign = upper;
        localStorage.setItem(CFG.settingsKey, JSON.stringify(settings));
      } catch (_) { /* settings blob doesn't exist yet — that's fine */ }

    } catch (e) {
      console.warn('[welcome_screen] localStorage not available:', e);
    }
    return upper;
  }

  /** Push the callsign into any live DOM inputs (Settings panel, Chat) */
  function applyCallsignToDOM(callsign) {
    // Settings panel callsign field (various possible selectors)
    var selectors = [
      '#openwebrx-settings-callsign',
      'input[name="callsign"]',
      '#openwebrx-panel-settings input[type="text"]',
      '.settings-container input[name="callsign"]',
    ];
    selectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && !el.value) {
        el.value = callsign;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Chat input name field
    var chatName = document.querySelector('#openwebrx-chat-name')
                || document.querySelector('input.chat-name');
    if (chatName && !chatName.value) {
      chatName.value = callsign;
      chatName.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // --- Overlay creation ------------------------------------------------------

  function buildOverlay() {
    // Container
    var overlay = document.createElement('div');
    overlay.id = 'welcome-screen-overlay';

    // Card
    var card = document.createElement('div');
    card.className = 'welcome-screen-card';

    // Logo / antenna icon (inline SVG so no external dependency)
    var logo = document.createElement('div');
    logo.className = 'welcome-screen-logo';
    logo.innerHTML =
      '<svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="32" y1="8" x2="32" y2="56"/>' +
        '<line x1="32" y1="16" x2="16" y2="32"/>' +
        '<line x1="32" y1="16" x2="48" y2="32"/>' +
        '<path d="M20 44 Q32 36 44 44" />' +
        '<path d="M14 50 Q32 38 50 50" />' +
        '<circle cx="32" cy="8" r="3" fill="currentColor"/>' +
      '</svg>';

    // Title
    var title = document.createElement('h1');
    title.className = 'welcome-screen-title';
    title.textContent = CFG.title;

    // Subtitle
    var sub = document.createElement('p');
    sub.className = 'welcome-screen-subtitle';
    sub.textContent = CFG.subtitle;

    // Input row
    var form = document.createElement('div');
    form.className = 'welcome-screen-form';

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'welcome-screen-input';
    input.className = 'welcome-screen-input';
    input.placeholder = CFG.placeholder;
    input.maxLength = CFG.maxCallLength;
    input.autocomplete = 'off';
    input.spellcheck = false;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'welcome-screen-btn';
    btn.className = 'welcome-screen-btn';
    btn.textContent = CFG.buttonText;

    // Error message
    var err = document.createElement('p');
    err.className = 'welcome-screen-error';
    err.id = 'welcome-screen-error';

    form.appendChild(input);
    form.appendChild(btn);

    card.appendChild(logo);
    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(form);
    card.appendChild(err);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // --- Events ----------------------------------------------------------------

    function submit() {
      var val = input.value.trim().toUpperCase();
      err.textContent = '';

      if (val.length < CFG.minCallLength) {
        err.textContent = 'Callsign too short (min ' + CFG.minCallLength + ' chars)';
        input.focus();
        return;
      }

      if (!CFG.callsignPattern.test(val)) {
        err.textContent = 'Invalid callsign format. Use standard HAM callsign.';
        input.focus();
        return;
      }

      var upper = saveCallsign(val);
      dismiss(upper);
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      // Auto-uppercase while typing
      if (e.key.length === 1 && /[a-z]/.test(e.key)) {
        e.preventDefault();
        var pos = input.selectionStart;
        input.value = input.value.substring(0, pos) + e.key.toUpperCase() + input.value.substring(input.selectionEnd);
        input.setSelectionRange(pos + 1, pos + 1);
      }
      if (e.key === 'Enter') submit();
    });

    // Focus the input after the entrance animation
    requestAnimationFrame(function () {
      overlay.classList.add('visible');
      setTimeout(function () { input.focus(); }, 350);
    });
  }

  /** Remove overlay with a smooth fade-out and inject callsign into live DOM */
  function dismiss(callsign) {
    var overlay = document.getElementById('welcome-screen-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(function () { overlay.remove(); }, 400);
    }
    applyCallsignToDOM(callsign);

    // Also watch for late-rendered panels and inject callsign there too
    var observer = new MutationObserver(function () {
      applyCallsignToDOM(callsign);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Stop watching after 15 seconds
    setTimeout(function () { observer.disconnect(); }, 15000);

    // Optionally add a small "change callsign" button in the status area
    if (CFG.showChangeButton) {
      addChangeButton(callsign);
    }

    console.log('[welcome_screen] Callsign set to:', callsign);
  }

  // --- "Change callsign" floating button -------------------------------------

  function addChangeButton(currentCall) {
    var wrap = document.createElement('div');
    wrap.id = 'welcome-screen-change-wrap';
    wrap.title = 'Current callsign: ' + currentCall + ' — click to change';
    wrap.innerHTML =
      '<span class="welcome-screen-change-label">' + currentCall + '</span>' +
      '<button class="welcome-screen-change-btn" title="Change callsign">&#9998;</button>';
    document.body.appendChild(wrap);

    wrap.querySelector('.welcome-screen-change-btn').addEventListener('click', function () {
      // Remove the button and reopen overlay
      wrap.remove();
      localStorage.removeItem(CFG.storageKey);
      buildOverlay();
    });
  }

  // --- Init ------------------------------------------------------------------

  function init() {
    var saved = getSavedCallsign();
    if (saved && saved.length >= CFG.minCallLength) {
      // Already have a callsign — just inject it into the DOM when ready
      applyCallsignToDOM(saved);

      // Watch for late-rendered panels
      var observer = new MutationObserver(function () {
        applyCallsignToDOM(saved);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { observer.disconnect(); }, 15000);

      if (CFG.showChangeButton) {
        addChangeButton(saved);
      }

      console.log('[welcome_screen] Returning user:', saved);
    } else {
      // No callsign yet — show welcome overlay
      buildOverlay();
    }
    return true;
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose init for the plugin system
  Plugins.welcome_screen.init = init;

})();
