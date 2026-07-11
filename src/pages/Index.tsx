import { motion } from "motion/react";
import { Bot, BrainCircuit, Zap, TrendingUp, Code2, DollarSign, Shield, Rocket, ChevronRight, Star, Check, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton } from "@/components/ui/signin";
import { Authenticated, Unauthenticated, useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Bot,
    title: "Superagentes IA",
    desc: "Crea agentes con personalidad, instrucciones y modelo propio. Automatiza tareas complejas 24/7.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Code2,
    title: "Generador de Apps",
    desc: "Describe tu app en lenguaje natural y la IA genera el código completo listo para publicar.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: TrendingUp,
    title: "Reinversión Inteligente",
    desc: "El agente financiero analiza tus ingresos y propone estrategias de reinversión para maximizar ROI.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: DollarSign,
    title: "Retiros a PayPal",
    desc: "Solicita retiros directamente a tu cuenta PayPal desde el panel admin con un solo clic.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Shield,
    title: "Seguridad Total",
    desc: "Autenticación avanzada, encriptación de datos y control de acceso por roles.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  {
    icon: Rocket,
    title: "PWA Instalable",
    desc: "Instala la app en tu Android o iOS como una app nativa, sin necesidad de Play Store.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/mes",
    desc: "Para explorar la plataforma",
    credits: "50 créditos/mes",
    color: "border-border",
    badge: null,
    features: [
      "3 agentes IA",
      "50 créditos IA/mes",
      "1 app generada",
      "Chat básico con agentes",
      "Soporte por email",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/mes",
    desc: "Para creadores y emprendedores",
    credits: "2,000 créditos/mes",
    color: "border-violet-500/60",
    badge: "Más popular",
    features: [
      "Agentes IA ilimitados",
      "2,000 créditos IA/mes",
      "Apps ilimitadas",
      "Acceso a GPT-5 y Claude",
      "Panel de ingresos",
      "Retiros a PayPal",
      "Soporte prioritario",
    ],
    cta: "Comenzar Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "€99",
    period: "/mes",
    desc: "Para negocios y agencias",
    credits: "Créditos ilimitados",
    color: "border-cyan-500/40",
    badge: null,
    features: [
      "Todo lo de Pro",
      "Créditos IA ilimitados",
      "Agente de reinversión IA",
      "Dashboard financiero completo",
      "White-label disponible",
      "API access",
      "Soporte dedicado 24/7",
    ],
    cta: "Contactar ventas",
    highlighted: false,
  },
];

const stats = [
  { value: "10M+", label: "Tokens generados" },
  { value: "50K+", label: "Agentes creados" },
  { value: "99.9%", label: "Uptime garantizado" },
  { value: "€2M+", label: "Ingresos generados" },
];

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] pointer-events-none bg-violet-600/15" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[400px] rounded-full blur-[150px] pointer-events-none bg-cyan-600/10" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-primary w-7 h-7" />
            <span className="font-bold text-lg tracking-tight">NexusAI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors cursor-pointer">Funciones</a>
            <a href="#pricing" className="hover:text-foreground transition-colors cursor-pointer">Precios</a>
            <a href="#stats" className="hover:text-foreground transition-colors cursor-pointer">Estadísticas</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user && (
              <span className="text-xs text-muted-foreground mr-2">{user.email}</span>
            )}
            <Authenticated>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="cursor-pointer">
                  Admin
                </Button>
              )}
              <Button size="sm" onClick={() => navigate("/dashboard")} className="cursor-pointer">
                Ir al Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="cursor-pointer text-xs">
                Salir
              </Button>
            </Authenticated>
            <Unauthenticated>
              <SignInButton />
            </Unauthenticated>
          </div>

          <button className="md:hidden cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-4 bg-background/95 backdrop-blur-xl">
            <a href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Funciones</a>
            <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Precios</a>
            <Unauthenticated>
              <SignInButton />
            </Unauthenticated>
            <Authenticated>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => { navigate("/admin"); setMobileOpen(false); }}>
                  Panel Admin
                </Button>
              )}
              <Button size="sm" onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Salir
              </Button>
            </Authenticated>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-6 bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/20 text-sm px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Plataforma IA de próxima generación
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-balance leading-tight"
        >
          Crea{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Superagentes IA
          </span>
          {" "}que generan ingresos
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-balance"
        >
          Construye agentes IA personalizados, genera apps completas con prompts,
          y gestiona tus ingresos con retiros automáticos a PayPal.
          Todo desde una sola plataforma.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Unauthenticated>
            <SignInButton />
          </Unauthenticated>
          <Authenticated>
            <Button size="lg" onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 text-base px-8">
              Ir al Dashboard <ChevronRight className="w-4 h-4" />
            </Button>
          </Authenticated>
          <Button variant="ghost" size="lg" className="cursor-pointer gap-2 text-base border border-border hover:bg-secondary">
            Ver demo <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-16 relative max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-violet-900/20">
            <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-violet-900/40 via-background to-cyan-900/30 flex items-center justify-center">
              <div className="text-center p-8">
                <BrainCircuit className="w-16 h-16 text-violet-400/40 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Panel de Control — NexusAI</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/60 backdrop-blur-md border border-border rounded-xl p-6 max-w-sm w-full mx-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm font-medium">Agente Financiero IA</span>
                  <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Activo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "Detecté €847 en ingresos esta semana. Recomiendo reinvertir 40% en créditos IA para escalar producción de contenido..."
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="stats" className="border-y border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold"
          >
            Todo lo que necesitas para{" "}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              generar ingresos
            </span>
          </motion.h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Desde crear agentes hasta gestionar retiros, NexusAI es la plataforma completa para monetizar con IA.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`h-full border ${f.border} bg-card/50 hover:bg-card transition-colors`}>
                <CardHeader>
                  <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-3`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold"
          >
            Planes simples y transparentes
          </motion.h2>
          <p className="mt-4 text-muted-foreground">
            Comienza gratis, escala cuando estés listo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border ${plan.color} p-6 flex flex-col ${plan.highlighted ? "bg-violet-500/5 shadow-lg shadow-violet-900/20" : "bg-card/30"}`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white border-0 text-xs px-3">
                  <Star className="w-3 h-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}
              <div className="mb-6">
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground mb-1 text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-primary mt-2">{plan.credits}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Unauthenticated>
                <SignInButton />
              </Unauthenticated>
              <Authenticated>
                <Button className="w-full cursor-pointer">
                  {plan.cta}
                </Button>
              </Authenticated>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 NexusAI — Creado por R3DMOON</p>
        </div>
      </footer>
    </div>
  );
}