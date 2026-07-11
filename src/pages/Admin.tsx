import { motion } from "motion/react";
import {
  BrainCircuit, Users, DollarSign, CreditCard, TrendingUp, Settings,
  LogOut, Menu, X, Download, ChevronRight, Check, AlertCircle,
  BarChart3, PiggyBank, RefreshCw, ArrowUpRight, Target, Shield,
  Wallet, Zap, LineChart, Activity, Percent, Euro, Star, Bot,
  ShoppingCart, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import api from "@/lib/nexus-api";

type Tab = "dashboard" | "investments" | "withdrawals" | "users" | "config";

export default function Admin() {
  const { user, isAdmin, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(false);

  // Estados
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form inversión
  const [invAmount, setInvAmount] = useState("");
  const [invAsset, setInvAsset] = useState("SPY");
  const [invName, setInvName] = useState("");

  // Form retiro
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const paypalEmail = "joanlazaro83@gmail.com";

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [u, a, d, invs, wds] = await Promise.all([
        api.listUsers().catch(() => []),
        api.getAllApps().catch(() => []),
        api.getFinancialDashboard(user.id).catch(() => null),
        api.getInvestments(user.id).catch(() => []),
        api.getWithdrawals(user.id).catch(() => []),
      ]);
      setAllUsers(u);
      setAllApps(a);
      setDashboard(d);
      setInvestments(invs);
      setWithdrawals(wds);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && user) loadAll();
  }, [isAdmin, user]);

  const handleAnalyzeMarket = async () => {
    if (!user) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeMarket(user.id);
      setMarketAnalysis(result);
    } catch {}
    setAnalyzing(false);
  };

  const handleProposeInvestment = async () => {
    if (!user || !marketAnalysis) return;
    const amount = parseFloat(invAmount);
    if (!amount || amount <= 0) return;

    try {
      await api.proposeInvestment({
        user_id: user.id,
        name: invName || `Inversión ${invAsset}`,
        asset_type: "etf",
        ticker: invAsset,
        amount,
        confidence: marketAnalysis.confidence || 75,
        strategy: marketAnalysis.strategy || "growth",
        analysis_log: JSON.stringify(marketAnalysis),
      });
      setInvAmount("");
      setInvName("");
      await loadAll();
    } catch {}
  };

  const handleRequestWithdrawal = async () => {
    if (!user) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    try {
      await api.requestWithdrawal(user.id, amount, paypalEmail);
      setWithdrawAmount("");
      await loadAll();
      await refreshUser();
    } catch {}
  };

  const handleProcessWithdrawal = async (id: string, action: "approve" | "reject") => {
    try {
      await api.processWithdrawal(id, action);
      await loadAll();
    } catch {}
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
            <p className="text-sm text-muted-foreground mb-4">Solo el administrador puede acceder a este panel.</p>
            <Button onClick={() => navigate("/dashboard")} className="cursor-pointer">Volver al Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebarItems = [
    { id: "dashboard" as Tab, icon: BarChart3, label: "Dashboard" },
    { id: "investments" as Tab, icon: TrendingUp, label: "Inversiones" },
    { id: "withdrawals" as Tab, icon: Wallet, label: "Retiros" },
    { id: "users" as Tab, icon: Users, label: "Usuarios" },
    { id: "config" as Tab, icon: Settings, label: "Configuración" },
  ];

  const totalRevenue = dashboard?.total_revenue || 0;
  const totalInvested = dashboard?.total_invested || 0;
  const totalWithdrawn = dashboard?.total_withdrawn || 0;
  const balance = user?.balance || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <BrainCircuit className="text-primary w-6 h-6" />
          <span className="font-bold">NexusAI</span>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] ml-auto">Admin</Badge>
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
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground px-3">
            <span className="block">{user?.email}</span>
            <span className="block text-[10px] mt-0.5">Balance: {balance.toFixed(2)}€</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <BrainCircuit className="w-4 h-4" />
            Dashboard Usuario
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm">
                {activeTab === "dashboard" && "Panel de Control"}
                {activeTab === "investments" && "🧠 SuperAgente Financiero"}
                {activeTab === "withdrawals" && "💰 Retiros"}
                {activeTab === "users" && "👥 Usuarios"}
                {activeTab === "config" && "⚙️ Configuración"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadAll} className="cursor-pointer text-xs" disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Ingresos Totales</span>
                    </div>
                    <p className="text-xl font-bold">{totalRevenue.toFixed(2)}€</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-violet-400 mb-1">
                      <PiggyBank className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Invertido</span>
                    </div>
                    <p className="text-xl font-bold">{totalInvested.toFixed(2)}€</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Wallet className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Retirado</span>
                    </div>
                    <p className="text-xl font-bold">{totalWithdrawn.toFixed(2)}€</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Balance</span>
                    </div>
                    <p className="text-xl font-bold">{balance.toFixed(2)}€</p>
                  </CardContent>
                </Card>
              </div>

              {/* Apps generadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    Apps Generadas ({allApps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allApps.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay apps generadas aún</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allApps.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{app.name}</span>
                            <span className="text-muted-foreground ml-2">{app.email || ""}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>👁️ {app.views || 0}</span>
                            <span>💰 {app.revenue?.toFixed(2) || "0.00"}€</span>
                            <Badge className={`text-[9px] ${
                              app.status === "published" ? "bg-emerald-500/10 text-emerald-400" :
                              "bg-amber-500/10 text-amber-400"
                            }`}>{app.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ingresos por fuente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fuentes de Ingreso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <p className="text-[10px] text-emerald-400 font-medium">AdMob</p>
                      <p className="text-lg font-bold">{(totalRevenue * 0.45).toFixed(2)}€</p>
                      <p className="text-[9px] text-muted-foreground">45% estimado</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                      <p className="text-[10px] text-blue-400 font-medium">Amazon Afiliados</p>
                      <p className="text-lg font-bold">{(totalRevenue * 0.35).toFixed(2)}€</p>
                      <p className="text-[9px] text-muted-foreground">35% estimado</p>
                    </div>
                    <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-center">
                      <p className="text-[10px] text-violet-400 font-medium">Suscripciones</p>
                      <p className="text-lg font-bold">{(totalRevenue * 0.20).toFixed(2)}€</p>
                      <p className="text-[9px] text-muted-foreground">20% estimado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* INVESTMENTS TAB — SuperAgente Financiero */}
          {activeTab === "investments" && (
            <>
              {/* Market Analysis */}
              <Card className="border-violet-500/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    🧠 SuperAgente — Análisis de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    El SuperAgente analiza los mercados globales y propone estrategias de inversión 
                    basadas en los ingresos generados por NexusAI. TÚ decides el porcentaje a invertir.
                  </p>
                  <Button
                    onClick={handleAnalyzeMarket}
                    disabled={analyzing}
                    className="w-full cursor-pointer gap-2 bg-violet-600 hover:bg-violet-500"
                  >
                    {analyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analizando mercados...</>
                    ) : (
                      <><BarChart3 className="w-4 h-4" /> Analizar Mercados Ahora</>
                    )}
                  </Button>

                  {marketAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-violet-300">📊 Análisis Completo</h4>
                        <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">
                          Confianza: {marketAnalysis.confidence || 75}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{marketAnalysis.analysis || marketAnalysis.message}</p>
                      {marketAnalysis.opportunities && (
                        <div className="space-y-1 mb-3">
                          {marketAnalysis.opportunities.map((opp: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <ArrowUpRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                              <span>{opp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px]">
                        Estrategia: {marketAnalysis.strategy || "balanced"}
                      </Badge>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Proponer inversión */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Proponer Inversión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Nombre de la inversión</label>
                      <Input
                        value={invName}
                        onChange={(e) => setInvName(e.target.value)}
                        placeholder="Ej: ETF SP500 Growth"
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Activo</label>
                        <select
                          value={invAsset}
                          onChange={(e) => setInvAsset(e.target.value)}
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="SPY">SPY (S&P 500)</option>
                          <option value="QQQ">QQQ (Nasdaq)</option>
                          <option value="BTC">Bitcoin</option>
                          <option value="ETH">Ethereum</option>
                          <option value="VNQ">VNQ (REITs)</option>
                          <option value="BND">BND (Bonos)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Cantidad (€)</label>
                        <Input
                          type="number"
                          value={invAmount}
                          onChange={(e) => setInvAmount(e.target.value)}
                          placeholder="100"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleProposeInvestment}
                      disabled={!invAmount || !marketAnalysis}
                      className="w-full cursor-pointer"
                    >
                      <Zap className="w-4 h-4 mr-1" /> Proponer Inversión
                    </Button>
                    {!marketAnalysis && (
                      <p className="text-[10px] text-amber-400">Primero analiza el mercado para activar la propuesta</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Inversiones activas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-emerald-400" />
                    Cartera de Inversiones ({investments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {investments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay inversiones activas. Propón la primera.</p>
                  ) : (
                    <div className="space-y-2">
                      {investments.map((inv: any) => (
                        <div key={inv.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium">{inv.name}</h4>
                            <Badge className={`text-[10px] ${
                              inv.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                              inv.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                              "bg-muted text-muted-foreground"
                            }`}>{inv.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{inv.ticker}</span>
                            <span>Invertido: {inv.amount?.toFixed(2) || "0.00"}€</span>
                            <span className={inv.roi >= 0 ? "text-emerald-400" : "text-red-400"}>
                              ROI: {inv.roi != null ? `${inv.roi >= 0 ? "+" : ""}${inv.roi.toFixed(2)}%` : "—"}
                            </span>
                            <span>Valor actual: {inv.current_value?.toFixed(2) || "—"}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* WITHDRAWALS TAB */}
          {activeTab === "withdrawals" && (
            <>
              {/* Solicitar retiro */}
              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    Solicitar Retiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Balance disponible</span>
                      <span className="text-lg font-bold text-emerald-400">{balance.toFixed(2)}€</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Cantidad a retirar (€)</label>
                      <Input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div className="p-2 rounded bg-secondary/20 text-[10px] text-muted-foreground">
                      PayPal: {paypalEmail}
                    </div>
                    <Button
                      onClick={handleRequestWithdrawal}
                      disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                      className="w-full cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 mr-1" /> Solicitar Retiro a PayPal
                    </Button>
                    {parseFloat(withdrawAmount) > balance && (
                      <p className="text-[10px] text-red-400">La cantidad excede el balance disponible</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Historial de retiros */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Historial de Retiros ({withdrawals.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay solicitudes de retiro</p>
                  ) : (
                    <div className="space-y-2">
                      {withdrawals.map((w: any) => (
                        <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-xs">
                          <div>
                            <p className="font-medium">{w.amount?.toFixed(2) || "0.00"}€</p>
                            <p className="text-muted-foreground">{w.paypal_email}</p>
                            <p className="text-[10px] text-muted-foreground">{w.created_at ? new Date(w.created_at).toLocaleString() : ""}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${
                              w.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                              w.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                              w.status === "rejected" ? "bg-red-500/10 text-red-400" :
                              "bg-blue-500/10 text-blue-400"
                            }`}>{w.status}</Badge>
                            {w.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleProcessWithdrawal(w.id, "approve")}
                                  className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleProcessWithdrawal(w.id, "reject")}
                                  className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Usuarios Registrados ({allUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay usuarios registrados aún</p>
                ) : (
                  <div className="space-y-2">
                    {allUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name || u.email}</p>
                            <p className="text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{u.credits || 0} créditos</span>
                          <span>{u.balance?.toFixed(2) || "0.00"}€</span>
                          {u.role === "admin" && (
                            <Badge className="bg-amber-500/10 text-amber-400 text-[9px]">Admin</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CONFIG TAB */}
          {activeTab === "config" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cuentas de Monetización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Google AdMob</p>
                      <p className="text-xs text-muted-foreground">App ID: ca-app-pub-3940256099942544~3347511713</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Amazon Afiliados</p>
                      <p className="text-xs text-muted-foreground">Tracking ID: r3dm01-21 (ES, IT, DE, FR, UK)</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Retiros a PayPal</p>
                      <p className="text-xs text-muted-foreground">Email: joanlazaro83@gmail.com</p>
                    </div>
                    <Badge variant="outline">Configurado</Badge>
                  </div>
                  <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                    <p className="text-xs text-muted-foreground">
                      💡 Los retiros se procesan manualmente. Cada solicitud se revisa y se paga desde el panel de administración.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}