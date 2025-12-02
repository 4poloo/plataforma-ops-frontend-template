// src/modules/produccion/components/ProductosAFabricarGrid.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFieldArray,
  Controller,
  type Control,
  type UseFormWatch,
} from "react-hook-form";
import { FiTrash2, FiPlus, FiSearch } from "react-icons/fi";
import ProductPickerModal from "./ProductPickerModal";
import type { Product } from "../services/products.api";
import { fetchRecetaParaOT, type RecetaMaterialOT } from "../services/recetas-ot.api";
import { getWorkOrderByNumber } from "../services/work-orders.api";
import type { Encargado } from "../services/encargados.api";

/**
 * Componente “modo grilla” para Productos a Fabricar.
 * Columnas: # | SKU | Descripción | Cantidad | Línea
 * - Auto-agrega una fila cuando completas la última.
 * - Permite pegar filas desde Excel (tabuladas): SKU, Descripción, Cantidad, Línea.
 * - Lupa para buscar producto (SKU/Nombre).
 * - Autocompleta Descripción por SKU (onBlur, Enter/Tab, paste de una sola celda).
 */

const normalizeSku = (s: string) => (s ?? "").trim().toUpperCase();

type ProductoRow = {
  numeroOrden?: string;
  sku?: string;
  producto?: string;
  cantidad?: number;
  veces?: number;
  linea?: string;
  responsable?: string;
  receta?: string;
  recetaDesc?: string;
  cantidadBase?: number;
  componentes?: RecetaMaterialOT[];
};

export default function ProductosAFabricarGrid({
  control,
  watch,
  lineOptions,
  encargados,
  onEstadoResolve,
  onEstadoClear,
  reserveNumeroOt,
  releaseNumeroOt,
  initialNumeroOt,
  initialNumeroOtLoading,
}: {
  control: Control<any>;            // Control<...> del form padre
  watch: UseFormWatch<any>;         // UseFormWatch<...> del form padre
  lineOptions: readonly string[];           // ["AGUA","ROTATIVA","PERIFERICOS","ASEO HOGAR"]
  encargados: Encargado[];
  onEstadoResolve?: (payload: { numero: number; sku: string }) => Promise<void>;
  onEstadoClear?: (numero: number) => void;
  reserveNumeroOt?: () => Promise<number | null>;
  releaseNumeroOt?: () => Promise<void>;
  initialNumeroOt?: number | null;
  initialNumeroOtLoading?: boolean;
}) {
  const { fields, append, remove, update } = useFieldArray<any, "productos">({
    control,
    name: "productos",
  });

  // Estado del modal de productos
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const [loadingSku, setLoadingSku] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const lookupSeq = useRef<Record<number, number>>({});
  const numeroPorFila = useRef<Record<string, number | undefined>>({});
  const reservedNumbers = useRef<Set<number>>(new Set());
  const initialRowPending = useRef(false);

  const getRow = (index: number): ProductoRow => {
    const path = `productos.${index}` as const;
    const value = watch(path) as unknown;
    return (value as ProductoRow) ?? {};
  };

  const syncLineaEncargado = (
    row: ProductoRow,
    prefer: "auto" | "linea" | "responsable" = "auto"
  ): ProductoRow => {
    let linea = row.linea?.trim() ?? "";
    let responsable = row.responsable?.trim() ?? "";

    const matchLinea = (enc: Encargado) =>
      (enc?.linea ?? "").trim().toUpperCase() === linea.trim().toUpperCase();

    const encByNombre = responsable
      ? encargados.find((enc) => enc.nombre === responsable)
      : undefined;
    const encsByLinea = linea ? encargados.filter(matchLinea) : [];
    const encByLinea = encsByLinea[0];
    const encDefaultLinea = encsByLinea.find((enc) => enc.predeterminado);

    if (prefer === "responsable" && encByNombre) {
      linea = encByNombre.linea || linea;
    } else if (prefer === "linea" && linea) {
      if (!responsable || !encsByLinea.find((e) => e.nombre === responsable)) {
        responsable = (encDefaultLinea ?? encByLinea)?.nombre ?? responsable;
      }
    } else {
      if (encByNombre) {
        linea = encByNombre.linea || linea;
      } else if (linea) {
        responsable = (encDefaultLinea ?? encByLinea)?.nombre ?? responsable;
      }
    }

    if (responsable) {
      const enc = encargados.find((e) => e.nombre === responsable);
      if (enc?.linea && enc.linea !== linea) {
        linea = enc.linea;
      }
    }

    return {
      ...row,
      linea,
      responsable,
    };
  };

  const appendEmptyRow = useCallback(
    async (preferNumero?: number | null, allowReserve = true) => {
      let numero: number | null = null;
      let reserved = false;
      if (preferNumero != null && Number.isFinite(preferNumero)) {
        numero = Number(preferNumero);
      } else if (allowReserve && reserveNumeroOt) {
        try {
          numero = await reserveNumeroOt();
          reserved = numero != null;
        } catch {
          numero = null;
          reserved = false;
        }
      }
    append({
      numeroOrden: numero != null ? String(numero) : "",
      sku: "",
      producto: "",
      cantidad: 0,
      linea: "",
      responsable: "",
    });
      if (reserved && numero != null && Number.isFinite(numero)) {
        reservedNumbers.current.add(Number(numero));
      }
    },
    [append, reserveNumeroOt]
  );

  // Asegurar al menos 1 fila vacía
  useEffect(() => {
    if (fields.length === 0 && !initialRowPending.current && !initialNumeroOtLoading) {
      initialRowPending.current = true;
      void appendEmptyRow(initialNumeroOt, true).finally(() => {
        initialRowPending.current = false;
      });
    }
  }, [fields.length, appendEmptyRow, initialNumeroOt, initialNumeroOtLoading]);

  useEffect(() => {
    fields.forEach((_, idx) => {
      const row = getRow(idx);
      const synced = syncLineaEncargado(row);
      if (synced.linea !== row.linea || synced.responsable !== row.responsable) {
        update(idx, synced);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encargados]);

  const setLoading = (idx: number, value: boolean) => {
    setLoadingSku(prev => {
      if (value) return { ...prev, [idx]: true };
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const clearError = (idx: number) => {
    setErrors(prev => {
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const setError = (idx: number, message: string) => {
    setErrors(prev => ({ ...prev, [idx]: message }));
  };

  const resolveSkuForRow = async (rowIndex: number) => {
    const current = getRow(rowIndex);
    const skuRaw: string = current.sku ?? "";
    const normalized = normalizeSku(skuRaw);

    const next = { ...current, sku: normalized };
    update(rowIndex, next);

    if (!normalized) {
      clearError(rowIndex);
      setLoading(rowIndex, false);
      update(
        rowIndex,
        syncLineaEncargado({
          ...next,
          producto: "",
          receta: "",
          recetaDesc: "",
          cantidadBase: 0,
          componentes: undefined,
        })
      );
      return;
    }

    const seq = Date.now();
    lookupSeq.current[rowIndex] = seq;
    setLoading(rowIndex, true);
    clearError(rowIndex);
    try {
      const receta = await fetchRecetaParaOT(normalized);
      if (lookupSeq.current[rowIndex] !== seq) return;
      const cantidadActual = Number(next.cantidad ?? 0);
      const factor =
        receta.cantidadBase && receta.cantidadBase > 0
          ? cantidadActual / receta.cantidadBase
          : 0;
      update(
        rowIndex,
        syncLineaEncargado(
          {
            ...next,
            sku: receta.sku || normalized,
            producto: receta.descripcion,
            receta: receta.codigo,
            recetaDesc: receta.descripcion,
            cantidadBase: receta.cantidadBase,
            componentes: receta.materiales,
            veces: factor,
          },
          "auto"
        )
      );
    } catch (err) {
      if (lookupSeq.current[rowIndex] !== seq) return;
      let message = "No se pudo cargar la receta.";
      if (err instanceof Error && err.message) {
        try {
          const data = JSON.parse(err.message);
          if (data && typeof data === "object" && typeof data.detail === "string") {
            message = data.detail;
          } else {
            message = err.message;
          }
        } catch {
          const match = err.message.match(/\{"detail"\s*:\s*"([^"}]+)"/);
          if (match) {
            message = match[1];
          } else {
            message = err.message;
          }
        }
      }
      setError(rowIndex, message.trim() || "No se pudo cargar la receta.");
      update(
        rowIndex,
        syncLineaEncargado(
          {
            ...next,
            receta: "",
            recetaDesc: "",
            cantidadBase: 0,
            componentes: undefined,
            veces: 0,
          },
          "auto"
        )
      );
    } finally {
      if (lookupSeq.current[rowIndex] === seq) {
        setLoading(rowIndex, false);
      }
    }
  };

  const resolveNumeroOrden = async (rowIndex: number) => {
    const field = fields[rowIndex];
    const fieldId = field?.id;
    const current = getRow(rowIndex);
    const numeroRaw = (current.numeroOrden ?? "").toString().trim();
    if (!fieldId) return;

    if (!numeroRaw) {
      const previousNumero = numeroPorFila.current[fieldId];
      if (previousNumero) {
        onEstadoClear?.(previousNumero);
      }
      numeroPorFila.current[fieldId] = undefined;
      if (previousNumero && reservedNumbers.current.has(previousNumero)) {
        reservedNumbers.current.delete(previousNumero);
        void releaseNumeroOt?.();
      }
      clearError(rowIndex);
      return;
    }

    const numero = Number(numeroRaw);
    if (!Number.isFinite(numero) || numero <= 0) {
      setError(rowIndex, "El N° de Orden debe ser numérico mayor a cero.");
      const previousNumero = numeroPorFila.current[fieldId];
      if (previousNumero && previousNumero !== numero) {
        onEstadoClear?.(previousNumero);
      }
      numeroPorFila.current[fieldId] = undefined;
      if (reservedNumbers.current.has(numero)) {
        reservedNumbers.current.delete(numero);
        void releaseNumeroOt?.();
      }
      if (previousNumero && reservedNumbers.current.has(previousNumero)) {
        reservedNumbers.current.delete(previousNumero);
        void releaseNumeroOt?.();
      }
      return;
    }

    const previousNumero = numeroPorFila.current[fieldId];
    if (previousNumero && previousNumero !== numero) {
      onEstadoClear?.(previousNumero);
    }
    if (previousNumero && reservedNumbers.current.has(previousNumero) && previousNumero !== numero) {
      reservedNumbers.current.delete(previousNumero);
      void releaseNumeroOt?.();
    }

    try {
      const order = await getWorkOrderByNumber(numero);
      if (!order) {
        setError(rowIndex, "OT no encontrada.");
        numeroPorFila.current[fieldId] = undefined;
        onEstadoClear?.(numero);
        return;
      }

      const contenido = order.contenido ?? {
        SKU: "",
        Cantidad: 0,
        Encargado: "",
        linea: "",
        fecha: "",
        fecha_ini: "",
        fecha_fin: "",
      };

      let recetaDescripcion = "";
      let recetaCodigo = "";
      let recetaBase = 0;
      let componentes: RecetaMaterialOT[] = [];

      if (contenido.SKU) {
        try {
          const receta = await fetchRecetaParaOT(contenido.SKU);
          recetaDescripcion = receta.descripcion;
          recetaCodigo = receta.codigo;
          recetaBase = receta.cantidadBase || 0;
          componentes = receta.materiales;
        } catch {
          // si no encontramos receta, mantenemos campos básicos
        }
      }

      const cantidad = Number(contenido.Cantidad ?? 0);
      const nextRow = syncLineaEncargado(
        {
          numeroOrden: numeroRaw,
          sku: contenido.SKU ?? "",
          producto: recetaDescripcion || contenido.SKU || "",
          cantidad,
          linea: contenido.linea ?? "",
          responsable: contenido.Encargado ?? "",
          receta: recetaCodigo,
          recetaDesc: recetaDescripcion,
          cantidadBase: recetaBase,
          componentes,
          veces: recetaBase > 0 ? cantidad / recetaBase : 0,
        },
        "auto"
      );

      update(rowIndex, nextRow);
      clearError(rowIndex);
      numeroPorFila.current[fieldId] = numero;

      if (onEstadoResolve) {
        const sku = nextRow.sku ?? contenido.SKU ?? "";
        try {
          await onEstadoResolve({ numero, sku });
        } catch {
          // silencioso: el padre gestiona errores
        }
      }
    } catch (err) {
      let message = "No se pudo cargar la OT.";
      if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(rowIndex, message);
      numeroPorFila.current[fieldId] = undefined;
      onEstadoClear?.(numero);
    }
  };

  // Pegado desde Excel (SKU [tab] Descripción [tab] Cantidad [tab] Línea)
  const handlePasteMulti = async (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number) => {
    const text = e.clipboardData.getData("text");
    if (!text || !text.includes("\n")) return; // si es una sola celda, deja que el caller lo maneje
    e.preventDefault();

    const rows = text
      .split(/\r?\n/)
      .map(r => r.trim())
      .filter(Boolean)
      .map(r => r.split("\t"));

    if (rows.length === 0) return;

    for (const [i, cols] of rows.entries()) {
      let numeroOrden = "";
      let sku = "";
      let producto = "";
      let cantidadRaw = "";
      let linea = "";
      let responsable = "";

      if (cols.length >= 5) {
        numeroOrden = cols[0] ?? "";
        sku = cols[1] ?? "";
        producto = cols[2] ?? "";
        cantidadRaw = cols[3] ?? "";
        linea = cols[4] ?? "";
        responsable = cols[5] ?? "";
      } else {
        [sku = "", producto = "", cantidadRaw = "", linea = "", responsable = ""] = cols;
      }
      const cantidad = Number(String(cantidadRaw).replace(",", ".")) || 0;

      const idx = rowIndex + i;
      const baseRow = idx < fields.length ? getRow(idx) : {};
      const prefer = linea ? "linea" : responsable ? "responsable" : "auto";
      let numeroAuto: number | null = null;
      if (!numeroOrden?.trim() && reserveNumeroOt) {
        try {
          numeroAuto = await reserveNumeroOt();
          numeroOrden = numeroOrden?.trim() || (numeroAuto != null ? String(numeroAuto) : "");
          if (numeroAuto != null && Number.isFinite(numeroAuto)) {
            reservedNumbers.current.add(Number(numeroAuto));
          }
        } catch {
          // si falla el correlativo, dejamos la fila sin número
        }
      }
      const nextRow = syncLineaEncargado(
        {
          ...(baseRow as ProductoRow),
          numeroOrden,
          sku,
          producto,
          cantidad,
          linea,
          responsable,
        },
        prefer
      );
      if (idx < fields.length) {
        update(idx, nextRow);
      } else {
        append(nextRow);
      }
      const numeroFinal = numeroOrden?.trim() || (numeroAuto != null ? String(numeroAuto) : "");
      if (numeroFinal) {
        setTimeout(() => resolveNumeroOrden(idx), 0);
      } else {
        setTimeout(() => resolveSkuForRow(idx), 0);
      }
    }
  };

  // Handler de pegado "inteligente" en SKU:
  // - Si es multi-línea -> usamos el flujo existente (SKU, Desc, Cant, Línea).
  // - Si es una sola celda (ej. un SKU) -> dejamos pegar y luego hacemos lookup.
  const handlePasteSmart = (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number) => {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\n")) {
      // Multilínea: usar el flujo existente
      void handlePasteMulti(e, rowIndex);
      return;
    }
    // Una sola celda: dejar que pegue el valor y luego buscar
    // (esperamos al siguiente tick para que el valor ya esté en el input)
    setTimeout(() => resolveSkuForRow(rowIndex), 0);
  };

  // Abre el buscador para una fila específica
  const openPickerFor = (rowIdx: number) => {
    setPickerRow(rowIdx);
    setPickerOpen(true);
  };

  const removeRow = (rowIdx: number) => {
    const field = fields[rowIdx];
    const fieldId = field?.id;
    const numeroRaw = (getRow(rowIdx).numeroOrden ?? "").toString().trim();
    if (numeroRaw) {
      const numero = Number(numeroRaw);
      if (Number.isFinite(numero) && numero > 0) {
        onEstadoClear?.(numero);
        if (reservedNumbers.current.has(numero)) {
          reservedNumbers.current.delete(numero);
          void releaseNumeroOt?.();
        }
      }
    }
    if (fieldId) {
      delete numeroPorFila.current[fieldId];
    }
    remove(rowIdx);
  };

  // Query inicial del picker (SKU o Descripción actual de la fila)
  const initialQuery =
    pickerRow == null
      ? ""
      : (() => {
          const row = getRow(pickerRow);
          return row.sku || row.producto || "";
        })();

  // Al seleccionar un producto en el modal
  const onSelectProduct = (p: Product) => {
    if (pickerRow == null) return;
    const current = getRow(pickerRow);
    const nextRow = syncLineaEncargado(
      {
        ...current,
        sku: p.sku,
        producto: p.nombre,
      },
      "auto"
    );
    update(pickerRow, nextRow);
    setTimeout(() => resolveSkuForRow(pickerRow), 0);
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border px-3 py-2 text-sm text-foreground/70">
        Modo Grilla — pega desde Excel: SKU, Descripción, Cantidad, Línea
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground/70">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">N° Orden</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Línea</th>
              <th className="px-3 py-2">Encargado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>

          <tbody>
            {fields.map((f, idx) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-3 py-2">{idx + 1}</td>

                {/* Número de OT */}
                <td className="px-3 py-1">
                  <Controller
                    control={control}
                    name={`productos.${idx}.numeroOrden`}
                    render={({ field }) => (
                      <input
                        {...field}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onBlur={(event) => {
                          field.onBlur();
                          const value = event.target.value?.trim() ?? "";
                          if (value !== field.value) {
                            field.onChange(value);
                          }
                          setTimeout(() => resolveNumeroOrden(idx), 0);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Tab") {
                            setTimeout(() => resolveNumeroOrden(idx), 0);
                          }
                        }}
                        onPaste={() => {
                          setTimeout(() => resolveNumeroOrden(idx), 0);
                        }}
                        className="w-28 rounded border border-border px-2 py-1 text-center outline-none focus:ring-2 focus:ring-primary"
                        placeholder="0000"
                        title="Número de OT"
                      />
                    )}
                  />
                </td>

                {/* SKU + Lupa */}
                <td className="px-3 py-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`productos.${idx}.sku`}
                        render={({ field }) => (
                          <input
                            {...field}
                            onPaste={(e) => handlePasteSmart(e, idx)}
                            onBlur={() => {
                              field.onBlur();
                              resolveSkuForRow(idx);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                // Ejecutar lookup tras aplicar el cambio del input
                                setTimeout(() => resolveSkuForRow(idx), 0);
                              }
                            }}
                            className="w-full rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                            placeholder="SKU"
                          />
                        )}
                      />
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-md border border-border text-foreground/70 hover:bg-muted"
                        title="Buscar producto"
                        onClick={() => openPickerFor(idx)}
                      >
                        <FiSearch className="h-4 w-4" />
                      </button>
                    </div>
                    {loadingSku[idx] && (
                      <span className="text-xs text-foreground/60">Buscando…</span>
                    )}
                    {errors[idx] && (
                      <span className="text-xs text-red-600">{errors[idx]}</span>
                    )}
                  </div>
                </td>

                {/* Descripción */}
                <td className="px-3 py-1">
                  <Controller
                    control={control}
                    name={`productos.${idx}.producto`}
                    render={({ field }) => (
                      <input
                        {...field}
                        className="w-full rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Descripción del producto"
                      />
                    )}
                  />
                </td>

                {/* Cantidad */}
                <td className="px-3 py-1">
                  <Controller
                    control={control}
                    name={`productos.${idx}.cantidad`}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        step="0.001"
                        min={0}
                        className="w-32 rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        placeholder="0"
                      />
                    )}
                  />
                </td>

                {/* Línea */}
                <td className="px-3 py-1">
                  <Controller
                    control={control}
                    name={`productos.${idx}.linea`}
                    render={({ field }) => {
                      const value = (field.value ?? "") as string;
                      return (
                        <select
                          name={field.name}
                          ref={field.ref}
                          value={value}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const lineaSeleccionada = event.target.value;
                            const nextRow = syncLineaEncargado(
                              {
                                ...getRow(idx),
                                linea: lineaSeleccionada,
                              },
                              "linea"
                            );
                            update(idx, nextRow);
                          }}
                          className="w-44 rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">—</option>
                          {lineOptions.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      );
                    }}
                  />
                </td>

                {/* Encargado de linea */}
                <td className="px-3 py-1">
                  <Controller
                    control={control}
                    name={`productos.${idx}.responsable`}
                    render={({ field }) => {
                      const value = (field.value ?? "") as string;
                      const row = getRow(idx);
                      const lineaSeleccionada = (row.linea ?? "").toString().trim();
                      const opciones = lineaSeleccionada
                        ? encargados.filter(
                            (enc) =>
                              (enc.linea ?? "").trim().toUpperCase() ===
                              lineaSeleccionada.trim().toUpperCase()
                          )
                        : encargados;
                      return (
                        <select
                          name={field.name}
                          ref={field.ref}
                          value={value}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const responsableSeleccionado = event.target.value;
                            const nextRow = syncLineaEncargado(
                              {
                                ...getRow(idx),
                                responsable: responsableSeleccionado,
                              },
                              "responsable"
                            );
                            update(idx, nextRow);
                          }}
                          className="w-44 rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">—</option>
                          {opciones.map((enc) => (
                            <option key={enc._id} value={enc.nombre}>
                              {enc.nombre} {enc.predeterminado ? "(Predeterminado)" : ""}
                            </option>
                          ))}
                        </select>
                      );
                    }}
                  />
                </td>

                {/* Acciones */}
                <td className="px-3 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
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

      {/* Botón agregar (por si el auto-append aún no se activa) */}
      <div className="border-t border-border p-3 text-right">
        <button
          type="button"
          onClick={() => void appendEmptyRow()}
          className="inline-flex items-center gap-2 rounded-lg hover:bg-success px-4 py-2 text-sm font-medium text-success border-1 border-sucess hover:text-white bg-white"
        >
          <FiPlus className="h-4 w-4" /> Agregar fila
        </button>
      </div>

      {/* Modal de búsqueda */}
      <ProductPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectProduct}
        initialQuery={initialQuery}
        loadAllOnOpen
      />
    </div>
  );
}
