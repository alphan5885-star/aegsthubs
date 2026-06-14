import { useEffect, useState } from "react";

// Server-safe AuthContext shim.
// TanStack Start import-protection prevents importing *.client.* modules in server code.
// For server rendering, we return an unauthenticated/loading state.

export type Role = "admin" | "vendor" | "buyer" | null;

export interface User {
  id: string;
  identifier: string;
  role: string;
  email?: string;
  balance_ltc?: number;
  balance_btc?: number;
}

export function useAuth(): {
  user: User | null;
  role: Role;
  loading: boolean;
  mfaChallenge: { factorId: string; challengeId: string } | null;
  login: (identifier: string, accessCode: string) => Promise<string | null>;
  signup: (
    identifier: string,
    accessCode: string,
    displayName: string,
    selectedRole: "vendor" | "buyer",
    withdrawPin?: string,
    pgpKey?: string,
  ) => Promise<string | null>;
  verifyMfa: (code: string) => Promise<string | null>;
  logout: () => Promise<void>;
} {
  const [state] = useState(() => {
    return {
      user: null as User | null,
      role: null as Role,
      loading: true,
      mfaChallenge: null as { factorId: string; challengeId: string } | null,
      login: async () => "Login not available in server context" as any,
      signup: async () => "Signup not available in server context" as any,
      verifyMfa: async () => null,
      logout: async () => {},
    };
  });

  useEffect(() => {
    // Avoid hydration flicker.
    (state as any).loading = false;
  }, [state]);

  return state as any;
}
