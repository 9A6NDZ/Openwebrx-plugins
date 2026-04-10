/*
 * default_zoom - Set default waterfall zoom level per SDR profile
 *
 * Automatically zooms the waterfall when a profile loads.
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
  //    '*': 3,
  //  };
  //  window.default_zoom_delay = 800;
  // ---------------------------------------------------------------

  var profiles = window.default_zoom_profiles || {};
  var delay    = window.default_zoom_delay    || 800;

  var _last_applied = null;

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

    // 2. Substring match (e.g. just the profile UUID)
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

  // --- Apply zoom ---
  function applyZoom() {
    var profileId = getProfileId();
    if (!profileId) return;
    if (profileId === _last_applied) return;

    var level = getZoomLevel(profileId);
    if (level === null) return;

    level = Math.max(0, Math.min(14, parseInt(level, 10)));
    _last_applied = profileId;

    setTimeout(function () {
      if (typeof zoom_set === 'function') {
        zoom_set(level);
        console.log('[default_zoom] Zoom ' + level + ' applied for: ' + profileId);
      }
    }, delay);
  }

  // --- METHOD 1: Listen for profile dropdown changes ---
  function watchDropdown() {
    var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
    if (dropdown) {
      dropdown.addEventListener('change', function () {
        _last_applied = null; // reset so zoom applies to new profile
        applyZoom();
      });
      console.log('[default_zoom] Watching profile dropdown.');
      return true;
    }
    return false;
  }

  // --- METHOD 2: Watch for DOM changes (backup) ---
  function watchDOM() {
    var observer = new MutationObserver(function () {
      var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
      if (dropdown) {
        observer.disconnect();
        watchDropdown();
        applyZoom(); // apply for the initial profile
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[default_zoom] Waiting for UI to load...');
  }

  // --- METHOD 3: Poll for profile changes (failsafe) ---
  function watchPoll() {
    var lastSeen = null;
    setInterval(function () {
      var id = getProfileId();
      if (id && id !== lastSeen) {
        lastSeen = id;
        _last_applied = null;
        applyZoom();
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

    // Try dropdown first, fall back to DOM observer
    if (!watchDropdown()) {
      watchDOM();
    }

    // Always enable polling as failsafe
    watchPoll();

    // Apply for the initial profile after a short wait
    setTimeout(applyZoom, delay + 500);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
