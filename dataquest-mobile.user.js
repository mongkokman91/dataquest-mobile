// ==UserScript==
// @name         Dataquest Mobile
// @namespace    https://github.com/mongkokman91/dataquest-mobile
// @version      0.7.0
// @description  Reliable Android shell for Dataquest with a native editor and READ/CODE/DQ views.
// @match        https://app.dataquest.io/*
// @updateURL    https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @downloadURL  https://mongkokman91.github.io/dataquest-mobile/dataquest-mobile.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const VERSION = '0.7.0';
  if (window.__DQ_MOBILE_VERSION === VERSION) return;
  window.__DQ_MOBILE_VERSION = VERSION;
  const state = { mode:'read', textarea:null, toast:null, hideTimer:0, timer:0, route:'', initialized:'' };
  const own = e => e?.closest?.('[data-dq-mobile-ui]');
  const label = e => (e?.innerText || e?.textContent || e?.getAttribute?.('aria-label') || '').trim();
  const rendered = e => {if(!e?.isConnected)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none';};
  const adapter = {
    instructions: () => document.querySelector('div.SplitPane.vertical>div.Pane.vertical.Pane1 div.dq-px-10.dq-pb-3.dq-overflow-y-auto') || document.querySelector('[data-dq-instructions],[data-testid*="instruction" i]'),
    readPane() { const e=this.instructions(); return e?.closest('div.SplitPane.vertical>div.Pane.vertical.Pane1,[data-testid*="instruction-pane" i]') || e; },
    editorHost() {
      const canonical=document.querySelector('#editor_with_extra .CodeMirror,#editor_with_extra .cm-editor');
      if(canonical&&this.editor(canonical))return canonical;
      const all=[...document.querySelectorAll('.CodeMirror,.cm-editor,[data-testid*="editor" i] [role="textbox"]')].filter(e=>!own(e));
      return all.find(e=>this.editor(e)) || canonical || null;
    },
    editor(host=this.editorHost()) {
      if (!host) return null;
      for (const e of [host,host.closest?.('.CodeMirror,.cm-editor'),host.querySelector?.('.CodeMirror,.cm-editor')]) {
        const api=e?.CodeMirror || e?.cmView?.view;
        if (api && (typeof api.setValue==='function' || typeof api.dispatch==='function')) return {api,host:e};
      }
      return null;
    },
    codePane() { const e=this.editorHost(); return e?.closest('div.SplitPane.vertical>div.Pane.vertical.Pane2,[data-testid*="workspace" i]') || e; },
    action(kind) {
      const re=kind==='run'?/^run(?:\s+code)?$/i:/^submit(?:\s+answer)?$/i, pane=this.codePane(), read=this.readPane();
      return [...document.querySelectorAll('button,[role="button"]')]
        .filter(e=>!own(e)&&!(read&&read.contains(e))&&re.test(label(e).replace(/\s+/g,' '))&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('[inert],[aria-disabled="true"]')&&rendered(e))
        .map(e=>({e,score:(pane?.contains(e)?1000:0)+(e.matches('button')?100:0)+(label(e).toLowerCase()===(kind==='run'?'run code':'submit answer')?20:0)}))
        .sort((a,b)=>b.score-a.score)[0]?.e || null;
    },
    read() { const x=this.editor(); return typeof x?.api.getValue==='function'?x.api.getValue():x?.api.state?.doc?.toString?.() || ''; },
    write(value) {
      const x=this.editor(); if (!x) return false;
      try {
        if (typeof x.api.setValue==='function') {
          if (x.api.getValue?.()!==value) x.api.setValue(value);
          x.api.save?.(); x.api.refresh?.();
          x.host.dispatchEvent(new Event('input',{bubbles:true})); x.host.dispatchEvent(new Event('change',{bubbles:true}));
          return x.api.getValue?.()===value;
        }
        if (typeof x.api.dispatch==='function' && x.api.state?.doc) {
          x.api.dispatch({changes:{from:0,to:x.api.state.doc.length,insert:value}});
          return x.api.state.doc.toString()===value;
        }
      } catch (error) { console.warn('[DQ Mobile] sync failed',error); }
      return false;
    }
  };
  const key=()=>`dq-mobile-draft:${location.pathname}`;
  const status=(message,error=false)=>{
    if(!state.toast)return;
    const level=String(error);
    if(state.toast.textContent===message&&state.toast.dataset.error===level&&!state.toast.hidden)return;
    clearTimeout(state.hideTimer);
    state.toast.textContent=message;state.toast.dataset.error=level;state.toast.hidden=false;
    state.hideTimer=setTimeout(()=>{state.toast.hidden=true;},error?7000:3000);
  };
  const sync=(quiet=false)=>{ const ok=state.textarea&&adapter.write(state.textarea.value); if(!quiet)status(ok?'Synced to Dataquest':'Dataquest editor not ready',!ok); return !!ok; };
  const initialize=()=>{
    if(!state.textarea||state.initialized===key())return;
    state.initialized=key(); let saved=null;
    try{saved=localStorage.getItem(key());}catch(_){}
    state.textarea.value=saved??adapter.read()??''; status(saved==null?'Loaded from Dataquest':'Draft restored'); if(saved!=null)sync(true);
  };
  const mark=()=>{
    document.querySelectorAll('[data-dq-mobile-region]').forEach(e=>e.removeAttribute('data-dq-mobile-region'));
    const read=adapter.readPane(), dq=adapter.codePane();
    if(!read||!dq||read===dq||read.contains(dq)||dq.contains(read)){
      if(state.toast)status('Layout unchanged: Dataquest regions are uncertain',true);
      return false;
    }
    read.setAttribute('data-dq-mobile-region','read');dq.setAttribute('data-dq-mobile-region','dq');return true;
  };
  const mode=next=>{
    state.mode=next; if(!document.body)return; if(next==='code')initialize(); mark(); document.body.dataset.dqMobileMode=next;
    document.querySelectorAll('#dq-mobile-dock [data-mode]').forEach(b=>b.dataset.active=String(b.dataset.mode===next));
    if(next==='code')requestAnimationFrame(()=>state.textarea?.focus({preventScroll:true}));
    if(next==='read')requestAnimationFrame(()=>adapter.instructions()?.scrollIntoView({block:'start'}));
  };
  // A dispatched 'click' always bubbles to a document-level capture listener
  // regardless of whether Dataquest's own handler ran, so that alone can never
  // prove the action reached the app. Two independent signals replace it:
  // press() delivers the same pointer/mouse sequence a real tap produces (not
  // every control listens for a bare click), and observeChange() requires a
  // real DOM mutation inside the execution workspace before success is claimed.
  const press=target=>{
    const r=target.getBoundingClientRect();
    const point={clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true,cancelable:true,composed:true,view:window,button:0};
    target.focus?.({preventScroll:true});
    try{target.dispatchEvent(new PointerEvent('pointerdown',{...point,pointerId:1,pointerType:'touch',isPrimary:true}));}catch(_){}
    target.dispatchEvent(new MouseEvent('mousedown',point));
    try{target.dispatchEvent(new PointerEvent('pointerup',{...point,pointerId:1,pointerType:'touch',isPrimary:true}));}catch(_){}
    target.dispatchEvent(new MouseEvent('mouseup',point));
    target.click();
  };
  const observeChange=root=>{
    if(!root)return{result:()=>false,stop:()=>{}};
    let changed=false;
    const mo=new MutationObserver(records=>{
      changed=changed||records.some(r=>!own(r.target)&&!(r.type==='attributes'&&r.attributeName==='data-dq-mobile-region'));
    });
    mo.observe(root,{subtree:true,childList:true,attributes:true,characterData:true});
    return{result:()=>changed,stop:()=>mo.disconnect()};
  };
  const act=async kind=>{
    const Label=kind==='run'?'Run':'Submit';
    if(!sync())return;status(kind==='run'?'Preparing run…':'Preparing submit…');mode('dq');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    let target=null;
    for(let attempt=0;attempt<20&&!target;attempt++){await new Promise(resolve=>setTimeout(resolve,50));target=adapter.action(kind);}
    if(!target)return status(`${Label} control unavailable`,true);
    const watcher=observeChange(adapter.codePane());
    press(target);
    status(kind==='run'?'Running…':'Submitting…');
    let changed=false;
    for(let attempt=0;attempt<80&&!changed;attempt++){await new Promise(resolve=>setTimeout(resolve,150));changed=watcher.result();}
    watcher.stop();
    status(changed?`${kind==='run'?'Run Code':'Submit Answer'} activated`:`${Label} may not have reached Dataquest — check DQ view`,!changed);
  };
  const button=(text,fn,data={})=>{const b=document.createElement('button');b.type='button';b.textContent=text;Object.assign(b.dataset,data);b.addEventListener('click',fn);return b;};
  const mount=()=>{
    if(!document.body||document.querySelector('#dq-native-editor-shell'))return;
    const shell=document.createElement('section');shell.id='dq-native-editor-shell';shell.dataset.dqMobileUi='shell';
    const top=document.createElement('div');top.className='dq-native-top';top.append(button('READ',()=>mode('read')),button('DQ VIEW',()=>mode('dq')));
    state.textarea=document.createElement('textarea');state.textarea.id='dq-native-editor';state.textarea.setAttribute('aria-label','Dataquest mobile code editor');state.textarea.setAttribute('autocomplete','off');state.textarea.setAttribute('autocapitalize','off');state.textarea.spellcheck=false;
    state.textarea.addEventListener('input',()=>{try{localStorage.setItem(key(),state.textarea.value);}catch(_){status('Draft storage unavailable',true);}status('Draft saved');clearTimeout(state.timer);state.timer=setTimeout(()=>sync(true),150);});
    state.textarea.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();state.textarea.setRangeText('  ',state.textarea.selectionStart,state.textarea.selectionEnd,'end');state.textarea.dispatchEvent(new Event('input',{bubbles:true}));}});
    const bottom=document.createElement('div');bottom.className='dq-native-bottom';bottom.append(button('RUN',()=>act('run'),{action:'run'}),button('SUBMIT',()=>act('submit'),{action:'submit'}));shell.append(top,state.textarea,bottom);
    const dock=document.createElement('nav');dock.id='dq-mobile-dock';dock.dataset.dqMobileUi='dock';dock.setAttribute('aria-label','Dataquest mobile views');dock.append(button('READ',()=>mode('read'),{mode:'read'}),button('CODE',()=>mode('code'),{mode:'code'}),button('DQ',()=>mode('dq'),{mode:'dq'}));
    state.toast=document.createElement('output');state.toast.id='dq-mobile-toast';state.toast.dataset.dqMobileUi='toast';state.toast.setAttribute('aria-live','polite');state.toast.hidden=true;
    document.body.append(shell,dock,state.toast);
  };
  const styles=()=>{
    if(document.querySelector('#dq-mobile-style'))return;const s=document.createElement('style');s.id='dq-mobile-style';s.dataset.dqMobileUi='style';s.textContent=`
html,body{overflow-x:hidden!important}[data-dq-mobile-region]{box-sizing:border-box!important}body[data-dq-mobile-mode=read] [data-dq-mobile-region=read]{display:block!important;visibility:visible!important;width:100%!important;max-width:100%!important;position:relative!important;left:0!important;transform:none!important;padding-bottom:80px!important}body[data-dq-mobile-mode=read] [data-dq-mobile-region=dq],body[data-dq-mobile-mode=dq] [data-dq-mobile-region=read]{display:none!important}body[data-dq-mobile-mode=dq] [data-dq-mobile-region=dq]{display:block!important;visibility:visible!important;width:100%!important;max-width:100%!important;min-width:0!important;position:relative!important;left:0!important;transform:none!important}
#dq-mobile-dock{position:fixed!important;right:8px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;z-index:2147483647!important;display:flex!important;gap:5px!important;padding:5px!important;border-radius:12px!important;background:#111827f5!important;box-shadow:0 4px 18px #0008!important}body[data-dq-mobile-mode=code] #dq-mobile-dock{display:none!important}[data-dq-mobile-ui] button{border:0!important;border-radius:8px!important;padding:9px 10px!important;color:#fff!important;background:#374151!important;font:700 12px/1 system-ui,sans-serif!important;min-height:34px!important}[data-dq-mobile-ui] button[data-active=true]{background:#2563eb!important}
#dq-native-editor-shell{position:fixed!important;inset:64px 0 auto 0!important;height:calc(var(--dq-vv-height,100dvh) - 64px)!important;z-index:2147483645!important;display:none!important;background:#111318!important;color:#fff!important;overflow:hidden!important;box-sizing:border-box!important}body[data-dq-mobile-mode=code] #dq-native-editor-shell{display:block!important}.dq-native-top,.dq-native-bottom{position:absolute!important;left:0!important;right:0!important;height:48px!important;display:flex!important;align-items:center!important;gap:6px!important;padding:6px 8px!important;box-sizing:border-box!important;background:#1f2937!important;z-index:2!important}.dq-native-top{top:0!important;border-bottom:1px solid #374151!important}.dq-native-bottom{bottom:0!important;justify-content:flex-end!important;border-top:1px solid #374151!important}
#dq-native-editor{position:absolute!important;inset:48px 0!important;width:100%!important;height:auto!important;margin:0!important;border:0!important;border-radius:0!important;outline:none!important;resize:none!important;box-sizing:border-box!important;padding:14px!important;background:#111318!important;color:#f8fafc!important;caret-color:#fff!important;font:16px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;white-space:pre!important;overflow:auto!important;tab-size:2!important;-webkit-user-select:text!important;user-select:text!important}[data-action=run]{background:#0f766e!important}[data-action=submit]{background:#2563eb!important}
#dq-mobile-toast{position:fixed!important;left:50%!important;top:max(8px,env(safe-area-inset-top))!important;transform:translateX(-50%)!important;max-width:min(92vw,520px)!important;z-index:2147483646!important;padding:9px 14px!important;border-radius:10px!important;background:#111827f5!important;color:#e2e8f0!important;font:600 12px/1.3 system-ui,sans-serif!important;box-shadow:0 4px 18px #0008!important;text-align:center!important}#dq-mobile-toast[data-error=true]{color:#fca5a5!important}#dq-mobile-toast[hidden]{display:none!important}`;document.head.appendChild(s);
  };
  const viewport=()=>document.documentElement.style.setProperty('--dq-vv-height',`${Math.round(window.visualViewport?.height||innerHeight)}px`);
  const boot=()=>{styles();mount();viewport();const routeChanged=state.route!==key();if(routeChanged){state.route=key();state.initialized='';}mark();if(document.body&&!document.body.dataset.dqMobileMode)mode(state.mode);else if(routeChanged&&state.mode==='code')initialize();const resume=[...document.querySelectorAll('button,a')].find(e=>!own(e)&&/continue here/i.test(label(e)));if(resume&&!resume.dataset.dqAutoClicked){resume.dataset.dqAutoClicked='1';resume.click();}};
  new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});addEventListener('resize',viewport,{passive:true});window.visualViewport?.addEventListener('resize',viewport,{passive:true});window.visualViewport?.addEventListener('scroll',viewport,{passive:true});boot();console.info(`[DQ Mobile] ${VERSION} ready`);
})();
