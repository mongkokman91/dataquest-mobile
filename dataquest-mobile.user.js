// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.1
// @description  Mobile READ/CODE layout for Dataquest on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.1-inner-split-fix';
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

    /* The diagnostic showed Dataquest's editor is inside a SECOND, horizontal
       split pane whose editor pane was only ~78px tall and whose .dq-panels
       ancestor had height:0. Expand that inner editor pane instead of merely
       resizing the outer pane. */
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
    body.dq-mobile-code ${S.editorRoot} .dq-editor {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
    }
    body.dq-mobile-code ${S.editor} {
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      font-size: 16px !important;
    }
    body.dq-mobile-code ${S.editorScroll} {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      overflow: auto !important;
    }
  `;
  document.documentElement.appendChild(style);

  const getEditor = () => document.querySelector(S.editor);
  const getInstruction = () => document.querySelector(S.instruction);
  const getCodePane = () => document.querySelector(S.codePane);

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

  let mode = 'read';
  const applyMode = next => {
    mode = next;
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

  const mount = () => {
    if (!document.body || document.getElementById('dq-mobile-toggle')) return;
    if (!getInstruction() || !getEditor()) return;

    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';
    const make = (label, value) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.mode = value;
      b.addEventListener('click', () => applyMode(value));
      return b;
    };
    wrap.append(make('READ', 'read'), make('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode('read');
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
    ensureContinue();
    mount();
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
