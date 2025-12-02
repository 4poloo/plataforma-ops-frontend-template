// src/modules/recetas/services/recetas-costos.api.ts
import type { RecetaDetalleDTO } from '../models/receta.model';
import type { ValorizacionLinea, ValorizacionResp } from '../models/valorizacion.model';

// Normalizamos la base (igual que en recetas.api) para evitar encoding raro en rutas con ":"
const RAW = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const API_ROOT = RAW || '';
const API_BASE = API_ROOT === '' || API_ROOT.endsWith('/api') ? (API_ROOT || '/api') : `${API_ROOT}/api`;
const API = (path: string) => `${API_BASE}/v1${path}`;

const q = (obj: Record<string, any>) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
};

const isObjectId = (s: unknown) =>
  typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);

// --- helpers HTTP
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} → ${url}${body ? `\n${body}` : ''}`);
  }
  return r.json();
}

// Resolver SKU si el “código” (receta.codigo) es un ObjectId
async function resolveSkuIfNeeded(codigo: string): Promise<string> {
  if (!isObjectId(codigo)) return codigo;
  try {
    const prod = await fetchJson<any>(API(`/products/${codigo}`));
    return prod?.sku ?? codigo;
  } catch {
    return codigo;
  }
}

// --- enriquecimiento sku/nombre/unidad (sin quitar nada)
type Enriched = { sku?: string; nombre?: string; unidad?: string };

async function enrichLine(l: any): Promise<Enriched> {
  // 1) por productId
  if (isObjectId(l.productId)) {
    try {
      const p = await fetchJson<any>(API(`/products/${l.productId}`));
      return {
        sku: typeof p?.sku === 'string' ? p.sku : undefined,
        nombre: typeof p?.nombre === 'string' ? p.nombre : undefined,
        unidad: typeof p?.unidad === 'string' ? p.unidad : undefined,
      };
    } catch {
      // fallback por sku
    }
  }
  // 2) por sku
  if (typeof l.sku === 'string' && l.sku.trim()) {
    try {
      const p = await fetchJson<any>(API(`/products/by-sku/${encodeURIComponent(l.sku)}`));
      return {
        sku: typeof p?.sku === 'string' ? p.sku : undefined,
        nombre: typeof p?.nombre === 'string' ? p.nombre : undefined,
        unidad: typeof p?.unidad === 'string' ? p.unidad : undefined,
      };
    } catch {
      // nada
    }
  }
  return {};
}

const round3 = (n: number) => +n.toFixed(3);

export const costosApi = {
  async valorizar(
    receta: RecetaDetalleDTO,
    opts?: { cost_method?: 'pneto' | 'piva' | 'last' }
  ): Promise<ValorizacionResp> {
    // El backend calcula con un método (default pneto). Nosotros derivamos PIVA para la grilla.
    const cost_method = opts?.cost_method ?? 'pneto';
    const skuPT = await resolveSkuIfNeeded(receta.codigo);
    const version = receta.version;

    const url = API(
      `/recipes/${encodeURIComponent(skuPT)}/versions/${version}/valorizar:preview${q(
        { cost_method }
      )}`
    );

    const data = await fetchJson<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    // 1) líneas crudas del backend
    const raw: any[] = Array.isArray(data?.breakdown) ? data.breakdown : [];

    // 2) enriquecer SOLO lo que falte (sku/descripcion/unidad), sin borrar nada
    const needs = raw.map((l, i) => ({ i, l }))
      .filter(({ l }) => !l?.sku || !l?.descripcion || !l?.unidad);

    if (needs.length) {
      const enriched = await Promise.all(
        needs.map(({ l }) => enrichLine(l).catch<Enriched>(() => ({})))
      );
      enriched.forEach((e, idx) => {
        const { i } = needs[idx];
        if (e.sku && !raw[i].sku) raw[i].sku = e.sku;
        if (e.nombre && !raw[i].descripcion) raw[i].descripcion = e.nombre;
        if (e.unidad && !raw[i].unidad) raw[i].unidad = e.unidad;
      });
    }

    // 3) construir líneas de respuesta manteniendo TODA la info + neto/PIVA
    const lineas: ValorizacionLinea[] = raw.map((l: any) => {
      const qty_eff = typeof l.qty_eff === 'number' ? l.qty_eff : 0;
      const unit_cost_net = typeof l.unit_cost === 'number' ? l.unit_cost : 0;
      const subtotal_net = typeof l.subtotal === 'number' ? l.subtotal : round3(qty_eff * unit_cost_net);

      // Derivamos PIVA localmente para la grilla (nunca quitamos datos)
      const unit_cost_gross = round3(unit_cost_net * 1.19);
      const subtotal_gross = round3(subtotal_net * 1.19);

      const base: ValorizacionLinea = {
        sku: l.sku ?? '',
        descripcion: l.descripcion ?? '',
        unidad: l.unidad ?? '',
        cantidad: qty_eff,
        // Promedio = PNETO
        costoUnitarioPromedio: unit_cost_net,
        costoTotalPromedio: subtotal_net,
        // Reposición = PIVA (para mostrar ambas columnas)
        costoReposicion: unit_cost_gross,
        costoTotalReposicion: subtotal_gross,
        fechaUltimoCosto: data?.valued_at,
      };

      // anexamos campos crudos SIN eliminar nada (por compatibilidad con la grilla)
      return Object.assign(base, {
        productId: l.productId ?? '',
        unit_cost: unit_cost_net,
        qty_eff,
        subtotal: subtotal_net,
        // deja pasar cualquier otro campo del backend
        ...l,
      }) as ValorizacionLinea;
    });

    // Totales: neto (promedio) y bruto (reposicion) para alinear con la grilla
    const costoMaterialesNeto = lineas.reduce(
      (a, b) => a + (typeof b.costoTotalPromedio === 'number' ? b.costoTotalPromedio : 0),
      0
    );
    const costoMaterialesBruto = lineas.reduce(
      (a, b) => a + (typeof b.costoTotalReposicion === 'number' ? b.costoTotalReposicion : 0),
      0
    );

    const costoProcesos = typeof data?.process_cost === 'number' ? data.process_cost : 0;
    // (Si proceso también debe llevar IVA, cámbialo a round3(costoProcesos * 1.19) para los “reposicion”)

    return {
      recetaId: receta.id,
      version: receta.version,
      cantidadBase: receta.cantidadBase,
      unidadBase: receta.unidadBase,
      costoProcesos,
      lineas,
      totales: {
        // Promedio = Neto
        promedio: {
          costoMateriales: round3(costoMaterialesNeto),
          costoProcesos: round3(costoProcesos),
          total: round3(costoMaterialesNeto + costoProcesos),
        },
        // Reposición = Bruto (PIVA)
        reposicion: {
          costoMateriales: round3(costoMaterialesBruto),
          costoProcesos: round3(costoProcesos),
          total: round3(costoMaterialesBruto + costoProcesos),
        },
      },
    };
  },
};
