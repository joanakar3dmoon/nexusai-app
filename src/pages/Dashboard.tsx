import { motion } from "motion/react";
import { BrainCircuit, Bot, Code2, Settings, CreditCard, LogOut, Menu, X, Send, Loader2, DollarSign, Download, Globe, Smartphone, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

type AppGeneration = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "generating" | "completed" | "error";
  sourceCode?: string;
  apkUrl?: string;
  screenshot?: string;
  createdAt: string;
};

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<AppGeneration[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "myapps" | "credits">("generator");
  const [credits, setCredits] = useState(50);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppGeneration | null>(null);

  const addLog = (msg: string) => {
    setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    if (credits < 5) {
      addLog("❌ Créditos insuficientes. Necesitas al menos 5 créditos.");
      return;
    }

    setGenerating(true);
    setCredits(prev => prev - 5);
    const id = crypto.randomUUID();
    const appName = prompt.trim().split(" ").slice(0, 3).join(" ") || "Mi App";
    
    const generation: AppGeneration = {
      id,
      name: appName,
      description: prompt.trim(),
      status: "generating",
      createdAt: new Date().toISOString(),
    };
    setGenerations(prev => [generation, ...prev]);
    addLog(`🚀 Generando "${appName}"...`);

    // Use freellm.net API to generate code
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      addLog("✅ Respuesta recibida de freeLLM, generando código...");
      const data = await response.json();
      const fullCode = data.choices?.[0]?.message?.content || "";

      // Extract HTML code from the response
      let htmlCode = fullCode;
      if (fullCode.includes("```html")) {
        htmlCode = fullCode.split("```html")[1].split("```")[0];
      } else if (fullCode.includes("```")) {
        htmlCode = fullCode.split("```")[1].split("```")[0];
      }

      // Generate a shareable page via data URI (or we could save it)
      const blob = new Blob([htmlCode], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      setGenerations(prev => prev.map(g => 
        g.id === id ? { 
          ...g, 
          status: "completed", 
          sourceCode: htmlCode,
        } : g
      ));
      
      setCredits(prev => prev + 1); // Bonus credit for generation
      addLog(`✅ "${appName}" generada con éxito!`);
      addLog(`💡 Créditos restantes: ${credits - 5 + 1}`);
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : "Error de conexión"}`);
      setGenerations(prev => prev.map(g => 
        g.id === id ? { ...g, status: "error" } : g
      ));
      setCredits(prev => prev + 5); // Refund credits on error
    } finally {
      setGenerating(false);
    }
  };

  const sidebarItems = [
    { id: "generator", icon: Code2, label: "Generador IA" },
    { id: "myapps", icon: Smartphone, label: "Mis Apps" },
    { id: "credits", icon: DollarSign, label: "Créditos" },
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

              {/* Latest generation preview */}
              {generations.filter(g => g.status === "completed").length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Última app generada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const lastApp = generations.filter(g => g.status === "completed")[0];
                      if (!lastApp) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-sm">{lastApp.name}</h3>
                              <p className="text-xs text-muted-foreground">{lastApp.description.slice(0, 100)}</p>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">Completada</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setSelectedApp(lastApp)}>
                              <Code2 className="w-3 h-3 mr-1" /> Ver código
                            </Button>
                            <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setActiveTab("myapps")}>
                              <Smartphone className="w-3 h-3 mr-1" /> Mis apps
                            </Button>
                          </div>
                          {lastApp.sourceCode && (
                            <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-auto">
                              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">{lastApp.sourceCode.slice(0, 1000)}...</pre>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* MY APPS TAB */}
          {activeTab === "myapps" && (
            <div className="space-y-4">
              {generations.length === 0 ? (
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
                generations.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{app.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{app.description.slice(0, 150)}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(app.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {app.status === "generating" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          {app.status === "completed" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">✓ Lista</Badge>}
                          {app.status === "error" && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">✗ Error</Badge>}
                          {app.status === "pending" && <Badge className="text-[10px]">Pendiente</Badge>}
                        </div>
                      </div>
                      {app.status === "completed" && app.sourceCode && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setSelectedApp(app)}>
                            <Code2 className="w-3 h-3 mr-1" /> Código
                          </Button>
                          <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => {
                            const blob = new Blob([app.sourceCode!], { type: "text/html" });
                            const url = URL.createObjectURL(blob);
                            window.open(url, "_blank");
                          }}>
                            <Globe className="w-3 h-3 mr-1" /> Vista previa
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* CREDITS TAB */}
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
                      <p className="text-xs text-muted-foreground">50 créditos/mes</p>
                    </div>
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20">Activo</Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mb-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (credits / 50) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{credits} de 50 créditos usados este mes</p>
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
      {selectedApp && selectedApp.sourceCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedApp(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-sm">{selectedApp.name} — Código</h3>
              <button onClick={() => setSelectedApp(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono">{selectedApp.sourceCode}</pre>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => {
                navigator.clipboard.writeText(selectedApp.sourceCode!);
              }}>
                Copiar código
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={() => {
                const blob = new Blob([selectedApp.sourceCode!], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
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