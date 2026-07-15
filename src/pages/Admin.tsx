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
export default function Admin() {
  const { user, isAdmin, signOut } = useAuth();
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
  const loadData = useCallback(() => {
    setUsers(ls<StoredUser[]>("nexusai_users", []));
    setApps(ls<StoredApp[]>("nexusai_apps", []));
    setWithdrawals(ls<Withdrawal[]>("nexusai_withdrawals", []));
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
    lsSet("nexusai_users", updated);
  }

  // ── Actions: Apps ───────────────────────────
  function deleteApp(id: string) {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    lsSet("nexusai_apps", updated);
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
    lsSet("nexusai_withdrawals", updated);

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
    const current = ls<Withdrawal[]>("nexusai_withdrawals", []);
    lsSet("nexusai_withdrawals", [record, ...current]);
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

  // ── Render guard ─────────────────────────────
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Acceso denegado</h2>
          <p className="text-muted-foreground">Solo el administrador puede acceder a este panel.</p>
          <Button onClick={() => navigate("/dashboard")}>Volver al Dashboard</Button>
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

          {/* TAB: Crear App */}
          {activeTab === "creator" && (
            <motion.div key="creator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-red-400" /> Generador de Apps — r3dm/Joan
              </h2>
              <p className="text-sm text-muted-foreground">Acceso exclusivo de administrador. Crea tus apps directamente desde aquí.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={() => navigate("/dashboard")}
                >
                  <Cpu className="w-4 h-4 mr-2" /> Ir al Generador de Apps
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={() => navigate("/builder")}
                >
                  <ChevronRight className="w-4 h-4 mr-2" /> Builder Avanzado
                </Button>
              </div>
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
                  <p>💡 <strong className="text-foreground">Consejo:</strong> Desde el Dashboard puedes generar apps completas con IA escribiendo en texto.</p>
                  <p>🔧 El Builder avanzado te da control total sobre el código generado.</p>
                  <p>📲 Las apps generadas se pueden exportar como APK o PWA instalable.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}




