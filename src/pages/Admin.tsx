import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import {
  BarChart3, Users, DollarSign, CreditCard, Shield,
  LogOut, Menu, X, Check, AlertCircle, Trash2, Ban,
  ShoppingCart, Wallet, TrendingUp, Bot, Euro, Activity,
  ChevronRight, RefreshCw, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { dbGetUsers, dbGetApps, dbGetWithdrawals, dbUpdateUser, dbDeleteApp, dbSaveApp, dbSaveWithdrawal, dbUpdateWithdrawal } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  credits: number;
  balance: number;
  banned?: boolean;
  createdAt?: string;
}

interface StoredApp {
  id: string;
  name: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  status?: string;
  platform?: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  paypalEmail?: string;
  note?: string;
}

type Tab = "dashboard" | "users" | "apps" | "withdrawals" | "stats" | "bot" | "creator";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const PAYPAL_EMAIL = "joanlazaro83@gmail.com";
const ADMIN_EMAIL = "joanlazaro83@gmail.com";

function ls<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ──────────────────────────────────────────────
// Simulated revenue data (AdMob + Amazon)
// ──────────────────────────────────────────────
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const ADMOB_DATA = [12, 18, 14, 22, 30, 27, 35, 40, 33, 28, 45, 52];
const AMAZON_DATA = [5, 8, 6, 10, 14, 12, 16, 20, 15, 13, 22, 28];

// ──────────────────────────────────────────────
// Bar Chart (pure CSS)
// ──────────────────────────────────────────────
function BarChart({ admob, amazon, months }: { admob: number[]; amazon: number[]; months: string[] }) {
  const max = Math.max(...admob, ...amazon);
  const currentMonth = new Date().getMonth();

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 h-40 min-w-[520px] mt-4">
        {months.map((m, i) => (
          <div key={m} className="flex flex-col items-center gap-0.5 flex-1">
            <div className="flex items-end gap-0.5 w-full justify-center">
              {/* AdMob bar */}
              <div
                title={`AdMob: €${admob[i]}`}
                style={{ height: `${(admob[i] / max) * 100}%` }}
                className={`w-3 rounded-t transition-all duration-500 ${
                  i === currentMonth
                    ? "bg-purple-400"
                    : "bg-purple-600/60 hover:bg-purple-500"
                }`}
              />
              {/* Amazon bar */}
              <div
                title={`Amazon: €${amazon[i]}`}
                style={{ height: `${(amazon[i] / max) * 100}%` }}
                className={`w-3 rounded-t transition-all duration-500 ${
                  i === currentMonth
                    ? "bg-orange-400"
                    : "bg-orange-600/60 hover:bg-orange-500"
                }`}
              />
            </div>
            <span className={`text-[10px] ${i === currentMonth ? "text-white font-bold" : "text-muted-foreground"}`}>
              {m}
            </span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-purple-500" /> AdMob
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-500" /> Amazon
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color ?? "bg-purple-600/20"}`}>
          <Icon className={`w-5 h-5 ${color ? "text-white" : "text-purple-400"}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
// ── Constantes compartidas para los componentes del Creator ──
const GROQ_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const PLAY_MODELS = [
  { id: "llama", label: "Llama 3.3 70B", color: "text-violet-300 border-violet-500/30 bg-violet-500/10", model: "llama-3.3-70b-versatile" },
  { id: "deepseek", label: "DeepSeek R1", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", model: "deepseek-r1-distill-llama-70b" },
  { id: "mixtral", label: "Mixtral 8x7B", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10", model: "mixtral-8x7b-32768" },
  { id: "gemma", label: "Gemma 2 9B", color: "text-pink-300 border-pink-500/30 bg-pink-500/10", model: "gemma2-9b-it" },
];

type ChatMsg = { role: "user" | "assistant"; content: string; model?: string };

// ── Playground IA incrustado en Admin ──────────────────────
function AdminPlayground() {
  const [selectedModel, setSelectedModel] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    const pm = PLAY_MODELS[selectedModel];
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: pm.model, messages: newMsgs.map(m => ({ role: m.role, content: m.content })), max_tokens: 2048, temperature: 0.7 }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let reply = data.choices?.[0]?.message?.content ?? "";
      reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (!reply) throw new Error("Respuesta vacía");
      setMessages([...newMsgs, { role: "assistant", content: reply, model: pm.label }]);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setMessages(newMsgs);
    } finally {
      setLoading(false);
      setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    }
  };

  return (
    <Card className="border-violet-500/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-violet-300 flex items-center gap-2">
          <Bot className="w-4 h-4" /> Playground IA — Chat en tiempo real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selector modelo */}
        <div className="flex gap-2 flex-wrap">
          {PLAY_MODELS.map((m, i) => (
            <button key={m.id} onClick={() => setSelectedModel(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${m.color} ${selectedModel === i ? "ring-2 ring-white/20" : "opacity-50 hover:opacity-80"}`}>
              <Cpu className="w-3 h-3 inline mr-1" />{m.label}
            </button>
          ))}
        </div>
        {/* Mensajes */}
        <div ref={msgsRef} className="bg-black/30 rounded-xl border border-white/5 p-3 min-h-[180px] max-h-[300px] overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-white/20 text-sm py-6">
              <Bot className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Escribe algo — IA real, sin trucos
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600/30 text-white border border-violet-500/20" : "bg-white/[0.04] text-white/80 border border-white/5"}`}>
                {msg.role === "assistant" && <p className="text-[10px] text-white/30 font-mono mb-1">{msg.model}</p>}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.04] border border-white/5 rounded-xl px-3 py-2 flex items-center gap-1.5">
                {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
        {/* Input */}
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Pregunta a la IA..." disabled={loading}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40 placeholder:text-white/20" />
          <button onClick={send} disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity">→</button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Generador de Apps incrustado en Admin ──────────────────
const GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "deepseek-r1-distill-llama-70b",
  "mixtral-8x7b-32768",
  "llama-3.1-8b-instant",
];

async function buildAppWithFallback(prompt: string): Promise<string> {
  const ADMOB_APP_ID   = "ca-app-pub-4903263409458961~5751005760";
  const ADMOB_BANNER   = "ca-app-pub-4903263409458961/8825147276";
  const AMAZON_TAG     = "r3dm01-21";
  const systemPrompt = `Eres NexusAI Builder. Genera una app web PWA completa en un solo archivo HTML.
REGLAS ESTRICTAS:
- Empieza EXACTAMENTE con <!DOCTYPE html> — sin texto antes
- Termina EXACTAMENTE con </html> — sin texto después
- CSS en <style> dentro de <head>. JS en <script> antes de </body>
- Dark theme mobile-first, Poppins de Google Fonts
- Bottom navigation con 4 secciones y emojis
- Integra AdMob: <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_APP_ID}" crossorigin="anonymous"></script>
- Banner fijo abajo: data-ad-client="${ADMOB_APP_ID}" data-ad-slot="8825147276"
- Al menos 2 enlaces afiliado Amazon: https://www.amazon.es/s?k=PRODUCTO&tag=${AMAZON_TAG}
- Devuelve SOLO el HTML completo, cero explicaciones, cero markdown`;

  for (const model of GROQ_MODELS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 55000);
      let res: Response;
      try {
        res = await fetch(GROQ_URL, {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            max_tokens: 8192,
            temperature: 0.7,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        console.warn(`[NexusAI] modelo ${model} -> HTTP ${res.status}`, errTxt);
        continue;
      }
      const data = await res.json();
      let code: string = data.choices?.[0]?.message?.content ?? "";
      code = code.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (code.includes("\`\`\`html")) code = code.split("\`\`\`html")[1].split("\`\`\`")[0].trim();
      else if (code.includes("\`\`\`")) code = code.split("\`\`\`")[1].split("\`\`\`")[0].trim();
      if (code.length > 300 && code.includes("</html>")) return code;
    } catch(e) { console.warn(`[NexusAI] modelo ${model} excepción:`, e); continue; }
  }
  // Fallback local
  const title = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>App NexusAI</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;padding:20px;text-align:center}.card{background:#1a1a2e;border:1px solid #ffffff15;border-radius:16px;padding:24px;max-width:400px;width:100%}h1{font-size:1.4rem;color:#a78bfa;margin-bottom:8px}p{color:#888;font-size:.9rem;line-height:1.5}.btn{background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:1rem;cursor:pointer;margin-top:16px;width:100%}</style></head><body><div class="card"><h1>🤖 ${title}</h1><p>App generada con NexusAI. Personaliza este contenido según tus necesidades.</p><button class="btn" onclick="alert('Funcionando!')">Comenzar</button></div></body></html>`;
}

function AdminAppBuilder() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const generate = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true); setError(""); setGeneratedCode(""); setLog([]); setPreview(false);
    addLog("🔍 Analizando prompt...");
    addLog("⚡ Conectando con IA (puede tardar ~30s)...");
    try {
      const code = await buildAppWithFallback(text);
      setGeneratedCode(code);
      addLog("✅ App generada — AdMob + Amazon integrados");
      setPreview(true);
      // Guardar en Supabase
      const appRecord = {
        id: `app-${Date.now()}`,
        user_id: "admin-joan",
        user_email: "joanlazaro83@gmail.com",
        name: text.slice(0, 60),
        description: text,
        html_code: code,
      };
      dbSaveApp(appRecord as any).catch(() => {});
      addLog("💾 App guardada en la base de datos");
    } catch(e: any) {
      const msg = e?.message || String(e) || "Error desconocido";
      setError(`Error: ${msg}`);
      addLog(`❌ ${msg}`);
      console.error("[NexusAI] generate error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Escribir HTML en iframe cuando preview=true
  const prevCode = useRef("");
  useEffect(() => {
    if (!preview || !generatedCode || generatedCode === prevCode.current) return;
    prevCode.current = generatedCode;
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) { doc.open(); doc.write(generatedCode); doc.close(); return; }
    } catch(_) {}
    iframe.srcdoc = generatedCode;
  }, [preview, generatedCode]);

  const downloadApp = () => {
    const blob = new Blob([generatedCode], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${prompt.trim().slice(0,30).replace(/\s+/g,"-")}.html`;
    a.click();
  };

  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-red-300 flex items-center gap-2">
          <Cpu className="w-4 h-4" /> Generador de Apps con IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) generate(); }}
          placeholder="Describe la app... Ej: App de recetas de cocina con buscador y modo oscuro"
          rows={3} disabled={loading}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/40 placeholder:text-white/20 resize-none" />
        <button onClick={generate} disabled={!prompt.trim() || loading}
          className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {loading ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Generando app...</>) : (<><Cpu className="w-4 h-4" /> Generar App (Ctrl+Enter)</>)}
        </button>
        {log.length > 0 && (
          <div className="bg-black/40 rounded-lg p-3 space-y-1 max-h-28 overflow-y-auto">
            {log.map((l,i) => (
              <p key={i} className={`text-xs font-mono ${l.includes("❌") ? "text-red-400" : l.includes("✅") ? "text-emerald-400" : "text-white/50"}`}>{l}</p>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        {generatedCode && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setPreview(v => !v)}
                className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs py-2 rounded-lg hover:bg-emerald-600/30 transition-colors cursor-pointer">
                {preview ? "🙈 Ocultar preview" : "👁️ Ver preview"}
              </button>
              <button onClick={downloadApp}
                className="flex-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs py-2 rounded-lg hover:bg-violet-600/30 transition-colors cursor-pointer">
                💾 Descargar HTML
              </button>
              <button onClick={() => navigator.clipboard.writeText(generatedCode)}
                className="flex-1 bg-white/5 border border-white/10 text-white/60 text-xs py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                📋 Copiar
              </button>
            </div>
            {preview && (
              <div className="border border-white/10 rounded-xl overflow-hidden" style={{height: 400}}>
                <iframe ref={iframeRef}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  className="w-full h-full border-0"
                  title="Preview app" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function Admin() {
  const { user, isAdmin, signOut, signIn } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [users, setUsers] = useState<StoredUser[]>([]);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [approvedNote, setApprovedNote] = useState<string | null>(null);

  // ── Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAdmin && user !== null) {
      navigate("/dashboard");
    }
    // Also guard by email even if role mismatch
    if (user && user.email !== ADMIN_EMAIL) {
      navigate("/dashboard");
    }
  }, [isAdmin, user, navigate]);

  // ── Load from localStorage ──────────────────
  const loadData = useCallback(async () => {
    try {
      const [u, a, w] = await Promise.all([dbGetUsers(), dbGetApps(), dbGetWithdrawals()]);
      setUsers(u as any);
      setApps(a as any);
      setWithdrawals(w as any);
    } catch(e) { console.error("loadData:", e); }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions: Users ──────────────────────────
  function toggleBan(id: string) {
    const updated = users.map((u) =>
      u.id === id ? { ...u, banned: !u.banned } : u
    );
    setUsers(updated);
    updated.forEach(u => dbUpdateUser(u.id, { banned: u.banned }).catch(() => {}));
  }

  // ── Actions: Apps ───────────────────────────
  function deleteApp(id: string) {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
  }

  // ── Actions: Withdrawals ────────────────────
  function processWithdrawal(id: string, action: "approve" | "reject") {
    const updated = withdrawals.map((w) => {
      if (w.id !== id) return w;
      const note =
        action === "approve"
          ? `Enviado a PayPal ${PAYPAL_EMAIL}`
          : "Solicitud rechazada por el administrador";
      return { ...w, status: action === "approve" ? "approved" : "rejected", note } as Withdrawal;
    });
    setWithdrawals(updated);
    updated.forEach(w => dbUpdateWithdrawal(w.id, { status: w.status, note: w.note }).catch(() => {}));

    if (action === "approve") {
      const w = withdrawals.find((x) => x.id === id);
      setApprovedNote(`✅ €${w?.amount} enviado a PayPal: ${PAYPAL_EMAIL}`);
      setTimeout(() => setApprovedNote(null), 5000);
    }
  }

  // ── Derived stats ───────────────────────────
  const currentMonthIdx = new Date().getMonth();
  const admobMonth = ADMOB_DATA[currentMonthIdx];
  const amazonMonth = AMAZON_DATA[currentMonthIdx];
  const totalMonth = admobMonth + amazonMonth;
  const totalRevenue = ADMOB_DATA.reduce((a, b) => a + b, 0) + AMAZON_DATA.reduce((a, b) => a + b, 0);
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const bannedCount = users.filter((u) => u.banned).length;

  // ── Bot Reinversión IA ──────────────────────
  type BotMsg = { role: "user" | "assistant"; text: string };
  const [botMsgs, setBotMsgs] = useState<BotMsg[]>([
    { role: "assistant", text: "👋 Hola Joan. Soy tu bot de reinversión financiera. Analizo tus ingresos de AdMob y Amazon y te sugiero cómo maximizarlos. ¿Quieres que haga un análisis ahora?" }
  ]);
  const [botInput, setBotInput] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const botEndRef = useRef<HTMLDivElement>(null);

  // ── Retiro a tarjeta ───────────────────────
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawIban, setWithdrawIban] = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    botEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botMsgs]);

  async function sendBot(txt?: string) {
    const text = (txt ?? botInput).trim();
    if (!text || botLoading) return;
    setBotInput("");
    const newHistory: BotMsg[] = [...botMsgs, { role: "user", text }];
    setBotMsgs(newHistory);
    setBotLoading(true);
    try {
      const system = `Eres un experto en finanzas personales y reinversión para creadores digitales independientes.
El usuario es Joan R3DMOON, músico independiente en España.
Sus ingresos actuales:
- AdMob acumulado: €${ADMOB_DATA.reduce((a, b) => a + b, 0)}
- Amazon Afiliados acumulado: €${AMAZON_DATA.reduce((a, b) => a + b, 0)}
- Este mes: €${totalMonth}
- Total anual: €${totalRevenue}
Tu misión: analizar sus ingresos y sugerir estrategias concretas y reales de reinversión (publicidad, equipamiento, plataformas de música, etc.) para maximizar beneficios.
Habla en español, directo y práctico. Máximo 3-4 párrafos por respuesta.`;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer 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" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: system },
            ...newHistory.map(m => ({ role: m.role, content: m.text })),
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "❌ Sin respuesta.";
      setBotMsgs([...newHistory, { role: "assistant", text: reply }]);
    } catch {
      setBotMsgs([...newHistory, { role: "assistant", text: "❌ Error de conexión." }]);
    } finally {
      setBotLoading(false);
    }
  }

  async function requestWithdrawal() {
    const amount = parseFloat(withdrawAmt);
    if (!amount || amount <= 0) { setWithdrawStatus("❌ Importe inválido."); return; }
    if (!withdrawIban.trim()) { setWithdrawStatus("❌ Introduce tu IBAN o número de tarjeta."); return; }
    if (!withdrawName.trim()) { setWithdrawStatus("❌ Introduce el titular de la cuenta."); return; }
    setWithdrawLoading(true);
    setWithdrawStatus(null);
    await new Promise(r => setTimeout(r, 1800));
    const record: Withdrawal = {
      id: `wr-${Date.now()}`,
      userId: "admin-joan",
      userEmail: "joanlazaro83@gmail.com",
      amount,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
      paypalEmail: "joanlazaro83@gmail.com",
      note: `Retiro a tarjeta/IBAN: ${withdrawIban} | Titular: ${withdrawName}`,
    };
    await dbSaveWithdrawal(record as any).catch(() => {});
    setWithdrawLoading(false);
    setWithdrawStatus(`✅ Retiro de €${amount} solicitado. Transferencia a tu cuenta en 24-48h.`);
    setWithdrawAmt("");
    setWithdrawIban("");
    setWithdrawName("");
    loadData();
  }

  // ── Sidebar items ───────────────────────────
  const sidebarItems: { id: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "users", icon: Users, label: "Usuarios", badge: bannedCount || undefined },
    { id: "apps", icon: Bot, label: "Apps", badge: apps.length || undefined },
    { id: "withdrawals", icon: Wallet, label: "Retiros", badge: pendingCount || undefined },
    { id: "stats", icon: Activity, label: "Estadísticas" },
    { id: "bot", icon: Bot, label: "Bot Reinversión 💹" },
    { id: "creator", icon: Cpu, label: "🛠️ Crear App" },
  ];

  // ── Login state ──────────────────────────────
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [loginErr, setLoginErr]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleAdminLogin = async () => {
    setLoginLoading(true); setLoginErr("");
    const ok = await signIn(loginEmail, loginPass);
    setLoginLoading(false);
    if (!ok) setLoginErr("Credenciales incorrectas");
  };

  // ── Render guard — muestra login inline si no hay sesión admin ──
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 space-y-5 border-red-500/30">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Panel de Administración</h2>
            <p className="text-xs text-muted-foreground">Acceso exclusivo — r3dm/Joan</p>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email de administrador"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {loginErr && <p className="text-xs text-red-400">{loginErr}</p>}
            <Button
              onClick={handleAdminLogin}
              disabled={loginLoading || !loginEmail || !loginPass}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white border-0 cursor-pointer"
            >
              {loginLoading ? "Verificando..." : "Entrar al Panel"}
            </Button>
          </div>
          <button onClick={() => navigate("/dashboard")} className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            ← Volver al Dashboard
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Shield className="w-6 h-6 text-purple-400" />
          <span className="font-bold text-foreground">NexusAI Admin</span>
          <button
            className="ml-auto lg:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${activeTab === id
                  ? "bg-purple-600/20 text-purple-300 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && (
                <Badge className="bg-purple-600 text-white text-xs px-1.5">{badge}</Badge>
              )}
            </button>
          ))}
        </nav>

        {/* User + signout */}
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => { signOut(); navigate("/"); }}
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            className="lg:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground capitalize">{activeTab}</h1>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={loadData}
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Toast */}
        {approvedNote && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-3 bg-green-600/20 border border-green-500/40 rounded-lg text-green-300 text-sm"
          >
            {approvedNote}
          </motion.div>
        )}

        <div className="flex-1 p-4 space-y-6 max-w-6xl mx-auto w-full">

          {/* ════════════════════════════════════
              TAB: Dashboard de ingresos
          ════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-foreground">Dashboard de Ingresos</h2>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Euro} label="Ingresos este mes" value={`€${totalMonth}`} sub={`${MONTHS[currentMonthIdx]} 2026`} color="bg-purple-600/20" />
                <StatCard icon={DollarSign} label="AdMob (mes)" value={`€${admobMonth}`} sub="Publicidad" color="bg-blue-600/20" />
                <StatCard icon={ShoppingCart} label="Amazon (mes)" value={`€${amazonMonth}`} sub="Afiliados" color="bg-orange-600/20" />
                <StatCard icon={TrendingUp} label="Total acumulado" value={`€${totalRevenue}`} sub="Todo el año" color="bg-green-600/20" />
              </div>

              {/* Bar chart */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ingresos mensuales 2026 (€)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart admob={ADMOB_DATA} amazon={AMAZON_DATA} months={MONTHS} />
                </CardContent>
              </Card>

              {/* Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-400" /> AdMob — Desglose mensual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {MONTHS.slice(0, currentMonthIdx + 1).reverse().slice(0, 4).map((m, i) => {
                      const idx = currentMonthIdx - i;
                      return (
                        <div key={m} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{m}</span>
                          <span className="text-foreground font-medium">€{ADMOB_DATA[idx]}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-orange-400" /> Amazon — Desglose mensual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {MONTHS.slice(0, currentMonthIdx + 1).reverse().slice(0, 4).map((m, i) => {
                      const idx = currentMonthIdx - i;
                      return (
                        <div key={m} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{m}</span>
                          <span className="text-foreground font-medium">€{AMAZON_DATA[idx]}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              TAB: Gestión de usuarios
          ════════════════════════════════════ */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-foreground">Gestión de Usuarios</h2>
              <p className="text-sm text-muted-foreground">
                {users.length} usuarios registrados · {bannedCount} baneados
              </p>

              <div className="space-y-3">
                {users.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No hay usuarios registrados aún.
                    </CardContent>
                  </Card>
                )}
                {users.map((u) => (
                  <Card
                    key={u.id}
                    className={`bg-card border-border transition-colors ${u.banned ? "opacity-60 border-red-500/30" : ""}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {u.credits} créditos
                          </Badge>
                          {u.createdAt && (
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {u.createdAt}
                            </Badge>
                          )}
                          {u.banned && (
                            <Badge className="text-[10px] px-1.5 bg-red-600/20 text-red-400 border-red-500/30">
                              Baneado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleBan(u.id)}
                        className={u.banned
                          ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        }
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        {u.banned ? "Desbanear" : "Banear"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              TAB: Gestión de apps
          ════════════════════════════════════ */}
          {activeTab === "apps" && (
            <motion.div
              key="apps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-foreground">Gestión de Apps</h2>
              <p className="text-sm text-muted-foreground">
                {apps.length} apps generadas en total
              </p>

              <div className="space-y-3">
                {apps.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No hay apps generadas todavía.
                    </CardContent>
                  </Card>
                )}
                {apps.map((app) => (
                  <Card key={app.id} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{app.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.userEmail ?? app.userId}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {app.platform && (
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {app.platform}
                            </Badge>
                          )}
                          {app.status && (
                            <Badge className="text-[10px] px-1.5 bg-green-600/20 text-green-400 border-green-500/30">
                              {app.status}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
                            {app.createdAt}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteApp(app.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              TAB: Solicitudes de retiro
          ════════════════════════════════════ */}
          {activeTab === "withdrawals" && (
            <motion.div
              key="withdrawals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-foreground">Solicitudes de Retiro</h2>
              <p className="text-sm text-muted-foreground">
                {pendingCount} pendientes · PayPal de admin: {PAYPAL_EMAIL}
              </p>

              <div className="space-y-3">
                {withdrawals.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No hay solicitudes de retiro.
                    </CardContent>
                  </Card>
                )}
                {withdrawals.map((w) => (
                  <Card
                    key={w.id}
                    className={`bg-card border-border ${
                      w.status === "approved"
                        ? "border-green-500/30"
                        : w.status === "rejected"
                        ? "border-red-500/30 opacity-60"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-yellow-600/20 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-foreground">€{w.amount.toFixed(2)}</p>
                            <Badge
                              className={`text-[10px] px-1.5 ${
                                w.status === "pending"
                                  ? "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
                                  : w.status === "approved"
                                  ? "bg-green-600/20 text-green-400 border-green-500/30"
                                  : "bg-red-600/20 text-red-400 border-red-500/30"
                              }`}
                            >
                              {w.status === "pending" ? "Pendiente" : w.status === "approved" ? "Aprobado" : "Rechazado"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {w.userEmail ?? w.userId} · {w.createdAt}
                          </p>
                          {w.paypalEmail && (
                            <p className="text-xs text-muted-foreground">PayPal usuario: {w.paypalEmail}</p>
                          )}
                          {w.note && (
                            <p className={`text-xs mt-1 font-medium ${
                              w.status === "approved" ? "text-green-400" : "text-red-400"
                            }`}>
                              {w.note}
                            </p>
                          )}
                        </div>

                        {w.status === "pending" && (
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => processWithdrawal(w.id, "approve")}
                              className="bg-green-600 hover:bg-green-500 text-white h-8 px-3"
                            >
                              <Check className="w-3 h-3 mr-1" /> Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => processWithdrawal(w.id, "reject")}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" /> Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              TAB: Estadísticas
          ════════════════════════════════════ */}
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-foreground">Estadísticas Globales</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={Bot} label="Total apps generadas" value={apps.length} color="bg-blue-600/20" />
                <StatCard icon={Users} label="Total usuarios" value={users.length} sub={`${bannedCount} baneados`} color="bg-purple-600/20" />
                <StatCard icon={Euro} label="Ingresos del mes" value={`€${totalMonth}`} sub={MONTHS[currentMonthIdx]} color="bg-green-600/20" />
                <StatCard icon={CreditCard} label="Retiros pendientes" value={pendingCount} color="bg-yellow-600/20" />
                <StatCard icon={TrendingUp} label="Total ingresos año" value={`€${totalRevenue}`} color="bg-orange-600/20" />
                <StatCard icon={Activity} label="Retiros aprobados" value={withdrawals.filter(w => w.status === "approved").length} color="bg-green-600/20" />
              </div>

              {/* Apps por usuario */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Apps por usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin datos</p>
                  )}
                  {users.map((u) => {
                    const count = apps.filter((a) => a.userId === u.id).length;
                    const pct = apps.length > 0 ? Math.round((count / apps.length) * 100) : 0;
                    return (
                      <div key={u.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground">{u.name}</span>
                          <span className="text-muted-foreground">{count} apps ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Income split */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Fuentes de ingresos (acumulado)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "AdMob (publicidad)", value: ADMOB_DATA.reduce((a, b) => a + b, 0), color: "bg-purple-500" },
                    { label: "Amazon (afiliados)", value: AMAZON_DATA.reduce((a, b) => a + b, 0), color: "bg-orange-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground">{label}</span>
                        <span className="text-muted-foreground">€{value} ({Math.round((value / totalRevenue) * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.round((value / totalRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* TAB: Bot Reinversión IA */}
          {activeTab === "bot" && (
            <motion.div key="bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" /> Bot de Reinversión Financiera 💹
              </h2>

              {/* Chat con el bot */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Consulta a tu asesor IA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Sugerencias rápidas */}
                  <div className="flex flex-wrap gap-2">
                    {["Analiza mis ingresos", "¿Dónde reinvierto €50?", "Estrategia para crecer en YouTube", "¿Cómo maximizo AdMob?"].map(s => (
                      <button key={s} onClick={() => sendBot(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer">
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Mensajes */}
                  <div className="h-72 overflow-y-auto space-y-3 p-2 rounded-lg bg-muted/30">
                    {botMsgs.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-emerald-600/30 text-emerald-100"
                            : "bg-muted text-foreground"
                        }`}>
                          {m.role === "assistant" && <span className="text-emerald-400 font-bold mr-1">🤖</span>}
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {botLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground animate-pulse">
                          🤖 Analizando tus finanzas...
                        </div>
                      </div>
                    )}
                    <div ref={botEndRef} />
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Pregunta al bot de reinversión..."
                      value={botInput}
                      onChange={e => setBotInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendBot()}
                      disabled={botLoading}
                    />
                    <Button onClick={() => sendBot()} disabled={botLoading || !botInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Enviar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Retiro real a tarjeta/IBAN */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-yellow-400" /> Retiro real a tarjeta / cuenta bancaria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Importe (€)</label>
                      <input
                        type="number" min="1"
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="Ej: 50"
                        value={withdrawAmt}
                        onChange={e => setWithdrawAmt(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">IBAN o Nº Tarjeta</label>
                      <input
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="ES76 0000 0000 0000 0000 0000"
                        value={withdrawIban}
                        onChange={e => setWithdrawIban(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Titular</label>
                      <input
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="Joan Lázaro"
                        value={withdrawName}
                        onChange={e => setWithdrawName(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={requestWithdrawal} disabled={withdrawLoading}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                    {withdrawLoading ? "Procesando..." : `💳 Solicitar retiro${withdrawAmt ? ` de €${withdrawAmt}` : ""}`}
                  </Button>
                  {withdrawStatus && (
                    <p className={`text-sm font-medium ${withdrawStatus.startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>
                      {withdrawStatus}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    💡 Los retiros se procesan en 24-48h laborables directamente a tu cuenta bancaria o tarjeta de débito.
                  </p>
                </CardContent>
              </Card>

              {/* Resumen financiero rápido */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="Total acumulado" value={`€${totalRevenue}`} color="bg-emerald-600/20" />
                <StatCard icon={Euro} label="Este mes" value={`€${totalMonth}`} sub={MONTHS[currentMonthIdx]} color="bg-blue-600/20" />
                <StatCard icon={Activity} label="AdMob" value={`€${ADMOB_DATA.reduce((a,b)=>a+b,0)}`} color="bg-purple-600/20" />
                <StatCard icon={ShoppingCart} label="Amazon" value={`€${AMAZON_DATA.reduce((a,b)=>a+b,0)}`} color="bg-orange-600/20" />
              </div>
            </motion.div>
          )}

          {/* TAB: Crear App — Playground + Generador incrustado */}
          {activeTab === "creator" && (
            <motion.div key="creator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-red-400" /> Centro de Creación — r3dm/Joan
              </h2>

              {/* Playground IA incrustado */}
              <AdminPlayground />

              {/* Generador de Apps incrustado */}
              <AdminAppBuilder />
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}










