(() => {
  'use strict';

  const VERSION = '0.1.0-diagnostic';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;

  const state = {
    selecting: null,
    instruction: null,
    editor: null,
    lastReport: null,
  };

  const cssPath = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const parts = [];
    let node = el;
    for (let depth = 0; node && node !== document.body && depth < 6; depth++, node = node.parentElement) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${CSS.escape(node.id)}`;
        parts.unshift(part);
        break;
      }
      const classes = [...node.classList].filter(Boolean).slice(0, 3);
      if (classes.length) part += '.' + classes.map(c => CSS.escape(c)).join('.');
      parts.unshift(part);
    }
    return parts.join(' > ');
  };

  const describe = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      id: el.id || null,
      classes: [...el.classList],
      path: cssPath(el),
      rect: {
        x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height)
      },
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 180)
    };
  };

  const viewport = () => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type || null,
    visualViewport: window.visualViewport ? {
      width: Math.round(visualViewport.width),
      height: Math.round(visualViewport.height),
      offsetLeft: Math.round(visualViewport.offsetLeft),
      offsetTop: Math.round(visualViewport.offsetTop),
      scale: visualViewport.scale
    } : null
  });

  const report = () => {
    const data = {
      version: VERSION,
      url: location.href,
      viewport: viewport(),
      instruction: describe(state.instruction),
      editor: describe(state.editor),
      activeElement: describe(document.activeElement)
    };
    state.lastReport = data;
    console.log('[DQ Mobile diagnostic]', data);
    return JSON.stringify(data, null, 2);
  };

  const toast = (text) => {
    let el = document.getElementById('dq-mobile-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dq-mobile-toast';
      Object.assign(el.style, {
        position: 'fixed', left: '12px', right: '12px', bottom: '82px', zIndex: '2147483647',
        background: '#111827', color: 'white', padding: '12px', borderRadius: '10px',
        font: '14px/1.35 system-ui, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,.4)'
      });
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 2600);
  };

  const startPick = (kind) => {
    state.selecting = kind;
    toast(`Tap the ${kind === 'instruction' ? 'INSTRUCTIONS' : 'CODE EDITOR'} area once.`);
  };

  document.addEventListener('click', (e) => {
    if (!state.selecting) return;
    if (e.target.closest?.('#dq-mobile-panel')) return;
    e.preventDefault();
    e.stopPropagation();
    const picked = e.target;
    state[state.selecting] = picked;
    const kind = state.selecting;
    state.selecting = null;
    toast(`${kind === 'instruction' ? 'Instructions' : 'Editor'} captured.`);
    renderStatus();
  }, true);

  const panel = document.createElement('div');
  panel.id = 'dq-mobile-panel';
  Object.assign(panel.style, {
    position: 'fixed', right: '10px', bottom: '10px', zIndex: '2147483647',
    display: 'flex', gap: '6px', alignItems: 'center', padding: '7px', borderRadius: '12px',
    background: 'rgba(17,24,39,.94)', color: 'white', font: '12px system-ui, sans-serif',
    boxShadow: '0 4px 18px rgba(0,0,0,.45)'
  });

  const button = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      border: '0', borderRadius: '8px', padding: '8px 9px', background: '#374151', color: 'white',
      font: '600 12px system-ui, sans-serif'
    });
    b.addEventListener('click', fn);
    return b;
  };

  const status = document.createElement('span');
  status.style.padding = '0 3px';
  const renderStatus = () => {
    status.textContent = `DQ ${VERSION} · I:${state.instruction ? '✓' : '–'} E:${state.editor ? '✓' : '–'}`;
  };

  panel.append(
    status,
    button('Pick I', () => startPick('instruction')),
    button('Pick E', () => startPick('editor')),
    button('Report', async () => {
      const text = report();
      try {
        await navigator.clipboard.writeText(text);
        toast('Diagnostic copied to clipboard.');
      } catch {
        prompt('Copy this diagnostic:', text);
      }
    })
  );
  renderStatus();
  document.documentElement.appendChild(panel);

  const logViewport = () => console.log('[DQ Mobile viewport]', viewport());
  window.addEventListener('resize', logViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', logViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', logViewport, { passive: true });

  console.log(`[DQ Mobile] ${VERSION} loaded`);
})();
