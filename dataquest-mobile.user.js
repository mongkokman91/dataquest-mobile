// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.2.2
// @description  Mobile usability layer for Dataquest on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://raw.githubusercontent.com/mongkokman91/dataquest-mobile/main/dataquest-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/mongkokman91/dataquest-mobile/main/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.2-mobile-shell';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const SELECTORS = {
    splitPane: 'div.SplitPane.vertical',
    pane1: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    pane2: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
    editorScroll: '#editor_with_extra .CodeMirror-scroll',
    editorRoot: '#editor_with_extra'
  };

  const state = { mode: 'read', initialized: false };

  const resetInjectedUi = () => {
    document.getElementById('dq-mobile-style')?.remove();
    document.getElementById('dq-mobile-toggle')?.remove();
    document.body?.classList.remove('dq-mobile-read', 'dq-mobile-code');
  };

  resetInjectedUi();

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x: hidden !important; }

    #dq-mobile-toggle {
      position: fixed;
      right: 12px;
      bottom: max(14px, env(safe-area-inset-bottom));
      z-index: 2147483647;
      display: flex;
      gap: 6px;
      padding: 6px;
      border-radius: 12px;
      background: rgba(17,24,39,.96);
      box-shadow: 0 4px 18px rgba(0,0,0,.45);
    }
    #dq-mobile-toggle button {
      border: 0;
      border-radius: 8px;
      padding: 10px 12px;
      color: #fff;
      background: #374151;
      font: 700 13px/1 system-ui,sans-serif;
    }
    #dq-mobile-toggle button[data-active="true"] { background: #2563eb; }

    body.dq-mobile-read ${SELECTORS.splitPane},
    body.dq-mobile-code ${SELECTORS.splitPane} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    body.dq-mobile-read ${SELECTORS.pane1} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      transform: none !important;
      overflow: visible !important;
    }
    body.dq-mobile-read ${SELECTORS.pane2} { display: none !important; }

    body.dq-mobile-code ${SELECTORS.pane1} { display: none !important; }
    body.dq-mobile-code ${SELECTORS.pane2} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      transform: none !important;
      overflow: visible !important;
    }

    body.dq-mobile-read ${SELECTORS.pane1} > *,
    body.dq-mobile-code ${SELECTORS.pane2} > * {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    body.dq-mobile-read ${SELECTORS.instruction} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    body.dq-mobile-code ${SELECTORS.editorRoot},
    body.dq-mobile-code ${SELECTORS.editorRoot} .dq-editor,
    body.dq-mobile-code ${SELECTORS.editorRoot} .CodeMirror,
    body.dq-mobile-code ${SELECTORS.editorRoot} .CodeMirror-scroll {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    body.dq-mobile-code ${SELECTORS.editorRoot} .CodeMirror {
      font-size: 16px !important;
    }

    body.dq-mobile-code .CodeMirror-scroll {
      overflow-x: auto !important;
    }
  `;
  document.documentElement.appendChild(style);

  const ensureContinue = () => {
    const candidates = [...document.querySelectorAll('button, a')];
    const btn = candidates.find(el => /continue here/i.test((el.innerText || el.textContent || '').trim()));
    if (btn && !btn.dataset.dqAutoClicked) {
      btn.dataset.dqAutoClicked = '1';
      btn.click();
    }
  };

  const getEditor = () => document.querySelector(SELECTORS.editorScroll);
  const getInstruction = () => document.querySelector(SELECTORS.instruction);

  const refreshEditor = () => {
    const editor = getEditor();
    const cmHost = editor?.closest('.CodeMirror');
    const cm = cmHost?.CodeMirror;
    if (cm && typeof cm.refresh === 'function') {
      setTimeout(() => cm.refresh(), 100);
    }
  };

  const applyMode = (mode) => {
    state.mode = mode;
    document.body.classList.toggle('dq-mobile-read', mode === 'read');
    document.body.classList.toggle('dq-mobile-code', mode === 'code');

    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => {
      btn.dataset.active = String(btn.dataset.mode === mode);
    });

    if (mode === 'code') requestAnimationFrame(refreshEditor);
  };

  const mountToggle = () => {
    if (document.getElementById('dq-mobile-toggle')) return;

    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';

    const makeButton = (label, mode) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.dataset.mode = mode;
      button.addEventListener('click', () => applyMode(mode));
      return button;
    };

    wrap.append(makeButton('READ', 'read'), makeButton('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode(state.mode);
  };

  const boot = () => {
    ensureContinue();

    if (!document.body) return;
    const hasTarget = Boolean(getInstruction() || getEditor());
    if (!hasTarget) return;

    mountToggle();
    if (!state.initialized) {
      state.initialized = true;
      applyMode('read');
    }
  };

  const observer = new MutationObserver(() => boot());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  boot();
  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
