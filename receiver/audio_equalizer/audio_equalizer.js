/*
 * Plugin: Audio Equalizer for OpenWebRX+
 * 10-band graphic equalizer using Web Audio API.
 * UI matches native OpenWebRX+ collapsible sections (Settings, Display).
 *
 * Author: 9A6NDZ
 * License: MIT
 */

Plugins.audio_equalizer = Plugins.audio_equalizer || {};
Plugins.audio_equalizer._version = 1.1;

// EQ bands
Plugins.audio_equalizer.BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 8000, 10000, 14000];
Plugins.audio_equalizer.BAND_LABELS = ['60', '170', '310', '600', '1K', '3K', '6K', '8K', '10K', '14K'];

// Presets
Plugins.audio_equalizer.PRESETS = {
  'flat':       { name: 'Flat',       gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  'voice':      { name: 'Voice',      gains: [-3, -1, 2, 5, 6, 5, 3, 1, -2, -4] },
  'dx':         { name: 'DX',         gains: [-2, 0, 3, 6, 6, 4, 2, 0, -3, -5] },
  'cw':         { name: 'CW',         gains: [-6, -4, -2, 2, 8, 6, -2, -6, -8, -10] },
  'bass_cut':   { name: 'Bass Cut',   gains: [-12, -8, -4, 0, 0, 0, 0, 0, 0, 0] },
  'treble_cut': { name: 'Treble Cut', gains: [0, 0, 0, 0, 0, -2, -4, -6, -8, -10] },
  'ssb':        { name: 'SSB',        gains: [-4, -2, 1, 4, 5, 5, 3, 1, -1, -3] },
  'broadcast':  { name: 'Broadcast',  gains: [3, 2, 0, -1, 0, 1, 3, 4, 3, 2] },
};

// State
Plugins.audio_equalizer._filters = [];
Plugins.audio_equalizer._audioCtx = null;
Plugins.audio_equalizer._connected = false;
Plugins.audio_equalizer._enabled = true;
Plugins.audio_equalizer._currentPreset = 'flat';
Plugins.audio_equalizer._collapsed = true;

// ---- Storage helpers ----
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

  var ctx = null, sourceNode = null, destNode = null;

  if (typeof audioEngine !== 'undefined' && audioEngine) {
    ctx = audioEngine.audioContext || (audioEngine.getAudioContext && audioEngine.getAudioContext());
    if (ctx && audioEngine.gainNode) { sourceNode = audioEngine.gainNode; destNode = ctx.destination; }
  }
  if (!ctx && typeof audioContext !== 'undefined') ctx = audioContext;
  if (ctx && !sourceNode && typeof gain_node !== 'undefined') { sourceNode = gain_node; destNode = ctx.destination; }
  if (!ctx) return;

  Plugins.audio_equalizer._audioCtx = ctx;
  var bands = Plugins.audio_equalizer.BANDS;
  var filters = [];

  for (var i = 0; i < bands.length; i++) {
    var filter = ctx.createBiquadFilter();
    if (i === 0) filter.type = 'lowshelf';
    else if (i === bands.length - 1) filter.type = 'highshelf';
    else filter.type = 'peaking';
    filter.frequency.value = bands[i];
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    filters.push(filter);
  }

  for (var j = 0; j < filters.length - 1; j++) filters[j].connect(filters[j + 1]);

  if (sourceNode && destNode) {
    try { sourceNode.disconnect(destNode); } catch (e) {
      try { sourceNode.disconnect(); } catch (e2) { /* ok */ }
    }
    sourceNode.connect(filters[0]);
    filters[filters.length - 1].connect(destNode);

    Plugins.audio_equalizer._filters = filters;
    Plugins.audio_equalizer._sourceNode = sourceNode;
    Plugins.audio_equalizer._destNode = destNode;
    Plugins.audio_equalizer._connected = true;

    var saved = Plugins.audio_equalizer._loadSettings();
    if (saved) {
      Plugins.audio_equalizer._enabled = saved.enabled !== false;
      Plugins.audio_equalizer._currentPreset = saved.preset || 'flat';
      Plugins.audio_equalizer._collapsed = saved.collapsed !== false;
      if (saved.gains && saved.gains.length === filters.length) {
        for (var k = 0; k < filters.length; k++) {
          filters[k].gain.value = saved.enabled !== false ? saved.gains[k] : 0;
        }
      }
    }
    console.log('[audio_equalizer] Connected to audio chain successfully.');
  }
};

Plugins.audio_equalizer._setBypass = function (bypass) {
  if (!Plugins.audio_equalizer._connected) return;
  var src = Plugins.audio_equalizer._sourceNode;
  var dst = Plugins.audio_equalizer._destNode;
  var filters = Plugins.audio_equalizer._filters;
  try {
    if (bypass) {
      src.disconnect();
      src.connect(dst);
    } else {
      src.disconnect();
      src.connect(filters[0]);
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

  var settingsHeader = null, displayHeader = null;
  panel.find('div, span, a').each(function () {
    var txt = $(this).text().trim();
    if (txt.match(/^[\u25BC\u25B6]?\s*Settings$/i)) settingsHeader = $(this);
    if (txt.match(/^[\u25BC\u25B6]?\s*Display$/i)) displayHeader = $(this);
  });

  // Section wrapper
  var section = $('<div>', {
    id: 'audio-eq-section',
    'class': 'openwebrx-section audio-eq-section',
  });

  // Header — plain text, no spans, exactly like native OWRX+ sections
  var header = $('<div>', {
    id: 'audio-eq-section-header',
    'class': 'openwebrx-section-header',
    html: (Plugins.audio_equalizer._collapsed ? '&#9654;' : '&#9660;') + ' Equalizer',
  });

  // Body
  var body = $('<div>', {
    id: 'audio-eq-section-body',
    'class': 'openwebrx-section-body audio-eq-section-body',
  });

  // Controls row
  var controlsRow = $('<div>', { 'class': 'openwebrx-panel-line audio-eq-controls-row' });

  var enableBtn = $('<div>', {
    id: 'audio-eq-enable-btn',
    'class': 'openwebrx-button audio-eq-btn' + (Plugins.audio_equalizer._enabled ? ' highlighted' : ''),
    text: 'EQ',
    title: 'Enable/disable equalizer',
  }).on('click', function () {
    Plugins.audio_equalizer._enabled = !Plugins.audio_equalizer._enabled;
    $(this).toggleClass('highlighted', Plugins.audio_equalizer._enabled);
    if (Plugins.audio_equalizer._connected) {
      Plugins.audio_equalizer._setBypass(!Plugins.audio_equalizer._enabled);
    }
    $('.audio-eq-slider').toggleClass('disabled', !Plugins.audio_equalizer._enabled);
    Plugins.audio_equalizer._saveSettings();
  });

  var presetSelect = $('<select>', {
    id: 'audio-eq-preset-select',
    'class': 'audio-eq-preset-select',
    title: 'Select EQ preset',
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
    Plugins.audio_equalizer._applyPreset($(this).val());
  });

  var resetBtn = $('<div>', {
    'class': 'openwebrx-button audio-eq-btn',
    text: 'R',
    title: 'Reset to Flat',
  }).on('click', function () {
    Plugins.audio_equalizer._applyPreset('flat');
    presetSelect.val('flat');
  });

  controlsRow.append(enableBtn, presetSelect, resetBtn);
  body.append(controlsRow);

  // Sliders
  var slidersRow = $('<div>', { 'class': 'audio-eq-sliders-row' });
  var bands = Plugins.audio_equalizer.BANDS;
  var labels = Plugins.audio_equalizer.BAND_LABELS;

  for (var i = 0; i < bands.length; i++) {
    var bandCol = $('<div>', { 'class': 'audio-eq-band-col' });

    var dbDisplay = $('<span>', {
      'class': 'audio-eq-db-val',
      'data-band': i,
      text: '0',
    });

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

    (function (idx) {
      slider.on('input change', function () {
        var val = parseFloat($(this).val());
        if (Plugins.audio_equalizer._filters[idx] && Plugins.audio_equalizer._enabled) {
          Plugins.audio_equalizer._filters[idx].gain.value = val;
        }
        $(this).closest('.audio-eq-band-col').find('.audio-eq-db-val').text(val > 0 ? '+' + val : val);
        Plugins.audio_equalizer._currentPreset = 'custom';
        Plugins.audio_equalizer._saveSettings();
      });
    })(i);

    var label = $('<span>', { 'class': 'audio-eq-band-label', text: labels[i] });
    bandCol.append(dbDisplay, slider, label);
    slidersRow.append(bandCol);
  }

  body.append(slidersRow);
  section.append(header, body);

  // Collapse toggle
  header.on('click', function () {
    Plugins.audio_equalizer._collapsed = !Plugins.audio_equalizer._collapsed;
    if (Plugins.audio_equalizer._collapsed) {
      body.slideUp(200);
      header.html('&#9654; Equalizer');
    } else {
      body.slideDown(200);
      header.html('&#9660; Equalizer');
    }
    Plugins.audio_equalizer._saveSettings();
  });

  if (Plugins.audio_equalizer._collapsed) body.hide();

  // Insert before Display
  if (displayHeader && displayHeader.length) {
    var ds = displayHeader.closest('.openwebrx-section');
    if (ds.length) ds.before(section); else displayHeader.before(section);
  } else if (settingsHeader && settingsHeader.length) {
    var ss = settingsHeader.closest('.openwebrx-section');
    if (ss.length) ss.after(section); else settingsHeader.after(section);
  } else {
    panel.append(section);
  }

  // Restore saved values
  var saved = Plugins.audio_equalizer._loadSettings();
  if (saved) {
    if (saved.gains) {
      for (var s = 0; s < saved.gains.length && s < bands.length; s++) {
        var sl = $('.audio-eq-slider[data-band="' + s + '"]');
        sl.val(saved.gains[s]);
        var v = saved.gains[s];
        sl.closest('.audio-eq-band-col').find('.audio-eq-db-val').text(v > 0 ? '+' + v : v);
      }
    }
    if (saved.preset) presetSelect.val(saved.preset);
    if (saved.enabled === false) {
      enableBtn.removeClass('highlighted');
      $('.audio-eq-slider').addClass('disabled');
    }
    Plugins.audio_equalizer._collapsed = saved.collapsed !== false;
    if (Plugins.audio_equalizer._collapsed) {
      body.hide();
      header.html('&#9654; Equalizer');
    } else {
      body.show();
      header.html('&#9660; Equalizer');
    }
  }
};

Plugins.audio_equalizer._applyPreset = function (presetKey) {
  var preset = Plugins.audio_equalizer.PRESETS[presetKey];
  if (!preset) return;
  Plugins.audio_equalizer._currentPreset = presetKey;
  var gains = preset.gains;

  for (var i = 0; i < gains.length; i++) {
    if (Plugins.audio_equalizer._filters[i] && Plugins.audio_equalizer._enabled) {
      Plugins.audio_equalizer._filters[i].gain.value = gains[i];
    }
    var sl = $('.audio-eq-slider[data-band="' + i + '"]');
    sl.val(gains[i]);
    sl.closest('.audio-eq-band-col').find('.audio-eq-db-val').text(gains[i] > 0 ? '+' + gains[i] : gains[i]);
  }

  $('#audio-eq-preset-select').val(presetKey);
  Plugins.audio_equalizer._saveSettings();
};

// ---- Plugin init ----
Plugins.audio_equalizer.init = function () {
  Plugins.audio_equalizer._buildUI();
  Plugins.audio_equalizer._tryConnect();

  if (!Plugins.audio_equalizer._connected) {
    var retryInterval = setInterval(function () {
      Plugins.audio_equalizer._tryConnect();
      if (Plugins.audio_equalizer._connected) {
        clearInterval(retryInterval);
        var saved = Plugins.audio_equalizer._loadSettings();
        if (saved && saved.gains) {
          for (var i = 0; i < saved.gains.length; i++) {
            if (Plugins.audio_equalizer._filters[i] && Plugins.audio_equalizer._enabled) {
              Plugins.audio_equalizer._filters[i].gain.value = saved.gains[i];
            }
          }
        }
        if (!Plugins.audio_equalizer._enabled) {
          Plugins.audio_equalizer._setBypass(true);
        }
      }
    }, 1000);

    $(document).one('click touchstart', function () {
      setTimeout(function () { Plugins.audio_equalizer._tryConnect(); }, 500);
    });
  }

  $(document).on('event:profile_changed', function () {
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
