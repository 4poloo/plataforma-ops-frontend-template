// Tipos compartidos para el módulo de Informes
// Nota: Este archivo es .d.ts y exporta todos los tipos usados en el módulo.

export type EstadoOT = "Creada" | "En Proceso" | "Cerrada" | "Anulada";

export type GroupBy = "day" | "week" | "month";

export interface FiltrosInformes {
  from: string;            // ISO YYYY-MM-DD
  to: string;              // ISO YYYY-MM-DD
  linea: string[];         // líneas seleccionadas
  sku: string[];           // productos seleccionados
  estado: EstadoOT[];      // estados de OT
  groupBy: GroupBy;        // agregación de series
  page?: number;           // para tabla detalle
  pageSize?: number;       // para tabla detalle
}

export interface KPIResponse {
  ot_creadas: { hoy: number; semana: number; mes: number };
  ot_cerradas: { hoy: number; semana: number; mes: number };
  cumplimiento_pct: number;
  merma_pct: number;
}

export interface SerieOTPorDiaItem {
  bucket: string;     // fecha/semana/mes según groupBy
  linea: string;
  ot_creadas: number;
  ot_cerradas: number;
  unidades: number;
  merma: number;
}

export interface SerieOTPorDiaResponse {
  groupBy: GroupBy;
  items: SerieOTPorDiaItem[];
}

export interface TopProductoItem {
  sku: string;
  nombre: string;
  unidades: number;
}

export interface TopProductosResponse {
  items: TopProductoItem[];
}

export interface CostosRecetaDetalleResponse {
  sku_pt: string;
  periodo: { from: string; to: string };
  resumen: {
    mp_total: number;
    proceso_total: number;
    costo_unit: number;
    costo_lote: number;
  };
  mp_detalle: {
    sku: string;
    nombre: string;
    qty_total: number;
    costo_unit: number;
    costo_total: number;
  }[];
  proceso_detalle: {
    proceso: string;
    costo_unit: number;
    costo_total: number;
  }[];
}

export interface TablaOTRow {
  ot: string;
  estado: EstadoOT;
  fecha: string;       // ISO
  linea: string;
  sku_pt: string;
  descripcion: string;
  plan_u: number;
  real_u: number;
  merma_u: number;
  cumplimiento_pct: number;
}

export interface TablaOTResponse {
  total: number;
  page: number;
  pageSize: number;
  rows: TablaOTRow[];
}

export type ExportTipo =
  | "ot_consolidado"
  | "ot_linea_dia"
  | "costos_receta_detalle"
  | "top_productos"
  | "recetas_costos"
  | "catalogo_productos"
  | "costos_proceso";

export interface ExportRequest {
  tipo: ExportTipo;
  filtros: FiltrosInformes & { limit?: number };
}

export interface ExportResponseImmediate {
  downloadUrl: string;
  expiresInSec: number;
}

export interface ExportResponseJob {
  jobId: string;
}
