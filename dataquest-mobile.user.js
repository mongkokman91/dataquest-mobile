// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.2.5
// @description  Mobile usability layer for Dataquest on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.5-mobile-shell';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const S = {
    split: 'div.SplitPane.vertical',
    pane1: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    pane2: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
    editorRoot: '#editor_with_extra',
    editorScroll: '#editor_with_extra .CodeMirror-scroll'
  };

  const state = { mode: 'read', initialized: false };

  document.getElementById('dq-mobile-style')?.remove();
  document.getElementById('dq-mobile-toggle')?.remove();
  document.body?.classList.remove('dq-mobile-read', 'dq-mobile-code');

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

    body.dq-mobile-read ${S.split},
    body.dq-mobile-code ${S.split} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
    }

    body.dq-mobile-read ${S.pane1},
    body.dq-mobile-code ${S.pane2} {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: calc(100vh - 120px) !important;
      position: relative !important;
      inset: auto !important;
      transform: none !important;
      overflow: visible !important;
    }

    body.dq-mobile-read ${S.pane2},
    body.dq-mobile-code ${S.pane1} {
      display: none !important;
    }

    body.dq-mobile-read ${S.pane1} *,
    body.dq-mobile-code ${S.pane2} * {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    body.dq-mobile-read ${S.instruction} {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: calc(100vh - 150px) !important;
      overflow-y: visible !important;
      overflow-x: hidden !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      padding-bottom: 110px !important;
    }

    body.dq-mobile-code ${S.editorRoot} {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: calc(100vh - 120px) !important;
      padding-bottom: 110px !important;
    }

    body.dq-mobile-code ${S.editorRoot} .dq-editor,
    body.dq-mobile-code ${S.editorRoot} .CodeMirror,
    body.dq-mobile-code ${S.editorRoot} .CodeMirror-scroll {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }

    body.dq-mobile-code ${S.editorRoot} .CodeMirror {
      font-size: 16px !important;
      height: calc(100vh - 240px) !important;
      min-height: 320px !important;
    }

    body.dq-mobile-code ${S.editorRoot} .CodeMirror-scroll {
      height: 100% !important;
      min-height: 320px !important;
      overflow: auto !important;
    }
  `;
  document.documentElement.appendChild(style);

  const ensureContinue = () => {
    const btn = [...document.querySelectorAll('button, a')]
      .find(el => /continue here/i.test((el.innerText || el.textContent || '').trim()));
    if (btn && !btn.dataset.dqAutoClicked) {
      btn.dataset.dqAutoClicked = '1';
      btn.click();
    }
  };

  const getEditorScroll = () => document.querySelector(S.editorScroll);
  const getEditorRoot = () => document.querySelector(S.editorRoot);
  const getInstruction = () => document.querySelector(S.instruction);

  const refreshEditor = () => {
    const scroll = getEditorScroll();
    const host = scroll?.closest('.CodeMirror');
    const cm = host?.CodeMirror;
    if (!cm) return;
    setTimeout(() => {
      if (typeof cm.setSize === 'function') cm.setSize('100%', Math.max(320, window.innerHeight - 240));
      if (typeof cm.refresh === 'function') cm.refresh();
    }, 120);
  };

  const applyMode = (mode) => {
    state.mode = mode;
    document.body.classList.toggle('dq-mobile-read', mode === 'read');
    document.body.classList.toggle('dq-mobile-code', mode === 'code');

    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => {
      btn.dataset.active = String(btn.dataset.mode === mode);
    });

    if (mode === 'read') {
      getInstruction()?.scrollIntoView({ block: 'start' });
    } else {
      getEditorRoot()?.scrollIntoView({ block: 'start' });
      requestAnimationFrame(refreshEditor);
    }
  };

  const mountToggle = () => {
    if (document.getElementById('dq-mobile-toggle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';

    const makeButton = (label, mode) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.mode = mode;
      b.addEventListener('click', () => applyMode(mode));
      return b;
    };

    wrap.append(makeButton('READ', 'read'), makeButton('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode(state.mode);
  };

  const boot = () => {
    ensureContinue();
    if (!document.body) return;
    if (!(getInstruction() || getEditorRoot())) return;
    mountToggle();
    if (!state.initialized) {
      state.initialized = true;
      applyMode('read');
    }
  };

  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    if (state.mode === 'code') refreshEditor();
  }, { passive: true });

  boot();
  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
