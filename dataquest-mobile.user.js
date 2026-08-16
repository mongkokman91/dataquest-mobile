// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.2
// @description  Mobile READ/CODE layout for Dataquest on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.2-controls-first';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const S = {
    outerSplit: 'div.SplitPane.vertical',
    readPane: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    codePane: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
    innerSplit: 'div.SplitPane.vertical > div.Pane.vertical.Pane2 div.SplitPane.horizontal',
    innerPane1: 'div.SplitPane.vertical > div.Pane.vertical.Pane2 div.SplitPane.horizontal > div.Pane.horizontal.Pane1',
    innerPane2: 'div.SplitPane.vertical > div.Pane.vertical.Pane2 div.SplitPane.horizontal > div.Pane.horizontal.Pane2',
    editorRoot: '#editor_with_extra',
    editor: '#editor_with_extra .CodeMirror',
    editorScroll: '#editor_with_extra .CodeMirror-scroll'
  };

  document.getElementById('dq-mobile-style')?.remove();
  document.getElementById('dq-mobile-toggle')?.remove();
  document.getElementById('dq-mobile-diag')?.remove();
  document.body?.classList.remove('dq-mobile-read', 'dq-mobile-code');

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x: hidden !important; }
    #dq-mobile-toggle {
      position: fixed !important;
      right: 12px !important;
      bottom: max(14px, env(safe-area-inset-bottom)) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      gap: 6px !important;
      padding: 6px !important;
      border-radius: 12px !important;
      background: rgba(17,24,39,.96) !important;
      box-shadow: 0 4px 18px rgba(0,0,0,.45) !important;
    }
    #dq-mobile-toggle button {
      border: 0 !important;
      border-radius: 8px !important;
      padding: 10px 12px !important;
      color: #fff !important;
      background: #374151 !important;
      font: 700 13px/1 system-ui,sans-serif !important;
    }
    #dq-mobile-toggle button[data-active="true"] { background: #2563eb !important; }

    body.dq-mobile-read ${S.readPane} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      position: relative !important;
      left: 0 !important;
    }
    body.dq-mobile-read ${S.codePane} { display: none !important; }
    body.dq-mobile-read ${S.instruction} {
      width: 100% !important;
      max-width: 100% !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      padding-bottom: 100px !important;
      box-sizing: border-box !important;
      overflow-x: hidden !important;
    }

    body.dq-mobile-code ${S.readPane} { display: none !important; }
    body.dq-mobile-code ${S.codePane} {
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      height: calc(100vh - 64px) !important;
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
      overflow: hidden !important;
    }

    body.dq-mobile-code ${S.innerSplit} {
      display: block !important;
      position: relative !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      overflow: hidden !important;
    }
    body.dq-mobile-code ${S.innerPane1} { display: none !important; }
    body.dq-mobile-code ${S.innerSplit} > .Resizer { display: none !important; }
    body.dq-mobile-code ${S.innerPane2} {
      display: block !important;
      visibility: visible !important;
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      overflow: visible !important;
    }
    body.dq-mobile-code ${S.innerPane2} .dq-panels,
    body.dq-mobile-code ${S.innerPane2} .dq-dark,
    body.dq-mobile-code ${S.innerPane2} > div,
    body.dq-mobile-code ${S.innerPane2} > div > div {
      height: 100% !important;
      min-height: 0 !important;
    }
    body.dq-mobile-code ${S.editorRoot} {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      padding-bottom: 96px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    body.dq-mobile-code ${S.editorRoot} .dq-editor,
    body.dq-mobile-code ${S.editor},
    body.dq-mobile-code ${S.editorScroll} {
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
    }
    body.dq-mobile-code ${S.editor} { font-size: 16px !important; }
    body.dq-mobile-code ${S.editorScroll} { overflow: auto !important; }
  `;
  document.documentElement.appendChild(style);

  const q = selector => document.querySelector(selector);
  const getEditor = () => q(S.editor);
  const getInstruction = () => q(S.instruction);
  const getCodePane = () => q(S.codePane);

  let mode = 'read';

  const refreshEditor = () => {
    const host = getEditor();
    const cm = host?.CodeMirror;
    if (!cm) return;
    const vvHeight = Math.round(window.visualViewport?.height || window.innerHeight);
    const desired = Math.max(260, vvHeight - 84);
    setTimeout(() => {
      if (typeof cm.setSize === 'function') cm.setSize('100%', desired);
      if (typeof cm.refresh === 'function') cm.refresh();
    }, 80);
  };

  const applyMode = next => {
    mode = next;
    if (!document.body) return;
    document.body.classList.toggle('dq-mobile-read', next === 'read');
    document.body.classList.toggle('dq-mobile-code', next === 'code');
    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => {
      btn.dataset.active = String(btn.dataset.mode === next);
    });

    if (next === 'read') {
      requestAnimationFrame(() => getInstruction()?.scrollIntoView({ block: 'start' }));
    } else {
      requestAnimationFrame(() => {
        getCodePane()?.scrollIntoView({ block: 'start' });
        refreshEditor();
      });
    }
  };

  const mountControls = () => {
    if (!document.documentElement || document.getElementById('dq-mobile-toggle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';
    const make = (label, value) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.mode = value;
      b.addEventListener('click', () => applyMode(value));
      return b;
    };
    wrap.append(make('READ', 'read'), make('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode(mode);
  };

  const ensureContinue = () => {
    const btn = [...document.querySelectorAll('button, a')]
      .find(el => /continue here/i.test((el.innerText || el.textContent || '').trim()));
    if (btn && !btn.dataset.dqAutoClicked) {
      btn.dataset.dqAutoClicked = '1';
      btn.click();
    }
  };

  const boot = () => {
    mountControls();
    ensureContinue();
    if (mode === 'code' && getEditor()) refreshEditor();
  };

  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    if (mode === 'code') refreshEditor();
  }, { passive: true });
  window.visualViewport?.addEventListener('resize', () => {
    if (mode === 'code') refreshEditor();
  }, { passive: true });

  boot();
  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
