import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getMe, type AuthUser, type Rol } from "./api";

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
}

// Without a provider (tests, first paint) user is null, so only a known viewer is blocked from writing.
// The server still answers 403 to a viewer's writes; this only hides the controls.
export const AuthContext = createContext<AuthState>({ user: null, loading: false, setUser: () => {} });

export function useAuth() {
  const auth = useContext(AuthContext);
  return { ...auth, canWrite: auth.user?.rol !== "viewer" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser }}>{children}</AuthContext.Provider>;
}

export function RequireRole({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!roles.includes(user.rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
