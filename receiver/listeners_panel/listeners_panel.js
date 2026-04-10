// ============================================================================
// listeners_panel - OpenWebRX+ Plugin
// Shows active listeners with their chat names and tuned frequencies.
// No IP addresses are displayed - privacy first!
//
// Author: 9A6NDZ (Zoran)
// License: MIT
// Version: 2.0.0
// ============================================================================

Plugins.listeners_panel = Plugins.listeners_panel || {};

(function (P) {
  P._version = 2;
  P._name = 'listeners_panel';
  P.no_css = false; // loader will fetch listeners_panel.css automatically

  // ---- Configuration (override in init.js before loading) ----
  if (P.panelTitle   === undefined) P.panelTitle   = 'Listeners';
  if (P.maxListeners === undefined) P.maxListeners = 50;
  if (P.staleTimeout === undefined) P.staleTimeout = 300000; // 5 min

  // ---- Internal state ----
  var _panel      = null;
  var _tableBody  = null;
  var _isOpen     = false;
  var _listeners  = {};   // keyed by name
  var _myName     = null;
  var _pollTimer  = null;
  var _origWS     = null;

  // ========================================================================
  // Frequency reading - reads from the DOM element #webrx-actual-freq
  // This is the element that OWRX+ updates in real-time with the tuned freq.
  // Format is like "14.205.000 MHz" or "145.500.000 MHz"
  // ========================================================================

  function readMyFrequency() {
    var el = document.getElementById('webrx-actual-freq');
    if (el) {
      var text = (el.textContent || el.innerText || '').trim();
      if (text && text !== '---.--- MHz') return text;
    }
    return null;
  }

  // ========================================================================
  // Format frequency - parse text from DOM or return as-is
  // ========================================================================

  function formatFreq(val) {
    if (!val) return '—';
    // If already a string like "14.205.000 MHz", return it
    if (typeof val === 'string' && val.indexOf('Hz') !== -1) return val;
    // If numeric (Hz), format nicely
    var n = Number(val);
    if (isNaN(n) || n <= 0) return String(val);
    if (n >= 1e6) return (n / 1e6).toFixed(3) + ' MHz';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' kHz';
    return n + ' Hz';
  }

  // ========================================================================
  // WebSocket hook - intercept ALL WebSocket traffic to capture chat names
  // and any client_info / receiver messages from the server
  // ========================================================================

  function hookWebSocket() {
    _origWS = window.WebSocket;

    window.WebSocket = function (url, protocols) {
      var ws = protocols ? new _origWS(url, protocols) : new _origWS(url);

      ws.addEventListener('message', function (evt) {
        try {
          if (typeof evt.data === 'string') {
            parseWSMessage(evt.data);
          }
        } catch (e) { /* ignore */ }
      });

      return ws;
    };

    // Preserve prototype and static props
    window.WebSocket.prototype = _origWS.prototype;
    window.WebSocket.CONNECTING = _origWS.CONNECTING;
    window.WebSocket.OPEN       = _origWS.OPEN;
    window.WebSocket.CLOSING    = _origWS.CLOSING;
    window.WebSocket.CLOSED     = _origWS.CLOSED;
  }

  function parseWSMessage(data) {
    var msg;
    try { msg = JSON.parse(data); } catch (e) { return; }

    // OWRX+ sends chat messages with various type names
    if (msg.type === 'chat_message' || msg.type === 'log_message' ||
        msg.type === 'chat') {
      var name = msg.name || msg.sender || msg.nick || msg.from || null;
      if (name) {
        updateListener(name, null); // freq unknown for remote users
      }
    }

    // Some OWRX+ versions broadcast client lists
    if (msg.type === 'clients' && Array.isArray(msg.clients)) {
      msg.clients.forEach(function (c) {
        var n = c.name || c.nick || c.user || null;
        if (n) updateListener(n, c.freq || c.frequency || null);
      });
    }

    // receiver_details may contain client count
    if (msg.type === 'receiver_details' && msg.clients != null) {
      updateBadge();
    }
  }

  // ========================================================================
  // Chat DOM observer - watch for new chat messages in the DOM
  // OWRX+ chat panel adds elements with sender names
  // ========================================================================

  function observeChatDOM() {
    // Wait a bit for panels to be created, then observe
    setTimeout(function () {
      var containers = document.querySelectorAll(
        '#openwebrx-panel-log, #openwebrx-panel-chat, .chat-panel, .owrx-chat'
      );
      containers.forEach(function (container) {
        new MutationObserver(function (mutations) {
          mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
              if (node.nodeType !== 1) return;
              var sender = node.querySelector(
                '.chat-sender, .chat-name, .chat-msg-sender, .log-source'
              );
              if (sender) {
                var name = sender.textContent.trim().replace(/:$/, '');
                if (name) updateListener(name, null);
              }
            });
          });
        }).observe(container, { childList: true, subtree: true });
      });
    }, 3000);
  }

  // ========================================================================
  // Listener tracking
  // ========================================================================

  function updateListener(name, freq) {
    if (!name) return;
    var existing = _listeners[name];
    _listeners[name] = {
      name: name,
      freq: freq || (existing ? existing.freq : null),
      lastSeen: Date.now()
    };
    updateBadge();
    if (_isOpen) renderTable();
  }

  function pruneStale() {
    var now = Date.now();
    var keys = Object.keys(_listeners);
    keys.forEach(function (k) {
      if (now - _listeners[k].lastSeen > P.staleTimeout) {
        delete _listeners[k];
      }
    });
  }

  function listenerCount() {
    return Object.keys(_listeners).length;
  }

  // ========================================================================
  // Periodic tick - update own frequency, prune stale
  // ========================================================================

  function tick() {
    var myFreq = readMyFrequency();
    var myName = _myName || detectOwnName() || 'You (local)';
    _listeners[myName] = {
      name: myName,
      freq: myFreq,
      lastSeen: Date.now()
    };

    pruneStale();
    updateBadge();
    if (_isOpen) renderTable();
  }

  function detectOwnName() {
    // Try to find own chat name
    try {
      var el = document.querySelector(
        '#openwebrx-chat-name, .chat-name-input, [data-chat-name]'
      );
      if (el) {
        var n = el.value || el.dataset.chatName || el.textContent;
        if (n && n.trim()) { _myName = n.trim(); return _myName; }
      }
      var stored = null;
      try { stored = localStorage.getItem('openwebrx-chat-name'); } catch(e){}
      if (stored) { _myName = stored; return stored; }
    } catch (e) {}
    return null;
  }

  // ========================================================================
  // UI: Navbar button - insert <li> into #openwebrx-main-buttons ul
  // Position: right after the Help button (first <li>)
  // ========================================================================

  function createNavbarButton() {
    var section = document.getElementById('openwebrx-main-buttons');
    if (!section) {
      // Try broader selectors for different OWRX+ versions
      section = document.querySelector(
        'section.buttons, .openwebrx-main-buttons, header section'
      );
    }
    if (!section) {
      console.warn('[listeners_panel] Cannot find navbar section');
      return false;
    }

    var ul = section.querySelector('ul');
    if (!ul) {
      console.warn('[listeners_panel] Cannot find navbar <ul>');
      return false;
    }

    // Create our <li> to match existing style
    var li = document.createElement('li');
    li.id = 'openwebrx-button-listeners';
    li.className = 'listeners-nav-btn';
    li.title = P.panelTitle;

    // SVG headphone icon matching OWRX+ icon style (white, outlined)
    li.innerHTML =
      '<svg class="listeners-nav-icon" xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/>' +
      '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>' +
      '<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' +
      '</svg>' +
      '<br/><span class="listeners-nav-label">' + P.panelTitle + '</span>';

    // Badge
    var badge = document.createElement('span');
    badge.className = 'listeners-badge';
    badge.id = 'listeners-badge';
    badge.textContent = '0';
    li.appendChild(badge);

    // Click handler
    li.addEventListener('mouseup', function (e) {
      e.stopPropagation();
      togglePanel();
    });

    // Insert AFTER the first <li> (Help button)
    var items = ul.querySelectorAll('li');
    if (items.length > 1) {
      // Insert after Help (first item)
      items[0].parentNode.insertBefore(li, items[1]);
    } else {
      ul.appendChild(li);
    }

    return true;
  }

  // ========================================================================
  // UI: Floating panel with listeners table
  // ========================================================================

  function createPanel() {
    var panel = document.createElement('div');
    panel.id = 'listeners-panel';
    panel.className = 'listeners-panel';
    panel.style.display = 'none';

    // Header
    var header = document.createElement('div');
    header.className = 'lp-header';

    var titleSpan = document.createElement('span');
    titleSpan.className = 'lp-title';
    titleSpan.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;">' +
      '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/>' +
      '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>' +
      '<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' +
      '</svg>' + P.panelTitle;
    header.appendChild(titleSpan);

    var closeBtn = document.createElement('span');
    closeBtn.className = 'lp-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () { togglePanel(false); });
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Table
    var table = document.createElement('table');
    table.className = 'lp-table';

    var thead = document.createElement('thead');
    thead.innerHTML =
      '<tr>' +
      '<th class="lp-th-status"></th>' +
      '<th class="lp-th-name">Name</th>' +
      '<th class="lp-th-freq">Frequency</th>' +
      '</tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.id = 'lp-tbody';
    table.appendChild(tbody);
    _tableBody = tbody;

    panel.appendChild(table);

    // Empty state
    var empty = document.createElement('div');
    empty.className = 'lp-empty';
    empty.id = 'lp-empty';
    empty.textContent = 'No active listeners';
    panel.appendChild(empty);

    document.body.appendChild(panel);
    _panel = panel;

    // Click outside to close
    document.addEventListener('click', function (e) {
      if (_isOpen && _panel && !_panel.contains(e.target)) {
        var btn = document.getElementById('openwebrx-button-listeners');
        if (btn && btn.contains(e.target)) return;
        togglePanel(false);
      }
    });

    return panel;
  }

  // ========================================================================
  // Panel toggle and positioning
  // ========================================================================

  function togglePanel(force) {
    _isOpen = (force !== undefined) ? force : !_isOpen;
    if (!_panel) return;

    _panel.style.display = _isOpen ? 'block' : 'none';

    var btn = document.getElementById('openwebrx-button-listeners');
    if (btn) btn.classList.toggle('highlighted', _isOpen);

    if (_isOpen) {
      positionPanel();
      renderTable();
    }
  }

  function positionPanel() {
    var btn = document.getElementById('openwebrx-button-listeners');
    if (!btn || !_panel) return;

    var rect = btn.getBoundingClientRect();
    var pw = 340;

    var left = rect.left + rect.width / 2 - pw / 2;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;

    _panel.style.left = left + 'px';
    _panel.style.top = (rect.bottom + 6) + 'px';
  }

  // ========================================================================
  // Badge update
  // ========================================================================

  function updateBadge() {
    var badge = document.getElementById('listeners-badge');
    if (!badge) return;
    var count = listenerCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  // ========================================================================
  // Table render
  // ========================================================================

  function renderTable() {
    if (!_tableBody) return;

    var rows = [];
    Object.keys(_listeners).forEach(function (k) {
      rows.push(_listeners[k]);
    });

    // Sort: most recently seen first
    rows.sort(function (a, b) { return b.lastSeen - a.lastSeen; });
    if (rows.length > P.maxListeners) rows = rows.slice(0, P.maxListeners);

    _tableBody.innerHTML = '';

    rows.forEach(function (listener) {
      var tr = document.createElement('tr');

      // Status dot
      var td1 = document.createElement('td');
      td1.className = 'lp-td-status';
      var dot = document.createElement('span');
      var age = Date.now() - listener.lastSeen;
      dot.className = 'lp-dot' + (age < 30000 ? ' lp-active' : ' lp-idle');
      td1.appendChild(dot);
      tr.appendChild(td1);

      // Name
      var td2 = document.createElement('td');
      td2.className = 'lp-td-name';
      td2.textContent = listener.name;
      tr.appendChild(td2);

      // Frequency
      var td3 = document.createElement('td');
      td3.className = 'lp-td-freq';
      td3.textContent = formatFreq(listener.freq);
      tr.appendChild(td3);

      _tableBody.appendChild(tr);
    });

    // Empty state
    var emptyEl = document.getElementById('lp-empty');
    var tableEl = _panel ? _panel.querySelector('.lp-table') : null;
    if (emptyEl) emptyEl.style.display = rows.length === 0 ? 'block' : 'none';
    if (tableEl) tableEl.style.display = rows.length > 0 ? 'table' : 'none';
  }

  // ========================================================================
  // Plugin init
  // ========================================================================

  P.init = function () {
    console.log('[listeners_panel] Initializing v' + P._version + '...');

    // 1. Hook WebSocket BEFORE owrx creates its connection
    hookWebSocket();

    // 2. Wait for DOM to be fully ready, then inject UI
    function setup() {
      var ok = createNavbarButton();
      if (!ok) {
        // Retry a few times - OWRX+ may build the navbar dynamically
        var retries = 0;
        var retryId = setInterval(function () {
          retries++;
          if (createNavbarButton() || retries > 20) {
            clearInterval(retryId);
            afterNavbarReady();
          }
        }, 500);
      } else {
        afterNavbarReady();
      }
    }

    function afterNavbarReady() {
      createPanel();
      observeChatDOM();

      // Start polling own frequency every 2 seconds
      _pollTimer = setInterval(tick, 2000);
      tick(); // initial

      console.log('[listeners_panel] Ready.');
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Small delay to let OWRX+ build its DOM first
      setTimeout(setup, 500);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(setup, 500);
      });
    }

    return true;
  };

})(Plugins.listeners_panel);

// Auto-init
if (typeof Plugins !== 'undefined' && Plugins.listeners_panel) {
  Plugins.listeners_panel.init();
}
