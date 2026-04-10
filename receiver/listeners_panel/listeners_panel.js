// ============================================================================
// listeners_panel - OpenWebRX+ Plugin
// Shows active listeners with their chat names and tuned frequencies.
// No IP addresses are displayed - privacy first!
//
// Author: OpenWebRX+ Community
// License: MIT
// Version: 1.0.0
// ============================================================================

Plugins.listeners_panel = {
  _version: 1,
  _name: 'listeners_panel',

  // ---- configuration (can be overridden from init.js) ----
  refreshInterval: 3000,      // ms between frequency polls
  panelTitle: 'Listeners',
  maxListeners: 50,

  // ---- internal state ----
  _panel: null,
  _tableBody: null,
  _badge: null,
  _icon: null,
  _isOpen: false,
  _listeners: new Map(),      // id -> { name, freq, lastSeen }
  _myName: null,
  _intervalId: null,
  _chatObserver: null,
  _originalWsSend: null,
  _wsRef: null,

  // ====== Helpers ==========================================================

  /**
   * Format frequency in a human-readable way (e.g. 14.205.000 Hz or 145.500 MHz)
   */
  formatFreq: function (hz) {
    if (hz == null || isNaN(hz)) return '—';
    hz = Number(hz);
    if (hz >= 1e9) {
      return (hz / 1e6).toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MHz';
    } else if (hz >= 1e6) {
      return (hz / 1e6).toFixed(3) + ' MHz';
    } else if (hz >= 1e3) {
      return (hz / 1e3).toFixed(1) + ' kHz';
    }
    return hz + ' Hz';
  },

  /**
   * Try to read the current receiver frequency from OWRX+ globals.
   */
  getCurrentFreq: function () {
    // Method 1: OWRX+ exposes the frequency via the DOM element
    try {
      var el = document.getElementById('openwebrx-panel-receiver');
      if (el) {
        var freqEl = el.querySelector('.frequency-container .digit');
        // The digits are individual spans; reconstruct the number
      }
    } catch (e) {}

    // Method 2: Global variable set by openwebrx.js
    try {
      if (typeof center_freq !== 'undefined' && typeof offset_frequency !== 'undefined') {
        return center_freq + offset_frequency;
      }
    } catch (e) {}

    // Method 3: Try to read from the frequency display element directly
    try {
      var freqDisplay = document.querySelector('.webrx-actual-freq');
      if (freqDisplay) {
        var text = freqDisplay.textContent || freqDisplay.innerText;
        var num = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch (e) {}

    // Method 4: Try the OWRX+ receiver module
    try {
      if (typeof getReceiverParam === 'function') {
        var f = getReceiverParam('offset_freq');
        var cf = getReceiverParam('center_freq');
        if (f != null && cf != null) return cf + f;
      }
    } catch (e) {}

    // Method 5: Parse from URL hash (e.g. #freq=14205000)
    try {
      var hash = window.location.hash;
      var m = hash.match(/freq=(\d+)/);
      if (m) return parseInt(m[1], 10);
    } catch (e) {}

    return null;
  },

  /**
   * Extract chat usernames from the chat panel DOM.
   * OWRX+ chat messages include the sender name.
   */
  getChatNames: function () {
    var names = new Set();
    try {
      // OWRX+ chat messages are in #openwebrx-chat-panel or .chat-message elements
      var msgs = document.querySelectorAll(
        '.chat-message .chat-sender, ' +
        '#openwebrx-panel-log .log-source, ' +
        '.owrx-chat-msg .chat-name, ' +
        '.chat-msg-sender'
      );
      msgs.forEach(function (el) {
        var name = (el.textContent || '').trim().replace(/:$/, '');
        if (name && name.length > 0 && name.length < 40) {
          names.add(name);
        }
      });
    } catch (e) {}
    return names;
  },

  // ====== WebSocket Interception ===========================================

  /**
   * Hook into the WebSocket to capture chat messages and client lists.
   * OWRX+ sends client info via WS; we intercept to read names.
   */
  hookWebSocket: function () {
    var self = this;

    // Intercept WebSocket constructor to capture the instance
    var OrigWS = window.WebSocket;
    var _origAddEventListener = WebSocket.prototype.addEventListener;

    // We'll patch onmessage of existing and new WebSockets
    function patchWS(ws) {
      if (ws._lp_patched) return;
      ws._lp_patched = true;

      var origOnMessage = null;
      var descriptor = Object.getOwnPropertyDescriptor(ws, 'onmessage');

      ws.addEventListener('message', function (event) {
        try {
          if (typeof event.data === 'string') {
            self.handleWSMessage(event.data);
          }
        } catch (e) {}
      });
    }

    // Patch existing WebSocket instances by watching for new ones
    var origWS = window.WebSocket;
    window.WebSocket = function (url, protocols) {
      var ws = protocols ? new origWS(url, protocols) : new origWS(url);
      setTimeout(function () { patchWS(ws); }, 100);
      return ws;
    };
    window.WebSocket.prototype = origWS.prototype;
    window.WebSocket.CONNECTING = origWS.CONNECTING;
    window.WebSocket.OPEN = origWS.OPEN;
    window.WebSocket.CLOSING = origWS.CLOSING;
    window.WebSocket.CLOSED = origWS.CLOSED;
  },

  /**
   * Process incoming WebSocket messages for chat data.
   */
  handleWSMessage: function (data) {
    try {
      var msg = JSON.parse(data);

      // Chat messages from OWRX+ contain "chat_message" type
      if (msg.type === 'chat_message' || msg.type === 'log_message') {
        var name = msg.name || msg.sender || msg.nick || msg.from || null;
        if (name) {
          this._myName = this._myName || name;
          // We track this name as an active listener
          this.updateListener(name, this.getCurrentFreq());
        }
      }

      // Some OWRX+ versions send client_info
      if (msg.type === 'client_info' || msg.type === 'clients') {
        if (Array.isArray(msg.clients)) {
          msg.clients.forEach(function (c) {
            var n = c.name || c.nick || c.user || ('Listener ' + (c.id || '?'));
            var f = c.frequency || c.freq || null;
            this.updateListener(n, f);
          }.bind(this));
        }
      }

      // OWRX+ receiver_details sometimes includes connected clients
      if (msg.type === 'receiver_details' && msg.clients != null) {
        // Update the count at minimum
      }

    } catch (e) {
      // Not JSON or not relevant - ignore
    }
  },

  // ====== Listener Tracking ================================================

  updateListener: function (name, freq) {
    if (!name) return;
    this._listeners.set(name, {
      name: name,
      freq: freq,
      lastSeen: Date.now()
    });
    this.renderTable();
  },

  /**
   * Periodic self-update: refresh own frequency and clean stale entries.
   */
  tick: function () {
    var now = Date.now();
    var staleMs = 5 * 60 * 1000; // 5 minutes timeout

    // Update own entry
    var myFreq = this.getCurrentFreq();
    var myName = this._myName || this.detectOwnName() || 'Ja (lokalno)';
    this.updateListener(myName, myFreq);

    // Prune stale listeners
    var toRemove = [];
    this._listeners.forEach(function (val, key) {
      if (now - val.lastSeen > staleMs) {
        toRemove.push(key);
      }
    });
    toRemove.forEach(function (k) { this._listeners.delete(k); }.bind(this));

    // Update badge count
    this.updateBadge();
    this.renderTable();
  },

  detectOwnName: function () {
    // Try to get our own chat name from the input field or stored cookie
    try {
      var input = document.querySelector('#openwebrx-chat-message-input, .chat-input input, .chat-input');
      if (input && input.dataset && input.dataset.name) return input.dataset.name;

      // Try reading from OWRX+ cookie/localStorage
      var stored = localStorage.getItem('openwebrx-chat-name') ||
                   localStorage.getItem('owrx_chat_name');
      if (stored) return stored;
    } catch (e) {}
    return null;
  },

  // ====== Chat DOM Observer ================================================

  /**
   * Watch for new chat messages appearing in the DOM.
   */
  observeChat: function () {
    var self = this;
    var chatContainers = document.querySelectorAll(
      '#openwebrx-panel-log, #openwebrx-chat-panel, .chat-panel, .chat-messages'
    );

    chatContainers.forEach(function (container) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            // Try to extract name from the new chat message
            var senderEl = node.querySelector(
              '.chat-sender, .log-source, .chat-name, .chat-msg-sender'
            );
            if (senderEl) {
              var name = senderEl.textContent.trim().replace(/:$/, '');
              if (name) {
                self.updateListener(name, self.getCurrentFreq());
              }
            }
          });
        });
      });

      observer.observe(container, { childList: true, subtree: true });
      self._chatObserver = observer;
    });
  },

  // ====== UI Building ======================================================

  /**
   * Create the headphone icon button in the section header area.
   */
  createIcon: function () {
    var self = this;

    // Create the icon container
    var iconWrap = document.createElement('div');
    iconWrap.className = 'listeners-icon-wrap';
    iconWrap.title = this.panelTitle;

    // SVG headphone icon
    iconWrap.innerHTML =
      '<svg class="listeners-icon" viewBox="0 0 24 24" width="22" height="22" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round">' +
      '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/>' +
      '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>' +
      '<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' +
      '</svg>';

    // Badge for listener count
    var badge = document.createElement('span');
    badge.className = 'listeners-badge';
    badge.textContent = '0';
    iconWrap.appendChild(badge);
    this._badge = badge;

    // Click handler
    iconWrap.addEventListener('click', function (e) {
      e.stopPropagation();
      self.togglePanel();
    });

    this._icon = iconWrap;
    return iconWrap;
  },

  /**
   * Create the floating panel that shows the listeners table.
   */
  createPanel: function () {
    var panel = document.createElement('div');
    panel.className = 'listeners-panel';
    panel.style.display = 'none';

    // Header
    var header = document.createElement('div');
    header.className = 'listeners-panel-header';
    header.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">' +
      '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/>' +
      '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>' +
      '<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' +
      '</svg>' +
      '<span>' + this.panelTitle + '</span>';

    // Close button
    var closeBtn = document.createElement('span');
    closeBtn.className = 'listeners-panel-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () {
      this.togglePanel(false);
    }.bind(this));
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Table
    var table = document.createElement('table');
    table.className = 'listeners-table';

    var thead = document.createElement('thead');
    thead.innerHTML =
      '<tr>' +
      '<th class="lp-col-status"></th>' +
      '<th class="lp-col-name">Ime / Nadimak</th>' +
      '<th class="lp-col-freq">Frekvencija</th>' +
      '</tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    this._tableBody = tbody;
    table.appendChild(tbody);

    panel.appendChild(table);

    // Empty state
    var empty = document.createElement('div');
    empty.className = 'listeners-empty';
    empty.textContent = 'Nema aktivnih slušatelja';
    panel.appendChild(empty);

    this._panel = panel;
    return panel;
  },

  /**
   * Inject the icon into the OWRX+ section header area.
   */
  injectUI: function () {
    var icon = this.createIcon();
    var panel = this.createPanel();

    // Strategy 1: Insert into the OWRX+ top bar / section header
    var targets = [
      '.openwebrx-top-bar',
      '.openwebrx-section',
      '#openwebrx-top-container',
      '.openwebrx-top-container',
      'header',
      '.navbar',
      '.section.top',
      '#openwebrx-panels-container'
    ];

    var inserted = false;
    for (var i = 0; i < targets.length; i++) {
      var target = document.querySelector(targets[i]);
      if (target) {
        target.appendChild(icon);
        inserted = true;
        break;
      }
    }

    // Fallback: insert as a fixed element
    if (!inserted) {
      icon.classList.add('listeners-icon-fixed');
      document.body.appendChild(icon);
    }

    // Append panel to body for absolute positioning
    document.body.appendChild(panel);

    // Click outside to close
    document.addEventListener('click', function (e) {
      if (this._isOpen && !panel.contains(e.target) && !icon.contains(e.target)) {
        this.togglePanel(false);
      }
    }.bind(this));
  },

  // ====== UI Updates =======================================================

  togglePanel: function (forceState) {
    this._isOpen = forceState != null ? forceState : !this._isOpen;
    this._panel.style.display = this._isOpen ? 'block' : 'none';
    if (this._icon) {
      this._icon.classList.toggle('active', this._isOpen);
    }
    if (this._isOpen) {
      this.positionPanel();
      this.renderTable();
    }
  },

  positionPanel: function () {
    if (!this._icon || !this._panel) return;
    var rect = this._icon.getBoundingClientRect();
    var panelW = 320;

    var left = rect.left + rect.width / 2 - panelW / 2;
    if (left < 8) left = 8;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - 8 - panelW;

    this._panel.style.left = left + 'px';
    this._panel.style.top = (rect.bottom + 8) + 'px';
  },

  updateBadge: function () {
    if (this._badge) {
      var count = this._listeners.size;
      this._badge.textContent = count;
      this._badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  renderTable: function () {
    if (!this._tableBody) return;

    var rows = [];
    this._listeners.forEach(function (listener) {
      rows.push(listener);
    });

    // Sort: most recent first
    rows.sort(function (a, b) { return b.lastSeen - a.lastSeen; });

    // Limit
    if (rows.length > this.maxListeners) rows = rows.slice(0, this.maxListeners);

    this._tableBody.innerHTML = '';

    var self = this;
    rows.forEach(function (listener) {
      var tr = document.createElement('tr');

      // Status dot
      var tdStatus = document.createElement('td');
      tdStatus.className = 'lp-col-status';
      var dot = document.createElement('span');
      var age = Date.now() - listener.lastSeen;
      dot.className = 'lp-dot' + (age < 30000 ? ' lp-dot-active' : ' lp-dot-idle');
      tdStatus.appendChild(dot);
      tr.appendChild(tdStatus);

      // Name
      var tdName = document.createElement('td');
      tdName.className = 'lp-col-name';
      tdName.textContent = listener.name || 'Anonimni';
      tr.appendChild(tdName);

      // Frequency
      var tdFreq = document.createElement('td');
      tdFreq.className = 'lp-col-freq';
      tdFreq.textContent = self.formatFreq(listener.freq);
      tr.appendChild(tdFreq);

      self._tableBody.appendChild(tr);
    });

    // Toggle empty state
    var emptyEl = this._panel ? this._panel.querySelector('.listeners-empty') : null;
    if (emptyEl) {
      emptyEl.style.display = rows.length === 0 ? 'block' : 'none';
    }

    var tableEl = this._panel ? this._panel.querySelector('.listeners-table') : null;
    if (tableEl) {
      tableEl.style.display = rows.length > 0 ? 'table' : 'none';
    }
  },

  // ====== Plugin Init ======================================================

  init: function () {
    try {
      console.log('[listeners_panel] Initializing v' + this._version + '...');

      // Build and inject UI
      this.injectUI();

      // Hook WebSocket for chat/client data
      this.hookWebSocket();

      // Observe chat DOM for new messages
      this.observeChat();

      // Start periodic updates
      this._intervalId = setInterval(this.tick.bind(this), this.refreshInterval);

      // Initial tick
      this.tick();

      console.log('[listeners_panel] Ready.');
      return true;
    } catch (e) {
      console.error('[listeners_panel] Init failed:', e);
      return false;
    }
  }
};

// Auto-init if loaded after DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  Plugins.listeners_panel.init();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    Plugins.listeners_panel.init();
  });
}
