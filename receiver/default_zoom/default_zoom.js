/*
 * default_zoom - Set default waterfall zoom level per SDR profile
 *
 * Allows the admin to configure a default zoom level for each SDR profile
 * via init.js settings. When a profile loads, the waterfall automatically
 * zooms to the configured level. Users can still freely zoom in/out.
 *
 * License: MIT
 * Copyright (c) 2025 Zoran, 9A6NDZ
 * https://github.com/9A6NDZ/Openwebrx-plugins
 */

Plugins.default_zoom.no_css = true;
Plugins.default_zoom._version = 0.1;

Plugins.default_zoom.init = function () {
  // --- Dependency check ---
  if (!Plugins.isLoaded('utils', 0.1)) {
    console.error('[default_zoom] Requires utils >= 0.1');
    return false;
  }

  // --- Merge user settings with defaults ---
  var settings = {
    profiles: Plugins.default_zoom.profiles || {},
    delay:    Plugins.default_zoom.delay    || 500,
  };

  var _applied_profile = null;

  // --- Helper: look up the zoom level for a given profile ID ---
  function getZoomForProfile(profileId) {
    if (!profileId) return null;

    // 1. Exact match
    if (settings.profiles.hasOwnProperty(profileId)) {
      return settings.profiles[profileId];
    }

    // 2. Partial / substring match
    var keys = Object.keys(settings.profiles);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== '*' && profileId.indexOf(keys[i]) !== -1) {
        return settings.profiles[keys[i]];
      }
    }

    // 3. Wildcard fallback
    if (settings.profiles.hasOwnProperty('*')) {
      return settings.profiles['*'];
    }

    return null;
  }

  // --- Helper: apply zoom level safely ---
  function applyZoom(level) {
    if (level === null || level === undefined) return;

    // Clamp to valid range (0 – 14)
    level = Math.max(0, Math.min(14, parseInt(level, 10)));

    if (typeof zoom_set === 'function') {
      zoom_set(level);
      console.log('[default_zoom] Applied zoom level:', level);
    } else if (typeof zoom_level !== 'undefined' && typeof zoom_step === 'function') {
      // Fallback: step from current level
      var current = zoom_level || 0;
      var diff = level - current;
      for (var i = 0; i < Math.abs(diff); i++) {
        zoom_step(diff > 0 ? 1 : -1);
      }
      console.log('[default_zoom] Applied zoom via stepping:', level);
    } else {
      console.warn('[default_zoom] zoom_set / zoom_step not available yet');
    }
  }

  // --- React to profile switches ---
  $(document).on('event:profile_changed', function (e, data) {
    var profileId = null;

    if (typeof data === 'string') {
      profileId = data;
    } else if (data && data.profile) {
      profileId = data.profile;
    } else if (typeof currentprofile !== 'undefined') {
      profileId = currentprofile;
    }

    if (!profileId) return;

    // Avoid re-applying for the same profile
    if (profileId === _applied_profile) return;
    _applied_profile = profileId;

    var zoomLevel = getZoomForProfile(profileId);
    if (zoomLevel !== null) {
      // Short delay so the waterfall has time to resize after the profile switch
      setTimeout(function () {
        applyZoom(zoomLevel);
      }, settings.delay);
    }
  });

  // --- Apply zoom on initial page load ---
  Plugins.utils.on_ready(function () {
    setTimeout(function () {
      var profileId = (typeof currentprofile !== 'undefined') ? currentprofile : null;
      if (profileId) {
        _applied_profile = profileId;
        var zoomLevel = getZoomForProfile(profileId);
        if (zoomLevel !== null) {
          applyZoom(zoomLevel);
        }
      }
    }, settings.delay + 500); // extra buffer for the first load
  });

  console.log('[default_zoom] Plugin loaded. Configured profiles:',
    Object.keys(settings.profiles).length);
  return true;
};
