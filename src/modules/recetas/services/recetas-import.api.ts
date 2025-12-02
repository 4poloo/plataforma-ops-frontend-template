// recetas/services/recetas-import.api.ts
// Integra flujo CSV con los endpoints del backend. Sin XLSX en el front.

export type ImportFormat = "csv" | "json";
export type Unidad = 'UN' | 'KG' | 'LT' | string;
export type MaterialLinea = { sku: string; descripcion?: string; unidad: Unidad; cantidad: number };

export type ImportStageResp = {
  batch_id: string;
  inserted: number;
  warnings?: string[];
};

export type ImportStatusResp = {
  batch_id: string;
  total: number;
  first_rows: any[];
};

export type PromoteResp = {
  gruposProcesados: number;
  recetasCreadas: number;
  recetasActualizadas: number;
  versionesAgregadas: number;
  versionesRechazadas: number;
  vigentesSeteadas: number;
  warnings: string[];
  errores: string[];
};

// Normalizamos base para coincidir con recetas.api
const RAW = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const API_ROOT = RAW || '';
const API = API_ROOT === '' || API_ROOT.endsWith('/api') ? (API_ROOT || '/api') : `${API_ROOT}/api`;
const R = `${API}/v1/recipes/import`;

export function getTemplateUrl(sample = false) {
  return `${R}/csv:template${sample ? '?sample=true' : ''}`;
}

export function getManualUrl() {
  return `${R}/csv:manual`;
}

export async function stageCSV(file: File): Promise<ImportStageResp> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${R}/csv:stage`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || 'Error al subir CSV');
  }
  return res.json();
}

export async function status(batch_id: string): Promise<ImportStatusResp> {
  const res = await fetch(`${R}/csv:status?batch_id=${encodeURIComponent(batch_id)}`);
  if (!res.ok) throw new Error('Error al consultar estado del lote');
  return res.json();
}

export async function promote(params: {
  batch_id: string;
  overwrite_version?: boolean;
  dry_run?: boolean;
}): Promise<PromoteResp> {
  const res = await fetch(`${R}/csv:promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_id: params.batch_id,
      overwrite_version: !!params.overwrite_version,
      dry_run: !!params.dry_run,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || 'Error al promover el lote');
  }
  return res.json();
}

export async function clear(batch_id: string): Promise<{ batch_id: string; deleted: number }> {
  const res = await fetch(`${R}/csv:stage/${encodeURIComponent(batch_id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al limpiar el lote');
  return res.json();
}

export async function parseFile(
  file: File
): Promise<{ formato: ImportFormat; materiales: MaterialLinea[]; meta?: any }> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    // import dinámico para no cargar papaparse si no se usa
    const Papa = await import("papaparse");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const materiales = (parsed.data as any[]).map((row) => normalizeRow(row));
    return { formato: "csv", materiales, meta: parsed.meta };
  }

  if (name.endsWith(".json")) {
    const text = await file.text();
    const json = JSON.parse(text);
    const arr: any[] = Array.isArray(json) ? json : json.materiales;
    if (!Array.isArray(arr)) throw new Error("JSON inválido: se esperaba array o { materiales: [] }");
    const materiales: MaterialLinea[] = arr.map((r: any) => normalizeRow(r));
    return { formato: "json", materiales };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    throw new Error("Los Excel (.xlsx/.xls) se importan en el servidor. Usa CSV o JSON para previsualizar.");
  }

  throw new Error("Formato no soportado. Usa .csv o .json");
}

/** Normaliza/valida una fila de material (front) */
function normalizeRow(row: any): MaterialLinea {
  const sku = (row.sku ?? row.SKU ?? row.codigo ?? row.CODIGO ?? "").toString().trim();
  const descripcion = (row.descripcion ?? row.DESCRIPCION ?? row.descripcionInsumo ?? "").toString().trim();
  const unidad = (row.unidad ?? row.UNIDAD ?? row.um ?? row.U_M ?? "UN").toString().trim();
  const cantidadRaw = row.cantidad ?? row.CANTIDAD ?? row.qty ?? row.QTY ?? "0";
  const cantidad = Number(cantidadRaw);

  if (!sku) throw new Error("Fila sin SKU");
  if (!Number.isFinite(cantidad) || cantidad < 0) throw new Error(`Cantidad inválida para SKU ${sku}`);
  if (["__proto__", "constructor", "prototype"].includes(sku)) throw new Error("SKU inválido");

  return { sku, descripcion, unidad, cantidad };
}
