// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.5
// @description  Mobile READ/CODE layout and Android input bridge for Dataquest.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.5-android-input-bridge';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const S = {
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
  document.getElementById('dq-mobile-input-diag')?.remove();
  document.getElementById('dq-mobile-input-status')?.remove();
  document.body?.classList.remove('dq-mobile-read', 'dq-mobile-code');

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x: hidden !important; }
    #dq-mobile-toggle {
      position: fixed !important; right: 12px !important;
      bottom: max(14px, env(safe-area-inset-bottom)) !important;
      z-index: 2147483647 !important; display: flex !important; gap: 6px !important;
      padding: 6px !important; border-radius: 12px !important;
      background: rgba(17,24,39,.96) !important;
      box-shadow: 0 4px 18px rgba(0,0,0,.45) !important;
    }
    #dq-mobile-toggle button {
      border: 0 !important; border-radius: 8px !important; padding: 10px 12px !important;
      color: #fff !important; background: #374151 !important;
      font: 700 13px/1 system-ui,sans-serif !important;
    }
    #dq-mobile-toggle button[data-active="true"] { background: #2563eb !important; }

    #dq-mobile-input-status {
      position: fixed !important; left: 10px !important; bottom: 16px !important;
      z-index: 2147483646 !important; padding: 6px 8px !important; border-radius: 8px !important;
      background: rgba(17,24,39,.9) !important; color: #c7d2fe !important;
      font: 700 11px/1 system-ui,sans-serif !important;
    }

    body.dq-mobile-read ${S.readPane} {
      display: block !important; width: 100% !important; max-width: 100% !important;
      position: relative !important; left: 0 !important;
    }
    body.dq-mobile-read ${S.codePane} { display: none !important; }
    body.dq-mobile-read ${S.instruction} {
      width: 100% !important; max-width: 100% !important; padding-left: 20px !important;
      padding-right: 20px !important; padding-bottom: 100px !important; box-sizing: border-box !important;
      overflow-x: hidden !important;
    }

    body.dq-mobile-code ${S.readPane} { display: none !important; }
    body.dq-mobile-code ${S.codePane} {
      display: block !important; visibility: visible !important;
      width: 100% !important; max-width: 100% !important; height: calc(100vh - 64px) !important;
      position: relative !important; left: 0 !important; top: 0 !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.innerSplit} {
      display: block !important; position: relative !important; width: 100% !important;
      height: 100% !important; min-height: 100% !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.innerPane1} { display: none !important; }
    body.dq-mobile-code ${S.innerSplit} > .Resizer { display: none !important; }
    body.dq-mobile-code ${S.innerPane2} {
      display: block !important; visibility: visible !important; position: absolute !important;
      inset: 0 !important; width: 100% !important; height: 100% !important; overflow: visible !important;
    }
    body.dq-mobile-code ${S.innerPane2} .dq-panels,
    body.dq-mobile-code ${S.innerPane2} .dq-dark,
    body.dq-mobile-code ${S.innerPane2} > div,
    body.dq-mobile-code ${S.innerPane2} > div > div {
      height: 100% !important; min-height: 0 !important;
    }
    body.dq-mobile-code ${S.editorRoot} {
      display: flex !important; visibility: visible !important; opacity: 1 !important;
      position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important;
      padding-bottom: 96px !important; box-sizing: border-box !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.editorRoot} .dq-editor,
    body.dq-mobile-code ${S.editor},
    body.dq-mobile-code ${S.editorScroll} {
      display: block !important; visibility: visible !important;
      width: 100% !important; height: 100% !important; min-height: 0 !important;
    }
    body.dq-mobile-code ${S.editor} { font-size: 16px !important; }
    body.dq-mobile-code ${S.editorScroll} { overflow: auto !important; }
  `;
  document.documentElement.appendChild(style);

  const q = selector => document.querySelector(selector);
  const getEditorHost = () => q(S.editor);
  const getInstruction = () => q(S.instruction);
  const getCodePane = () => q(S.codePane);
  const getCM = () => getEditorHost()?.CodeMirror || null;

  let mode = 'read';
  let lastTapPos = null;

  const status = document.createElement('div');
  status.id = 'dq-mobile-input-status';
  status.textContent = 'DQ input bridge ready';
  document.documentElement.appendChild(status);

  const refreshEditor = () => {
    const cm = getCM();
    if (!cm) return;
    const vvHeight = Math.round(window.visualViewport?.height || window.innerHeight);
    setTimeout(() => {
      cm.setSize?.('100%', Math.max(220, vvHeight - 84));
      cm.refresh?.();
    }, 80);
  };

  const placeCursorFromTap = event => {
    const cm = getCM();
    if (!cm || typeof cm.coordsChar !== 'function') return;
    try {
      const pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
      if (pos) {
        cm.setCursor?.(pos);
        lastTapPos = pos;
      }
    } catch {}
  };

  const focusEditor = () => {
    const cm = getCM();
    if (!cm) return;
    try {
      cm.focus?.();
      const input = cm.getInputField?.();
      if (input) {
        input.removeAttribute?.('readonly');
        input.removeAttribute?.('disabled');
        input.setAttribute?.('inputmode', 'text');
        input.setAttribute?.('autocapitalize', 'off');
        input.setAttribute?.('autocomplete', 'off');
        input.setAttribute?.('spellcheck', 'false');
        input.focus?.({ preventScroll: true });
      }
    } catch {}
  };

  const applyEdit = event => {
    if (mode !== 'code') return false;
    const cm = getCM();
    if (!cm) return false;
    const target = event.target;
    if (!target?.closest?.(S.editorRoot)) return false;

    const type = event.inputType || '';
    const data = event.data;

    try {
      if (type === 'insertText' || type === 'insertCompositionText' || type === 'insertReplacementText') {
        if (data == null || data === '') return false;
        cm.replaceSelection?.(data, 'end');
      } else if (type === 'insertLineBreak' || type === 'insertParagraph') {
        cm.replaceSelection?.('\n', 'end');
      } else if (type === 'deleteContentBackward') {
        cm.execCommand?.('delCharBefore');
      } else if (type === 'deleteContentForward') {
        cm.execCommand?.('delCharAfter');
      } else if (type === 'deleteByCut') {
        cm.replaceSelection?.('', 'end');
      } else if (type === 'insertFromPaste') {
        if (data != null) cm.replaceSelection?.(data, 'end');
        else return false;
      } else {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      cm.refresh?.();
      status.textContent = `DQ input bridge: ${type}`;
      return true;
    } catch (error) {
      status.textContent = 'DQ input bridge error';
      console.warn('[DQ Mobile] input bridge failed', error);
      return false;
    }
  };

  document.addEventListener('beforeinput', event => {
    applyEdit(event);
  }, true);

  document.addEventListener('pointerdown', event => {
    if (mode !== 'code') return;
    if (!event.target.closest?.(S.editorRoot)) return;
    placeCursorFromTap(event);
    setTimeout(focusEditor, 0);
  }, true);

  const applyMode = next => {
    mode = next;
    if (!document.body) return;
    document.body.classList.toggle('dq-mobile-read', next === 'read');
    document.body.classList.toggle('dq-mobile-code', next === 'code');
    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => {
      btn.dataset.active = String(btn.dataset.mode === next);
    });

    if (next === 'read') {
      status.style.display = 'none';
      requestAnimationFrame(() => getInstruction()?.scrollIntoView({ block: 'start' }));
    } else {
      status.style.display = 'block';
      requestAnimationFrame(() => {
        getCodePane()?.scrollIntoView({ block: 'start' });
        refreshEditor();
      });
    }
  };

  const mountControls = () => {
    if (document.getElementById('dq-mobile-toggle')) return;
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
    if (mode === 'code' && getCM()) refreshEditor();
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
