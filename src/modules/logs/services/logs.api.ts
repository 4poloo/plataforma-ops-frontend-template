import { API_ROOT } from "../../produccion/services/work-orders.api";
import { DEMO_MODE } from "../../../global/demo/config";
import { MOCK_LOGS } from "../../configuracion/mock/logs";

export type LogSeverity = "INFO" | "WARN" | "ERROR";

export type LogEntry = {
  id: string;
  loggedAt: string;
  severity: LogSeverity;
  accion: string;
  actor: string;
  entity?: string;
  event?: string;
  userAlias?: string;
  payload?: unknown;
  raw?: Record<string, unknown>;
};

export type ListLogsParams = {
  q?: string | null;
  severity?: LogSeverity | null;
  from?: string | null;
  to?: string | null;
  skip?: number;
  limit?: number;
};

export type ListLogsResponse = {
  items: LogEntry[];
  total: number;
  skip: number;
  limit: number;
};

export type CreateLogInput = {
  entity: string;
  event: string;
  payload?: unknown;
  actor?: string | null;
  userAlias?: string | null;
  severity?: LogSeverity;
  loggedAt?: string;
};

const LOGS_URL = `${API_ROOT}/v1/logs`;
const DEMO_LOGS_KEY = "sc.demo.logs";

const WARN_EVENTS = new Set(["disable", "delete", "remove", "deactivate"]);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toISOorEmpty = (value: unknown): string => {
  if (!value) return "";
  try {
    const iso = new Date(value as string).toISOString();
    return Number.isNaN(+new Date(iso)) ? "" : iso;
  } catch {
    return "";
  }
};

const normalizeSeverity = (value: unknown): LogSeverity => {
  const normalized = String(value ?? "").toUpperCase();
  return normalized === "WARN" || normalized === "ERROR" ? (normalized as LogSeverity) : "INFO";
};

export const normalizeAlias = (value?: string | null): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const normalizeSegment = (value: string): string => {
  const normalized = normalizeAlias(value);
  const sanitized = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized || "unknown";
};

export const buildAccion = (actor: string, entity: string, event: string): string => {
  const actorSeg = normalizeSegment(actor);
  const entitySeg = normalizeSegment(entity);
  const eventSeg = normalizeSegment(event);
  return `${actorSeg}.${entitySeg}.${eventSeg}`;
};

export const inferSeverity = (event: string, requested?: LogSeverity): LogSeverity => {
  if (requested) return requested;
  const normalized = String(event ?? "").toLowerCase();
  return WARN_EVENTS.has(normalized) ? "WARN" : "INFO";
};

const sanitizeEmail = (value: string) =>
  value.replace(/@surchile\.cl/gi, "@demo.cl");

const sanitizePayload = (value: unknown) => {
  if (typeof value === "string") {
    return value.replace(/surchile/gi, "demo");
  }
  return value;
};

const adaptDemoLog = (raw: {
  id: string;
  timestamp: string;
  actor: string;
  accion: string;
  severidad: string;
  detalle?: string;
}): LogEntry => ({
  id: raw.id,
  loggedAt: raw.timestamp,
  severity: normalizeSeverity(raw.severidad),
  accion: raw.accion,
  actor: sanitizeEmail(raw.actor),
  entity: raw.accion.split(".")[0],
  event: raw.accion.split(".")[1],
  payload: sanitizePayload(raw.detalle),
});

const readDemoLogs = (): LogEntry[] => {
  if (typeof localStorage === "undefined") return MOCK_LOGS.map(adaptDemoLog);
  try {
    const raw = localStorage.getItem(DEMO_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_LOGS_KEY, JSON.stringify(MOCK_LOGS));
      return MOCK_LOGS.map(adaptDemoLog);
    }
    const parsed = JSON.parse(raw) as typeof MOCK_LOGS;
    const sanitized = Array.isArray(parsed) ? parsed.map(adaptDemoLog) : MOCK_LOGS.map(adaptDemoLog);
    // Regrabar si hubo correcciones de dominio
    writeDemoLogs(sanitized);
    return sanitized;
  } catch {
    return MOCK_LOGS.map(adaptDemoLog);
  }
};

const writeDemoLogs = (items: LogEntry[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    const stored = items.map((item) => ({
      id: item.id,
      timestamp: item.loggedAt,
      actor: sanitizeEmail(item.actor),
      accion: item.accion,
      severidad: item.severity,
      detalle: sanitizePayload(item.payload),
    }));
    localStorage.setItem(DEMO_LOGS_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
};

const adaptLogEntry = (raw: unknown): LogEntry => {
  const doc = asRecord(raw);
  const actor = String(doc.actor ?? doc.usuario ?? "");
  const accion = String(doc.accion ?? "");
  const payload = doc.payload ?? doc.detalle ?? undefined;
  const entity =
    typeof doc.entity === "string"
      ? doc.entity
      : accion.split(".")[1]?.split("_")[0] ?? undefined;
  const event =
    typeof doc.event === "string"
      ? doc.event
      : accion.split(".")[1]?.split("_")[1] ?? undefined;

  return {
    id: String(doc.id ?? doc._id ?? ""),
    loggedAt: toISOorEmpty(doc.loggedAt) || toISOorEmpty(doc.timestamp) || "",
    severity: normalizeSeverity(doc.severity),
    accion,
    actor,
    entity,
    event,
    userAlias: typeof doc.userAlias === "string" ? doc.userAlias : undefined,
    payload,
    raw: doc,
  };
};

const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const candidate =
      data.message ??
      data.error ??
      data.detail ??
      data.description ??
      data.msg ??
      data.reason ??
      data.cause ??
      fallback;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  } catch {
    /* ignore */
  }
  return text || fallback;
};

export async function listLogs(params?: ListLogsParams): Promise<ListLogsResponse> {
  if (DEMO_MODE) {
    const all = readDemoLogs();
    const q = (params?.q ?? "").trim().toLowerCase();
    const sev = params?.severity?.toUpperCase() as LogSeverity | undefined;
    const from = params?.from ? new Date(params.from).getTime() : undefined;
    const to = params?.to ? new Date(params.to).getTime() : undefined;
    const filtered = all.filter((log) => {
      const matchesQ =
        !q ||
        [log.actor, log.accion, log.event, log.entity]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .some((v) => v.includes(q));
      const matchesSev = sev ? log.severity === sev : true;
      const time = new Date(log.loggedAt).getTime();
      const matchesFrom = from ? time >= from : true;
      const matchesTo = to ? time <= to : true;
      return matchesQ && matchesSev && matchesFrom && matchesTo;
    });
    const skip = Math.max(0, params?.skip ?? 0);
    const limit = Math.max(1, params?.limit ?? (filtered.length || 1));
    const items = filtered.slice(skip, skip + limit);
    return { items, total: filtered.length, skip, limit };
  }
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (typeof params?.skip === "number" && params.skip > 0) {
    qs.set("skip", String(params.skip));
  }
  if (typeof params?.limit === "number" && params.limit > 0) {
    qs.set("limit", String(params.limit));
  }

  const url = `${LOGS_URL}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al listar logs`);
    throw new Error(message);
  }

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const items = itemsRaw.map(adaptLogEntry);
  const skip = typeof data.skip === "number" ? data.skip : params?.skip ?? 0;
  const limit =
    typeof data.limit === "number" && data.limit > 0
      ? data.limit
      : params?.limit ?? items.length;
  const total =
    typeof data.total === "number" && data.total >= 0
      ? data.total
      : items.length + skip;

  return { items, total, skip, limit };
}

export async function createLog(input: CreateLogInput): Promise<void> {
  if (!input?.entity) throw new Error("Entidad requerida para crear un log");
  if (!input?.event) throw new Error("Evento requerido para crear un log");

  const actor = sanitizeEmail(String(input.actor ?? "").trim() || "sistema");
  const aliasSource = input.userAlias ?? actor;
  const userAlias = normalizeAlias(sanitizeEmail(aliasSource));
  const severity = inferSeverity(input.event, input.severity);
  const loggedAt = input.loggedAt ?? new Date().toISOString();
  const accion = buildAccion(actor, input.entity, input.event);

  const body: Record<string, unknown> = {
    actor,
    usuario: actor,
    entity: input.entity,
    event: input.event,
    userAlias,
    payload: input.payload ?? {},
    severity,
    loggedAt,
    accion,
  };

  if (DEMO_MODE) {
    const current = readDemoLogs();
    const nuevo: LogEntry = {
      id: `log-${Date.now()}`,
      loggedAt,
      severity,
      accion,
      actor,
      entity: input.entity,
      event: input.event,
      userAlias,
      payload: input.payload,
      raw: body,
    };
    writeDemoLogs([nuevo, ...current]);
    return;
  }

  const res = await fetch(LOGS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, `Error ${res.status} al registrar log`);
    throw new Error(message);
  }
}
