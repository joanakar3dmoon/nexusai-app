import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Introduce tu email"); return; }
    setLoading(true);
    setError("");
    const ok = await signIn(email, password);
    setLoading(false);
    if (ok) {
      navigate("/dashboard");
    } else {
      setError("Error al iniciar sesión. Prueba con cualquier email.");
    }
  };

  if (user) {
    return (
      <div style={styles.container}>
        <div style={styles.logo}>⚡</div>
        <h1 style={styles.title}>NexusAI</h1>
        <p style={styles.subtitle}>Bienvenido, {user.email}</p>
        <button style={styles.btnPrimary} onClick={() => navigate("/dashboard")}>
          Ir al Dashboard
        </button>
        <button style={styles.btnPrimary} onClick={() => navigate("/builder")}>
          Crear App con IA
        </button>
        <button style={{...styles.btnSecondary, marginTop: 8}} onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.logo}>⚡</div>
      <h1 style={styles.title}>NexusAI</h1>
      <p style={styles.subtitle}>Crea apps con IA. Gratis.</p>

      <form onSubmit={handleLogin} style={styles.form}>
        <input
          style={styles.input}
          type="email"
          placeholder="Tu email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña (opcional)"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btnPrimary} type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p style={styles.hint}>Sin registro: cualquier email vale</p>

      <div style={styles.features}>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>🤖</span>
          <span style={styles.featureText}>5 modelos IA</span>
        </div>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>📱</span>
          <span style={styles.featureText}>Genera apps</span>
        </div>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>💰</span>
          <span style={styles.featureText}>Monetiza</span>
        </div>
      </div>

      <p style={styles.footer}>r3dm/joan · NexusAI Studio</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #080b14 0%, #0f172a 100%)",
    padding: "24px 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#fff",
    boxSizing: "border-box",
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    margin: "0 0 8px",
    background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    margin: "0 0 32px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 320,
  },
  input: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#fff",
    fontSize: 16,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btnPrimary: {
    background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
    border: "none",
    borderRadius: 12,
    padding: "14px 0",
    color: "#000",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "12px 0",
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    maxWidth: 320,
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    margin: 0,
    textAlign: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  features: {
    display: "flex",
    gap: 20,
    marginTop: 40,
  },
  feature: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
  footer: {
    marginTop: 40,
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 1,
  },
};
