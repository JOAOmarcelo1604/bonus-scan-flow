import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import axios from "axios";

/* ── Types ── */

interface AuthUser {
  userCode: string;
  companyCode: number;
}

interface AuthContextData {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/* ── Auth API ── */

const AUTH_URL = "/auth";
const TOKEN_KEY = "@expedicao:token";

/** Extrai payload do JWT (sem verificar assinatura – verificação acontece no backend). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function extractUser(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    userCode: String(payload.sub ?? ""),
    companyCode: Number(payload.companyCode ?? 0),
  };
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false; // sem exp → assume válido
  return payload.exp * 1000 < Date.now();
}

/**
 * Restaura JWT do localStorage de forma síncrona no primeiro render.
 * Evita logout "falso" no Vite/React Fast Refresh: antes, token iniciava null e em alguns casos
 * isLoading já era false antes do useEffect rodar, acionando PrivateRoute → /login.
 */
function readStoredSession(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return { token: null, user: null };
    if (isTokenExpired(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      return { token: null, user: null };
    }
    return { token: stored, user: extractUser(stored) };
  } catch {
    return { token: null, user: null };
  }
}

/* ── Provider ── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user }, setSession] = useState(readStoredSession);
  /** Sempre false no cliente após init síncrono; mantido para compatibilidade com PrivateRoute. */
  const [isLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    const res = await axios.post(AUTH_URL, { username, password });

    /* O microserviço pode retornar { token }, { access_token }, ou string direto */
    const jwt: string =
      typeof res.data === "string"
        ? res.data
        : res.data.token ?? res.data.access_token ?? res.data.accessToken ?? "";

    if (!jwt) throw new Error("Token não retornado pelo servidor de autenticação.");

    localStorage.setItem(TOKEN_KEY, jwt);
    setSession({ token: jwt, user: extractUser(jwt) });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setSession({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
