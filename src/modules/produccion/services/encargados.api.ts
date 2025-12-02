import { API_ROOT } from "./work-orders.api";

export type Encargado = {
  _id: string;
  nombre: string;
  linea: string;
  predeterminado?: boolean;
};

export type EncargadoPayload = {
  nombre: string;
  linea: string;
  predeterminado?: boolean;
};

const ENCARGADOS_URL = `${API_ROOT}/v1/encargados`;

const adaptEncargado = (item: unknown): Encargado => {
  const doc = (item && typeof item === "object" ? item : {}) as Record<
    string,
    unknown
  >;
  return {
    _id: String(doc._id ?? ""),
    nombre: String(doc.nombre ?? ""),
    linea: String(doc.linea ?? ""),
    predeterminado: Boolean(doc.predeterminado ?? doc.default ?? false),
  };
};

export async function fetchEncargados(params?: {
  linea?: string | null;
  nombre?: string | null;
  limit?: number;
  skip?: number;
}): Promise<Encargado[]> {
  const qs = new URLSearchParams();
  const limit = params?.limit ?? 100;
  const skip = params?.skip ?? 0;
  if (params?.linea) qs.set("linea", params.linea);
  if (params?.nombre) qs.set("nombre", params.nombre);
  qs.set("limit", String(Math.min(Math.max(limit, 1), 500)));
  qs.set("skip", String(Math.max(skip, 0)));

  const url = `${ENCARGADOS_URL}${qs.toString() ? `?${qs.toString()}` : ""}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al listar encargados`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(adaptEncargado);
}

export async function createEncargado(
  payload: EncargadoPayload
): Promise<Encargado> {
  const res = await fetch(ENCARGADOS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al crear encargado`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return adaptEncargado(payload);
  try {
    const data = JSON.parse(text) as unknown;
    return adaptEncargado(data);
  } catch {
    return adaptEncargado(payload);
  }
}

export async function updateEncargado(
  encargadoId: string,
  payload: EncargadoPayload
): Promise<Encargado> {
  const id = String(encargadoId ?? "").trim();
  if (!id) throw new Error("ID de encargado requerido para actualizar");

  const res = await fetch(`${ENCARGADOS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al actualizar encargado`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return adaptEncargado({ ...payload, _id: id });
  try {
    const data = JSON.parse(text) as unknown;
    return adaptEncargado(data);
  } catch {
    return adaptEncargado({ ...payload, _id: id });
  }
}
