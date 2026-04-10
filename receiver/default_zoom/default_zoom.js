/*
 * default_zoom - Set default waterfall zoom level per SDR profile
 *
 * Automatically zooms the waterfall when a profile loads.
 * Resets zoom when switching to a profile not in the config.
 * Users can still zoom in/out freely — this only sets the initial zoom.
 *
 * No dependencies required. Works standalone.
 *
 * License: MIT
 * Copyright (c) 2025 Zoran, 9A6NDZ
 * https://github.com/9A6NDZ/Openwebrx-plugins
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------
  //  CONFIGURATION — set these in init.js BEFORE loading this file
  //
  //  window.default_zoom_profiles = {
  //    'sdr_uuid|profile_uuid': 5,
  //  };
  //  window.default_zoom_delay = 800;
  // ---------------------------------------------------------------

  var profiles = window.default_zoom_profiles || {};
  var delay    = window.default_zoom_delay    || 800;

  var _last_profile = null;

  // --- Build profile ID string from currentprofile global ---
  function getProfileId() {
    if (typeof currentprofile === 'undefined' || !currentprofile) return null;
    if (currentprofile.sdr_id && currentprofile.profile_id) {
      return currentprofile.sdr_id + '|' + currentprofile.profile_id;
    }
    if (typeof currentprofile === 'string') return currentprofile;
    if (typeof currentprofile.toString === 'function') {
      var s = currentprofile.toString();
      if (s !== '[object Object]') return s;
    }
    return null;
  }

  // --- Look up zoom level for a profile ID ---
  function getZoomLevel(profileId) {
    if (!profileId) return null;

    // 1. Exact match
    if (profiles.hasOwnProperty(profileId)) {
      return profiles[profileId];
    }

    // 2. Substring match
    var keys = Object.keys(profiles);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== '*' && profileId.indexOf(keys[i]) !== -1) {
        return profiles[keys[i]];
      }
    }

    // 3. Wildcard
    if (profiles.hasOwnProperty('*')) {
      return profiles['*'];
    }

    return null;
  }

  // --- Handle profile change ---
  function onProfileChange() {
    var profileId = getProfileId();
    if (!profileId) return;
    if (profileId === _last_profile) return;

    _last_profile = profileId;
    var level = getZoomLevel(profileId);

    setTimeout(function () {
      if (typeof zoom_set !== 'function') return;

      if (level !== null) {
        // Profile is in config — apply configured zoom
        level = Math.max(0, Math.min(14, parseInt(level, 10)));
        zoom_set(level);
        console.log('[default_zoom] Zoom ' + level + ' for: ' + profileId);
      } else {
        // Profile is NOT in config — reset to no zoom
        zoom_set(0);
        console.log('[default_zoom] Reset zoom for: ' + profileId);
      }
    }, delay);
  }

  // --- Watch profile dropdown ---
  function watchDropdown() {
    var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
    if (dropdown) {
      dropdown.addEventListener('change', function () {
        _last_profile = null;
        onProfileChange();
      });
      console.log('[default_zoom] Watching profile dropdown.');
      return true;
    }
    return false;
  }

  // --- Wait for dropdown to appear ---
  function watchDOM() {
    var observer = new MutationObserver(function () {
      var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
      if (dropdown) {
        observer.disconnect();
        watchDropdown();
        onProfileChange();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- Polling failsafe ---
  function watchPoll() {
    var lastSeen = null;
    setInterval(function () {
      var id = getProfileId();
      if (id && id !== lastSeen) {
        lastSeen = id;
        _last_profile = null;
        onProfileChange();
      }
    }, 2000);
  }

  // --- Start ---
  function start() {
    var count = Object.keys(profiles).length;
    if (count === 0) {
      console.warn('[default_zoom] No profiles configured. Set window.default_zoom_profiles in init.js');
      return;
    }
    console.log('[default_zoom] Loaded. ' + count + ' profile(s) configured.');

    if (!watchDropdown()) {
      watchDOM();
    }

    watchPoll();
    setTimeout(onProfileChange, delay + 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
