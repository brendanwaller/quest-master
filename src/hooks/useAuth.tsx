// ============================================================================
// Quest Master - localStorage-backed auth context. No backend.
// ============================================================================
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { store } from "../lib/store";

export interface SessionUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => store.getCurrentUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: false,
      login(email: string, name?: string) {
        const existing = store.getCurrentUser();
        const next: SessionUser = {
          email,
          name: name || existing?.name || email.split("@")[0],
        };
        store.setCurrentUser(next);
        setUser(next);
      },
      logout() {
        store.setCurrentUser(null);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function isSignedIn(): boolean {
  return !!store.getCurrentUser();
}

export function isOnboarded(): boolean {
  return store.hasConsent() && !!store.getAgeTier();
}
