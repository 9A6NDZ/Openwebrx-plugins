// ============================================================================
// Welcome Screen Plugin for OpenWebRX+
// Author: 9A6NDZ (Zoran)
// Repository: https://github.com/9A6NDZ/Openwebrx-plugins
// License: MIT
// Version: 6
//
// Simple fullscreen welcome overlay with a message and START button.
// ============================================================================

(function () {
  'use strict';

  Plugins.welcome_screen = {
    _version: 6,
    no_css: true,
    title:      'Welcome to my OWRX SDR',
    subtitle:   '',
    buttonText: 'START',
  };

  if (typeof Plugins.welcome_screen_config === 'object') {
    Object.assign(Plugins.welcome_screen, Plugins.welcome_screen_config);
  }

  var CFG = Plugins.welcome_screen;
  var _done = false;

  function showOverlay() {
    if (document.getElementById('welcomeOverlay')) return;

    var ov = document.createElement('div');
    ov.id = 'welcomeOverlay';
    ov.style.cssText =
      'position:fixed; top:0; left:0; width:100%; height:100%;' +
      'background:rgba(0,0,20,0.92);' +
      'display:flex; flex-direction:column; align-items:center; justify-content:center;' +
      'text-align:center; color:#ffae00; font-size:20px; padding:20px;' +
      'z-index:999999;';

    var box = document.createElement('div');
    box.style.cssText = 'max-width:600px; width:90%;';

    var h2 = document.createElement('h2');
    h2.textContent = CFG.title;
    h2.style.cssText = 'margin:0 0 16px; font-size:32px; color:#ffae00;';

    box.appendChild(h2);

    if (CFG.subtitle) {
      var p = document.createElement('p');
      p.innerHTML = CFG.subtitle;
      p.style.cssText = 'margin:0 0 30px; font-size:18px; color:#cc8800; line-height:1.6;';
      box.appendChild(p);
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = CFG.buttonText;
    btn.style.cssText =
      'margin-top:25px; padding:12px 40px;' +
      'font-size:22px; font-weight:bold;' +
      'background:#ffae00; color:#000;' +
      'border:none; border-radius:8px; cursor:pointer;';

    btn.addEventListener('click', function () {
      ov.style.display = 'none';
      ov.remove();
    });

    box.appendChild(btn);
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  function init() {
    if (_done) return true;
    _done = true;
    showOverlay();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  Plugins.welcome_screen.init = init;
})();
