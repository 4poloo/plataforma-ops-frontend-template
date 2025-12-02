import { recetasApi } from "../../recetas/services/recetas.api";
import type { RecetaDetalleDTO, MaterialLinea } from "../../recetas/models/receta.model";

export type RecetaMaterialOT = {
  sku: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
};

export type RecetaParaOT = {
  sku: string;
  codigo: string;
  descripcion: string;
  cantidadBase: number;
  materiales: RecetaMaterialOT[];
};

const CACHE = new Map<string, RecetaParaOT>();

const normalize = (sku: string) => (sku ?? "").trim().toUpperCase();

function adaptMaterial(material: MaterialLinea): RecetaMaterialOT {
  return {
    sku: (material.sku ?? "").trim(),
    descripcion: (material.descripcion ?? "").trim(),
    cantidad: Number(material.cantidad ?? 0),
    unidad: (material.unidad ?? "").trim(),
  };
}

function adaptReceta(detalle: RecetaDetalleDTO): RecetaParaOT {
  return {
    sku: (detalle.codigo ?? "").trim(),
    codigo: (detalle.codigo ?? "").trim(),
    descripcion: (detalle.descripcion ?? "").trim() || detalle.codigo,
    cantidadBase: Number(detalle.cantidadBase ?? 0),
    materiales: Array.isArray(detalle.materiales)
      ? detalle.materiales.map(adaptMaterial)
      : [],
  };
}

export async function fetchRecetaParaOT(sku: string): Promise<RecetaParaOT> {
  const key = normalize(sku);
  if (!key) {
    throw new Error("SKU requerido.");
  }
  const cached = CACHE.get(key);
  if (cached) return cached;

  const detalle = await recetasApi.getById(key);
  if (!detalle) {
    throw new Error(`Receta para SKU ${key} no encontrada.`);
  }
  const adapted = adaptReceta(detalle);
  const codes = new Set<string>([
    key,
    normalize(adapted.sku),
    normalize(adapted.codigo),
  ].filter(Boolean));
  codes.forEach((code) => CACHE.set(code, adapted));
  return adapted;
}
