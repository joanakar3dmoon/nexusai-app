import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Code2, Bot, DollarSign, BarChart3, Rocket,
  Star, Check, Play, ChevronRight, Sparkles,
  Music, Palette, Briefcase, Globe, Cpu, X, Menu,
  MessageSquare, Download, TrendingUp, Users, ShieldCheck
} from "lucide-react";
import { useAuth, Authenticated, Unauthenticated } from "@/lib/auth";
import { SignInButton } from "@/components/ui/signin";

// ── Datos ──────────────────────────────────────────────────
const stats = [
  { value: "+5.100", label: "Vídeos en YouTube" },
  { value: "100%", label: "Sin código" },
  { value: "5 IAs", label: "Modelos disponibles" },
  { value: "0€", label: "Para empezar" },
];

const features = [
  { icon: Code2, title: "Generador de Apps IA", desc: "Describe tu idea en español y la IA genera el código completo en segundos. HTML, CSS, JS listo para publicar.", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20", badge: "⭐ TOP" },
  { icon: MessageSquare, title: "Playground — 5 Modelos IA", desc: "Chatea gratis con Llama 3, DeepSeek, Mixtral y más. Sin límite en el plan gratuito.", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { icon: Bot, title: "Superagentes IA", desc: "Crea agentes con personalidad propia que responden, recuerdan y ejecutan tareas por ti.", color: "text-pink-300", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  { icon: DollarSign, title: "Monetización AdMob + Amazon", desc: "Tus apps generadas ya llevan anuncios AdMob y links de afiliado Amazon integrados. Gana mientras duermes.", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", badge: "💰 GANA" },
  { icon: BarChart3, title: "Panel Admin + Retiros reales", desc: "Controla usuarios, ingresos y solicita retiros reales a tu cuenta PayPal. Sin intermediarios.", color: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { icon: Rocket, title: "PWA Instalable en móvil", desc: "Instálala en Android o iOS directamente desde el navegador. Sin App Store, sin Google Play.", color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/20", badge: "📱 PWA" },
];

const useCases = [
  { icon: Music, label: "Músicos", desc: "Crea tu app de portafolio o generador de letras en minutos" },
  { icon: Palette, label: "Creadores", desc: "Automatiza publicaciones y gestiona tus fans con IA" },
  { icon: Briefcase, label: "Freelancers", desc: "Genera apps para clientes en minutos, no semanas" },
  { icon: Globe, label: "Emprendedores", desc: "Lanza tu MVP sin pagar programadores" },
];

const plans = [
  {
    name: "Gratis",
    desc: "Para explorar y crear",
    price: "0€",
    period: "/siempre",
    features: ["50 créditos de generación", "Playground IA ilimitado", "1 app guardada", "Anuncios AdMob incluidos", "PWA instalable"],
    cta: "Empezar gratis",
    highlighted: false,
    color: "border-white/10",
  },
  {
    name: "Pro",
    desc: "Para creadores serios",
    price: "€2.99",
    period: "/mes",
    features: ["500 créditos/mes", "Apps ilimitadas guardadas", "Superagentes IA", "Panel de ingresos completo", "Retiros PayPal reales", "Soporte prioritario"],
    cta: "Activar Pro",
    highlighted: true,
    badge: "🔥 MÁS POPULAR",
    color: "border-violet-500/30",
  },
  {
    name: "Studio",
    desc: "Para equipos y agencias",
    price: "€9.99",
    period: "/mes",
    features: ["Créditos ilimitados", "Todo de Pro", "API access", "White-label disponible", "Dashboard multi-usuario", "Factura mensual"],
    cta: "Contactar",
    highlighted: false,
    color: "border-white/10",
  },
];

const testimonials = [
  { text: "Tenía una idea para una app de gestión de ensayos. En 3 minutos la tenía funcionando. Increíble.", author: "Miguel A.", role: "Bajista, Madrid", stars: 5 },
  { text: "Generé 3 apps en una tarde y ya tengo anuncios activos. No sé programar y no importa.", author: "Laura M.", role: "Diseñadora freelance", stars: 5 },
  { text: "Lo mejor es el Playground — puedo probar Llama, DeepSeek y GPT sin pagar nada.", author: "Diego R.", role: "Creador de contenido", stars: 5 },
];

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const PLAY_MODELS = [
  { id: "llama", label: "Llama 3.1 8B", color: "text-violet-300 border-violet-500/30 bg-violet-500/10", model: "llama-3.1-8b-instant" },
  { id: "llama70", label: "Llama 3.3 70B", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10", model: "llama-3.3-70b-versatile" },
  { id: "deepseek", label: "DeepSeek R1", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", model: "deepseek-r1-distill-llama-70b" },
  { id: "gemma", label: "Gemma 2 9B", color: "text-pink-300 border-pink-500/30 bg-pink-500/10", model: "gemma2-9b-it" },
];

type ChatMsg = { role: "user" | "assistant"; content: string; model?: string };

function LandingPlayground({ navigate }: { navigate: (p: string) => void }) {
  const [sel, setSel] = useState(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const scroll = () => setTimeout(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, 60);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setError("");
    const next: ChatMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); setLoading(true); scroll();
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: PLAY_MODELS[sel].model, messages: next.map(m => ({ role: m.role, content: m.content })), max_tokens: 1024, temperature: 0.7 }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      let reply = d.choices?.[0]?.message?.content ?? "";
      reply = reply.replace(/<think>[\\s\\S]*?<\\/think>/g, "").trim();
      if (!reply) throw new Error("vacía");
      setMsgs([...next, { role: "assistant", content: reply, model: PLAY_MODELS[sel].label }]);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setMsgs(next);
    } finally { setLoading(false); scroll(); }
  };

  return (
    <section id="playground" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge className="mb-4 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-4 py-1.5 text-sm">⚡ Playground IA — en vivo</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pruébalo ahora,{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">sin registrarte</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Chat real con 4 modelos de IA. Sin trucos, sin demos grabadas.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-red-400 font-mono font-bold tracking-wider">r3dm/joan — NexusAI</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono font-bold">LIVE</span>
            </div>
          </div>
          <div className="flex gap-2 px-4 pt-4 flex-wrap">
            {PLAY_MODELS.map((m, i) => (
              <button key={m.id} onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${m.color} ${sel === i ? "ring-2 ring-white/20 opacity-100" : "opacity-50 hover:opacity-80"}`}>
                <Cpu className="w-3 h-3 inline mr-1" />{m.label}
              </button>
            ))}
          </div>
          <div ref={ref} className="px-4 py-4 space-y-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            {msgs.length === 0 && (
              <div className="text-center text-white/20 text-sm py-8">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Escribe algo para empezar — es una IA real, no una demo</p>
                <p className="text-xs mt-2 text-white/15">Prueba: "Explícame qué es la música acid techno"</p>
              </div>
            )}
            {msgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600/30 text-white border border-violet-500/20" : "bg-white/[0.04] text-white/80 border border-white/5"}`}>
                  {msg.role === "assistant" && <p className="text-[10px] text-white/30 font-mono mb-1">{msg.model ?? PLAY_MODELS[sel].label}</p>}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/5 rounded-xl px-4 py-3 text-sm text-white/40 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Pregunta algo a la IA..." className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/40 placeholder:text-white/20" disabled={loading} />
            <button onClick={send} disabled={!input.trim() || loading} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity">→</button>
          </div>
          <div className="px-4 pb-3 text-center text-[11px] text-white/20">
            Regístrate gratis para generar apps y guardar todo →{" "}
            <button onClick={() => navigate("/dashboard")} className="text-violet-400 underline cursor-pointer">Entrar al Dashboard</button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Barra de urgencia flotante ─────────────────────────────
function UrgencyBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-violet-700 via-violet-600 to-cyan-600 text-white text-center py-3 px-4 flex items-center justify-center gap-3 shadow-2xl">
      <Zap className="w-4 h-4 text-yellow-300 flex-shrink-0" />
      <span className="text-sm font-semibold">🎁 Plan Gratuito — Crea tu primera app con IA ahora mismo, sin tarjeta</span>
      <button onClick={() => setVisible(false)} className="ml-4 text-white/50 hover:text-white transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────
export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      {/* Fondo */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src="./nexusai-logo.png" alt="NexusAI" className="w-10 h-10 rounded-full object-cover border-2 border-red-500/50 shadow-lg shadow-red-500/20" />
              <div className="flex flex-col leading-none">
                <span className="font-black text-lg tracking-widest text-red-500" style={{ fontFamily: "'Arial Black',Impact,sans-serif", letterSpacing: "0.12em" }}>r3dm/joan</span>
                <span className="text-[10px] text-white/40 tracking-widest font-mono -mt-0.5">NexusAI Studio</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors cursor-pointer">Funciones</button>
              <button onClick={() => document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors cursor-pointer">Playground IA</button>
              <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors cursor-pointer">Precios</button>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Unauthenticated>
                <SignInButton />
              </Unauthenticated>
              <Authenticated>
                <Button size="sm" onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold">Ir al Dashboard</Button>
                {isAdmin && <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-white/60">Admin</Button>}
              </Authenticated>
            </div>
            <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-white/5 bg-[#080b14] px-4 py-4 flex flex-col gap-3">
            <button onClick={() => { document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); setMobileOpen(false); }} className="text-white/70 hover:text-white text-left py-2">Funciones</button>
            <button onClick={() => { document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" }); setMobileOpen(false); }} className="text-white/70 hover:text-white text-left py-2">Playground IA</button>
            <button onClick={() => { document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); setMobileOpen(false); }} className="text-white/70 hover:text-white text-left py-2">Precios</button>
            <Unauthenticated>
              <SignInButton mode="modal">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold mt-2">Empieza gratis ahora</Button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0" onClick={() => navigate("/dashboard")}>Ir al Dashboard</Button>
            </Authenticated>
          </motion.div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Plataforma IA gratuita para creadores independientes
            </Badge>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Tu idea de app,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">lista en 60 segundos.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-4 leading-relaxed">
            Escribe lo que quieres. La IA genera el código. Tú lo publicas y <span className="text-emerald-400 font-semibold">monetizas con anuncios y afiliados</span> desde el primer día.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-white/40 text-sm mb-10">
            Sin experiencia en programación. Sin instalar nada. <span className="text-violet-300">100% gratis para empezar.</span>
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Unauthenticated>
              <SignInButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 font-bold text-base px-10 py-6 rounded-xl shadow-xl shadow-violet-500/30">
                  <Zap className="w-5 h-5 mr-2" /> Crear mi app gratis — 0€
                </Button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <Button size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold text-base px-10 py-6 rounded-xl">
                <Zap className="w-5 h-5 mr-2" /> Ir al Dashboard
              </Button>
            </Authenticated>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" })} className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white text-base px-8 py-6 rounded-xl">
              <Play className="w-4 h-4 mr-2" /> Probar IA gratis
            </Button>
          </motion.div>

          {/* Trust signals */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/40 mb-16">
            {["Sin tarjeta de crédito", "Gratis para siempre", "Sin instalar nada", "PWA instalable en móvil"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> {t}</span>
            ))}
          </motion.div>

          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }} className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-6 py-6 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</p>
                <p className="text-sm text-white/50 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DEMO VISUAL — cómo funciona en 3 pasos */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Así de simple</p>
            <h2 className="text-3xl sm:text-4xl font-bold">De idea a app publicada en <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">3 pasos</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", icon: MessageSquare, title: "Describe tu app", desc: "Escribe en español qué quieres. \"Una app de acordes para guitarra\" o \"un portfolio para mi música\"." },
              { step: "02", icon: Zap, title: "La IA lo genera todo", desc: "En menos de 60 segundos tienes código HTML completo, con diseño, funciones y anuncios incluidos." },
              { step: "03", icon: TrendingUp, title: "Publica y monetiza", desc: "Comparte el link, instálala como PWA y empieza a generar ingresos pasivos con AdMob y Amazon." },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-center hover:bg-white/[0.06] transition-all group">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-xs font-black text-white shadow-lg">{step.step}</span>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4 mx-auto mt-2 group-hover:scale-110 transition-transform">
                  <step.icon className="w-6 h-6 text-violet-300" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">¿Para quién es NexusAI?</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Hecho para creativos, <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">no para programadores</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {useCases.map((uc, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <uc.icon className="w-6 h-6 text-violet-300" />
                </div>
                <h3 className="font-bold text-white mb-2">{uc.label}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYGROUND REAL */}
      <LandingPlayground navigate={navigate} />

      {/* FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Todo en una plataforma</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">Las herramientas que los <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">creadores necesitan</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={`relative bg-white/[0.02] border ${f.border} rounded-2xl p-6 hover:bg-white/[0.05] hover:scale-[1.02] transition-all duration-300 group`}>
                {f.badge && <span className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${f.bg} ${f.color} border ${f.border}`}>{f.badge}</span>}
                <div className={`w-12 h-12 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-sm text-white/40 uppercase tracking-widest mb-10">Lo que dicen nuestros usuarios</motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                <div className="flex gap-1 mb-4">{Array.from({ length: t.stars }).map((_, s) => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div><p className="font-semibold text-white text-sm">{t.author}</p><p className="text-white/40 text-xs">{t.role}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Precios transparentes</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Empieza gratis. <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Escala cuando quieras.</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={`relative flex flex-col rounded-2xl border ${plan.color} p-6 ${plan.highlighted ? "bg-gradient-to-b from-violet-900/40 to-violet-900/10 ring-2 ring-violet-500/40 shadow-2xl shadow-violet-500/20" : "bg-white/[0.02]"} transition-all duration-300 hover:scale-[1.02]`}>
                {plan.badge && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><Badge className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-4 py-1.5 text-xs font-bold shadow-lg">{plan.badge}</Badge></div>}
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/40 text-sm mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold text-white">{plan.price}</span><span className="text-white/40 text-sm">{plan.period}</span></div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3"><Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span className="text-white/70 text-sm">{feat}</span></li>
                  ))}
                </ul>
                <Unauthenticated>
                  <SignInButton mode="modal">
                    <Button className={`w-full font-bold py-5 rounded-xl ${plan.highlighted ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"}`}>
                      {plan.cta}{plan.highlighted && <ChevronRight className="w-4 h-4 ml-1 inline" />}
                    </Button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <Button onClick={() => {
                    if (plan.highlighted) {
                      window.open("https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions&business=joanlazaro83%40gmail.com&item_name=NexusAI+Pro&a3=2.99&p3=1&t3=M&src=1&sra=1&currency_code=EUR", "_blank");
                    } else if (plan.name === "Studio") {
                      window.open("mailto:joanlazaro83@gmail.com?subject=NexusAI+Studio", "_blank");
                    } else {
                      navigate("/dashboard");
                    }
                  }} className={`w-full font-bold py-5 rounded-xl ${plan.highlighted ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"}`}>
                    {plan.highlighted ? "💳 Activar Pro — €2.99/mes" : plan.cta}
                  </Button>
                </Authenticated>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-br from-violet-900/40 via-[#080b14] to-cyan-900/30 border border-violet-500/20 rounded-3xl p-10 sm:p-16">
            <img src="./nexusai-logo.png" alt="NexusAI" className="w-16 h-16 rounded-full mx-auto mb-6 border-2 border-red-500/40 shadow-xl shadow-red-500/20" />
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Tu primera app con IA.<br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Hoy. Gratis.</span>
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">Crea, publica y monetiza tu primera app con IA en menos de 5 minutos. Sin tarjeta. Sin código. Sin excusas.</p>
            <Unauthenticated>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 font-bold text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-violet-500/30">
                  <Zap className="w-6 h-6 mr-2" /> Empezar ahora — 0€
                </Button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <Button size="lg" onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold text-lg px-12 py-7 rounded-2xl">
                <Zap className="w-6 h-6 mr-2" /> Ir a mi Dashboard
              </Button>
            </Authenticated>
            <p className="text-white/25 text-sm mt-6">✓ Sin tarjeta · ✓ Cancela cuando quieras · ✓ Playground incluido gratis</p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-10 text-white/25 text-xs space-y-6">
          <div id="privacy">
            <p className="font-semibold text-white/40 mb-1">Política de Privacidad</p>
            <p>NexusAI no recopila datos personales sin tu consentimiento. Las apps generadas se almacenan en tu cuenta de Supabase. El email de registro se usa únicamente para autenticación. No vendemos ni compartimos tus datos con terceros. Contacto: joanlazaro83@gmail.com.</p>
          </div>
          <div id="terms">
            <p className="font-semibold text-white/40 mb-1">Términos de Uso</p>
            <p>NexusAI es una plataforma de generación de apps con IA. El plan gratuito incluye 50 créditos de generación. Las apps generadas son propiedad del usuario. NexusAI no se hace responsable del contenido generado por los modelos de IA. Nos reservamos el derecho de modificar los términos con aviso previo.</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="./nexusai-logo.png" alt="NexusAI" className="w-7 h-7 rounded-full border border-red-500/30" />
            <span className="font-black text-red-500 tracking-widest text-sm" style={{ fontFamily: "'Arial Black',Impact,sans-serif" }}>r3dm/joan</span>
            <span className="text-white/20 text-sm">· NexusAI Studio</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30">
            <span>© {new Date().getFullYear()} r3dm/joan</span>
            <a href="#privacy" className="hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#terms" className="hover:text-white/60 transition-colors">Términos</a>
            <a href="mailto:joanlazaro83@gmail.com" className="hover:text-white/60 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

      {/* Barra de urgencia inferior */}
      <UrgencyBar />
    </div>
  );
}
