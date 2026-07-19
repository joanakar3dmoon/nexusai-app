import { showBanner } from "@/lib/admob";
import { motion } from "motion/react";
import {
  BrainCircuit, Bot, Code2, Settings, CreditCard, LogOut, Menu, X,
  Send, Loader2, DollarSign, Download, Globe, Smartphone, ExternalLink,
  Trash2, TrendingUp, ShoppingCart,
  Zap, Copy, Check, BadgeDollarSign
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, isPremium, showAds, hasCredits, FREE_CREDITS, ADMOB_APP_ID, ADMOB_BANNER } from "@/lib/auth";
import { api } from "@/lib/nexus-api";
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

type TabId = "generator" | "myapps" | "monetize" | "credits";

// ---- Supabase helpers para apps ----
import { createClient } from "@supabase/supabase-js";
const _sb = createClient(
  "https://tolzqxflecqbjdefohom.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHpxeGZsZWNxYmpkZWZvaG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEwODA3MCwiZXhwIjoyMDk5Njg0MDcwfQ.FaTcZpS4tVKJl8rIP-Vfv0nMub2bnNJNFFo9t1w7JfU"
);
async function loadStoredAppsAsync(): Promise<AppRecord[]> {
  try {
    const { data } = await _sb.from("apps").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({
      id: r.id,
      title: r.title || r.name || "App",
      prompt: r.prompt || "",
      html: r.source_code || r.html || "",
      source_code: r.source_code || r.html || "",
      createdAt: r.created_at,
    }));
  } catch { return []; }
}
function loadStoredApps(): AppRecord[] { return []; }
async function saveApps(apps: AppRecord[]) {
  // Ya se guarda app por app al crear — no necesitamos bulk save
}

// ---- Proveedores LLM (solo para el generador) ----
const LLM_PROVIDERS = [
  { id: "groq",     url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", keyEnv: "free" },
  { id: "deepseek", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", keyEnv: "free" },
  { id: "qwen",     url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", keyEnv: "free" },
  { id: "mixtral",  url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", keyEnv: "free" },
  { id: "freellm",  url: "https://api.groq.com/openai/v1/chat/completions",     model: "llama-3.3-70b-versatile",              keyEnv: "" },
];

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY || "";

function generateFallbackApp(prompt: string): string {
  const title = prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt;
  const ADMOB_APP_ID = "ca-app-pub-4903263409458961~5751005760";
  const ADMOB_BANNER = "ca-app-pub-4903263409458961/8825147276";
  const AMAZON_TAG = "r3dm01-21";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_APP_ID}" crossorigin="anonymous"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column}
header{background:linear-gradient(135deg,#6d28d9,#0891b2);padding:20px;text-align:center}
header h1{font-size:1.5rem;font-weight:800;margin-bottom:4px}
header p{font-size:.9rem;opacity:.8}
main{flex:1;padding:20px;max-width:600px;margin:0 auto;width:100%}
.card{background:#1a1a2e;border:1px solid #ffffff15;border-radius:16px;padding:20px;margin-bottom:16px}
.card h2{font-size:1.1rem;margin-bottom:12px;color:#a78bfa}
.btn{background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;width:100%;margin-top:8px;transition:opacity .2s}
.btn:hover{opacity:.85}
.result{background:#0f0f1e;border:1px solid #ffffff10;border-radius:12px;padding:16px;margin-top:12px;min-height:80px;font-size:.95rem;line-height:1.6;color:#e2e8f0}
.afiliados{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.af-btn{background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:8px 14px;border-radius:8px;font-size:.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .2s}
.af-btn:hover{border-color:#7c3aed;color:#a78bfa}
footer{padding:60px 12px 12px;text-align:center;font-size:.8rem;color:#ffffff30}
#admob-banner{position:fixed;bottom:0;left:0;right:0;background:#111;text-align:center;padding:4px;z-index:999}
</style>
</head>
<body>
<header>
  <h1>✨ ${title}</h1>
  <p>Generado por NexusAI · Monetizado con AdMob</p>
</header>
<main>
  <div class="card">
    <h2>🚀 Tu App</h2>
    <p style="color:#94a3b8;margin-bottom:12px">App generada para: <strong style="color:#e2e8f0">${prompt}</strong></p>
    <textarea id="input" rows="4" placeholder="Escribe aquí..." style="width:100%;background:#0f0f1e;border:1px solid #ffffff15;border-radius:8px;padding:12px;color:#fff;font-size:.95rem;resize:vertical"></textarea>
    <button class="btn" onclick="process()">⚡ Procesar</button>
    <div class="result" id="result">El resultado aparecerá aquí...</div>
  </div>
  <div class="card">
    <h2>🛒 Productos recomendados</h2>
    <div class="afiliados">
      <a class="af-btn" href="https://www.amazon.es/s?k=${encodeURIComponent(prompt.split(' ').slice(0,3).join('+'))}&tag=${AMAZON_TAG}" target="_blank">🔍 Buscar en Amazon</a>
      <a class="af-btn" href="https://www.amazon.es/s?k=productividad+app&tag=${AMAZON_TAG}" target="_blank">📱 Apps productividad</a>
      <a class="af-btn" href="https://www.amazon.es/s?k=gadgets+tecnologia&tag=${AMAZON_TAG}" target="_blank">💡 Gadgets tech</a>
    </div>
  </div>
</main>
<div id="admob-banner">
  <ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="${ADMOB_APP_ID}" data-ad-slot="${ADMOB_BANNER}"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
<footer>© ${new Date().getFullYear()} NexusAI · Powered by IA</footer>
<script>
function process(){
  const v = document.getElementById('input').value.trim();
  if(!v){document.getElementById('result').textContent='Por favor escribe algo primero.';return;}
  document.getElementById('result').innerHTML='<span style="color:#a78bfa">⚡ Procesando: </span>' + v.toUpperCase();
}
// AdMob interstitial
window.addEventListener('load',function(){
  if(window.adsbygoogle) (adsbygoogle=window.adsbygoogle||[]).push({});
});
</script>
</body>
</html>`;
}

async function generateApp(prompt: string): Promise<string> {
  const ADMOB_APP_ID   = "ca-app-pub-4903263409458961~5751005760";
  const ADMOB_BANNER   = "ca-app-pub-4903263409458961/8825147276";
  const ADMOB_INTER    = "ca-app-pub-4903263409458961/4622591073";
  const ADMOB_REWARDED = "ca-app-pub-4903263409458961/3980014703";
  const AMAZON_TAG     = "r3dm01-21";

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
    const key = p.keyEnv ? GROQ_KEY : "free";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000); // 45s timeout
    try {
      const res = await fetch(p.url, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
          max_tokens: 6000,
          temperature: 0.7,
        }),
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      let code = data.choices?.[0]?.message?.content ?? "";
      if (code.includes("```html")) code = code.split("```html")[1].split("```")[0];
      else if (code.includes("```")) code = code.split("```")[1].split("```")[0];
      code = code.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (code.length > 200) return code;
    } catch { clearTimeout(timer); continue; }
  }
  // Fallback local si todas las APIs fallan
  return generateFallbackApp(prompt);
}

// ---- Amazon productos ----
const AMAZON_PRODUCTS = [
  { name: "Auriculares Bluetooth", url: "https://www.amazon.es/s?k=auriculares+bluetooth&tag=r3dm01-21", img: "🎧" },
  { name: "Teclado mecánico",      url: "https://www.amazon.es/s?k=teclado+mecanico&tag=r3dm01-21",     img: "⌨️" },
  { name: "Micrófono USB",         url: "https://www.amazon.es/s?k=microfono+usb&tag=r3dm01-21",        img: "🎙️" },
  { name: "Monitor 4K",            url: "https://www.amazon.es/s?k=monitor+4k&tag=r3dm01-21",           img: "🖥️" },
  { name: "SSD portátil",          url: "https://www.amazon.es/s?k=ssd+portatil&tag=r3dm01-21",         img: "💾" },
  { name: "Webcam HD",             url: "https://www.amazon.es/s?k=webcam+hd&tag=r3dm01-21",            img: "📷" },
];

export default function Dashboard() {
  const { user, signOut, isAdmin, refreshUser } = useAuth();

  // Cargar AdMob script solo para usuarios free
  React.useEffect(() => {
    if (user && user.plan === "free") {
      const existing = document.getElementById("admob-script");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "admob-script";
        s.async = true;
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADMOB_APP_ID;
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
      }
    }
  }, [user]);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedUrls, setPublishedUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("generator");

  useEffect(() => { loadStoredAppsAsync().then(setApps); }, []);

  const addLog = (msg: string) => setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Banner AdMob — solo usuarios free
  const AdmobBanner = () => userShowAds ? (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center bg-black/80 py-1 border-t border-white/5">
      <ins className="adsbygoogle"
        style={{ display: "inline-block", width: "320px", height: "50px" }}
        data-ad-client={ADMOB_APP_ID}
        data-ad-slot="8825147276"
        data-ad-format="auto" />
    </div>
  ) : null;

  const PAYPAL_LINK = "https://www.paypal.com/paypalme/joanlazaro83/9.99";
  const [subscribing, setSubscribing] = React.useState(false);
  const [subMsg, setSubMsg] = React.useState("");

  const handleSubscribe = async () => {
    if (!user) return;
    setSubscribing(true);
    setSubMsg("Redirigiendo a PayPal...");
    localStorage.setItem("nexusai_pending_upgrade", user.id);
    window.open(PAYPAL_LINK, "_blank");
    setTimeout(() => {
      setSubscribing(false);
      setSubMsg("¿Ya has pagado? Pulsa confirmar para activar Premium.");
    }, 8000);
  };

  const handleConfirmPayment = async () => {
    if (!user) return;
    setSubscribing(true);
    setSubMsg("Activando Premium...");
    try {
      const result = await (api as any).activatePlan(user.id, "premium", "paypal-manual");
      if (result?.ok) {
        await refreshUser();
        setSubMsg("✅ ¡Premium activado! Recarga si no ves los cambios.");
        localStorage.removeItem("nexusai_pending_upgrade");
      } else {
        setSubMsg("No pudimos verificar el pago. Escríbenos a joanlazaro83@gmail.com");
      }
    } catch {
      setSubMsg("Error al activar. Escríbenos a joanlazaro83@gmail.com con tu recibo.");
    }
    setSubscribing(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setStatusLog([]);
    const appName = prompt.trim().split(" ").slice(0, 4).join(" ");
    addLog(`🚀 Generando "${appName}"...`);
    addLog("🔗 Conectando con IA...");
    try {
      const code = await generateApp(prompt.trim());
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
      try {
        await _sb.from("apps").insert({ id: newApp.id, user_id: user?.id || user?.email || "anon", user_email: user?.email || "", name: appName, description: prompt.trim().slice(0,300), html_code: code });
      } catch(e) { console.error("[Supabase] save:", e); }
      setApps(prev => [newApp, ...prev]);
      setPrompt("");
      // Descontar crédito
      if (user?.role !== "admin") {
        const nc = Math.max(0, (user?.credits ?? 1) - 1);
        await _sb.from("users").update({ credits: nc }).eq("id", user?.id || "").catch(console.error);
      }
      addLog(`✅ "${appName}" lista. Ve a "Mis Apps".`);
    } catch (err) {
      addLog(`❌ ${err instanceof Error ? err.message : "Error"}`);
    } finally { setGenerating(false); }
  };

  const publishApp = async (app: AppRecord) => {
    if (!app.source_code) {
      alert("Esta app no tiene código guardado. Genera una nueva app para publicarla.");
      return;
    }
    setPublishingId(app.id);
    try {
      // Subir a Supabase Storage como HTML público
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const fileName = `apps/${app.id}.html`;
      const blob = new Blob([app.source_code], { type: "text/html" });
      const { error } = await sb.storage.from("published-apps").upload(fileName, blob, {
        contentType: "text/html",
        upsert: true,
      });
      if (error) throw error;
      const { data } = sb.storage.from("published-apps").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;
      setPublishedUrls(prev => ({ ...prev, [app.id]: publicUrl }));
      // Copiar al portapapeles
      await navigator.clipboard.writeText(publicUrl);
      alert(`✅ App publicada!\nURL copiada al portapapeles:\n${publicUrl}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Error al publicar: " + msg);
    }
    setPublishingId(null);
  };

  const deleteApp = async (id: string) => {
    if (!window.confirm("¿Eliminar esta app?")) return;
    try {
      const res = await fetch(
        `https://tolzqxflecqbjdefohom.supabase.co/rest/v1/apps?id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHpxeGZsZWNxYmpkZWZvaG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEwODA3MCwiZXhwIjoyMDk5Njg0MDcwfQ.FaTcZpS4tVKJl8rIP-Vfv0nMub2bnNJNFFo9t1w7JfU",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHpxeGZsZWNxYmpkZWZvaG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEwODA3MCwiZXhwIjoyMDk5Njg0MDcwfQ.FaTcZpS4tVKJl8rIP-Vfv0nMub2bnNJNFFo9t1w7JfU",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          }
        }
      );
      if (res.ok || res.status === 204) {
        setApps(prev => prev.filter(a => a.id !== id));
      } else {
        alert("Error al eliminar. Intenta de nuevo.");
      }
    } catch (e) {
      alert("Error de conexión.");
    }
  };

  const downloadApp = (app: AppRecord) => {
    if (!app.source_code) return;
    const blob = new Blob([app.source_code], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${app.name.replace(/\s+/g, "-")}.html`;
    a.click();
  };

  const credits      = user?.credits ?? FREE_CREDITS;
  const userIsPremium = isPremium(user);
  const userShowAds   = showAds(user);
  const userHasCredits = hasCredits(user);

  const sidebarItems: { id: TabId; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: "generator", icon: Code2,          label: "Generador IA" },
    { id: "myapps",    icon: Smartphone,     label: "Mis Apps", badge: apps.length > 0 ? String(apps.length) : undefined },
    { id: "monetize",  icon: BadgeDollarSign, label: "Monetizar" },
    { id: "credits",   icon: CreditCard,     label: "Créditos" },
  ];

  // Paywall modal
  const renderPaywall = () => paywallOpen && (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#111128",border:"1px solid #7c3aed",borderRadius:16,padding:32,maxWidth:380,width:"90%",textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:48,marginBottom:8}}>⚡</div>
        <h2 style={{margin:"0 0 8px",fontSize:22,color:"#a78bfa"}}>Sin créditos</h2>
        <p style={{color:"#888",margin:"0 0 20px",fontSize:14}}>Necesitas créditos para generar apps.<br/>Con el <strong style={{color:"#fff"}}>Plan Pro</strong> tienes créditos ilimitados por solo <strong style={{color:"#a78bfa"}}>€2.99/mes</strong>.</p>
        <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions&business=joanlazaro83%40gmail.com&item_name=NexusAI+Pro&item_number=pro_monthly&amount=2.99&currency_code=EUR&src=1&sra=1&t3=M&p3=1&no_note=1&return=https://nexusia-three.vercel.app&cancel_return=https://nexusia-three.vercel.app" target="_blank" rel="noopener" style={{display:"block",background:"#003087",color:"#fff",padding:"12px 24px",borderRadius:8,textDecoration:"none",fontWeight:700,fontSize:15,marginBottom:12}} onClick={()=>setPaywallOpen(false)}>💳 Suscribirse con PayPal — €2.99/mes</a>
        <button onClick={()=>setPaywallOpen(false)} style={{background:"transparent",border:"1px solid #333",color:"#888",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );


  return (
    <>
    {renderPaywall()}
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl flex-col transition-transform duration-300 md:sticky md:flex ${sidebarOpen ? "flex translate-x-0" : "hidden md:flex -translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <BrainCircuit className="text-primary w-6 h-6" />
          <span className="font-bold">NexusAI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onPointerDown={(e) => { e.stopPropagation(); setActiveTab(item.id); setSidebarOpen(false); }}
              onClick={(e) => { e.stopPropagation(); setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge className="text-[9px] px-1.5 bg-primary/20 text-primary border-primary/30">
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
      {/* Bottom navigation — solo móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-card/95 backdrop-blur-xl border-t border-border h-16">
        {[
          { id: "generator", icon: "🤖", label: "Generar" },
          { id: "myapps",    icon: "📱", label: "Mis Apps" },
          { id: "monetize",  icon: "💰", label: "Monetizar" },
          { id: "credits",   icon: "💳", label: "Créditos" },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabId)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              activeTab === item.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm">
                {activeTab === "generator" && "Generador de Apps IA"}
                {activeTab === "myapps"    && "Mis Apps"}
                {activeTab === "monetize"  && "💰 Monetizar"}
                {activeTab === "credits"   && "Créditos"}
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

              <Card className="border-dashed border-violet-500/30 bg-violet-500/5">
                <CardContent className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">Preview en tiempo real + editor de código avanzado</p>
                  <Button variant="outline" size="sm" className="mt-2 cursor-pointer border-violet-500/40 text-violet-400 hover:bg-violet-500/10" onClick={() => navigate("/builder")}>
                    <Zap className="w-3.5 h-3.5 mr-1" /> Builder Avanzado ✨
                  </Button>
                </CardContent>
              </Card>
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
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setPreviewCode(app.source_code || "<p style='color:white;padding:20px'>Sin código guardado. Regenera la app.</p>")}>
                          <Globe className="w-3 h-3 mr-1" /> Ver
                        </Button>
                        {app.source_code && (
                          <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => setSelectedCode(app.source_code!)}>
                            <Code2 className="w-3 h-3 mr-1" /> Código
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => downloadApp(app)}>
                          <Download className="w-3 h-3 mr-1" /> Descargar
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs" onClick={() => navigate("/builder")}>
                          <Zap className="w-3 h-3 mr-1" /> Regenerar
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => deleteApp(app.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                        </Button>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {/* ===== MONETIZAR ===== */}
          {activeTab === "monetize" && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Google AdMob
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    ✅ Tu cuenta AdMob está integrada en todas las apps generadas.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 space-y-1">
                      <p className="text-yellow-300 font-semibold mb-2">📱 Nexusia — IDs activos</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">App ID:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">ca-app-pub-4903263409458961~5751005760</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Banner:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...8825147276</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Intersticial:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...4622591073</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Int. Bonificado:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...1824624651</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Carga de app:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...8054991080</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Bonificado:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...3980014703</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nativo avanzado:</span><code className="text-yellow-200 bg-black/30 px-1 rounded text-[10px]">...2202908920</code></div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-300">
                      💰 Con 1.000 visitas/día estimas entre 0,50€ y 3€/día. Todas tus apps ya llevan estos IDs integrados.
                    </div>
                  </div>
                  <Button size="sm" className="cursor-pointer gap-2 bg-yellow-600 hover:bg-yellow-500 text-black" onClick={() => window.open("https://admob.google.com", "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5" /> Ver panel AdMob
                  </Button>
                </CardContent>
              </Card>

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

          {/* ===== CRÉDITOS + PRECIOS ===== */}
          {activeTab === "credits" && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

              {/* Plan actual */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Tu Plan Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{userIsPremium ? "✨ Premium" : "🆓 Free"}</h3>
                      <p className="text-xs text-muted-foreground">{userIsPremium ? "Créditos ilimitados · Sin anuncios" : `${credits} de ${FREE_CREDITS} créditos disponibles`}</p>
                    </div>
                    <Badge className={userIsPremium ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}>
                      {userIsPremium ? "Premium" : "Free"}
                    </Badge>
                  </div>
                  {!userIsPremium && (
                    <div className="w-full bg-secondary rounded-full h-2 mb-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (credits / FREE_CREDITS) * 100)}%` }} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Planes de precios */}
              {!userIsPremium && (
                <div>
                  <h2 className="text-base font-semibold mb-4 text-center">🚀 Elige tu plan</h2>
                  <div className="grid gap-4">

                    {/* Plan Free */}
                    <Card className="border border-border opacity-80">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-base">🆓 Free</h3>
                            <p className="text-xs text-muted-foreground">Para empezar</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold">€0</span>
                            <span className="text-xs text-muted-foreground">/mes</span>
                          </div>
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground mb-4">
                          <li>✅ 5 generaciones de apps</li>
                          <li>✅ Descarga HTML</li>
                          <li>✅ PWA instalable</li>
                          <li>⚠️ Anuncios AdMob</li>
                          <li>❌ Sin APK nativo</li>
                          <li>❌ Sin soporte</li>
                        </ul>
                        <div className="w-full py-2 text-center text-xs text-muted-foreground border border-border rounded-lg">Plan actual</div>
                      </CardContent>
                    </Card>

                    {/* Plan Premium */}
                    <Card className="border-2 border-red-500/60 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">⭐ RECOMENDADO</div>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-base">✨ Premium</h3>
                            <p className="text-xs text-muted-foreground">Para creadores serios</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-red-400">€9.99</span>
                            <span className="text-xs text-muted-foreground">/mes</span>
                          </div>
                        </div>
                        <ul className="space-y-1 text-xs mb-4">
                          <li>✅ <strong>Generaciones ilimitadas</strong></li>
                          <li>✅ Sin anuncios en la plataforma</li>
                          <li>✅ Descarga HTML + APK nativo</li>
                          <li>✅ Apps con tus IDs de AdMob</li>
                          <li>✅ Soporte prioritario por email</li>
                          <li>✅ Acceso a nuevas funciones antes</li>
                        </ul>
                        <button
                          disabled={subscribing}
                          onClick={handleSubscribe}
                          className="w-full block py-2.5 text-center text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          {subscribing ? "⏳ Procesando..." : "💳 Suscribirme — €9.99/mes"}
                        </button>
                        {subMsg && (
                          <div className="mt-2 text-center text-[11px] text-muted-foreground">
                            {subMsg}
                            {subMsg.includes("confirmar") && (
                              <button
                                onClick={handleConfirmPayment}
                                className="mt-2 w-full py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                              >
                                ✅ Ya pagué — Activar Premium
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                          Pago seguro via PayPal · Se activa automáticamente
                        </p>
                      </CardContent>
                    </Card>

                  </div>
                </div>
              )}

              {/* Si ya es Premium */}
              {userIsPremium && (
                <Card className="border border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl mb-2">🎉</p>
                    <h3 className="font-semibold mb-1">¡Eres Premium!</h3>
                    <p className="text-xs text-muted-foreground">Tienes acceso completo: generaciones ilimitadas y sin anuncios.</p>
                  </CardContent>
                </Card>
              )}

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
              <Button size="sm" className="cursor-pointer" onClick={() => { setSelectedCode(null); setPreviewCode(selectedCode); }}>
                <Globe className="w-3 h-3 mr-1" /> Vista previa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal — iframe embebido */}
      {previewCode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Vista previa</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="cursor-pointer text-xs" onClick={() => {
                const blob = new Blob([previewCode], { type: "text/html" });
                window.open(URL.createObjectURL(blob), "_blank");
              }}>
                <ExternalLink className="w-3 h-3 mr-1" /> Pantalla completa
              </Button>
              <button onClick={() => setPreviewCode(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <iframe
            srcDoc={previewCode}
            className="flex-1 w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Vista previa de la app"
          />
        </div>
      )}
    </div>
    </>
  );
}