// src/modules/produccion/services/work-orders.api.ts

export type WorkOrderContenido = {
  SKU: string;
  Cantidad: number;
  Encargado: string;
  linea: string;
  fecha: string;
  fecha_ini: string;
  fecha_fin: string;
  descripcion?: string;
  hora_entrega?: string;
};

export type WorkOrder = {
  OT: number;
  contenido: WorkOrderContenido;
  estado?: WorkOrderStatusCode | string;
};

export type WorkOrderCreateInput = {
  OT: number;
  contenido: WorkOrderContenido;
};

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const RAW_BASE_FALLBACK = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
const MERGED_BASE = (RAW_BASE_URL || RAW_BASE_FALLBACK).trim().replace(/\/+$/, "");

export const API_BASE = MERGED_BASE;

export const API_ROOT =
  API_BASE === "" ? "/api" : API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const WORK_ORDERS_URL = `${API_ROOT}/v1/work-orders`;
const TEMPLATE_URL = `${WORK_ORDERS_URL}/template`;
const INTEGRATION_URL =
  (import.meta.env.VITE_WORK_ORDERS_INTEGRATION_URL as string | undefined)?.trim() ||
  `${WORK_ORDERS_URL}/integration/send`;
const STATUS_ENV = (import.meta.env.VITE_WORK_ORDERS_ENV as string | undefined)?.trim() || "";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
};

function adaptWorkOrder(raw: unknown): WorkOrder {
  const data = asRecord(raw);
  const contenidoRaw = asRecord(data.contenido);
  const estadoRaw =
    data.estado ??
    data.state ??
    data.status ??
    contenidoRaw.estado ??
    contenidoRaw.state ??
    "";

  return {
    OT: toNumber(data.OT ?? data.ot),
    contenido: {
      SKU: toString(contenidoRaw.SKU ?? contenidoRaw.sku),
      Cantidad: toNumber(contenidoRaw.Cantidad ?? contenidoRaw.cantidad),
      Encargado: toString(contenidoRaw.Encargado ?? contenidoRaw.encargado),
      linea: toString(contenidoRaw.linea),
      fecha: toString(contenidoRaw.fecha),
      fecha_ini: toString(contenidoRaw.fecha_ini ?? contenidoRaw.fechaInicio),
      fecha_fin: toString(contenidoRaw.fecha_fin ?? contenidoRaw.fechaFin),
      descripcion: toString(
        contenidoRaw.descripcion ??
          contenidoRaw.Descripcion ??
          data.descripcion ??
          data.Descripcion ??
          ""
      ),
      hora_entrega: toString(contenidoRaw.hora_entrega ?? data.hora_entrega ?? ""),
    },
    estado: toString(estadoRaw),
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

export type ListWorkOrdersOptions = {
  skip?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function listWorkOrders(options: ListWorkOrdersOptions = {}): Promise<WorkOrder[]> {
  const params = new URLSearchParams();
  if (typeof options.skip === "number") params.set("skip", String(options.skip));
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  const url = params.toString() ? `${WORK_ORDERS_URL}?${params.toString()}` : WORK_ORDERS_URL;

  const res = await fetch(url, { method: "GET", signal: options.signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} listando OTs`);
  }
  const data = await parseJson<unknown>(res);
  if (!Array.isArray(data)) return [];
  return data.map(adaptWorkOrder);
}

export async function getWorkOrderByNumber(ot: string | number): Promise<WorkOrder | null> {
  const normalized = String(ot ?? "").trim();
  if (!normalized) return null;

  const directUrl = `${WORK_ORDERS_URL}/${encodeURIComponent(normalized)}`;
  try {
    const res = await fetch(directUrl, { method: "GET" });
    if (res.status === 404) return null;
    if (res.ok) {
      const payload = await parseJson<unknown>(res);
      return adaptWorkOrder(payload);
    }
    if (res.status !== 405) {
      const body = await res.text().catch(() => "");
      throw new Error(body || `Error ${res.status} buscando OT ${normalized}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Failed to fetch")) {
      throw err;
    }
    // Seguimos al fallback
  }

  const list = await listWorkOrders();
  return list.find(item => String(item.OT) === normalized) ?? null;
}

export async function createWorkOrder(
  payload: WorkOrderCreateInput
): Promise<WorkOrder> {
  const res = await fetch(WORK_ORDERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al crear la OT`);
  }

  const dataText = await res.text();
  if (!dataText) return payload;
  try {
    const data = JSON.parse(dataText) as unknown;
    return adaptWorkOrder(data);
  } catch {
    return payload;
  }
}

export async function downloadWorkOrdersTemplate(): Promise<{ blob: Blob; filename?: string }> {
  const res = await fetch(TEMPLATE_URL, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al descargar la plantilla`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
  let filename: string | undefined;
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (match) {
      filename = decodeURIComponent(match[1]);
    }
  }
  return { blob, filename };
}

export type WorkOrderIntegrationEntry = {
  FecIniOrden: string;
  GlosaOrden: string;
  Orden: number | string;
  CodigoProducto: string;
  DescripcionProducto: string;
  CantidadAFabricar: number;
  CodigoMaterial: string;
  DescripcionMaterial: string;
  CantidadMaterial: number;
};

export async function printWorkOrder(ot: string | number): Promise<{ blob: Blob; filename?: string }> {
  const url = `${WORK_ORDERS_URL}/${encodeURIComponent(String(ot))}/print`;
  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al generar impresión de la OT`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
  let filename: string | undefined;
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (match) filename = decodeURIComponent(match[1]);
  }
  return { blob, filename };
}


export type WorkOrderRecipePrintPayload = {
  skuPT: string;
  cantidad: number;
  numeroOT: string;
  encargado: string;
  fecha_ini: string;
};

export async function printWorkOrderRecipe(
  payload: WorkOrderRecipePrintPayload
): Promise<{ blob: Blob; filename?: string }> {
  const qs = new URLSearchParams();
  qs.set("skuPT", payload.skuPT);
  qs.set("cantidad", String(payload.cantidad));
  qs.set("numeroOT", payload.numeroOT);
  qs.set("encargado", payload.encargado);
  qs.set("fecha_ini", payload.fecha_ini);
  const url = `${API_ROOT}/v1/work-orders/recipe/print?${qs.toString()}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al imprimir receta de la OT`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
  let filename: string | undefined;
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (match) filename = decodeURIComponent(match[1]);
  }
  return { blob, filename };
}

export async function fetchNextWorkOrderFromDb(): Promise<number> {
  const url = `${WORK_ORDERS_URL}/next`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} obteniendo el siguiente N° de OT`);
  }
  const data = await parseJson<{ next?: number }>(res);
  const value = Number(data?.next ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function fetchLastWorkOrderNumber(): Promise<number> {
  const url = `${WORK_ORDERS_URL}/last`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Error ${res.status} obteniendo la última OT`);
    }
    const text = await res.text();

    // Si la respuesta es solo un número (texto), úsalo directo.
    const directNumber = Number(text);
    if (Number.isFinite(directNumber) && directNumber > 0) return directNumber;

    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    const extractNumber = (value: unknown): number => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const num = Number(value);
        if (Number.isFinite(num)) return num;
      }
      if (Array.isArray(value) && value.length > 0) {
        return extractNumber(value[0]);
      }
      if (value && typeof value === "object") {
        const rec = value as Record<string, unknown>;
        return (
          extractNumber(rec.last) ||
          extractNumber(rec.numero) ||
          extractNumber(rec.number) ||
          extractNumber(rec.ot) ||
          extractNumber(rec.OT) ||
          extractNumber(rec.id) ||
          extractNumber(rec.body) ||
          0
        );
      }
      return 0;
    };

    const value = extractNumber(data);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Failed to fetch")) {
      throw new Error("No se pudo conectar para obtener la última OT (conexión rechazada).");
    }
    throw err instanceof Error ? err : new Error("No se pudo obtener la última OT.");
  }
}

export async function updateWorkOrderStatus(
  ot: string | number,
  estado: string
): Promise<void> {
  const url = `${WORK_ORDERS_URL}/${encodeURIComponent(String(ot))}/estado`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al actualizar estado de la OT`);
  }
}

export async function sendWorkOrdersIntegration(payload: {
  source: string;
  payload: WorkOrderIntegrationEntry[];
}): Promise<void> {
  const res = await fetch(INTEGRATION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(rawText || `Error ${res.status} enviando integración de OT`);
  }

  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  const record = asRecord(parsed);
  const bodyArray = Array.isArray(record.body)
    ? record.body
    : Array.isArray(parsed)
      ? (parsed as unknown[])
      : null;

  const toStringSafe = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value == null) return "";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const errorMessages: string[] = [];

  if (bodyArray) {
    bodyArray.forEach((entry) => {
      const item = asRecord(entry);
      const status = toStringSafe(item.status).toLowerCase();
      if (status === "error") {
        const message = toStringSafe(item.message);
        errorMessages.push(message || toStringSafe(entry));
      }
    });
  } else {
    const status = toStringSafe(record.status).toLowerCase();
    if (status === "error" || status === "failed") {
      errorMessages.push(toStringSafe(record.message) || rawText);
    }
  }

  if (errorMessages.length > 0) {
    const joined = errorMessages.join(" | ");
    const has212 = /212/.test(joined);
    const friendly = has212
      ? `La OT ya existe en Invas.`
      : `Invas devolvió error al enviar la OT: ${joined}`;
    throw new Error(friendly.trim());
  }
}

export type WorkOrderStatusCode =
  | "CREADA"
  | "ENPROCESO"
  | "EN_PROCESO"
  | "CERRADA"
  | "FINALIZADA"
  | "DESPACHADO"
  | "ERROR"
  | "RECHAZADO"
  | string;

export async function fetchWorkOrderStatus(
  numero: string | number,
  env: string = STATUS_ENV
): Promise<WorkOrderStatusCode> {
  const encoded = encodeURIComponent(String(numero));
  const qs = env ? `?env=${encodeURIComponent(env)}` : "";
  const url = `${WORK_ORDERS_URL}/${encoded}/status${qs}`;

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} consultando estado de la OT`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    if (!text) return "SIN_INFO";
    data = { state_raw: text };
  }

  const record = (data && typeof data === "object") ? (data as Record<string, unknown>) : null;

  const status =
    typeof record?.state_raw === "string"
      ? record.state_raw
      : typeof record?.estado === "string"
        ? record.estado
        : typeof data === "string"
          ? data
          : null;

  const normalized = typeof status === "string" ? status.toUpperCase() : null;

  if (!normalized) {
    return "";
  }

  if (
    normalized === "CREADA" ||
    normalized === "ENPROCESO" ||
    normalized === "EN_PROCESO" ||
    normalized === "CERRADA" ||
    normalized === "FINALIZADA" ||
    normalized === "DESPACHADO" ||
    normalized === "CANCELADA" ||
    normalized === "ERROR" ||
    normalized === "RECHAZADO" ||
    normalized === "RECHAZADA"
  ) {
    return normalized;
  }

  return normalized;
}
