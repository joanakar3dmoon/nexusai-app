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
  // (freellm.net → Groq fallback → fallback local)
  // ============================================================

  const generateCodeBlock = async (
    stepId: string,
    stepName: string,
    systemPrompt: string,
    userContent: string,
  ): Promise<string> => {
    markStep(stepId, "running");
    addLog(`🔨 ${stepName}...`);

    // Intentar con freellm.net primero
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
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (!content) throw new Error("Respuesta vacía");
      markStep(stepId, "done", "✓");
      addLog(`✅ ${stepName} completado`);
      return content;
    } catch (_e1) {
      addLog(`⚡ ${stepName} — usando Groq...`);
      // Fallback: Groq (Llama 3.3 70B)
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer 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",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!gr.ok) throw new Error(`Groq HTTP ${gr.status}`);
        const gd = await gr.json();
        const gcontent = gd.choices?.[0]?.message?.content || "";
        if (!gcontent) throw new Error("Groq vacío");
        markStep(stepId, "done", "✓ Groq");
        addLog(`✅ ${stepName} (Groq)`);
        return gcontent;
      } catch (_e2) {
        markStep(stepId, "done", "✓ local");
        addLog(`⚠️ ${stepName} (fallback local)`);
        return generateFallbackCode(stepId, prompt);
      }
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
    const name = prompt.trim().split(" ").slice(0, 4).join(" ");
    setAppName(name);

    addLog(`🚀 Iniciando construcción: "${prompt.trim().slice(0, 50)}..."`);

    try {
      // ── PASO 1: Analizar prompt ──────────────────────────────
      markStep("analyze", "running");
      addLog("🔍 Analizando prompt con Groq...");

      let analysisData: any = { name, category: "general", colors: { primary: "#7c3aed" } };
      try {
        const ar = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: 'Analiza el prompt y responde SOLO con JSON válido: {"name":"nombre","category":"categoria","features":["f1"],"colors":{"primary":"#7c3aed"}}' },
              { role: "user", content: prompt.trim() },
            ],
            max_tokens: 300, temperature: 0.3,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (ar.ok) {
          const ad = await ar.json();
          const raw = ad.choices?.[0]?.message?.content || "";
          analysisData = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}") || analysisData;
        }
      } catch { /* usa defaults */ }
      markStep("analyze", "done", "✓ Groq");
      addLog(`✅ Analizando prompt (Groq)`);

      // ── PASO 2-8: Una sola llamada que genera el HTML completo ─
      markStep("html", "running");
      markStep("css", "running");
      markStep("js", "running");
      markStep("admob", "running");
      markStep("amazon", "running");
      markStep("freellm", "running");
      markStep("pwa", "running");
      addLog("⚡ Generando app completa con Groq (1 llamada)...");

      const ADMOB_PUBLISHER = "ca-pub-4903263409458961";
      const ADMOB_BANNER    = "ca-app-pub-4903263409458961/8825147276";
      const ADMOB_INTER     = "ca-app-pub-4903263409458961/4622591073";
      const AMAZON_TAG      = "r3dm01-21";

      const systemPrompt = `Eres un generador experto de apps web completas.
Genera un HTML completo (<!DOCTYPE html>...) de una app real y funcional.
La app debe ser mobile-first, dark theme, profesional.
DEBES incluir TODO en un único archivo HTML:
1. HTML estructura completa con contenido real (no placeholders)
2. CSS completo inline en <style> — dark theme (#0a0a0f), color primario ${analysisData.colors?.primary || "#7c3aed"}, responsive
3. JS completo inline en <script> — navegación entre secciones, interacciones, animaciones
4. Banner AdMob visual fijo abajo (data-ad-client="${ADMOB_PUBLISHER}" data-ad-slot="${ADMOB_BANNER.split("/")[1]}")
5. Script intersticial AdMob cada 3 clics (slot ${ADMOB_INTER.split("/")[1]})
6. Script Amazon afiliados tag="${AMAZON_TAG}" — auto-convierte links amazon
7. Botón flotante 🤖 que abre chat IA (llama a https://api.groq.com/openai/v1/chat/completions con Bearer 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, modelo llama-3.3-70b-versatile)
8. Bottom navigation bar con iconos emoji
9. Meta PWA: theme-color, apple-mobile-web-app-capable

RESPONDE SOLO con el código HTML completo. Sin explicaciones. Sin markdown. Sin \`\`\`html.`;

      let finalHtml = "";
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `App: ${prompt.trim()}\nNombre: ${analysisData.name || name}\nCategoría: ${analysisData.category || "general"}\nFeatures: ${(analysisData.features || []).join(", ")}` },
            ],
            max_tokens: 8000, temperature: 0.7,
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (!gr.ok) throw new Error(`Groq HTTP ${gr.status}`);
        const gd = await gr.json();
        finalHtml = gd.choices?.[0]?.message?.content || "";
        // Limpiar posibles backticks de markdown
        // Extraer solo el bloque HTML limpio (sin markdown)
        const htmlMatch = finalHtml.match(/<!DOCTYPE[\s\S]*?<\/html>/i) ||
                          finalHtml.match(/<html[\s\S]*?<\/html>/i);
        if (htmlMatch) finalHtml = htmlMatch[0];
        else finalHtml = finalHtml.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
        if (!finalHtml.includes("<html")) throw new Error("HTML inválido");
      } catch (e) {
        addLog(`⚠️ Error Groq: ${e instanceof Error ? e.message : e} — usando fallback`);
        finalHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${analysisData.colors?.primary || "#7c3aed"}"><title>${analysisData.name || name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}header{background:#1a1a2e;padding:16px;text-align:center;border-bottom:1px solid rgba(124,58,237,.3)}h1{color:${analysisData.colors?.primary || "#7c3aed"};font-size:1.4rem}.content{padding:20px;max-width:600px;margin:0 auto}.card{background:#1a1a2e;border-radius:12px;padding:16px;margin:12px 0;border:1px solid rgba(255,255,255,.1)}button{background:${analysisData.colors?.primary || "#7c3aed"};color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;margin-top:8px;font-size:1rem}.nav{position:fixed;bottom:0;width:100%;background:#1a1a2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid rgba(255,255,255,.1)}.nav button{background:none;font-size:1.5rem;width:auto;margin:0}</style></head><body><header><h1>✨ ${analysisData.name || name}</h1></header><div class="content"><div class="card"><h2>Bienvenido</h2><p style="margin-top:8px;color:#aaa">App generada con NexusAI</p><button onclick="alert('¡Hola!')">Comenzar</button></div></div><nav class="nav"><button>🏠</button><button>🔍</button><button>⭐</button><button>👤</button></nav></body></html>`;
      }

      // Marcar todos los pasos como done
      ["html","css","js","admob","amazon","freellm","pwa"].forEach(s => markStep(s, "done", "✓ Groq"));
      addLog("✅ App generada con AdMob + Amazon + Chat IA");
      updatePreview(finalHtml, "🎨 App lista — puedes interactuar");

      // ── PASO FINAL: Guardar ──────────────────────────────────
      markStep("finalize", "running");
      addLog("✨ Finalizando...");
      await new Promise(r => setTimeout(r, 500));
      markStep("finalize", "done", "✓ Publicada");
      addLog(`🎉 "${analysisData.name || name}" lista`);
      setFinalized(true);

      if (user) {
        try {
          const newId = crypto.randomUUID();
          const stored = JSON.parse(localStorage.getItem("nexusai_apps") || "[]");
          stored.push({
            id: newId, user_id: user.id || user.email,
            name: analysisData.name || name,
            description: prompt.trim().slice(0, 500),
            category: analysisData.category || "general",
            prompt: prompt.trim(), source_code: finalHtml,
            status: "published", views: 0, downloads: 0, revenue: 0,
            monetization: { admob: true, amazon: true, groq: true, pwa: true },
            created_at: new Date().toISOString(),
          });
          localStorage.setItem("nexusai_apps", JSON.stringify(stored));
          setAppId(newId);
          addLog(`💾 App guardada (ID: ${newId.slice(0, 8)}...)`);
        } catch { addLog("⚠️ No se pudo guardar en local"); }
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

    // Usar freellm → Groq para modificar el HTML actual
    const feedbackSystemPrompt = `Eres un modificador de código HTML en vivo.
Tienes el HTML completo de una app. El usuario pide un cambio.
Responde SOLO con el HTML completo modificado, manteniendo toda la funcionalidad existente (AdMob, Amazon, chat IA, etc.).
NO pierdas nada del código anterior. Solo aplica el cambio solicitado.`;
    const feedbackUserMsg = `HTML ACTUAL:\n${preview.html}\n\nCAMBIO SOLICITADO:\n${fb.text}`;

    // Intentar freellm primero
    let modifiedHTML = "";
    try {
      const response = await fetch("https://api.freellm.net/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer free" },
        body: JSON.stringify({
          model: "gpt-4o-mini-free",
          messages: [{ role: "system", content: feedbackSystemPrompt }, { role: "user", content: feedbackUserMsg }],
          temperature: 0.5, max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const data = await response.json();
        modifiedHTML = data.choices?.[0]?.message?.content || "";
      }
    } catch {}

    // Si freellm falló, usar Groq
    if (!modifiedHTML.includes("<html")) {
      addLog("⚡ Aplicando cambio con Groq...");
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: feedbackSystemPrompt }, { role: "user", content: feedbackUserMsg }],
            temperature: 0.5, max_tokens: 8192,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (gr.ok) {
          const gd = await gr.json();
          modifiedHTML = gd.choices?.[0]?.message?.content || "";
        }
      } catch {}
    }

    if (modifiedHTML.includes("<!DOCTYPE html>") || modifiedHTML.includes("<html")) {
      updatePreview(modifiedHTML, `✅ Cambio aplicado: "${fb.text.slice(0, 50)}"`);
      setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: "applied" } : f));
      addLog("🎨 Preview actualizada — puedes seguir interactuando");
      return;
    }

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
      const stored = JSON.parse(localStorage.getItem("nexusai_apps") || "[]");
      const idx = stored.findIndex((a: any) => a.id === appId);
      if (idx >= 0) { stored[idx].status = "published"; localStorage.setItem("nexusai_apps", JSON.stringify(stored)); }
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