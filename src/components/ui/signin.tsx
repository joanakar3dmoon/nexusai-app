import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function SignInButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Introduce tu email");
      return;
    }
    const ok = await signIn(email, password);
    if (!ok) {
      setError("Error al iniciar sesión");
      return;
    }
    setOpen(false);
  };

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-4">Iniciar sesión</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm">Entrar</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Sin registro: cualquier email vale
          </p>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={() => setOpen(true)} className="cursor-pointer">
      Iniciar sesión
    </Button>
  );
}