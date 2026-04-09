// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
// Version: 5
//
// After callsign entry, auto-sends a chat message so the server
// immediately registers the name in admin Settings > Clients.
// ============================================================================

(function () {
  'use strict';

  Plugins.welcome_screen = {
    _version: 5,
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
    // Message sent automatically so server registers the name
    autoMessage:      'Connected',
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

  // --- Fill callsign into chat name + settings fields -----------------------

  function fillDOM(cs) {
    // Chat name input — the field left of "Message" in the log/chat panel
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
        document.querySelectorAll(sel).forEach(function(el) {
          el.value = cs;
          el.dispatchEvent(new Event('input', {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
        });
      } catch(e) {}
    });

    // Settings callsign
    ['#openwebrx-settings-callsign', '.settings-container input[name="callsign"]'].forEach(function(sel) {
      try {
        document.querySelectorAll(sel).forEach(function(el) {
          if (!el.value) {
            el.value = cs;
            el.dispatchEvent(new Event('change', {bubbles:true}));
          }
        });
      } catch(e) {}
    });
  }

  // --- Auto-send a chat message so server registers the name ----------------
  //
  // OWRX+ chat panel: [Name input] [Message input] [Send button]
  // The server only learns the client's name when a chat message is sent.
  // We fill the name, put a short message, and click Send programmatically.

  function autoSendChat(cs, attempt) {
    attempt = attempt || 0;
    if (attempt > 15) return; // give up after ~30s

    // Find all text inputs in the log/chat panel area
    var panel = document.getElementById('openwebrx-panel-log') ||
                document.getElementById('openwebrx-panel-chat') ||
                document.querySelector('.openwebrx-panel-chat') ||
                document.querySelector('[id*="panel-log"]') ||
                document.querySelector('[id*="panel-chat"]');

    if (!panel) {
      setTimeout(function() { autoSendChat(cs, attempt + 1); }, 2000);
      return;
    }

    var inputs = panel.querySelectorAll('input[type="text"]');
    var sendBtn = panel.querySelector('button') ||
                  panel.querySelector('input[type="submit"]') ||
                  panel.querySelector('[onclick*="send"]');

    // We need at least a name input and a message input + send button
    // Typical layout: inputs[0] = name, inputs[1] = message
    if (inputs.length >= 2 && sendBtn) {
      // Fill name
      inputs[0].value = cs;
      inputs[0].dispatchEvent(new Event('input', {bubbles:true}));
      inputs[0].dispatchEvent(new Event('change', {bubbles:true}));

      // Fill message
      inputs[1].value = CFG.autoMessage;
      inputs[1].dispatchEvent(new Event('input', {bubbles:true}));
      inputs[1].dispatchEvent(new Event('change', {bubbles:true}));

      // Click send
      setTimeout(function() {
        sendBtn.click();
        console.log('[welcome_screen] Auto-sent chat message as:', cs);
      }, 500);

    } else if (inputs.length >= 1 && sendBtn) {
      // Some versions: single input for message, name is separate
      // Try filling the first input as name if it looks like a name field
      // (placeholder contains 'name' or 'call' or field is short)
      inputs[0].value = cs;
      inputs[0].dispatchEvent(new Event('input', {bubbles:true}));
      inputs[0].dispatchEvent(new Event('change', {bubbles:true}));

      // If there's a message input somewhere else
      var msgInput = panel.querySelector('input[placeholder*="essage"]') ||
                     panel.querySelector('input[placeholder*="Message"]');
      if (msgInput) {
        msgInput.value = CFG.autoMessage;
        msgInput.dispatchEvent(new Event('input', {bubbles:true}));
        setTimeout(function() { sendBtn.click(); }, 500);
      }
    } else {
      // Panel not fully rendered yet
      setTimeout(function() { autoSendChat(cs, attempt + 1); }, 2000);
    }
  }

  // --- MutationObserver -----------------------------------------------------

  function watchFill(cs) {
    var obs = new MutationObserver(function() { fillDOM(cs); });
    obs.observe(document.body, {childList:true, subtree:true});
    setTimeout(function() { obs.disconnect(); }, 30000);
  }

  // --- Overlay --------------------------------------------------------------

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

  // --- Activate -------------------------------------------------------------

  function activate(cs) {
    fillDOM(cs);
    watchFill(cs);
    // Auto-send a chat message so server registers name immediately
    autoSendChat(cs);
    if (CFG.showChangeButton) addBadge(cs);
    console.log('[welcome_screen] Activated:', cs);
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
