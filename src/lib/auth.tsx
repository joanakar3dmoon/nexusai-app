// ============================================================
// Auth — Login directo con Supabase (sin backend FastAPI)
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase, supabaseAdmin, dbGetUserByEmail, dbUpsertUser, type DBUser } from "./supabase";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  plan: "free" | "premium" | "admin";
  credits: number;
  balance: number;
}

export const FREE_CREDITS = 5;
export const ADMOB_APP_ID = "ca-app-pub-4903263409458961~5751005760";
export const ADMOB_BANNER = "ca-app-pub-4903263409458961/8825147276";
export const ADMIN_EMAIL  = "joanlazaro83@gmail.com";
const ADMIN_PASS          = "r3dm/Joan83";

export function isPremium(user: User | null): boolean {
  return user?.plan === "premium" || user?.role === "admin" || user?.plan === "admin";
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

function mapDBUser(db: DBUser): User {
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    role: db.role,
    plan: db.role === "admin" ? "admin" : db.credits > FREE_CREDITS ? "premium" : "free",
    credits: db.credits,
    balance: db.balance,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Restaurar sesión al cargar
  useEffect(() => {
    const stored = localStorage.getItem("nexusai_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      // ── Admin local sin Supabase ──────────────────────────
      if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASS) {
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

      // ── Usuarios normales — Supabase Auth ─────────────────
      // Intentar login con password primero
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      let userId: string;

      if (authError || !authData.user) {
        // Si no existe en auth, crear cuenta automática (cualquier email vale)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError || !signUpData.user) {
          console.error("signUp error:", signUpError?.message);
          return false;
        }
        userId = signUpData.user.id;
      } else {
        userId = authData.user.id;
      }

      // Buscar o crear perfil en tabla users
      let dbUser = await dbGetUserByEmail(email.trim());
      if (!dbUser) {
        const newUser: DBUser = {
          id: userId,
          email: email.trim(),
          name: email.split("@")[0],
          role: "user",
          credits: FREE_CREDITS,
          balance: 0,
          banned: false,
        };
        dbUser = await dbUpsertUser(newUser);
      }

      if (!dbUser) return false;

      const userData = mapDBUser(dbUser);
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
    supabase.auth.signOut().catch(() => {});
  };

  const refreshUser = async () => {
    if (!user || user.role === "admin") return;
    try {
      const dbUser = await dbGetUserByEmail(user.email);
      if (dbUser) {
        const refreshed = mapDBUser(dbUser);
        setUser(refreshed);
        localStorage.setItem("nexusai_user", JSON.stringify(refreshed));
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, isAdmin: user?.role === "admin", refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

export function Authenticated({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? null : <>{children}</>;
}
