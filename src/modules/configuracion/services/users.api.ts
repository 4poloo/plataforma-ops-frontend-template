import { API_ROOT } from "../../produccion/services/work-orders.api";
import { DEMO_MODE, loadDemoData, updateDemoData } from "../../../global/demo/config";

export type UserStatus = "active" | "inactive" | string;
export type UserRole = string;

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  alias: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ListUsersResponse = {
  items: Usuario[];
  total: number;
  skip: number;
  limit: number;
};

export type ListUsersParams = {
  q?: string | null;
  role?: string | null;
  status?: string | null;
  skip?: number;
  limit?: number;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  nombre: string;
  alias: string;
  apellido: string;
  role: string;
};

export type UpdateUserPayload = {
  nombre: string;
  apellido: string;
  alias: string;
  role: string;
  status: UserStatus;
};

export type ChangePasswordPayload = {
  passwordActual: string;
  passwordNueva: string;
};

const USERS_URL = `${API_ROOT}/v1/users`;

const adaptUser = (raw: unknown): Usuario => {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  return {
    id: String(doc.id ?? doc._id ?? ""),
    email: String(doc.email ?? ""),
    nombre: String(doc.nombre ?? ""),
    apellido: String(doc.apellido ?? ""),
    alias: String(doc.alias ?? ""),
    role: String(doc.role ?? ""),
    status: String(doc.status ?? ""),
    createdAt: doc.createdAt ? String(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : undefined,
  };
};

const parseJson = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(text);
  }
};

const readErrorMessage = async (
  res: Response,
  fallback: string
): Promise<string> => {
  const raw = await res.text().catch(() => "");
  if (!raw) return fallback;

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const messageCandidate =
      data.message ??
      data.error ??
      data.msg ??
      data.detail ??
      data.description ??
      raw;
    if (typeof messageCandidate === "string" && messageCandidate.trim().length > 0) {
      return messageCandidate;
    }
  } catch {
    /* noop */
  }
  return raw || fallback;
};

const normalizeUserErrorMessage = (message: string): string => {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const aliasConflict =
    lower.includes("alias") &&
    (lower.includes("exist") ||
      lower.includes("ya existe") ||
      lower.includes("duplic") ||
      lower.includes("duplicate"));
  if (aliasConflict) {
    return "El alias ya existe. Elige uno diferente.";
  }

  const emailConflict =
    (lower.includes("email") || lower.includes("correo")) &&
    (lower.includes("exist") ||
      lower.includes("ya existe") ||
      lower.includes("duplic") ||
      lower.includes("duplicate"));
  if (emailConflict) {
    return "El correo ya está registrado.";
  }

  return trimmed || "Se produjo un error inesperado.";
};

const readDemoUsers = (): Usuario[] => loadDemoData().usuarios;
const writeDemoUsers = (items: Usuario[]) => {
  updateDemoData((draft) => {
    draft.usuarios = items;
  });
};

export async function listUsers(params?: ListUsersParams): Promise<ListUsersResponse> {
  if (DEMO_MODE) {
    const all = readDemoUsers();
    const q = (params?.q ?? "").trim().toLowerCase();
    const role = params?.role?.toLowerCase();
    const status = params?.status?.toLowerCase();
    const filtered = all.filter((u) => {
      const matchesQ =
        !q ||
        [u.email, u.nombre, u.apellido, u.alias]
          .map((v) => (v ?? "").toLowerCase())
          .some((v) => v.includes(q));
      const matchesRole = role ? u.role.toLowerCase() === role : true;
      const matchesStatus = status ? u.status.toLowerCase() === status : true;
      return matchesQ && matchesRole && matchesStatus;
    });
    const skip = Math.max(0, params?.skip ?? 0);
    const limit = Math.max(1, params?.limit ?? filtered.length);
    const items = filtered.slice(skip, skip + limit);
    return { items, total: filtered.length, skip, limit };
  }
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.role) qs.set("role", params.role);
  if (params?.status) qs.set("status", params.status);
  if (typeof params?.skip === "number") qs.set("skip", String(Math.max(0, params.skip)));
  if (typeof params?.limit === "number" && params.limit > 0) {
    qs.set("limit", String(params.limit));
  }

  const url = `${USERS_URL}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al listar usuarios`);
    throw new Error(message);
  }

  const data = await parseJson<Record<string, unknown>>(res);
  const items = Array.isArray(data.items) ? data.items.map(adaptUser) : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    skip: typeof data.skip === "number" ? data.skip : params?.skip ?? 0,
    limit: typeof data.limit === "number" ? data.limit : params?.limit ?? items.length,
  };
}

export async function getUserById(userId: string): Promise<Usuario | null> {
  const id = String(userId ?? "").trim();
  if (!id) return null;
  if (DEMO_MODE) {
    return readDemoUsers().find((u) => u.id === id) ?? null;
  }

  const res = await fetch(`${USERS_URL}/${encodeURIComponent(id)}`, { method: "GET" });
  if (res.status === 404) return null;

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al obtener usuario`);
    throw new Error(message);
  }

  const data = await parseJson<unknown>(res);
  return adaptUser(data);
}

export async function getUserByAlias(alias: string): Promise<Usuario | null> {
  const normalized = String(alias ?? "").trim();
  if (!normalized) return null;
  if (DEMO_MODE) {
    const target = normalized.toLowerCase();
    return (
      readDemoUsers().find((u) => u.alias.toLowerCase() === target) ??
      null
    );
  }

  const res = await fetch(`${USERS_URL}/by-alias/${encodeURIComponent(normalized)}`, {
    method: "GET",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Error ${res.status} al obtener usuario por alias`
    );
    throw new Error(message);
  }

  const data = await parseJson<unknown>(res);
  return adaptUser(data);
}

export async function getUserByEmail(email: string): Promise<Usuario | null> {
  const normalized = String(email ?? "").trim();
  if (!normalized) return null;
  if (DEMO_MODE) {
    const target = normalized.toLowerCase();
    return (
      readDemoUsers().find((u) => u.email.toLowerCase() === target) ?? null
    );
  }

  const res = await fetch(`${USERS_URL}/by-email/${encodeURIComponent(normalized)}`, {
    method: "GET",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Error ${res.status} al obtener usuario por email`
    );
    throw new Error(message);
  }

  const data = await parseJson<unknown>(res);
  return adaptUser(data);
}

export async function createUser(payload: CreateUserPayload): Promise<Usuario> {
  if (DEMO_MODE) {
    const nuevo: Usuario = {
      id: `u-${Date.now()}`,
      email: payload.email,
      nombre: payload.nombre,
      apellido: payload.apellido,
      alias: payload.alias,
      role: payload.role,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    writeDemoUsers([...readDemoUsers(), nuevo]);
    return nuevo;
  }
  const res = await fetch(USERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al crear usuario`);
    throw new Error(normalizeUserErrorMessage(message));
  }

  const data = await parseJson<unknown>(res);
  return adaptUser(data);
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<Usuario> {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("ID de usuario requerido");
  if (DEMO_MODE) {
    const next = readDemoUsers().map((u) =>
      u.id === id ? { ...u, ...payload } : u
    );
    writeDemoUsers(next);
    const updated = next.find((u) => u.id === id);
    return updated ?? { id, ...payload, email: "", alias: "", nombre: "", apellido: "" };
  }

  const res = await fetch(`${USERS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al actualizar usuario`);
    throw new Error(normalizeUserErrorMessage(message));
  }

  const data = await parseJson<unknown>(res);
  return adaptUser(data);
}

export async function changeUserPassword(
  userId: string,
  payload: ChangePasswordPayload
): Promise<void> {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("ID de usuario requerido");
  if (DEMO_MODE) {
    return;
  }

  const res = await fetch(`${USERS_URL}/${encodeURIComponent(id)}/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al cambiar contraseña`);
    throw new Error(message);
  }
}
