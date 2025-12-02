// src/modules/produccion/components/ProductosAFabricarForm.tsx
import { useState } from "react";
import {
  useForm,
  useFieldArray,
  type Control,
  type FieldArrayWithId,
  type FieldValues,
} from "react-hook-form";
import { FiSearch, FiPlus, FiXCircle, FiTrash2 } from "react-icons/fi";
import { fetchRecetaParaOT, type RecetaParaOT } from "../services/recetas-ot.api";
import { useFlashBanner } from "../../../global/components/FlashBanner";

/**
 * Componente “modo formulario” para Productos a Fabricar.
 * - Mantiene la grilla superior con los ítems agregados.
 * - Abajo un sub-form para agregar un producto (SKU/Receta/Cantidades).
 * - No asume un tipo de formulario global: acepta cualquier `control` con campo "productos".
 */
type ProductoField = FieldArrayWithId<FieldValues, "productos", "id"> & {
  sku?: string;
  producto?: string;
  receta?: string;
  cantidad?: number;
};

export default function ProductosAFabricarForm({
  control,
  defaultLinea = "",
  defaultResponsable = "",
}: {
  control: Control<FieldValues>;
  defaultLinea?: string;
  defaultResponsable?: string;
}) {
  const { fields, append, remove } = useFieldArray<FieldValues, "productos">({ control, name: "productos" });
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [recetaActual, setRecetaActual] = useState<RecetaParaOT | null>(null);
  const { showError } = useFlashBanner();

  // Sub-form de detalle (independiente del form principal)
  const detalle = useForm({
    defaultValues: {
      sku: "",
      producto: "",
      receta: "",
      recetaDesc: "",
      cantidadBase: 1,
      cantidad: 1,
      veces: 1,
    },
  });

  const d = detalle;

  const normalizeSku = (sku: string) => (sku ?? "").trim().toUpperCase();

  const lookupReceta = async (force = false): Promise<RecetaParaOT | null> => {
    const skuValue = normalizeSku(d.getValues("sku"));
    if (!skuValue) {
      setLookupError("Ingresa un SKU antes de buscar.");
      setRecetaActual(null);
      return null;
    }
    if (!force && recetaActual && normalizeSku(recetaActual.sku) === skuValue) {
      return recetaActual;
    }
    setLoadingReceta(true);
    setLookupError(null);
    try {
      const receta = await fetchRecetaParaOT(skuValue);
      setRecetaActual(receta);
      d.setValue("sku", receta.sku);
      d.setValue("producto", receta.descripcion);
      d.setValue("receta", receta.codigo);
      d.setValue("recetaDesc", receta.descripcion);
      d.setValue("cantidadBase", receta.cantidadBase || 1);
      return receta;
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "No se encontró una receta para el SKU ingresado.";
      setLookupError(message);
      setRecetaActual(null);
      return null;
    } finally {
      setLoadingReceta(false);
    }
  };

  const agregarDetalle = async () => {
    const v = d.getValues();

    const receta = await lookupReceta(true);
    if (!receta) return;

    // Validación mínima
    if (!v.sku.trim() || Number(v.cantidad) <= 0) {
      showError("Completa SKU y una Cantidad válida antes de agregar.");
      return;
    }

    const cantidad = Number(v.cantidad || 0);
    const base = receta.cantidadBase || 0;
    const factor = base > 0 ? cantidad / base : 0;

    append({
      sku: receta.sku,
      producto: receta.descripcion,
      receta: receta.codigo,
      recetaDesc: receta.descripcion,
      cantidadBase: receta.cantidadBase || 0,
      cantidad,
      veces: factor,
      linea: defaultLinea,
      responsable: defaultResponsable,
      componentes: receta.materiales,
    });

    d.reset({ sku: "", producto: "", receta: "", recetaDesc: "", cantidadBase: 1, cantidad: 1, veces: 1 });
    setRecetaActual(null);
    setLookupError(null);
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border px-3 py-2 text-sm text-foreground/70">
        Productos a fabricar (agregados)
      </div>

      {/* Grilla superior */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground/70">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Receta</th>
              <th className="px-3 py-2">Cantidad a fabricar</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-foreground/60">
                  Aún no agregas productos.
                </td>
              </tr>
            )}
            {fields.map((f: ProductoField, idx: number) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-3 py-2">{idx + 1}</td>
                <td className="px-3 py-2">{f.producto}</td>
                <td className="px-3 py-2">{f.sku}</td>
                <td className="px-3 py-2">{f.receta}</td>
                <td className="px-3 py-2">{f.cantidad}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                                        className="inline-flex items-center gap-1 rounded-lg border hover:text-red-500 hover:border-red-500 border-secondary px-2 py-1 text-xs text-danger hover:bg-danger/10"
                    title="Eliminar"
                  >
                    <FiTrash2 className="h-4 w-4" />
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sub-form inferior */}
      <div className="grid gap-4 border-t border-border p-4">
        {/* Producto */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-foreground/70">Producto (SKU)</label>
            <div className="flex items-center gap-2">
              <input
                {...d.register("sku", {
                  onBlur: () => {
                    void lookupReceta(false);
                  },
                })}
                placeholder="Ej: 801038"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                title="Buscar producto"
                onClick={() => void lookupReceta(true)}
                disabled={loadingReceta}
                className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground/70 hover:bg-muted disabled:opacity-60"
              >
                <FiSearch className="h-4 w-4" />
              </button>
            </div>
            {loadingReceta && (
              <p className="mt-1 text-xs text-foreground/60">Buscando receta…</p>
            )}
            {lookupError && (
              <p className="mt-1 text-xs text-red-600">{lookupError}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-foreground/70">Descripción Producto</label>
            <input
              {...d.register("producto")}
              placeholder="Nombre/Descripción"
              readOnly
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Receta */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-foreground/70">Receta</label>
            <input
              {...d.register("receta")}
              placeholder="Ej: 001"
              readOnly
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-foreground/70">Descripción Receta</label>
            <input
              {...d.register("recetaDesc")}
              placeholder="Descripción opcional"
              readOnly
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Cantidades */}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">Cantidad a fabricar</label>
            <input
              type="number"
              step="0.001"
              min={0.0001}
              {...d.register("cantidad", { valueAsNumber: true })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Acciones del sub-form */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-secondary hover:text-white text-secondary hover:bg-secondary hover:border-red-500"
            onClick={() => {
              d.reset({ sku: "", producto: "", receta: "", recetaDesc: "", veces: 1 });
              setRecetaActual(null);
              setLookupError(null);
            }}
          >
            <FiXCircle className="h-4 w-4" /> Cancelar
          </button>

          <button
            type="button"
            onClick={agregarDetalle}
            disabled={loadingReceta}
            className="inline-flex items-center gap-2 rounded-lg bg-white text-success border-1 border-success px-4 py-2 text-sm font-medium hover:text-white hover:bg-success disabled:opacity-60"
          >
            <FiPlus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
