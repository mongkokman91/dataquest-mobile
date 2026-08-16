// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.6
// @description  Diagnostic build for CodeMirror mutation/input on Dataquest Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.6-codemirror-mutation-diagnostic';
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

  ['dq-mobile-style','dq-mobile-toggle','dq-mobile-diag','dq-mobile-input-status'].forEach(id => document.getElementById(id)?.remove());
  document.body?.classList.remove('dq-mobile-read','dq-mobile-code');

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x:hidden !important; }
    #dq-mobile-toggle { position:fixed!important; right:12px!important; bottom:14px!important; z-index:2147483647!important; display:flex!important; gap:6px!important; padding:6px!important; border-radius:12px!important; background:rgba(17,24,39,.96)!important; }
    #dq-mobile-toggle button, #dq-mobile-diag button { border:0!important; border-radius:8px!important; padding:9px 11px!important; color:#fff!important; background:#374151!important; font:700 12px/1 system-ui,sans-serif!important; }
    #dq-mobile-toggle button[data-active="true"] { background:#2563eb!important; }
    #dq-mobile-diag { position:fixed!important; left:8px!important; right:8px!important; top:72px!important; z-index:2147483647!important; max-height:48vh!important; overflow:auto!important; background:rgba(17,24,39,.98)!important; color:#fff!important; border-radius:10px!important; padding:8px!important; font:11px/1.35 ui-monospace,monospace!important; }
    #dq-mobile-diag pre { white-space:pre-wrap!important; word-break:break-word!important; }
    body.dq-mobile-read ${S.readPane} { display:block!important; width:100%!important; max-width:100%!important; position:relative!important; left:0!important; }
    body.dq-mobile-read ${S.codePane} { display:none!important; }
    body.dq-mobile-read ${S.instruction} { width:100%!important; max-width:100%!important; padding-left:20px!important; padding-right:20px!important; padding-bottom:100px!important; box-sizing:border-box!important; }
    body.dq-mobile-code ${S.readPane} { display:none!important; }
    body.dq-mobile-code ${S.codePane} { display:block!important; width:100%!important; height:calc(100vh - 64px)!important; position:relative!important; left:0!important; overflow:hidden!important; }
    body.dq-mobile-code ${S.innerSplit} { display:block!important; position:relative!important; width:100%!important; height:100%!important; min-height:100%!important; overflow:hidden!important; }
    body.dq-mobile-code ${S.innerPane1} { display:none!important; }
    body.dq-mobile-code ${S.innerSplit} > .Resizer { display:none!important; }
    body.dq-mobile-code ${S.innerPane2} { display:block!important; position:absolute!important; inset:0!important; width:100%!important; height:100%!important; overflow:visible!important; }
    body.dq-mobile-code ${S.innerPane2} .dq-panels,
    body.dq-mobile-code ${S.innerPane2} .dq-dark,
    body.dq-mobile-code ${S.innerPane2} > div,
    body.dq-mobile-code ${S.innerPane2} > div > div { height:100%!important; min-height:0!important; }
    body.dq-mobile-code ${S.editorRoot} { display:flex!important; position:absolute!important; inset:0!important; width:100%!important; height:100%!important; padding-bottom:96px!important; box-sizing:border-box!important; overflow:hidden!important; }
    body.dq-mobile-code ${S.editorRoot} .dq-editor,
    body.dq-mobile-code ${S.editor},
    body.dq-mobile-code ${S.editorScroll} { display:block!important; width:100%!important; height:100%!important; min-height:0!important; }
    body.dq-mobile-code ${S.editor} { font-size:16px!important; }
    body.dq-mobile-code ${S.editorScroll} { overflow:auto!important; }
  `;
  document.documentElement.appendChild(style);

  const q = s => document.querySelector(s);
  const getEditorHost = () => q(S.editor);
  const getCM = () => getEditorHost()?.CodeMirror || null;
  const getInstruction = () => q(S.instruction);
  const getCodePane = () => q(S.codePane);

  let mode = 'read';
  let lastEvent = null;
  let bridgeCalls = 0;
  let bridgeErrors = [];

  const cmState = () => {
    const cm = getCM();
    if (!cm) return { exists:false };
    let selection = null;
    let readOnly = null;
    let cursor = null;
    try { selection = cm.getSelection?.() ?? null; } catch {}
    try { readOnly = cm.getOption?.('readOnly') ?? null; } catch {}
    try { cursor = cm.getCursor?.() ?? null; } catch {}
    return {
      exists:true,
      value: cm.getValue?.() ?? null,
      valueLength: cm.getValue?.().length ?? null,
      hasFocus: cm.hasFocus?.() ?? null,
      readOnly,
      selection,
      cursor,
      hasReplaceSelection: typeof cm.replaceSelection === 'function',
      hasSetValue: typeof cm.setValue === 'function',
      hasExecCommand: typeof cm.execCommand === 'function'
    };
  };

  const refreshEditor = () => {
    const cm = getCM();
    if (!cm) return;
    const h = Math.max(220, Math.round((visualViewport?.height || innerHeight) - 84));
    setTimeout(() => { cm.setSize?.('100%', h); cm.refresh?.(); }, 60);
  };

  const buildReport = () => ({
    version: VERSION,
    mode,
    viewport: { innerWidth, innerHeight, vvWidth:visualViewport?.width ?? null, vvHeight:visualViewport?.height ?? null, scale:visualViewport?.scale ?? null },
    cm: cmState(),
    bridgeCalls,
    bridgeErrors: bridgeErrors.slice(-10),
    lastEvent,
    activeElement: document.activeElement ? { tag:document.activeElement.tagName, className:document.activeElement.className, id:document.activeElement.id || null } : null
  });

  const panel = document.createElement('div');
  panel.id = 'dq-mobile-diag';
  panel.style.display = 'none';
  const row = document.createElement('div');
  const out = document.createElement('pre');
  const showReport = () => { const t = JSON.stringify(buildReport(), null, 2); out.textContent = t; window.__DQ_MUTATION_REPORT = t; return t; };
  const button = (label, fn) => { const b=document.createElement('button'); b.textContent=label; b.addEventListener('click',fn); return b; };

  row.append(
    button('TEST INSERT X', () => {
      const cm = getCM();
      if (!cm) { bridgeErrors.push('TEST: no cm'); showReport(); return; }
      try {
        const before = cm.getValue?.();
        cm.replaceSelection?.('X', 'end');
        cm.refresh?.();
        const after = cm.getValue?.();
        lastEvent = { kind:'test-insert', before, after };
      } catch (e) { bridgeErrors.push('TEST: ' + String(e?.stack || e)); }
      showReport();
    }),
    button('TEST SET XYZ', () => {
      const cm = getCM();
      if (!cm) { bridgeErrors.push('SET: no cm'); showReport(); return; }
      try {
        const before = cm.getValue?.();
        cm.setValue?.('XYZ');
        cm.refresh?.();
        const after = cm.getValue?.();
        lastEvent = { kind:'test-set', before, after };
      } catch (e) { bridgeErrors.push('SET: ' + String(e?.stack || e)); }
      showReport();
    }),
    button('Capture', showReport),
    button('Copy', async () => { const t = window.__DQ_MUTATION_REPORT || showReport(); try { await navigator.clipboard.writeText(t); } catch { prompt('Copy report:',t); } }),
    button('Hide', () => panel.style.display='none')
  );
  panel.append(row,out);
  document.documentElement.appendChild(panel);

  const diagButton = document.createElement('button');
  diagButton.textContent = 'CM DIAG';
  diagButton.style.cssText = 'position:fixed;left:10px;bottom:14px;z-index:2147483647;border:0;border-radius:8px;padding:9px;background:#7c3aed;color:#fff;font-weight:700';
  diagButton.addEventListener('click', () => { panel.style.display='block'; showReport(); });
  document.documentElement.appendChild(diagButton);

  document.addEventListener('beforeinput', event => {
    if (mode !== 'code') return;
    if (!event.target?.closest?.(S.editorRoot)) return;
    bridgeCalls += 1;
    const cm = getCM();
    const before = cm?.getValue?.() ?? null;
    lastEvent = { type:'beforeinput', inputType:event.inputType ?? null, data:event.data ?? null, target:event.target?.className ?? null, before };
    if (!cm) { bridgeErrors.push('beforeinput: no cm'); return; }
    try {
      if ((event.inputType === 'insertText' || event.inputType === 'insertCompositionText') && event.data) {
        cm.replaceSelection?.(event.data, 'end');
      }
      const after = cm.getValue?.() ?? null;
      lastEvent.after = after;
    } catch (e) {
      bridgeErrors.push('beforeinput: ' + String(e?.stack || e));
    }
  }, true);

  const applyMode = next => {
    mode = next;
    if (!document.body) return;
    document.body.classList.toggle('dq-mobile-read', next === 'read');
    document.body.classList.toggle('dq-mobile-code', next === 'code');
    document.querySelectorAll('#dq-mobile-toggle button').forEach(b => b.dataset.active=String(b.dataset.mode===next));
    if (next === 'read') requestAnimationFrame(() => getInstruction()?.scrollIntoView({block:'start'}));
    else requestAnimationFrame(() => { getCodePane()?.scrollIntoView({block:'start'}); refreshEditor(); });
  };

  const mountControls = () => {
    if (document.getElementById('dq-mobile-toggle')) return;
    const wrap=document.createElement('div'); wrap.id='dq-mobile-toggle';
    const mk=(label,value)=>{ const b=document.createElement('button'); b.textContent=label; b.dataset.mode=value; b.addEventListener('click',()=>applyMode(value)); return b; };
    wrap.append(mk('READ','read'),mk('CODE','code'));
    document.documentElement.appendChild(wrap);
    applyMode(mode);
  };

  const ensureContinue = () => {
    const btn=[...document.querySelectorAll('button,a')].find(el=>/continue here/i.test((el.innerText||el.textContent||'').trim()));
    if (btn && !btn.dataset.dqAutoClicked) { btn.dataset.dqAutoClicked='1'; btn.click(); }
  };

  const boot = () => { mountControls(); ensureContinue(); if (mode==='code' && getCM()) refreshEditor(); };
  const observer=new MutationObserver(boot); observer.observe(document.documentElement,{childList:true,subtree:true});
  boot();
})();
