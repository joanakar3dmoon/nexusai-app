// ============================================================
// Auth REAL — conecta con backend FastAPI
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "./nexus-api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  credits: number;
  balance: number;
}

export interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => false,
  signOut: () => {},
  isAdmin: false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Restaurar sesión al cargar
  useEffect(() => {
    const stored = localStorage.getItem("nexusai_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Refrescar datos desde backend en 2º plano
        api.getUser(parsed.id).then((u) => {
          if (u) {
            setUser(u);
            localStorage.setItem("nexusai_user", JSON.stringify(u));
          }
        }).catch(() => {});
      } catch {}
    }
  }, []);

  const signIn = async (email: string, _password: string) => {
    try {
      const u = await api.login(email, email.split("@")[0]);
      const userData: User = {
        id: u.id,
        email: u.email,
        role: u.role,
        credits: u.credits,
        balance: u.balance,
        name: u.name || email.split("@")[0],
      };
      setUser(userData);
      localStorage.setItem("nexusai_user", JSON.stringify(userData));
      return true;
    } catch (e) {
      console.error("Error login:", e);
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("nexusai_user");
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const u = await api.getUser(user.id);
      if (u) {
        const refreshed: User = {
          id: u.id,
          email: u.email,
          role: u.role,
          credits: u.credits,
          balance: u.balance,
          name: u.name || user.name,
        };
        setUser(refreshed);
        localStorage.setItem("nexusai_user", JSON.stringify(refreshed));
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        isAdmin: user?.role === "admin",
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function Authenticated({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? null : <>{children}</>;
}