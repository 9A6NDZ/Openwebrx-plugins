/*
 * Plugin: DX Cluster Feed for OpenWebRX+
 * Displays live DX cluster spots in the receiver panel.
 * Click on a spot to tune the receiver to that frequency.
 *
 * Author: 9A6NDZ
 * License: MIT
 */

Plugins.dx_cluster = Plugins.dx_cluster || {};
Plugins.dx_cluster._version = 1.1;

// ---- Configuration (can be overridden via Plugins.dx_cluster_config) ----
Plugins.dx_cluster._defaultConfig = {
  feedUrl:         'https://web.cluster.iz3mez.it/spots.json/',
  fallbackUrls:    [
    'https://web.cluster.iz3mez.it/spots.json/',
  ],
  clusterHost:     '',
  clusterPort:     7300,
  callsign:        '',
  refreshInterval: 60,
  maxSpots:        30,
  autoRefresh:     true,
  collapsed:       true,
  band:            'all',
};

// ---- State ----
Plugins.dx_cluster._spots = [];
Plugins.dx_cluster._refreshTimer = null;
Plugins.dx_cluster._lastUpdate = null;
Plugins.dx_cluster._loading = false;

// ---- Band definitions (kHz) ----
Plugins.dx_cluster.BANDS = {
  '160m': { min: 1800,   max: 2000   },
  '80m':  { min: 3500,   max: 4000   },
  '40m':  { min: 7000,   max: 7300   },
  '30m':  { min: 10100,  max: 10150  },
  '20m':  { min: 14000,  max: 14350  },
  '17m':  { min: 18068,  max: 18168  },
  '15m':  { min: 21000,  max: 21450  },
  '12m':  { min: 24890,  max: 24990  },
  '10m':  { min: 28000,  max: 29700  },
  '6m':   { min: 50000,  max: 54000  },
  '2m':   { min: 144000, max: 148000 },
};

Plugins.dx_cluster.BAND_COLORS = {
  '160m': '#cc6666',
  '80m':  '#cc8844',
  '40m':  '#ccaa44',
  '30m':  '#88aa44',
  '20m':  '#44aa66',
  '17m':  '#44aaaa',
  '15m':  '#4488cc',
  '12m':  '#6666cc',
  '10m':  '#aa44cc',
  '6m':   '#cc44aa',
  '2m':   '#cc4466',
};

// ---- Storage helpers ----
Plugins.dx_cluster._storageKey = 'owrx_dx_cluster_settings';

Plugins.dx_cluster._saveSettings = function () {
  try {
    var settings = {
      collapsed:     Plugins.dx_cluster._collapsed,
      band:          Plugins.dx_cluster._band,
      autoRefresh:   Plugins.dx_cluster._autoRefresh,
      maxSpots:      Plugins.dx_cluster._maxSpots,
      refreshInterval: Plugins.dx_cluster._refreshInterval,
    };
    localStorage.setItem(Plugins.dx_cluster._storageKey, JSON.stringify(settings));
  } catch (e) { /* ignore */ }
};

Plugins.dx_cluster._loadSettings = function () {
  try {
    var raw = localStorage.getItem(Plugins.dx_cluster._storageKey);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
};

// ---- Utility: detect band from frequency (kHz) ----
Plugins.dx_cluster._getBand = function (freqKhz) {
  var f = parseFloat(freqKhz);
  if (isNaN(f)) return null;
  var bands = Plugins.dx_cluster.BANDS;
  for (var b in bands) {
    if (bands.hasOwnProperty(b) && f >= bands[b].min && f <= bands[b].max) return b;
  }
  return null;
};

// ---- Tune to frequency ----
Plugins.dx_cluster._tuneToFreq = function (freqKhz) {
  var freqHz = Math.round(parseFloat(freqKhz) * 1000);
  if (isNaN(freqHz) || freqHz <= 0) return;

  try {
    // OWRX+ primary API
    if (typeof openwebrx !== 'undefined') {
      if (typeof openwebrx.setFrequency === 'function') {
        openwebrx.setFrequency(freqHz);
        return;
      }
    }
    // Demodulator panel
    if (typeof demodulatorPanel !== 'undefined') {
      if (typeof demodulatorPanel.setFrequency === 'function') {
        demodulatorPanel.setFrequency(freqHz);
        return;
      }
    }
    // Event-based fallback
    $(document).trigger('openwebrx:tune', { frequency: freqHz });
    console.log('[dx_cluster] Tune to ' + freqHz + ' Hz');
  } catch (e) {
    console.warn('[dx_cluster] Could not tune to frequency:', e);
  }
};

// ---- Data parsing helpers ----
Plugins.dx_cluster._parseDxlite = function (data) {
  // dxlite.g7vjr.org returns an array of spot objects
  if (!Array.isArray(data)) return [];
  return data.map(function (s) {
    return {
      time:    s.utc   || s.time  || '',
      dxCall:  s.dx    || s.dxcall || s.DX    || '',
      freq:    s.mhz   ? String(parseFloat(s.mhz) * 1000) : (s.freq || s.frequency || ''),
      spotter: s.call  || s.spotter || s.de   || '',
      comment: s.info  || s.comment || s.remarks || '',
    };
  }).filter(function (s) { return s.dxCall && s.freq; });
};

Plugins.dx_cluster._parseGenericJson = function (data) {
  // Try common JSON shapes: {spots:[...]}, {data:[...]}, [...] direct array
  var arr = null;
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && Array.isArray(data.spots)) {
    arr = data.spots;
  } else if (data && Array.isArray(data.data)) {
    arr = data.data;
  }
  if (!arr) return [];

  return arr.map(function (s) {
    // Normalise various field names
    var freq = s.freq || s.frequency || s.mhz || s.khz || s.qrg || '';
    if (s.mhz) freq = String(parseFloat(s.mhz) * 1000);
    return {
      time:    s.time    || s.utc     || s.timestamp || s.when  || '',
      dxCall:  s.dxcall  || s.dx      || s.DX        || s.call  || '',
      freq:    String(freq),
      spotter: s.spotter || s.de      || s.call2     || s.by    || '',
      comment: s.comment || s.info    || s.remarks   || s.text  || '',
    };
  }).filter(function (s) { return s.dxCall && s.freq; });
};

Plugins.dx_cluster._parseIz3mez = function (data) {
  var arr = Array.isArray(data) ? data : (data && Array.isArray(data.spots) ? data.spots : null);
  if (!arr) return [];
  return arr.map(function (s) {
    return {
      time:    s.spot_time || s.time || '',
      dxCall:  s.spotted   || s.dx   || '',
      freq:    s.frequency || s.freq || '',
      spotter: s.spotter   || s.de   || '',
      comment: s.spotted_country || s.comment || s.info || '',
    };
  }).filter(function (s) { return s.dxCall && s.freq; });
};

// ---- Fetch spots ----
Plugins.dx_cluster._fetchSpots = function () {
  if (Plugins.dx_cluster._loading) return;
  Plugins.dx_cluster._loading = true;
  Plugins.dx_cluster._setStatus('loading');

  var urls = [Plugins.dx_cluster._feedUrl];
  var fallbacks = Plugins.dx_cluster._fallbackUrls || [];
  for (var i = 0; i < fallbacks.length; i++) {
    if (urls.indexOf(fallbacks[i]) === -1) urls.push(fallbacks[i]);
  }

  Plugins.dx_cluster._tryFetchFromUrls(urls, 0);
};

Plugins.dx_cluster._tryFetchFromUrls = function (urls, index) {
  if (index >= urls.length) {
    Plugins.dx_cluster._loading = false;
    Plugins.dx_cluster._setStatus('error', 'All feed URLs failed');
    return;
  }

  var url = urls[index];
  console.log('[dx_cluster] Trying feed: ' + url);

  fetch(url, { cache: 'no-store' })
    .then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.text();
    })
    .then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) {
        throw new Error('Invalid JSON');
      }
      // Try IZ3MEZ format first, then dxlite, then generic
      var spots = Plugins.dx_cluster._parseIz3mez(data);
      if (spots.length === 0) spots = Plugins.dx_cluster._parseDxlite(data);
      if (spots.length === 0) spots = Plugins.dx_cluster._parseGenericJson(data);
      if (spots.length === 0) throw new Error('No spots parsed');

      Plugins.dx_cluster._spots = spots;
      Plugins.dx_cluster._lastUpdate = new Date();
      Plugins.dx_cluster._loading = false;
      Plugins.dx_cluster._renderSpots();
      console.log('[dx_cluster] Fetched ' + spots.length + ' spots from ' + url);
    })
    .catch(function (err) {
      console.warn('[dx_cluster] Feed failed (' + url + '): ' + err.message);
      // Try next fallback
      Plugins.dx_cluster._tryFetchFromUrls(urls, index + 1);
    });
};

// ---- Render helpers ----
Plugins.dx_cluster._setStatus = function (type, msg) {
  var tbody = $('#dx-cluster-tbody');
  var statusEl = $('#dx-cluster-status');
  if (!statusEl.length) return;
  statusEl.removeClass('dx-cluster-status-loading dx-cluster-status-error');
  if (type === 'loading') {
    statusEl.text('Loading…').addClass('dx-cluster-status-loading').show();
    tbody.empty();
  } else if (type === 'error') {
    var errMsg = 'Could not load DX spots';
    if (msg) errMsg += ' (' + msg + ')';
    errMsg += '. Check feed URL or CORS policy.';
    statusEl.text(errMsg).addClass('dx-cluster-status-error').show();
  } else {
    statusEl.hide();
  }
};

Plugins.dx_cluster._renderSpots = function () {
  var tbody = $('#dx-cluster-tbody');
  var statusEl = $('#dx-cluster-status');
  var lastUpdateEl = $('#dx-cluster-last-update');
  if (!tbody.length) return;

  var band = Plugins.dx_cluster._band;
  var max  = Plugins.dx_cluster._maxSpots;
  var bands = Plugins.dx_cluster.BANDS;

  // Filter by band
  var filtered = Plugins.dx_cluster._spots.filter(function (s) {
    if (band === 'all') return true;
    var f = parseFloat(s.freq);
    if (isNaN(f)) return false;
    var b = bands[band];
    return b && f >= b.min && f <= b.max;
  });

  // Trim to max
  filtered = filtered.slice(0, max);

  tbody.empty();
  statusEl.hide();

  if (filtered.length === 0) {
    statusEl.text('No spots found' + (band !== 'all' ? ' for ' + band : '') + '.').show();
  } else {
    filtered.forEach(function (s) {
      var detectedBand = Plugins.dx_cluster._getBand(s.freq);
      var bandColor = detectedBand ? (Plugins.dx_cluster.BAND_COLORS[detectedBand] || '') : '';

      var freqDisplay = parseFloat(s.freq);
      freqDisplay = isNaN(freqDisplay) ? s.freq : freqDisplay.toFixed(1);

      var tr = $('<tr>', { 'class': 'dx-cluster-row', title: 'Click to tune to ' + freqDisplay + ' kHz' });
      if (bandColor) tr.css('border-left', '3px solid ' + bandColor);

      tr.append(
        $('<td>', { 'class': 'dx-cluster-td dx-cluster-time',    text: s.time    }),
        $('<td>', { 'class': 'dx-cluster-td dx-cluster-dxcall',  text: s.dxCall  }),
        $('<td>', { 'class': 'dx-cluster-td dx-cluster-freq',    text: freqDisplay }),
        $('<td>', { 'class': 'dx-cluster-td dx-cluster-spotter', text: s.spotter }),
        $('<td>', { 'class': 'dx-cluster-td dx-cluster-comment', text: s.comment })
      );

      tr.on('click', (function (freq) {
        return function () { Plugins.dx_cluster._tuneToFreq(freq); };
      })(s.freq));

      tbody.append(tr);
    });
  }

  if (Plugins.dx_cluster._lastUpdate) {
    var d = Plugins.dx_cluster._lastUpdate;
    var hh = String(d.getUTCHours()).padStart(2, '0');
    var mm = String(d.getUTCMinutes()).padStart(2, '0');
    var ss = String(d.getUTCSeconds()).padStart(2, '0');
    lastUpdateEl.text('Updated: ' + hh + ':' + mm + ':' + ss + ' UTC');
  }
};

// ---- Auto-refresh ----
Plugins.dx_cluster._startAutoRefresh = function () {
  Plugins.dx_cluster._stopAutoRefresh();
  if (!Plugins.dx_cluster._autoRefresh) return;
  var interval = (Plugins.dx_cluster._refreshInterval || 60) * 1000;
  Plugins.dx_cluster._refreshTimer = setInterval(function () {
    Plugins.dx_cluster._fetchSpots();
  }, interval);
};

Plugins.dx_cluster._stopAutoRefresh = function () {
  if (Plugins.dx_cluster._refreshTimer) {
    clearInterval(Plugins.dx_cluster._refreshTimer);
    Plugins.dx_cluster._refreshTimer = null;
  }
};

// ---- WebSocket proxy ----
Plugins.dx_cluster._wsConnection = null;

Plugins.dx_cluster._connectProxy = function () {
  var proxyUrl = Plugins.dx_cluster._proxyUrl;
  if (!proxyUrl) return false;

  try {
    var ws = new WebSocket(proxyUrl);

    ws.onopen = function () {
      console.log('[dx_cluster] WebSocket proxy connected: ' + proxyUrl);
      // Send callsign for cluster login if configured.
      // Most Telnet→WebSocket bridges expect just the callsign string
      // (e.g. 'N0CALL') as the first message to authenticate.
      if (Plugins.dx_cluster._callsign) {
        ws.send(Plugins.dx_cluster._callsign);
      }
    };

    ws.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        var spots = Plugins.dx_cluster._parseDxlite(data);
        if (spots.length === 0) spots = Plugins.dx_cluster._parseGenericJson(data);
        if (spots.length > 0) {
          Plugins.dx_cluster._spots = spots;
          Plugins.dx_cluster._lastUpdate = new Date();
          Plugins.dx_cluster._renderSpots();
        }
      } catch (e) {
        console.warn('[dx_cluster] WebSocket parse error:', e);
      }
    };

    ws.onerror = function (err) {
      console.warn('[dx_cluster] WebSocket error:', err);
    };

    ws.onclose = function () {
      console.log('[dx_cluster] WebSocket closed, falling back to HTTP polling');
      Plugins.dx_cluster._wsConnection = null;
      // Fall back to HTTP polling
      Plugins.dx_cluster._fetchSpots();
      if (Plugins.dx_cluster._autoRefresh) {
        Plugins.dx_cluster._startAutoRefresh();
      }
    };

    Plugins.dx_cluster._wsConnection = ws;
    return true;
  } catch (e) {
    console.warn('[dx_cluster] WebSocket connection failed:', e);
    return false;
  }
};

// ---- UI Building ----
Plugins.dx_cluster._buildUI = function () {
  var panel = $('#openwebrx-panel-receiver');
  if (!panel.length) {
    console.error('[dx_cluster] Receiver panel not found!');
    return;
  }

  var settingsHeader = null, displayHeader = null;
  panel.find('.openwebrx-section-divider, div, span, a').each(function () {
    var txt = $(this).text().trim();
    if (txt.match(/^[\u25BC\u25B6\u25B2]?\s*Settings$/i)) settingsHeader = $(this);
    if (txt.match(/^[\u25BC\u25B6\u25B2]?\s*Display$/i)) displayHeader = $(this);
  });

  // Section wrapper
  var section = $('<div>', {
    id: 'dx-cluster-section',
    'class': 'openwebrx-section dx-cluster-section',
  });

  // Header — uses native openwebrx-section-divider class (same as Settings, Display, Controls)
  var header = $('<div>', {
    id: 'dx-cluster-section-header',
    'class': 'openwebrx-section-divider',
    html: (Plugins.dx_cluster._collapsed ? '&#9654;' : '&#9660;') + ' DX Cluster',
  });

  // Body
  var body = $('<div>', {
    id: 'dx-cluster-section-body',
    'class': 'openwebrx-section-body dx-cluster-section-body',
  });

  // Controls row
  var controlsRow = $('<div>', { 'class': 'openwebrx-panel-line dx-cluster-controls-row' });

  // Refresh button
  var refreshBtn = $('<div>', {
    'class': 'openwebrx-button dx-cluster-btn',
    html: '&#8635;',
    title: 'Refresh DX spots now',
  }).on('click', function () {
    Plugins.dx_cluster._fetchSpots();
  });

  // Auto-refresh toggle
  var autoRefreshBtn = $('<div>', {
    id: 'dx-cluster-autorefresh-btn',
    'class': 'openwebrx-button dx-cluster-btn' + (Plugins.dx_cluster._autoRefresh ? ' highlighted' : ''),
    text: 'Auto',
    title: 'Toggle auto-refresh (' + Plugins.dx_cluster._refreshInterval + 's)',
  }).on('click', function () {
    Plugins.dx_cluster._autoRefresh = !Plugins.dx_cluster._autoRefresh;
    $(this).toggleClass('highlighted', Plugins.dx_cluster._autoRefresh);
    if (Plugins.dx_cluster._autoRefresh) {
      Plugins.dx_cluster._startAutoRefresh();
    } else {
      Plugins.dx_cluster._stopAutoRefresh();
    }
    Plugins.dx_cluster._saveSettings();
  });

  // Band filter dropdown
  var bandSelect = $('<select>', {
    id: 'dx-cluster-band-select',
    'class': 'dx-cluster-band-select',
    title: 'Filter by band',
  });
  bandSelect.append($('<option>', { value: 'all', text: 'All bands' }));
  var bandNames = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m'];
  bandNames.forEach(function (b) {
    bandSelect.append($('<option>', {
      value: b,
      text: b,
      selected: b === Plugins.dx_cluster._band,
    }));
  });
  if (Plugins.dx_cluster._band === 'all') bandSelect.val('all');
  bandSelect.on('change', function () {
    Plugins.dx_cluster._band = $(this).val();
    Plugins.dx_cluster._saveSettings();
    Plugins.dx_cluster._renderSpots();
  });

  // Last update label
  var lastUpdateEl = $('<span>', {
    id: 'dx-cluster-last-update',
    'class': 'dx-cluster-last-update',
    text: '',
  });

  controlsRow.append(refreshBtn, autoRefreshBtn, bandSelect, lastUpdateEl);

  if (Plugins.dx_cluster._clusterHost) {
    var clusterInfo = $('<span>', {
      'class': 'dx-cluster-info',
      text: Plugins.dx_cluster._clusterHost + ':' + Plugins.dx_cluster._clusterPort,
      title: 'Configured DX cluster server',
    });
    controlsRow.append(clusterInfo);
  }

  body.append(controlsRow);

  // Status message (loading / error)
  var statusEl = $('<div>', {
    id: 'dx-cluster-status',
    'class': 'dx-cluster-status',
  }).hide();
  body.append(statusEl);

  // Spots table
  var tableWrap = $('<div>', { 'class': 'dx-cluster-table-wrap' });
  var table = $('<table>', { 'class': 'dx-cluster-table' });
  var thead = $('<thead>');
  var headerRow = $('<tr>');
  ['Time', 'DX Call', 'Freq (kHz)', 'Spotter', 'Comment'].forEach(function (col) {
    headerRow.append($('<th>', { 'class': 'dx-cluster-th', text: col }));
  });
  thead.append(headerRow);
  table.append(thead);
  var tbody = $('<tbody>', { id: 'dx-cluster-tbody' });
  table.append(tbody);
  tableWrap.append(table);
  body.append(tableWrap);

  section.append(header, body);

  // Collapse toggle
  header.on('click', function () {
    Plugins.dx_cluster._collapsed = !Plugins.dx_cluster._collapsed;
    if (Plugins.dx_cluster._collapsed) {
      body.slideUp(200);
      header.html('&#9654; DX Cluster');
    } else {
      body.slideDown(200);
      header.html('&#9660; DX Cluster');
    }
    Plugins.dx_cluster._saveSettings();
  });

  if (Plugins.dx_cluster._collapsed) body.hide();

  // Insert before Settings (between Controls and Settings)
  if (settingsHeader && settingsHeader.length) {
    var ss = settingsHeader.closest('.openwebrx-section');
    if (ss.length) ss.before(section); else settingsHeader.before(section);
  } else if (displayHeader && displayHeader.length) {
    var ds = displayHeader.closest('.openwebrx-section');
    if (ds.length) ds.before(section); else displayHeader.before(section);
  } else {
    panel.append(section);
  }
};

// ---- Plugin init ----
Plugins.dx_cluster.init = function () {
  // Apply defaults
  var cfg = Plugins.dx_cluster._defaultConfig;
  Plugins.dx_cluster._feedUrl         = cfg.feedUrl;
  Plugins.dx_cluster._fallbackUrls    = cfg.fallbackUrls;
  Plugins.dx_cluster._clusterHost     = cfg.clusterHost;
  Plugins.dx_cluster._clusterPort     = cfg.clusterPort;
  Plugins.dx_cluster._callsign        = cfg.callsign;
  Plugins.dx_cluster._refreshInterval = cfg.refreshInterval;
  Plugins.dx_cluster._maxSpots        = cfg.maxSpots;
  Plugins.dx_cluster._autoRefresh     = cfg.autoRefresh;
  Plugins.dx_cluster._collapsed       = cfg.collapsed;
  Plugins.dx_cluster._band            = cfg.band;

  // Allow external config override (same pattern as welcome_screen_config)
  if (typeof Plugins.dx_cluster_config === 'object') {
    var ext = Plugins.dx_cluster_config;
    if (ext.feedUrl         !== undefined) Plugins.dx_cluster._feedUrl         = ext.feedUrl;
    if (ext.fallbackUrls    !== undefined) Plugins.dx_cluster._fallbackUrls    = ext.fallbackUrls;
    if (ext.clusterHost     !== undefined) Plugins.dx_cluster._clusterHost     = ext.clusterHost;
    if (ext.clusterPort     !== undefined) Plugins.dx_cluster._clusterPort     = ext.clusterPort;
    if (ext.callsign        !== undefined) Plugins.dx_cluster._callsign        = ext.callsign;
    if (ext.proxyUrl        !== undefined) Plugins.dx_cluster._proxyUrl        = ext.proxyUrl;
    if (ext.refreshInterval !== undefined) Plugins.dx_cluster._refreshInterval = ext.refreshInterval;
    if (ext.maxSpots        !== undefined) Plugins.dx_cluster._maxSpots        = ext.maxSpots;
    if (ext.autoRefresh     !== undefined) Plugins.dx_cluster._autoRefresh     = ext.autoRefresh;
    if (ext.collapsed       !== undefined) Plugins.dx_cluster._collapsed       = ext.collapsed;
    if (ext.band            !== undefined) Plugins.dx_cluster._band            = ext.band;
  }

  // Restore saved settings (override defaults and config)
  var saved = Plugins.dx_cluster._loadSettings();
  if (saved) {
    if (saved.collapsed       !== undefined) Plugins.dx_cluster._collapsed       = saved.collapsed;
    if (saved.band            !== undefined) Plugins.dx_cluster._band            = saved.band;
    if (saved.autoRefresh     !== undefined) Plugins.dx_cluster._autoRefresh     = saved.autoRefresh;
    if (saved.maxSpots        !== undefined) Plugins.dx_cluster._maxSpots        = saved.maxSpots;
    if (saved.refreshInterval !== undefined) Plugins.dx_cluster._refreshInterval = saved.refreshInterval;
  }

  Plugins.dx_cluster._buildUI();

  // Try WebSocket proxy first
  if (Plugins.dx_cluster._proxyUrl) {
    var wsConnected = Plugins.dx_cluster._connectProxy();
    if (!wsConnected) {
      // Fallback to HTTP
      Plugins.dx_cluster._fetchSpots();
      if (Plugins.dx_cluster._autoRefresh) {
        Plugins.dx_cluster._startAutoRefresh();
      }
    }
  } else {
    Plugins.dx_cluster._fetchSpots();
    if (Plugins.dx_cluster._autoRefresh) {
      Plugins.dx_cluster._startAutoRefresh();
    }
  }

  console.log('[dx_cluster] Plugin initialized (v' + Plugins.dx_cluster._version + ')');
  return true;
};
