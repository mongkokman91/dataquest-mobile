(() => {
  'use strict';

  const VERSION = '0.2.1-mobile-shell';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const SELECTORS = {
    splitPane: 'div.SplitPane.vertical',
    pane1: 'div.SplitPane.vertical > div.Pane.vertical.Pane1',
    pane2: 'div.SplitPane.vertical > div.Pane.vertical.Pane2',
    instruction: 'div.SplitPane.vertical > div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto',
    editorScroll: '#editor_with_extra .CodeMirror-scroll'
  };

  const state = { mode: 'read' };

  const oldStyle = document.getElementById('dq-mobile-style');
  if (oldStyle) oldStyle.remove();
  const oldToggle = document.getElementById('dq-mobile-toggle');
  if (oldToggle) oldToggle.remove();
  document.body?.classList.remove('dq-mobile-read', 'dq-mobile-code');

  const style = document.createElement('style');
  style.id = 'dq-mobile-style';
  style.textContent = `
    html, body { overflow-x: hidden !important; }
    #dq-mobile-toggle {
      position: fixed; right: 12px; bottom: 14px; z-index: 2147483647;
      display: flex; gap: 6px; padding: 6px; border-radius: 12px;
      background: rgba(17,24,39,.96); box-shadow: 0 4px 18px rgba(0,0,0,.45);
    }
    #dq-mobile-toggle button {
      border: 0; border-radius: 8px; padding: 10px 12px; color: white;
      background: #374151; font: 700 13px/1 system-ui,sans-serif;
    }
    #dq-mobile-toggle button[data-active="true"] { background: #2563eb; }

    body.dq-mobile-read ${SELECTORS.splitPane},
    body.dq-mobile-code ${SELECTORS.splitPane} {
      display: block !important;
      width: 100% !important;
    }

    body.dq-mobile-read ${SELECTORS.pane1} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      transform: none !important;
    }
    body.dq-mobile-read ${SELECTORS.pane2} { display: none !important; }

    body.dq-mobile-code ${SELECTORS.pane1} { display: none !important; }
    body.dq-mobile-code ${SELECTORS.pane2} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      position: relative !important;
      left: 0 !important;
      right: auto !important;
      transform: none !important;
    }

    body.dq-mobile-read ${SELECTORS.pane1} > * {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    body.dq-mobile-read ${SELECTORS.instruction} {
      width: 100% !important;
      max-width: none !important;
      box-sizing: border-box !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      overflow-y: auto !important;
    }

    body.dq-mobile-code #editor_with_extra,
    body.dq-mobile-code #editor_with_extra .dq-editor,
    body.dq-mobile-code #editor_with_extra .CodeMirror,
    body.dq-mobile-code #editor_with_extra .CodeMirror-scroll {
      width: 100% !important;
      max-width: 100% !important;
    }
    body.dq-mobile-code #editor_with_extra .CodeMirror {
      font-size: 16px !important;
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

  const applyMode = (mode) => {
    state.mode = mode;
    document.body.classList.toggle('dq-mobile-read', mode === 'read');
    document.body.classList.toggle('dq-mobile-code', mode === 'code');
    document.querySelectorAll('#dq-mobile-toggle button').forEach(btn => {
      btn.dataset.active = String(btn.dataset.mode === mode);
    });

    requestAnimationFrame(() => {
      const editor = getEditor();
      const cmHost = editor?.closest('.CodeMirror');
      const cm = cmHost?.CodeMirror;
      if (mode === 'code' && cm && typeof cm.refresh === 'function') {
        setTimeout(() => cm.refresh(), 100);
      }
    });
  };

  const mountToggle = () => {
    if (document.getElementById('dq-mobile-toggle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'dq-mobile-toggle';

    const mk = (label, mode) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.mode = mode;
      b.addEventListener('click', () => applyMode(mode));
      return b;
    };

    wrap.append(mk('READ', 'read'), mk('CODE', 'code'));
    document.documentElement.appendChild(wrap);
    applyMode(state.mode);
  };

  const boot = () => {
    ensureContinue();
    if (document.body && (getInstruction() || getEditor())) mountToggle();
  };

  const observer = new MutationObserver(() => boot());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  boot();
  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
