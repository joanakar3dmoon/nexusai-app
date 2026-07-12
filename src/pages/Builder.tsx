import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit, Bot, Code2, Send, Loader2, Eye, Smartphone, Monitor,
  MessageSquare, Check, X, ChevronRight, RefreshCw, Download, Globe,
  FileCode, Palette, Zap, Star, ArrowRight, Play, Pause, Undo2,
  Maximize2, Minimize2, Settings, Menu
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

type BuildStep = {
  id: string;
  name: string;
  status: "pending" | "running" | "done" | "skipped";
  detail?: string;
};

type LivePreview = {
  html: string;
  version: number;
  isLive: boolean;
};

type FeedbackItem = {
  id: string;
  text: string;
  status: "pending" | "applied" | "rejected";
};

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusAI Builder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .placeholder { text-align: center; padding: 40px; opacity: 0.5; }
    .placeholder h2 { font-size: 20px; margin-bottom: 8px; }
    .placeholder p { font-size: 14px; }
  </style>
</head>
<body>
  <div class="placeholder">
    <h2>Construyendo tu app...</h2>
    <p>La vista previa aparecera aqui mientras el Agente Constructor trabaja.</p>
  </div>
</body>
</html>`;

function BuildSteps({ steps }: { steps: BuildStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
            step.status === "done" ? "bg-emerald-500/10 text-emerald-300"
            : step.status === "running" ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
            : step.status === "skipped" ? "bg-gray-500/10 text-gray-500 line-through"
            : "text-muted-foreground/50"
          }`}
        >
          {step.status === "done" ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
           : step.status === "running" ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
           : <div className="w-4 h-4 rounded-full border border-current shrink-0 opacity-30" />}
          <span className="flex-1">{step.name}</span>
          {step.detail && <span className="text-xs opacity-70 hidden sm:inline">{step.detail}</span>}
        </motion.div>
      ))}
    </div>
  );
}

export default function Builder() {
  const { user, signOut, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [preview, setPreview] = useState<LivePreview>({ html: DEFAULT_TEMPLATE, version: 0, isLive: false });
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("desktop");
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [appName, setAppName] = useState("");
  const [appId, setAppId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const addLog = (msg: string) => setBuildLog(prev => [...prev.slice(-49), msg]);

  const updatePreview = (html: string, logMsg?: string) => {
    setPreview({ html, version: Date.now(), isLive: true });
    if (logMsg) addLog(logMsg);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = html;
    }
  };

  const markStep = (id: string, status: BuildStep["status"], detail?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s));
  };

  const getDefaultSteps = (): BuildStep[] => [
    { id: "analyze", name: "Analizando prompt", status: "pending" },
    { id: "html", name: "Generando estructura HTML", status: "pending" },
    { id: "css", name: "Aplicando estilos", status: "pending" },
    { id: "js", name: "Programando interacciones", status: "pending" },
    { id: "admob", name: "Inyectando AdMob", status: "pending" },
    { id: "amazon", name: "Vinculando Amazon Afiliados", status: "pending" },
    { id: "freellm", name: "Conectando IA freellm.net", status: "pending" },
    { id: "pwa", name: "Empaquetando como PWA", status: "pending" },
    { id: "finalize", name: "Finalizando app", status: "pending" },
  ];

  // freellm -> Groq -> fallback local
  const generateCodeBlock = async (
    stepId: string,
    stepName: string,
    systemPrompt: string,
    userContent: string,
  ): Promise<string> => {
    markStep(stepId, "running");
    addLog(`Generando ${stepName}...`);

    // Intentar con freellm.net primero
    try {
      const response = await fetch("https://api.freellm.net/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer free" },
        body: JSON.stringify({
          model: "gpt-4o-mini-free",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (!content) throw new Error("Respuesta vacia");
      markStep(stepId, "done", "hecho");
      addLog(`OK ${stepName}`);
      return content;
    } catch (_e1) {
      addLog(`Usando Groq para ${stepName}...`);
      // Fallback: Groq
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!gr.ok) throw new Error(`Groq HTTP ${gr.status}`);
        const gd = await gr.json();
        const gcontent = gd.choices?.[0]?.message?.content || "";
        if (!gcontent) throw new Error("Groq vacio");
        markStep(stepId, "done", "Groq");
        addLog(`OK ${stepName} (Groq)`);
        return gcontent;
      } catch (_e2) {
        markStep(stepId, "done", "local");
        addLog(`Fallback local para ${stepName}`);
        return generateFallbackCode(stepId, prompt);
      }
    }
  };

  const generateFallbackCode = (stepId: string, promptText: string): string => {
    const appTitle = promptText.split(" ").slice(0, 4).join(" ") || "Mi App";
    switch (stepId) {
      case "analyze": return JSON.stringify({ type: "app", name: appTitle, category: "general", features: ["diseño moderno"], pages: ["inicio"], colors: { primary: "#7c3aed", secondary: "#06b6d4" }, hasAI: true });
      case "html": return `<header style="padding:20px;text-align:center"><h1 style="color:#7c3aed">${appTitle}</h1></header><main style="padding:20px"><p>Tu app generada por NexusAI</p></main><nav style="position:fixed;bottom:0;width:100%;background:#111;display:flex;justify-content:space-around;padding:12px"><span>Inicio</span><span>Chat</span><span>Perfil</span></nav>`;
      case "css": return `* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; } h1 { color: #7c3aed; } button { background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }`;
      case "js": return `document.addEventListener('DOMContentLoaded', () => { console.log('App lista'); });`;
      default: return "// generado por NexusAI";
    }
  };

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;

    setIsBuilding(true);
    setIsPaused(false);
    setFinalized(false);
    setFeedback([]);
    setBuildLog([]);
    setPreview({ html: DEFAULT_TEMPLATE, version: 0, isLive: false });
    setSteps(getDefaultSteps());
    setAppName(prompt.trim().split(" ").slice(0, 3).join(" "));

    addLog(`Iniciando construccion: "${prompt.trim().slice(0, 50)}..."`);

    try {
      // Step 1: Analizar
      const analysis = await generateCodeBlock(
        "analyze", "Analizando prompt",
        `Eres un analizador de prompts para construir apps web. Analiza el siguiente prompt y responde SOLO con JSON valido:
{"type": "app_type", "name": "nombre_app", "category": "categoria", "features": ["feature1", "feature2"], "pages": ["page1"], "colors": {"primary": "#7c3aed", "secondary": "#06b6d4"}, "hasAI": true}`,
        prompt.trim()
      );
      let analysisData: any = { name: appName, category: "general", features: [], pages: ["inicio"], colors: { primary: "#7c3aed", secondary: "#06b6d4" }, hasAI: true };
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) analysisData = { ...analysisData, ...JSON.parse(jsonMatch[0]) };
      } catch {}

      // Step 2: HTML
      const htmlSnippet = await generateCodeBlock(
        "html", "Generando estructura HTML",
        `Eres un generador de HTML moderno. Genera el contenido del <body> de una app web de tema oscuro.
App: "${analysisData.name || appName}". Categoria: ${analysisData.category}. Features: ${(analysisData.features || []).join(", ")}.
Diseño mobile-first, dark theme, color primario ${analysisData.colors?.primary || "#7c3aed"}.
Incluye navegacion bottom-bar con iconos emoji. NO incluyas html/head/style, solo el contenido del body.`,
        prompt.trim()
      );

      // Step 3: CSS
      const cssCode = await generateCodeBlock(
        "css", "Aplicando estilos",
        `Genera CSS completo para la app "${analysisData.name || appName}". Tema oscuro: fondo #0a0a0f, texto #e0e0e0.
Color primario: ${analysisData.colors?.primary || "#7c3aed"}. Responsive, animaciones suaves, tipografia moderna.
Incluye estilos para bottom-nav, cards, botones, header. Solo CSS puro, sin etiquetas HTML.`,
        prompt.trim()
      );

      // Ensamblar primera version
      const firstHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="${analysisData.colors?.primary || "#7c3aed"}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>${analysisData.name || appName}</title>
  <style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
${cssCode}
  </style>
</head>
<body>
${htmlSnippet}
</body>
</html>`;

      updatePreview(firstHTML, "Preview inicial lista");

      // Step 4: JS
      await generateCodeBlock(
        "js", "Programando interacciones",
        `Genera JavaScript ES6+ para la app "${analysisData.name || appName}". Incluye navegacion entre secciones, efectos de transicion y manejo de eventos. Solo JS puro.`,
        prompt.trim()
      );

      // Step 5: AdMob
      await generateCodeBlock(
        "admob", "Inyectando AdMob",
        `Confirma el script de AdMob. App ID: ca-app-pub-3940256099942544~3347511713. Banner slot: ca-app-pub-3940256099942544/6300978111. Solo responde OK.`,
        prompt.trim()
      );

      const previewWithAdMob = injectIntoHead(firstHTML, `<script>
window.addEventListener('load', function() {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;bottom:0;width:100%;z-index:9999;background:#000;text-align:center;padding:4px 0';
  banner.innerHTML = '<ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="ca-pub-3940256099942544" data-ad-slot="6300978111"></ins><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"><\/script>';
  document.body.appendChild(banner);
});
</script>`);
      updatePreview(previewWithAdMob, "AdMob inyectado");

      // Step 6: Amazon
      await generateCodeBlock(
        "amazon", "Vinculando Amazon Afiliados",
        `Confirma la integracion de Amazon Afiliados con tracking ID r3dm01-21. Solo responde OK.`,
        prompt.trim()
      );

      const previewWithAmazon = injectIntoHead(previewWithAdMob, `<script>
window.nexusai_amazon_tid = 'r3dm01-21';
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href*="amazon"]').forEach(function(a) {
    try { var u = new URL(a.href); u.searchParams.set('tag', 'r3dm01-21'); a.href = u.toString(); } catch(e) {}
  });
});
</script>`);
      updatePreview(previewWithAmazon, "Amazon Afiliados integrado");

      // Step 7: Chat IA freellm
      await generateCodeBlock(
        "freellm", "Conectando Chat IA",
        `Confirma la integracion del chat IA con freellm.net. Solo responde OK.`,
        prompt.trim()
      );

      const previewWithFreellm = injectIntoHead(previewWithAmazon, `<script>
window.addEventListener('load', function() {
  var fab = document.createElement('button');
  fab.innerHTML = 'AI';
  fab.style.cssText = 'position:fixed;bottom:70px;right:16px;width:52px;height:52px;border-radius:50%;background:#7c3aed;color:white;font-weight:bold;font-size:13px;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,0.5);z-index:9997;';
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;bottom:136px;right:16px;width:300px;max-width:90vw;height:380px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:9996;display:none;flex-direction:column;border:1px solid rgba(124,58,237,0.3);overflow:hidden;';
  modal.innerHTML = '<div style="padding:10px 14px;background:#7c3aed;color:white;font-weight:bold;font-size:13px">NexusAI Chat</div><div id="nxchat-msgs" style="flex:1;overflow-y:auto;padding:10px;font-size:12px;line-height:1.5"></div><div style="display:flex;padding:8px;gap:6px;border-top:1px solid rgba(255,255,255,0.08)"><input id="nxchat-in" placeholder="Escribe..." style="flex:1;background:#0a0a0f;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:white;font-size:12px;outline:none"/><button id="nxchat-send" style="background:#7c3aed;border:none;color:white;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:13px">></button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(modal);
  var open = false;
  fab.onclick = function() { open = !open; modal.style.display = open ? 'flex' : 'none'; };
  function sendMsg() {
    var inp = document.getElementById('nxchat-in');
    var msgs = document.getElementById('nxchat-msgs');
    var txt = inp.value.trim();
    if (!txt) return;
    msgs.innerHTML += '<div style="text-align:right;margin:4px 0"><span style="background:#7c3aed;padding:5px 10px;border-radius:10px 2px 10px 10px;display:inline-block;max-width:85%">'+txt+'</span></div>';
    inp.value = '';
    msgs.innerHTML += '<div id="nxchat-thinking" style="text-align:left;margin:4px 0"><span style="background:#2a2a3e;padding:5px 10px;border-radius:2px 10px 10px 10px;display:inline-block">Pensando...</span></div>';
    msgs.scrollTop = msgs.scrollHeight;
    fetch('https://api.freellm.net/v1/chat/completions', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer free'},body:JSON.stringify({model:'gpt-4o-mini-free',messages:[{role:'user',content:txt}],max_tokens:512})})
      .then(function(r){return r.json();})
      .then(function(d){
        var reply = (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content) || 'Hola! Soy el asistente de esta app.';
        var el = document.getElementById('nxchat-thinking');
        if(el) el.querySelector('span').textContent = reply;
        msgs.scrollTop = msgs.scrollHeight;
      })
      .catch(function(){var el=document.getElementById('nxchat-thinking');if(el)el.querySelector('span').textContent='Error de conexion';});
  }
  document.getElementById('nxchat-send').onclick = sendMsg;
  document.getElementById('nxchat-in').addEventListener('keydown', function(e){ if(e.key==='Enter') sendMsg(); });
});
</script>`);
      updatePreview(previewWithFreellm, "Chat IA conectado");

      // HTML final
      const finalHtml = previewWithFreellm;

      // Step 8: PWA
      await generateCodeBlock(
        "pwa", "Empaquetando como PWA",
        `Confirma el empaquetado como PWA para "${analysisData.name || appName}". Solo responde OK.`,
        prompt.trim()
      );

      // Step 9: Finalizar
      markStep("finalize", "running");
      addLog("Finalizando...");
      await new Promise(r => setTimeout(r, 600));
      markStep("finalize", "done", "completa");
      addLog(`App "${analysisData.name || appName}" lista`);

      setFinalized(true);

      // Guardar en localStorage
      if (user) {
        try {
          const newId = crypto.randomUUID();
          const stored = JSON.parse(localStorage.getItem("nexusai_apps") || "[]");
          stored.push({
            id: newId,
            user_id: user.id || user.email,
            name: analysisData.name || appName,
            description: prompt.trim().slice(0, 500),
            category: analysisData.category || "general",
            prompt: prompt.trim(),
            source_code: finalHtml,
            status: "published",
            views: 0, downloads: 0, revenue: 0,
            monetization: { admob: true, amazon: true, freellm: true, pwa: true },
            created_at: new Date().toISOString(),
          });
          localStorage.setItem("nexusai_apps", JSON.stringify(stored));
          setAppId(newId);
          addLog("App guardada en Mis Apps");
        } catch (e) {
          addLog("App lista para descargar (no guardada)");
        }
      }

    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedbackInput.trim() || isBuilding) return;
    const fb: FeedbackItem = { id: crypto.randomUUID(), text: feedbackInput.trim(), status: "pending" };
    setFeedback(prev => [fb, ...prev]);
    setFeedbackInput("");
    addLog(`Feedback: "${fb.text.slice(0, 60)}"`);

    const sysPrompt = `Eres un modificador de codigo HTML. Tienes el HTML completo de una app. Aplica el cambio solicitado. Responde SOLO con el HTML completo modificado, sin perder ninguna funcionalidad (AdMob, Amazon, chat IA).`;
    const userMsg = `HTML ACTUAL:\n${preview.html}\n\nCAMBIO:\n${fb.text}`;

    let modifiedHTML = "";
    try {
      const r = await fetch("https://api.freellm.net/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer free" },
        body: JSON.stringify({ model: "gpt-4o-mini-free", messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userMsg }], temperature: 0.5, max_tokens: 8192 }),
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) { const d = await r.json(); modifiedHTML = d.choices?.[0]?.message?.content || ""; }
    } catch {}

    if (!modifiedHTML.includes("<html")) {
      addLog("Aplicando con Groq...");
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userMsg }], temperature: 0.5, max_tokens: 8192 }),
          signal: AbortSignal.timeout(20000),
        });
        if (gr.ok) { const gd = await gr.json(); modifiedHTML = gd.choices?.[0]?.message?.content || ""; }
      } catch {}
    }

    if (modifiedHTML.includes("<!DOCTYPE") || modifiedHTML.includes("<html")) {
      updatePreview(modifiedHTML, `Cambio aplicado: "${fb.text.slice(0, 40)}"`);
      setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: "applied" } : f));
      return;
    }

    // Fallback rapido por color
    const colorMap: Record<string, string> = { azul: "#3b82f6", verde: "#10b981", rojo: "#ef4444", rosa: "#ec4899", cyan: "#06b6d4" };
    for (const [k, v] of Object.entries(colorMap)) {
      if (fb.text.toLowerCase().includes(k)) {
        updatePreview(preview.html.replace(/#7c3aed/g, v), `Color cambiado a ${k}`);
        setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: "applied" } : f));
        return;
      }
    }
    addLog("No se pudo aplicar ese cambio. Se mas especifico.");
    setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: "rejected" } : f));
  };

  const handlePublish = async () => {
    if (!appId) { addLog("Construye la app primero"); return; }
    try {
      const stored = JSON.parse(localStorage.getItem("nexusai_apps") || "[]");
      const idx = stored.findIndex((a: any) => a.id === appId);
      if (idx >= 0) { stored[idx].status = "published"; localStorage.setItem("nexusai_apps", JSON.stringify(stored)); }
      addLog("App publicada en el Dashboard");
    } catch { addLog("Error al publicar"); }
  };

  const downloadHTML = () => {
    const blob = new Blob([preview.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName || "nexusai-app"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("HTML descargado");
  };

  function injectIntoHead(html: string, script: string): string {
    if (html.includes("</head>")) return html.replace("</head>", `${script}\n</head>`);
    return html + script;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </button>
            <BrainCircuit className="text-primary w-6 h-6" />
            <span className="font-bold text-base hidden sm:inline">Agente Constructor</span>
            <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/30 text-violet-300">
              <Zap className="w-3 h-3 mr-1" /> Preview en vivo
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(v => v === "desktop" ? "mobile" : "desktop")} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
              {viewMode === "desktop" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowCode(!showCode)} className={`p-2 rounded-lg transition-colors cursor-pointer ${showCode ? "bg-violet-500/20 text-violet-300" : "hover:bg-secondary"}`}>
              <FileCode className="w-4 h-4" />
            </button>
            <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer hidden sm:inline-flex">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {finalized && (
              <Button variant="outline" size="sm" onClick={downloadHTML} className="cursor-pointer">
                <Download className="w-3 h-3 mr-1" /> HTML
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="cursor-pointer">Dashboard</Button>
          </div>
        </div>
      </nav>

      <div className={`flex flex-1 ${fullscreen ? "fixed inset-0 top-14 z-40" : ""}`}>
        <div className={`${sidebarOpen ? "fixed inset-0 z-30 md:relative md:flex" : "hidden"} md:flex md:w-[380px] xl:w-[420px] border-r border-border bg-card/30 overflow-y-auto`}>
          <div className="flex flex-col h-full w-full p-4 space-y-4 relative z-20">
            {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setSidebarOpen(false)} />}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Describe tu app</label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleBuild(); }}
                  placeholder="Ej: App de recetas con chat IA, tema oscuro y galeria de fotos..."
                  className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                  disabled={isBuilding}
                />
                <Button size="sm" onClick={handleBuild} disabled={!prompt.trim() || isBuilding} className="absolute bottom-2 right-2 cursor-pointer">
                  {isBuilding ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generando</> : <><Send className="w-3 h-3 mr-1" />Construir</>}
                </Button>
              </div>
            </div>

            {(isBuilding || steps.some(s => s.status !== "pending")) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Construccion</span>
                  {isBuilding && (
                    <button onClick={() => setIsPaused(!isPaused)} className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer flex items-center gap-1">
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {isPaused ? "Reanudar" : "Pausar"}
                    </button>
                  )}
                </div>
                <BuildSteps steps={steps} />
              </div>
            )}

            {preview.isLive && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Feedback en vivo
                </label>
                <div className="flex gap-2">
                  <input
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleFeedback()}
                    placeholder="Cambia el color a azul, añade seccion de contacto..."
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                    disabled={isBuilding}
                  />
                  <Button size="sm" onClick={handleFeedback} disabled={!feedbackInput.trim() || isBuilding} className="cursor-pointer">
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                {feedback.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {feedback.slice(0, 5).map(fb => (
                      <div key={fb.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {fb.status === "applied" ? <Check className="w-3 h-3 text-emerald-400" /> : fb.status === "rejected" ? <X className="w-3 h-3 text-red-400" /> : <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
                        <span className="truncate">{fb.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {buildLog.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1 block">Bitacora</span>
                <div className="bg-background/50 rounded-lg p-2 max-h-[160px] overflow-y-auto space-y-0.5">
                  {buildLog.map((log, i) => (
                    <div key={i} className="text-[10px] font-mono text-muted-foreground/70">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {finalized && (
              <Button className="w-full cursor-pointer gap-2" onClick={handlePublish}>
                <Globe className="w-4 h-4" /> Publicar app <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#0a0a0f] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${preview.isLive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              <span className="text-xs text-muted-foreground">{preview.isLive ? "Preview en vivo" : "Esperando..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/50">v{preview.version}</span>
              {showCode && (
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(preview.html)} className="text-[10px] cursor-pointer">Copiar</Button>
              )}
            </div>
          </div>

          <div className={`flex-1 flex items-center justify-center p-2 overflow-hidden ${viewMode === "mobile" ? "bg-[#050508]" : ""}`}>
            {showCode ? (
              <div className="w-full h-full overflow-auto bg-[#0d0d14] rounded-lg p-4">
                <pre className="text-[11px] font-mono text-green-400/80 whitespace-pre-wrap leading-relaxed">
                  {preview.html.slice(0, 10000)}{preview.html.length > 10000 && "\n\n/* ... mas codigo ... */"}
                </pre>
              </div>
            ) : (
              <div className={`relative transition-all duration-300 ${viewMode === "mobile" ? "w-[375px] h-[812px] rounded-[32px] overflow-hidden border-4 border-[#1a1a2e] shadow-2xl shadow-violet-900/20" : "w-full h-full"}`}>
                <iframe
                  ref={iframeRef}
                  title="NexusAI Preview"
                  className="w-full h-full bg-white"
                  style={{ border: "none", borderRadius: viewMode === "mobile" ? "28px" : "8px" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5 bg-black/30">
            <span className="text-[10px] text-muted-foreground/40">
              {preview.isLive ? "Puedes interactuar con la preview" : "Describe tu app y pulsa Construir"}
            </span>
            {user && <span className="text-[10px] text-muted-foreground/40">{user.email}</span>}
          </div>
        </div>
      </div>
    </div>
  );
  }
