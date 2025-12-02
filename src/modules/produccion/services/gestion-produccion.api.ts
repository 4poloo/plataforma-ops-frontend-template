// src/modules/produccion/services/gestion-produccion.api.ts
import { API_ROOT } from "./work-orders.api";

const GESTION_PRODUCCION_URL = `${API_ROOT}/v1/gestion-produccion`;

export type GestionProduccionContenido = {
  SKU: string;
  Encargado: string;
  linea: string;
  fecha: string;
  fecha_ini: string;
  fecha_fin: string;
  hora_entrega?: string;
  cantidad_hora_extra: number;
  cantidad_hora_normal: number;
  descripcion?: string;
};

export type GestionProduccionRecord = {
  _id: string;
  OT: number;
  contenido: GestionProduccionContenido;
  estado: string;
  merma: number;
  cantidad_fin: number;
  audit?: {
    createdAt?: string;
    updatedAt?: string;
  };
};

export type GestionProduccionCreatePayload = {
  OT: number;
  contenido: GestionProduccionContenido;
  estado: string;
  merma: number;
  cantidad_fin: number;
};

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

const adaptRecord = (raw: unknown): GestionProduccionRecord => {
  const data = asRecord(raw);
  const contenidoRaw = asRecord(data.contenido);

  return {
    _id: toString(data._id || data.id || `${Date.now()}-${Math.random()}`),
    OT: toNumber(data.OT ?? data.ot ?? data.numero_ot),
    contenido: {
      SKU: toString(contenidoRaw.SKU ?? contenidoRaw.sku ?? data.SKU ?? data.sku),
      Encargado: toString(contenidoRaw.Encargado ?? contenidoRaw.encargado ?? data.Encargado),
      linea: toString(contenidoRaw.linea ?? data.linea),
      fecha: toString(contenidoRaw.fecha ?? data.fecha),
      fecha_ini: toString(contenidoRaw.fecha_ini ?? contenidoRaw.fechaIni ?? data.fecha_ini ?? data.fechaIni),
      fecha_fin: toString(contenidoRaw.fecha_fin ?? contenidoRaw.fechaFin ?? data.fecha_fin ?? data.fechaFin),
      hora_entrega: toString(contenidoRaw.hora_entrega ?? data.hora_entrega ?? ""),
      cantidad_hora_extra: toNumber(contenidoRaw.cantidad_hora_extra ?? data.cantidad_hora_extra),
      cantidad_hora_normal: toNumber(contenidoRaw.cantidad_hora_normal ?? data.cantidad_hora_normal),
      descripcion: toString(contenidoRaw.descripcion ?? contenidoRaw.Descripcion ?? data.descripcion ?? data.Descripcion),
    },
    estado: toString(data.estado ?? data.status ?? ""),
    merma: toNumber(data.merma),
    cantidad_fin: toNumber(data.cantidad_fin ?? data.cantidadFin),
    audit: data.audit && typeof data.audit === "object" ? (data.audit as GestionProduccionRecord["audit"]) : undefined,
  };
};

export async function listGestionProduccion(): Promise<GestionProduccionRecord[]> {
  const res = await fetch(GESTION_PRODUCCION_URL, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al listar gestión de producción`);
  }
  const payload = await res.json().catch(() => []);
  if (!Array.isArray(payload)) return [];
  return payload.map(adaptRecord);
}

export async function createGestionProduccion(
  payload: GestionProduccionCreatePayload
): Promise<void> {
  const res = await fetch(GESTION_PRODUCCION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Error ${res.status} al crear registro en gestión de producción`
    );
  }
}

export async function getGestionProduccionByOt(
  ot: string | number
): Promise<GestionProduccionRecord | null> {
  const normalized = String(ot ?? "").trim();
  if (!normalized) return null;

  const fetchFromList = async () => {
    const all = await listGestionProduccion();
    const target = Number(normalized);
    return all.find((item) => item.OT === target) ?? null;
  };

  try {
    const url = `${GESTION_PRODUCCION_URL}/${encodeURIComponent(normalized)}`;
    const res = await fetch(url, { method: "GET" });
    if (res.status === 404) return null;
    if (res.status === 405) {
      return await fetchFromList();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        text || `Error ${res.status} al obtener gestión de producción para la OT ${normalized}`
      );
    }
    const payload = await res.json().catch(() => null);
    if (!payload) return null;
    return adaptRecord(payload);
  } catch (error) {
    // Si la API directa falla, intentamos por listado completo
    try {
      return await fetchFromList();
    } catch {
      throw error;
    }
  }
}

export type GestionProduccionEstadoPayload = {
  estado: string;
  fecha_ini: string;
  fecha_fin: string;
  hora_entrega?: string;
  cantidad_hora_extra: number;
  cantidad_hora_normal: number;
  descripcion?: string;
};

export async function updateGestionProduccionStatus(
  ot: string | number,
  payload: GestionProduccionEstadoPayload
): Promise<void> {
  const url = `${GESTION_PRODUCCION_URL}/${encodeURIComponent(String(ot))}/estado`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      estado: payload.estado,
      fecha_ini: payload.fecha_ini,
      fecha_fin: payload.fecha_fin,
      hora_entrega: payload.hora_entrega,
      cantidad_hora_extra: payload.cantidad_hora_extra,
      cantidad_hora_normal: payload.cantidad_hora_normal,
      descripcion: payload.descripcion,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(
      text || `Error ${res.status} al actualizar estado en gestión de producción`
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
}
