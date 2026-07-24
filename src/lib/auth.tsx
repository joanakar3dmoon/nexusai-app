// ============================================================
// Auth — Login con Supabase + fallback local para admin
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabaseAdmin, dbGetUserByEmail, dbUpsertUser } from "./supabase";

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
const ADMIN_EMAIL2        = "joanakar3dmoon@gmail.com";
const ADMIN_PASS2         = "615232800Joan&";

export function isPremium(u: User | null) { return u?.plan === "premium" || u?.role === "admin" || u?.plan === "admin"; }
export function showAds(u: User | null) { return !isPremium(u); }
export function hasCredits(u: User | null) { if (!u) return false; if (isPremium(u)) return true; return u.credits > 0; }

export interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, signIn: async () => false, signOut: () => {}, isAdmin: false, refreshUser: async () => {},
});

function makeAdminUser(): User {
  return { id: "admin-joan", email: ADMIN_EMAIL, name: "Joan r3dm", role: "admin", plan: "admin", credits: 99999, balance: 0 };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexusai_user");
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Eres el propietario — acceso directo
        const admin = makeAdminUser();
        setUser(admin);
        localStorage.setItem("nexusai_user", JSON.stringify(admin));
      }
    } catch {}
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    const emailLC = email.trim().toLowerCase();

    // ── ADMIN: acceso hardcoded, sin Supabase ──
    const isAdmin1 = emailLC === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS;
    const isAdmin2 = emailLC === ADMIN_EMAIL2.toLowerCase() && password === ADMIN_PASS2;
    if (isAdmin1 || isAdmin2) {
      const admin = { ...makeAdminUser(), email: emailLC };
      setUser(admin);
      localStorage.setItem("nexusai_user", JSON.stringify(admin));
      return true;
    }

    // ── USUARIOS NORMALES: buscar/crear en tabla users de Supabase ──
    try {
      let dbUser = await dbGetUserByEmail(emailLC);
      if (!dbUser) {
        // Crear usuario nuevo automáticamente
        const newId = crypto.randomUUID();
        dbUser = await dbUpsertUser({
          id: newId,
          email: emailLC,
          name: emailLC.split("@")[0],
          role: "user",
          credits: FREE_CREDITS,
          balance: 0,
          banned: false,
        });
      }
      if (!dbUser) return false;

      const userData: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || emailLC.split("@")[0],
        role: dbUser.role || "user",
        plan: (dbUser as any).plan || "free",
        credits: typeof dbUser.credits === "number" ? dbUser.credits : FREE_CREDITS,
        balance: dbUser.balance || 0,
      };
      setUser(userData);
      localStorage.setItem("nexusai_user", JSON.stringify(userData));
      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("nexusai_user");
  };

  const refreshUser = async () => {
    if (!user || user.role === "admin") return;
    try {
      const dbUser = await dbGetUserByEmail(user.email);
      if (dbUser) {
        const refreshed: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || user.name,
          role: dbUser.role || "user",
          plan: (dbUser as any).plan || "free",
          credits: typeof dbUser.credits === "number" ? dbUser.credits : user.credits,
          balance: dbUser.balance || 0,
        };
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
