import { motion } from "motion/react";
import {
  BrainCircuit, Bot, Code2, Settings, CreditCard, LogOut, Menu, X,
  Send, Loader2, DollarSign, Download, Globe, Smartphone, ExternalLink,
  Eye, Trash2, RefreshCw, TrendingUp, ShoppingCart,
  Zap, Copy, Check, BadgeDollarSign, FlaskConical, ChevronDown, RotateCcw, Cpu
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

// ---- Tipos ----
type AppRecord = {
  id: string;
  name: string;
  description: string;
  status: string;
  views: number;
  downloads: number;
  revenue: number;
  created_at: string;
  source_code?: string;
};

type TabId = "generator" | "myapps" | "playground" | "monetize" | "credits";

type PlayMessage = { role: "user" | "assistant" | "system"; content: string };

// ---- localStorage helpers ----
const APPS_KEY = "nexusai_apps";
function loadStoredApps(): AppRecord[] {
  try { return JSON.parse(localStorage.getItem(APPS_KEY) || "[]"); } catch { return []; }
}
function saveApps(apps: AppRecord[]) {
  localStorage.setItem(APPS_KEY, JSON.stringify(apps));
}

// ---- Proveedores LLM ----
const LLM_PROVIDERS = [
  { id: "freellm",   label: "GPT-4o Mini",    tag: "Gratis",   color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",    url: "https://api.freellm.net/v1/chat/completions",            model: "gpt-4o-mini-free",                    keyEnv: "" },
  { id: "groq",      label: "Llama 3.3 70B",  tag: "Groq",     color: "text-violet-400 border-violet-500/40 bg-violet-500/10", url: "https://api.groq.com/openai/v1/chat/completions",        model: "llama-3.3-70b-versatile",             keyEnv: "VITE_GROQ_API_KEY" },
  { id: "deepseek",  label: "DeepSeek R1",    tag: "Groq",     color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", url: "https://api.groq.com/openai/v1/chat/completions",     model: "deepseek-r1-distill-llama-70b",       keyEnv: "VITE_GROQ_API_KEY" },
  { id: "qwen",      label: "Qwen 2.5 72B",   tag: "Groq",     color: "text-orange-400 border-orange-500/40 bg-orange-500/10", url: "https://api.groq.com/openai/v1/chat/completions",       model: "qwen-qwq-32b",                        keyEnv: "VITE_GROQ_API_KEY" },
  { id: "mixtral",   label: "Mixtral 8x7B",   tag: "Groq",     color: "text-pink-400 border-pink-500/40 bg-pink-500/10",    url: "https://api.groq.com/openai/v1/chat/completions",        model: "mixtral-8x7b-32768",                  keyEnv: "VITE_GROQ_API_KEY" },
];

async function callLLM(
  messages: PlayMessage[],
  providerId: string,
  temperature: number,
  maxTokens: number,
  apiKeys: Record<string, string>
): Promise<string> {
  const p = LLM_PROVIDERS.find(x => x.id === providerId) ?? LLM_PROVIDERS[2];
  const key = p.keyEnv ? (apiKeys[p.keyEnv] ?? "") : "free";

  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key || "free"}` },
    body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let reply = data.choices?.[0]?.message?.content ?? "";
  // DeepSeek R1 incluye bloques <think>...</think> — los quitamos
  reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return reply;
}

async function generateWithFreeLLM(prompt: string, apiKeys: Record<string, string>): Promise<string> {
  // IDs reales de AdMob (Nexusia - Joan)
  const ADMOB_APP_ID    = "ca-app-pub-4903263409458961~5751005760";
  const ADMOB_BANNER    = "ca-app-pub-4903263409458961/8825147276";
  const ADMOB_INTER     = "ca-app-pub-4903263409458961/4622591073";
  const ADMOB_REWARDED  = "ca-app-pub-4903263409458961/3980014703";
  const AMAZON_TAG      = "r3dm01-21";

  const systemPrompt = `Eres un generador de apps web PWA. Dado un prompt, genera una app completa en un solo archivo HTML con CSS y JS embebidos.
REGLAS:
- Diseño dark moderno y mobile-first
- Integra AdMob REAL con los siguientes IDs exactos:
  * App ID: ${ADMOB_APP_ID}
  * Banner: ${ADMOB_BANNER} — div fijo en la parte inferior con id="admob-banner"
  * Intersticial: ${ADMOB_INTER} — actívalo al cargar la app
  * Rewarded: ${ADMOB_REWARDED} — actívalo en el botón principal
  * SDK: <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_APP_ID}" crossorigin="anonymous"></script>
- Incluye al menos 3 enlaces de afiliado Amazon España reales con productos relevantes al tema:
  * Formato: https://www.amazon.es/s?k=PRODUCTO&tag=${AMAZON_TAG}
- Devuelve SOLO el código HTML completo, sin explicaciones ni markdown.`;

  for (const p of LLM_PROVIDERS) {
    const key = p.keyEnv ? (apiKeys[p.keyEnv] ?? "") : "free";
    if (p.keyEnv && !key) continue;
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key || "free"}` },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
          max_tokens: 8192,
          temperature: 0.7,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let code = data.choices?.[0]?.message?.content ?? "";
      if (code.includes("```html")) code = code.split("```html")[1].split("```")[0];
      else if (code.includes("```")) code = code.split("```")[1].split("```")[0];
      return code.trim();
    } catch { continue; }
  }
  throw new Error("Todos los proveedores fallaron. Añade una API key gratuita en Créditos.");
}

// ---- Amazon productos ----
const AMAZON_PRODUCTS = [
  { name: "Auriculares Bluetooth", url: "https://www.amazon.es/s?k=auriculares+bluetooth&tag=r3dm01-21", img: "🎧" },
  { name: "Teclado mecánico", url: "https://www.amazon.es/s?k=teclado+mecanico&tag=r3dm01-21", img: "⌨️" },
  { name: "Micrófono USB", url: "https://www.amazon.es/s?k=microfono+usb&tag=r3dm01-21", img: "🎙️" },
  { name: "Monitor 4K", url: "https://www.amazon.es/s?k=monitor+4k&tag=r3dm01-21", img: "🖥️" },
  { name: "SSD portátil", url: "https://www.amazon.es/s?k=ssd+portatil&tag=r3dm01-21", img: "💾" },
  { name: "Webcam HD", url: "https://www.amazon.es/s?k=webcam+hd&tag=r3dm01-21", img: "📷" },
];

// ---- Playground: system prompts predefinidos ----
const SYSTEM_PRESETS = [
  { label: "Asistente general", value: "Eres un asistente IA útil, claro y conciso. Responde siempre en español." },
  { label: "Generador de código", value: "Eres un experto programador. Genera código limpio, comentado y funcional. Usa markdown para el código." },
  { label: "Generador de apps HTML", value: "Eres un generador de apps web. Genera apps completas en un solo archivo HTML con CSS y JS embebidos. Dark mode, mobile-first. Solo devuelve el código HTML." },
  { label: "Analista de negocio", value: "Eres un analista de negocios digital. Ayuda a monetizar proyectos online con estrategias de afiliados, publicidad y SaaS." },
  { label: "Escritor creativo", value: "Eres un escritor creativo. Ayuda con letras de canciones, textos para redes sociales, descripciones de productos y copywriting." },
];

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generator
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Playground
  const [playMessages, setPlayMessages] = useState<PlayMessage[]>([]);
  const [playInput, setPlayInput] = useState("");
  const [playLoading, setPlayLoading] = useState(false);
  const [playProvider, setPlayProvider] = useState("freellm");
  const [playTemp, setPlayTemp] = useState(0.7);
  const [playMaxTokens, setPlayMaxTokens] = useState(2048);
  const [playSystemPrompt, setPlaySystemPrompt] = useState(SYSTEM_PRESETS[0].value);
  const [playSystemVisible, setPlaySystemVisible] = useState(false);
  const [playApiKeys, setPlayApiKeys] = useState<Record<string, string>>({
    VITE_GROQ_API_KEY: "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",
  });
  const playBottomRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>("generator");

  useEffect(() => { setApps(loadStoredApps()); }, []);
  useEffect(() => { playBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [playMessages]);

  const addLog = (msg: string) => setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // ---- Generar app ----
  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setStatusLog([]);
    const appName = prompt.trim().split(" ").slice(0, 4).join(" ");
    addLog(`🚀 Generando "${appName}"...`);
    addLog("🔗 Conectando con IA gratuita...");
    try {
      const code = await generateWithFreeLLM(prompt.trim(), playApiKeys);
      addLog("✅ App generada");
      addLog("💰 AdMob + Amazon Afiliados integrados");
      const newApp: AppRecord = {
        id: Date.now().toString(),
        name: appName,
        description: prompt.trim(),
        status: "published",
        views: 0, downloads: 0, revenue: 0,
        created_at: new Date().toISOString(),
        source_code: code,
      };
      const updated = [newApp, ...apps];
      setApps(updated);
      saveApps(updated);
      setPrompt("");
      addLog(`✅ "${appName}" lista. Ve a "Mis Apps".`);
    } catch (err) {
      addLog(`❌ ${err instanceof Error ? err.message : "Error"}`);
    } finally { setGenerating(false); }
  };

  // ---- Playground send ----
  const handlePlaySend = async () => {
    if (!playInput.trim() || playLoading) return;
    const userMsg: PlayMessage = { role: "user", content: playInput.trim() };
    const messages: PlayMessage[] = [
      { role: "system", content: playSystemPrompt },
      ...playMessages,
      userMsg,
    ];
    setPlayMessages(prev => [...prev, userMsg]);
    setPlayInput("");
    setPlayLoading(true);
    try {
      const reply = await callLLM(messages, playProvider, playTemp, playMaxTokens, playApiKeys);
      setPlayMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setPlayMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err instanceof Error ? err.message : "Fallo de conexión"}` }]);
    } finally { setPlayLoading(false); }
  };

  const deleteApp = (id: string) => {
    const updated = apps.filter(a => a.id !== id);
    setApps(updated); saveApps(updated);
  };
  const previewApp = (code: string) => {
    const blob = new Blob([code], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };
  const downloadApp = (app: AppRecord) => {
    if (!app.source_code) return;
    const blob = new Blob([app.source_code], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${app.name.replace(/\s+/g, "-")}.html`;
    a.click();
  };

  const credits = user?.credits ?? 100;

  const sidebarItems: { id: TabId; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: "generator", icon: Code2, label: "Generador IA" },
    { id: "myapps", icon: Smartphone, label: "Mis Apps", badge: apps.length > 0 ? String(apps.length) : undefined },
    { id: "playground", icon: FlaskConical, label: "Playground IA", badge: "NEW" },
    { id: "monetize", icon: BadgeDollarSign, label: "Monetizar" },
    { id: "credits", icon: CreditCard, label: "Créditos" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <BrainCircuit className="text-primary w-6 h-6" />
          <span className="font-bold">NexusAI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge className={`text-[9px] px-1.5 ${item.badge === "NEW" ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-primary/20 text-primary border-primary/30"}`}>
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground px-3">
            <span className="block truncate">{user?.email}</span>
            <span className="block text-[10px] mt-0.5">{credits} créditos</span>
            {isAdmin && <Badge variant="outline" className="mt-1 text-[10px]">Admin</Badge>}
          </div>
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
              <Settings className="w-4 h-4" /> Panel Admin
            </button>
          )}
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm">
                {activeTab === "generator" && "Generador de Apps IA"}
                {activeTab === "myapps" && "Mis Apps"}
                {activeTab === "playground" && "⚗️ Playground IA"}
                {activeTab === "monetize" && "💰 Monetizar"}
                {activeTab === "credits" && "Créditos"}
              </h1>
            </div>
            <Badge variant="outline" className="text-xs">{credits} créditos</Badge>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">

          {/* ===== GENERATOR ===== */}
          {activeTab === "generator" && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    Agente Constructor IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Describe la app que quieres y la IA la genera completa con <strong>AdMob</strong> y <strong>Amazon Afiliados</strong> integrados.
                  </p>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Ej: App de recetas de cocina con búsqueda por ingredientes y diseño oscuro..."
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    disabled={generating}
                    onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleGenerate(); }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">Ctrl+Enter para generar · ID Amazon: r3dm01-21</span>
                    <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} size="sm" className="cursor-pointer">
                      {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generando...</> : <><Send className="w-4 h-4 mr-1" /> Generar App</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {statusLog.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Log de generación</CardTitle></CardHeader>
                  <CardContent>
                    <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs space-y-1">
                      {statusLog.map((log, i) => (
                        <div key={i} className={log.includes("❌") ? "text-red-400" : log.includes("✅") || log.includes("💰") ? "text-emerald-400" : "text-muted-foreground"}>{log}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-dashed border-primary/20 bg-primary/5">
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">¿Quieres probar un modelo antes de generar tu app?</p>
                    <Button variant="outline" size="sm" className="mt-2 cursor-pointer" onClick={() => setActiveTab("playground")}>
                      <FlaskConical className="w-3.5 h-3.5 mr-1" /> Abrir Playground IA
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed border-violet-500/30 bg-violet-500/5">
                  <CardContent className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">Preview en tiempo real + editor de código avanzado</p>
                    <Button variant="outline" size="sm" className="mt-2 cursor-pointer border-violet-500/40 text-violet-400 hover:bg-violet-500/10" onClick={() => navigate("/builder")}>
                      <Zap className="w-3.5 h-3.5 mr-1" /> Builder Avanzado ✨
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ===== MIS APPS ===== */}
          {activeTab === "myapps" && (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs text-muted-foreground">{apps.length} app{apps.length !== 1 ? "s" : ""} generada{apps.length !== 1 ? "s" : ""}</p>
              {apps.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aún no has generado ninguna app</p>
                    <Button variant="outline" size="sm" className="mt-3 cursor-pointer" onClick={() => setActiveTab("generator")}>Ir al generador</Button>
                  </CardContent>
                </Card>
              ) : apps.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm truncate">{app.name}</h3>
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">Publicada</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{app.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                          <span>📅 {new Date(app.created_at).toLocaleDateString()}</span>
                          <span className="text-emerald-400">💰 AdMob + Amazon integrado</span>
                        </div>
                      </div>
                      <button onClick={() => deleteApp(app.id)} className="text-muted-foreground/40 hover:text-red-400 cursor-pointer ml-2 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {app.source_code && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => previewApp(app.source_code!)}>
                          <Globe className="w-3 h-3 mr-1" /> Vista previa
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setSelectedCode(app.source_code!)}>
                          <Code2 className="w-3 h-3 mr-1" /> Código
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => downloadApp(app)}>
                          <Download className="w-3 h-3 mr-1" /> Descargar .html
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => navigate("/builder")}>
                          <Zap className="w-3 h-3 mr-1" /> Mejorar con IA
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {/* ===== PLAYGROUND IA ===== */}
          {activeTab === "playground" && (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

              {/* Config panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-violet-400" />
                    Configuración del modelo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Modelo IA</label>
                      <div className="flex flex-wrap gap-2">
                        {LLM_PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setPlayProvider(p.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${p.color} ${playProvider === p.id ? "ring-2 ring-white/30 opacity-100" : "opacity-40 hover:opacity-70"}`}
                          >
                            <Cpu className="w-3 h-3 inline mr-1" />
                            {p.label}
                            <span className="ml-1.5 text-[10px] opacity-60">{p.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Temperatura */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Temperatura: <strong className="text-foreground">{playTemp}</strong>
                        <span className="ml-2 text-[10px]">(0 = preciso · 1 = creativo)</span>
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05} value={playTemp}
                        onChange={e => setPlayTemp(Number(e.target.value))}
                        className="w-full accent-violet-500"
                      />
                    </div>

                    {/* Max tokens */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Max tokens: <strong className="text-foreground">{playMaxTokens}</strong>
                      </label>
                      <input
                        type="range" min={256} max={8192} step={256} value={playMaxTokens}
                        onChange={e => setPlayMaxTokens(Number(e.target.value))}
                        className="w-full accent-violet-500"
                      />
                    </div>

                    {/* System prompt preset */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Preset de rol</label>
                      <select
                        onChange={e => setPlaySystemPrompt(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                      >
                        {SYSTEM_PRESETS.map(p => (
                          <option key={p.label} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* System prompt editable */}
                  <div>
                    <button
                      onClick={() => setPlaySystemVisible(v => !v)}
                      className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground cursor-pointer"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${playSystemVisible ? "rotate-180" : ""}`} />
                      {playSystemVisible ? "Ocultar" : "Editar"} system prompt
                    </button>
                    {playSystemVisible && (
                      <textarea
                        value={playSystemPrompt}
                        onChange={e => setPlaySystemPrompt(e.target.value)}
                        rows={3}
                        className="mt-2 w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chat window */}
              <Card className="flex flex-col" style={{ minHeight: "400px" }}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-sm">Conversación</CardTitle>
                  <button
                    onClick={() => setPlayMessages([])}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Limpiar
                  </button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96 pr-1">
                    {playMessages.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Empieza a chatear con la IA</p>
                        <p className="text-xs mt-1 opacity-60">Prueba cualquier modelo, ajusta parámetros en tiempo real</p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                          {["Hola, ¿qué puedes hacer?", "Escribe un poema sobre la IA", "Dame ideas de apps para monetizar"].map(eg => (
                            <button
                              key={eg}
                              onClick={() => setPlayInput(eg)}
                              className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                            >
                              {eg}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {playMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground border border-border"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {playLoading && (
                      <div className="flex justify-start">
                        <div className="bg-secondary border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Pensando...</span>
                        </div>
                      </div>
                    )}
                    <div ref={playBottomRef} />
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <textarea
                      value={playInput}
                      onChange={e => setPlayInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePlaySend(); } }}
                      placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para salto de línea)"
                      rows={2}
                      className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      disabled={playLoading}
                    />
                    <Button
                      onClick={handlePlaySend}
                      disabled={playLoading || !playInput.trim()}
                      size="sm"
                      className="self-end cursor-pointer"
                    >
                      {playLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Info proveedor activo */}
                  <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {LLM_PROVIDERS.find(p => p.id === playProvider)?.label} · temp {playTemp} · {playMaxTokens} tokens
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ===== MONETIZAR ===== */}
          {activeTab === "monetize" && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

              {/* AdMob */}
              <Card className="border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Google AdMob
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Todas las apps que generas incluyen espacios para anuncios AdMob. Para activarlos:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Crea una cuenta en <a href="https://admob.google.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">admob.google.com</a></li>
                    <li>Crea una nueva app y obtén tu App ID y Ad Unit ID</li>
                    <li>Pega tus IDs en la app generada (busca <code className="bg-black/30 px-1 rounded">admob-banner</code>)</li>
                  </ol>
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-300">
                    💡 Con 1.000 visitas/día puedes ganar entre 0,50€ y 3€/día en anuncios display.
                  </div>
                  <Button size="sm" className="cursor-pointer gap-2 bg-yellow-600 hover:bg-yellow-500 text-black" onClick={() => window.open("https://admob.google.com", "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5" /> Ir a AdMob
                  </Button>
                </CardContent>
              </Card>

              {/* Amazon Afiliados */}
              <Card className="border-orange-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-400" />
                    Amazon Afiliados
                    <Badge className="text-[10px] bg-orange-500/20 text-orange-300 border-orange-500/30 shrink-0">ID: r3dm01-21</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Tu ID de afiliado <strong className="text-orange-400">r3dm01-21</strong> ya está integrado en todas las apps generadas. Comisión: 3–10% por venta.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AMAZON_PRODUCTS.map(p => (
                      <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-center">
                        <span className="text-2xl">{p.img}</span>
                        <span className="text-[11px] text-orange-300">{p.name}</span>
                      </a>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="cursor-pointer gap-2 bg-orange-600 hover:bg-orange-500" onClick={() => window.open("https://afiliados.amazon.es", "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" /> Panel Afiliados
                    </Button>
                    <Button size="sm" variant="outline" className="cursor-pointer gap-2 text-xs" onClick={() => {
                      navigator.clipboard.writeText("https://www.amazon.es/s?k=musica+electronica&tag=r3dm01-21");
                      setCopied(true); setTimeout(() => setCopied(false), 2000);
                    }}>
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copiar enlace
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen ingresos potenciales */}
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Ingresos potenciales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-xs text-muted-foreground">AdMob</p>
                      <p className="text-xl font-bold text-yellow-400">~1€</p>
                      <p className="text-[10px] text-muted-foreground">por 1k visitas/día</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                      <p className="text-xs text-muted-foreground">Amazon Afiliados</p>
                      <p className="text-xl font-bold text-orange-400">~5%</p>
                      <p className="text-[10px] text-muted-foreground">de cada venta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ===== CRÉDITOS ===== */}
          {activeTab === "credits" && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Plan Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Plan Free</h3>
                      <p className="text-xs text-muted-foreground">{credits} créditos disponibles</p>
                    </div>
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20">Activo</Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mb-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (credits / 100) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{credits} de 100 créditos</p>
                  <div className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Plan Pro (€29/mes):</strong> Créditos ilimitados, apps ilimitadas, retiros a PayPal.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* API Keys para Playground */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-violet-400" />
                    API Keys para Playground IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Opcional — el Playground funciona gratis con FreeLLM. Añade tus propias keys para modelos más potentes.
                  </p>
                  {[
                    { label: "Groq API Key (gratis)", key: "VITE_GROQ_API_KEY", link: "https://console.groq.com/keys" },
                    { label: "Together AI Key (gratis)", key: "VITE_TOGETHER_API_KEY", link: "https://api.together.xyz/settings/api-keys" },
                    { label: "OpenRouter Key (gratis)", key: "VITE_OPENROUTER_API_KEY", link: "https://openrouter.ai/keys" },
                  ].map(item => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">{item.label}</label>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">Obtener gratis →</a>
                      </div>
                      <input
                        type="password"
                        placeholder="sk-..."
                        value={playApiKeys[item.key] ?? ""}
                        onChange={e => setPlayApiKeys(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Code Modal */}
      {selectedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedCode(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-sm">Código fuente</h3>
              <button onClick={() => setSelectedCode(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono">{selectedCode}</pre>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { navigator.clipboard.writeText(selectedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} Copiar
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={() => previewApp(selectedCode)}>
                <Globe className="w-3 h-3 mr-1" /> Vista previa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
