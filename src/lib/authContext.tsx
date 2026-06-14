import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { loginFn, signupFn, getUserRoleFn } from "@/lib/authFns";

export interface User {
  id: string;
  identifier?: string;
  email?: string;
  [key: string]: any;
}
type Role = "admin" | "vendor" | "buyer" | null;

const toAuthEmail = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  const username = normalized
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${username || "user"}@local.aeigsthub`;
};

interface AuthState {
  user: User | null;
  role: Role;
  loading: boolean;
  mfaChallenge: { factorId: string; challengeId: string } | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role: "vendor" | "buyer",
    withdrawPin?: string,
    pgpKey?: string,
  ) => Promise<string | null>;
  verifyMfa: (code: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);

  useEffect(() => {
    // Try to load session from localStorage
    const savedSession = localStorage.getItem("auth_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.user) {
          setUser(parsed.user);
          setRole(parsed.user.role as Role);
        }
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    const normalized = toAuthEmail(email);
    try {
      const res = await loginFn({
        data: { identifier: normalized, accessCode: password },
      });
      if (res && res.success && res.user) {
        setUser(res.user);
        setRole(res.user.role as Role);
        localStorage.setItem("auth_session", JSON.stringify(res));
        return null;
      }
      return "Giriş başarısız.";
    } catch (e: any) {
      console.error("Login error:", e);
      return e?.message || (typeof e === 'string' ? e : "Giriş sırasında hata oluştu.");
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    selectedRole: "vendor" | "buyer",
    withdrawPin?: string,
    pgpKey?: string,
  ): Promise<string | null> => {
    const normalized = toAuthEmail(email);
    try {
      const res = await signupFn({
        data: {
          identifier: normalized,
          accessCode: password,
          role: selectedRole,
        },
      });
      if (res && res.success && res.user) {
        setUser(res.user);
        setRole(res.user.role as Role);
        localStorage.setItem("auth_session", JSON.stringify(res));
        return null;
      }
      return "Kayıt başarısız.";
    } catch (e: any) {
      console.error("Signup error:", e);
      return e?.message || (typeof e === 'string' ? e : "Kayıt sırasında hata oluştu.");
    }
  };

  const verifyMfa = async (code: string): Promise<string | null> => {
    // MFA mock implementation
    setMfaChallenge(null);
    return null;
  };

  const logout = async () => {
    localStorage.removeItem("auth_session");
    setUser(null);
    setRole(null);
    setMfaChallenge(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        mfaChallenge,
        login,
        signup,
        verifyMfa,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
