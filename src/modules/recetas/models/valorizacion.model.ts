export interface ValorizacionLinea {
  sku: string;
  descripcion?: string;
  unidad: string;
  cantidad: number;

  costoUnitarioPromedio: number;      // viene de backend en real
  costoTotalPromedio: number;         // cantidad * costoUnitarioPromedio

  costoReposicion: number;            // viene de backend en real
  costoTotalReposicion: number;       // cantidad * costoReposicion

  fechaUltimoCosto?: string;          // ISO
}

export interface ValorizacionTotales {
  costoMateriales: number;
  costoProcesos: number;
  total: number; // costoMateriales + costoProcesos
}

export interface ValorizacionResp {
  recetaId: string;
  version: number;
  cantidadBase: number;
  unidadBase: string;
  costoProcesos: number;
  lineas: ValorizacionLinea[];
  totales: {
    promedio: ValorizacionTotales;
    reposicion: ValorizacionTotales;
  };
}
