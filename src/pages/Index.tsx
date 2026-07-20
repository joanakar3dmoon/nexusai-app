import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "motion/react";

// ── Partículas ────────────────────────────────────────────────────────────────
function Particles() {
  const pts = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 2.5 + 0.5,
    d: Math.random() * 15 + 8,
    dl: Math.random() * 5,
    o: Math.random() * 0.5 + 0.1,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pts.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-red-500"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, opacity: p.o }}
          animate={{ y: [0, -30, 0], opacity: [p.o, p.o * 0.3, p.o] }}
          transition={{ duration: p.d, delay: p.dl, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-red-500/6 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-red-700/5 rounded-full blur-3xl" />
    </div>
  );
}

// ── Grid bg ───────────────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div
      className="fixed inset-0 z-0 opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(rgba(220,38,38,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(220,38,38,0.15) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    if (!del && sub < current.length) {
      const t = setTimeout(() => setSub(s => s + 1), 50);
      return () => clearTimeout(t);
    }
    if (!del && sub === current.length) {
      const t = setTimeout(() => setDel(true), 2000);
      return () => clearTimeout(t);
    }
    if (del && sub > 0) {
      const t = setTimeout(() => setSub(s => s - 1), 25);
      return () => clearTimeout(t);
    }
    if (del && sub === 0) {
      setDel(false);
      setIdx(i => (i + 1) % texts.length);
    }
  }, [sub, del, idx, texts]);

  return (
    <span className="text-red-400">
      {texts[idx].slice(0, sub)}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { n: "12.847+", label: "Apps generadas" },
  { n: "5",       label: "Modelos IA" },
  { n: "3.201+",  label: "APKs compiladas" },
  { n: "100%",    label: "Gratis" },
];

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🤖", title: "5 Modelos IA",        desc: "Gemini, GPT-4, Claude, Mistral y Groq generando apps reales" },
  { icon: "📱", title: "Flutter Nativo",       desc: "Código Dart real, no templates. APK instalable en minutos" },
  { icon: "💰", title: "AdMob integrado",      desc: "Cada app que generas lleva tus anuncios. Ingresos pasivos reales" },
  { icon: "☁️", title: "Compila en la nube",   desc: "Sin instalar nada. Tu APK lista en ~3 min con GitHub Actions" },
  { icon: "🔒", title: "Tus apps, tus datos",  desc: "Dashboard personal, historial, descarga directa del código" },
  { icon: "⚡", title: "Sin límites",           desc: "Acceso libre durante el beta. Sin tarjeta, sin suscripción" },
];

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: "01", title: "Describe tu app",   desc: "Escribe en español qué quieres. Sin código, sin tecnicismos." },
  { n: "02", title: "La IA genera",      desc: "5 modelos IA generan código Flutter nativo en segundos." },
  { n: "03", title: "Compila la APK",    desc: "Un clic y en 3 minutos tienes tu APK lista para instalar." },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function Index() {
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Introduce tu email"); return; }
    setLoading(true);
    setError("");
    const ok = await signIn(email, password);
    setLoading(false);
    if (ok) navigate("/dashboard");
    else setError("Error al iniciar sesión. Prueba con cualquier email.");
  };

  // Si ya está autenticado — pantalla simple
  if (user) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative">
        <Particles />
        <GridBg />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-6"
        >
          <div className="text-5xl font-black">⚡ NexusAI</div>
          <p className="text-white/60">Bienvenido, {user.email}</p>
          <div className="flex flex-col gap-3 w-64 mx-auto">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
            >
              Ir al Dashboard
            </button>
            <button
              onClick={() => navigate("/builder")}
              className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl border border-white/10 transition-all"
            >
              Crear App con IA
            </button>
            <button
              onClick={signOut}
              className="text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      <Particles />
      <GridBg />

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-black text-lg tracking-tight">NexusAI</span>
          <span className="text-[10px] bg-red-600/30 text-red-400 px-2 py-0.5 rounded-full font-bold border border-red-500/30">BETA</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="bg-white text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-white/90 transition-all"
        >
          Entrar →
        </motion.button>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-red-950/40 border border-red-500/20 rounded-full px-4 py-1.5 text-sm text-red-300 mb-8"
        >
          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          Generador de apps nativas con IA — Flutter real
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-6"
        >
          Crea apps<br />
          <span className="text-red-500" style={{ textShadow: "0 0 60px rgba(239,68,68,0.4)" }}>
            con IA real
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xl text-white/50 mb-2"
        >
          Describe tu idea.{" "}
          <Typewriter texts={[
            "Compilamos la APK en 3 minutos.",
            "Sin código. Sin complicaciones.",
            "Flutter nativo. AdMob integrado.",
            "Gratis durante el beta.",
          ]} />
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mt-10 mb-10"
        >
          {STATS.map(s => (
            <div key={s.n} className="text-center">
              <div className="text-2xl font-black text-white">{s.n}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-all"
            style={{ boxShadow: "0 0 30px rgba(239,68,68,0.25)" }}
          >
            Empieza gratis ahora →
          </motion.button>
          <p className="text-white/30 text-sm">Sin registro real — cualquier email vale</p>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-black text-center mb-12"
        >
          Todo lo que necesitas para monetizar
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.3)" }}
              className="p-6 rounded-2xl border border-white/8 transition-all cursor-default"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-bold text-white mb-2">{f.title}</div>
              <div className="text-sm text-white/50">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-black text-center mb-14"
        >
          Tres pasos para tener tu app
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 border border-red-500/30"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                {s.n}
              </div>
              <div className="font-bold text-white mb-2">{s.title}</div>
              <div className="text-sm text-white/50">{s.desc}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-all"
          >
            Crear mi primera app →
          </motion.button>
          <p className="text-white/30 text-sm mt-3">100% gratis · Sin tarjeta · Listo en 3 minutos</p>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 py-10 text-center text-white/20 text-sm">
        <p>⚡ NexusAI Studio · <span className="text-red-500/60">r3dm/joan</span> · 2024</p>
        <p className="mt-1 text-xs">Powered by Flutter · GitHub Actions · AdMob · Supabase</p>
      </footer>

      {/* ── MODAL LOGIN ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-8 border border-white/10"
              style={{ background: "linear-gradient(135deg, rgba(20,20,30,0.98) 0%, rgba(10,10,20,0.98) 100%)" }}
            >
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">⚡</div>
                <h2 className="text-2xl font-black">Empieza gratis</h2>
                <p className="text-white/40 text-sm mt-1">Sin registro real — cualquier email vale</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Contraseña (opcional)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-colors"
                />
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">
                    {error}
                  </motion.p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-lg"
                >
                  {loading ? "Entrando..." : "Entrar gratis →"}
                </motion.button>
              </form>

              <button
                onClick={() => setShowForm(false)}
                className="w-full mt-4 text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
