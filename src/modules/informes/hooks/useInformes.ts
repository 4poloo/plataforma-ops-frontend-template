// src/modules/informes/hooks/useInformes.ts
// MOCK amigable: prende/apaga con la constante.
// Mantiene las mismas firmas para no romper componentes.

const MOCK = true; // <-- cambia a false cuando conectes API real

import type {
  CostosRecetaDetalleResponse,
  ExportRequest,
  ExportResponseImmediate,
  ExportResponseJob,
  FiltrosInformes,
  KPIResponse,
  SerieOTPorDiaResponse,
  TablaOTResponse,
  TopProductosResponse,
  EstadoOT,
  TablaOTRow,
} from "../types/informes";

const BASE = "/api/informes";

const buildQuery = (f: FiltrosInformes) => {
  const params = new URLSearchParams();
  params.set("from", f.from);
  params.set("to", f.to);
  if (f.groupBy) params.set("groupBy", f.groupBy);
  f.linea?.forEach((v) => params.append("linea", v));
  f.sku?.forEach((v) => params.append("sku", v));
  f.estado?.forEach((v) => params.append("estado", v));
  if (f.page) params.set("page", String(f.page));
  if (f.pageSize) params.set("pageSize", String(f.pageSize));
  return params.toString();
};

/* --------------------------- MOCK DATA SECTION --------------------------- */
function sleep(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

const MOCK_KPIS: KPIResponse = {
  ot_creadas: { hoy: 3, semana: 22, mes: 86 },
  ot_cerradas: { hoy: 2, semana: 19, mes: 80 },
  cumplimiento_pct: 92.4,
  merma_pct: 1.8,
};

function makeMockSeries(groupBy: "day" | "week" | "month"): SerieOTPorDiaResponse {
  if (groupBy === "week") {
    return {
      groupBy,
      items: [
        { bucket: "2025-W36", linea: "AGUA", ot_creadas: 18, ot_cerradas: 15, unidades: 5600, merma: 45 },
        { bucket: "2025-W36", linea: "PERIFERICOS", ot_creadas: 9, ot_cerradas: 8, unidades: 3100, merma: 22 },
        { bucket: "2025-W37", linea: "AGUA", ot_creadas: 20, ot_cerradas: 17, unidades: 5900, merma: 49 },
      ],
    };
  }
  if (groupBy === "month") {
    return {
      groupBy,
      items: [
        { bucket: "2025-08", linea: "PERIFERICOS", ot_creadas: 70, ot_cerradas: 66, unidades: 21000, merma: 170 },
        { bucket: "2025-08", linea: "ASEO HOGAR", ot_creadas: 40, ot_cerradas: 38, unidades: 12500, merma: 95 },
        { bucket: "2025-09", linea: "PERIFERICOS", ot_creadas: 42, ot_cerradas: 39, unidades: 13100, merma: 110 },
      ],
    };
  }
  // day (por defecto)
  return {
    groupBy,
    items: [
      { bucket: "2025-09-10", linea: "AGUA", ot_creadas: 4, ot_cerradas: 3, unidades: 1200, merma: 12 },
      { bucket: "2025-09-10", linea: "ASEO HOGAR", ot_creadas: 2, ot_cerradas: 1, unidades: 600,  merma: 7  },
      { bucket: "2025-09-11", linea: "AGUA", ot_creadas: 5, ot_cerradas: 4, unidades: 1400, merma: 10 },
      { bucket: "2025-09-12", linea: "AGUA", ot_creadas: 3, ot_cerradas: 3, unidades: 1000, merma: 9  },
      { bucket: "2025-09-12", linea: "ASEO HOGAR", ot_creadas: 2, ot_cerradas: 2, unidades: 700,  merma: 8  }
    ],
  };
}

const MOCK_TOP: TopProductosResponse = {
  items: [
    { sku: "PT-001", nombre: "Detergente Multiusos", unidades: 5400 },
    { sku: "PT-014", nombre: "Suavizante Primavera",  unidades: 4100 },
    { sku: "PT-022", nombre: "Lavalozas Limón",       unidades: 3200 },
    { sku: "PT-010", nombre: "Cloro Gel",              unidades: 2850 },
    { sku: "PT-031", nombre: "Desengrasante X",        unidades: 2100 },
  ],
};

// Helper para tipar correctamente el estado (EstadoOT) y evitar TS2322
function estadoFromIdx(idx: number): EstadoOT {
  if (idx % 5 === 0) return "En Proceso";
  if (idx % 3 === 0) return "Cerrada";
  return "Creada";
}

function makeMockTabla(page = 1, pageSize = 20): TablaOTResponse {
  const total = 86;

  const rows: TablaOTRow[] = Array.from({ length: pageSize }, (_, i) => {
    const idx = (page - 1) * pageSize + i + 1;
    return {
      ot: `OT-${1000 + idx}`,
      estado: estadoFromIdx(idx), // <- ahora es EstadoOT
      fecha: "2025-09-12T12:00:00",
      linea: idx % 2 === 0 ? "AGUA" : "ASEO HOGAR",
      sku_pt: idx % 4 === 0 ? "PT-014" : "PT-001",
      descripcion: idx % 4 === 0 ? "Suavizante Primavera" : "Detergente Multiusos",
      plan_u: 1000 + (idx % 5) * 100,
      real_u: 950 + (idx % 5) * 90,
      merma_u: 10 + (idx % 5) * 2,
      cumplimiento_pct: 92 + (idx % 3),
    };
  });

  return { total, page, pageSize, rows };
}

const MOCK_COSTO: CostosRecetaDetalleResponse = {
  sku_pt: "PT-001",
  periodo: { from: "2025-09-01", to: "2025-09-14" },
  resumen: { mp_total: 124500, proceso_total: 34500, costo_unit: 312.5, costo_lote: 159000 },
  mp_detalle: [
    { sku: "MP-10", nombre: "Tensoactivo", qty_total: 75, costo_unit: 900, costo_total: 67500 },
    { sku: "MP-21", nombre: "Fragancia",   qty_total: 12, costo_unit: 800, costo_total: 9600  },
  ],
  proceso_detalle: [
    { proceso: "Mezclado", costo_unit: 80,  costo_total: 12000 },
    { proceso: "Envasado", costo_unit: 45,  costo_total:  6750 },
  ],
};
/* ------------------------- END MOCK DATA SECTION ------------------------- */

// API reales o mock según toggle

export async function fetchKPIs(filtros: FiltrosInformes): Promise<KPIResponse> {
  if (MOCK) {
    await sleep();
    return MOCK_KPIS;
  }
  const qs = buildQuery(filtros);
  const res = await fetch(`${BASE}/kpis?${qs}`);
  if (!res.ok) throw new Error("Error al cargar KPIs");
  return res.json();
}

export async function fetchSerieOTPorDia(
  filtros: FiltrosInformes
): Promise<SerieOTPorDiaResponse> {
  if (MOCK) {
    await sleep();
    return makeMockSeries(filtros.groupBy);
  }
  const qs = buildQuery(filtros);
  const res = await fetch(`${BASE}/series/ot-por-dia?${qs}`);
  if (!res.ok) throw new Error("Error al cargar series");
  return res.json();
}

export async function fetchTopProductos(
  filtros: FiltrosInformes,
  limit = 5
): Promise<TopProductosResponse> {
  if (MOCK) {
    await sleep();
    return { items: MOCK_TOP.items.slice(0, limit) };
  }
  const qs = buildQuery({ ...filtros });
  const url = `${BASE}/top-productos?${qs}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar top productos");
  return res.json();
}

export async function fetchTablaDetalle(
  filtros: FiltrosInformes
): Promise<TablaOTResponse> {
  if (MOCK) {
    await sleep();
    return makeMockTabla(filtros.page ?? 1, filtros.pageSize ?? 20);
  }
  const qs = buildQuery(filtros);
  const res = await fetch(`${BASE}/ot?${qs}`);
  if (!res.ok) throw new Error("Error al cargar detalle");
  return res.json();
}

export async function fetchCostosRecetaDetalle(
  skuPt: string,
  filtros: FiltrosInformes
): Promise<CostosRecetaDetalleResponse> {
  if (MOCK) {
    await sleep();
    return { ...MOCK_COSTO, sku_pt: skuPt };
  }
  const qs = buildQuery(filtros);
  const res = await fetch(`${BASE}/costos/receta?sku_pt=${encodeURIComponent(skuPt)}&${qs}`);
  if (!res.ok) throw new Error("Error al cargar costos por receta");
  return res.json();
}

export async function requestExport(
  payload: ExportRequest
): Promise<ExportResponseImmediate | ExportResponseJob> {
  if (MOCK) {
    await sleep(800);
    // Simulamos descarga directa
    return {
      downloadUrl: URL.createObjectURL(new Blob([`Mock ${payload.tipo}`], { type: "text/plain" })),
      expiresInSec: 300,
    };
  }
  const res = await fetch(`${BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error en export");
  return res.json();
}
