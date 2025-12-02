import type { MaterialLinea } from '../models/receta.model';

export function findDuplicateSku(materiales: MaterialLinea[]): string | null {
  const seen = new Set<string>();
  for (const mat of materiales) {
    const sku = (mat?.sku ?? '').trim().toUpperCase();
    if (!sku) continue;
    if (seen.has(sku)) return sku;
    seen.add(sku);
  }
  return null;
}
