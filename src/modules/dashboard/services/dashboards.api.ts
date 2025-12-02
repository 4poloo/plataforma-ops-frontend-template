// src/modules/dashboard/services/dashboards.api.ts
import { API_ROOT } from "../../produccion/services/work-orders.api";

const DASHBOARD_URL = `${API_ROOT}/v1/dashboards`;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toNumberSafe = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toUpper = (value: unknown): string =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const extractQuantity = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + extractQuantity(item), 0);
  }
  if (value && typeof value === "object") {
    const rec = asRecord(value);
    return (
      toNumberSafe(rec.produccion) ||
      toNumberSafe(rec.producido) ||
      toNumberSafe(rec.producido_total) ||
      toNumberSafe(rec.cantidad) ||
      toNumberSafe(rec.cantidad_produccion) ||
      toNumberSafe(rec.cantidad_producida) ||
      toNumberSafe(rec.total) ||
      toNumberSafe(rec.valor) ||
      extractQuantity(rec.body) ||
      0
    );
  }
  return toNumberSafe(value);
};

const extractQuantityForSku = (payload: unknown, sku?: string): number => {
  if (!sku) return extractQuantity(payload);
  const target = toUpper(sku);
  if (!target) return extractQuantity(payload);

  if (payload && typeof payload === "object") {
    const rec = asRecord(payload);
    if (rec.skus && typeof rec.skus === "object") {
      const skusMap = rec.skus as Record<string, unknown>;
      const direct = toNumberSafe(skusMap[target] ?? skusMap[sku]);
      if (Number.isFinite(direct) && direct > 0) return direct;
      // Buscar por claves insensibles a mayúsculas
      const keyMatch = Object.keys(skusMap).find((k) => toUpper(k) === target);
      if (keyMatch) {
        const qty = toNumberSafe(skusMap[keyMatch]);
        if (Number.isFinite(qty)) return qty;
      }
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === "object") {
        const rec = asRecord(item);
        const skuCandidate =
          toUpper(rec.SKU) ||
          toUpper(rec.sku) ||
          toUpper(rec.CodigoProducto) ||
          toUpper(rec.codigo) ||
          toUpper(rec.producto) ||
          toUpper(rec.sku_producto);
        if (skuCandidate === target) {
          const qty = extractQuantity(rec);
          if (Number.isFinite(qty)) return qty;
        }
      }
    }
  }

  if (payload && typeof payload === "object") {
    const rec = asRecord(payload);
    if (Array.isArray(rec.body)) {
      const qty = extractQuantityForSku(rec.body, sku);
      if (Number.isFinite(qty)) return qty;
    }
  }

  return extractQuantity(payload);
};

export async function fetchDashboardSkusByOt(ot: string | number, sku?: string): Promise<number> {
  const normalized = String(ot ?? "").trim();
  if (!normalized) return 0;

  const url = `${DASHBOARD_URL}/ot/${encodeURIComponent(normalized)}/skus`;
  const res = await fetch(url, { method: "GET" });
  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(rawText || `Error ${res.status} consultando producción de la OT ${normalized}`);
  }

  if (!rawText) return 0;

  try {
    const data = JSON.parse(rawText);
    const qty = extractQuantityForSku(data, sku);
    return Number.isFinite(qty) ? qty : 0;
  } catch {
    const direct = toNumberSafe(rawText);
    if (direct > 0) return direct;
    return 0;
  }
}
