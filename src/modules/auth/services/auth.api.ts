import { API_ROOT } from "../../produccion/services/work-orders.api";

export type User = {
  id: string;
  email: string;
  nombre: string;
  apellido?: string;
  alias: string;
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginRequest = { alias: string; password: string };
export type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user: User;
};

const AUTH_URL = `${API_ROOT}/v1/auth`;
const SESSION_USER_KEY = "sc.auth.user";
const SESSION_TOKEN_KEY = "token";

const parseJson = async (res: Response): Promise<any> => {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const readErrorMessage = async (
  res: Response,
  fallback: string
): Promise<string> => {
  const data = await parseJson(res);
  const candidate =
    data?.message ??
    data?.error ??
    data?.detail ??
    data?.description ??
    data?.msg ??
    data?.reason;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  const text = await res.text().catch(() => "");
  return text || fallback;
};

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const body = {
    alias: String(payload.alias ?? "").trim(),
    password: payload.password,
  };

  const res = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Error ${res.status} al iniciar sesión`
    );
    throw new Error(message);
  }

  const data = (await parseJson(res)) as LoginResponse;
  if (!data?.user) {
    throw new Error("Respuesta inválida del servidor de autenticación");
  }
  if (data.success === false) {
    throw new Error(data.message || "Credenciales inválidas");
  }
  return data;
}

export function persistSession(session: { user: User; token?: string | null }) {
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session.user));
  if (session.token) {
    localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  } else {
    // usamos alias/id como fallback para mantener compatibilidad con PrivateRoute
    localStorage.setItem(SESSION_TOKEN_KEY, session.user.id || session.user.alias);
  }
}

export function clearSessionStorage() {
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (parsed && typeof parsed === "object" && parsed.id) {
      return parsed;
    }
  } catch {
    /* noop */
  }
  return null;
}

export async function getMe(): Promise<User> {
  const stored = readStoredUser();
  if (!stored) {
    throw new Error("Sesión no encontrada");
  }
  return stored;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${AUTH_URL}/logout`, { method: "POST", credentials: "include" });
  } catch {
    // ignoramos cualquier error (sesión local se limpia igual)
  } finally {
    clearSessionStorage();
  }
}
