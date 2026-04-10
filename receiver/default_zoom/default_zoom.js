/*
 * default_zoom - Set default waterfall zoom level per SDR profile
 *
 * License: MIT
 * Copyright (c) 2025 Zoran, 9A6NDZ
 * https://github.com/9A6NDZ/Openwebrx-plugins
 */

(function () {
  'use strict';

  var profiles = window.default_zoom_profiles || {};
  var delay    = window.default_zoom_delay    || 800;

  function getProfileId() {
    if (typeof currentprofile === 'undefined' || !currentprofile) return null;
    if (currentprofile.sdr_id && currentprofile.profile_id) {
      return currentprofile.sdr_id + '|' + currentprofile.profile_id;
    }
    if (typeof currentprofile === 'string') return currentprofile;
    return null;
  }

  function getZoomLevel(profileId) {
    if (!profileId) return null;
    if (profiles.hasOwnProperty(profileId)) return profiles[profileId];
    var keys = Object.keys(profiles);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== '*' && profileId.indexOf(keys[i]) !== -1) return profiles[keys[i]];
    }
    if (profiles.hasOwnProperty('*')) return profiles['*'];
    return null;
  }

  function applyZoom() {
    setTimeout(function () {
      var profileId = getProfileId();
      if (!profileId) return;
      if (typeof zoom_set !== 'function') return;

      var level = getZoomLevel(profileId);
      if (level !== null) {
        level = Math.max(0, Math.min(14, parseInt(level, 10)));
        zoom_set(level);
        console.log('[default_zoom] Zoom ' + level + ' → ' + profileId);
      } else {
        zoom_set(0);
        console.log('[default_zoom] Reset zoom → ' + profileId);
      }
    }, delay);
  }

  function watchDropdown() {
    var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
    if (dropdown) {
      dropdown.addEventListener('change', function () {
        applyZoom();
      });
      console.log('[default_zoom] Watching profile dropdown.');
      return true;
    }
    return false;
  }

  function watchDOM() {
    var observer = new MutationObserver(function () {
      var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
      if (dropdown) {
        observer.disconnect();
        watchDropdown();
        applyZoom();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[default_zoom] Waiting for UI...');
  }

  function start() {
    var count = Object.keys(profiles).length;
    if (count === 0) {
      console.warn('[default_zoom] No profiles configured.');
      return;
    }
    console.log('[default_zoom] Loaded. ' + count + ' profile(s).');

    if (!watchDropdown()) {
      watchDOM();
    }

    // Apply for initial profile
    applyZoom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
