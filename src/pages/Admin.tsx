import { motion } from "motion/react";
import {
  BrainCircuit, Users, DollarSign, CreditCard, TrendingUp, Settings,
  LogOut, Menu, X, Download, ChevronRight, Check, AlertCircle,
  BarChart3, PiggyBank, RefreshCw, ArrowUpRight, Target, Shield,
  Wallet, Zap, LineChart, Activity, Percent, Euro, Star, Bot,
  ShoppingCart
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

// ============================================================
// TIPOS
// ============================================================

type Investment = {
  id: string;
  type: string;
  amount: number;
  expectedReturn: number;
  risk: "low" | "medium" | "high";
  status: "proposed" | "approved" | "active" | "completed" | "rejected";
  strategy: string;
  createdAt: string;
  approvedAt?: string;
};

type MarketAnalysis = {
  date: string;
  opportunities: {
    type: string;
    name: string;
    description: string;
    potentialReturn: string;
    risk: string;
    confidence: number;
  }[];
};

// ============================================================
// SUPERAGENTE — Lógica de análisis de mercado
// ============================================================

const MARKET_ANALYSIS: Record<string, MarketAnalysis> = {
  "amazon-stocks": {
    date: new Date().toISOString(),
    opportunities: [
      { type: "acciones", name: "AAPL (Apple)", description: "Crecimiento sólido post iPhone 17. Dividendo creciente.", potentialReturn: "+14% anual", risk: "bajo", confidence: 92 },
      { type: "acciones", name: "AMZN (Amazon)", description: "AWS sigue dominando cloud. E-commerce rebote.", potentialReturn: "+18% anual", risk: "medio", confidence: 88 },
      { type: "etf", name: "SPY (S&P 500)", description: "ETF indexado. Rentabilidad histórica estable.", potentialReturn: "+10% anual", risk: "bajo", confidence: 95 },
      { type: "cripto", name: "BTC (Bitcoin)", description: "Halving 2028 impulsa ciclo alcista. Entrada estratégica.", potentialReturn: "+35% anual", risk: "alto", confidence: 72 },
      { type: "etf", name: "QQQ (Nasdaq 100)", description: "Tech heavy. Buen momento post corrección.", potentialReturn: "+15% anual", risk: "medio", confidence: 85 },
      { type: "dividendos", name: "REITs (Inmobiliario)", description: "Dividendos mensuales. Cartera diversificada.", potentialReturn: "+8% anual + dividendos", risk: "bajo", confidence: 90 },
    ],
  },
};

const INVESTMENT_PORTFOLIO: Investment[] = [
  { id: "inv-1", type: "ETF", amount: 500, expectedReturn: 550, risk: "low", status: "active", strategy: "SPY — Crecimiento pasivo indexado", createdAt: "2026-07-01", approvedAt: "2026-07-01" },
  { id: "inv-2", type: "Acciones", amount: 300, expectedReturn: 354, risk: "medium", status: "active", strategy: "AMZN — Cloud + E-commerce", createdAt: "2026-07-05", approvedAt: "2026-07-05" },
  { id: "inv-3", type: "Cripto", amount: 200, expectedReturn: 270, risk: "high", status: "active", strategy: "BTC — Ciclo halving 2028", createdAt: "2026-07-08", approvedAt: "2026-07-08" },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function Admin() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(MARKET_ANALYSIS["amazon-stocks"]);
  const [investments, setInvestments] = useState(INVESTMENT_PORTFOLIO);
  const [proposedInvestment, setProposedInvestment] = useState<Investment | null>(null);
  const [investPercent, setInvestPercent] = useState(30);

  const totalInvested = investments
    .filter((i) => i.status === "active" || i.status === "completed")
    .reduce((s, i) => s + i.amount, 0);

  const currentValue = investments
    .filter((i) => i.status === "active" || i.status === "completed")
    .reduce((s, i) => s + i.expectedReturn, 0);

  const totalProfit = currentValue - totalInvested;

  // Simular análisis de mercado
  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalysis(MARKET_ANALYSIS["amazon-stocks"]);
      setAnalyzing(false);
    }, 2000);
  };

  // Proponer inversión
  const handleProposeInvestment = (opp: typeof analysis.opportunities[0]) => {
    const amount = Math.round(totalInvested * (investPercent / 100)) || 100;
    const newInv: Investment = {
      id: `inv-${Date.now()}`,
      type: opp.type,
      amount,
      expectedReturn: Math.round(amount * (1 + parseInt(opp.potentialReturn.replace(/[^0-9]/g, "")) / 100)),
      risk: opp.risk as "low" | "medium" | "high",
      status: "proposed",
      strategy: `${opp.name} — ${opp.description.slice(0, 60)}`,
      createdAt: new Date().toISOString(),
    };
    setProposedInvestment(newInv);
  };

  // Aprobar inversión
  const handleApproveInvestment = () => {
    if (proposedInvestment) {
      setInvestments([{ ...proposedInvestment, status: "active", approvedAt: new Date().toISOString() }, ...investments]);
      setProposedInvestment(null);
    }
  };

  const stats = [
    { label: "Total Invertido", value: `€${totalInvested}`, icon: PiggyBank, change: `+€${totalProfit} beneficio potencial`, color: "text-emerald-400" },
    { label: "Valor Actual", value: `€${currentValue}`, icon: TrendingUp, change: `${totalInvested > 0 ? Math.round((currentValue / totalInvested - 1) * 100) : 0}% ROI estimado`, color: "text-cyan-400" },
    { label: "Inversiones Activas", value: `${investments.filter(i => i.status === "active").length}`, icon: Activity, change: `${investments.filter(i => i.status === "proposed").length} propuestas pendientes`, color: "text-violet-400" },
    { label: "Ingresos Apps", value: "€847", icon: Euro, change: "Este mes", color: "text-amber-400" },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
            <p className="text-sm text-muted-foreground mb-4">Solo el administrador (Joan) puede acceder a este panel.</p>
            <Button onClick={() => navigate("/dashboard")} className="cursor-pointer">Volver al Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <BrainCircuit className="text-primary w-6 h-6" />
          <span className="font-bold">NexusAI</span>
          <Badge className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Owner</Badge>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveSection("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer ${activeSection === "dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard Financiero
          </button>
          <button
            onClick={() => setActiveSection("superagent")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer ${activeSection === "superagent" ? "bg-violet-500/10 text-violet-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            <Bot className="w-4 h-4" />
            SuperAgente Financiero
          </button>
          <button
            onClick={() => setActiveSection("investments")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer ${activeSection === "investments" ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            <TrendingUp className="w-4 h-4" />
            Cartera de Inversiones
          </button>
          <button
            onClick={() => setActiveSection("withdrawals")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer ${activeSection === "withdrawals" ? "bg-amber-500/10 text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            <Wallet className="w-4 h-4" />
            Retiros y Pagos
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer ${activeSection === "settings" ? "bg-sky-500/10 text-sky-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground px-3">
            <span className="block font-medium text-foreground">{user?.email}</span>
            <span className="block text-[10px] mt-0.5">Propietario · Control total</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
            Ir al Dashboard
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
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-sm">
              {activeSection === "dashboard" && "Dashboard Financiero"}
              {activeSection === "superagent" && "🧠 SuperAgente Financiero"}
              {activeSection === "investments" && "📈 Cartera de Inversiones"}
              {activeSection === "withdrawals" && "💰 Retiros y Pagos"}
              {activeSection === "settings" && "⚙️ Configuración"}
            </h1>
            <Badge variant="outline" className="text-xs">
              {activeSection === "superagent" ? "IA Activa" : "Admin"}
            </Badge>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">

          {/* ============================================================ */}
          {/* SECCIÓN: Dashboard Financiero */}
          {/* ============================================================ */}
          {activeSection === "dashboard" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-[10px] text-emerald-400 mt-1">{stat.change}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Resumen de ingresos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-emerald-400" />
                      Ingresos este mes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { source: "AdMob (anuncios)", amount: 423, change: "+12%", icon: DollarSign },
                        { source: "Amazon Afiliados", amount: 289, change: "+8%", icon: ShoppingCart },
                        { source: "Suscripciones NexusAI", amount: 135, change: "+25%", icon: CreditCard },
                      ].map((item) => (
                        <div key={item.source} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs">{item.source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">€{item.amount}</span>
                            <span className="text-[10px] text-emerald-400">{item.change}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-xs font-medium">Total Ingresos</span>
                        <span className="text-sm font-bold text-primary">€847</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-violet-400" />
                      Actividad reciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-xs">
                      {[
                        { text: "Nueva app generada: 'Recetas Veganas'", time: "Hace 2h" },
                        { text: "Inversión BTC activada — €200", time: "Hace 5h" },
                        { text: "Retiro de €50 procesado a PayPal", time: "Ayer" },
                        { text: "3 usuarios nuevos registrados", time: "Ayer" },
                        { text: "Análisis de mercado completado", time: "Ayer" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.text}</span>
                          <span className="text-[10px] text-muted-foreground/50">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN: SuperAgente Financiero */}
          {/* ============================================================ */}
          {activeSection === "superagent" && (
            <div className="space-y-6">
              {/* Control de análisis */}
              <Card className="border-violet-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-violet-400" />
                    SuperAgente de Análisis de Mercado
                    <Badge className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">IA</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    El SuperAgente analiza mercados financieros, cripto, ETFs, dividendos y REITs 
                    en tiempo real. Estudia tendencias, calcula riesgos y propone oportunidades 
                    de inversión con tus ingresos generados.
                  </p>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={runAnalysis}
                      disabled={analyzing}
                      className="cursor-pointer gap-2 bg-violet-600 hover:bg-violet-500"
                    >
                      {analyzing ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Analizando mercados...</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Ejecutar Análisis de Mercado</>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Último análisis: {new Date(analysis.date).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Oportunidades detectadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.opportunities.map((opp, i) => (
                  <motion.div
                    key={opp.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className={`border-l-4 ${
                      opp.risk === "bajo" ? "border-l-emerald-500" :
                      opp.risk === "medio" ? "border-l-amber-500" :
                      "border-l-red-500"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                {opp.type}
                              </span>
                              <Badge className={`text-[10px] ${
                                opp.risk === "bajo" ? "bg-emerald-500/10 text-emerald-400" :
                                opp.risk === "medio" ? "bg-amber-500/10 text-amber-400" :
                                "bg-red-500/10 text-red-400"
                              }`}>
                                Riesgo {opp.risk}
                              </Badge>
                            </div>
                            <h3 className="text-base font-bold mt-1">{opp.name}</h3>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              opp.risk === "bajo" ? "text-emerald-400" :
                              opp.risk === "medio" ? "text-amber-400" :
                              "text-red-400"
                            }`}>
                              {opp.potentialReturn}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Confianza: {opp.confidence}%
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{opp.description}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-muted-foreground block mb-1">
                              % de ingresos a invertir: {investPercent}%
                            </label>
                            <input
                              type="range"
                              min={5}
                              max={80}
                              value={investPercent}
                              onChange={(e) => setInvestPercent(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleProposeInvestment(opp)}
                            className="cursor-pointer shrink-0 gap-1"
                          >
                            <Target className="w-3 h-3" />
                            Invertir
                          </Button>
                        </div>
                        {proposedInvestment?.strategy.includes(opp.name) && (
                          <div className="mt-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-violet-300">💰 Propuesta generada</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Invertir €{proposedInvestment.amount} en {opp.name}
                                  — Retorno estimado: €{proposedInvestment.expectedReturn}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => setProposedInvestment(null)} variant="ghost" className="cursor-pointer">
                                  Cancelar
                                </Button>
                                <Button size="sm" onClick={handleApproveInvestment} className="cursor-pointer bg-emerald-600 hover:bg-emerald-500">
                                  ✅ Aprobar
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN: Cartera de Inversiones */}
          {/* ============================================================ */}
          {activeSection === "investments" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-emerald-400" />
                    Cartera Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-xs text-muted-foreground">Invertido</div>
                      <div className="text-xl font-bold">€{totalInvested}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-xs text-muted-foreground">Valor Actual</div>
                      <div className="text-xl font-bold text-emerald-400">€{currentValue}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-xs text-muted-foreground">ROI</div>
                      <div className="text-xl font-bold text-cyan-400">
                        {totalInvested > 0 ? `+${Math.round((currentValue / totalInvested - 1) * 100)}%` : "0%"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {investments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            inv.risk === "low" ? "bg-emerald-500" :
                            inv.risk === "medium" ? "bg-amber-500" : "bg-red-500"
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{inv.strategy.slice(0, 50)}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{inv.type}</span>
                              <span>·</span>
                              <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">€{inv.amount}</div>
                          <Badge className={`text-[10px] ${
                            inv.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                            inv.status === "proposed" ? "bg-violet-500/10 text-violet-400" :
                            inv.status === "completed" ? "bg-sky-500/10 text-sky-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>
                            {inv.status === "active" && "Activa"}
                            {inv.status === "proposed" && "Propuesta"}
                            {inv.status === "completed" && "Completada"}
                            {inv.status === "rejected" && "Rechazada"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN: Retiros y Pagos */}
          {/* ============================================================ */}
          {activeSection === "withdrawals" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    Mis Retiros (Propietario)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Saldo disponible para retirar</p>
                        <p className="text-2xl font-bold text-amber-400 mt-1">€847,00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">PayPal destino</p>
                        <p className="text-sm font-medium">joanlazaro83@gmail.com</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Cantidad a retirar (ej: 100)"
                        className="flex-1 bg-background"
                        type="number"
                      />
                      <Button className="cursor-pointer bg-amber-600 hover:bg-amber-500 gap-2">
                        <ArrowUpRight className="w-4 h-4" />
                        Retirar a PayPal
                      </Button>
                    </div>
                  </div>

                  <h3 className="text-sm font-medium mb-3">Historial de retiros</h3>
                  <div className="space-y-2">
                    {[
                      { amount: 150, date: "2026-07-08", status: "completed", paypal: "joanlazaro83@gmail.com" },
                      { amount: 200, date: "2026-07-01", status: "completed", paypal: "joanlazaro83@gmail.com" },
                    ].map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="font-medium">€{w.amount}</span>
                            <span className="text-muted-foreground ml-2">→ {w.paypal}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{w.date}</span>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Completado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Config de retiros automáticos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-sky-400" />
                    Configuración de Retiros Automáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">Retiro automático semanal</p>
                        <p className="text-xs text-muted-foreground">Cada lunes se retiran las ganancias acumuladas</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Activo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">Cuenta bancaria / tarjeta débito</p>
                        <p className="text-xs text-muted-foreground">Próximamente: transferencias SEPA directas a cuenta bancaria</p>
                      </div>
                      <Badge variant="outline" className="text-amber-400 border-amber-500/20">Próximamente</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                      <div>
                        <p className="text-sm font-medium text-violet-300">💡 ¿Sabías que...?</p>
                        <p className="text-xs text-muted-foreground">Las ganancias de las apps generadas se acumulan aquí automáticamente. El SuperAgente puede reinvertir un % antes de retirar.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN: Configuración */}
          {/* ============================================================ */}
          {activeSection === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Monetización
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Amazon Afiliados</p>
                      <p className="text-xs text-muted-foreground">Tracking ID: r3dm01-21</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">AdMob</p>
                      <p className="text-xs text-muted-foreground">App ID: ca-app-pub-3940256099942544</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">freellm.net API</p>
                      <p className="text-xs text-muted-foreground">Conexión activa para generación de apps</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400">Conectado</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    Método de Retiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">PayPal</p>
                      <p className="text-xs text-muted-foreground">joanlazaro83@gmail.com</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400">Principal</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Cuenta Bancaria / Tarjeta</p>
                      <p className="text-xs text-muted-foreground">Transferencias SEPA directas</p>
                    </div>
                    <Badge variant="outline" className="text-amber-400">Próximamente</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs text-amber-300/80">
                      🔒 Los retiros se procesan contra el saldo acumulado de ingresos (AdMob + Amazon + Suscripciones). 
                      Tú controlas qué % se reinvierte y qué % se retira.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}