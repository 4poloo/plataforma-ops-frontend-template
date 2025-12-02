import type { Proceso } from "../types";

export type ImportRow = {
  codigo?: string;
  nombre?: string;
  costo?: string | number;
  __row?: number; // fila 1-based incluyendo encabezado
};

export type ImportResult = {
  validos: Proceso[];
  invalidos: Array<ImportRow & { error: string }>;
  duplicados: string[];
};

const norm = (s: string) => (s || "").trim().toUpperCase();

/**
 * Parser CSV simple (sin dependencias):
 * - Auto-detecta separador: ; , o \t
 * - Soporta comillas dobles para campos con separadores/line breaks
 * - Devuelve objetos normalizados a minúsculas en las claves
 */
export async function parseCsvFile(file: File): Promise<ImportRow[]> {
  const text = await file.text();

  // Detectar separador probable
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidate = [",", ";", "\t"];
  const sep = candidate.reduce((best, cur) => {
    const count = (firstLine.match(new RegExp(`\\${cur}`, "g")) || []).length;
    return count > best.count ? { ch: cur, count } : best;
  }, { ch: ",", count: -1 as number }).ch;

  // Parser con comillas (RFC4180 simplificado)
  const rows: string[][] = [];
  let cur = "";
  let inQuotes = false;
  let field: string[] = [];
  const pushField = () => { field.push(cur); cur = ""; };
  const pushRow = () => { rows.push(field); field = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (!inQuotes && (c === sep)) { pushField(); continue; }
    if (!inQuotes && (c === "\n")) { pushField(); pushRow(); continue; }
    if (!inQuotes && c === "\r") { continue; } // ignorar CR
    cur += c;
  }
  // último campo/fila si quedó algo
  if (cur.length > 0 || inQuotes || field.length > 0) {
    pushField(); pushRow();
  }

  if (rows.length === 0) return [];

  // Encabezados
  const headers = (rows[0] || []).map(h => h.trim().toLowerCase());
  const out: ImportRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (row.every(v => String(v || "").trim() === "")) continue; // saltar líneas vacías
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    out.push({
      codigo: typeof obj["codigo"] === "string" ? obj["codigo"] as string : String(obj["codigo"] ?? "").trim(),
      nombre: typeof obj["nombre"] === "string" ? obj["nombre"] as string : String(obj["nombre"] ?? "").trim(),
      costo: obj["costo"] as string | number,
      __row: r + 1, // +1 por índice, +1 por encabezado
    });
  }

  return out;
}

/**
 * Valida filas importadas contra existentes:
 * - Requeridos: codigo, nombre, costo numérico ≥ 0
 * - Duplicados en archivo: se marcan inválidos
 * - Duplicados vs sistema: se marcan inválidos (política: OMITE)
 */
export function validateImportRows(rows: ImportRow[], existentes: Proceso[]): ImportResult {
  const validos: Proceso[] = [];
  const invalidos: Array<ImportRow & { error: string }> = [];
  const seen = new Set<string>();
  const duplicados: string[] = [];

  for (const r of rows) {
    const codigo = r.codigo ? norm(String(r.codigo)) : "";
    const nombre = r.nombre?.toString().trim() ?? "";
    const costoNum =
      typeof r.costo === "number"
        ? r.costo
        : Number(String(r.costo ?? "").replace(",", "."));

    if (!codigo || !nombre || Number.isNaN(costoNum)) {
      invalidos.push({ ...r, error: "Fila inválida: campos requeridos o costo no numérico." });
      continue;
    }
    if (costoNum < 0) {
      invalidos.push({ ...r, error: "Costo negativo." });
      continue;
    }
    if (seen.has(codigo)) {
      duplicados.push(codigo);
      invalidos.push({ ...r, error: "Código duplicado en archivo." });
      continue;
    }
    seen.add(codigo);

    const existe = existentes.some(p => norm(p.codigo) === codigo);
    if (existe) {
      invalidos.push({ ...r, error: "Código ya existe en el sistema (omitido)." });
      continue;
    }

    validos.push({
      codigo,
      nombre,
      costo: Math.round(costoNum * 100) / 100,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    });
  }

  return { validos, invalidos, duplicados };
}
