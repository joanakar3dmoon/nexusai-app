import { motion } from "motion/react";
import { Bot, Code2, Zap, DollarSign, Rocket, Check, Menu, X, Sparkles, Play, ChevronRight, Cpu, Music, Palette, Briefcase, Star, MessageSquare, BarChart3, Globe } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignInButton } from "@/components/ui/signin";
import { Authenticated, Unauthenticated, useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: Code2, title: "Generador de Apps con IA", desc: "Describe tu idea en texto y la IA genera el codigo completo, listo para publicar. Sin saber programar.", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", badge: "Mas usado" },
  { icon: MessageSquare, title: "Playground IA en vivo", desc: "Chatea con GPT-4o Mini, Llama 3.3 70B y DeepSeek R1 directamente. Sin demos. Sin trucos.", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", badge: "Nuevo" },
  { icon: Bot, title: "Superagentes IA", desc: "Crea agentes personalizados con instrucciones propias. Automatiza tareas repetitivas 24/7.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", badge: null },
  { icon: DollarSign, title: "Monetizacion AdMob + Afiliados", desc: "Gana dinero con anuncios AdMob y Amazon Afiliados integrados directamente en tus apps.", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", badge: null },
  { icon: BarChart3, title: "Panel Admin con Retiros", desc: "Controla tus ingresos y solicita retiros reales a tu PayPal con un solo clic.", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20", badge: null },
  { icon: Rocket, title: "PWA Instalable", desc: "Instala NexusAI en tu Android o iOS como app nativa. Sin Play Store, sin esperas.", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", badge: null },
];

const useCases = [
  { icon: Music, label: "Musicos", desc: "App de demos, portfolio de canciones, chat con fans integrado." },
  { icon: Palette, label: "Disenadores", desc: "Portfolio visual, galeria de proyectos, formulario de contacto." },
  { icon: Briefcase, label: "Freelancers", desc: "App de presupuestos, seguimiento de clientes, facturacion." },
  { icon: Globe, label: "Creadores", desc: "Blog, tienda de contenidos, app de comunidad con IA." },
];

const aiModels = [
  { name: "GPT-4o Mini", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
  { name: "Llama 3.3 70B", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  { name: "DeepSeek R1", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { name: "Mixtral 8x7B", color: "text-pink-300 border-pink-500/30 bg-pink-500/10" },
  { name: "Qwen 2.5", color: "text-orange-300 border-orange-500/30 bg-orange-500/10" },
];

const stats = [
  { value: "10K+", label: "Apps generadas" },
  { value: "99.9%", label: "Disponibilidad" },
  { value: "3 APIs", label: "IAs conectadas" },
  { value: "24/7", label: "Agentes activos" },
];

const testimonials = [
  { text: "En 20 minutos tenia mi primera app publicada. Nunca habia tocado codigo en mi vida.", author: "Carlos M.", role: "Musico independiente", stars: 5 },
  { text: "El Playground IA es real, no como otras plataformas que simulan respuestas. Se nota la diferencia.", author: "Laura G.", role: "Disenadora freelance", stars: 5 },
  { text: "Genero ingresos pasivos con AdMob gracias a una app que la IA me creo en un rato.", author: "Diego R.", role: "Creador de contenido", stars: 5 },
];

const plans = [
  { name: "Free", price: "0", period: "/mes", desc: "Empieza sin coste, sin tarjeta", color: "border-white/10", badge: null, features: ["3 agentes IA", "50 creditos IA/mes", "1 app generada", "Playground IA (3 modelos)", "Chat basico con agentes", "Soporte por email"], cta: "Empieza gratis ahora", highlighted: false },
  { name: "Pro", price: "29", period: "/mes", desc: "Para creadores y freelancers", color: "border-violet-500/60", badge: "Mas popular", features: ["Agentes IA ilimitados", "2.000 creditos IA/mes", "Apps ilimitadas", "Playground completo (5 modelos)", "Monetizacion AdMob + Afiliados", "Panel admin + retiros a PayPal", "Soporte prioritario"], cta: "Activar Pro ahora", highlighted: true },
  { name: "Studio", price: "79", period: "/mes", desc: "Para equipos y agencias", color: "border-cyan-500/30", badge: null, features: ["Todo lo de Pro", "10 miembros del equipo", "API acceso directo", "Marca blanca", "SLA 99.9%", "Manager dedicado"], cta: "Contactar ventas", highlighted: false },
];

const PLAY_MODELS = [
  { id: "freellm", label: "GPT-4o Mini", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10", url: "https://api.freellm.net/v1/chat/completions", model: "gpt-4o-mini-free", key: "free" },
  { id: "groq", label: "Llama 3.3 70B", color: "text-violet-300 border-violet-500/30 bg-violet-500/10", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", key: "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" },
  { id: "deepseek", label: "DeepSeek R1", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", url: "https://api.groq.com/openai/v1/chat/completions", model: "deepseek-r1-distill-llama-70b", key: "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" },
];

type ChatMsg = { role: "user" | "assistant"; content: string; model?: string };

function LandingPlayground({ navigate }: { navigate: (path: string) => void }) {
  const [selectedModel, setSelectedModel] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    const pm = PLAY_MODELS[selectedModel];
    try {
      const res = await fetch(pm.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm.key}` },
        body: JSON.stringify({ model: pm.model, messages: newMsgs.map(m => ({ role: m.role, content: m.content })), max_tokens: 1024, temperature: 0.7 }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let reply = data.choices?.[0]?.message?.content ?? "";
      reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (!reply) throw new Error("vacio");
      setMessages([...newMsgs, { role: "assistant", content: reply, model: pm.label }]);
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
      setMessages(newMsgs);
    } finally {
      setLoading(false);
      setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    }
  };

  return (
    <section id="playground" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge className="mb-4 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-4 py-1.5 text-sm">Playground IA en vivo</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pruebalo ahora, <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">sin registrarte</span></h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Chat real con 3 modelos de IA. Sin demos grabadas. Sin respuestas inventadas.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-white/30 font-mono">NexusAI Playground</span>
            <div className="ml-auto flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-emerald-400 font-mono">LIVE</span></div>
          </div>
          <div className="flex gap-2 px-4 pt-4 flex-wrap">
            {PLAY_MODELS.map((m, i) => (
              <button key={m.id} onClick={() => setSelectedModel(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${m.color} ${selectedModel === i ? "ring-2 ring-white/20" : "opacity-50 hover:opacity-80"}`}>
                <Cpu className="w-3 h-3 inline mr-1" />{m.label}
              </button>
            ))}
          </div>
          <div ref={msgsRef} className="px-4 py-4 space-y-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center text-white/20 text-sm py-8"><Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />Escribe algo para empezar. Es una IA real.</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600/30 text-white border border-violet-500/20" : "bg-white/[0.04] text-white/80 border border-white/5"}`}>
                  {msg.role === "assistant" && <p className="text-[10px] text-white/30 font-mono mb-1">{msg.model}</p>}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-1.5">
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
            <button onClick={send} disabled={!input.trim() || loading} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity">→</button>
          </div>
          <div className="px-4 pb-3 text-center text-[11px] text-white/20">
            Registrate para guardar conversaciones, generar apps y mas →{" "}
            <button onClick={() => navigate("/dashboard")} className="text-violet-400 underline cursor-pointer">Entrar al Dashboard</button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Cpu className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-lg tracking-tight">NexusAI</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Funciones</button>
              <button onClick={() => document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Playground IA</button>
              <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Precios</button>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Unauthenticated>
                <SignInButton mode="modal"><Button variant="ghost" size="sm" className="text-white/70 hover:text-white">Iniciar sesion</Button></SignInButton>
                <SignInButton mode="modal"><Button size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 font-semibold">Empieza gratis</Button></SignInButton>
              </Unauthenticated>
              <Authenticated>
                <Button size="sm" onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">Ir al Dashboard</Button>
                {isAdmin && <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-white/70">Admin</Button>}
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
              <SignInButton mode="modal"><Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-semibold mt-2">Empieza gratis ahora</Button></SignInButton>
            </Unauthenticated>
            <Authenticated><Button className="w-full" onClick={() => navigate("/dashboard")}>Ir al Dashboard</Button></Authenticated>
          </motion.div>
        )}
      </header>

      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-4 py-1.5 text-sm font-medium"><Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Plataforma IA gratuita para creadores</Badge>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Crea tu propia app <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">con IA.</span><br />Gratis. En minutos.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            NexusAI es el estudio de IA para musicos, creadores y freelancers. Genera apps completas escribiendo en texto, experimenta con <span className="text-white/80 font-medium">5 modelos IA</span> en el Playground, y monetiza con AdMob y Amazon Afiliados. <span className="text-violet-300 font-semibold">Sin codigo. Sin coste inicial.</span>
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Unauthenticated>
              <SignInButton mode="modal"><Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-violet-500/25"><Zap className="w-5 h-5 mr-2" /> Empieza gratis ahora</Button></SignInButton>
            </Unauthenticated>
            <Authenticated><Button size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold text-base px-8 py-6 rounded-xl"><Zap className="w-5 h-5 mr-2" /> Ir al Dashboard</Button></Authenticated>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white text-base px-8 py-6 rounded-xl"><Play className="w-4 h-4 mr-2" /> Ver como funciona</Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/40">
            {["Sin tarjeta de credito", "Gratis para siempre", "Sin instalar nada", "PWA instalable"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> {t}</span>
            ))}
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }} className="max-w-4xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-6 py-6 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-sm text-white/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Para quien es NexusAI?</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Hecho para creativos, <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">no para programadores</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {useCases.map((uc, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><uc.icon className="w-6 h-6 text-violet-300" /></div>
                <h3 className="font-bold text-white mb-2">{uc.label}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LandingPlayground navigate={navigate} />

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Todo en una plataforma</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">Las herramientas que los <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">creadores necesitan</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={`relative bg-white/[0.02] border ${f.border} rounded-2xl p-6 hover:bg-white/[0.05] hover:scale-[1.02] transition-all duration-300 group`}>
                {f.badge && <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full ${f.bg} ${f.color} border ${f.border}`}>{f.badge}</span>}
                <div className={`w-12 h-12 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}><f.icon className={`w-6 h-6 ${f.color}`} /></div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
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
                <ul className="space-y-3 flex-1 mb-8">{plan.features.map((feat, j) => (<li key={j} className="flex items-start gap-3"><Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span className="text-white/70 text-sm">{feat}</span></li>))}</ul>
                <Unauthenticated><SignInButton mode="modal"><Button className={`w-full font-bold py-5 rounded-xl ${plan.highlighted ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"}`}>{plan.cta}{plan.highlighted && <ChevronRight className="w-4 h-4 ml-1" />}</Button></SignInButton></Unauthenticated>
                <Authenticated><Button onClick={() => navigate("/dashboard")} className={`w-full font-bold py-5 rounded-xl ${plan.highlighted ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"}`}>{plan.highlighted ? "Activar Pro" : plan.cta}</Button></Authenticated>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-br from-violet-900/40 via-[#080b14] to-cyan-900/30 border border-violet-500/20 rounded-3xl p-10 sm:p-16">
            <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Tu app con IA te espera. <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Gratis.</span></h2>
            <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">Unete a miles de creadores que ya generan apps, monetizan con IA y cobran a traves de PayPal. Sin experiencia. Sin codigo. Sin coste inicial.</p>
            <Unauthenticated><SignInButton mode="modal"><Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 font-bold text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-violet-500/30"><Zap className="w-6 h-6 mr-2" /> Empieza gratis ahora — 0</Button></SignInButton></Unauthenticated>
            <Authenticated><Button size="lg" onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 font-bold text-lg px-12 py-7 rounded-2xl"><Zap className="w-6 h-6 mr-2" /> Ir a mi Dashboard</Button></Authenticated>
            <p className="text-white/25 text-sm mt-6">Sin tarjeta - Cancela cuando quieras - Playground incluido gratis</p>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-10 text-white/30 text-xs space-y-6">
          <div id="privacy">
            <p className="font-semibold text-white/50 mb-1">Politica de Privacidad</p>
            <p>NexusAI no recopila datos personales sin tu consentimiento. Las apps generadas y configuraciones se almacenan localmente en tu dispositivo. El email de registro se usa unicamente para autenticacion. No vendemos ni compartimos tus datos con terceros. Para eliminar tu cuenta contacta en joanlazaro83@gmail.com.</p>
          </div>
          <div id="terms">
            <p className="font-semibold text-white/50 mb-1">Terminos de Uso</p>
            <p>NexusAI es una plataforma de generacion de apps con IA. El plan gratuito incluye 1 app generada y 50 creditos mensuales. Las apps generadas son propiedad del usuario. NexusAI no se hace responsable del contenido generado por los modelos de IA. El servicio se proporciona tal cual sin garantias de disponibilidad.</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Cpu className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-white">NexusAI</span>
            <span className="text-white/20 text-sm ml-2">Crea con IA. Gana con IA.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30">
            <span>2025 NexusAI</span>
            <a href="#privacy" className="hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#terms" className="hover:text-white/60 transition-colors">Terminos</a>
            <a href="mailto:joanlazaro83@gmail.com" className="hover:text-white/60 transition-colors">Contacto</a>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {aiModels.slice(0, 3).map((m, i) => <span key={i} className={`${m.color} border text-xs px-2 py-1 rounded-full`}>{m.name}</span>)}
            <span className="text-white/20 text-xs px-2 py-1">+2 mas</span>
          </div>
        </div>
      </footer>
    </div>
  );
              }
