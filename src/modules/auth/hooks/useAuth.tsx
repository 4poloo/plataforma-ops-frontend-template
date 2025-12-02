// src/modules/auth/hooks/useAuth.ts
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../services/auth.api";
import {
  getMe,
  logout as apiLogout,
  persistSession,
  readStoredUser,
} from "../services/auth.api";
import {
  getPermissionsForRole,
  getFeaturePermission,
  hasPermission,
  type FeatureKey,
  type FeaturePermission,
  type PermissionsMap,
} from "../utils/permissions";

type AuthContextValue = {
  user: User | null;
  loadingUser: boolean;
  fetchMe: () => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: { user: User; token?: string | null }) => void;
  permissions: PermissionsMap;
  getFeature: (feature: FeatureKey) => FeaturePermission;
  can: (feature: FeatureKey, type?: "view" | "edit") => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<PermissionsMap>(() =>
    getPermissionsForRole(null)
  );
  const navigate = useNavigate();

  const fetchMe = useCallback(async () => {
    try {
      setLoadingUser(true);
      const u = await getMe();
      setUser(u);
      setPermissions(getPermissionsForRole(u?.role));
    } catch {
      setUser(null);
      setPermissions(getPermissionsForRole(null));
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const setSession = useCallback(
    (session: { user: User; token?: string | null }) => {
      persistSession(session);
      setUser(session.user);
      setPermissions(getPermissionsForRole(session.user?.role));
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // no pasa nada si mock falla
    }
    setUser(null);
    setPermissions(getPermissionsForRole(null));
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const stored = readStoredUser();
    if (stored) {
      setUser(stored);
      setPermissions(getPermissionsForRole(stored.role));
      setLoadingUser(false);
    } else {
      void fetchMe();
    }
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loadingUser,
      fetchMe,
      signOut,
      setSession,
      permissions,
      getFeature: (feature: FeatureKey) =>
        getFeaturePermission(permissions, feature),
      can: (feature: FeatureKey, type: "view" | "edit" = "view") =>
        hasPermission(permissions, feature, type),
    }),
    [user, loadingUser, fetchMe, signOut, setSession, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useFeaturePermissions(feature: FeatureKey): FeaturePermission {
  const { getFeature } = useAuth();
  return getFeature(feature);
}
