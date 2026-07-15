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
  plan: "free" | "premium" | "admin";
  credits: number;
  balance: number;
}

// Constantes freemium
export const FREE_CREDITS = 5;
export const ADMOB_APP_ID = "ca-app-pub-4903263409458961~5751005760";
export const ADMOB_BANNER = "ca-app-pub-4903263409458961/8825147276";
export const ADMIN_EMAIL  = "joanlazaro83@gmail.com";

export function isPremium(user: User | null): boolean {
  return user?.plan === "premium" || user?.role === "admin";
}
export function showAds(user: User | null): boolean {
  return !isPremium(user);
}
export function hasCredits(user: User | null): boolean {
  if (!user) return false;
  if (isPremium(user)) return true;
  return user.credits > 0;
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

  const signIn = async (email: string, password: string) => {
    try {
      // Admin local sin backend — acceso directo para el propietario
      const ADMIN_PASS  = "r3dm/Joan83";
      if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        const adminUser: User = {
          id: "admin-joan",
          email: ADMIN_EMAIL,
          name: "Joan R3DMOON",
          role: "admin",
          plan: "admin",
          credits: 999999,
          balance: 0,
        };
        setUser(adminUser);
        localStorage.setItem("nexusai_user", JSON.stringify(adminUser));
        return true;
      }
      // Usuarios normales — backend FastAPI
      const u = await api.login(email, email.split("@")[0]);
      const rawCredits = typeof u.credits === "number" ? u.credits : FREE_CREDITS;
      const userData: User = {
        id: u.id,
        email: u.email,
        role: u.role || "user",
        plan: u.plan || (rawCredits > FREE_CREDITS ? "premium" : "free"),
        credits: rawCredits,
        balance: u.balance || 0,
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
        const rawCredits = typeof u.credits === "number" ? u.credits : user.credits;
        const refreshed: User = {
          id: u.id,
          email: u.email,
          role: u.role || "user",
          plan: u.plan || (rawCredits > FREE_CREDITS ? "premium" : "free"),
          credits: rawCredits,
          balance: u.balance || 0,
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