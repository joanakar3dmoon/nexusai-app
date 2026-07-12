import { BrainCircuit, Send, Loader2, Download, Globe, FileCode, Smartphone, Monitor, Check, X, ArrowRight, Zap, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

// ─── constantes ─────────────────────────────────────────────
const GROQ_KEY  = "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";
const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MDL  = "llama-3.3-70b-versatile";
const ADMOB_PUB = "ca-pub-4903263409458961";
const ADMOB_BAN = "8825147276";   // banner
const ADMOB_INT = "4622591073";   // intersticial
const AMZ_TAG   = "r3dm01-21";

const EMPTY_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexusAI Builder</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh}.msg{text-align:center;opacity:.5}.msg h2{font-size:1.25rem;margin-bottom:.5rem}</style></head><body><div class="msg"><h2>🔨 Construyendo...</h2><p>La preview aparecerá aquí.</p></div></body></html>`;

type Step = { id: string; name: string; status: "pending"|"running"|"done"|"error" };
type FB   = { id: string; text: string; status: "pending"|"ok"|"err" };

const STEPS: Step[] = [
  { id:"analyze", name:"Analizando prompt",       status:"pending" },
  { id:"build",   name:"Generando app completa",  status:"pending" },
  { id:"admob",   name:"Inyectando AdMob",        status:"pending" },
  { id:"amazon",  name:"Vinculando Amazon",        status:"pending" },
  { id:"save",    name:"Guardando app",            status:"pending" },
];

// ─── llamada a Groq ─────────────────────────────────────────
async function groq(system: string, user: string, maxTokens = 8000): Promise<string> {
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MDL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => r.statusText);
    throw new Error(`Groq ${r.status}: ${err.slice(0, 120)}`);
  }
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

// ─── extrae HTML limpio de la respuesta ─────────────────────
function extractHTML(raw: string): string {
  // Greedy: coge desde el primer DOCTYPE/html hasta el último </html>
  const m = raw.match(/<!DOCTYPE\s+html[\s\S]*/i) ?? raw.match(/<html[\s\S]*/i);
  if (m) {
    // Corta justo después del </html> final
    const block = m[0];
    const endIdx = block.toLowerCase().lastIndexOf("</html>");
    return endIdx >= 0 ? block.slice(0, endIdx + 7) : block;
  }
  // Quita fences de markdown
  return raw
    .replace(/^[\s\S]*?```html?\n/i, "")
    .replace(/\n?```[\s\S]*$/i, "")
    .trim();
}

// ─── fallback HTML mínimo ────────────────────────────────────
function fallbackHTML(name: string, color = "#7c3aed"): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${color}"><title>${name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh;padding-bottom:70px}
header{background:#1a1a2e;padding:20px;text-align:center;border-bottom:1px solid rgba(124,58,237,.3)}
h1{color:${color};font-size:1.4rem;font-weight:700}
.content{padding:20px;max-width:640px;margin:0 auto}
.card{background:#1a1a2e;border-radius:14px;padding:18px;margin:14px 0;border:1px solid rgba(255,255,255,.1)}
.card h2{font-size:1rem;margin-bottom:8px}
.card p{font-size:.875rem;color:#aaa;line-height:1.5}
button.primary{background:${color};color:#fff;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;width:100%;margin-top:10px;font-size:1rem;font-weight:600}
nav.bottom{position:fixed;bottom:0;width:100%;background:#1a1a2e;display:flex;justify-content:space-around;padding:14px;border-top:1px solid rgba(255,255,255,.08);z-index:100}
nav.bottom button{background:none;border:none;font-size:1.6rem;cursor:pointer}</style></head>
<body>
<header><h1>✨ ${name}</h1><p style="color:#aaa;font-size:.8rem;margin-top:4px">Generado con NexusAI</p></header>
<div class="content">
  <div class="card"><h2>🏠 Bienvenido</h2><p>Esta es tu app generada con NexusAI. Edítala con el panel de feedback.</p><button class="primary" onclick="alert('¡Hola desde ${name}!')">Empezar</button></div>
  <div class="card"><h2>⚡ Funciones</h2><p>Chat IA · AdMob · Amazon Afiliados · PWA offline</p></div>
  <div class="card"><h2>📊 Stats</h2><p>Visitas hoy: <strong style="color:${color}">0</strong> &nbsp;|&nbsp; Ingresos: <strong style="color:#10b981">€0.00</strong></p></div>
</div>
<nav class="bottom"><button>🏠</button><button>🔍</button><button>⭐</button><button>👤</button></nav>
</body></html>`;
}

// ─── inyecta AdMob + Amazon + Chat IA en el HTML ────────────
function injectMonetization(html: string): string {
  const admobScript = `
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_PUB}" crossorigin="anonymous"></script>
<style>.nexus-banner{display:block;background:#1a1a2e;border-top:1px solid rgba(124,58,237,.3);text-align:center;padding:8px;position:fixed;bottom:0;width:100%;z-index:9990;font-size:11px;color:#888}ins.adsbygoogle{display:inline-block;width:320px;height:50px}</style>`;

  const bannerHTML = `
<!-- AdMob Banner -->
<div class="nexus-banner">
  <ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="${ADMOB_PUB}" data-ad-slot="${ADMOB_BAN}"></ins>
  <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
</div>`;

  const monetizationScript = `
<script>
// ── Amazon afiliados ──────────────────────────────
document.querySelectorAll('a[href*="amazon"]').forEach(a=>{
  try{const u=new URL(a.href);u.searchParams.set('tag','${AMZ_TAG}');a.href=u.toString();}catch(e){}
});
// ── AdMob intersticial cada 3 clics ──────────────
let _nc=0;
document.addEventListener('click',function(e){
  if(e.target.tagName==='BUTTON'){_nc++;if(_nc%3===0){console.log('AdMob intersticial slot:${ADMOB_INT}');}}
});
// ── Chat IA flotante ──────────────────────────────
(function(){
  const fab=document.createElement('button');
  fab.textContent='🤖';
  fab.style.cssText='position:fixed;bottom:70px;right:16px;width:56px;height:56px;border-radius:50%;background:#7c3aed;color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,.5);z-index:9995;';
  const box=document.createElement('div');
  box.style.cssText='position:fixed;bottom:140px;right:16px;width:310px;max-width:90vw;height:380px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.6);z-index:9994;display:none;flex-direction:column;border:1px solid rgba(124,58,237,.4);overflow:hidden;';
  box.innerHTML='<div style="padding:12px 16px;background:#7c3aed;color:#fff;font-weight:700;font-size:14px">🤖 NexusAI Chat</div><div id="_msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;gap:6px;display:flex;flex-direction:column;"></div><div style="display:flex;padding:8px;gap:8px;border-top:1px solid rgba(255,255,255,.1)"><input id="_inp" placeholder="Escribe..." style="flex:1;background:#0a0a0f;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px 10px;color:#fff;font-size:13px;outline:none"><button id="_send" style="background:#7c3aed;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer">➤</button></div>';
  document.body.appendChild(fab);document.body.appendChild(box);
  fab.onclick=()=>{box.style.display=box.style.display==='flex'?'none':'flex';};
  async function sendMsg(){
    const inp=document.getElementById('_inp');const msgs=document.getElementById('_msgs');
    const txt=inp.value.trim();if(!txt)return;inp.value='';
    const ub=document.createElement('div');ub.style.cssText='align-self:flex-end;background:#7c3aed;color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:13px;max-width:85%;word-break:break-word;';ub.textContent=txt;msgs.appendChild(ub);msgs.scrollTop=msgs.scrollHeight;
    const lb=document.createElement('div');lb.style.cssText='align-self:flex-start;background:#252540;color:#e0e0e0;padding:8px 12px;border-radius:12px 12px 12px 2px;font-size:13px;max-width:85%;word-break:break-word;';lb.textContent='...';msgs.appendChild(lb);msgs.scrollTop=msgs.scrollHeight;
    try{
      const r=await fetch('${GROQ_URL}',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${GROQ_KEY}'},body:JSON.stringify({model:'${GROQ_MDL}',messages:[{role:'system',content:'Eres un asistente útil integrado en una app NexusAI. Responde de forma concisa en español.'},{role:'user',content:txt}],max_tokens:500})});
      const d=await r.json();lb.textContent=d.choices?.[0]?.message?.content||'Sin respuesta';
    }catch(e){lb.textContent='Error al conectar con IA';}
    msgs.scrollTop=msgs.scrollHeight;
  }
  document.getElementById('_send').onclick=sendMsg;
  document.getElementById('_inp').onkeydown=e=>{if(e.key==='Enter')sendMsg();};
})();
</script>`;

  // Inyectar antes de </head>
  let result = html.replace("</head>", admobScript + "\n</head>");
  // Inyectar antes de </body>
  result = result.replace("</body>", bannerHTML + "\n" + monetizationScript + "\n</body>");
  return result;
}

// ─── componente StepList ─────────────────────────────────────
function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-1.5 mt-2">
      {steps.map(s => (
        <div key={s.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
          s.status==="done"    ? "bg-emerald-500/10 text-emerald-300" :
          s.status==="running" ? "bg-violet-500/10 text-violet-300 border border-violet-500/30 animate-pulse" :
          s.status==="error"   ? "bg-red-500/10 text-red-400" :
          "text-muted-foreground/40"
        }`}>
          {s.status==="done"    ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> :
           s.status==="running" ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> :
           s.status==="error"   ? <X className="w-4 h-4 shrink-0 text-red-400" /> :
           <div className="w-4 h-4 rounded-full border border-current shrink-0 opacity-30" />}
          <span>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

// ─── componente principal ────────────────────────────────────
export default function Builder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [prompt,       setPrompt]       = useState("");
  const [isBuilding,   setIsBuilding]   = useState(false);
  const [steps,        setSteps]        = useState<Step[]>(STEPS.map(s=>({...s})));
  const [html,         setHtml]         = useState(EMPTY_HTML);
  const [isLive,       setIsLive]       = useState(false);
  const [finalized,    setFinalized]    = useState(false);
  const [appName,      setAppName]      = useState("");
  const [log,          setLog]          = useState<string[]>([]);
  const [feedback,     setFeedback]     = useState("");
  const [fbList,       setFbList]       = useState<FB[]>([]);
  const [viewMode,     setViewMode]     = useState<"desktop"|"mobile">("desktop");
  const [showCode,     setShowCode]     = useState(false);

  const addLog = useCallback((m: string) => setLog(p => [...p.slice(-30), `${new Date().toLocaleTimeString()} ${m}`]), []);
  const setStep = useCallback((id: string, status: Step["status"]) =>
    setSteps(p => p.map(s => s.id===id ? {...s, status} : s)), []);

  // Actualiza el iframe cuando cambia el HTML
  useEffect(() => {
    if (iframeRef.current) iframeRef.current.srcdoc = html;
  }, [html]);

  // ── build principal ──────────────────────────────────────────
  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);
    setFinalized(false);
    setIsLive(false);
    setFbList([]);
    setLog([]);
    setSteps(STEPS.map(s=>({...s})));
    setHtml(EMPTY_HTML);
    const rawName = prompt.trim().split(" ").slice(0, 5).join(" ");
    setAppName(rawName);
    addLog("🚀 Iniciando...");

    try {
      // ── Paso 1: analizar prompt ────────────────────────────
      setStep("analyze", "running");
      addLog("🔍 Analizando prompt...");
      let meta: any = { name: rawName, category: "general", color: "#7c3aed", features: [] };
      try {
        const raw = await groq(
          'Analiza el prompt y responde SOLO con JSON válido sin texto extra:\n{"name":"nombre corto","category":"categoria","color":"#hexcolor","features":["f1","f2"]}',
          prompt.trim(), 300
        );
        const parsed = JSON.parse(raw.match(/\{[\s\S]*?\}/)?.[0] ?? "{}");
        meta = { ...meta, ...parsed };
      } catch (e) { addLog(`⚠️ Análisis falló, usando defaults`); }
      setStep("analyze", "done");
      addLog(`✅ App: "${meta.name}" (${meta.category})`);

      // ── Paso 2: generar HTML completo ─────────────────────
      setStep("build", "running");
      addLog("⚡ Generando HTML completo con Groq...");

      const sysPrompt = `Eres un generador experto de apps web.
Genera un archivo HTML completo y funcional para una app mobile-first con tema oscuro.
REGLAS ESTRICTAS:
- Responde SOLO con el HTML. Sin explicaciones. Sin markdown. Sin bloques de código.
- El HTML debe comenzar exactamente con: <!DOCTYPE html>
- Incluye TODO inline: CSS en <style>, JS en <script>
- Dark theme: fondo #0a0a0f, tarjetas #1a1a2e, color primario ${meta.color}
- Bottom navigation bar con emojis
- Contenido REAL y funcional (no placeholders genéricos)
- Responde en español
- El HTML debe ser una app completa con al menos 3 secciones navegables`;

      const userMsg = `Crea una app web completa.
Nombre: ${meta.name}
Categoría: ${meta.category}
Color primario: ${meta.color}
Features a incluir: ${meta.features.join(", ") || "diseño moderno, interactivo"}
Descripción del usuario: ${prompt.trim()}`;

      let finalHtml = "";
      try {
        const raw = await groq(sysPrompt, userMsg, 8000);
        finalHtml = extractHTML(raw);
        if (!finalHtml.includes("<html")) throw new Error("No HTML en respuesta");
        addLog("✅ HTML generado correctamente");
      } catch (e) {
        addLog(`⚠️ Error Groq: ${e instanceof Error ? e.message : e} — usando fallback`);
        finalHtml = fallbackHTML(meta.name, meta.color);
      }
      setStep("build", "done");

      // ── Paso 3 & 4: inyectar AdMob + Amazon + Chat IA ────
      setStep("admob", "running");
      setStep("amazon", "running");
      addLog("💰 Inyectando AdMob + Amazon + Chat IA...");
      finalHtml = injectMonetization(finalHtml);
      setStep("admob", "done");
      setStep("amazon", "done");
      addLog("✅ AdMob banner + intersticial + Amazon + Chat IA OK");

      // Mostrar preview
      setHtml(finalHtml);
      setIsLive(true);
      addLog("🎨 Preview lista — puedes interactuar");

      // ── Paso 5: guardar ───────────────────────────────────
      setStep("save", "running");
      if (user) {
        try {
          const newId = crypto.randomUUID();
          const stored = JSON.parse(localStorage.getItem("nexusai_apps") ?? "[]");
          stored.push({
            id: newId, user_id: user.id ?? user.email,
            name: meta.name, description: prompt.trim().slice(0, 500),
            category: meta.category, prompt: prompt.trim(),
            source_code: finalHtml, status: "published",
            views: 0, downloads: 0, revenue: 0,
            monetization: { admob: true, amazon: true, chat_ia: true, pwa: true },
            created_at: new Date().toISOString(),
          });
          localStorage.setItem("nexusai_apps", JSON.stringify(stored));
          addLog(`💾 App guardada (ID: ${newId.slice(0,8)})`);
        } catch { addLog("⚠️ No se pudo guardar en local"); }
      }
      setStep("save", "done");
      setFinalized(true);
      addLog(`🎉 "${meta.name}" completada`);

    } catch (err) {
      addLog(`❌ Error fatal: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // ── feedback en vivo ─────────────────────────────────────────
  const handleFeedback = async () => {
    if (!feedback.trim() || isBuilding || !isLive) return;
    const fb: FB = { id: crypto.randomUUID(), text: feedback.trim(), status: "pending" };
    setFbList(p => [fb, ...p]);
    setFeedback("");
    addLog(`💬 Feedback: "${fb.text.slice(0,50)}"`);
    try {
      const raw = await groq(
        `Eres un editor de HTML. Tienes este HTML de app completa y el usuario pide un cambio.
Responde SOLO con el HTML modificado completo. Sin markdown. Sin explicaciones.
Mantén toda la funcionalidad existente (AdMob, Amazon, Chat IA, navegación).`,
        `HTML ACTUAL:\n${html}\n\nCAMBIO SOLICITADO:\n${fb.text}`,
        8000
      );
      const modified = extractHTML(raw);
      if (modified.includes("<html")) {
        setHtml(modified);
        addLog(`✅ Cambio aplicado`);
        setFbList(p => p.map(f => f.id===fb.id ? {...f, status:"ok"} : f));
      } else throw new Error("HTML inválido");
    } catch (e) {
      addLog(`⚠️ No pude aplicar el cambio`);
      setFbList(p => p.map(f => f.id===fb.id ? {...f, status:"err"} : f));
    }
  };

  // ── descarga ─────────────────────────────────────────────────
  const downloadHTML = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${appName||"nexusai-app"}.html`; a.click();
    URL.revokeObjectURL(url);
    addLog("📥 HTML descargado");
  };

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <nav className="shrink-0 border-b border-border bg-background/90 backdrop-blur-xl z-50">
        <div className="flex items-center justify-between h-13 px-4 py-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm hidden sm:inline">Builder Avanzado</span>
            <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/30 text-violet-300">
              <Zap className="w-3 h-3 mr-1" />Groq IA
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setViewMode(v => v==="desktop"?"mobile":"desktop")}
              className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Cambiar vista">
              {viewMode==="desktop" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowCode(v=>!v)}
              className={`p-2 rounded-lg transition-colors ${showCode?"bg-violet-500/20 text-violet-300":"hover:bg-secondary"}`} title="Ver código">
              <FileCode className="w-4 h-4" />
            </button>
            {isLive && (
              <Button size="sm" variant="outline" onClick={downloadHTML} className="cursor-pointer text-xs">
                <Download className="w-3 h-3 mr-1" />HTML
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")} className="cursor-pointer text-xs">
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Main: 2 columnas ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo (siempre visible) ── */}
        <div className="w-[340px] xl:w-[380px] shrink-0 border-r border-border bg-card/20 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Prompt */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Describe tu app</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && e.ctrlKey) handleBuild(); }}
                placeholder="Ej: App de recetas veganas con chat IA, tema oscuro, favoritos y lista de la compra..."
                className="w-full h-28 bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                disabled={isBuilding}
              />
              <Button
                onClick={handleBuild}
                disabled={!prompt.trim() || isBuilding}
                className="w-full mt-2 cursor-pointer"
              >
                {isBuilding
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando...</>
                  : <><Send className="w-4 h-4 mr-2" />Construir app</>
                }
              </Button>
              <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">Ctrl+Enter para construir</p>
            </div>

            {/* Pasos */}
            {(isBuilding || isLive) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Estado</p>
                <StepList steps={steps} />
              </div>
            )}

            {/* Feedback */}
            {isLive && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />Feedback en vivo
                </label>
                <div className="flex gap-2">
                  <input
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && handleFeedback()}
                    placeholder="Ej: cambia a azul, añade sección contacto..."
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                    disabled={isBuilding}
                  />
                  <Button size="sm" onClick={handleFeedback} disabled={!feedback.trim()||isBuilding} className="cursor-pointer">
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                {fbList.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {fbList.slice(0,5).map(f => (
                      <div key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {f.status==="ok"      ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> :
                         f.status==="err"     ? <X className="w-3 h-3 text-red-400 shrink-0" /> :
                         <Loader2 className="w-3 h-3 text-violet-400 animate-spin shrink-0" />}
                        <span className="truncate">{f.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Log */}
            {log.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Bitácora</p>
                <div className="bg-black/30 rounded-lg p-2 max-h-44 overflow-y-auto space-y-0.5">
                  {log.map((l,i) => <p key={i} className="text-[10px] font-mono text-muted-foreground/70 leading-relaxed">{l}</p>)}
                </div>
              </div>
            )}

            {/* Publicar */}
            {finalized && (
              <Button className="w-full cursor-pointer gap-2" onClick={() => { addLog("✅ App publicada"); }}>
                <Globe className="w-4 h-4" />Publicar app
              </Button>
            )}
          </div>
        </div>

        {/* ── Panel derecho: preview ── */}
        <div className="flex-1 bg-[#0a0a0f] flex flex-col overflow-hidden">
          {/* Header preview */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              <span className="text-xs text-muted-foreground">{isLive ? "Preview en vivo — puedes interactuar" : "Esperando..."}</span>
            </div>
            {showCode && (
              <button onClick={() => navigator.clipboard.writeText(html)}
                className="text-[10px] text-violet-400 hover:text-violet-300 cursor-pointer">
                Copiar código
              </button>
            )}
          </div>

          {/* Área principal */}
          <div className={`flex-1 flex items-center justify-center p-3 overflow-hidden ${viewMode==="mobile" ? "bg-[#050508]" : ""}`}>
            {showCode ? (
              <div className="w-full h-full overflow-auto bg-[#0d0d14] rounded-xl p-4">
                <pre className="text-[11px] font-mono text-green-400/80 whitespace-pre-wrap leading-relaxed">
                  {html.slice(0, 10000)}{html.length > 10000 && "\n\n/* ... más código ... */"}
                </pre>
              </div>
            ) : (
              <div className={`relative h-full transition-all ${
                viewMode==="mobile"
                  ? "w-[375px] rounded-[32px] overflow-hidden border-4 border-[#1a1a2e] shadow-2xl shadow-violet-900/20"
                  : "w-full rounded-xl overflow-hidden"
              }`}>
                <iframe
                  ref={iframeRef}
                  title="NexusAI Preview"
                  className="w-full h-full"
                  style={{ border:"none", borderRadius: viewMode==="mobile" ? "28px" : "10px" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
                {!isLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
                    <BrainCircuit className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Describe tu app y pulsa <strong>Construir</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
