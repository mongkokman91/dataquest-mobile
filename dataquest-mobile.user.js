// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.4
// @description  Diagnostic input build for Dataquest on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.4-input-diagnostic';
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
    }
    #dq-mobile-toggle button, #dq-mobile-input-diag button {
      border: 0 !important; border-radius: 8px !important; padding: 9px 11px !important;
      color: #fff !important; background: #374151 !important;
      font: 700 12px/1 system-ui,sans-serif !important;
    }
    #dq-mobile-toggle button[data-active="true"] { background: #2563eb !important; }

    #dq-mobile-input-diag {
      position: fixed !important; left: 8px !important; right: 8px !important; top: 76px !important;
      z-index: 2147483647 !important; max-height: 42vh !important; overflow: auto !important;
      background: rgba(17,24,39,.98) !important; color: #fff !important; border-radius: 10px !important;
      padding: 8px !important; font: 11px/1.35 ui-monospace, monospace !important;
    }
    #dq-mobile-input-diag pre { white-space: pre-wrap !important; word-break: break-word !important; }

    body.dq-mobile-read ${S.readPane} {
      display: block !important; width: 100% !important; max-width: 100% !important;
      position: relative !important; left: 0 !important;
    }
    body.dq-mobile-read ${S.codePane} { display: none !important; }
    body.dq-mobile-read ${S.instruction} {
      width: 100% !important; max-width: 100% !important; padding-left: 20px !important;
      padding-right: 20px !important; padding-bottom: 100px !important; box-sizing: border-box !important;
    }

    body.dq-mobile-code ${S.readPane} { display: none !important; }
    body.dq-mobile-code ${S.codePane} {
      display: block !important; width: 100% !important; height: calc(100vh - 64px) !important;
      position: relative !important; left: 0 !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.innerSplit} {
      display: block !important; position: relative !important; width: 100% !important;
      height: 100% !important; min-height: 100% !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.innerPane1} { display: none !important; }
    body.dq-mobile-code ${S.innerSplit} > .Resizer { display: none !important; }
    body.dq-mobile-code ${S.innerPane2} {
      display: block !important; position: absolute !important; inset: 0 !important;
      width: 100% !important; height: 100% !important; overflow: visible !important;
    }
    body.dq-mobile-code ${S.innerPane2} .dq-panels,
    body.dq-mobile-code ${S.innerPane2} .dq-dark,
    body.dq-mobile-code ${S.innerPane2} > div,
    body.dq-mobile-code ${S.innerPane2} > div > div { height: 100% !important; min-height: 0 !important; }
    body.dq-mobile-code ${S.editorRoot} {
      display: flex !important; position: absolute !important; inset: 0 !important;
      width: 100% !important; height: 100% !important; padding-bottom: 96px !important;
      box-sizing: border-box !important; overflow: hidden !important;
    }
    body.dq-mobile-code ${S.editorRoot} .dq-editor,
    body.dq-mobile-code ${S.editor},
    body.dq-mobile-code ${S.editorScroll} {
      display: block !important; width: 100% !important; height: 100% !important; min-height: 0 !important;
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
  const eventLog = [];
  const log = (type, event) => {
    eventLog.push({
      t: Date.now(), type,
      key: event?.key ?? null,
      inputType: event?.inputType ?? null,
      data: event?.data ?? null,
      target: event?.target?.tagName ?? null,
      targetClass: event?.target?.className ?? null
    });
    if (eventLog.length > 40) eventLog.shift();
  };

  const describeInput = () => {
    const cm = getCM();
    const input = cm?.getInputField?.() || null;
    if (!input) return { exists: false };
    const r = input.getBoundingClientRect();
    const cs = getComputedStyle(input);
    return {
      exists: true,
      tag: input.tagName,
      type: input.type || null,
      value: input.value,
      valueLength: input.value?.length ?? null,
      readOnly: !!input.readOnly,
      disabled: !!input.disabled,
      inputMode: input.inputMode || null,
      tabIndex: input.tabIndex,
      active: document.activeElement === input,
      rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
      style: { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, position: cs.position, zIndex: cs.zIndex }
    };
  };

  const refreshEditor = () => {
    const cm = getCM();
    if (!cm) return;
    const vvHeight = Math.round(window.visualViewport?.height || window.innerHeight);
    setTimeout(() => {
      cm.setSize?.('100%', Math.max(220, vvHeight - 84));
      cm.refresh?.();
    }, 80);
  };

  const focusEditor = () => {
    const cm = getCM();
    if (!cm) return;
    cm.focus?.();
    const input = cm.getInputField?.();
    if (input) {
      input.readOnly = false;
      input.disabled = false;
      input.inputMode = 'text';
      input.autocapitalize = 'off';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.focus();
    }
  };

  const applyMode = next => {
    mode = next;
    if (!document.body) return;
    document.body.classList.toggle('dq-mobile-read', next === 'read');
    document.body.classList.toggle('dq-mobile-code', next === 'code');
    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => btn.dataset.active = String(btn.dataset.mode === next));
    if (next === 'read') requestAnimationFrame(() => getInstruction()?.scrollIntoView({ block: 'start' }));
    else requestAnimationFrame(() => { getCodePane()?.scrollIntoView({ block: 'start' }); refreshEditor(); });
  };

  const mountControls = () => {
    if (document.getElementById('dq-mobile-toggle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';
    const make = (label, value) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.mode = value;
      b.addEventListener('click', () => applyMode(value));
      return b;
    };
    wrap.append(make('READ', 'read'), make('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode(mode);
  };

  const buildReport = () => {
    const cm = getCM();
    return {
      version: VERSION,
      mode,
      viewport: { innerWidth, innerHeight, vvWidth: visualViewport?.width ?? null, vvHeight: visualViewport?.height ?? null, scale: visualViewport?.scale ?? null },
      input: describeInput(),
      activeElement: document.activeElement ? { tag: document.activeElement.tagName, className: document.activeElement.className, id: document.activeElement.id || null } : null,
      cm: cm ? { exists: true, value: cm.getValue?.() ?? null, valueLength: cm.getValue?.().length ?? null, hasFocus: cm.hasFocus?.() ?? null } : { exists: false },
      recentEvents: [...eventLog]
    };
  };

  const mountDiag = () => {
    if (document.getElementById('dq-mobile-input-diag')) return;
    const box = document.createElement('div');
    box.id = 'dq-mobile-input-diag';
    box.style.display = 'none';
    const row = document.createElement('div');
    const out = document.createElement('pre');
    const btn = (text, fn) => { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', fn); return b; };
    const capture = () => {
      const text = JSON.stringify(buildReport(), null, 2);
      out.textContent = text;
      window.__DQ_INPUT_REPORT = text;
      return text;
    };
    row.append(
      btn('Focus editor', focusEditor),
      btn('Capture', capture),
      btn('Copy', async () => {
        const text = window.__DQ_INPUT_REPORT || capture();
        try { await navigator.clipboard.writeText(text); } catch { prompt('Copy report:', text); }
      }),
      btn('Hide', () => box.style.display = 'none')
    );
    box.append(row, out);
    document.documentElement.appendChild(box);

    const show = document.createElement('button');
    show.textContent = 'INPUT DIAG';
    show.style.cssText = 'position:fixed;left:10px;bottom:14px;z-index:2147483647;border:0;border-radius:8px;padding:9px;background:#7c3aed;color:white;font-weight:700';
    show.addEventListener('click', () => { box.style.display = 'block'; capture(); });
    document.documentElement.appendChild(show);
  };

  ['keydown','keyup','beforeinput','input','compositionstart','compositionupdate','compositionend'].forEach(type => {
    document.addEventListener(type, e => log(type, e), true);
  });

  document.addEventListener('pointerdown', event => {
    if (mode !== 'code') return;
    if (!event.target.closest?.(S.editorRoot)) return;
    setTimeout(focusEditor, 0);
  }, true);

  const ensureContinue = () => {
    const btn = [...document.querySelectorAll('button, a')].find(el => /continue here/i.test((el.innerText || el.textContent || '').trim()));
    if (btn && !btn.dataset.dqAutoClicked) { btn.dataset.dqAutoClicked = '1'; btn.click(); }
  };

  const boot = () => { mountControls(); mountDiag(); ensureContinue(); if (mode === 'code' && getCM()) refreshEditor(); };
  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  boot();
})();
