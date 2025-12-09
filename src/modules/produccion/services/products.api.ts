// src/modules/produccion/services/products.api.ts
export type Product = { sku: string; nombre: string; unidad?: string };

import { API_ROOT } from "./work-orders.api";
import { DEMO_MODE, loadDemoData } from "../../../global/demo/config";

const USE_MOCK = DEMO_MODE || (import.meta.env.VITE_PRODUCTS_MOCK ?? "0") === "1";
const PRODUCTS_URL = `${API_ROOT}/v1/products/by-mixed/`;
const MAX_PAGE = 500;

const adaptFromMixed = (raw: unknown): Product => {
  const rec = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};
  return {
    sku: String(rec?.sku ?? rec?.SKU ?? "").trim(),
    nombre: String(rec?.name ?? rec?.nombre ?? rec?.descripcion ?? rec?.desc ?? "").trim(),
    unidad: String(rec?.uom ?? rec?.unidad ?? rec?.unidad_medida ?? "UN").trim(),
  };
};

const fetchPage = async (skip: number, limit: number): Promise<Product[]> => {
  const qs = new URLSearchParams();
  qs.set("skip", String(skip));
  qs.set("limit", String(limit));
  qs.set("activo", "true");
  qs.set("tipo", "PT");
  const url = `${PRODUCTS_URL}?${qs.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al listar productos`);
  }
  let data: any = [];
  try {
    data = await res.json();
  } catch {
    data = [];
  }
  if (Array.isArray(data)) return data.map(adaptFromMixed);
  if (Array.isArray(data?.items)) return data.items.map(adaptFromMixed);
  return [];
};

/** Obtiene todos los productos (real o mock). */
export async function fetchAllProducts(): Promise<Product[]> {
  if (USE_MOCK) {
    return MOCK_PRODUCTS;
  }
  const all: Product[] = [];
  let skip = 0;
  while (true) {
    const page = await fetchPage(skip, MAX_PAGE);
    all.push(...page);
    if (page.length < MAX_PAGE) break;
    skip += MAX_PAGE;
    if (skip > 10000) break; // salvo runaway
  }
  return all;
}

/** Búsqueda server-side (cuando exista). */
export async function searchProducts(q: string): Promise<Product[]> {
  if (USE_MOCK) {
    const query = q.trim().toLowerCase();
    return MOCK_PRODUCTS.filter(
      p => p.sku.toLowerCase().includes(query) || (p.nombre ?? "").toLowerCase().includes(query)
    );
  }
  const qs = new URLSearchParams();
  qs.set("name", q.trim());
  qs.set("limit", "50");
  qs.set("tipo", "PT");
  const res = await fetch(`${PRODUCTS_URL}?${qs.toString()}`, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  const list = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
      ? data
      : [];
  return list.map(adaptFromMixed);
}

/* =========================
   MOCK DATA
   ========================= */
const MOCK_PRODUCTS: Product[] = loadDemoData().productos.map((p) => ({
  sku: p.sku,
  nombre: p.name,
  unidad: p.uom ?? "UN",
}));
