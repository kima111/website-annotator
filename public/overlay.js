// /public/overlay.js

// Lazy-load html2canvas for snapshots (resolve to null on failure so UI never hangs)
const h2cPromise = new Promise((resolve) => {
  if (window.html2canvas) return resolve(window.html2canvas);
  const s = document.createElement('script');
  s.src = '/html2canvas.min.js';
  s.onload = () => resolve(window.html2canvas);
  s.onerror = () => resolve(null);
  (document.head || document.documentElement).appendChild(s);
});

// App state (URL + optional forwarded project id are injected by the proxy)
const state = {
  active: true,
  pins: [],
  panelOpen: true,
  url: (window.__ANNOTATOR__ && window.__ANNOTATOR__.url) || location.href,
  projectId: null,
  forwardedProject: (window.__ANNOTATOR__ && window.__ANNOTATOR__.project) || null,
};

// Create an overlay root that doesn’t interfere with page clicks
const host = document.createElement('div');
host.style.all = 'initial';
host.style.position = 'fixed';
host.style.inset = '0';
host.style.zIndex = '2147483647';
host.style.pointerEvents = 'none';
document.documentElement.appendChild(host);
const root = host.attachShadow({ mode: 'open' });

// Reposition pins on scroll/resize
window.addEventListener('scroll', () => refresh(), { passive: true });
window.addEventListener('resize', () => refresh(), { passive: true });

// UI (toolbar + panel live inside a shadow root)
root.innerHTML = `
  <style>
    :host{ all:initial }
    .bar{
      position:fixed; top:12px; left:50%; transform:translateX(-50%);
      background:#0b0b0b; color:#fff; border:1px solid #333; border-radius:999px;
      padding:6px 10px; font: 600 12px/1.2 system-ui; display:flex; gap:8px; align-items:center;
      pointer-events:auto; z-index:10
    }
    .btn{ background:#0ea5e9; color:#000; border:none; border-radius:999px; padding:6px 10px; font-weight:700; cursor:pointer }
    .ghost{ background:#1a1a1a; color:#ddd; border:1px solid #333 }
    #pins{ position:fixed; inset:0; pointer-events:none }
    .pin{
      position:absolute; transform:translate(-50%,-100%); background:#0ea5e9; color:#000;
      width:26px; height:26px; border-radius:999px; display:flex; align-items:center; justify-content:center;
      font: 700 12px/1 system-ui; box-shadow:0 4px 14px rgba(0,0,0,.4); pointer-events:auto; cursor:pointer
    }
    .panel{
      position:fixed; right:12px; top:60px; width:320px; max-height:80vh; overflow:auto; background:#0b0b0b;
      color:#fff; border:1px solid #333; border-radius:12px; padding:10px; pointer-events:auto
    }
    .row{ border-bottom:1px solid #222; padding:8px 4px }
    .row:last-child{ border-bottom:none }
    .status{ font-size:11px; color:#8b8b8b }
    .link{ color:#7dd3fc; text-decoration:none }
    .input{ width:100%; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:6px; margin-top:6px }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; word-break: break-all }
  </style>
  <div class="bar">
    <span>Annotator</span>
    <button class="btn" id="addpin">Drop Pin</button>
    <button class="btn ghost" id="togglepanel">Panel</button>
    <a class="link" href="/" target="_top">Exit</a>
  </div>
  <div id="pins"></div>
  <div class="panel" id="panel"></div>
`;

// Remove any fallback boot pill the proxy might have shown
try { const fb = document.getElementById('__annotator_boot_pill'); if (fb) fb.remove(); } catch {}

// Mark ready as soon as the bar is attached (proxy stops reinjecting)
window.__ANNOTATOR_READY__ = true;
window.__ANNOTATOR_STATE__ = state; // handy for debugging in console

const $pins  = root.getElementById('pins');
const $panel = root.getElementById('panel');

// ---------- helpers ----------
function cssEscape(s){return (s||'').replace(/([!"#$%&'()*+,./:;<=>?@\[\]^`{|}~ ])/g,'\\$1');}
function escapeHtml(s){
  return (s ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}
function querySelectorDeep(sel){ try { return document.querySelector(sel); } catch { return null } }

// Extract a readable filename even through /asset?url=...
function parseProxiedAssetFilename(src){
  try{
    if (!src) return '';
    const u = new URL(src, location.origin);
    if (u.pathname === '/asset' && u.searchParams.get('url')) {
      const inner = new URL(u.searchParams.get('url'));
      const file = inner.pathname.split('/').pop() || '';
      return file.split('?')[0];
    }
    const file = u.pathname.split('/').pop() || '';
    return file.split('?')[0];
  }catch{ return '' }
}

// Human-friendly label for a pin target
function humanLabel(p){
  const el = querySelectorDeep(p.selector);
  if (!el) return p.selector; // fallback to raw if not found
  if (el.tagName === 'IMG') {
    const alt = el.getAttribute('alt');
    if (alt) return `Image: ${alt}`;
    const src = el.getAttribute('src') || '';
    const file = parseProxiedAssetFilename(src);
    return `Image: ${file || 'img'}`;
  }
  const aria = el.getAttribute('aria-label') || el.getAttribute('name');
  if (aria) return `${el.tagName}: ${aria}`;
  const txt = (el.innerText || '').trim().replace(/\s+/g,' ').slice(0,60);
  if (txt) return `${el.tagName}: “${txt}${(el.innerText||'').length>60?'…':''}”`;
  return el.tagName.toLowerCase();
}

function toast(msg){
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
    'background:#111;color:#fff;border:1px solid #333;border-radius:10px;padding:8px 12px;' +
    'font:600 12px system-ui;z-index:2147483647;pointer-events:auto';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}

function showAuthBanner(){
  if(root.getElementById('authwarn')) return;
  const d = document.createElement('div');
  d.id = 'authwarn';
  d.style.cssText = 'position:fixed;top:56px;left:50%;transform:translateX(-50%);background:#7c2d12;color:#fff;border:1px solid #b45309;border-radius:10px;padding:6px 10px;font:600 12px system-ui;z-index:2147483647;pointer-events:auto';
  // Build a next param that points back to the top-level /annotate/view page
  let href = '/login';
  try {
    const topLoc = window.top && window.top.location;
    if (topLoc) {
      const next = encodeURIComponent((topLoc.pathname || '/') + (topLoc.search || ''));
      href = `/login?next=${next}`;
    }
  } catch {}
  d.innerHTML = `Please <a href="${href}" target="_top" style="color:#7dd3fc">log in</a> to load and save annotations.`;
  root.appendChild(d);
}

// ---------- network helpers ----------
const API_HEADERS = { accept: 'application/json', 'x-annotator': '1' };
const API_JSON_HEADERS = { ...API_HEADERS, 'content-type': 'application/json' };

// small helper: try to JSON-parse only if the response is JSON
async function safeJson(res){
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

let ensureInFlight = null;

async function ensureProject(){
  if (state.projectId) return state.projectId;
  if (ensureInFlight) return ensureInFlight;

  const forwarded = state.forwardedProject;
  const endpoint = forwarded
    ? `/api/projects/ensure?project=${encodeURIComponent(forwarded)}`
    : `/api/projects/ensure?url=${encodeURIComponent(state.url)}`;

  ensureInFlight = (async () => {
    try{
      const params = new URLSearchParams();
      params.set('url', state.url);
      if (state.forwardedProject) {
        params.set('project', state.forwardedProject);
      }
      const res = await fetch(`/api/projects/ensure?${params.toString()}`, {
        method: 'GET',
        headers: API_HEADERS,
        cache: 'no-store',
        credentials: 'include', // ensure auth cookies are sent
      });
      if (res.status === 401) { showAuthBanner(); return null; }
      const js = await safeJson(res).catch(()=>null);
      if (!res.ok) { toast(js?.error || `Project ensure failed (${res.status})`); return null; }
      state.projectId = js?.project?.id || null;
      return state.projectId;
    } catch {
      toast('Project ensure error');
      return null;
    } finally {
      setTimeout(() => { ensureInFlight = null; }, 0);
    }
  })();

  return ensureInFlight;
}

async function loadPins(){
  if (!state.projectId) {
    await ensureProject();
    if (!state.projectId) return;
  }
  try{
    const { projectId, url } = state;
    const res = await fetch(`/api/comments?project_id=${encodeURIComponent(projectId)}&url=${encodeURIComponent(url)}`, {
      headers: API_HEADERS,
      cache: 'no-store',
      credentials: 'include', // ensure auth cookies are sent
    });
    if(res.status===401){ showAuthBanner(); return; }
    if(res.status===403){ toast('No permission to view pins for this project.'); return; }
    const js = await safeJson(res).catch(()=>null);
    if(!res.ok){ toast(js?.error || `Failed to load pins (${res.status})`); return; }

    const rows = js?.data || [];
    state.pins = rows.map(r => ({
      id: r.id, selector: r.selector, x: r.x, y: r.y, bbox: r.bbox,
      comment: r.comment, status: r.status, image: r.image,
      ts: new Date(r.created_at).getTime(), url: r.url
    }));
    refresh();
  } catch { toast('Load pins error'); }
}

async function savePin(pin){
  try {
    if(!state.projectId){
      await ensureProject();
      if(!state.projectId){ showAuthBanner(); toast('Can’t save yet — log in or try again.'); return false; }
    }
    const payload = { ...pin, project_id: state.projectId, url: state.url };
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: API_JSON_HEADERS,
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'include', // ensure auth cookies are sent
    });
    if(res.status===401){ showAuthBanner(); return false; }
    if(res.status===403){
      const j = await safeJson(res).catch(()=>null);
      toast(j?.error || 'No permission to save on this project.');
      return false;
    }
    if(!res.ok){
      const j = await safeJson(res).catch(()=>null);
      toast(j?.error || `Save failed (${res.status})`);
      return false;
    }
    await loadPins();
    return true;
  } catch { toast('Save error'); return false; }
}

async function removePin(id){
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: API_HEADERS,
      cache: 'no-store',
      credentials: 'include', // ensure auth cookies are sent
    });
    if(res.status===401){ showAuthBanner(); return false; }
    if(res.status===403){
      const j = await safeJson(res).catch(()=>null);
      toast(j?.error || 'No permission to delete pin.');
      return false;
    }
    if(!res.ok){
      const j = await safeJson(res).catch(()=>null);
      toast(j?.error || `Delete failed (${res.status})`);
      return false;
    }
    await loadPins();
    return true;
  } catch { toast('Delete error'); return false; }
}

// ---------- selector builder ----------
function buildSelector(el){
  let node = el, depth = 0, parts = [];
  while (node && node.nodeType === 1 && depth < 8) {
    if (node.id) { parts.unshift(`#${cssEscape(node.id)}`); break; }
    let part = node.nodeName.toLowerCase();
    const cls = (node.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0,2);
    if (cls.length) part += '.' + cls.map(cssEscape).join('.');
    const siblings = Array.from(node.parentNode?.children || []).filter(n => n.nodeName === node.nodeName);
    const idx = siblings.indexOf(node) + 1; if (idx > 1) part += `:nth-of-type(${idx})`;
    parts.unshift(part);
    node = node.parentElement; depth++;
  }
  return parts.join(' > ');
}

// ---------- UI behaviors ----------
function refresh(){
  // Pins
  $pins.innerHTML = '';
  state.pins.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'pin';
    // Recompute visual coordinates from element rect + stored offset
    let vx, vy;
    const el = querySelectorDeep(p.selector);
    if (el && p.bbox && typeof p.bbox.ox === 'number' && typeof p.bbox.oy === 'number') {
      const r = el.getBoundingClientRect();
      vx = r.left + p.bbox.ox;
      vy = r.top + p.bbox.oy;
    } else {
      // Fallback to absolute doc coords minus current scroll
      vx = (p.x ?? 0) - window.scrollX;
      vy = (p.y ?? 0) - window.scrollY;
    }
    d.style.left = vx + 'px';
    d.style.top  = vy + 'px';
    d.textContent = String(i + 1);
    d.title = p.selector;
    d.addEventListener('click', () => focusRow(p.id));
    $pins.appendChild(d);
  });

  // Panel: human label + raw selector below it
  $panel.innerHTML = state.pins.map((p,i)=> `
    <div class="row">
      <div><b>#${i+1}</b> ${escapeHtml(humanLabel(p))}</div>
      <div class="status">${escapeHtml(p.status || 'open')} · ${(new Date(p.ts)).toLocaleString()}</div>
      <textarea class="input" data-id="${p.id}" placeholder="Notes / change request">${p.comment||''}</textarea>
      <div style="display:flex; gap:6px; margin-top:6px">
        <button class="btn ghost" data-act="snap" data-id="${p.id}">Snapshot</button>
        <button class="btn" data-act="save" data-id="${p.id}">Save</button>
        <button class="btn ghost" data-act="resolve" data-id="${p.id}">Resolve</button>
        <button class="btn ghost" data-act="delete" data-id="${p.id}">Delete</button>
      </div>
      ${p.image ? `<div style="margin-top:6px"><img src="${p.image}" style="max-width:100%"></div>` : ''}
    </div>`).join('');

  $panel.style.display = state.panelOpen ? 'block' : 'none';

  // wire inputs
  $panel.querySelectorAll('textarea').forEach(el=>{
    el.addEventListener('change', ()=>{
      const id = el.getAttribute('data-id');
      const pin = state.pins.find(p=>p.id===id);
      if(pin) pin.comment = el.value;
    });
  });
  $panel.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id  = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      const pin = state.pins.find(p=>p.id===id);
      if(!pin) return;
      if(act==='save')    await savePin(pin);
      if(act==='resolve'){ pin.status = 'resolved'; await savePin(pin); refresh(); }
      if(act==='delete'){ await removePin(id); state.pins = state.pins.filter(p=>p.id!==id); refresh(); }
      if(act==='snap'){
        const html2canvas = await h2cPromise;
        if(html2canvas){
          const el = querySelectorDeep(pin.selector);
          const tgt = el || document.body;
          const canv = await html2canvas(tgt, { backgroundColor: null, scale: 1 });
          pin.image = canv.toDataURL('image/png');
          await savePin(pin);
          refresh();
        } else {
          toast('Snapshot module failed to load.');
        }
      }
    });
  });
}

function focusRow(id){
  const el = $panel.querySelector(`textarea[data-id="${id}"]`);
  if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.focus(); }
}

// Drop Pin flow: capture next document click and create a pin
root.getElementById('addpin').addEventListener('click', ()=>{
  // let page receive the click to pick an element under the cursor
  host.style.pointerEvents = 'none';
  const on = (ev)=>{
    ev.preventDefault();
    const { clientX:x, clientY:y } = ev;
    const el = document.elementFromPoint(x,y);
    if(!el) return cancel();
    const sel = buildSelector(el);
    const rect = el.getBoundingClientRect();
    const docX = x + window.scrollX;
    const docY = y + window.scrollY;
    const ox = docX - (rect.left + window.scrollX);
    const oy = docY - (rect.top  + window.scrollY);
    const bbox = { x: rect.x, y: rect.y, w: rect.width, h: rect.height, ox, oy };
    const id = (window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    const pin = { id, selector: sel, x: docX, y: docY, bbox, comment:'', status:'open', ts:Date.now(), url: state.url };
    state.pins.push(pin);
    refresh();
    document.removeEventListener('click', on, true);
    host.style.pointerEvents = 'auto'; // allow toolbar/panel clicks
  };
  const cancel = ()=>{
    document.removeEventListener('click', on, true);
    host.style.pointerEvents = 'auto'; // allow toolbar/panel clicks
  }
  document.addEventListener('click', on, true);
});

root.getElementById('togglepanel').addEventListener('click', ()=>{
  state.panelOpen = !state.panelOpen;
  $panel.style.display = state.panelOpen ? 'block' : 'none';
});

// ---------- boot ----------
(function init(){
  ensureProject().then(()=>{
    loadPins();
    refresh();
  });
})();
