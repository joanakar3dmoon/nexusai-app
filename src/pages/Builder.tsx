import React, { useState, useEffect, useRef } from "react";
import { BrainCircuit, Send, Loader2, Download, Code2, Smartphone, Monitor, Check, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dbSaveApp, supabaseAdmin } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

// ── Credenciales ─────────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY || "";
const ADMOB_PUB = "ca-pub-4903263409458961";
const ADMOB_BAN = "8825147276";
const ADMOB_INT = "4622591073";
const AMZ_TAG   = "r3dm01-21";

// ── Llamada a Groq ───────────────────────────────────────────
async function callGroq(system: string, user: string, tokens = 8192): Promise<string> {
  // llama-4-scout rápido primero, luego llama-3.3-70b, luego llama-3.1-8b
  const models = ["llama-3.3-70b-versatile", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  for (const model of models) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          max_tokens: tokens,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.warn(`[${model}] ${r.status}:`, t.slice(0, 100));
        continue;
      }
      const d = await r.json();
      let content = d.choices?.[0]?.message?.content ?? "";
      // Eliminar bloques <think>...</think>
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (content.length > 50) return content;
    } catch (e) {
      console.warn(`[${model}] timeout/error:`, e);
    }
  }
  throw new Error("Todos los modelos fallaron");
}

// ── Extrae HTML limpio ───────────────────────────────────────
function extractHTML(raw: string): string {
  // Buscar bloque ```html ... ```
  const fenced = raw.match(/```html\s*\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();

  // Buscar desde <!DOCTYPE hasta </html>
  const doctype = raw.match(/<!DOCTYPE\s+html[\s\S]*/i);
  if (doctype) {
    const block = doctype[0];
    const end = block.toLowerCase().lastIndexOf("</html>");
    return end >= 0 ? block.slice(0, end + 7) : block;
  }

  // Buscar desde <html hasta </html>
  const htmlTag = raw.match(/<html[\s\S]*/i);
  if (htmlTag) {
    const block = htmlTag[0];
    const end = block.toLowerCase().lastIndexOf("</html>");
    return end >= 0 ? block.slice(0, end + 7) : block;
  }

  // Quitar cualquier fence restante
  return raw.replace(/^```\w*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

// ── Inyectar monetización ────────────────────────────────────
function injectAds(html: string): string {
  // Banner AdMob visual en el footer
  const banner = `
  <!-- AdMob Banner -->
  <div id="admob-banner" style="position:fixed;bottom:64px;left:0;right:0;height:50px;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;font-size:11px;color:#888;border-top:1px solid rgba(255,255,255,0.05);z-index:8000;">
    <ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="${ADMOB_PUB}" data-ad-slot="${ADMOB_BAN}"></ins>
  </div>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_PUB}" crossorigin="anonymous"></script>
  <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`;

  // Chat IA flotante
  const chat = `
  <!-- Chat IA NexusAI -->
  <button id="chat-fab" title="Chat IA" style="position:fixed;bottom:124px;right:16px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;font-size:22px;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;">🤖</button>
  <div id="chat-panel" style="display:none;position:fixed;bottom:186px;right:12px;width:300px;max-width:92vw;height:380px;background:#111128;border:1px solid rgba(124,58,237,0.35);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:9001;flex-direction:column;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:10px 14px;color:white;font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
      <span>🤖 NexusAI Chat</span><button id="chat-close" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">✕</button>
    </div>
    <div id="chat-msgs" style="flex:1;overflow-y:auto;padding:10px;font-size:12px;color:#ccc;display:flex;flex-direction:column;gap:8px;"></div>
    <div style="padding:8px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:6px;">
      <input id="chat-input" placeholder="Pregunta algo..." style="flex:1;background:#0a0a0f;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 10px;color:white;font-size:12px;outline:none;">
      <button id="chat-send" style="background:#7c3aed;border:none;color:white;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:14px;">➤</button>
    </div>
  </div>
  <script>
  (function(){
    const fab=document.getElementById('chat-fab');
    const panel=document.getElementById('chat-panel');
    const close=document.getElementById('chat-close');
    const input=document.getElementById('chat-input');
    const send=document.getElementById('chat-send');
    const msgs=document.getElementById('chat-msgs');
    let open=false;
    function toggle(){open=!open;panel.style.display=open?'flex':'none';}
    fab.addEventListener('click',toggle);
    close.addEventListener('click',toggle);
    function addMsg(txt,isUser){
      const d=document.createElement('div');
      d.style.cssText='padding:7px 10px;border-radius:8px;max-width:85%;font-size:12px;line-height:1.4;'+(isUser?'background:#7c3aed;color:white;align-self:flex-end;':'background:#1a1a3e;color:#ddd;align-self:flex-start;');
      d.textContent=txt;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
    }
    async function doSend(){
      const q=input.value.trim();if(!q)return;
      input.value='';addMsg(q,true);
      addMsg('...pensando',false);
      try{
        const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ' + GROQ_KEY},
          body:JSON.stringify({model: "llama-3.1-8b-instant",messages:[{role:'system',content:'Asistente de app. Responde corto en español.'},{role:'user',content:q}],max_tokens:200}),
          signal:AbortSignal.timeout(15000)
        });
        const d=await r.json();
        msgs.lastChild.textContent=d.choices?.[0]?.message?.content||'Sin respuesta';
      }catch(e){msgs.lastChild.textContent='Error de conexión';}
    }
    send.addEventListener('click',doSend);
    input.addEventListener('keydown',e=>{if(e.key==='Enter')doSend();});
  })();
  </script>`;

  // Amazon afiliados
  const amazon = `<script>
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href*="amazon"]');
    if(a){const u=new URL(a.href);u.searchParams.set('tag','${AMZ_TAG}');a.href=u.href;}
  });
  </script>`;

  // Insertar antes de </body>
  return html.replace(/<\/body>/i, `${banner}${chat}${amazon}</body>`);
}

// ── Generador local por categoría ────────────────────────────
function localApp(name: string, prompt: string): string {
  const p = prompt.toLowerCase();
  const color = "#7c3aed";

  const categories: {[k:string]: ()=>string} = {
    tareas: () => taskApp(name, color),
    recetas: () => recipeApp(name, color),
    tienda: () => shopApp(name, color),
    gimnasio: () => gymApp(name, color),
    finanzas: () => financeApp(name, color),
    musica: () => musicApp(name, color),
    notas: () => taskApp(name, color),
    default: () => taskApp(name, color),
  };

  const key = p.includes("tarea") || p.includes("todo") || p.includes("productividad") ? "tareas"
    : p.includes("receta") || p.includes("cocina") || p.includes("comida") || p.includes("ingrediente") ? "recetas"
    : p.includes("tienda") || p.includes("shop") || p.includes("ropa") || p.includes("product") || p.includes("carrito") ? "tienda"
    : p.includes("gimnasio") || p.includes("ejercicio") || p.includes("entrena") || p.includes("fitness") || p.includes("rutina") || p.includes("workout") || p.includes("gym") ? "gimnasio"
    : p.includes("finanza") || p.includes("gasto") || p.includes("presupuesto") || p.includes("dinero") || p.includes("ahorro") || p.includes("finance") || p.includes("budget") ? "finanzas"
    : p.includes("música") || p.includes("musica") || p.includes("cancion") || p.includes("playlist") || p.includes("artista") || p.includes("music") ? "musica"
    : p.includes("nota") || p.includes("apunte") || p.includes("diario") || p.includes("note") ? "notas"
    : "default";

  return categories[key]();
}

function taskApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;--sub:#888;}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',system-ui,sans-serif;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:130px;}
header{background:var(--card);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.07);}
header h1{font-size:1.2rem;font-weight:700;color:var(--accent);}
.section{display:none;padding:16px;}
.section.active{display:block;}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
.stat-card{background:var(--card);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.07);}
.stat-card h3{font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;}
.stat-card .num{font-size:1.8rem;font-weight:700;color:var(--accent);margin-top:4px;}
.task-item{background:var(--card);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.06);transition:all .2s;}
.task-item:hover{border-color:var(--accent);transform:translateX(2px);}
.task-item.done{opacity:.5;}
.task-item.done .task-name{text-decoration:line-through;}
.task-check{width:20px;height:20px;border-radius:50%;border:2px solid var(--accent);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s;}
.task-check.checked{background:var(--accent);}
.task-name{flex:1;font-size:.9rem;}
.task-cat{font-size:.7rem;background:rgba(124,58,237,.2);color:var(--accent);padding:2px 7px;border-radius:20px;}
.task-del{background:none;border:none;color:#ef4444;cursor:pointer;font-size:1.1rem;padding:0 4px;}
.badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:.7rem;font-weight:600;}
.badge-alta{background:rgba(239,68,68,.2);color:#ef4444;}
.badge-media{background:rgba(234,179,8,.2);color:#eab308;}
.badge-baja{background:rgba(34,197,94,.2);color:#22c55e;}
input,select,textarea{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:11px 13px;color:white;font-size:.9rem;margin-bottom:10px;outline:none;transition:border .2s;}
input:focus,select:focus,textarea:focus{border-color:var(--accent);}
select option{background:#111128;}
.btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:10px;color:white;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .2s;}
.btn:hover{opacity:.85;}
.btn-outline{background:transparent;border:1px solid var(--accent);color:var(--accent);}
.search{position:relative;margin-bottom:12px;}
.search input{padding-left:36px;}
.search::before{content:'🔍';position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:.9rem;}
.filter-bar{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px;}
.filter-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:5px 12px;color:var(--sub);font-size:.8rem;cursor:pointer;white-space:nowrap;transition:all .2s;}
.filter-btn.active{background:var(--accent);border-color:var(--accent);color:white;}
.empty{text-align:center;padding:40px 20px;color:var(--sub);}
.empty p{font-size:2rem;margin-bottom:8px;}
.profile-card{background:var(--card);border-radius:14px;padding:20px;margin-bottom:12px;text-align:center;border:1px solid rgba(255,255,255,0.07);}
.avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#4f46e5);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 12px;}
.setting-row{background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.06);}
.nav{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid rgba(255,255,255,0.08);display:flex;padding:6px 0;z-index:100;}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:none;border:none;color:var(--sub);cursor:pointer;font-size:.65rem;transition:color .2s;}
.nav-btn .icon{font-size:1.3rem;}
.nav-btn.active{color:var(--accent);}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-60px);background:#22c55e;color:white;padding:10px 20px;border-radius:10px;font-size:.85rem;font-weight:500;z-index:9999;transition:transform .3s;}
.toast.show{transform:translateX(-50%) translateY(0);}
</style>
</head>
<body>

<header>
  <h1>✅ ${name}</h1>
  <span id="hdr-count" style="background:rgba(124,58,237,.2);color:var(--accent);padding:4px 10px;border-radius:20px;font-size:.8rem;font-weight:600;"></span>
</header>

<!-- INICIO -->
<div class="section active" id="sec-home">
  <div class="stats">
    <div class="stat-card"><h3>Total</h3><div class="num" id="st-total">0</div></div>
    <div class="stat-card"><h3>Completadas</h3><div class="num" id="st-done">0</div></div>
    <div class="stat-card"><h3>Alta prioridad</h3><div class="num" id="st-high">0</div></div>
    <div class="stat-card"><h3>Pendientes</h3><div class="num" id="st-pend">0</div></div>
  </div>
  <h2 style="font-size:.95rem;margin-bottom:10px;color:var(--sub);">Recientes</h2>
  <div id="recent-list"></div>
</div>

<!-- TAREAS -->
<div class="section" id="sec-tasks">
  <div class="search"><input id="search-input" type="text" placeholder="Buscar tarea..."></div>
  <div class="filter-bar">
    <button class="filter-btn active" data-filter="all">Todas</button>
    <button class="filter-btn" data-filter="trabajo">Trabajo</button>
    <button class="filter-btn" data-filter="personal">Personal</button>
    <button class="filter-btn" data-filter="salud">Salud</button>
    <button class="filter-btn" data-filter="hogar">Hogar</button>
  </div>
  <div id="task-list"></div>
</div>

<!-- AÑADIR -->
<div class="section" id="sec-add">
  <h2 style="font-size:1rem;font-weight:600;margin-bottom:14px;">Nueva tarea</h2>
  <input id="new-name" type="text" placeholder="Nombre de la tarea *">
  <textarea id="new-desc" rows="2" placeholder="Descripción (opcional)" style="resize:none;"></textarea>
  <select id="new-cat">
    <option value="trabajo">💼 Trabajo</option>
    <option value="personal">👤 Personal</option>
    <option value="salud">❤️ Salud</option>
    <option value="hogar">🏠 Hogar</option>
  </select>
  <select id="new-pri">
    <option value="alta">🔴 Alta prioridad</option>
    <option value="media">🟡 Media prioridad</option>
    <option value="baja">🟢 Baja prioridad</option>
  </select>
  <input id="new-date" type="date">
  <button class="btn" id="add-btn">✅ Añadir tarea</button>
</div>

<!-- PERFIL -->
<div class="section" id="sec-profile">
  <div class="profile-card">
    <div class="avatar">👤</div>
    <h2 id="prof-name" style="font-size:1.1rem;font-weight:700;">Usuario NexusAI</h2>
    <p style="color:var(--sub);font-size:.85rem;margin-top:4px;">Productividad máxima</p>
  </div>
  <div class="setting-row">
    <span>🌙 Tema oscuro</span><span style="color:#22c55e;font-size:.85rem;">Activo</span>
  </div>
  <div class="setting-row" id="notif-row" style="cursor:pointer;">
    <span>🔔 Notificaciones</span><span id="notif-val" style="font-size:.85rem;">Activadas</span>
  </div>
  <div class="setting-row">
    <span>📊 Total tareas creadas</span><span id="prof-total" style="color:var(--accent);font-weight:600;">0</span>
  </div>
  <div class="setting-row">
    <span>✅ Completadas hoy</span><span id="prof-today" style="color:var(--accent);font-weight:600;">0</span>
  </div>
  <button class="btn btn-outline" id="clear-btn" style="margin-top:12px;">🗑️ Borrar todas las tareas</button>
</div>

<!-- Nav -->
<nav class="nav">
  <button class="nav-btn active" data-sec="home"><span class="icon">🏠</span>Inicio</button>
  <button class="nav-btn" data-sec="tasks"><span class="icon">📋</span>Tareas</button>
  <button class="nav-btn" data-sec="add"><span class="icon">➕</span>Añadir</button>
  <button class="nav-btn" data-sec="profile"><span class="icon">👤</span>Perfil</button>
</nav>

<div class="toast" id="toast"></div>

<script>
// ── Estado ─────────────────────────────────────────────────
const STORE_KEY = 'nexusai_tasks_v2';
let tasks = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || [
  {id:'1',name:'Revisar emails del trabajo',cat:'trabajo',pri:'alta',done:false,desc:'Responder pendientes',date:'2026-07-15'},
  {id:'2',name:'Ir al gimnasio',cat:'salud',pri:'media',done:false,desc:'Cardio 30min + pesas',date:'2026-07-15'},
  {id:'3',name:'Comprar ingredientes cena',cat:'hogar',pri:'baja',done:true,desc:'Pollo, verduras, arroz',date:'2026-07-14'},
  {id:'4',name:'Llamar al médico',cat:'salud',pri:'alta',done:false,desc:'Pedir cita revisión anual',date:'2026-07-16'},
  {id:'5',name:'Preparar presentación',cat:'trabajo',pri:'alta',done:false,desc:'Slides reunión del viernes',date:'2026-07-17'},
  {id:'6',name:'Leer capítulo del libro',cat:'personal',pri:'baja',done:true,desc:'El Quijote cap. 12',date:'2026-07-13'},
  {id:'7',name:'Pagar factura luz',cat:'hogar',pri:'media',done:false,desc:'Vence el día 20',date:'2026-07-20'},
  {id:'8',name:'Meditar 15 minutos',cat:'salud',pri:'baja',done:false,desc:'Antes de dormir',date:'2026-07-15'},
  {id:'9',name:'Actualizar CV',cat:'trabajo',pri:'media',done:false,desc:'Añadir últimos proyectos',date:'2026-07-18'},
  {id:'10',name:'Llamar a mamá',cat:'personal',pri:'alta',done:false,desc:'Cumpleaños próximo',date:'2026-07-15'},
];
let notifs = true, currentFilter = 'all', currentSec = 'home';

function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }

function uuid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ── Navegación ─────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec = btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentSec = sec;
    if(sec==='tasks') renderTasks();
    if(sec==='home') renderHome();
    if(sec==='profile') renderProfile();
  });
});

// ── Stats ──────────────────────────────────────────────────
function getStats(){
  const total=tasks.length;
  const done=tasks.filter(t=>t.done).length;
  const high=tasks.filter(t=>t.pri==='alta'&&!t.done).length;
  return {total,done,high,pend:total-done};
}

// ── Home ───────────────────────────────────────────────────
function renderHome(){
  const s=getStats();
  document.getElementById('st-total').textContent=s.total;
  document.getElementById('st-done').textContent=s.done;
  document.getElementById('st-high').textContent=s.high;
  document.getElementById('st-pend').textContent=s.pend;
  document.getElementById('hdr-count').textContent=s.pend+' pendientes';
  const rec=document.getElementById('recent-list');
  const recent=[...tasks].filter(t=>!t.done).slice(0,4);
  if(!recent.length){rec.innerHTML='<div class="empty"><p>🎉</p><span>¡Sin pendientes!</span></div>';return;}
  rec.innerHTML=recent.map(t=>taskHTML(t)).join('');
  attachTaskEvents(rec);
}

// ── Tareas ─────────────────────────────────────────────────
function taskHTML(t){
  const priBadge=t.pri==='alta'?'<span class="badge badge-alta">Alta</span>':t.pri==='media'?'<span class="badge badge-media">Media</span>':'<span class="badge badge-baja">Baja</span>';
  return \`<div class="task-item \${t.done?'done':''}" data-id="\${t.id}">
    <div class="task-check \${t.done?'checked':''}" data-toggle="\${t.id}">\${t.done?'✓':''}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="task-name">\${t.name}</span>\${priBadge}
      </div>
      \${t.date?'<div style="font-size:.72rem;color:#666;margin-top:2px;">📅 '+t.date+'</div>':''}
    </div>
    <span class="task-cat">\${t.cat}</span>
    <button class="task-del" data-del="\${t.id}">🗑</button>
  </div>\`;
}

function attachTaskEvents(container){
  container.querySelectorAll('[data-toggle]').forEach(el=>{
    el.addEventListener('click',()=>{ toggleTask(el.dataset.toggle); });
  });
  container.querySelectorAll('[data-del]').forEach(el=>{
    el.addEventListener('click',()=>{ deleteTask(el.dataset.del); });
  });
}

function renderTasks(){
  const q=document.getElementById('search-input')?.value?.toLowerCase()||'';
  let list=tasks;
  if(currentFilter!=='all') list=list.filter(t=>t.cat===currentFilter);
  if(q) list=list.filter(t=>t.name.toLowerCase().includes(q)||t.desc?.toLowerCase().includes(q));
  const el=document.getElementById('task-list');
  if(!list.length){el.innerHTML='<div class="empty"><p>🔍</p><span>Sin resultados</span></div>';return;}
  el.innerHTML=list.map(t=>taskHTML(t)).join('');
  attachTaskEvents(el);
}

function toggleTask(id){
  const t=tasks.find(t=>t.id===id);
  if(!t)return;
  t.done=!t.done; save();
  toast(t.done?'✅ Completada':'↩️ Reabierta');
  if(currentSec==='tasks') renderTasks();
  else renderHome();
}

function deleteTask(id){
  tasks=tasks.filter(t=>t.id!==id); save();
  toast('🗑️ Eliminada');
  if(currentSec==='tasks') renderTasks();
  else renderHome();
}

// ── Añadir ─────────────────────────────────────────────────
document.getElementById('add-btn').addEventListener('click',()=>{
  const name=document.getElementById('new-name').value.trim();
  if(!name){ document.getElementById('new-name').style.borderColor='#ef4444'; return; }
  document.getElementById('new-name').style.borderColor='';
  tasks.unshift({
    id:uuid(),
    name,
    desc:document.getElementById('new-desc').value.trim(),
    cat:document.getElementById('new-cat').value,
    pri:document.getElementById('new-pri').value,
    date:document.getElementById('new-date').value,
    done:false,
  });
  save();
  document.getElementById('new-name').value='';
  document.getElementById('new-desc').value='';
  toast('✅ Tarea añadida');
  // Ir a tareas
  document.querySelector('[data-sec="tasks"]').click();
});

// ── Filtros ────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter=btn.dataset.filter;
    renderTasks();
  });
});
document.getElementById('search-input')?.addEventListener('input',()=>renderTasks());

// ── Perfil ─────────────────────────────────────────────────
function renderProfile(){
  const s=getStats();
  document.getElementById('prof-total').textContent=s.total;
  document.getElementById('prof-today').textContent=s.done;
  document.getElementById('notif-val').textContent=notifs?'Activadas':'Desactivadas';
}
document.getElementById('notif-row').addEventListener('click',()=>{
  notifs=!notifs; renderProfile(); toast(notifs?'🔔 Notificaciones ON':'🔕 Notificaciones OFF');
});
document.getElementById('clear-btn').addEventListener('click',()=>{
  if(confirm('¿Borrar todas las tareas?')){ tasks=[]; save(); renderHome(); toast('🗑️ Borradas'); }
});

// ── Init ───────────────────────────────────────────────────
renderHome();
</script>
</body>
</html>`;
}

function recipeApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;--sub:#888;}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',system-ui,sans-serif;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:130px;}
header{background:var(--card);padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);}
header h1{font-size:1.2rem;font-weight:700;color:var(--accent);}
.section{display:none;padding:16px;}
.section.active{display:block;}
.recipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.recipe-card{background:var(--card);border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,0.06);transition:transform .2s,border-color .2s;}
.recipe-card:hover{transform:translateY(-2px);border-color:var(--accent);}
.recipe-emoji{background:linear-gradient(135deg,var(--accent)22,#4f46e522);height:80px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;}
.recipe-info{padding:10px;}
.recipe-info h3{font-size:.85rem;font-weight:600;}
.recipe-meta{font-size:.72rem;color:var(--sub);margin-top:3px;}
.recipe-tag{display:inline-block;background:rgba(124,58,237,.15);color:var(--accent);padding:2px 7px;border-radius:20px;font-size:.68rem;margin-top:4px;}
.fav-btn{background:none;border:none;cursor:pointer;font-size:1.1rem;}
.filter-bar{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px;}
.filter-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:5px 12px;color:var(--sub);font-size:.8rem;cursor:pointer;white-space:nowrap;transition:all .2s;}
.filter-btn.active{background:var(--accent);border-color:var(--accent);color:white;}
.search{position:relative;margin-bottom:12px;}
.search input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px 10px 36px;color:white;font-size:.9rem;outline:none;}
.search::before{content:'🔍';position:absolute;left:11px;top:50%;transform:translateY(-50%);}
.detail{background:var(--card);border-radius:14px;padding:16px;margin-top:10px;}
.detail h2{font-size:1.1rem;font-weight:700;margin-bottom:6px;}
.steps ol{padding-left:20px;}
.steps li{margin-bottom:8px;font-size:.88rem;color:#ccc;line-height:1.5;}
input,select,textarea{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:11px 13px;color:white;font-size:.9rem;margin-bottom:10px;outline:none;}
select option{background:#111128;}
.btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:10px;color:white;font-size:.95rem;font-weight:600;cursor:pointer;}
.nav{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid rgba(255,255,255,0.08);display:flex;padding:6px 0;z-index:100;}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:none;border:none;color:var(--sub);cursor:pointer;font-size:.65rem;}
.nav-btn .icon{font-size:1.3rem;}
.nav-btn.active{color:var(--accent);}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-60px);background:#22c55e;color:white;padding:10px 20px;border-radius:10px;font-size:.85rem;font-weight:500;z-index:9999;transition:transform .3s;}
.toast.show{transform:translateX(-50%) translateY(0);}
</style>
</head>
<body>
<header><h1>🍳 ${name}</h1></header>

<div class="section active" id="sec-home">
  <div style="background:linear-gradient(135deg,var(--accent),#4f46e5);border-radius:14px;padding:20px;margin-bottom:16px;text-align:center;">
    <p style="font-size:2rem;margin-bottom:8px;">🍽️</p>
    <h2 style="font-size:1.1rem;font-weight:700;">¿Qué cocinamos hoy?</h2>
    <p style="font-size:.85rem;opacity:.8;margin-top:4px;">10 recetas deliciosas te esperan</p>
  </div>
  <h3 style="font-size:.9rem;color:var(--sub);margin-bottom:10px;">CATEGORÍAS POPULARES</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
    <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:2rem;">🥗</div><p style="font-size:.85rem;margin-top:6px;font-weight:500;">Ensaladas</p><p style="font-size:.75rem;color:var(--sub);">3 recetas</p>
    </div>
    <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:2rem;">🍝</div><p style="font-size:.85rem;margin-top:6px;font-weight:500;">Pastas</p><p style="font-size:.75rem;color:var(--sub);">2 recetas</p>
    </div>
    <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:2rem;">🍰</div><p style="font-size:.85rem;margin-top:6px;font-weight:500;">Postres</p><p style="font-size:.75rem;color:var(--sub);">2 recetas</p>
    </div>
    <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:2rem;">🥩</div><p style="font-size:.85rem;margin-top:6px;font-weight:500;">Carnes</p><p style="font-size:.75rem;color:var(--sub);">3 recetas</p>
    </div>
  </div>
  <h3 style="font-size:.9rem;color:var(--sub);margin-bottom:10px;">RECETA DEL DÍA</h3>
  <div style="background:var(--card);border-radius:14px;padding:16px;border:1px solid rgba(124,58,237,.3);">
    <div style="font-size:2.5rem;text-align:center;margin-bottom:10px;">🥑</div>
    <h3 style="font-size:1rem;font-weight:600;">Tostadas de aguacate con huevo</h3>
    <p style="font-size:.82rem;color:var(--sub);margin-top:4px;">⏱ 10 min · 🍽 2 porciones · ⭐ 4.8</p>
    <button class="btn" style="margin-top:12px;" onclick="document.querySelector('[data-sec=explore]').click()">Ver recetas →</button>
  </div>
</div>

<div class="section" id="sec-explore">
  <div class="search"><input id="srch" placeholder="Buscar receta..."></div>
  <div class="filter-bar">
    <button class="filter-btn active" data-cat="all">Todas</button>
    <button class="filter-btn" data-cat="desayuno">🌅 Desayuno</button>
    <button class="filter-btn" data-cat="almuerzo">🍽 Almuerzo</button>
    <button class="filter-btn" data-cat="cena">🌙 Cena</button>
    <button class="filter-btn" data-cat="postre">🍰 Postre</button>
  </div>
  <div class="recipe-grid" id="recipe-grid"></div>
</div>

<div class="section" id="sec-favs">
  <h2 style="font-size:1rem;font-weight:600;margin-bottom:12px;">❤️ Mis favoritas</h2>
  <div class="recipe-grid" id="fav-grid"></div>
</div>

<div class="section" id="sec-profile">
  <div style="background:var(--card);border-radius:14px;padding:20px;text-align:center;margin-bottom:12px;">
    <div style="font-size:3rem;margin-bottom:8px;">👨‍🍳</div>
    <h2 style="font-size:1.1rem;font-weight:700;">Chef Amateur</h2>
    <p style="color:var(--sub);font-size:.85rem;">Nivel: Aprendiz</p>
  </div>
  <div style="background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;">
    <span>❤️ Favoritas</span><span id="fav-count" style="color:var(--accent);font-weight:600;">0</span>
  </div>
  <div style="background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;">
    <span>📖 Recetas disponibles</span><span style="color:var(--accent);font-weight:600;" id="total-count">0</span>
  </div>
</div>

<nav class="nav">
  <button class="nav-btn active" data-sec="home"><span class="icon">🏠</span>Inicio</button>
  <button class="nav-btn" data-sec="explore"><span class="icon">🔍</span>Explorar</button>
  <button class="nav-btn" data-sec="favs"><span class="icon">❤️</span>Favoritos</button>
  <button class="nav-btn" data-sec="profile"><span class="icon">👤</span>Perfil</button>
</nav>
<div class="toast" id="toast"></div>

<script>
const RECIPES=[
  {id:1,name:'Tostadas de aguacate',cat:'desayuno',emoji:'🥑',time:'10 min',servings:2,rating:4.8,ing:['2 rebanadas de pan','1 aguacate maduro','2 huevos','Sal y pimienta','Limón'],steps:['Tostar el pan hasta dorar','Triturar el aguacate con limón, sal y pimienta','Freír los huevos al gusto','Extender el aguacate sobre el pan','Colocar el huevo encima y servir']},
  {id:2,name:'Pasta carbonara',cat:'almuerzo',emoji:'🍝',time:'20 min',servings:4,rating:4.9,ing:['300g espaguetis','150g panceta','3 huevos','100g parmesano','Pimienta negra'],steps:['Cocer la pasta al dente','Freír la panceta sin aceite','Mezclar huevos con queso','Escurrir pasta guardando agua','Mezclar todo fuera del fuego añadiendo agua']},
  {id:3,name:'Ensalada César',cat:'almuerzo',emoji:'🥗',time:'15 min',servings:2,rating:4.7,ing:['Lechuga romana','Pollo a la plancha','Crutones','Queso parmesano','Salsa César'],steps:['Lavar y trocear la lechuga','Hacer el pollo a la plancha','Hacer los crutones al horno','Mezclar todo con la salsa','Añadir parmesano rallado']},
  {id:4,name:'Pollo al curry',cat:'cena',emoji:'🍛',time:'35 min',servings:4,rating:4.6,ing:['500g pollo','1 cebolla','2 dientes ajo','2 cucharadas curry','400ml leche de coco','Arroz'],steps:['Sofreír cebolla y ajo','Añadir el pollo troceado','Incorporar el curry y cocinar','Verter la leche de coco','Cocer 20 min y servir con arroz']},
  {id:5,name:'Bizcocho de limón',cat:'postre',emoji:'🍋',time:'45 min',servings:8,rating:4.5,ing:['200g harina','180g azúcar','3 huevos','120ml aceite','Ralladura de 2 limones','1 sobre levadura'],steps:['Batir huevos con azúcar','Añadir aceite y ralladura','Incorporar harina con levadura','Verter en molde engrasado','Hornear 180°C 35 min']},
  {id:6,name:'Gazpacho andaluz',cat:'cena',emoji:'🍅',time:'15 min',servings:4,rating:4.8,ing:['1kg tomates maduros','1 pepino','1 pimiento verde','1 diente ajo','Aceite, vinagre, sal'],steps:['Lavar y trocear las verduras','Triturar todo en batidora','Añadir aceite y vinagre','Colar para textura suave','Enfriar 2h en nevera']},
  {id:7,name:'Tortilla española',cat:'almuerzo',emoji:'🥚',time:'25 min',servings:4,rating:4.9,ing:['4 huevos','3 patatas medianas','1 cebolla','Aceite de oliva','Sal'],steps:['Pelar y cortar patatas y cebolla','Freír lentamente en aceite','Escurrir el aceite','Batir huevos y mezclar','Cuajar la tortilla por ambos lados']},
  {id:8,name:'Tiramisú',cat:'postre',emoji:'☕',time:'30 min',servings:6,rating:4.7,ing:['250g mascarpone','3 huevos','100g azúcar','200ml café','Soletillas','Cacao en polvo'],steps:['Separar claras y yemas','Montar claras a punto de nieve','Mezclar yemas con azúcar y mascarpone','Incorporar claras con movimientos envolventes','Montar en capas con soletillas mojadas en café','Espolvorear cacao y refrigerar 4h']},
];
let favs=JSON.parse(localStorage.getItem('recipe_favs')||'[]');
let catFilter='all';

function save(){localStorage.setItem('recipe_favs',JSON.stringify(favs));}

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

function renderRecipes(list,containerId){
  const el=document.getElementById(containerId);
  if(!list.length){el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:#666;">Sin recetas</div>';return;}
  el.innerHTML=list.map(r=>\`<div class="recipe-card" data-id="\${r.id}">
    <div class="recipe-emoji">\${r.emoji}</div>
    <div class="recipe-info">
      <h3>\${r.name}</h3>
      <div class="recipe-meta">⏱\${r.time} · ⭐\${r.rating}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span class="recipe-tag">\${r.cat}</span>
        <button class="fav-btn" data-fav="\${r.id}">\${favs.includes(r.id)?'❤️':'🤍'}</button>
      </div>
    </div>
  </div>\`).join('');
  el.querySelectorAll('[data-fav]').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();toggleFav(+btn.dataset.fav);});
  });
  el.querySelectorAll('.recipe-card').forEach(card=>{
    card.addEventListener('click',()=>showDetail(+card.dataset.id));
  });
}

function toggleFav(id){
  if(favs.includes(id))favs=favs.filter(f=>f!==id);
  else favs.push(id);
  save();
  renderExplore();
  renderFavs();
  toast(favs.includes(id)?'❤️ Añadida a favoritos':'💔 Eliminada de favoritos');
  document.getElementById('fav-count').textContent=favs.length;
}

function showDetail(id){
  const r=RECIPES.find(x=>x.id===id);if(!r)return;
  alert(\`\${r.emoji} \${r.name}\\n\\nIngredientes:\\n• \${r.ing.join('\\n• ')}\\n\\nPreparación:\\n\${r.steps.map((s,i)=>i+1+'. '+s).join('\\n')}\`);
}

function renderExplore(){
  const q=document.getElementById('srch')?.value?.toLowerCase()||'';
  let list=RECIPES;
  if(catFilter!=='all')list=list.filter(r=>r.cat===catFilter);
  if(q)list=list.filter(r=>r.name.toLowerCase().includes(q));
  renderRecipes(list,'recipe-grid');
}

function renderFavs(){
  renderRecipes(RECIPES.filter(r=>favs.includes(r.id)),'fav-grid');
}

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec=btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(sec==='explore')renderExplore();
    if(sec==='favs')renderFavs();
    if(sec==='profile'){document.getElementById('fav-count').textContent=favs.length;document.getElementById('total-count').textContent=RECIPES.length;}
  });
});

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');catFilter=btn.dataset.cat;renderExplore();
  });
});
document.getElementById('srch')?.addEventListener('input',renderExplore);

renderExplore();
</script>
</body>
</html>`;
}

function shopApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;--sub:#888;}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',system-ui,sans-serif;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:130px;}
header{background:var(--card);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.07);}
header h1{font-size:1.1rem;font-weight:700;color:var(--accent);}
.cart-badge{background:var(--accent);color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;}
.section{display:none;padding:14px;}
.section.active{display:block;}
.promo{background:linear-gradient(135deg,var(--accent),#4f46e5);border-radius:14px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;}
.promo::after{content:'👗';position:absolute;right:-10px;top:-10px;font-size:5rem;opacity:.15;}
.promo h2{font-size:1.2rem;font-weight:700;}
.promo p{font-size:.85rem;opacity:.85;margin:4px 0 12px;}
.shop-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.product-card{background:var(--card);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);transition:transform .2s;}
.product-card:hover{transform:translateY(-2px);}
.product-img{height:100px;display:flex;align-items:center;justify-content:center;font-size:3.5rem;background:rgba(255,255,255,0.03);}
.product-info{padding:10px;}
.product-info h3{font-size:.83rem;font-weight:600;line-height:1.3;}
.product-price{color:var(--accent);font-weight:700;font-size:.95rem;margin:4px 0;}
.product-old{color:var(--sub);text-decoration:line-through;font-size:.78rem;}
.add-cart{width:100%;background:var(--accent);border:none;border-radius:8px;padding:7px;color:white;font-size:.78rem;cursor:pointer;margin-top:6px;font-weight:500;}
.cart-item{background:var(--card);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,0.06);}
.cart-emoji{font-size:2rem;flex-shrink:0;}
.qty-ctrl{display:flex;align-items:center;gap:8px;margin-top:4px;}
.qty-btn{background:rgba(255,255,255,0.08);border:none;color:white;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:.9rem;}
.search-bar{display:flex;gap:8px;margin-bottom:12px;}
.search-bar input{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 13px;color:white;font-size:.9rem;outline:none;}
.filter-bar{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding-bottom:2px;}
.filter-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:5px 12px;color:var(--sub);font-size:.8rem;cursor:pointer;white-space:nowrap;}
.filter-btn.active{background:var(--accent);border-color:var(--accent);color:white;}
.total-bar{background:var(--card);border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.07);}
.btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:10px;color:white;font-size:.95rem;font-weight:600;cursor:pointer;}
.nav{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid rgba(255,255,255,0.08);display:flex;padding:6px 0;z-index:100;}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:none;border:none;color:var(--sub);cursor:pointer;font-size:.65rem;}
.nav-btn .icon{font-size:1.3rem;}
.nav-btn.active{color:var(--accent);}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-60px);background:#22c55e;color:white;padding:10px 20px;border-radius:10px;font-size:.85rem;font-weight:500;z-index:9999;transition:transform .3s;}
.toast.show{transform:translateX(-50%) translateY(0);}
</style>
</head>
<body>
<header>
  <h1>👗 ${name}</h1>
  <div>🛒 <span class="cart-badge" id="cart-count">0</span></div>
</header>

<div class="section active" id="sec-home">
  <div class="promo">
    <h2>🎉 Rebajas de Verano</h2>
    <p>Hasta 50% en toda la colección</p>
    <button style="background:white;color:var(--accent);border:none;border-radius:8px;padding:8px 16px;font-weight:600;cursor:pointer;" onclick="document.querySelector('[data-sec=catalog]').click()">Ver ofertas →</button>
  </div>
  <h3 style="font-size:.9rem;color:var(--sub);margin-bottom:10px;">DESTACADOS</h3>
  <div class="shop-grid" id="featured-grid"></div>
</div>

<div class="section" id="sec-catalog">
  <div class="search-bar">
    <input id="search-prod" placeholder="Buscar producto...">
  </div>
  <div class="filter-bar">
    <button class="filter-btn active" data-cat="all">Todo</button>
    <button class="filter-btn" data-cat="camisetas">👕 Camisetas</button>
    <button class="filter-btn" data-cat="pantalones">👖 Pantalones</button>
    <button class="filter-btn" data-cat="vestidos">👗 Vestidos</button>
    <button class="filter-btn" data-cat="accesorios">👜 Accesorios</button>
  </div>
  <div class="shop-grid" id="catalog-grid"></div>
</div>

<div class="section" id="sec-cart">
  <h2 style="font-size:1rem;font-weight:600;margin-bottom:12px;">🛒 Mi carrito</h2>
  <div id="cart-items"></div>
  <div class="total-bar" id="total-bar" style="display:none;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--sub);">Subtotal</span><span id="subtotal">0€</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--sub);">Envío</span><span style="color:#22c55e;">Gratis</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.05rem;"><span>Total</span><span id="total-price" style="color:var(--accent);">0€</span></div>
  </div>
  <button class="btn" id="checkout-btn" style="display:none;">💳 Finalizar compra</button>
</div>

<div class="section" id="sec-profile">
  <div style="background:var(--card);border-radius:14px;padding:20px;text-align:center;margin-bottom:12px;">
    <div style="font-size:3rem;margin-bottom:8px;">👤</div>
    <h2 style="font-size:1.1rem;font-weight:700;">Mi cuenta</h2>
    <p style="color:var(--sub);font-size:.85rem;">Cliente Premium</p>
  </div>
  <div style="background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;">
    <span>🛍️ Pedidos realizados</span><span id="orders-count" style="color:var(--accent);font-weight:600;">0</span>
  </div>
  <div style="background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;">
    <span>💰 Total gastado</span><span id="total-spent" style="color:var(--accent);font-weight:600;">0€</span>
  </div>
  <div style="background:var(--card);border-radius:10px;padding:13px 15px;margin-bottom:8px;display:flex;justify-content:space-between;">
    <span>📍 Envío a</span><span style="color:var(--sub);">España</span>
  </div>
</div>

<nav class="nav">
  <button class="nav-btn active" data-sec="home"><span class="icon">🏠</span>Inicio</button>
  <button class="nav-btn" data-sec="catalog"><span class="icon">🛍️</span>Catálogo</button>
  <button class="nav-btn" data-sec="cart"><span class="icon">🛒</span>Carrito</button>
  <button class="nav-btn" data-sec="profile"><span class="icon">👤</span>Perfil</button>
</nav>
<div class="toast" id="toast"></div>

<script>
const PRODUCTS=[
  {id:1,name:'Camiseta básica negra',cat:'camisetas',emoji:'👕',price:15.99,old:29.99,sizes:['S','M','L','XL']},
  {id:2,name:'Vaqueros slim fit',cat:'pantalones',emoji:'👖',price:39.99,old:79.99,sizes:['36','38','40','42']},
  {id:3,name:'Vestido floral',cat:'vestidos',emoji:'👗',price:34.99,old:59.99,sizes:['XS','S','M','L']},
  {id:4,name:'Bolso de cuero',cat:'accesorios',emoji:'👜',price:49.99,old:89.99,sizes:['Único']},
  {id:5,name:'Camiseta oversize',cat:'camisetas',emoji:'👚',price:19.99,old:34.99,sizes:['S','M','L','XL']},
  {id:6,name:'Pantalón chino beige',cat:'pantalones',emoji:'👔',price:29.99,old:54.99,sizes:['38','40','42','44']},
  {id:7,name:'Vestido de noche',cat:'vestidos',emoji:'🥻',price:69.99,old:129.99,sizes:['XS','S','M','L']},
  {id:8,name:'Gafas de sol',cat:'accesorios',emoji:'🕶️',price:24.99,old:44.99,sizes:['Único']},
  {id:9,name:'Sudadera con capucha',cat:'camisetas',emoji:'🧥',price:44.99,old:74.99,sizes:['S','M','L','XL']},
  {id:10,name:'Falda midi',cat:'vestidos',emoji:'👘',price:27.99,old:49.99,sizes:['XS','S','M','L']},
];
let cart=JSON.parse(localStorage.getItem('shop_cart')||'[]');
let orders=JSON.parse(localStorage.getItem('shop_orders')||'[]');
let catFilter='all';

function save(){localStorage.setItem('shop_cart',JSON.stringify(cart));}
function saveOrders(){localStorage.setItem('shop_orders',JSON.stringify(orders));}

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

function updateCartBadge(){document.getElementById('cart-count').textContent=cart.reduce((a,c)=>a+c.qty,0);}

function productHTML(p){
  return \`<div class="product-card" data-id="\${p.id}">
    <div class="product-img">\${p.emoji}</div>
    <div class="product-info">
      <h3>\${p.name}</h3>
      <div class="product-price">\${p.price}€ <span class="product-old">\${p.old}€</span></div>
      <button class="add-cart" data-add="\${p.id}">🛒 Añadir</button>
    </div>
  </div>\`;
}

function renderProducts(list,containerId){
  const el=document.getElementById(containerId);
  if(!list.length){el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:20px;color:#666;">Sin productos</div>';return;}
  el.innerHTML=list.map(productHTML).join('');
  el.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click',()=>addToCart(+btn.dataset.add));
  });
}

function addToCart(id){
  const p=PRODUCTS.find(x=>x.id===id);if(!p)return;
  const ex=cart.find(c=>c.id===id);
  if(ex)ex.qty++;
  else cart.push({id,name:p.name,emoji:p.emoji,price:p.price,qty:1});
  save();updateCartBadge();toast('🛒 '+p.name+' añadido');
}

function renderCart(){
  const el=document.getElementById('cart-items');
  const tb=document.getElementById('total-bar');
  const cb=document.getElementById('checkout-btn');
  if(!cart.length){
    el.innerHTML='<div style="text-align:center;padding:40px;color:#666;"><div style="font-size:2.5rem;">🛒</div><p style="margin-top:8px;">Carrito vacío</p></div>';
    tb.style.display='none';cb.style.display='none';return;
  }
  el.innerHTML=cart.map(c=>\`<div class="cart-item" data-id="\${c.id}">
    <div class="cart-emoji">\${c.emoji}</div>
    <div style="flex:1;">
      <div style="font-size:.88rem;font-weight:500;">\${c.name}</div>
      <div style="color:var(--accent);font-weight:700;font-size:.9rem;">\${(c.price*c.qty).toFixed(2)}€</div>
      <div class="qty-ctrl">
        <button class="qty-btn" data-dec="\${c.id}">−</button>
        <span style="font-size:.9rem;">\${c.qty}</span>
        <button class="qty-btn" data-inc="\${c.id}">+</button>
        <button style="background:none;border:none;color:#ef4444;cursor:pointer;margin-left:8px;font-size:.85rem;" data-rem="\${c.id}">Quitar</button>
      </div>
    </div>
  </div>\`).join('');
  const total=cart.reduce((a,c)=>a+c.price*c.qty,0);
  document.getElementById('subtotal').textContent=total.toFixed(2)+'€';
  document.getElementById('total-price').textContent=total.toFixed(2)+'€';
  tb.style.display='block';cb.style.display='block';
  el.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click',()=>{const c=cart.find(x=>x.id==b.dataset.dec);if(c&&c.qty>1){c.qty--;}else cart=cart.filter(x=>x.id!=b.dataset.dec);save();updateCartBadge();renderCart();}));
  el.querySelectorAll('[data-inc]').forEach(b=>b.addEventListener('click',()=>{const c=cart.find(x=>x.id==b.dataset.inc);if(c)c.qty++;save();updateCartBadge();renderCart();}));
  el.querySelectorAll('[data-rem]').forEach(b=>b.addEventListener('click',()=>{cart=cart.filter(x=>x.id!=b.dataset.rem);save();updateCartBadge();renderCart();}));
}

document.getElementById('checkout-btn').addEventListener('click',()=>{
  const total=cart.reduce((a,c)=>a+c.price*c.qty,0);
  orders.push({date:new Date().toLocaleDateString(),total,items:cart.length});
  saveOrders();cart=[];save();updateCartBadge();renderCart();
  toast('✅ Pedido realizado — ¡Gracias!');
});

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec=btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(sec==='catalog')renderCatalog();
    if(sec==='cart')renderCart();
    if(sec==='profile'){document.getElementById('orders-count').textContent=orders.length;document.getElementById('total-spent').textContent=orders.reduce((a,o)=>a+o.total,0).toFixed(2)+'€';}
  });
});

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');catFilter=btn.dataset.cat;renderCatalog();
  });
});
document.getElementById('search-prod').addEventListener('input',renderCatalog);

function renderCatalog(){
  const q=document.getElementById('search-prod').value.toLowerCase();
  let list=PRODUCTS;
  if(catFilter!=='all')list=list.filter(p=>p.cat===catFilter);
  if(q)list=list.filter(p=>p.name.toLowerCase().includes(q));
  renderProducts(list,'catalog-grid');
}

renderProducts(PRODUCTS.slice(0,4),'featured-grid');
updateCartBadge();
</script>
</body>
</html>`;
}

function gymApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:80px}
.section{display:none;padding:16px;max-width:480px;margin:0 auto}
.section.active{display:block}
header{background:var(--card);padding:16px;text-align:center;border-bottom:1px solid rgba(255,255,255,.07);position:sticky;top:0;z-index:10}
header h1{font-size:1.2rem;color:var(--accent)}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.stat{background:var(--card);border-radius:12px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,.06)}
.stat-val{font-size:1.8rem;font-weight:700;color:var(--accent)}
.stat-lbl{font-size:.75rem;color:#888;margin-top:4px}
.card{background:var(--card);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid rgba(255,255,255,.06)}
.card h3{font-size:.95rem;margin-bottom:6px}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:600}
.badge-push{background:rgba(239,68,68,.15);color:#f87171}
.badge-pull{background:rgba(59,130,246,.15);color:#60a5fa}
.badge-legs{background:rgba(16,185,129,.15);color:#34d399}
.badge-cardio{background:rgba(245,158,11,.15);color:#fbbf24}
.ex-list{list-style:none;margin-top:8px}
.ex-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem}
.ex-item:last-child{border:none}
.ex-sets{color:var(--accent);font-weight:600;font-size:.8rem}
.check-btn{background:rgba(124,58,237,.15);border:none;color:var(--accent);padding:4px 10px;border-radius:8px;cursor:pointer;font-size:.75rem}
.check-btn.done{background:var(--accent);color:white}
.progress-bar{background:rgba(255,255,255,.08);border-radius:8px;height:8px;margin-top:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),#a855f7);border-radius:8px;transition:width .5s}
.input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.9rem;margin-bottom:10px}
.input:focus{outline:none;border-color:var(--accent)}
.btn{width:100%;background:var(--accent);color:white;border:none;padding:12px;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:4px}
.btn:hover{opacity:.9}
.nav{position:fixed;bottom:0;width:100%;background:var(--card);display:flex;justify-content:space-around;padding:10px 0;border-top:1px solid rgba(255,255,255,.07);z-index:100}
.nav-btn{background:none;border:none;color:#666;cursor:pointer;padding:4px 8px;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.65rem;transition:.2s}
.nav-btn.active,.nav-btn:hover{color:var(--accent)}
.nav-btn .ico{font-size:1.3rem}
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:10px 22px;border-radius:20px;font-size:.85rem;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:12px 0}
.day-dot{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600;cursor:pointer}
.day-dot.rest{background:rgba(255,255,255,.05);color:#555}
.day-dot.done{background:var(--accent);color:white}
.day-dot.today{border:2px solid var(--accent);color:var(--accent)}
</style>
</head>
<body>
<header><h1>💪 ${name}</h1></header>
<div id="toast" class="toast"></div>

<div class="section active" id="sec-home">
  <div class="stats-grid">
    <div class="stat"><div class="stat-val" id="streak">12</div><div class="stat-lbl">Racha días</div></div>
    <div class="stat"><div class="stat-val" id="week-done">4</div><div class="stat-lbl">Esta semana</div></div>
    <div class="stat"><div class="stat-val" id="total-workouts">47</div><div class="stat-lbl">Total entrenos</div></div>
    <div class="stat"><div class="stat-val" id="kcal">2840</div><div class="stat-lbl">Kcal quemadas</div></div>
  </div>
  <h2 style="font-size:.95rem;margin:12px 0 8px;color:#aaa">SEMANA ACTUAL</h2>
  <div class="week-grid" id="week-grid"></div>
  <h2 style="font-size:.95rem;margin:16px 0 8px;color:#aaa">PRÓXIMO ENTRENO</h2>
  <div id="next-workout"></div>
</div>

<div class="section" id="sec-routines">
  <h2 style="font-size:1rem;margin-bottom:12px">Mis Rutinas</h2>
  <div id="routines-list"></div>
</div>

<div class="section" id="sec-add">
  <h2 style="font-size:1rem;margin-bottom:14px">Registrar Entreno</h2>
  <label style="font-size:.8rem;color:#aaa;display:block;margin-bottom:4px">Tipo de rutina</label>
  <select class="input" id="new-type">
    <option value="push">Push (Pecho, Hombros, Tríceps)</option>
    <option value="pull">Pull (Espalda, Bíceps)</option>
    <option value="legs">Legs (Piernas, Glúteos)</option>
    <option value="cardio">Cardio</option>
    <option value="full">Full Body</option>
  </select>
  <label style="font-size:.8rem;color:#aaa;display:block;margin-bottom:4px">Duración (min)</label>
  <input class="input" id="new-dur" type="number" value="45" min="10" max="180">
  <label style="font-size:.8rem;color:#aaa;display:block;margin-bottom:4px">Notas</label>
  <input class="input" id="new-notes" placeholder="Ej: Aumenté peso en press banca...">
  <button class="btn" id="save-workout">✅ Guardar Entreno</button>
</div>

<div class="section" id="sec-profile">
  <h2 style="font-size:1rem;margin-bottom:14px">Mi Perfil</h2>
  <div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.8rem">💪</div>
      <div><div id="p-name" style="font-weight:600;font-size:1rem">Atleta NexusAI</div><div style="color:#888;font-size:.8rem">Nivel: Intermedio</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="text-align:center;background:rgba(255,255,255,.04);border-radius:8px;padding:10px"><div style="color:var(--accent);font-weight:700;font-size:1.2rem" id="p-total">47</div><div style="font-size:.72rem;color:#888">Entrenos</div></div>
      <div style="text-align:center;background:rgba(255,255,255,.04);border-radius:8px;padding:10px"><div style="color:var(--accent);font-weight:700;font-size:1.2rem" id="p-streak">12</div><div style="font-size:.72rem;color:#888">Racha</div></div>
    </div>
  </div>
  <div class="card" style="margin-top:12px">
    <h3 style="font-size:.9rem;margin-bottom:10px;color:#aaa">OBJETIVO SEMANAL</h3>
    <div style="font-size:.85rem;margin-bottom:6px">4 / 5 entrenos completados</div>
    <div class="progress-bar"><div class="progress-fill" style="width:80%"></div></div>
  </div>
</div>

<nav class="nav">
  <button class="nav-btn active" data-sec="home"><span class="ico">🏠</span>Inicio</button>
  <button class="nav-btn" data-sec="routines"><span class="ico">📋</span>Rutinas</button>
  <button class="nav-btn" data-sec="add"><span class="ico">➕</span>Registrar</button>
  <button class="nav-btn" data-sec="profile"><span class="ico">👤</span>Perfil</button>
</nav>

<script>
const STORE='nexusai_gym_v1';
let logs=JSON.parse(localStorage.getItem(STORE)||'null')||[
  {id:1,type:'push',dur:50,notes:'Press banca 80kg x5',date:'2026-07-14',kcal:320},
  {id:2,type:'pull',dur:45,notes:'Dominadas +10kg',date:'2026-07-13',kcal:290},
  {id:3,type:'legs',dur:60,notes:'Sentadillas 100kg',date:'2026-07-12',kcal:410},
  {id:4,type:'cardio',dur:30,notes:'HIIT + cuerda',date:'2026-07-11',kcal:350},
  {id:5,type:'push',dur:55,notes:'Vuelos laterales PR',date:'2026-07-10',kcal:330},
  {id:6,type:'pull',dur:40,notes:'Remo 70kg',date:'2026-07-09',kcal:270},
  {id:7,type:'legs',dur:65,notes:'Peso muerto 120kg',date:'2026-07-08',kcal:430},
];
const ROUTINES=[
  {name:'Push Day A',type:'push',exercises:[{n:'Press Banca',s:'4x8',m:'80kg'},{n:'Press Inclinado Mancuernas',s:'3x10',m:'28kg'},{n:'Vuelos Laterales',s:'4x12',m:'14kg'},{n:'Press Militar',s:'3x8',m:'50kg'},{n:'Extensión Tríceps Polea',s:'4x12',m:'35kg'}]},
  {name:'Pull Day A',type:'pull',exercises:[{n:'Dominadas',s:'4x6',m:'+10kg'},{n:'Remo con Barra',s:'4x8',m:'70kg'},{n:'Curl Bíceps Barra',s:'3x10',m:'40kg'},{n:'Jalón al Pecho',s:'3x12',m:'65kg'},{n:'Curl Martillo',s:'3x12',m:'18kg'}]},
  {name:'Leg Day A',type:'legs',exercises:[{n:'Sentadilla',s:'5x5',m:'100kg'},{n:'Prensa',s:'4x10',m:'180kg'},{n:'Extensión Cuádriceps',s:'3x12',m:'60kg'},{n:'Femoral Tumbado',s:'3x12',m:'45kg'},{n:'Gemelos de Pie',s:'4x15',m:'100kg'}]},
  {name:'Cardio HIIT',type:'cardio',exercises:[{n:'Cuerda (intervalos)',s:'10x30s',m:'descanso 20s'},{n:'Burpees',s:'4x10',m:''},{n:'Sprint 50m',s:'6x',m:'descanso 45s'},{n:'Mountain Climbers',s:'3x30s',m:''},{n:'Plancha',s:'3x60s',m:''}]},
];
function save(){localStorage.setItem(STORE,JSON.stringify(logs));}
function typeLabel(t){return{push:'<span class="badge badge-push">PUSH</span>',pull:'<span class="badge badge-pull">PULL</span>',legs:'<span class="badge badge-legs">LEGS</span>',cardio:'<span class="badge badge-cardio">CARDIO</span>',full:'<span class="badge" style="background:rgba(124,58,237,.15);color:#a78bfa">FULL</span>'}[t]||'';}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2000);}

function renderWeek(){
  const days=['L','M','X','J','V','S','D'];
  const today=new Date().getDay();
  const grid=document.getElementById('week-grid');
  const recent=logs.slice(0,7).map(l=>l.date);
  grid.innerHTML=days.map((d,i)=>{
    const date=new Date();date.setDate(date.getDate()-(today===0?6:today-1)+i);
    const ds=date.toISOString().split('T')[0];
    const isDone=recent.includes(ds);
    const isTod=i===(today===0?6:today-1);
    return \`<div class="day-dot \${isDone?'done':isTod?'today':'rest'}">\${d}</div>\`;
  }).join('');
}

function renderNext(){
  const el=document.getElementById('next-workout');
  const r=ROUTINES[logs.length%ROUTINES.length];
  el.innerHTML=\`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3>\${r.name}</h3>\${typeLabel(r.type)}</div><ul class="ex-list">\${r.exercises.map(e=>\`<li class="ex-item"><span>\${e.n}</span><span class="ex-sets">\${e.s} \${e.m}</span></li>\`).join('')}</ul><button class="btn" style="margin-top:10px" onclick="document.querySelector('[data-sec=add]').click()">Empezar 💪</button></div>\`;
}

function renderRoutines(){
  document.getElementById('routines-list').innerHTML=ROUTINES.map(r=>\`
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3>\${r.name}</h3>\${typeLabel(r.type)}</div>
    <ul class="ex-list">\${r.exercises.map(e=>\`<li class="ex-item"><span>\${e.n}</span><span class="ex-sets">\${e.s}</span></li>\`).join('')}</ul></div>
  \`).join('');
}

document.getElementById('save-workout').addEventListener('click',()=>{
  const type=document.getElementById('new-type').value;
  const dur=+document.getElementById('new-dur').value||45;
  const notes=document.getElementById('new-notes').value||'';
  const kcal=Math.round(dur*7.5);
  logs.unshift({id:Date.now(),type,dur,notes,date:new Date().toISOString().split('T')[0],kcal});
  save();
  document.getElementById('new-notes').value='';
  const total=+document.getElementById('total-workouts').textContent+1;
  document.getElementById('total-workouts').textContent=total;
  document.getElementById('kcal').textContent=(+document.getElementById('kcal').textContent+kcal);
  toast('💪 ¡Entreno registrado!');
  renderWeek();
});

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec=btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(sec==='routines')renderRoutines();
  });
});

renderWeek();renderNext();
</script>
</body>
</html>`;
}

function financeApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:80px}
.section{display:none;padding:16px;max-width:480px;margin:0 auto}
.section.active{display:block}
header{background:var(--card);padding:16px;text-align:center;border-bottom:1px solid rgba(255,255,255,.07);position:sticky;top:0;z-index:10}
header h1{font-size:1.2rem;color:var(--accent)}
.balance-card{background:linear-gradient(135deg,${color},#a855f7);border-radius:16px;padding:24px;margin-bottom:16px;text-align:center}
.balance-lbl{font-size:.8rem;opacity:.8;margin-bottom:4px}
.balance-val{font-size:2.2rem;font-weight:700}
.balance-sub{display:flex;justify-content:space-between;margin-top:12px;font-size:.8rem}
.card{background:var(--card);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid rgba(255,255,255,.06)}
.tx-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.tx-item:last-child{border:none}
.tx-ico{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.tx-info{flex:1}
.tx-name{font-size:.88rem;font-weight:500}
.tx-date{font-size:.72rem;color:#888}
.tx-amount{font-weight:700;font-size:.95rem}
.income{color:#34d399}
.expense{color:#f87171}
.cat-badge{display:inline-block;padding:1px 7px;border-radius:20px;font-size:.65rem;margin-top:2px}
.input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.9rem;margin-bottom:10px}
.input:focus{outline:none;border-color:var(--accent)}
select.input option{background:#1a1a2e}
.btn{width:100%;background:var(--accent);color:white;border:none;padding:12px;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:4px}
.type-toggle{display:flex;gap:8px;margin-bottom:12px}
.type-btn{flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:none;color:#888;cursor:pointer;font-size:.85rem;transition:.2s}
.type-btn.active.income{border-color:#34d399;color:#34d399;background:rgba(52,211,153,.1)}
.type-btn.active.expense{border-color:#f87171;color:#f87171;background:rgba(248,113,113,.1)}
.progress-bar{background:rgba(255,255,255,.08);border-radius:8px;height:8px;overflow:hidden;margin-top:6px}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),#a855f7);border-radius:8px}
.nav{position:fixed;bottom:0;width:100%;background:var(--card);display:flex;justify-content:space-around;padding:10px 0;border-top:1px solid rgba(255,255,255,.07);z-index:100}
.nav-btn{background:none;border:none;color:#666;cursor:pointer;padding:4px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.65rem;transition:.2s}
.nav-btn.active,.nav-btn:hover{color:var(--accent)}
.nav-btn .ico{font-size:1.3rem}
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:10px 22px;border-radius:20px;font-size:.85rem;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
</style>
</head>
<body>
<header><h1>💰 ${name}</h1></header>
<div id="toast" class="toast"></div>

<div class="section active" id="sec-home">
  <div class="balance-card">
    <div class="balance-lbl">SALDO TOTAL</div>
    <div class="balance-val" id="total-balance">2.340,50 €</div>
    <div class="balance-sub">
      <span>📈 Ingresos: <strong id="total-income">3.200 €</strong></span>
      <span>📉 Gastos: <strong id="total-expense">859,50 €</strong></span>
    </div>
  </div>
  <h2 style="font-size:.9rem;color:#aaa;margin-bottom:8px">PRESUPUESTO MENSUAL</h2>
  <div class="card" id="budget-bars"></div>
  <h2 style="font-size:.9rem;color:#aaa;margin:12px 0 8px">ÚLTIMAS TRANSACCIONES</h2>
  <div id="recent-list"></div>
</div>

<div class="section" id="sec-txs">
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <button class="type-btn active" id="filter-all" data-filter="all">Todas</button>
    <button class="type-btn" id="filter-income" data-filter="income">Ingresos</button>
    <button class="type-btn" id="filter-expense" data-filter="expense">Gastos</button>
  </div>
  <div id="all-txs"></div>
</div>

<div class="section" id="sec-add">
  <h2 style="font-size:1rem;margin-bottom:14px">Nueva Transacción</h2>
  <div class="type-toggle">
    <button class="type-btn expense active" id="btn-expense" data-t="expense">📉 Gasto</button>
    <button class="type-btn income" id="btn-income" data-t="income">📈 Ingreso</button>
  </div>
  <input class="input" id="new-desc" placeholder="Descripción (ej: Supermercado)">
  <input class="input" id="new-amount" type="number" placeholder="Importe en €" step="0.01" min="0">
  <select class="input" id="new-cat">
    <option value="🍔 Comida">🍔 Comida</option>
    <option value="🚗 Transporte">🚗 Transporte</option>
    <option value="🏠 Vivienda">🏠 Vivienda</option>
    <option value="💊 Salud">💊 Salud</option>
    <option value="🎮 Ocio">🎮 Ocio</option>
    <option value="👕 Ropa">👕 Ropa</option>
    <option value="💼 Trabajo">💼 Trabajo (ingreso)</option>
    <option value="🎁 Extra">🎁 Extra</option>
  </select>
  <button class="btn" id="save-tx">💾 Guardar</button>
</div>

<div class="section" id="sec-profile">
  <h2 style="font-size:1rem;margin-bottom:14px">Resumen & Metas</h2>
  <div class="card">
    <h3 style="font-size:.9rem;margin-bottom:10px;color:#aaa">META DE AHORRO</h3>
    <div style="font-size:.85rem;margin-bottom:4px">Vacaciones verano 🌴 — 800 € / 1.500 €</div>
    <div class="progress-bar"><div class="progress-fill" style="width:53%"></div></div>
    <div style="text-align:right;font-size:.75rem;color:#888;margin-top:4px">53%</div>
  </div>
  <div class="card" style="margin-top:10px">
    <h3 style="font-size:.9rem;margin-bottom:10px;color:#aaa">DISTRIBUCIÓN GASTOS</h3>
    <div id="cat-summary"></div>
  </div>
</div>

<nav class="nav">
  <button class="nav-btn active" data-sec="home"><span class="ico">🏠</span>Inicio</button>
  <button class="nav-btn" data-sec="txs"><span class="ico">📊</span>Historial</button>
  <button class="nav-btn" data-sec="add"><span class="ico">➕</span>Añadir</button>
  <button class="nav-btn" data-sec="profile"><span class="ico">🎯</span>Metas</button>
</nav>

<script>
const STORE='nexusai_finance_v1';
let txs=JSON.parse(localStorage.getItem(STORE)||'null')||[
  {id:1,desc:'Nómina julio',amount:1600,type:'income',cat:'💼 Trabajo',date:'2026-07-01'},
  {id:2,desc:'Alquiler',amount:650,type:'expense',cat:'🏠 Vivienda',date:'2026-07-02'},
  {id:3,desc:'Mercadona',amount:87.30,type:'expense',cat:'🍔 Comida',date:'2026-07-04'},
  {id:4,desc:'Gasolina',amount:52.80,type:'expense',cat:'🚗 Transporte',date:'2026-07-05'},
  {id:5,desc:'Freelance web',amount:350,type:'income',cat:'💼 Trabajo',date:'2026-07-06'},
  {id:6,desc:'Netflix+Spotify',amount:22.98,type:'expense',cat:'🎮 Ocio',date:'2026-07-07'},
  {id:7,desc:'Farmacia',amount:14.50,type:'expense',cat:'💊 Salud',date:'2026-07-08'},
  {id:8,desc:'Mercadona',amount:64.20,type:'expense',cat:'🍔 Comida',date:'2026-07-11'},
  {id:9,desc:'Nómina extra',amount:250,type:'income',cat:'💼 Trabajo',date:'2026-07-12'},
  {id:10,desc:'Ropa Zara',amount:67.90,type:'expense',cat:'👕 Ropa',date:'2026-07-13'},
];
let newType='expense';
function save(){localStorage.setItem(STORE,JSON.stringify(txs));}
function fmt(n){return n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2000);}

function calcTotals(){
  const income=txs.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const expense=txs.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  return{income,expense,balance:income-expense};
}
function renderHome(){
  const{income,expense,balance}=calcTotals();
  document.getElementById('total-balance').textContent=fmt(balance);
  document.getElementById('total-income').textContent=fmt(income);
  document.getElementById('total-expense').textContent=fmt(expense);
  const recent=txs.slice(0,5);
  document.getElementById('recent-list').innerHTML=recent.map(txHTML).join('');
  const cats={};
  txs.filter(t=>t.type==='expense').forEach(t=>{cats[t.cat]=(cats[t.cat]||0)+t.amount;});
  const budgets=[{cat:'🍔 Comida',limit:300},{cat:'🏠 Vivienda',limit:700},{cat:'🚗 Transporte',limit:150},{cat:'🎮 Ocio',limit:100}];
  document.getElementById('budget-bars').innerHTML=budgets.map(b=>{
    const spent=cats[b.cat]||0;const pct=Math.min(100,Math.round(spent/b.limit*100));
    return \`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px"><span>\${b.cat}</span><span>\${fmt(spent)} / \${fmt(b.limit)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:\${pct}%;background:\${pct>90?'#ef4444':pct>70?'#f59e0b':'linear-gradient(90deg,${color},#a855f7)'}"></div></div></div>\`;
  }).join('');
}
function txHTML(t){
  const ico={income:'💚',expense:'🔴'}[t.type];
  return \`<div class="tx-item">
    <div class="tx-ico" style="background:rgba(255,255,255,.05)">\${t.cat.split(' ')[0]}</div>
    <div class="tx-info"><div class="tx-name">\${t.desc}</div><div class="tx-date">\${t.date} · \${t.cat}</div></div>
    <div class="tx-amount \${t.type==='income'?'income':'expense'}">\${t.type==='income'?'+':'-'}\${fmt(t.amount)}</div>
  </div>\`;
}
function renderAll(filter='all'){
  let list=txs;
  if(filter!=='all')list=txs.filter(t=>t.type===filter);
  document.getElementById('all-txs').innerHTML=list.length?list.map(txHTML).join(''):'<div style="text-align:center;padding:30px;color:#666">Sin transacciones</div>';
}

document.getElementById('save-tx').addEventListener('click',()=>{
  const desc=document.getElementById('new-desc').value.trim();
  const amount=parseFloat(document.getElementById('new-amount').value);
  const cat=document.getElementById('new-cat').value;
  if(!desc||!amount||amount<=0){toast('⚠️ Completa todos los campos');return;}
  txs.unshift({id:Date.now(),desc,amount,type:newType,cat,date:new Date().toISOString().split('T')[0]});
  save();document.getElementById('new-desc').value='';document.getElementById('new-amount').value='';
  toast(newType==='income'?'✅ Ingreso guardado':'✅ Gasto guardado');
  renderHome();
});

document.getElementById('btn-expense').addEventListener('click',()=>{newType='expense';document.getElementById('btn-expense').className='type-btn expense active';document.getElementById('btn-income').className='type-btn income';});
document.getElementById('btn-income').addEventListener('click',()=>{newType='income';document.getElementById('btn-income').className='type-btn income active';document.getElementById('btn-expense').className='type-btn expense';});

document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.className='type-btn');
    btn.className='type-btn active';
    renderAll(btn.dataset.filter);
  });
});

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec=btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(sec==='home')renderHome();
    if(sec==='txs')renderAll();
  });
});

renderHome();
</script>
</body>
</html>`;
}

function musicApp(name: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
:root{--bg:#0a0a0f;--card:#111128;--accent:${color};--text:#e0e0e0;}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:80px}
.section{display:none;padding:16px;max-width:480px;margin:0 auto}
.section.active{display:block}
header{background:var(--card);padding:16px;text-align:center;border-bottom:1px solid rgba(255,255,255,.07);position:sticky;top:0;z-index:10}
header h1{font-size:1.2rem;color:var(--accent)}
.now-playing{background:linear-gradient(135deg,#1a1a2e,${color}33);border-radius:16px;padding:20px;margin-bottom:16px;text-align:center;border:1px solid ${color}44}
.album-art{width:120px;height:120px;border-radius:12px;background:linear-gradient(135deg,${color},#a855f7);display:flex;align-items:center;justify-content:center;font-size:3rem;margin:0 auto 14px}
.song-title{font-size:1.1rem;font-weight:700;margin-bottom:4px}
.song-artist{color:#888;font-size:.85rem;margin-bottom:14px}
.progress-bar{background:rgba(255,255,255,.1);border-radius:8px;height:4px;margin-bottom:6px;cursor:pointer;position:relative}
.progress-fill{height:100%;background:var(--accent);border-radius:8px;width:35%}
.time{display:flex;justify-content:space-between;font-size:.72rem;color:#888;margin-bottom:14px}
.controls{display:flex;align-items:center;justify-content:center;gap:20px}
.ctrl-btn{background:none;border:none;color:#888;cursor:pointer;font-size:1.3rem;transition:.2s}
.ctrl-btn:hover{color:var(--accent)}
.ctrl-btn.play{width:52px;height:52px;border-radius:50%;background:var(--accent);color:white;font-size:1.5rem;display:flex;align-items:center;justify-content:center}
.song-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:.2s}
.song-item:hover{padding-left:4px}
.song-item.active .song-name{color:var(--accent)}
.song-item.active .song-num{color:var(--accent)}
.song-thumb{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0}
.song-num{width:20px;color:#555;font-size:.8rem;text-align:center;flex-shrink:0}
.song-name{flex:1;font-size:.88rem;font-weight:500}
.song-meta{font-size:.72rem;color:#888}
.song-dur{font-size:.75rem;color:#888;margin-left:auto}
.like-btn{background:none;border:none;cursor:pointer;font-size:1rem;margin-left:6px;transition:.2s}
.like-btn.liked{filter:drop-shadow(0 0 4px red)}
.playlist-card{background:var(--card);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:center;cursor:pointer;border:1px solid rgba(255,255,255,.06);transition:.2s}
.playlist-card:hover{border-color:var(--accent)}
.playlist-thumb{width:56px;height:56px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.8rem}
.input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.9rem;margin-bottom:10px}
.input:focus{outline:none;border-color:var(--accent)}
.nav{position:fixed;bottom:0;width:100%;background:var(--card);display:flex;justify-content:space-around;padding:10px 0;border-top:1px solid rgba(255,255,255,.07);z-index:100}
.nav-btn{background:none;border:none;color:#666;cursor:pointer;padding:4px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.65rem;transition:.2s}
.nav-btn.active,.nav-btn:hover{color:var(--accent)}
.nav-btn .ico{font-size:1.3rem}
.search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.9rem;margin-bottom:12px;width:100%}
.search:focus{outline:none;border-color:var(--accent)}
</style>
</head>
<body>
<header><h1>🎵 ${name}</h1></header>

<div class="section active" id="sec-player">
  <div class="now-playing">
    <div class="album-art" id="np-art">🎵</div>
    <div class="song-title" id="np-title">Selecciona una canción</div>
    <div class="song-artist" id="np-artist">—</div>
    <div class="progress-bar"><div class="progress-fill" id="np-progress"></div></div>
    <div class="time"><span id="np-cur">0:00</span><span id="np-dur">0:00</span></div>
    <div class="controls">
      <button class="ctrl-btn" id="btn-shuffle">🔀</button>
      <button class="ctrl-btn" id="btn-prev">⏮</button>
      <button class="ctrl-btn play" id="btn-play">▶</button>
      <button class="ctrl-btn" id="btn-next">⏭</button>
      <button class="ctrl-btn" id="btn-repeat">🔁</button>
    </div>
  </div>
  <h2 style="font-size:.9rem;color:#aaa;margin-bottom:8px">REPRODUCIENDO AHORA</h2>
  <div id="queue-list"></div>
</div>

<div class="section" id="sec-explore">
  <input class="search" id="search-songs" placeholder="🔍 Buscar canciones, artistas...">
  <div id="explore-list"></div>
</div>

<div class="section" id="sec-playlists">
  <h2 style="font-size:1rem;margin-bottom:12px">Mis Playlists</h2>
  <div id="playlists-list"></div>
</div>

<div class="section" id="sec-liked">
  <h2 style="font-size:1rem;margin-bottom:12px">❤️ Canciones favoritas</h2>
  <div id="liked-list"></div>
</div>

<nav class="nav">
  <button class="nav-btn active" data-sec="player"><span class="ico">🎵</span>Player</button>
  <button class="nav-btn" data-sec="explore"><span class="ico">🔍</span>Explorar</button>
  <button class="nav-btn" data-sec="playlists"><span class="ico">📋</span>Playlists</button>
  <button class="nav-btn" data-sec="liked"><span class="ico">❤️</span>Favoritos</button>
</nav>

<script>
const SONGS=[
  {id:1,title:'Acid Rain',artist:'Joan aka R3DMOON',album:'3lectronica Vol.1',dur:'4:23',art:'🎛️',genre:'techno'},
  {id:2,title:'Hypnotic Loop 003',artist:'Joan aka R3DMOON',album:'Minimal Sessions',dur:'6:10',art:'🌀',genre:'minimal'},
  {id:3,title:'Dark Matter',artist:'R3DM',album:'Experimental Beats',dur:'5:47',art:'🌑',genre:'experimental'},
  {id:4,title:'Synthetic Dreams',artist:'J.Quasar',album:'Acid Sessions',dur:'4:55',art:'⚡',genre:'acid'},
  {id:5,title:'Pulse Wave',artist:'Joan aka R3DMOON',album:'3lectronica Vol.2',dur:'7:02',art:'📡',genre:'techno'},
  {id:6,title:'Resonance',artist:'R3DM',album:'Deep Sounds',dur:'5:18',art:'🔊',genre:'minimal'},
  {id:7,title:'Circuit Breaker',artist:'J.Quasar',album:'Acid Sessions',dur:'4:41',art:'💡',genre:'acid'},
  {id:8,title:'Neural Pattern',artist:'Joan aka R3DMOON',album:'Minimal Sessions',dur:'6:33',art:'🧠',genre:'experimental'},
  {id:9,title:'Phase Shift',artist:'R3DM',album:'3lectronica Vol.1',dur:'5:05',art:'🔄',genre:'techno'},
  {id:10,title:'Void Walker',artist:'J.Quasar',album:'Dark Sessions',dur:'8:12',art:'🚀',genre:'minimal'},
];
const PLAYLISTS=[
  {name:'Acid Techno Mix',emoji:'🎛️',songs:[1,4,7],color:'#7c3aed'},
  {name:'Late Night Minimal',emoji:'🌙',songs:[2,6,10],color:'#1d4ed8'},
  {name:'Experimental Vibes',emoji:'🌀',songs:[3,8,5],color:'#059669'},
  {name:'Sesión de Estudio',emoji:'📚',songs:[6,2,9,10],color:'#b45309'},
];
const LIKED_KEY='nexusai_liked';
let liked=new Set(JSON.parse(localStorage.getItem(LIKED_KEY)||'[]'));
let currentIdx=0;let isPlaying=false;let progress=0;let interval=null;

function saveLiked(){localStorage.setItem(LIKED_KEY,JSON.stringify([...liked]));}
function songHTML(s,i,showNum=true){
  const isLiked=liked.has(s.id);
  const isCurrent=i===currentIdx;
  return \`<div class="song-item \${isCurrent?'active':''}" data-idx="\${i}">
    \${showNum?\`<span class="song-num">\${isCurrent?'▶':i+1}</span>\`:''}
    <div class="song-thumb" style="background:linear-gradient(135deg,${color}33,#a855f733)">\${s.art}</div>
    <div style="flex:1;min-width:0"><div class="song-name">\${s.title}</div><div class="song-meta">\${s.artist} · \${s.album}</div></div>
    <span class="song-dur">\${s.dur}</span>
    <button class="like-btn \${isLiked?'liked':''}" data-like="\${s.id}" onclick="event.stopPropagation()">\${isLiked?'❤️':'🤍'}</button>
  </div>\`;
}
function loadSong(idx){
  currentIdx=idx;
  const s=SONGS[idx];
  document.getElementById('np-art').textContent=s.art;
  document.getElementById('np-title').textContent=s.title;
  document.getElementById('np-artist').textContent=s.artist+' · '+s.album;
  document.getElementById('np-dur').textContent=s.dur;
  progress=0;document.getElementById('np-progress').style.width='0%';
  document.getElementById('np-cur').textContent='0:00';
  renderQueue();
}
function renderQueue(){
  document.getElementById('queue-list').innerHTML=SONGS.map((s,i)=>songHTML(s,i)).join('');
  attachSongClicks('queue-list');
  attachLikeClicks('queue-list');
}
function renderExplore(q=''){
  let list=SONGS;if(q)list=SONGS.filter(s=>s.title.toLowerCase().includes(q)||s.artist.toLowerCase().includes(q)||s.genre.includes(q));
  document.getElementById('explore-list').innerHTML=list.length?list.map((s,i)=>songHTML(s,i,false)).join(''):'<div style="text-align:center;padding:30px;color:#666">Sin resultados</div>';
  attachSongClicks('explore-list');attachLikeClicks('explore-list');
}
function renderPlaylists(){
  document.getElementById('playlists-list').innerHTML=PLAYLISTS.map(p=>\`
    <div class="playlist-card">
      <div class="playlist-thumb" style="background:\${p.color}33">\${p.emoji}</div>
      <div><div style="font-weight:600;font-size:.95rem">\${p.name}</div><div style="color:#888;font-size:.78rem">\${p.songs.length} canciones</div></div>
    </div>\`).join('');
}
function renderLiked(){
  const likedSongs=SONGS.filter(s=>liked.has(s.id));
  document.getElementById('liked-list').innerHTML=likedSongs.length?likedSongs.map((s,i)=>songHTML(s,SONGS.indexOf(s),false)).join(''):'<div style="text-align:center;padding:30px;color:#666">Aún no tienes favoritos ❤️</div>';
  if(likedSongs.length){attachSongClicks('liked-list');attachLikeClicks('liked-list');}
}
function attachSongClicks(containerId){
  document.getElementById(containerId).querySelectorAll('.song-item').forEach(el=>{
    el.addEventListener('click',()=>{loadSong(+el.dataset.idx);if(!isPlaying)togglePlay();});
  });
}
function attachLikeClicks(containerId){
  document.getElementById(containerId).querySelectorAll('.like-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=+btn.dataset.like;
      if(liked.has(id)){liked.delete(id);btn.textContent='🤍';btn.classList.remove('liked');}
      else{liked.add(id);btn.textContent='❤️';btn.classList.add('liked');}
      saveLiked();
    });
  });
}
function togglePlay(){
  isPlaying=!isPlaying;
  document.getElementById('btn-play').textContent=isPlaying?'⏸':'▶';
  if(isPlaying){
    interval=setInterval(()=>{
      progress+=0.5;if(progress>100){progress=0;currentIdx=(currentIdx+1)%SONGS.length;loadSong(currentIdx);}
      document.getElementById('np-progress').style.width=progress+'%';
      const total=250;const cur=Math.round(total*progress/100);
      document.getElementById('np-cur').textContent=Math.floor(cur/60)+':'+(cur%60).toString().padStart(2,'0');
    },500);
  }else clearInterval(interval);
}
document.getElementById('btn-play').addEventListener('click',togglePlay);
document.getElementById('btn-next').addEventListener('click',()=>{currentIdx=(currentIdx+1)%SONGS.length;loadSong(currentIdx);});
document.getElementById('btn-prev').addEventListener('click',()=>{currentIdx=(currentIdx-1+SONGS.length)%SONGS.length;loadSong(currentIdx);});
document.getElementById('search-songs').addEventListener('input',e=>renderExplore(e.target.value.toLowerCase()));

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const sec=btn.dataset.sec;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+sec).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(sec==='explore')renderExplore();
    if(sec==='playlists')renderPlaylists();
    if(sec==='liked')renderLiked();
  });
});

loadSong(0);
</script>
</body>
</html>`;
}

// ── Paso principal ───────────────────────────────────────────
type Step = { id: string; name: string; status: "pending"|"running"|"done"|"error" };

const STEPS: Step[] = [
  { id: "analyze", name: "Analizando prompt", status: "pending" },
  { id: "generate", name: "Generando app con IA", status: "pending" },
  { id: "inject", name: "Integrando AdMob + Chat IA", status: "pending" },
  { id: "save", name: "Guardando app", status: "pending" },
];

export default function Builder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [prompt, setPrompt] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [steps, setSteps] = useState<Step[]>(STEPS.map(s => ({ ...s })));
  const [log, setLog] = useState<string[]>([]);
  const [html, setHtml] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [viewMode, setViewMode] = useState<"mobile"|"desktop">("desktop");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [showCode, setShowCode] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isFeedback, setIsFeedback] = useState(false);
  const [appName, setAppName] = useState("");

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const setStep = (id: string, status: Step["status"]) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  // Renderizar HTML en el iframe via contentDocument.write (único método 100% fiable)
  const prevHtmlRef = useRef("");
  useEffect(() => {
    if (!html || html === prevHtmlRef.current) return;
    prevHtmlRef.current = html;
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Método 1: contentDocument.write — funciona en todos los browsers
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        return;
      }
    } catch (_) {}
    // Método 2: srcdoc como fallback
    iframe.srcdoc = html;
  }, [html]);

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    // ── Muro de créditos (desactivado — acceso libre) ────
    setIsBuilding(true);
    setFinalized(false);
    setIsLive(false);
    setLog([]);
    setSteps(STEPS.map(s => ({ ...s })));
    setHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{background:#0a0a0f;color:#888;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:12px}</style></head><body><div style="font-size:2rem">🔨</div><p>Construyendo tu app...</p></body></html>`);
    const rawName = prompt.trim().split(" ").slice(0, 4).join(" ");
    setAppName(rawName);

    try {
      // ── 1. Analizar ──────────────────────────────────────
      setStep("analyze", "running");
      addLog("🔍 Analizando prompt...");
      let meta: any = { name: rawName, category: "general", color: "#7c3aed", features: [] };
      try {
        const raw = await callGroq(
          'Analiza el prompt y responde ÚNICAMENTE con JSON válido (sin texto extra, sin markdown):\n{"name":"nombre corto de la app","category":"categoria en una palabra","color":"color hex acorde a la app","features":["feature1","feature2","feature3"]}',
          prompt.trim(), 300
        );
        const m = raw.match(/\{[\s\S]*?\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          meta = { ...meta, ...parsed };
        }
      } catch (e) {
        addLog("⚠️ Usando configuración por defecto");
      }
      setStep("analyze", "done");
      addLog(`✅ App: "${meta.name}" | Categoría: ${meta.category}`);

      // ── 2. Generar HTML ──────────────────────────────────
      setStep("generate", "running");
      addLog("⚡ Generando app con IA (puede tardar ~30s)...");

      const sysPrompt = `Eres un experto desarrollador web. Genera una app web HTML completa y funcional.

REGLAS CRÍTICAS:
1. Tu respuesta empieza EXACTAMENTE con: <!DOCTYPE html>
2. Tu respuesta termina EXACTAMENTE con: </html>
3. CERO texto antes del DOCTYPE. CERO texto o notas después de </html>.
4. CSS en <style> dentro de <head>. JS en <script> antes de </body>.
5. Sin archivos externos excepto Google Fonts.

DISEÑO:
- Dark theme: :root{--bg:#0a0a0f;--card:#111128;--accent:${meta.color};}
- Mobile-first, Poppins de Google Fonts
- Bottom navigation con 4 secciones y emojis
- Tarjetas con border-radius:12px y sombras

CONTENIDO REAL:
- Al menos 8-10 items de datos de ejemplo inventados pero realistas y específicos
- Navegación JS entre secciones (show/hide, sin recarga)
- Formulario funcional que añade items
- Búsqueda y filtros funcionales
- localStorage para persistir datos
- Métricas en el dashboard que se actualicen

SECCIONES (exactamente 4):
1. 🏠 Dashboard — métricas/estadísticas + items recientes
2. 📋 Explorar — lista completa con buscador y filtros funcionales  
3. ➕ Crear — formulario completo con validación
4. ⚙️ Perfil — configuración guardada en localStorage`;

      const userMsg = `App: "${meta.name}" | Categoría: ${meta.category} | Color: ${meta.color}
Features: ${meta.features.join(", ") || "interfaz moderna, datos reales"}
Petición del usuario: "${prompt.trim()}"

IMPORTANTE: Genera datos de ejemplo MUY específicos para esta app (nombres, valores, fechas reales). No uses placeholders genéricos.`;

      let finalHtml = "";
      let usedFallback = false;

      try {
        const raw = await callGroq(sysPrompt, userMsg, 16000);
        addLog(`📥 Respuesta recibida (${raw.length} chars)`);
        finalHtml = extractHTML(raw, meta.name, meta.color);
        if (finalHtml.length < 500) throw new Error("HTML demasiado corto");
        addLog("✅ HTML extraído correctamente");
      } catch (e: any) {
        addLog(`⚠️ IA: ${e.message} — usando app prediseñada`);
        // Pasar también la categoría del análisis para mejorar la detección
        finalHtml = localApp(meta.name, prompt + " " + (meta.category || ""));
        usedFallback = true;
      }
      setStep("generate", "done");
      addLog(usedFallback ? "✅ App prediseñada generada" : "✅ App generada por IA");

      // ── 3. Inyectar monetización ─────────────────────────
      setStep("inject", "running");
      addLog("💰 Inyectando AdMob + Chat IA + Amazon...");
      finalHtml = injectAds(finalHtml);
      setStep("inject", "done");
      addLog("✅ AdMob banner, Chat IA y Amazon integrados");

      // Mostrar preview
      setHtml(finalHtml);
      setIsLive(true);
      addLog("🎨 Preview lista — interactúa con la app");

      // ── 4. Guardar en Supabase ───────────────────────────
      setStep("save", "running");
      if (user) {
        try {
          const id = crypto.randomUUID();
          await dbSaveApp({
            id,
            user_id: user.id || user.email,
            user_email: user.email,
            name: meta.name,
            description: prompt.trim().slice(0, 300),
            html_code: finalHtml,
          });
          addLog(`💾 Guardada: "${meta.name}"`);
          // Descontar crédito al usuario (no admin)
          if (user.role !== "admin") {
            const newCredits = Math.max(0, (user.credits ?? 1) - 1);
            await supabaseAdmin.from("users").update({ credits: newCredits }).eq("id", user.id).catch(console.error);
          }
        } catch (e: any) { addLog("⚠️ No se pudo guardar: " + (e?.message || "")); }
      }
      setStep("save", "done");
      setFinalized(true);
      addLog("🎉 ¡App lista para publicar!");

    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // ── Feedback ──────────────────────────────────────────────
  const handleFeedback = async () => {
    if (!feedback.trim() || !html || isFeedback) return;
    setIsFeedback(true);
    addLog(`💬 Aplicando: "${feedback.slice(0, 50)}..."`);
    try {
      const raw = await callGroq(
        `Eres un modificador de HTML. El usuario pide un cambio sobre la app.
Responde ÚNICAMENTE con el HTML modificado completo.
Empieza con <!DOCTYPE html>. Termina con </html>.
CERO texto extra. CERO explicaciones.`,
        `HTML ACTUAL:\n${html.slice(0, 12000)}\n\nCAMBIO SOLICITADO:\n${feedback.trim()}`,
        16000
      );
      const modified = extractHTML(raw, appName);
      if (modified.length > 500) {
        setHtml(modified);
        addLog("✅ Cambio aplicado");
        setFeedback("");
      } else {
        addLog("⚠️ No se pudo aplicar el cambio");
      }
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setIsFeedback(false);
    }
  };

  const downloadHTML = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${appName || "nexusai-app"}.html`;
    a.click();
  };

  // ── Modal Paywall ────────────────────────────────────────
  const PaywallModal = () => (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,
      display:paywallOpen?"flex":"none",alignItems:"center",justifyContent:"center"
    }}>
      <div style={{
        background:"#111128",border:"1px solid #7c3aed",borderRadius:16,
        padding:32,maxWidth:380,width:"90%",textAlign:"center",color:"#fff"
      }}>
        <div style={{fontSize:48,marginBottom:8}}>⚡</div>
        <h2 style={{margin:"0 0 8px",fontSize:22,color:"#a78bfa"}}>Sin créditos</h2>
        <p style={{color:"#888",margin:"0 0 20px",fontSize:14}}>
          Necesitas créditos para generar apps.<br/>
          Con el Plan Pro tienes <strong style={{color:"#fff"}}>créditos ilimitados</strong> por solo <strong style={{color:"#a78bfa"}}>€2.99/mes</strong>.
        </p>
        <a
          href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions&business=joanlazaro83%40gmail.com&item_name=NexusAI+Pro&item_number=pro_monthly&amount=2.99&currency_code=EUR&src=1&sra=1&t3=M&p3=1&no_note=1&return=https://nexusia-three.vercel.app&cancel_return=https://nexusia-three.vercel.app"
          target="_blank"
          rel="noopener"
          style={{
            display:"block",background:"#003087",color:"#fff",padding:"12px 24px",
            borderRadius:8,textDecoration:"none",fontWeight:700,fontSize:15,marginBottom:12
          }}
          onClick={() => setPaywallOpen(false)}
        >
          💳 Suscribirse con PayPal — €2.99/mes
        </a>
        <button
          onClick={() => setPaywallOpen(false)}
          style={{background:"transparent",border:"1px solid #333",color:"#888",
            padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:13}}
        >
          Cancelar
        </button>
      </div>
    </div>
  );


  return (
    <>
    <PaywallModal />
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0f", color: "#e0e0e0", fontFamily: "system-ui, sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111128", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrainCircuit size={20} color="#7c3aed" />
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Builder Avanzado</span>
          {isLive && <span style={{ background: "rgba(34,197,94,.15)", color: "#22c55e", fontSize: ".7rem", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>● LIVE</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCode(!showCode)} style={{ background: showCode ? "#7c3aed" : "rgba(255,255,255,0.07)", border: "none", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: ".8rem", display: "flex", alignItems: "center", gap: 4 }}>
            <Code2 size={14} /> {showCode ? "Preview" : "HTML"}
          </button>
          <button onClick={() => setViewMode(v => v === "mobile" ? "desktop" : "mobile")} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "white", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: ".8rem", display: "flex", alignItems: "center", gap: 4 }}>
            {viewMode === "mobile" ? <Monitor size={14} /> : <Smartphone size={14} />}
          </button>
          {finalized && (
            <button onClick={downloadHTML} style={{ background: "rgba(34,197,94,.15)", border: "none", color: "#22c55e", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: ".8rem", display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={14} /> HTML
            </button>
          )}
          <button onClick={() => navigate("/dashboard")} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#aaa", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: ".8rem" }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── CUERPO ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>

        {/* PANEL IZQUIERDO */}
        <div style={{ width: isMobile ? "100%" : 300, minWidth: isMobile ? "auto" : 300, maxHeight: isMobile ? "auto" : "100%", borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.07)", borderBottom: isMobile ? "1px solid rgba(255,255,255,0.07)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d0d1a" }}>

          {/* Prompt */}
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: ".78rem", color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Describe tu app</div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleBuild(); }}
              placeholder="Ej: App de recetas de cocina con categorías, favoritos y lista de la compra..."
              rows={4}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: ".88rem", resize: "none", outline: "none", lineHeight: 1.5 }}
            />
            <button
              onClick={handleBuild}
              disabled={isBuilding || !prompt.trim()}
              style={{ width: "100%", padding: "11px", background: isBuilding ? "#333" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 10, color: "white", fontWeight: 600, fontSize: ".9rem", cursor: isBuilding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}
            >
              {isBuilding ? <><Loader2 size={16} className="animate-spin" /> Construyendo...</> : <><Send size={15} /> Construir (Ctrl+Enter)</>}
            </button>
          </div>

          {/* Pasos */}
          {steps.some(s => s.status !== "pending") && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: ".75rem", color: "#888", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Progreso</div>
              {steps.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                  <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {s.status === "done" ? <Check size={16} color="#22c55e" /> : s.status === "running" ? <Loader2 size={16} color="#7c3aed" style={{ animation: "spin 1s linear infinite" }} /> : s.status === "error" ? <span style={{ color: "#ef4444" }}>✕</span> : <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #444" }} />}
                  </div>
                  <span style={{ fontSize: ".82rem", color: s.status === "running" ? "#a78bfa" : s.status === "done" ? "#4ade80" : "#666" }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Feedback */}
          {finalized && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: ".75rem", color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Modificar app</div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Ej: Cambia el color a azul, añade sección de contacto..."
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: ".82rem", resize: "none", outline: "none" }}
              />
              <button
                onClick={handleFeedback}
                disabled={isFeedback || !feedback.trim()}
                style={{ width: "100%", padding: "8px", background: isFeedback ? "#333" : "#1a1a3e", border: "1px solid rgba(124,58,237,.4)", borderRadius: 8, color: "#a78bfa", fontWeight: 500, fontSize: ".82rem", cursor: isFeedback ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}
              >
                {isFeedback ? <><Loader2 size={14} /> Aplicando...</> : <><MessageSquare size={14} /> Aplicar cambio</>}
              </button>
            </div>
          )}

          {/* Log */}
          <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
            {log.length > 0 && (
              <>
                <div style={{ fontSize: ".73rem", color: "#666", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Log</div>
                {log.map((l, i) => (
                  <div key={i} style={{ fontSize: ".74rem", color: "#666", padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", lineHeight: 1.4 }}>{l}</div>
                ))}
              </>
            )}
            {log.length === 0 && !isBuilding && (
              <div style={{ textAlign: "center", padding: "20px 10px", color: "#444", fontSize: ".82rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>✨</div>
                <p>Describe tu app y pulsa Construir</p>
                <p style={{ marginTop: 6, fontSize: ".75rem" }}>La IA generará una app completa con AdMob, Amazon y Chat IA integrados</p>
              </div>
            )}
          </div>
        </div>

        {/* PREVIEW */}
        <div style={{ flex: 1, display: isMobile && !html ? "none" : "flex", minHeight: isMobile ? 300 : "auto", alignItems: "center", justifyContent: "center", background: "#06060f", overflow: "hidden", padding: viewMode === "mobile" ? 20 : 0 }}>
          {showCode ? (
            <pre style={{ width: "100%", height: "100%", overflow: "auto", padding: 20, fontSize: ".75rem", color: "#a78bfa", background: "#06060f", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {html || "// El código aparecerá aquí"}
            </pre>
          ) : (
            <div style={viewMode === "mobile" ? { width: 375, height: 700, borderRadius: 32, overflow: "hidden", border: "4px solid #1a1a2e", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" } : { width: "100%", height: "100%" }}>
              <iframe
                ref={iframeRef}
                title="NexusAI Preview"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: viewMode === "mobile" ? 28 : 0, background: "#0a0a0f" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
    </>
  );
}

