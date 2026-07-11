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
import api from "@/lib/nexus-api";

// ============================================================
// TIPOS
// ============================================================

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
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0f;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .placeholder {
      text-align: center;
      padding: 40px;
      opacity: 0.5;
    }
    .placeholder h2 { font-size: 20px; margin-bottom: 8px; }
    .placeholder p { font-size: 14px; }
  </style>
</head>
<body>
  <div class="placeholder">
    <h2>🔨 Construyendo tu app...</h2>
    <p>La vista previa aparecerá aquí mientras el Agente Constructor trabaja.</p>
  </div>
</body>
</html>`;

// ============================================================
// COMPONENTE: Barra de pasos animada
// ============================================================

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
            step.status === "done"
              ? "bg-emerald-500/10 text-emerald-300"
              : step.status === "running"
              ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
              : step.status === "skipped"
              ? "bg-gray-500/10 text-gray-500 line-through"
              : "text-muted-foreground/50"
          }`}
        >
          {step.status === "done" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : step.status === "running" ? (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full border border-current shrink-0 opacity-30" />
          )}
          <span className="flex-1">{step.name}</span>
          {step.detail && (
            <span className="text-xs opacity-70 hidden sm:inline">{step.detail}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: Agente Constructor
// ============================================================

export default function Builder() {
  const { user, signOut, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Estado
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [preview, setPreview] = useState<LivePreview>({
    html: DEFAULT_TEMPLATE,
    version: 0,
    isLive: false,
  });
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("desktop");
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [appName, setAppName] = useState("");
  const [appId, setAppId] = useState<string | null>(null);

  const addLog = useCallback((msg: string) => {
    setBuildLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ============================================================
  // INICIALIZAR PASOS
  // ============================================================

  const getDefaultSteps = (): BuildStep[] => [
    { id: "analyze", name: "Analizando prompt", status: "pending" },
    { id: "design", name: "Diseñando arquitectura", status: "pending" },
    { id: "html", name: "Generando estructura HTML", status: "pending" },
    { id: "css", name: "Aplicando estilos y tema", status: "pending" },
    { id: "js", name: "Programando interacciones", status: "pending" },
    { id: "admob", name: "Inyectando AdMob", status: "pending" },
    { id: "amazon", name: "Vinculando Amazon Afiliados", status: "pending" },
    { id: "freellm", name: "Conectando IA freellm.net", status: "pending" },
    { id: "pwa", name: "Empaquetando como PWA", status: "pending" },
    { id: "finalize", name: "Listo para publicar", status: "pending" },
  ];

  // ============================================================
  // ACTUALIZAR PREVIEW EN EL IFRAME
  // ============================================================

  const updatePreview = useCallback((html: string, log?: string) => {
    if (log) addLog(log);
    setPreview(prev => ({
      html,
      version: prev.version + 1,
      isLive: true,
    }));
  }, [addLog]);

  // Efecto para re-renderizar el iframe cuando cambia la preview
  useEffect(() => {
    if (iframeRef.current && preview.html) {
      iframeRef.current.srcdoc = preview.html;
    }
  }, [preview.html, preview.version]);

  // ============================================================
  // MARCAR PASO
  // ============================================================

  const markStep = useCallback((stepId: string, status: BuildStep["status"], detail?: string) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, status, detail: detail || s.detail } : s
    ));
  }, []);

  // ============================================================
  // SIMULACIÓN DE GENERACIÓN EN VIVO
  // (En producción: llama al SuperAgente real via freellm.net)
  // ============================================================

  const generateCodeBlock = async (
    stepId: string,
    stepName: string,
    systemPrompt: string,
    userContent: string,
  ): Promise<string> => {
    markStep(stepId, "running");
    addLog(`🔨 ${stepName}...`);

    try {
      const response = await fetch("https://api.freellm.net/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer free",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      markStep(stepId, "done", "✓");
      addLog(`✅ ${stepName} completado`);
      return content;
    } catch (err) {
      markStep(stepId, "done"); // Fallback graceful
      addLog(`⚠️ ${stepName} (fallback local)`);
      return generateFallbackCode(stepId, prompt);
    }
  };

  // ============================================================
  // FALLBACK LOCAL (cuando freellm no responde)
  // ============================================================

  const generateFallbackCode = (stepId: string, promptText: string): string => {
    const appTitle = promptText.split(" ").slice(0, 4).join(" ") || "Mi App";

    switch (stepId) {
      case "analyze": return JSON.stringify({ type: "app", name: appTitle });
      case "design": return JSON.stringify({ pages: ["home", "about"] });
      case "html": return `<div class="app"><header><h1>${appTitle}</h1></header><main><p>Construido por NexusAI</p></main></div>`;
      case "css": return `.app { padding: 20px; } h1 { color: #7c3aed; }`;
      case "js": return `console.log('${appTitle} ready');`;
      default: return "// código generado";
    }
  };

  // ============================================================
  // CONSTRUIR APP (flujo principal)
  // ============================================================

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;

    setIsBuilding(true);
    setIsPaused(false);
    setFinalized(false);
    setFeedback([]);
    setBuildLog([]);
    setPreview(prev => ({ ...prev, html: DEFAULT_TEMPLATE }));
    setSteps(getDefaultSteps());
    setAppName(prompt.trim().split(" ").slice(0, 3).join(" "));

    addLog(`🚀 Iniciando construcción: "${prompt.trim().slice(0, 50)}..."`);

    try {
      // Step 1: Analizar
      const analysis = await generateCodeBlock(
        "analyze", "Analizando prompt",
        `Eres un analizador de prompts para construir apps. 
Analiza el siguiente prompt y responde SOLO con JSON:
{"type": "app_type", "name": "nombre_app", "category": "categoria", "features": ["feature1"], "pages": ["page1"], "colors": {"primary": "#hex", "secondary": "#hex"}, "hasAI": true/false}`,
        prompt.trim()
      );
      let analysisData: any = {};
      try { analysisData = JSON.parse(analysis.match(/\{.*\}/s)?.[0] || "{}"); } catch { analysisData = { name: appName, category: "general" }; }

      // Step 2: HTML structure
      const htmlSnippet = await generateCodeBlock(
        "html", "Generando estructura HTML",
        `Eres un generador de HTML moderno. Genera SOLO el <body> HTML de una app web oscura.
La app se llama "${analysisData.name || appName}".
Categoría: ${analysisData.category || "general"}.
Características: ${(analysisData.features || []).join(", ") || "diseño moderno"}.
Páginas: ${(analysisData.pages || []).join(", ") || "inicio"}.
USA: diseño mobile-first, dark theme, CSS Grid/Flexbox, iconos emoji, colores primarios ${analysisData.colors?.primary || "#7c3aed"}.
NO incluyas <html>, <head>, <style> — solo el body interior con divs y contenido real.
Incluye una navegación bottom-bar con iconos.`,
        prompt.trim()
      );

      // Step 3: CSS
      const cssCode = await generateCodeBlock(
        "css", "Aplicando estilos",
        `Genera CSS completo para la app "${analysisData.name || appName}".
Tema oscuro: fondo #0a0a0f, texto #e0e0e0.
Color primario: ${analysisData.colors?.primary || "#7c3aed"}.
Diseño responsive, animaciones suaves, tipografía moderna.
Incluye estilos para bottom-nav, cards, botones, header.
NO incluyas etiquetas HTML.`,
        prompt.trim()
      );

      // ===== ASSEMBLE FIRST VERSION =====
      const firstHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="${analysisData.colors?.primary || "#7c3aed"}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>${analysisData.name || appName}</title>
  <style>
${cssCode}
  </style>
</head>
<body>
${htmlSnippet}
</body>
</html>`;

      updatePreview(firstHTML, "🎨 Preview inicial lista — puedes interactuar");

      // Step 4: JS interactions
      await generateCodeBlock(
        "js", "Programando interacciones",
        `Genera JavaScript moderno (ES6+) para la app "${analysisData.name || appName}".
Incluye:
- Navegación entre secciones/páginas
- Efectos de transición
- Manejo de eventos de usuario
- Si tiene chat o IA: prepara la UI de chat
Responde SOLO con el código JS.`,
        prompt.trim()
      );

      // Step 5: AdMob
      await generateCodeBlock(
        "admob", "Inyectando AdMob",
        `Genera el script de AdMob para insertar en una app.
Usa:
- App ID: ca-app-pub-3940256099942544~3347511713
- Banner: ca-app-pub-3940256099942544/6300978111
- Interstitial cada 3 clics
Responde SOLO con el script HTML <script> completo.`,
        prompt.trim()
      );

      // Step 5b: Inject AdMob into preview
      const previewWithAdMob = injectIntoHead(firstHTML, `
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
  window.addEventListener('load', () => {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:0;width:100%;z-index:9999;background:#000;text-align:center;padding:4px';
    banner.innerHTML = '<ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="ca-pub-3940256099942544" data-ad-slot="6300978111"></ins>';
    document.body.appendChild(banner);
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  });
</script>`);
      updatePreview(previewWithAdMob, "📱 Anuncios AdMob activos en la preview");

      // Step 6: Amazon
      await generateCodeBlock(
        "amazon", "Vinculando Amazon Afiliados",
        `Genera un script de afiliados de Amazon con tracking ID: r3dm01-21.
Debe auto-convertir enlaces a Amazon en enlaces de afiliado.
Además, inyecta un banner de "Compra en Amazon" con productos relacionados.
Responde SOLO con el script.`,
        prompt.trim()
      );

      const previewWithAmazon = injectIntoHead(previewWithAdMob, `
<script>
  window.nexusai_amazon_tid = 'r3dm01-21';
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href*="amazon"]').forEach(a => {
      try { const u = new URL(a.href); u.searchParams.set('tag', 'r3dm01-21'); a.href = u.toString(); } catch(e) {}
    });
  });
</script>`);
      updatePreview(previewWithAmazon, "🛒 Enlaces Amazon afiliados inyectados");

      // Step 7: freellm
      await generateCodeBlock(
        "freellm", "Conectando IA freellm.net",
        `Genera un script que añada un botón flotante de chat IA a la app.
El chat debe conectar con freellm.net (api.freellm.net/v1/chat/completions).
Debe tener: burbuja flotante, modal de chat, input de texto.
Usa API key: "free" como bearer.
Responde SOLO con el script HTML.`,
        prompt.trim()
      );

      const previewWithFreellm = injectIntoHead(previewWithAmazon, `
<script>
  // Chat IA flotante
  window.addEventListener('load', () => {
    const fab = document.createElement('button');
    fab.innerHTML = '🤖';
    fab.style.cssText = 'position:fixed;bottom:70px;right:16px;width:56px;height:56px;border-radius:50%;background:#7c3aed;color:white;font-size:24px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,0.4);z-index:9997;';
    
    const modal = document.createElement('div');
    modal.id = 'nexusai-chat';
    modal.style.cssText = 'position:fixed;bottom:140px;right:16px;width:320px;max-width:90vw;height:400px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:9996;display:none;flex-direction:column;border:1px solid rgba(124,58,237,0.3);overflow:hidden;';
    modal.innerHTML = '<div style="padding:12px 16px;background:#7c3aed;color:white;font-weight:bold;font-size:14px">🤖 NexusAI Chat</div><div id="nexusai-chat-msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:13px"></div><div style="display:flex;padding:8px;gap:8px;border-top:1px solid rgba(255,255,255,0.1)"><input id="nexusai-chat-input" placeholder="Escribe..." style="flex:1;background:#0a0a0f;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:white;font-size:13px;outline:none"/><button id="nexusai-chat-send" style="background:#7c3aed;border:none;color:white;padding:8px 12px;border-radius:8px;cursor:pointer">➤</button></div>';
    
    document.body.appendChild(fab);
    document.body.appendChild(modal);
    
    let chatOpen = false;
    fab.onclick = () => { chatOpen = !chatOpen; modal.style.display = chatOpen ? "flex" : "none"; };
    
    document.getElementById('nexusai-chat-send').onclick = async () => {
      const input = document.getElementById('nexusai-chat-input');
      const msgs = document.getElementById('nexusai-chat-msgs');
      const text = input.value.trim();
      if (!text) return;
      msgs.innerHTML += '<div style="text-align:right;margin:4px 0"><span style="background:#7c3aed;padding:6px 12px;border-radius:12px 4px 12px 12px;display:inline-block;max-width:80%">' + text + '</span></div>';
      input.value = '';
      msgs.innerHTML += '<div style="text-align:left;margin:4px 0"><span style="background:#2a2a3e;padding:6px 12px;border-radius:4px 12px 12px 12px;display:inline-block;max-width:80%">🤔 Pensando...</span></div>';
      msgs.scrollTop = msgs.scrollHeight;
      try {
        const r = await fetch("https://api.freellm.net/v1/chat/completions", {
          method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer free"},
          body: JSON.stringify({model:"gpt-4o-mini-free",messages:[{role:"user",content:text}],max_tokens:512})
        });
        const d = await r.json();
        const reply = d.choices?.[0]?.message?.content || "¡Hola! Soy el asistente IA de esta app 🤖";
        msgs.innerHTML = msgs.innerHTML.replace('<span style="background:#2a2a3e;padding:6px 12px;border-radius:4px 12px 12px 12px;display:inline-block;max-width:80%">🤔 Pensando...</span>', '<span style="background:#2a2a3e;padding:6px 12px;border-radius:4px 12px 12px 12px;display:inline-block;max-width:80%">' + reply + '</span>');
      } catch(e) {
        msgs.innerHTML = msgs.innerHTML.replace('🤔 Pensando...', '⚠️ Error de conexión');
      }
      msgs.scrollTop = msgs.scrollHeight;
    };
  });
</script>`);
      updatePreview(previewWithFreellm, "🤖 Chat IA conectado a freellm.net — ¡pruébalo!");

      // Step 8: PWA
      await generateCodeBlock(
        "pwa", "Empaquetando como PWA",
        `Genera el contenido de un manifest.json para PWA y un service worker básico.
Nombre: "${analysisData.name || appName}".
Color primario: ${analysisData.colors?.primary || "#7c3aed"}.
Responde con JSON del manifest y código del SW separados por "---".`,
        prompt.trim()
      );

      // Step 9: Finalizar
      markStep("finalize", "running");
      addLog("✨ Finalizando...");
      await new Promise(r => setTimeout(r, 800));
      markStep("finalize", "done", "✓ App completa");
      addLog(`🎉 "${analysisData.name || appName}" construida con éxito`);

      setFinalized(true);

      // ===== GUARDAR EN BACKEND =====
      if (user) {
        addLog("💾 Guardando app en base de datos...");
        try {
          const result = await api.createApp({
            user_id: user.id,
            name: analysisData.name || appName,
            description: prompt.trim().slice(0, 500),
            category: analysisData.category || "general",
            prompt: prompt.trim(),
            source_code: preview.html,
            monetization: { admob: true, amazon: true, freellm: true, pwa: true },
          });
          setAppId(result.id);
          addLog(`✅ App guardada (ID: ${result.id.slice(0, 8)}...)`);
          await refreshUser();
        } catch (e) {
          addLog("⚠️ No se pudo guardar en backend — el código está en preview igualmente");
        }
      }

    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // ============================================================
  // FEEDBACK: El usuario modifica la app en caliente
  // ============================================================

  const handleFeedback = async () => {
    if (!feedbackInput.trim() || isBuilding) return;

    const fb: FeedbackItem = {
      id: crypto.randomUUID(),
      text: feedbackInput.trim(),
      status: "pending",
    };
    setFeedback(prev => [fb, ...prev]);
    setFeedbackInput("");

    addLog(`💬 Feedback recibido: "${fb.text.slice(0, 60)}..."`);
    addLog("🔄 Aplicando cambios sobre la preview actual...");

    // Usar freellm para modificar el HTML actual
    try {
      const response = await fetch("https://api.freellm.net/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer free",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-free",
          messages: [
            {
              role: "system",
              content: `Eres un modificador de código HTML en vivo.
Tienes el HTML completo de una app. El usuario pide un cambio.
Responde SOLO con el HTML completo modificado, manteniendo toda la funcionalidad existente (AdMob, Amazon, chat IA, etc.).
NO pierdas nada del código anterior. Solo aplica el cambio solicitado.`
            },
            {
              role: "user",
              content: `HTML ACTUAL:\n${preview.html}\n\nCAMBIO SOLICITADO:\n${fb.text}`
            }
          ],
          temperature: 0.5,
          max_tokens: 8192,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const modifiedHTML = data.choices?.[0]?.message?.content || "";

        if (modifiedHTML.includes("<!DOCTYPE html>") || modifiedHTML.includes("<html")) {
          updatePreview(modifiedHTML, `✅ Cambio aplicado: "${fb.text.slice(0, 50)}"`);
          setFeedback(prev => prev.map(f =>
            f.id === fb.id ? { ...f, status: "applied" } : f
          ));
          addLog("🎨 Preview actualizada — puedes seguir interactuando");
          return;
        }
      }
    } catch {}

    // Fallback: cambio directo en el HTML
    const changeMap: Record<string, (html: string) => string> = {
      "color": (h) => h.replace(/#7c3aed/g, "#06b6d4"),
      "azul": (h) => h.replace(/#7c3aed/g, "#3b82f6"),
      "verde": (h) => h.replace(/#7c3aed/g, "#10b981"),
      "rojo": (h) => h.replace(/#7c3aed/g, "#ef4444"),
      "rosa": (h) => h.replace(/#7c3aed/g, "#ec4899"),
      "oscuro": (h) => h.replace(/#0a0a0f/g, "#000000"),
      "claro": (h) => h.replace(/background-color:\s*#[0-9a-f]+/gi, "background-color: #f8f8ff"),
    };

    let changed = false;
    for (const [keyword, fn] of Object.entries(changeMap)) {
      if (fb.text.toLowerCase().includes(keyword)) {
        const newHTML = fn(preview.html);
        if (newHTML !== preview.html) {
          updatePreview(newHTML, `🎨 ${fb.text.slice(0, 50)} (cambio rápido)`);
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      addLog("⚠️ No pude aplicar ese cambio automáticamente. Sé más específico.");
      setFeedback(prev => prev.map(f =>
        f.id === fb.id ? { ...f, status: "rejected" } : f
      ));
    }
  };

  // ============================================================
  // PUBLICAR APP
  // ============================================================

  const handlePublish = async () => {
    if (!appId) {
      addLog("⚠️ No hay app para publicar — constrúyela primero");
      return;
    }
    addLog("📡 Publicando app...");
    try {
      await api.publishApp(appId);
      addLog("✅ App publicada con éxito — visible en el Dashboard");
    } catch (e) {
      addLog("⚠️ Error al publicar — intenta desde el Dashboard");
    }
  };

  // ============================================================
  // DESCARGA EL HTML GENERADO
  // ============================================================

  const downloadHTML = () => {
    const blob = new Blob([preview.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName || "nexusai-app"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("📥 HTML descargado");
  };

  // ============================================================
  // UTILIDAD: Inyectar en <head>
  // ============================================================

  function injectIntoHead(html: string, script: string): string {
    return html.replace("</head>", `${script}\n</head>`);
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <BrainCircuit className="text-primary w-6 h-6" />
            <span className="font-bold text-base tracking-tight hidden sm:inline">Agente Constructor</span>
            <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/30 text-violet-300">
              <Zap className="w-3 h-3 mr-1" /> Preview en vivo
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
              className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
              title={viewMode === "desktop" ? "Vista móvil" : "Vista escritorio"}
            >
              {viewMode === "desktop" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </button>

            {/* Code toggle */}
            <button
              onClick={() => setShowCode(!showCode)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${showCode ? "bg-violet-500/20 text-violet-300" : "hover:bg-secondary"}`}
              title="Ver código fuente"
            >
              <FileCode className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer hidden sm:inline"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Download */}
            {finalized && (
              <Button variant="outline" size="sm" onClick={downloadHTML} className="cursor-pointer">
                <Download className="w-3 h-3 mr-1" /> HTML
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="cursor-pointer">
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`flex flex-1 ${fullscreen ? "fixed inset-0 top-14 z-40" : ""}`}>
        {/* ===== LEFT PANEL: Builder Controls ===== */}
        <div className={`${
          sidebarOpen ? "fixed inset-0 z-30 md:relative" : "hidden"
        } md:flex md:w-[380px] xl:w-[420px] border-r border-border bg-card/30 overflow-y-auto`}>
          <div className={`flex flex-col h-full w-full ${sidebarOpen ? "bg-background" : ""}`}>
            {/* Close sidebar overlay on mobile */}
            {sidebarOpen && (
              <div className="md:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setSidebarOpen(false)} />
            )}

            <div className="relative z-20 flex flex-col h-full p-4 space-y-4">
              {/* Prompt input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Describe tu app
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: App de recetas veganas con chat IA, temática oscura y galería de fotos..."
                    className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                    disabled={isBuilding}
                  />
                  <Button
                    size="sm"
                    onClick={handleBuild}
                    disabled={!prompt.trim() || isBuilding}
                    className="absolute bottom-2 right-2 cursor-pointer"
                  >
                    {isBuilding ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generando</>
                    ) : (
                      <><Send className="w-3 h-3 mr-1" /> Construir</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Build status & steps */}
              {(isBuilding || steps.some(s => s.status !== "pending")) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Estado de construcción</span>
                    {isBuilding && (
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer flex items-center gap-1"
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {isPaused ? "Reanudar" : "Pausar"}
                      </button>
                    )}
                  </div>
                  <BuildSteps steps={steps} />
                </div>
              )}

              {/* Live feedback */}
              {preview.isLive && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Feedback en vivo — di qué cambiar
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFeedback()}
                      placeholder="Ej: cambia el color a azul, añade una sección de contacto..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                      disabled={isBuilding || !finalized && steps.filter(s => s.status === "done").length < 5}
                    />
                    <Button
                      size="sm"
                      onClick={handleFeedback}
                      disabled={!feedbackInput.trim() || isBuilding}
                      className="cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Feedback history */}
                  {feedback.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {feedback.slice(0, 5).map(fb => (
                        <div key={fb.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {fb.status === "applied" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : fb.status === "rejected" ? (
                            <X className="w-3 h-3 text-red-400" />
                          ) : (
                            <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
                          )}
                          <span className="truncate">{fb.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Build log */}
              {buildLog.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground mb-1 block">Bitácora</span>
                  <div className="bg-background/50 rounded-lg p-2 max-h-[180px] overflow-y-auto space-y-0.5">
                    {buildLog.map((log, i) => (
                      <div key={i} className="text-[10px] font-mono text-muted-foreground/70 leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Publish button */}
              {finalized && (
                <Button className="w-full cursor-pointer gap-2" onClick={handlePublish}>
                  <Globe className="w-4 h-4" />
                  Publicar app
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL: Live Preview ===== */}
        <div className="flex-1 bg-[#0a0a0f] flex flex-col relative overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${preview.isLive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              <span className="text-xs text-muted-foreground">
                {preview.isLive ? "Preview en vivo" : "Esperando construcción..."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/50">
                v{preview.version}
              </span>
              {showCode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(preview.html)}
                  className="text-[10px] cursor-pointer"
                >
                  Copiar código
                </Button>
              )}
            </div>
          </div>

          {/* Preview area */}
          <div className={`flex-1 flex items-center justify-center p-2 overflow-hidden ${
            viewMode === "mobile" ? "bg-[#050508]" : ""
          }`}>
            {showCode ? (
              <div className="w-full h-full overflow-auto bg-[#0d0d14] rounded-lg p-4">
                <pre className="text-[11px] font-mono text-green-400/80 whitespace-pre-wrap leading-relaxed">
                  {preview.html.slice(0, 8000)}
                  {preview.html.length > 8000 && "\n\n/* ... más código ... */"}
                </pre>
              </div>
            ) : (
              <div className={`relative transition-all duration-300 ${
                viewMode === "mobile"
                  ? "w-[375px] h-[812px] rounded-[32px] overflow-hidden border-4 border-[#1a1a2e] shadow-2xl shadow-violet-900/20"
                  : "w-full h-full"
              }`}>
                <iframe
                  ref={iframeRef}
                  title="NexusAI Preview"
                  className="w-full h-full bg-white"
                  style={{
                    border: "none",
                    borderRadius: viewMode === "mobile" ? "28px" : "8px",
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}
          </div>

          {/* Bottom info bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5 bg-black/30">
            <span className="text-[10px] text-muted-foreground/40">
              {preview.isLive
                ? "🖱️ Puedes interactuar con la preview — clics, navegación, chat IA"
                : "Describe tu app y pulsa Construir"}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
              {user && <span>{user.email}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}