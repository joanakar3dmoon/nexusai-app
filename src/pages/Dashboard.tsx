import { motion } from "motion/react";
import {
  BrainCircuit, Bot, Code2, Settings, CreditCard, LogOut, Menu, X,
  Send, Loader2, DollarSign, Download, Globe, Smartphone, ExternalLink,
  Eye, ChevronRight, Trash2, RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import api from "@/lib/nexus-api";

type AppRecord = {
  id: string;
  name: string;
  description: string;
  status: string;
  views: number;
  downloads: number;
  revenue: number;
  created_at: string;
};

export default function Dashboard() {
  const { user, signOut, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "myapps" | "credits">("generator");
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  // Cargar apps reales del backend al montar
  useEffect(() => {
    if (!user) return;
    loadApps();
  }, [user]);

  const loadApps = async () => {
    if (!user) return;
    setLoadingApps(true);
    try {
      const data = await api.getUserApps(user.id);
      setApps(data || []);
    } catch {
      // Si el backend no está disponible, array vacío
    } finally {
      setLoadingApps(false);
    }
  };

  const addLog = (msg: string) => {
    setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating || !user) return;
    if (user.credits < 5) {
      addLog("❌ Créditos insuficientes. Necesitas al menos 5 créditos.");
      return;
    }

    setGenerating(true);
    const appName = prompt.trim().split(" ").slice(0, 3).join(" ") || "Mi App";
    addLog(`🚀 Generando "${appName}"...`);

    try {
      addLog("🔗 Conectando con freeLLM...");
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
              content: `Eres un generador de aplicaciones Android/iOS/PWA. 
Genera código HTML+CSS+JS completo para una app funcional basada en esta descripción.
La app debe ser una PWA (single-page) lista para usar en navegador.
Incluye:
- Diseño responsive moderno oscuro
- Integración con Google AdMob (anuncios banner e intersticiales)
- Enlaces de afiliados de Amazon (tracking ID: r3dm01-21, país España)
- Un manifest.json para que sea instalable como PWA
- Un botón "Compartir" nativo
Devuelve SOLO el código HTML completo (todo en un solo archivo).`
            },
            {
              role: "user",
              content: prompt.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      addLog("✅ Respuesta recibida de freeLLM...");
      const data = await response.json();
      let code = data.choices?.[0]?.message?.content || "";

      if (code.includes("```html")) code = code.split("```html")[1].split("```")[0];
      else if (code.includes("```")) code = code.split("```")[1].split("```")[0];

      addLog("💾 Guardando en base de datos...");

      // Guardar en backend REAL
      try {
        await api.createApp({
          user_id: user.id,
          name: appName,
          description: prompt.trim(),
          category: "general",
          prompt: prompt.trim(),
          source_code: code,
          monetization: { admob: true, amazon: true, freellm: true, pwa: true },
        });
        addLog("✅ App guardada permanentemente en la base de datos");
        await refreshUser();
        await loadApps();
      } catch (e) {
        addLog("⚠️ App generada pero falló al guardar en BD (backend no disponible)");
      }

      setPrompt("");
      addLog(`✅ "${appName}" generada con éxito!`);
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : "Error de conexión"}`);
    } finally {
      setGenerating(false);
    }
  };

  const sidebarItems = [
    { id: "generator", icon: Code2, label: "Generador IA" },
    { id: "myapps", icon: Smartphone, label: "Mis Apps" },
    { id: "credits", icon: DollarSign, label: "Créditos" },
  ];

  const credits = user?.credits ?? 0;

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
              onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false); }}
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
            <span className="block text-[10px] mt-0.5">{credits} créditos</span>
            {isAdmin && <Badge variant="outline" className="mt-1 text-[10px]">Admin</Badge>}
          </div>
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
              <Settings className="w-4 h-4" />
              Panel Admin
            </button>
          )}
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
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm">
                {activeTab === "generator" && "Generador de Apps IA"}
                {activeTab === "myapps" && "Mis Apps"}
                {activeTab === "credits" && "Créditos y Suscripción"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{credits} créditos</Badge>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
          {/* GENERATOR TAB */}
          {activeTab === "generator" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    Agente Constructor IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">NUEVO</Badge>
                      <span className="text-sm font-medium text-violet-300">🧠 Agente Constructor con Preview en Vivo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Describe tu app y mírala construirse en tiempo real. Puedes interactuar con la preview 
                      y dar feedback mientras se genera.
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full cursor-pointer gap-2 bg-violet-600 hover:bg-violet-500" 
                      onClick={() => navigate("/builder")}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Abrir Constructor con Preview
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Describe la app que quieres crear. La IA generará el código completo 
                    con anuncios AdMob y enlaces de afiliados Amazon integrados.
                  </p>
                  <div className="flex gap-2">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ej: Una app de recetas de cocina con búsqueda por ingredientes..."
                      className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-hidden focus:ring-1 focus:ring-ring resize-none"
                      disabled={generating}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      Costo: 5 créditos | Créditos disponibles: {credits}
                    </span>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generating || !prompt.trim() || credits < 5}
                      size="sm"
                      className="cursor-pointer"
                    >
                      {generating ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generando...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-1" /> Generar App</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status Log */}
              {statusLog.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Log de generación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs space-y-1">
                      {statusLog.map((log, i) => (
                        <div key={i} className={log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-emerald-400" : "text-muted-foreground"}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* MY APPS TAB — DATOS REALES DEL BACKEND */}
          {activeTab === "myapps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {apps.length} app{apps.length !== 1 ? "s" : ""} generada{apps.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={loadApps} className="cursor-pointer text-xs" disabled={loadingApps}>
                  <RefreshCw className={`w-3 h-3 mr-1 ${loadingApps ? "animate-spin" : ""}`} />
                  Recargar
                </Button>
              </div>

              {loadingApps ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30 mx-auto mb-3" />
                  </CardContent>
                </Card>
              ) : apps.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aún no has generado ninguna app</p>
                    <Button variant="outline" size="sm" className="mt-3 cursor-pointer" onClick={() => setActiveTab("generator")}>
                      Ir al generador
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                apps.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{app.name}</h3>
                            <Badge className={`text-[10px] ${
                              app.status === "published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              app.status === "draft" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {app.status === "published" ? "Publicada" : app.status === "draft" ? "Borrador" : app.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{app.description.slice(0, 150)}</p>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                            <span>👁️ {app.views} vistas</span>
                            <span>📥 {app.downloads} descargas</span>
                            <span>💰 {app.revenue.toFixed(2)}€ ingresos</span>
                            <span>{new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={async () => {
                          try {
                            const full = await api.getApp(app.id);
                            if (full?.source_code) {
                              const blob = new Blob([full.source_code], { type: "text/html" });
                              window.open(URL.createObjectURL(blob), "_blank");
                            }
                          } catch {}
                        }}>
                          <Globe className="w-3 h-3 mr-1" /> Vista previa
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={async () => {
                          try {
                            const full = await api.getApp(app.id);
                            if (full?.source_code) setSelectedCode(full.source_code);
                          } catch {}
                        }}>
                          <Code2 className="w-3 h-3 mr-1" /> Código
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* CREDITS TAB — DATOS REALES */}
          {activeTab === "credits" && (
            <div className="space-y-6">
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
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (credits / 50) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{credits} de 50 créditos este mes</p>
                  <div className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Plan Pro (€29/mes):</strong> 2,000 créditos, apps ilimitadas, retiros a PayPal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Code Viewer Modal */}
      {selectedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedCode(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-sm">Código fuente</h3>
              <button onClick={() => setSelectedCode(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono">{selectedCode}</pre>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => navigator.clipboard.writeText(selectedCode)}>
                Copiar código
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={() => {
                const blob = new Blob([selectedCode], { type: "text/html" });
                window.open(URL.createObjectURL(blob), "_blank");
              }}>
                <Globe className="w-3 h-3 mr-1" /> Vista previa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}