/*
 * Plugin: Audio Equalizer for OpenWebRX+
 * Adds a 10-band graphic equalizer to the receiver panel.
 * Uses the Web Audio API BiquadFilter nodes inserted into the audio chain.
 *
 * Author: OpenWebRX+ Community
 * License: MIT
 */

Plugins.audio_equalizer = Plugins.audio_equalizer || {};
Plugins.audio_equalizer._version = 1.0;

// Default EQ bands (Hz) for a 10-band graphic equalizer
Plugins.audio_equalizer.BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 8000, 10000, 14000];
Plugins.audio_equalizer.BAND_LABELS = ['60', '170', '310', '600', '1K', '3K', '6K', '8K', '10K', '14K'];

// Presets for common SDR listening scenarios
Plugins.audio_equalizer.PRESETS = {
  'flat':       { name: 'Flat',       gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  'voice':      { name: 'Glas',       gains: [-3, -1, 2, 5, 6, 5, 3, 1, -2, -4] },
  'dx':         { name: 'DX',         gains: [-2, 0, 3, 6, 6, 4, 2, 0, -3, -5] },
  'cw':         { name: 'CW',         gains: [-6, -4, -2, 2, 8, 6, -2, -6, -8, -10] },
  'bass_cut':   { name: 'Bass rez',   gains: [-12, -8, -4, 0, 0, 0, 0, 0, 0, 0] },
  'treble_cut': { name: 'Treble rez', gains: [0, 0, 0, 0, 0, -2, -4, -6, -8, -10] },
  'ssb':        { name: 'SSB',        gains: [-4, -2, 1, 4, 5, 5, 3, 1, -1, -3] },
  'broadcast':  { name: 'Broadcast',  gains: [3, 2, 0, -1, 0, 1, 3, 4, 3, 2] },
};

// State
Plugins.audio_equalizer._filters = [];
Plugins.audio_equalizer._audioCtx = null;
Plugins.audio_equalizer._connected = false;
Plugins.audio_equalizer._enabled = true;
Plugins.audio_equalizer._currentPreset = 'flat';
Plugins.audio_equalizer._collapsed = false;

// ---- Storage helpers (localStorage) ----
Plugins.audio_equalizer._storageKey = 'owrx_audio_eq_settings';

Plugins.audio_equalizer._saveSettings = function () {
  try {
    var settings = {
      enabled: Plugins.audio_equalizer._enabled,
      preset: Plugins.audio_equalizer._currentPreset,
      gains: Plugins.audio_equalizer._filters.map(function (f) { return f.gain.value; }),
      collapsed: Plugins.audio_equalizer._collapsed,
    };
    localStorage.setItem(Plugins.audio_equalizer._storageKey, JSON.stringify(settings));
  } catch (e) { /* ignore */ }
};

Plugins.audio_equalizer._loadSettings = function () {
  try {
    var raw = localStorage.getItem(Plugins.audio_equalizer._storageKey);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
};

// ---- Audio chain integration ----
Plugins.audio_equalizer._tryConnect = function () {
  if (Plugins.audio_equalizer._connected) return;

  // OpenWebRX+ stores the AudioContext and uses a GainNode for volume.
  // We look for the global audioContext / audioEngine and tap in.
  var ctx = null;
  var sourceNode = null;
  var destNode = null;

  // Strategy 1: audioEngine (newer OWRX+ builds)
  if (typeof audioEngine !== 'undefined' && audioEngine) {
    ctx = audioEngine.audioContext || audioEngine.getAudioContext && audioEngine.getAudioContext();
    if (ctx && audioEngine.gainNode) {
      sourceNode = audioEngine.gainNode;
      destNode = ctx.destination;
    }
  }

  // Strategy 2: global audioContext + gainNode
  if (!ctx && typeof audioContext !== 'undefined') {
    ctx = audioContext;
  }
  if (ctx && !sourceNode && typeof gain_node !== 'undefined') {
    sourceNode = gain_node;
    destNode = ctx.destination;
  }

  // Strategy 3: find via volume slider's associated node
  if (!ctx) {
    // Some builds expose it differently; bail if we still can't find it
    console.warn('[audio_equalizer] Could not find AudioContext. Will retry on next audio start.');
    return;
  }

  Plugins.audio_equalizer._audioCtx = ctx;

  // Create biquad filters for each band
  var bands = Plugins.audio_equalizer.BANDS;
  var filters = [];

  for (var i = 0; i < bands.length; i++) {
    var filter = ctx.createBiquadFilter();

    if (i === 0) {
      filter.type = 'lowshelf';
    } else if (i === bands.length - 1) {
      filter.type = 'highshelf';
    } else {
      filter.type = 'peaking';
    }

    filter.frequency.value = bands[i];
    filter.Q.value = 1.4; // moderate Q for peaking filters
    filter.gain.value = 0;
    filters.push(filter);
  }

  // Chain filters together
  for (var j = 0; j < filters.length - 1; j++) {
    filters[j].connect(filters[j + 1]);
  }

  // Insert into audio chain: sourceNode -> [filters] -> destination
  // We need to disconnect sourceNode from destination first
  if (sourceNode && destNode) {
    try {
      sourceNode.disconnect(destNode);
    } catch (e) {
      // May not be directly connected; try generic disconnect
      try { sourceNode.disconnect(); } catch (e2) { /* ok */ }
    }

    sourceNode.connect(filters[0]);
    filters[filters.length - 1].connect(destNode);

    Plugins.audio_equalizer._filters = filters;
    Plugins.audio_equalizer._sourceNode = sourceNode;
    Plugins.audio_equalizer._destNode = destNode;
    Plugins.audio_equalizer._connected = true;

    // Restore saved settings
    var saved = Plugins.audio_equalizer._loadSettings();
    if (saved) {
      Plugins.audio_equalizer._enabled = saved.enabled !== false;
      Plugins.audio_equalizer._currentPreset = saved.preset || 'flat';
      Plugins.audio_equalizer._collapsed = saved.collapsed || false;
      if (saved.gains && saved.gains.length === filters.length) {
        for (var k = 0; k < filters.length; k++) {
          filters[k].gain.value = saved.enabled !== false ? saved.gains[k] : 0;
        }
      }
    }

    console.log('[audio_equalizer] Connected to audio chain successfully.');
  } else {
    console.warn('[audio_equalizer] sourceNode or destNode not found. EQ not connected.');
  }
};

// Bypass: connect source directly to destination, skipping filters
Plugins.audio_equalizer._setBypass = function (bypass) {
  if (!Plugins.audio_equalizer._connected) return;
  var src = Plugins.audio_equalizer._sourceNode;
  var dst = Plugins.audio_equalizer._destNode;
  var filters = Plugins.audio_equalizer._filters;

  try {
    if (bypass) {
      // Disconnect filter chain, connect direct
      src.disconnect();
      src.connect(dst);
    } else {
      // Reconnect through filters
      src.disconnect();
      src.connect(filters[0]);
      // Filters are already chained; last one connected to dest
      // Reconnect last filter to destination
      filters[filters.length - 1].disconnect();
      filters[filters.length - 1].connect(dst);
    }
  } catch (e) {
    console.warn('[audio_equalizer] Error toggling bypass:', e);
  }
};

// ---- UI Building ----
Plugins.audio_equalizer._buildUI = function () {
  var panel = $('#openwebrx-panel-receiver');
  if (!panel.length) {
    console.error('[audio_equalizer] Receiver panel not found!');
    return;
  }

  // Find insertion point: after the volume/squelch/NR controls area,
  // before the settings (themes, etc.)
  // The receiver panel has openwebrx-panel-line divs. We'll look for the
  // settings section (themes listbox) and insert before it.
  var settingsSection = panel.find('#openwebrx-settings-title, .openwebrx-panel-line:has(#openwebrx-themes-listbox)').first();
  // Fallback: look for the waterfall controls
  if (!settingsSection.length) {
    settingsSection = panel.find('.openwebrx-panel-line:has(#openwebrx-waterfall-color-min)').first();
  }

  // Build the EQ container
  var container = $('<div>', {
    id: 'audio-eq-container',
    'class': 'openwebrx-panel-line audio-eq-section',
  });

  // Header row with title, enable toggle, preset selector, and collapse toggle
  var header = $('<div>', { 'class': 'audio-eq-header' });

  // Collapse toggle
  var collapseBtn = $('<div>', {
    'class': 'audio-eq-collapse-btn',
    title: 'Pokaži/sakrij equalizer',
    html: '&#9660;',
  }).on('click', function () {
    Plugins.audio_equalizer._collapsed = !Plugins.audio_equalizer._collapsed;
    var body = $('#audio-eq-body');
    if (Plugins.audio_equalizer._collapsed) {
      body.slideUp(150);
      $(this).html('&#9654;');
    } else {
      body.slideDown(150);
      $(this).html('&#9660;');
    }
    Plugins.audio_equalizer._saveSettings();
  });

  // Title
  var title = $('<span>', { 'class': 'audio-eq-title', text: 'Equalizer' });

  // Enable/disable toggle
  var enableBtn = $('<div>', {
    id: 'audio-eq-enable-btn',
    'class': 'openwebrx-button audio-eq-btn' + (Plugins.audio_equalizer._enabled ? ' active' : ''),
    text: 'EQ',
    title: 'Uključi/isključi equalizer',
  }).on('click', function () {
    Plugins.audio_equalizer._enabled = !Plugins.audio_equalizer._enabled;
    $(this).toggleClass('active', Plugins.audio_equalizer._enabled);

    if (Plugins.audio_equalizer._connected) {
      Plugins.audio_equalizer._setBypass(!Plugins.audio_equalizer._enabled);
    }
    // Update slider visual state
    $('.audio-eq-slider').toggleClass('disabled', !Plugins.audio_equalizer._enabled);
    Plugins.audio_equalizer._saveSettings();
  });

  // Preset selector
  var presetSelect = $('<select>', {
    id: 'audio-eq-preset-select',
    'class': 'audio-eq-preset-select',
    title: 'Odaberi preset equalizera',
  });

  var presets = Plugins.audio_equalizer.PRESETS;
  for (var key in presets) {
    if (presets.hasOwnProperty(key)) {
      presetSelect.append($('<option>', {
        value: key,
        text: presets[key].name,
        selected: key === Plugins.audio_equalizer._currentPreset,
      }));
    }
  }

  presetSelect.on('change', function () {
    var preset = $(this).val();
    Plugins.audio_equalizer._applyPreset(preset);
  });

  // Reset button
  var resetBtn = $('<div>', {
    'class': 'openwebrx-button audio-eq-btn',
    text: 'R',
    title: 'Resetiraj na Flat',
  }).on('click', function () {
    Plugins.audio_equalizer._applyPreset('flat');
    presetSelect.val('flat');
  });

  header.append(collapseBtn, title, enableBtn, presetSelect, resetBtn);
  container.append(header);

  // EQ body (sliders)
  var body = $('<div>', {
    id: 'audio-eq-body',
    'class': 'audio-eq-body',
  });

  // Slider container with the band sliders
  var slidersRow = $('<div>', { 'class': 'audio-eq-sliders-row' });

  var bands = Plugins.audio_equalizer.BANDS;
  var labels = Plugins.audio_equalizer.BAND_LABELS;

  for (var i = 0; i < bands.length; i++) {
    var bandCol = $('<div>', { 'class': 'audio-eq-band-col' });

    // dB value display
    var dbDisplay = $('<span>', {
      'class': 'audio-eq-db-val',
      'data-band': i,
      text: '0',
    });

    // Vertical slider
    var slider = $('<input>', {
      type: 'range',
      min: -12,
      max: 12,
      value: 0,
      step: 1,
      'class': 'audio-eq-slider' + (!Plugins.audio_equalizer._enabled ? ' disabled' : ''),
      'data-band': i,
      orient: 'vertical',
      title: labels[i] + ' Hz',
    });

    // Use closure to capture index
    (function (idx) {
      slider.on('input change', function () {
        var val = parseFloat($(this).val());
        // Update filter
        if (Plugins.audio_equalizer._filters[idx] && Plugins.audio_equalizer._enabled) {
          Plugins.audio_equalizer._filters[idx].gain.value = val;
        }
        // Update display
        $(this).closest('.audio-eq-band-col').find('.audio-eq-db-val').text(val > 0 ? '+' + val : val);
        // Mark as custom
        Plugins.audio_equalizer._currentPreset = 'custom';
        Plugins.audio_equalizer._saveSettings();
      });
    })(i);

    // Band label
    var label = $('<span>', { 'class': 'audio-eq-band-label', text: labels[i] });

    bandCol.append(dbDisplay, slider, label);
    slidersRow.append(bandCol);
  }

  body.append(slidersRow);
  container.append(body);

  // Insert into the panel
  if (settingsSection.length) {
    settingsSection.before(container);
  } else {
    // Fallback: append at the end
    panel.append(container);
  }

  // Apply initial state
  if (Plugins.audio_equalizer._collapsed) {
    body.hide();
    collapseBtn.html('&#9654;');
  }
  if (!Plugins.audio_equalizer._enabled) {
    $('.audio-eq-slider').addClass('disabled');
  }

  // If we have saved gains, apply them to sliders
  var saved = Plugins.audio_equalizer._loadSettings();
  if (saved && saved.gains) {
    for (var s = 0; s < saved.gains.length && s < bands.length; s++) {
      var sl = $('.audio-eq-slider[data-band="' + s + '"]');
      sl.val(saved.gains[s]);
      var v = saved.gains[s];
      sl.closest('.audio-eq-band-col').find('.audio-eq-db-val').text(v > 0 ? '+' + v : v);
    }
    if (saved.preset) {
      presetSelect.val(saved.preset);
    }
  }
};

Plugins.audio_equalizer._applyPreset = function (presetKey) {
  var preset = Plugins.audio_equalizer.PRESETS[presetKey];
  if (!preset) return;

  Plugins.audio_equalizer._currentPreset = presetKey;
  var gains = preset.gains;

  for (var i = 0; i < gains.length; i++) {
    // Update filter
    if (Plugins.audio_equalizer._filters[i] && Plugins.audio_equalizer._enabled) {
      Plugins.audio_equalizer._filters[i].gain.value = gains[i];
    }
    // Update slider
    var sl = $('.audio-eq-slider[data-band="' + i + '"]');
    sl.val(gains[i]);
    sl.closest('.audio-eq-band-col').find('.audio-eq-db-val').text(gains[i] > 0 ? '+' + gains[i] : gains[i]);
  }

  $('#audio-eq-preset-select').val(presetKey);
  Plugins.audio_equalizer._saveSettings();
};


// ---- Plugin init ----
Plugins.audio_equalizer.init = function () {

  // Build the UI immediately (DOM is ready when init is called)
  Plugins.audio_equalizer._buildUI();

  // Try to connect to audio chain. May need to retry after audio starts.
  // OpenWebRX creates the AudioContext lazily on first user interaction.
  Plugins.audio_equalizer._tryConnect();

  // If not connected yet, retry periodically and on various events
  if (!Plugins.audio_equalizer._connected) {
    var retryInterval = setInterval(function () {
      Plugins.audio_equalizer._tryConnect();
      if (Plugins.audio_equalizer._connected) {
        clearInterval(retryInterval);
        // Apply saved settings to sliders after connection
        var saved = Plugins.audio_equalizer._loadSettings();
        if (saved && saved.gains) {
          for (var i = 0; i < saved.gains.length; i++) {
            if (Plugins.audio_equalizer._filters[i] && Plugins.audio_equalizer._enabled) {
              Plugins.audio_equalizer._filters[i].gain.value = saved.gains[i];
            }
          }
        }
        // Apply bypass state
        if (!Plugins.audio_equalizer._enabled) {
          Plugins.audio_equalizer._setBypass(true);
        }
      }
    }, 1000);

    // Also try on user click (AudioContext needs user gesture)
    $(document).one('click touchstart', function () {
      setTimeout(function () {
        Plugins.audio_equalizer._tryConnect();
      }, 500);
    });
  }

  // Listen for profile changes to reconnect if needed
  $(document).on('event:profile_changed', function () {
    // Audio chain may be recreated on profile change
    Plugins.audio_equalizer._connected = false;
    setTimeout(function () {
      Plugins.audio_equalizer._tryConnect();
      if (Plugins.audio_equalizer._connected && !Plugins.audio_equalizer._enabled) {
        Plugins.audio_equalizer._setBypass(true);
      }
    }, 1500);
  });

  console.log('[audio_equalizer] Plugin initialized (v' + Plugins.audio_equalizer._version + ')');
  return true;
};
