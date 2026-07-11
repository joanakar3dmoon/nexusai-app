import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  email: string;
  name: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
  isAdmin: boolean;
}

const ADMIN_EMAIL = "joanlazaro83@gmail.com";
const ADMIN_PASSWORD = "r3dm/Joan83";
const ADMIN_NAME = "Joan";

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: () => false,
  signOut: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nexusai_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const signIn = (email: string, password: string) => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const u: User = { email, name: ADMIN_NAME, role: "admin" };
      setUser(u);
      localStorage.setItem("nexusai_user", JSON.stringify(u));
      return true;
    }
    // For regular users, any email/password works
    const u: User = { email, name: email.split("@")[0] || "User", role: "user" };
    setUser(u);
    localStorage.setItem("nexusai_user", JSON.stringify(u));
    return true;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("nexusai_user");
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, isAdmin: user?.role === "admin" }}>
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