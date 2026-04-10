/*
 * default_zoom - Set default waterfall zoom level per SDR profile
 *
 * Automatically zooms the waterfall when a configured profile loads.
 * Resets zoom to 0 when switching to a profile not in the config.
 * Users can still zoom in/out freely after the initial zoom.
 *
 * No dependencies required. Works standalone.
 *
 * License: MIT
 * Copyright (c) 2025 Zoran, 9A6NDZ
 * https://github.com/9A6NDZ/Openwebrx-plugins
 */

(function () {
  'use strict';

  var profiles = window.default_zoom_profiles || {};
  var delay    = window.default_zoom_delay    || 100;

  var _last_profile = null;
  var _initialized  = false;

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

  function applyForCurrentProfile() {
    var profileId = getProfileId();
    if (!profileId || profileId === _last_profile) return;
    _last_profile = profileId;

    var level = getZoomLevel(profileId);

    setTimeout(function () {
      if (typeof zoom_set !== 'function') return;
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

  function start() {
    if (_initialized) return;
    _initialized = true;

    var count = Object.keys(profiles).length;
    if (count === 0) {
      console.warn('[default_zoom] No profiles configured.');
      return;
    }

    // Watch dropdown for profile changes
    var dropdown = document.getElementById('openwebrx-sdr-profiles-listbox');
    if (dropdown) {
      dropdown.addEventListener('change', function () {
        _last_profile = null;
        applyForCurrentProfile();
      });
    }

    // Apply for initial profile
    applyForCurrentProfile();

    console.log('[default_zoom] Loaded. ' + count + ' profile(s).');
  }

  // Wait for dropdown to exist, then start
  var observer = new MutationObserver(function () {
    if (document.getElementById('openwebrx-sdr-profiles-listbox')) {
      observer.disconnect();
      start();
    }
  });

  if (document.getElementById('openwebrx-sdr-profiles-listbox')) {
    start();
  } else {
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

})();
