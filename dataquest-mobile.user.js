// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.3.0
// @description  Diagnostic build for Dataquest mobile layout on Android.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.3.0-diagnostic';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const S = {
    split: 'div.SplitPane.vertical',
    pane1: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    pane2: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
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
    #dq-mobile-diag {
      position: fixed; right: 10px; bottom: 10px; z-index: 2147483647;
      width: min(92vw, 520px); max-height: 52vh; overflow: auto;
      background: rgba(17,24,39,.98); color: #fff; border-radius: 12px;
      padding: 10px; box-shadow: 0 4px 18px rgba(0,0,0,.55);
      font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    #dq-mobile-diag .dq-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
    #dq-mobile-diag button {
      border:0; border-radius:8px; padding:8px 10px; background:#374151; color:#fff;
      font:600 12px system-ui,sans-serif;
    }
    #dq-mobile-diag pre { white-space:pre-wrap; word-break:break-word; margin:0; }
  `;
  document.documentElement.appendChild(style);

  const rect = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), left: Math.round(r.left) };
  };

  const describe = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      id: el.id || null,
      classes: [...el.classList],
      rect: rect(el),
      style: {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        minWidth: cs.minWidth,
        minHeight: cs.minHeight,
        overflow: cs.overflow,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        transform: cs.transform,
        top: cs.top,
        right: cs.right,
        bottom: cs.bottom,
        left: cs.left,
        zIndex: cs.zIndex
      }
    };
  };

  const ancestry = (el, limit = 8) => {
    const out = [];
    let node = el;
    for (let i = 0; node && i < limit; i++, node = node.parentElement) {
      out.push(describe(node));
    }
    return out;
  };

  const viewport = () => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type || null,
    visualViewport: window.visualViewport ? {
      width: Math.round(window.visualViewport.width),
      height: Math.round(window.visualViewport.height),
      offsetLeft: Math.round(window.visualViewport.offsetLeft),
      offsetTop: Math.round(window.visualViewport.offsetTop),
      pageLeft: Math.round(window.visualViewport.pageLeft),
      pageTop: Math.round(window.visualViewport.pageTop),
      scale: window.visualViewport.scale
    } : null
  });

  const buildReport = () => {
    const pane2 = document.querySelector(S.pane2);
    const root = document.querySelector(S.editorRoot);
    const cmHost = document.querySelector(S.editor);
    const scroll = document.querySelector(S.editorScroll);
    const cm = cmHost?.CodeMirror || scroll?.closest('.CodeMirror')?.CodeMirror || null;

    return {
      version: VERSION,
      url: location.href,
      viewport: viewport(),
      pane2: describe(pane2),
      editorRoot: describe(root),
      codeMirror: describe(cmHost),
      codeMirrorScroll: describe(scroll),
      activeElement: describe(document.activeElement),
      codeMirrorInstance: cm ? {
        exists: true,
        hasRefresh: typeof cm.refresh === 'function',
        hasSetSize: typeof cm.setSize === 'function',
        valueLength: typeof cm.getValue === 'function' ? cm.getValue().length : null
      } : { exists: false },
      pane2Ancestors: ancestry(pane2),
      editorAncestors: ancestry(root),
      codeMirrorAncestors: ancestry(cmHost)
    };
  };

  const panel = document.createElement('div');
  panel.id = 'dq-mobile-diag';
  const row = document.createElement('div');
  row.className = 'dq-row';
  const output = document.createElement('pre');
  output.textContent = `DQ ${VERSION}\nTap Capture while the CODE view is blank.`;

  const button = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  };

  const capture = () => {
    const report = buildReport();
    const text = JSON.stringify(report, null, 2);
    output.textContent = text;
    window.__DQ_MOBILE_LAST_REPORT = text;
    console.log('[DQ Mobile diagnostic]', report);
    return text;
  };

  row.append(
    button('Capture', capture),
    button('Copy Report', async () => {
      const text = window.__DQ_MOBILE_LAST_REPORT || capture();
      try {
        await navigator.clipboard.writeText(text);
        output.textContent = 'Copied.\n\n' + text;
      } catch {
        prompt('Copy diagnostic report:', text);
      }
    }),
    button('Hide', () => { panel.style.display = 'none'; })
  );
  panel.append(row, output);
  document.documentElement.appendChild(panel);

  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
