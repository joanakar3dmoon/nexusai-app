import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "motion/react";

// ── Partículas flotantes ──────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.6 + 0.1,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-red-500"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -120, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Grid de fondo tipo terminal ───────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,30,30,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,30,30,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow center */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(220,20,20,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-64"
        style={{ background: "linear-gradient(to bottom, rgba(255,30,30,0.8), transparent)" }}
      />
    </div>
  );
}

// ── Texto con efecto typewriter ───────────────────────────────────────────────
function TypewriterText({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = texts[idx];
    if (!deleting && displayed.length < full.length) {
      const t = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 60);
      return () => clearTimeout(t);
    }
    if (!deleting && displayed.length === full.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((idx + 1) % texts.length);
    }
  }, [displayed, deleting, idx, texts]);

  return (
    <span className="text-red-400">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── Contador animado ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const duration = 2000;
    const steps = 60;
    const inc = to / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [to]);

  return <span>{val.toLocaleString("es-ES")}{suffix}</span>;
}

// ── Badge feature card ─────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.04, y: -4 }}
      className="relative p-6 rounded-2xl border border-white/10 cursor-default"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
      {/* Glow corner */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-2xl bg-red-500 -translate-y-1/2 translate-x-1/2" />
    </motion.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Index() {
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

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

  const stats = [
    { label: "Apps generadas", value: 12847, suffix: "+" },
    { label: "Modelos IA", value: 5, suffix: "" },
    { label: "APKs compiladas", value: 3201, suffix: "+" },
    { label: "% gratis", value: 100, suffix: "%" },
  ];

  const features = [
    { icon: "🤖", title: "5 Modelos IA", desc: "Gemini, GPT-4, Claude, Mistral y Groq generando apps reales", delay: 0.4 },
    { icon: "📱", title: "Flutter Nativo", desc: "Código Dart real, no templates. APK instalable en minutos", delay: 0.5 },
    { icon: "💰", title: "AdMob integrado", desc: "Cada app que generas lleva tus anuncios. Ingresos pasivos reales", delay: 0.6 },
    { icon: "☁️", title: "Compila en la nube", desc: "Sin instalar nada. Tu APK lista en ~3 minutos con GitHub Actions", delay: 0.7 },
    { icon: "🔒", title: "Tus apps, tus datos", desc: "Dashboard personal, historial, descarga directa del código", delay: 0.8 },
    { icon: "⚡", title: "Sin límites", desc: "Acceso libre durante el beta. Sin tarjeta, sin suscripción", delay: 0.9 },
  ];

  if (user) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden">
        <GridBackground />
        <Particles />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-6 p-8"
        >
          <motion.div className="text-7xl mb-4" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            ⚡
          </motion.div>
          <h1 className="text-4xl font-black">Bienvenido de nuevo</h1>
          <p className="text-white/60 text-lg">{user.email}</p>
          <div className="flex flex-col gap-3 w-72 mx-auto">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/dashboard")}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-900/40"
            >
              Dashboard
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/builder")}
              className="w-full py-4 rounded-2xl font-bold text-lg border border-white/20 hover:border-red-500/50 hover:bg-white/5 transition-all"
            >
              🚀 Crear App
            </motion.button>
            <button onClick={signOut} className="text-white/30 text-sm hover:text-white/60 transition-colors mt-2">
              Cerrar sesión
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      <GridBackground />
      <Particles />

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-black text-xl tracking-tight">NexusAI</span>
          <span className="text-xs text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 ml-1">BETA</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-white/50 text-sm">
          <span className="hover:text-white cursor-pointer transition-colors">Características</span>
          <span className="hover:text-white cursor-pointer transition-colors">Precios</span>
          <span className="hover:text-white cursor-pointer transition-colors">Docs</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => document.getElementById("login-form")?.scrollIntoView({ behavior: "smooth" })}
          className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
        >
          Entrar →
        </motion.button>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Generador de apps nativas con IA — Flutter real
        </motion.div>

        {/* Título principal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6"
        >
          Crea apps
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #ff1e1e 0%, #ff6b6b 50%, #ff1e1e 100%)" }}
          >
            con IA real
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-white/50 max-w-2xl mx-auto mb-4 leading-relaxed"
        >
          Describe tu idea.{" "}
          <TypewriterText texts={[
            "NexusAI genera el código Flutter.",
            "Compilamos la APK en 3 minutos.",
            "AdMob monetiza cada instalación.",
            "Todo gratis. Sin límites.",
          ]} />
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 my-12"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-white">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── LOGIN FORM ── */}
        <motion.div
          id="login-form"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-sm mx-auto"
        >
          <div
            className="p-8 rounded-3xl border border-white/10"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(30px)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <h2 className="text-xl font-black mb-6 text-center">Empieza gratis</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  autoComplete="email"
                  className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/30 outline-none transition-all text-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${focused === "email" ? "rgba(255,30,30,0.6)" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: focused === "email" ? "0 0 20px rgba(255,30,30,0.15)" : "none",
                  }}
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Contraseña (opcional)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/30 outline-none transition-all text-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${focused === "pass" ? "rgba(255,30,30,0.6)" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: focused === "pass" ? "0 0 20px rgba(255,30,30,0.15)" : "none",
                  }}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-red-400 text-xs text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-black text-base relative overflow-hidden transition-all"
                style={{
                  background: "linear-gradient(135deg, #dc2020 0%, #ff4444 100%)",
                  boxShadow: "0 8px 30px rgba(220,32,32,0.4)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  "Entrar gratis →"
                )}
              </motion.button>
            </form>
            <p className="text-center text-white/25 text-xs mt-4">
              Sin registro real — cualquier email vale
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-black text-center mb-12"
        >
          Todo lo que necesitas para{" "}
          <span className="text-red-400">monetizar</span>
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-black text-center mb-16"
        >
          Tres pasos. Una APK.
        </motion.h2>
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          {[
            { n: "01", title: "Describe tu app", desc: "Escribe en español lo que quieres. NexusAI entiende tu idea." },
            { n: "02", title: "IA genera Flutter", desc: "Código Dart real, con AdMob integrado y diseño Material 3." },
            { n: "03", title: "Descarga tu APK", desc: "GitHub Actions compila en la nube. APK lista en ~3 minutos." },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex-1 p-6 rounded-2xl border border-white/8 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="text-6xl font-black text-white/5 absolute top-2 right-4 leading-none select-none">
                {s.n}
              </div>
              <div
                className="text-xs font-bold text-red-400 border border-red-500/30 rounded-full px-3 py-1 inline-block mb-4"
                style={{ background: "rgba(220,32,32,0.1)" }}
              >
                Paso {s.n}
              </div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById("login-form")?.scrollIntoView({ behavior: "smooth" })}
            className="px-10 py-5 rounded-2xl font-black text-xl"
            style={{
              background: "linear-gradient(135deg, #dc2020, #ff4444)",
              boxShadow: "0 20px 60px rgba(220,32,32,0.35)",
            }}
          >
            Crear mi primera app →
          </motion.button>
          <p className="text-white/30 text-sm mt-4">Gratis. Sin tarjeta. Sin registro.</p>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 py-10 text-center text-white/20 text-sm">
        <p>⚡ NexusAI Studio · <span className="text-red-500/60">r3dm/joan</span> · 2024</p>
        <p className="mt-1 text-xs">Powered by Flutter · GitHub Actions · AdMob · Supabase</p>
      </footer>
    </div>
  );
}
