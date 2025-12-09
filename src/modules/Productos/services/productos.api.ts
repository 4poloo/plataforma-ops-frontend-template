// services/productos.api.ts
import type { Producto } from "../types/producto";
import { resolveCodes } from "../constants/familias";
import { DEMO_MODE, loadDemoData, updateDemoData } from "../../../global/demo/config";

/* --------------------------------------------------------------
   Utilidad: fetch con timeout para evitar requests colgados
-------------------------------------------------------------- */
const fetchWithTimeout = async (
  input: RequestInfo,
  init?: RequestInit & { timeoutMs?: number }
) => {
  const { timeoutMs = 15000, ...opts } = init ?? {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// --------------------------------------------------------------
// Helpers de manejo de errores HTTP (reutilizables)
// --------------------------------------------------------------
type ExtractOpts = {
  defaultMessage?: string;   // Mensaje por defecto
  includeStatus?: boolean;   // Prefijar "[HTTP <code> <statusText>]"
};

async function extractApiError(res: Response, opts?: ExtractOpts): Promise<string> {
  const { defaultMessage = `Error ${res.status}`, includeStatus = true } = opts ?? {};

  // Lee el body una sola vez como texto
  const text = await res.text().catch(() => "");
  const prefix = includeStatus
    ? ["[ ! ] "]
    : "";

  if (!text) return prefix + defaultMessage;

  // Intenta parsear a JSON
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* no es JSON, seguimos con text */ }

  // Si no hay JSON, usa el texto plano
  if (!data) return prefix + (text.trim() || defaultMessage);

  // 1) message directo
  if (typeof data.message === "string" && data.message.trim()) {
    return prefix + data.message.trim();
  }

  // 2) detail como string
  if (typeof data.detail === "string" && data.detail.trim()) {
    return prefix + data.detail.trim();
  }

  // 3) detail como array (FastAPI ValidationError)
  if (Array.isArray(data.detail)) {
    const parts = data.detail
      .map((d: any) => {
        if (!d) return "";
        if (typeof d === "string") return d;
        if (typeof d.msg === "string" && d.msg) return d.msg;
        if (typeof d.message === "string" && d.message) return d.message;
        if (Array.isArray(d.loc)) return d.loc.join(".");
        return "";
      })
      .filter(Boolean);
    if (parts.length) return prefix + parts.join("; ");
  }

  // 4) detail como objeto
  if (data.detail && typeof data.detail === "object") {
    const m = (data.detail.msg || data.detail.message);
    if (typeof m === "string" && m.trim()) return prefix + m.trim();
    try { return prefix + JSON.stringify(data.detail); } catch { /* ignore */ }
  }

  // 5) fallback: todo el objeto JSON
  try { return prefix + JSON.stringify(data); } catch { /* ignore */ }

  return prefix + defaultMessage;
}

// Atajo: asegura OK o lanza Error con mensaje legible
async function ensureOk(res: Response, ctxDefaultMsg: string) {
  if (res.ok) return;
  const msg = await extractApiError(res, {
    defaultMessage: ctxDefaultMsg,
    includeStatus: true,
  });
  throw new Error(msg);
}

/* --------------------------------------------------------------
   Tipos para el listado "mixed"
-------------------------------------------------------------- */
export interface ListMixedQuery {
  name?: string | null; // <- filters.q
  dg?: string | null;   // <- filters.familia
  dsg?: string | null;  // <- filters.subfamilia
  tipo?: string | null; // <- filters.clasificacion ("MP" | "PT")
  limit?: number;       // default 20 (1..1000)
  activo?: boolean | null; 
  skip?: number;        // default 0 (>=0)
}

export interface ListResult {
  items: Producto[];
  limit: number;
  skip: number;
  total?: number;     // si backend expone X-Total-Count
  hasMore?: boolean;  // fallback cuando no hay total
}

/* --------------------------------------------------------------
   🧩 Adapter API → UI
-------------------------------------------------------------- */
const adaptProducto = (raw: any): Producto => {
  return {
    id: raw.id ?? raw._id ?? undefined,
    sku: raw.sku ?? "",
    barcode: raw.c_barra ?? raw.codigo_barra ?? null,
    name: raw.name ?? raw.nombre ?? raw.descripcion ?? "",
    uom: raw.uom ?? raw.unidad ?? "UN",
    groupCode: raw.codigo_g ?? raw.codigo_grupo ?? null,
    groupName: raw.dg ?? raw.nombre_grupo ?? null,
    subgroupCode: raw.codigo_sg ?? raw.codigo_subgrupo ?? null,
    subgroupName: raw.dsg ?? raw.nombre_subgrupo ?? null,
    priceNet: Number(raw.pneto ?? raw.precio_neto ?? 0),
    priceVat: raw.piva ?? undefined,
    replacementCost: raw.prepo ?? raw.valor_reposicion ?? null,
    classification: raw.tipo ?? raw.tipo ?? "/",
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
    activo: raw.activo ?? true,
  };
};

const readDemoProductos = (): Producto[] => loadDemoData().productos;
const writeDemoProductos = (items: Producto[]) => {
  updateDemoData((draft) => {
    draft.productos = items;
  });
};

/* --------------------------------------------------------------
   Listado principal: /api/v1/products/by-mixed/
-------------------------------------------------------------- */
export async function listProductosMixedAPI(params: ListMixedQuery): Promise<ListResult> {
  if (DEMO_MODE) {
    const all = readDemoProductos();
    const q = (params.name ?? "").trim().toLowerCase();
    const dg = (params.dg ?? "").trim().toLowerCase();
    const dsg = (params.dsg ?? "").trim().toLowerCase();
    const tipo = (params.tipo ?? "").trim().toUpperCase();
    const activo = params.activo;
    const filtered = all.filter((p) => {
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchesDg = dg ? (p.groupName ?? "").toLowerCase() === dg : true;
      const matchesDsg = dsg ? (p.subgroupName ?? "").toLowerCase() === dsg : true;
      const matchesTipo = tipo ? p.classification.toUpperCase() === tipo : true;
      const matchesActivo = typeof activo === "boolean" ? Boolean(p.activo ?? true) === activo : true;
      return matchesQ && matchesDg && matchesDsg && matchesTipo && matchesActivo;
    });
    const limit = Math.max(1, Math.min(1000, params.limit ?? 20));
    const skip = Math.max(0, params.skip ?? 0);
    const items = filtered.slice(skip, skip + limit);
    const hasMore = skip + limit < filtered.length;
    return { items, limit, skip, total: filtered.length, hasMore };
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const limit = Math.max(1, Math.min(1000, params.limit ?? 20));
  const skip = Math.max(0, params.skip ?? 0);

  const qs = new URLSearchParams();
  if (params.name && params.name.trim()) qs.set("name", params.name.trim());
  if (params.dg && params.dg.trim()) qs.set("dg", params.dg.trim());
  if (params.dsg && params.dsg.trim()) qs.set("dsg", params.dsg.trim());
  if (params.tipo && params.tipo.trim()) qs.set("tipo", params.tipo.trim());
  // ⬇️ NUEVO: solo agregar 'activo' cuando viene true/false (no cuando es null)
  if (typeof params.activo === "boolean") qs.set("activo", String(params.activo));
  qs.set("limit", String(limit));
  qs.set("skip", String(skip));

  const url = `${base}/api/v1/products/by-mixed/?${qs.toString()}`;

  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    timeoutMs: 15000,
  });

    if (res.status === 404) {
    return {
      items: [],
      limit,
      skip,
      total: 0,
      hasMore: false,
    };
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Error ${res.status} al listar productos (by-mixed)`);
  }

  const raw = await res.json();
  const items: Producto[] = Array.isArray(raw) ? raw.map(adaptProducto) : [];

  const totalHeader = res.headers.get("X-Total-Count") ?? res.headers.get("x-total-count");
  const total = totalHeader ? Number(totalHeader) : undefined;
  const hasMore = total === undefined ? items.length === limit : undefined;

  return { items, limit, skip, total, hasMore };
}

/* --------------------------------------------------------------
   Búsqueda puntual por SKU: /api/v1/products/by-sku/{sku}
-------------------------------------------------------------- */
export async function searchProductosBySkuAPI(
  rawSku: string,
  opts?: { limit?: number; skip?: number }
): Promise<ListResult> {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (DEMO_MODE) {
    const normalized = (rawSku ?? "").trim().toLowerCase();
    const all = readDemoProductos().filter((p) =>
      p.sku.toLowerCase().includes(normalized)
    );
    const limit = opts?.limit != null ? Math.max(1, Math.min(100, opts.limit)) : all.length;
    const skip = opts?.skip != null ? Math.max(0, opts.skip) : 0;
    const items = all.slice(skip, skip + limit);
    return {
      items,
      limit,
      skip,
      total: all.length,
      hasMore: skip + limit < all.length,
    };
  }
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const normalized = (rawSku ?? "").trim();
  if (!normalized) {
    return { items: [], limit: opts?.limit ?? 0, skip: opts?.skip ?? 0, total: 0, hasMore: false };
  }

  const limit = opts?.limit != null ? Math.max(1, Math.min(100, opts.limit)) : undefined;
  const skip = opts?.skip != null ? Math.max(0, opts.skip) : undefined;
  const qs = new URLSearchParams();
  if (typeof limit === "number") qs.set("limit", String(limit));
  if (typeof skip === "number") qs.set("skip", String(skip));
  const searchParams = qs.toString();

  const url = `${base}/api/v1/products/by-sku/${encodeURIComponent(
    normalized.toUpperCase()
  )}${searchParams ? `?${searchParams}` : ""}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs: 10000,
  });

  if (res.status === 404) {
    return {
      items: [],
      limit: limit ?? 0,
      skip: skip ?? 0,
      total: 0,
      hasMore: false,
    };
  }

  if (!res.ok) {
    const msg = await extractApiError(res, {
      defaultMessage: "No se pudo buscar el producto por SKU",
      includeStatus: true,
    });
    throw new Error(msg);
  }

  const data = await res.json();

  let rawItems: any[] = [];
  let total: number | undefined;
  let hasMore: boolean | undefined;

  if (Array.isArray(data)) {
    rawItems = data;
    total = data.length;
    if (typeof limit === "number") {
      hasMore = data.length === limit;
    }
  } else if (data && typeof data === "object") {
    if (Array.isArray((data as any).items)) {
      rawItems = (data as any).items;
      total =
        typeof (data as any).total === "number"
          ? (data as any).total
          : typeof (data as any).count === "number"
            ? (data as any).count
            : undefined;
      hasMore =
        typeof (data as any).hasMore === "boolean"
          ? (data as any).hasMore
          : total === undefined && typeof limit === "number"
            ? rawItems.length === limit
            : undefined;
    } else {
      rawItems = [data];
      total = typeof (data as any).total === "number" ? (data as any).total : rawItems.length;
      hasMore = false;
    }
  }

  const items = rawItems.map(adaptProducto);
  const effectiveLimit = limit ?? items.length;
  const effectiveSkip = skip ?? 0;

  return {
    items,
    limit: effectiveLimit,
    skip: effectiveSkip,
    total: total ?? items.length,
    hasMore,
  };
}

/* --------------------------------------------------------------
   UPDATE (PATCH) /api/v1/products/upd/{id}
   - Requiere ObjectId en la URL
   - Body según especificación del backend
-------------------------------------------------------------- */

const toNumber = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const buildUpdatePayload = (p: Producto) => {
  const { groupCode, subgroupCode } = resolveCodes({
    groupName: p.groupName,
    subgroupName: p.subgroupName,
    groupCode: p.groupCode as any,
    subgroupCode: p.subgroupCode as any,
  });

  return {
    nombre: (p.name ?? "").trim(),
    sku: (p.sku ?? "").trim(),
    c_barra: toNumber(p.barcode, 0),
    unidad: (p.uom ?? "UN").trim(),

    dg: (p.groupName ?? "").trim(),
    codigo_g: toNumber(groupCode, 0),

    dsg: (p.subgroupName ?? "").trim(),
    codigo_sg: toNumber(subgroupCode, 0),

    pneto: toNumber(p.priceNet, 0),
    piva: toNumber(p.priceVat ?? Math.round(toNumber(p.priceNet, 0) * 1.19), 0),
    tipo: (p.classification ?? "PT").toString(),
    activo: p.activo ?? true,
    valor_repo: toNumber(p.replacementCost, 0),
  };
};

// 🔧 Construye el payload para CREATE (usa mismo mapeo; valor_repo como string)
const buildCreatePayload = (p: Producto) => {
  const { groupCode, subgroupCode } = resolveCodes({
    groupName: p.groupName,
    subgroupName: p.subgroupName,
    groupCode: p.groupCode as any,
    subgroupCode: p.subgroupCode as any,
  });

  const toNumber = (v: unknown, fallback = 0): number => {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    nombre: (p.name ?? "").trim(),
    sku: (p.sku ?? "").trim(),
    c_barra: toNumber(p.barcode, 0),
    unidad: (p.uom ?? "UN").trim(),

    dg: (p.groupName ?? "").trim(),
    codigo_g: toNumber(groupCode, 0),

    dsg: (p.subgroupName ?? "").trim(),
    codigo_sg: toNumber(subgroupCode, 0),

    pneto: toNumber(p.priceNet, 0),
    piva: toNumber(p.priceVat ?? Math.round(toNumber(p.priceNet, 0) * 1.19), 0),
    tipo: (p.classification ?? "PT").toString(),
    activo: p.activo ?? true,
    // ⬅️ IMPORTANTE: backend pide string
    valor_repo: String(toNumber(p.replacementCost, 0)),
  };
};

// CREATE: POST /api/v1/products/Create/
export async function createProductoAPI(producto: Producto) {
  if (DEMO_MODE) {
    const nuevo: Producto = {
      ...producto,
      id: producto.id ?? `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeDemoProductos([...readDemoProductos(), nuevo]);
    return nuevo;
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const url = `${base}/api/v1/products/Create/`;
  const body = buildCreatePayload(producto);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: 15000,
  });

  await ensureOk(res, "Error al crear producto");

  const raw = await res.json();
  // Devolvemos adaptado para tener id/sku, etc.
  return adaptProducto(raw);
}

export async function updateProductoAPI(producto: Producto) {
  if (DEMO_MODE) {
    const id = (producto as any).id ?? producto.sku;
    const next = readDemoProductos().map((p) =>
      (p.id ?? p.sku) === id ? { ...p, ...producto, updatedAt: new Date().toISOString() } : p
    );
    writeDemoProductos(next);
    return producto;
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const id = (producto as any).id;
  if (!id) throw new Error("Falta 'id' del producto para actualizar (ObjectId)");

  const url = `${base}/api/v1/products/upd/${id}`;
  const body = buildUpdatePayload(producto);

  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: 15000,
  });

  await ensureOk(res, "Error al actualizar producto");

  return res.json();
}

// ⬇️ Añade estas funciones al final del archivo (antes del export de toggle si gustas)
// IMPORT: VALIDATE (multipart)  POST /api/v1/products/import/validate
export async function importValidate(file: File): Promise<ImportValidateResponse> {
  if (DEMO_MODE) {
    return {
      batchId: "demo-batch",
      columns: ["sku", "nombre", "unidad", "precio"],
      rows: [{ sku: "PT-999", nombre: "Producto Demo", unidad: "UN", precio: 1000 }],
      errorsByRow: {},
      warningsByRow: { 1: ["Se actualizará si existe"] },
    };
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const url = `${base}/api/v1/products/import/validate`;
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    // ⚠️ NO pongas Content-Type manual cuando usas FormData (el browser setea boundary)
    body: form,
  });

  await ensureOk(res, "Error al importar producto(s)");

  return res.json();
}

// IMPORT: CONFIRM  POST /api/v1/products/import/confirm  (body: { batchId })
export async function importConfirm(batchId: string) {
  if (DEMO_MODE) {
    return { ok: true, created: 1, updated: 0, skipped: 0 };
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");
  if (!batchId) throw new Error("Falta 'batchId' para confirmar importación");

  const url = `${base}/api/v1/products/import/confirm`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ batchId }),
  });

  if (!res.ok) {
    let msg = `Error ${res.status} al confirmar importación`;
    try {
      const data = await res.json();
      msg = data?.message || data?.detail || msg;
    } catch {
      const txt = await res.text().catch(() => "");
      if (txt) msg = txt;
    }
    throw new Error(msg);
  }

  return res.json(); // { ok, created, updated, skipped } dependiendo del backend
}

/* --------------------------------------------------------------
   NUEVO: Toggle activo (solo cambia { activo })
   PATCH /api/v1/products/upd/{id}  body: { activo: boolean }
-------------------------------------------------------------- */
export async function toggleProductoActivoAPI(id: string, activo: boolean) {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!id) throw new Error("Falta 'id' de producto");
  if (DEMO_MODE) {
    const next = readDemoProductos().map((p) =>
      (p.id ?? p.sku) === id ? { ...p, activo } : p
    );
    writeDemoProductos(next);
    const updated = next.find((p) => (p.id ?? p.sku) === id);
    return updated ?? { id, sku: id, name: "", uom: "UN", priceNet: 0, classification: "PT", activo };
  }
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const url = `${base}/api/v1/products/upd/${id}`;
  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ activo }),
    timeoutMs: 15000,
  });

  await ensureOk(res, "Error al Habilitar/Deshabilitar producto");

  const raw = await res.json();
  return adaptProducto(raw); // devolvemos adaptado por comodidad
}

export interface ImportValidateResponse {
  batchId: string;
  columns: string[];
  rows: Array<Record<string, any>>;
  errorsByRow: Record<number, string[]>;
  warningsByRow: Record<number, string[]>;
}

export async function downloadImportTemplate(): Promise<void> {
  if (DEMO_MODE) {
    const csv = "sku,nombre,unidad,precio\nPT-123,Producto Demo,UN,1000";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_import_demo.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
    return;
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");

  const url = `${base}/api/v1/products/import/template`;

  // Descargamos como blob para forzar "guardar como" con nombre de archivo
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    let msg = `Error ${res.status} al descargar plantilla`;
    try { const d = await res.text(); if (d) msg = d; } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "plantilla_importar_productos.csv";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

// --------------------------------------------------------------
// 2) Validar CSV: POST /api/v1/products/import/validate
//    - Usa FormData; NO setees Content-Type manual
// --------------------------------------------------------------
export interface ProductosImportValidateResponse {
  batchId: string;
  columns: string[];
  rows: Array<Record<string, any>>; // preview (primeras N filas)
  errorsByRow: Record<number, string[]>;
  warningsByRow: Record<number, string[]>;
}

export async function productosImportValidate(file: File): Promise<ProductosImportValidateResponse> {
  if (DEMO_MODE) {
    return {
      batchId: "demo-batch",
      columns: ["sku", "nombre", "unidad", "precio"],
      rows: [{ sku: "PT-123", nombre: "Producto Demo", unidad: "UN", precio: 1000 }],
      errorsByRow: {},
      warningsByRow: {},
    };
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");
  if (!file) throw new Error("Debes adjuntar un archivo .csv");

  const url = `${base}/api/v1/products/import/validate`;
  const form = new FormData();
  form.append("file", file); // ⚠️ el backend espera 'file'

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    await ensureOk(res, "Error al validar importación");
  }
  return res.json();
}

// --------------------------------------------------------------
// 3) Confirmar import: POST /api/v1/products/import/confirm
//    - Body JSON: { batchId }
// --------------------------------------------------------------
export interface ProductosImportConfirmResponse {
  ok?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
  // agrega aquí más campos si tu endpoint los retorna
}

export async function productosImportConfirm(batchId: string): Promise<ProductosImportConfirmResponse> {
  if (DEMO_MODE) {
    return { ok: true, created: 1, updated: 0, skipped: 0 };
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  if (!base) throw new Error("VITE_API_BASE_URL no está definido");
  if (!batchId) throw new Error("Falta 'batchId' para confirmar importación");

  const url = `${base}/api/v1/products/import/confirm`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ batchId }),
  });

  if (!res.ok) {
    await ensureOk(res, "Error al confirmar importación");
  }
  return res.json();
}
