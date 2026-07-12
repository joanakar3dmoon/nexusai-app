import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3, DollarSign, Shield, LogOut, Menu, X,
  TrendingUp, Bot, Wallet, Settings, Send, Loader2,
  RefreshCw, CheckCircle, AlertCircle, ArrowUpRight,
  PlusCircle, Trash2, Eye, ShoppingCart, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface FinancialEntry { source: string; amount: number; date: string; note: string; }
interface Investment { id: string; name: string; type: string; amount: number; roi: number; date: string; status: "active"|"closed"; }
interface Withdrawal { id: string; amount: number; status: "pending"|"sent"|"failed"; date: string; }
interface AIMessage { role: "user"|"assistant"; content: string; }
type TabId = "finance"|"superagent"|"portfolio"|"withdrawals"|"config";

// ─── localStorage helpers ─────────────────────────────────────────────────────
function getLS<T>(k: string, fb: T): T {
  try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; }
}
function setLS(k: string, v: unknown) { localStorage.setItem(k, JSON.stringify(v)); }

// ─── Datos iniciales ──────────────────────────────────────────────────────────
function seedFinance() {
  if (getLS("nexusai_finance", null)) return;
  const entries: FinancialEntry[] = [
    { source: "AdMob", amount: 0, date: new Date().toISOString(), note: "App ID: ca-app-pub-4903263409458961~5751005760" },
    { source: "Amazon Afiliados", amount: 0, date: new Date().toISOString(), note: "Tracking ID: r3dm01-21 activo" },
    { source: "Suscripciones", amount: 0, date: new Date().toISOString(), note: "Aún no hay suscriptores de pago" },
  ];
  setLS("nexusai_finance", entries);
}
function seedPortfolio() {
  if (getLS("nexusai_portfolio", null)) return;
  setLS("nexusai_portfolio", []);
}
function seedWithdrawals() {
  if (getLS("nexusai_my_withdrawals", null)) return;
  setLS("nexusai_my_withdrawals", []);
}

// ─── Config por defecto ───────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  admob_app_id: "ca-app-pub-4903263409458961~5751005760",
  admob_banner_id: "ca-app-pub-4903263409458961/8825147276",
  admob_interstitial_id: "ca-app-pub-4903263409458961/4622591073",
  admob_interstitial_reward_id: "ca-app-pub-4903263409458961/1824624651",
  admob_appopen_id: "ca-app-pub-4903263409458961/8054991080",
  admob_rewarded_id: "ca-app-pub-4903263409458961/3980014703",
  admob_native_id: "ca-app-pub-4903263409458961/2202908920",
  amazon_tracking_id: "r3dm01-21",
  freellm_key: "free",
  groq_key: "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",
  paypal_email: "joanlazaro83@gmail.com",
};

// ─── SuperAgente: modelos disponibles ────────────────────────────────────────
const AGENT_MODELS = [
  { id: "deepseek", label: "DeepSeek R1", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { id: "groq",     label: "Llama 3.3 70B", color: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
  { id: "freellm",  label: "GPT-4o Mini", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
];

async function callAgent(messages: AIMessage[], model: string, groqKey: string): Promise<string> {
  const isGroq = model !== "freellm";
  const url = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.freellm.net/v1/chat/completions";
  const mdl = model === "deepseek" ? "deepseek-r1-distill-llama-70b"
    : model === "groq" ? "llama-3.3-70b-versatile"
    : "gpt-4o-mini-free";
  const key = isGroq ? groqKey : "free";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: mdl, messages, max_tokens: 1024, temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  let reply = d.choices?.[0]?.message?.content ?? "";
  reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return reply;
}

// ─── Nav tabs ─────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "finance",     label: "Dashboard Financiero", icon: BarChart3 },
  { id: "superagent",  label: "SuperAgente Financiero", icon: Bot, badge: "IA" },
  { id: "portfolio",   label: "Cartera",              icon: TrendingUp },
  { id: "withdrawals", label: "Retiros",              icon: Wallet },
  { id: "config",      label: "Config",               icon: Settings },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Admin() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("finance");
  const [sideOpen, setSideOpen] = useState(false);

  // Finance
  const [finance, setFinance] = useState<FinancialEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ source: "", amount: "", note: "" });

  // SuperAgente
  const [agentMessages, setAgentMessages] = useState<AIMessage[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentModel, setAgentModel] = useState("deepseek");
  const agentBottomRef = useRef<HTMLDivElement>(null);

  // Cartera
  const [portfolio, setPortfolio] = useState<Investment[]>([]);
  const [newInv, setNewInv] = useState({ name: "", type: "ETF", amount: "", roi: "" });

  // Retiros
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Config
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // ── Init ──
  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    seedFinance(); seedPortfolio(); seedWithdrawals();
    setFinance(getLS("nexusai_finance", []));
    setPortfolio(getLS("nexusai_portfolio", []));
    setWithdrawals(getLS("nexusai_my_withdrawals", []));
    setConfig(getLS("nexusai_config", DEFAULT_CONFIG));
  }, [isAdmin, navigate]);

  useEffect(() => { agentBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [agentMessages]);

  // ── Totals ──
  const totalIncome = finance.reduce((s, e) => s + e.amount, 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "sent").reduce((s, w) => s + w.amount, 0);
  const balance = totalIncome - totalWithdrawn;

  // ── Finance: añadir entrada ──
  const addEntry = () => {
    if (!newEntry.source || !newEntry.amount) return;
    const entry: FinancialEntry = {
      source: newEntry.source,
      amount: parseFloat(newEntry.amount),
      date: new Date().toISOString(),
      note: newEntry.note,
    };
    const updated = [entry, ...finance];
    setFinance(updated); setLS("nexusai_finance", updated);
    setNewEntry({ source: "", amount: "", note: "" });
  };

  // ── SuperAgente: enviar ──
  const SYSTEM_AGENT = `Eres un SuperAgente Financiero de élite para el usuario Joan (músico independiente, España).
Tu misión: analizar mercados (acciones, ETFs, cripto, REITs), proponer inversiones concretas con % de confianza y reasoning claro.
Balance actual del usuario: ${balance.toFixed(2)}€.
Ingresos totales acumulados: ${totalIncome.toFixed(2)}€.
Responde siempre en español. Sé directo, concreto, con datos reales. Propón siempre 3 opciones ordenadas por riesgo/beneficio.`;

  const sendAgent = async () => {
    if (!agentInput.trim() || agentLoading) return;
    const userMsg: AIMessage = { role: "user", content: agentInput.trim() };
    const msgs: AIMessage[] = [
      { role: "user", content: SYSTEM_AGENT },
      ...agentMessages,
      userMsg,
    ];
    setAgentMessages(prev => [...prev, userMsg]);
    setAgentInput("");
    setAgentLoading(true);
    try {
      const reply = await callAgent(msgs, agentModel, config.groq_key);
      setAgentMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setAgentMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err instanceof Error ? err.message : "Fallo"}` }]);
    } finally { setAgentLoading(false); }
  };

  // ── Cartera: añadir inversión ──
  const addInvestment = () => {
    if (!newInv.name || !newInv.amount) return;
    const inv: Investment = {
      id: Date.now().toString(),
      name: newInv.name,
      type: newInv.type,
      amount: parseFloat(newInv.amount),
      roi: parseFloat(newInv.roi) || 0,
      date: new Date().toISOString(),
      status: "active",
    };
    const updated = [inv, ...portfolio];
    setPortfolio(updated); setLS("nexusai_portfolio", updated);
    setNewInv({ name: "", type: "ETF", amount: "", roi: "" });
  };

  const deleteInvestment = (id: string) => {
    const updated = portfolio.filter(i => i.id !== id);
    setPortfolio(updated); setLS("nexusai_portfolio", updated);
  };

  // ── Retiros ──
  const requestWithdrawal = () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > balance) return;
    const w: Withdrawal = { id: Date.now().toString(), amount: amt, status: "pending", date: new Date().toISOString() };
    const updated = [w, ...withdrawals];
    setWithdrawals(updated); setLS("nexusai_my_withdrawals", updated);
    setWithdrawAmount("");
  };

  // ── Config save ──
  const saveConfig = () => { setLS("nexusai_config", config); };

  // ── Sidebar nav ──
  const NavItem = ({ t }: { t: typeof TABS[0] }) => (
    <button
      onClick={() => { setTab(t.id); setSideOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${tab === t.id ? "bg-violet-500/20 text-violet-300" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
    >
      <t.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{t.label}</span>
      {t.badge && <Badge className="text-[9px] px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">{t.badge}</Badge>}
    </button>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Shield className="w-5 h-5 text-violet-400" />
        <div>
          <p className="font-semibold text-sm">Panel Admin</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {TABS.map(t => <NavItem key={t.id} t={t} />)}
      </nav>
      <div className="p-3 border-t border-border">
        <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
          <ArrowUpRight className="w-4 h-4" /> Volver al Dashboard
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 cursor-pointer mt-1">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 shrink-0">
        <Sidebar />
      </aside>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSideOpen(false)} />
            <motion.aside className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 md:hidden flex flex-col" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div className="flex justify-end p-3 border-b border-border">
                <button onClick={() => setSideOpen(false)} className="cursor-pointer text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSideOpen(true)} className="md:hidden cursor-pointer text-muted-foreground hover:text-foreground"><Menu className="w-5 h-5" /></button>
            <h1 className="font-semibold text-sm">{TABS.find(t => t.id === tab)?.label}</h1>
          </div>
          <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-500/30">ADMIN</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* ── DASHBOARD FINANCIERO ── */}
          {tab === "finance" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Ingresos Totales", value: `${totalIncome.toFixed(2)}€`, icon: DollarSign, color: "text-emerald-400" },
                  { label: "Retirado", value: `${totalWithdrawn.toFixed(2)}€`, icon: Wallet, color: "text-violet-400" },
                  { label: "Saldo Disponible", value: `${balance.toFixed(2)}€`, icon: TrendingUp, color: "text-cyan-400" },
                ].map(k => (
                  <Card key={k.label} className="bg-card/60 border-border">
                    <CardContent className="p-4">
                      <div className={`${k.color} mb-1`}><k.icon className="w-5 h-5" /></div>
                      <p className="text-2xl font-bold">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Añadir ingreso manual */}
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Ingreso Real</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Fuente</label>
                      <select value={newEntry.source} onChange={e => setNewEntry(p => ({ ...p, source: e.target.value }))}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none">
                        <option value="">Seleccionar...</option>
                        <option>AdMob</option>
                        <option>Amazon Afiliados</option>
                        <option>Suscripciones</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Importe (€)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={newEntry.amount}
                        onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                  <input placeholder="Nota opcional" value={newEntry.note}
                    onChange={e => setNewEntry(p => ({ ...p, note: e.target.value }))}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <Button onClick={addEntry} size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700">
                    <PlusCircle className="w-3 h-3 mr-1" /> Añadir
                  </Button>
                </CardContent>
              </Card>

              {/* Historial */}
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Historial de Ingresos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {finance.length === 0 && <p className="text-xs text-muted-foreground">Sin ingresos registrados aún.</p>}
                  {finance.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{e.source}</p>
                        <p className="text-xs text-muted-foreground">{e.note} · {new Date(e.date).toLocaleDateString("es-ES")}</p>
                      </div>
                      <span className={`text-sm font-bold ${e.amount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                        +{e.amount.toFixed(2)}€
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── SUPERAGENTE FINANCIERO ── */}
          {tab === "superagent" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              <Card className="bg-card/60 border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    🧠 <strong>SuperAgente Financiero</strong> — Analiza mercados, propone inversiones con % de confianza.
                    Tú apruebas antes de invertir. Balance actual: <span className="text-emerald-400 font-bold">{balance.toFixed(2)}€</span>
                  </p>
                </CardContent>
              </Card>

              {/* Selector de modelo */}
              <div className="flex flex-wrap gap-2">
                {AGENT_MODELS.map(m => (
                  <button key={m.id} onClick={() => setAgentModel(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${m.color} ${agentModel === m.id ? "ring-2 ring-white/30 opacity-100" : "opacity-40 hover:opacity-70"}`}>
                    <Cpu className="w-3 h-3 inline mr-1" />{m.label}
                  </button>
                ))}
              </div>

              {/* Chat */}
              <Card className="bg-card/60 border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 pr-1">
                    {agentMessages.length === 0 && (
                      <div className="space-y-2">
                        {["¿Dónde invertir 50€ ahora mismo?", "Analiza Bitcoin vs ETF S&P500", "Dame 3 opciones para 100€ con riesgo bajo"].map(s => (
                          <button key={s} onClick={() => setAgentInput(s)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 text-xs text-muted-foreground transition-colors cursor-pointer">
                            💡 {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {agentMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-violet-600 text-white" : "bg-secondary/60 text-foreground"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {agentLoading && (
                      <div className="flex justify-start">
                        <div className="bg-secondary/60 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-violet-400" /> Analizando mercados...
                        </div>
                      </div>
                    )}
                    <div ref={agentBottomRef} />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <input
                      value={agentInput}
                      onChange={e => setAgentInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAgent()}
                      placeholder="Pídeme lo que quieras..."
                      className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <Button onClick={sendAgent} disabled={agentLoading || !agentInput.trim()} size="sm" className="cursor-pointer bg-violet-600 hover:bg-violet-700 shrink-0">
                      {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── CARTERA ── */}
          {tab === "portfolio" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* KPI cartera */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/60 border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Invertido Total</p>
                    <p className="text-2xl font-bold text-violet-400">
                      {portfolio.filter(i => i.status === "active").reduce((s, i) => s + i.amount, 0).toFixed(2)}€
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">ROI Promedio</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {portfolio.length > 0
                        ? (portfolio.reduce((s, i) => s + i.roi, 0) / portfolio.length).toFixed(1)
                        : "0.0"}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Añadir inversión */}
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><PlusCircle className="w-4 h-4 text-violet-400" /> Nueva Inversión</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Nombre (ej: Bitcoin, VOO...)" value={newInv.name}
                      onChange={e => setNewInv(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    <select value={newInv.type} onChange={e => setNewInv(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none">
                      <option>ETF</option><option>Cripto</option><option>Acción</option><option>REIT</option><option>Otro</option>
                    </select>
                    <input type="number" placeholder="Importe (€)" value={newInv.amount}
                      onChange={e => setNewInv(p => ({ ...p, amount: e.target.value }))}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    <input type="number" placeholder="ROI actual (%)" value={newInv.roi}
                      onChange={e => setNewInv(p => ({ ...p, roi: e.target.value }))}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <Button onClick={addInvestment} size="sm" className="cursor-pointer bg-violet-600 hover:bg-violet-700">
                    <PlusCircle className="w-3 h-3 mr-1" /> Añadir a cartera
                  </Button>
                </CardContent>
              </Card>

              {/* Lista inversiones */}
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Inversiones Activas</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {portfolio.length === 0 && <p className="text-xs text-muted-foreground">Sin inversiones registradas. Pregunta al SuperAgente para empezar.</p>}
                  {portfolio.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{inv.name}</p>
                          <Badge variant="outline" className="text-[9px] shrink-0">{inv.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString("es-ES")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-violet-400">{inv.amount.toFixed(2)}€</p>
                        <p className={`text-xs font-medium ${inv.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>{inv.roi >= 0 ? "+" : ""}{inv.roi.toFixed(1)}%</p>
                      </div>
                      <button onClick={() => deleteInvestment(inv.id)} className="cursor-pointer text-muted-foreground hover:text-red-400 transition-colors ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── RETIROS ── */}
          {tab === "withdrawals" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              <Card className="bg-card/60 border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Saldo disponible para retirar</p>
                  <p className="text-3xl font-bold text-emerald-400">{balance.toFixed(2)}€</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PayPal: <span className="text-foreground">joanlazaro83@gmail.com</span></p>
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-400" /> Solicitar Retiro</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <input type="number" min="1" step="0.01" max={balance}
                    placeholder={`Máx. ${balance.toFixed(2)}€`} value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    {[10, 25, 50].map(amt => (
                      <button key={amt} onClick={() => setWithdrawAmount(Math.min(amt, balance).toString())}
                        className="px-3 py-1 rounded-lg bg-secondary/40 hover:bg-secondary/70 text-xs cursor-pointer transition-colors">
                        {amt}€
                      </button>
                    ))}
                    <button onClick={() => setWithdrawAmount(balance.toFixed(2))}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 text-xs cursor-pointer transition-colors">
                      Todo
                    </button>
                  </div>
                  <Button onClick={requestWithdrawal} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                    size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 w-full">
                    <Wallet className="w-3 h-3 mr-1" /> Solicitar retiro a PayPal
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Los retiros se procesan manualmente en 24-48h.</p>
                </CardContent>
              </Card>

              {/* Historial retiros */}
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Historial de Retiros</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {withdrawals.length === 0 && <p className="text-xs text-muted-foreground">Sin retiros realizados aún.</p>}
                  {withdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{w.amount.toFixed(2)}€ → PayPal</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.date).toLocaleDateString("es-ES")}</p>
                      </div>
                      <Badge className={`text-[10px] ${w.status === "sent" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : w.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                        {w.status === "sent" ? "✓ Enviado" : w.status === "pending" ? "⏳ Pendiente" : "✗ Fallido"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── CONFIG ── */}
          {tab === "config" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {[
                { section: "AdMob", color: "text-yellow-400", fields: [
                  { key: "admob_app_id",              label: "App ID",                  placeholder: "ca-app-pub-4903263409458961~5751005760" },
                  { key: "admob_banner_id",            label: "Banner",                  placeholder: "ca-app-pub-4903263409458961/8825147276" },
                  { key: "admob_interstitial_id",      label: "Intersticial",            placeholder: "ca-app-pub-4903263409458961/4622591073" },
                  { key: "admob_interstitial_reward_id", label: "Intersticial Bonificado", placeholder: "ca-app-pub-4903263409458961/1824624651" },
                  { key: "admob_appopen_id",           label: "Carga de App",            placeholder: "ca-app-pub-4903263409458961/8054991080" },
                  { key: "admob_rewarded_id",          label: "Bonificado",              placeholder: "ca-app-pub-4903263409458961/3980014703" },
                  { key: "admob_native_id",            label: "Nativo Avanzado",         placeholder: "ca-app-pub-4903263409458961/2202908920" },
                ]},
                { section: "Amazon Afiliados", color: "text-orange-400", fields: [
                  { key: "amazon_tracking_id", label: "Tracking ID", placeholder: "r3dm01-21" },
                ]},
                { section: "FreeLLM / Groq", color: "text-violet-400", fields: [
                  { key: "freellm_key", label: "FreeLLM API Key", placeholder: "free" },
                  { key: "groq_key", label: "Groq API Key", placeholder: "gsk_..." },
                ]},
                { section: "PayPal (Retiros)", color: "text-cyan-400", fields: [
                  { key: "paypal_email", label: "Email PayPal", placeholder: "joanlazaro83@gmail.com" },
                ]},
              ].map(({ section, color, fields }) => (
                <Card key={section} className="bg-card/60 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-sm flex items-center gap-2 ${color}`}>
                      <Settings className="w-4 h-4" /> {section}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fields.map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                        <input
                          value={(config as Record<string, string>)[f.key] ?? ""}
                          onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <Button onClick={saveConfig} className="cursor-pointer bg-violet-600 hover:bg-violet-700 w-full">
                <CheckCircle className="w-4 h-4 mr-2" /> Guardar configuración
              </Button>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
