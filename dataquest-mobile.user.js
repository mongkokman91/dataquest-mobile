// ==UserScript==
// @name         Dataquest Mobile Loader
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.1.0
// @description  Loads the latest Dataquest Mobile implementation from GitHub.
// @match        https://app.dataquest.io/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const SOURCE = 'https://raw.githubusercontent.com/mongkokman91/dataquest-mobile/main/src/dataquest-mobile.js';
  const url = `${SOURCE}?t=${Date.now()}`;

  GM_xmlhttpRequest({
    method: 'GET',
    url,
    headers: { 'Cache-Control': 'no-cache' },
    onload(response) {
      if (response.status < 200 || response.status >= 300) {
        console.error('[DQ Mobile Loader] GitHub returned', response.status);
        return;
      }
      try {
        // Execute the public, user-controlled implementation fetched from this repository.
        (0, eval)(`${response.responseText}\n//# sourceURL=dataquest-mobile.js`);
      } catch (error) {
        console.error('[DQ Mobile Loader] Failed to execute implementation', error);
      }
    },
    onerror(error) {
      console.error('[DQ Mobile Loader] Failed to fetch implementation', error);
    }
  });
})();
