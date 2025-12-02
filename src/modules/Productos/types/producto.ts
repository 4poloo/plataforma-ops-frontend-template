export type Clasificacion = "MP" | "PT";

export interface Producto {
  id?: string;
  sku: string;
  barcode?: string | null;
  name: string;             // Descripción
  uom: string;              // UN, KG, LT, etc.
  groupCode?: number | null;
  groupName?: string | null;
  subgroupCode?: number | null;
  subgroupName?: string | null;
  priceNet: number;         // CLP
  priceVat?: number;        // Calculado UI (backend recalcula)
  replacementCost?: number | null;
  classification: Clasificacion; // MP | PT
  createdAt?: string;
  updatedAt?: string;
  activo?: boolean | null; // 1 | 0
}

export interface ProductosFilter {
  q: string;
  sku: string;
  familia: string;
  subfamilia: string;
  clasificacion: "" | Clasificacion;
  activo: "" | "true" | "false";
}
