// Auth standalone — funciona sin backend, todo en localStorage
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

const ADMIN_EMAIL = "joanlazaro83@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nexusai_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const signIn = async (email: string, _password: string) => {
    const u: User = {
      id: btoa(email),
      email,
      name: email.split("@")[0],
      role: email === ADMIN_EMAIL ? "admin" : "user",
      credits: 100,
      balance: 0,
    };
    setUser(u);
    localStorage.setItem("nexusai_user", JSON.stringify(u));
    return true;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("nexusai_user");
  };

  const refreshUser = async () => {};

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
