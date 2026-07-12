import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  BarChart3, Users, DollarSign, CreditCard, Shield,
  LogOut, Menu, X, Check, Trash2, Ban,
  ShoppingCart, Wallet, TrendingUp, Bot, Activity,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

// ---- Tipos ----
interface StoredUser {
  id: string;
  email: string;
  name: string;
  credits: number;
  banned: boolean;
  created_at: string;
}
interface StoredApp {
  id: string;
  name: string;
  description: string;
  status: string;
  views: number;
  downloads: number;
  revenue: number;
  created_at: string;
  user_email?: string;
}
interface Withdrawal {
  id: string;
  user_email: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  paypal_email?: string;
}

type TabId = "dashboard" | "users" | "apps" | "withdrawals" | "stats";

// ---- Helpers localStorage ----
function getLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function setLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- Seed de datos demo ----
function seedDemoData() {
  if (!localStorage.getItem("nexusai_seeded")) {
    const users: StoredUser[] = [
      { id: "u1", email: "demo1@gmail.com", name: "Carlos M.", credits: 85, banned: false, created_at: "2026-07-01T10:00:00Z" },
      { id: "u2", email: "demo2@gmail.com", name: "Ana P.", credits: 120, banned: false, created_at: "2026-07-05T12:00:00Z" },
      { id: "u3", email: "demo3@gmail.com", name: "Luis R.", credits: 0, banned: true, created_at: "2026-07-08T09:00:00Z" },
    ];
    const apps: StoredApp[] = [
      { id: "a1", name: "App Calculadora", description: "Calculadora científica", status: "published", views: 243, downloads: 87, revenue: 4.2, created_at: "2026-07-02T11:00:00Z", user_email: "demo1@gmail.com" },
      { id: "a2", name: "Diario Musical", description: "App para registrar composiciones", status: "published", views: 512, downloads: 134, revenue: 9.7, created_at: "2026-07-06T14:00:00Z", user_email: "demo2@gmail.com" },
      { id: "a3", name: "Timer Pomodoro", description: "Gestor de tiempo", status: "draft", views: 0, downloads: 0, revenue: 0, created_at: "2026-07-10T16:00:00Z", user_email: "demo1@gmail.com" },
    ];
    const withdrawals: Withdrawal[] = [
      { id: "w1", user_email: "demo1@gmail.com", amount: 12.5, status: "pending", created_at: "2026-07-11T08:00:00Z", paypal_email: "demo1paypal@gmail.com" },
      { id: "w2", user_email: "demo2@gmail.com", amount: 27.0, status: "pending", created_at: "2026-07-11T09:00:00Z", paypal_email: "demo2paypal@gmail.com" },
    ];
    setLS("nexusai_users", users);
    setLS("nexusai_apps", apps);
    setLS("nexusai_withdrawals", withdrawals);
    localStorage.setItem("nexusai_seeded", "1");
  }
}

export default function Admin() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Guard
  useEffect(() => {
    if (!user || !isAdmin) navigate("/dashboard");
  }, [user, isAdmin, navigate]);

  const loadData = useCallback(() => {
    seedDemoData();
    setUsers(getLS<StoredUser[]>("nexusai_users", []));
    setApps(getLS<StoredApp[]>("nexusai_apps", []));
    setWithdrawals(getLS<Withdrawal[]>("nexusai_withdrawals", []));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // ---- Acciones ----
  const toggleBan = (uid: string) => {
    const updated = users.map(u => u.id === uid ? { ...u, banned: !u.banned } : u);
    setUsers(updated);
    setLS("nexusai_users", updated);
  };

  const deleteApp = (aid: string) => {
    const updated = apps.filter(a => a.id !== aid);
    setApps(updated);
    setLS("nexusai_apps", updated);
  };

  const handleWithdrawal = (wid: string, action: "approved" | "rejected") => {
    const updated = withdrawals.map(w => w.id === wid ? { ...w, status: action } : w);
    setWithdrawals(updated);
    setLS("nexusai_withdrawals", updated);
    if (action === "approved") {
      const w = withdrawals.find(x => x.id === wid);
      showToast(`✅ €${w?.amount.toFixed(2)} enviado a PayPal: joanlazaro83@gmail.com`);
    }
  };

  // ---- KPIs ----
  const totalRevenue = apps.reduce((s, a) => s + a.revenue, 0);
  const admobRevenue = totalRevenue * 0.6;
  const amazonRevenue = totalRevenue * 0.4;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").length;
  const bannedUsers = users.filter(u => u.banned).length;
  const publishedApps = apps.filter(a => a.status === "published").length;

  // Ingresos ficticios por mes (últimos 6)
  const monthlyData = [
    { month: "Feb", amount: 3.2 },
    { month: "Mar", amount: 7.8 },
    { month: "Abr", amount: 12.1 },
    { month: "May", amount: 18.5 },
    { month: "Jun", amount: 24.3 },
    { month: "Jul", amount: totalRevenue > 0 ? totalRevenue : 31.6 },
  ];
  const maxAmount = Math.max(...monthlyData.map(m => m.amount));

  const sidebarItems: { id: TabId; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "users", icon: Users, label: "Usuarios", badge: bannedUsers || undefined },
    { id: "apps", icon: Bot, label: "Apps", badge: publishedApps || undefined },
    { id: "withdrawals", icon: Wallet, label: "Retiros", badge: pendingWithdrawals || undefined },
    { id: "stats", icon: TrendingUp, label: "Estadísticas" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card/80 backdrop-blur-xl flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Shield className="text-violet-400 w-5 h-5" />
          <span className="font-bold text-sm">NexusAI Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeTab === item.id ? "bg-violet-500/10 text-violet-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.badge ? <Badge className="bg-violet-500/20 text-violet-400 text-xs px-1.5">{item.badge}</Badge> : null}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button onClick={() => { signOut(); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"><Menu className="w-5 h-5" /></button>
            <h1 className="font-semibold text-sm">
              {activeTab === "dashboard" && "📊 Dashboard"}
              {activeTab === "users" && "👥 Usuarios"}
              {activeTab === "apps" && "🤖 Apps generadas"}
              {activeTab === "withdrawals" && "💸 Solicitudes de retiro"}
              {activeTab === "stats" && "📈 Estadísticas globales"}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="cursor-pointer gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </Button>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

            {/* ===== DASHBOARD ===== */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "AdMob este mes", value: `€${admobRevenue.toFixed(2)}`, icon: Activity, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                    { label: "Amazon este mes", value: `€${amazonRevenue.toFixed(2)}`, icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-500/10" },
                    { label: "Total este mes", value: `€${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Acumulado", value: `€${monthlyData.reduce((s, m) => s + m.amount, 0).toFixed(2)}`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
                  ].map(k => (
                    <Card key={k.label} className="border-border bg-card/50">
                      <CardContent className="p-4">
                        <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                          <k.icon className={`w-4 h-4 ${k.color}`} />
                        </div>
                        <div className="text-xl font-bold">{k.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Gráfico de barras CSS */}
                <Card className="border-border bg-card/50">
                  <CardHeader><CardTitle className="text-sm">Ingresos mensuales</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-32">
                      {monthlyData.map(m => (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">€{m.amount.toFixed(0)}</span>
                          <div
                            className="w-full rounded-t-md bg-violet-500/70 transition-all"
                            style={{ height: `${(m.amount / maxAmount) * 100}%` }}
                          />
                          <span className="text-xs text-muted-foreground">{m.month}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Resumen rápido */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Apps publicadas", value: publishedApps },
                    { label: "Retiros pendientes", value: pendingWithdrawals },
                    { label: "Usuarios activos", value: users.filter(u => !u.banned).length },
                  ].map(s => (
                    <Card key={s.label} className="border-border bg-card/50">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-violet-400">{s.value}</div>
                        <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ===== USUARIOS ===== */}
            {activeTab === "users" && (
              <div className="space-y-3">
                {users.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">Sin usuarios registrados.</p>}
                {users.map(u => (
                  <Card key={u.id} className={`border-border ${u.banned ? "bg-red-500/5 border-red-500/20" : "bg-card/50"}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{u.name}</span>
                          {u.banned && <Badge className="bg-red-500/20 text-red-400 text-xs">Baneado</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Créditos: {u.credits} · {new Date(u.created_at).toLocaleDateString("es-ES")}</div>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className={`cursor-pointer shrink-0 ${u.banned ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
                        onClick={() => toggleBan(u.id)}
                      >
                        {u.banned ? <><Check className="w-3 h-3 mr-1" />Desbanear</> : <><Ban className="w-3 h-3 mr-1" />Banear</>}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ===== APPS ===== */}
            {activeTab === "apps" && (
              <div className="space-y-3">
                {apps.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">Sin apps generadas aún.</p>}
                {apps.map(a => (
                  <Card key={a.id} className="border-border bg-card/50">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{a.name}</span>
                          <Badge className={a.status === "published" ? "bg-emerald-500/20 text-emerald-400 text-xs" : "bg-secondary text-muted-foreground text-xs"}>
                            {a.status === "published" ? "Publicada" : "Borrador"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          👁 {a.views} · ⬇️ {a.downloads} · €{a.revenue.toFixed(2)} · {a.user_email}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="cursor-pointer shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => deleteApp(a.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ===== RETIROS ===== */}
            {activeTab === "withdrawals" && (
              <div className="space-y-3">
                {withdrawals.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">Sin solicitudes de retiro.</p>}
                {withdrawals.map(w => (
                  <Card key={w.id} className={`border-border ${w.status === "approved" ? "bg-emerald-500/5 border-emerald-500/20" : w.status === "rejected" ? "bg-red-500/5 border-red-500/20" : "bg-card/50"}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-emerald-400">€{w.amount.toFixed(2)}</span>
                          <Badge className={
                            w.status === "approved" ? "bg-emerald-500/20 text-emerald-400 text-xs" :
                            w.status === "rejected" ? "bg-red-500/20 text-red-400 text-xs" :
                            "bg-yellow-500/20 text-yellow-400 text-xs"
                          }>
                            {w.status === "approved" ? "Aprobado" : w.status === "rejected" ? "Rechazado" : "Pendiente"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{w.user_email}</div>
                        <div className="text-xs text-muted-foreground">PayPal: {w.paypal_email} · {new Date(w.created_at).toLocaleDateString("es-ES")}</div>
                      </div>
                      {w.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleWithdrawal(w.id, "approved")}>
                            <Check className="w-3 h-3 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="cursor-pointer border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleWithdrawal(w.id, "rejected")}>
                            <X className="w-3 h-3 mr-1" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ===== ESTADÍSTICAS ===== */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Total apps", value: apps.length, icon: Bot, color: "text-cyan-400" },
                    { label: "Apps publicadas", value: publishedApps, icon: CreditCard, color: "text-emerald-400" },
                    { label: "Total usuarios", value: users.length, icon: Users, color: "text-violet-400" },
                    { label: "Usuarios activos", value: users.filter(u => !u.banned).length, icon: Activity, color: "text-blue-400" },
                    { label: "Ingresos totales", value: `€${monthlyData.reduce((s, m) => s + m.amount, 0).toFixed(2)}`, icon: DollarSign, color: "text-yellow-400" },
                    { label: "Retiros aprobados", value: withdrawals.filter(w => w.status === "approved").length, icon: Wallet, color: "text-pink-400" },
                  ].map(s => (
                    <Card key={s.label} className="border-border bg-card/50">
                      <CardContent className="p-4">
                        <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Breakdown fuentes */}
                <Card className="border-border bg-card/50">
                  <CardHeader><CardTitle className="text-sm">Fuentes de ingresos</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "AdMob (anuncios)", pct: 60, color: "bg-yellow-500" },
                      { label: "Amazon Afiliados", pct: 40, color: "bg-orange-500" },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-medium">{s.pct}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Apps por usuario */}
                <Card className="border-border bg-card/50">
                  <CardHeader><CardTitle className="text-sm">Apps por usuario</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {users.map(u => {
                      const userApps = apps.filter(a => a.user_email === u.email).length;
                      const pct = apps.length > 0 ? (userApps / apps.length) * 100 : 0;
                      return (
                        <div key={u.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground truncate">{u.email}</span>
                            <span className="font-medium shrink-0 ml-2">{userApps} apps</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

          </motion.div>
        </main>
      </div>
    </div>
  );
}
