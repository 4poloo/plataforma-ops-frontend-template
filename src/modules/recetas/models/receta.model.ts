export type Unidad = 'UN' | 'KG' | 'LT' | string;

export interface MaterialLinea {
  sku: string;
  descripcion?: string;
  unidad: Unidad;
  cantidad: number;
  /** Merma en % (0–100). Opcional; si no viene, el front asume 0. */
  mermaPct?: number;            // 👈 nuevo
}

export interface RecetaListadoDTO {
  id: string;
  codigo: string;
  descripcion: string;
  version: number;
  vigente: boolean;
  habilitada: boolean;
  actualizadoEn: string; // ISO (si no hay, enviamos '')
  actualizadoPor: string;
}

export interface RecetaDetalleDTO {
  id: string;
  codigo: string;
  descripcion: string;
  version: number;
  vigente: boolean;
  habilitada: boolean;
  cantidadBase: number;
  unidadBase: Unidad;
  materiales: MaterialLinea[];
  auditoria: {
    creadoPor: string;
    creadoEn: string;
    modPor?: string;
    modEn?: string;
  };
}
