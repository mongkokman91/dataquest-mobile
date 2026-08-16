// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.4.0
// @description  Aggressive mobile shell for Dataquest: native Android editor + READ/CODE/DQ views.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.4.0-native-editor';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const S = {
    readPane: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    codePane: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
    cmHost: '#editor_with_extra .CodeMirror'
  };

  const IDS = ['dq-mobile-style','dq-mobile-dock','dq-native-editor-shell','dq-mobile-diag','dq-mobile-input-status','dq-mobile-input-diag'];
  IDS.forEach(id => document.getElementById(id)?.remove());
  document.body?.classList.remove('dq-mobile-read','dq-mobile-code','dq-mobile-dq','dq-native-read','dq-native-code','dq-native-dq');

  let mode = 'read';
  let syncTimer = null;
  let textarea = null;
  let statusEl = null;
  let initializedDraft = false;

  const draftKey = () => `dq-mobile-draft:${location.pathname}`;
  const q = s => document.querySelector(s);
  const getCM = () => q(S.cmHost)?.CodeMirror || null;

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x:hidden !important; }

    #dq-mobile-dock {
      position:fixed !important;
      right:10px !important;
      bottom:max(10px, env(safe-area-inset-bottom)) !important;
      z-index:2147483647 !important;
      display:flex !important;
      gap:5px !important;
      padding:5px !important;
      border-radius:12px !important;
      background:rgba(17,24,39,.96) !important;
      box-shadow:0 4px 18px rgba(0,0,0,.5) !important;
    }
    #dq-mobile-dock button,
    #dq-native-editor-shell button {
      border:0 !important;
      border-radius:8px !important;
      padding:9px 10px !important;
      color:#fff !important;
      background:#374151 !important;
      font:700 12px/1 system-ui,sans-serif !important;
    }
    #dq-mobile-dock button[data-active="true"] { background:#2563eb !important; }

    body.dq-native-read ${S.readPane} {
      display:block !important;
      visibility:visible !important;
      width:100% !important;
      max-width:100% !important;
      position:relative !important;
      left:0 !important;
      right:auto !important;
      transform:none !important;
    }
    body.dq-native-read ${S.codePane} { display:none !important; }
    body.dq-native-read ${S.instruction} {
      display:block !important;
      width:100% !important;
      max-width:100% !important;
      box-sizing:border-box !important;
      padding-left:20px !important;
      padding-right:20px !important;
      padding-bottom:90px !important;
      overflow-x:hidden !important;
    }

    body.dq-native-dq ${S.readPane} { display:none !important; }
    body.dq-native-dq ${S.codePane} {
      display:block !important;
      visibility:visible !important;
      width:100% !important;
      max-width:100% !important;
      min-width:0 !important;
      position:relative !important;
      left:0 !important;
      right:auto !important;
      transform:none !important;
    }

    #dq-native-editor-shell {
      position:fixed !important;
      left:0 !important;
      right:0 !important;
      top:64px !important;
      height:calc(var(--dq-vv-height, 100vh) - 64px) !important;
      z-index:2147483645 !important;
      display:none !important;
      background:#111318 !important;
      color:#fff !important;
      overflow:hidden !important;
      box-sizing:border-box !important;
    }
    body.dq-native-code #dq-native-editor-shell { display:block !important; }

    #dq-native-editor-shell .dq-native-top {
      position:absolute !important;
      top:0 !important;
      left:0 !important;
      right:0 !important;
      height:46px !important;
      display:flex !important;
      align-items:center !important;
      gap:6px !important;
      padding:5px 8px !important;
      box-sizing:border-box !important;
      background:#1f2937 !important;
      border-bottom:1px solid #374151 !important;
      z-index:2 !important;
    }
    #dq-native-editor-shell .dq-native-status {
      min-width:0 !important;
      flex:1 1 auto !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
      white-space:nowrap !important;
      color:#cbd5e1 !important;
      font:600 11px/1.2 system-ui,sans-serif !important;
    }
    #dq-native-editor {
      position:absolute !important;
      top:46px !important;
      left:0 !important;
      right:0 !important;
      bottom:52px !important;
      width:100% !important;
      height:auto !important;
      margin:0 !important;
      border:0 !important;
      border-radius:0 !important;
      outline:none !important;
      resize:none !important;
      box-sizing:border-box !important;
      padding:14px !important;
      background:#111318 !important;
      color:#f8fafc !important;
      caret-color:#fff !important;
      font:16px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
      white-space:pre !important;
      overflow:auto !important;
      tab-size:2 !important;
      -webkit-user-select:text !important;
      user-select:text !important;
    }
    #dq-native-editor-shell .dq-native-bottom {
      position:absolute !important;
      left:0 !important;
      right:0 !important;
      bottom:0 !important;
      height:52px !important;
      display:flex !important;
      align-items:center !important;
      justify-content:flex-end !important;
      gap:7px !important;
      padding:6px 8px !important;
      box-sizing:border-box !important;
      background:#1f2937 !important;
      border-top:1px solid #374151 !important;
      z-index:2 !important;
    }
    #dq-native-editor-shell .dq-run { background:#0f766e !important; }
    #dq-native-editor-shell .dq-submit { background:#2563eb !important; }
  `;
  document.documentElement.appendChild(style);

  const setViewportVars = () => {
    const h = Math.round(window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty('--dq-vv-height', `${h}px`);
  };

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  const findButton = regex => [...document.querySelectorAll('button,[role="button"]')]
    .find(el => regex.test((el.innerText || el.textContent || '').trim()));

  const syncToDataquest = ({ quiet = false } = {}) => {
    if (!textarea) return false;
    const cm = getCM();
    if (!cm || typeof cm.setValue !== 'function') {
      if (!quiet) setStatus('Waiting for Dataquest editor…');
      return false;
    }
    try {
      const value = textarea.value;
      if (cm.getValue?.() !== value) cm.setValue(value);
      cm.save?.();
      cm.refresh?.();
      if (!quiet) setStatus('Synced to Dataquest');
      return cm.getValue?.() === value;
    } catch (error) {
      console.warn('[DQ Mobile] sync failed', error);
      if (!quiet) setStatus('Sync failed');
      return false;
    }
  };

  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncToDataquest({ quiet: true }), 180);
  };

  const initDraft = () => {
    if (!textarea || initializedDraft) return;
    const cm = getCM();
    const saved = localStorage.getItem(draftKey());
    if (saved != null) {
      textarea.value = saved;
      initializedDraft = true;
      setStatus('Draft restored');
      syncToDataquest({ quiet: true });
      return;
    }
    if (cm && typeof cm.getValue === 'function') {
      textarea.value = cm.getValue() || '';
      initializedDraft = true;
      setStatus('Loaded from Dataquest');
    }
  };

  const action = (kind) => {
    if (!syncToDataquest()) return;
    const regex = kind === 'run' ? /^run code$/i : /^submit answer$/i;
    const btn = findButton(regex);
    if (!btn) {
      setStatus(kind === 'run' ? 'Run Code button not found' : 'Submit button not found');
      return;
    }
    setStatus(kind === 'run' ? 'Running…' : 'Submitting…');
    btn.click();
    setTimeout(() => setMode('dq'), 250);
  };

  const setMode = next => {
    mode = next;
    if (!document.body) return;
    syncToDataquest({ quiet: true });
    document.body.classList.toggle('dq-native-read', next === 'read');
    document.body.classList.toggle('dq-native-code', next === 'code');
    document.body.classList.toggle('dq-native-dq', next === 'dq');
    document.querySelectorAll('#dq-mobile-dock button').forEach(b => b.dataset.active = String(b.dataset.mode === next));

    if (next === 'read') {
      requestAnimationFrame(() => q(S.instruction)?.scrollIntoView({ block:'start' }));
    } else if (next === 'code') {
      initDraft();
      requestAnimationFrame(() => textarea?.focus({ preventScroll:true }));
    } else {
      requestAnimationFrame(() => q(S.codePane)?.scrollIntoView({ block:'start' }));
    }
  };

  const mountShell = () => {
    if (document.getElementById('dq-native-editor-shell')) return;
    const shell = document.createElement('div');
    shell.id = 'dq-native-editor-shell';

    const top = document.createElement('div');
    top.className = 'dq-native-top';
    statusEl = document.createElement('div');
    statusEl.className = 'dq-native-status';
    statusEl.textContent = `Native editor ${VERSION}`;

    const topRead = document.createElement('button');
    topRead.textContent = 'READ';
    topRead.addEventListener('click', () => setMode('read'));
    const topDQ = document.createElement('button');
    topDQ.textContent = 'DQ VIEW';
    topDQ.addEventListener('click', () => setMode('dq'));
    top.append(statusEl, topRead, topDQ);

    textarea = document.createElement('textarea');
    textarea.id = 'dq-native-editor';
    textarea.setAttribute('inputmode','text');
    textarea.setAttribute('autocomplete','off');
    textarea.setAttribute('autocapitalize','off');
    textarea.setAttribute('spellcheck','false');
    textarea.setAttribute('aria-label','Dataquest mobile code editor');
    textarea.addEventListener('input', () => {
      localStorage.setItem(draftKey(), textarea.value);
      setStatus('Draft saved');
      scheduleSync();
    });
    textarea.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText('  ', start, end, 'end');
        textarea.dispatchEvent(new Event('input', { bubbles:true }));
      }
    });

    const bottom = document.createElement('div');
    bottom.className = 'dq-native-bottom';
    const run = document.createElement('button');
    run.className = 'dq-run';
    run.textContent = 'RUN';
    run.addEventListener('click', () => action('run'));
    const submit = document.createElement('button');
    submit.className = 'dq-submit';
    submit.textContent = 'SUBMIT';
    submit.addEventListener('click', () => action('submit'));
    bottom.append(run, submit);

    shell.append(top, textarea, bottom);
    document.documentElement.appendChild(shell);
    initDraft();
  };

  const mountDock = () => {
    if (document.getElementById('dq-mobile-dock')) return;
    const dock = document.createElement('div');
    dock.id = 'dq-mobile-dock';
    const make = (label, value) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.mode = value;
      b.addEventListener('click', () => setMode(value));
      return b;
    };
    dock.append(make('READ','read'), make('CODE','code'), make('DQ','dq'));
    document.documentElement.appendChild(dock);
  };

  const ensureContinue = () => {
    const btn = [...document.querySelectorAll('button,a')]
      .find(el => /continue here/i.test((el.innerText || el.textContent || '').trim()));
    if (btn && !btn.dataset.dqAutoClicked) {
      btn.dataset.dqAutoClicked = '1';
      btn.click();
    }
  };

  const boot = () => {
    setViewportVars();
    mountShell();
    mountDock();
    ensureContinue();
    initDraft();
    if (document.body && !document.body.classList.contains('dq-native-read') && !document.body.classList.contains('dq-native-code') && !document.body.classList.contains('dq-native-dq')) {
      setMode(mode);
    }
  };

  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('resize', setViewportVars, { passive:true });
  window.visualViewport?.addEventListener('resize', setViewportVars, { passive:true });
  window.visualViewport?.addEventListener('scroll', setViewportVars, { passive:true });

  boot();
  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
