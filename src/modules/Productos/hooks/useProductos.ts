// hooks/useProductos.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Producto, ProductosFilter } from "../types/producto";
import {
  listProductosMixedAPI,   // GET /api/v1/products/by-mixed/ (name, dg, dsg, tipo, limit, skip, activo?)
  updateProductoAPI,       // PUT /api/v1/products/{id}
  toggleProductoActivoAPI,
  createProductoAPI,
  searchProductosBySkuAPI, // GET /api/v1/products/by-sku/{sku}
} from "../services/productos.api";
import { calcIVA19 } from "../utils/iva";
import { getSubfamilyNames } from "../constants/familias"
import { useLogAction } from "../../logs/hooks/useLogAction.ts";

/** ============================================================
 *  Utilidades internas
 *  ============================================================ */
function sortInClient(data: Producto[], field?: string, dir: 1 | -1 = 1) {
  if (!field) return data;
  const f = field === "nombre" ? "name" : field;
  const compare = (a: any, b: any) => {
    const va = (a?.[f] ?? "") as any;
    const vb = (b?.[f] ?? "") as any;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), "es", { sensitivity: "base" }) * dir;
  };
  return [...data].sort(compare);
}

/** ============================================================
 *  Hook principal (SIN MOCKS)
 *  ============================================================ */
export function useProductos() {
  // Filtros UI → server-side (by-mixed)
  const [filters, setFilters] = useState<ProductosFilter>({
    q: "",
    sku: "",
    familia: "",
    subfamilia: "",
    clasificacion: "",
    activo: "",            // ⬅️ tri-estado: "", "true", "false"
  });

  // Estado de consulta
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Orden client-side (hasta que el endpoint soporte sort)
  const [sortField, setSortField] = useState<string | undefined>("name"); // 'name' | 'sku'
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  // Datos remotos
  const [items, setItems] = useState<Producto[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales / notificaciones
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState<Producto | null>(null);
  const [isImportOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const logProductoEvent = useLogAction({ entity: "product" });

  // Debounce búsqueda
  const [qDebounced, setQDebounced] = useState(filters.q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(filters.q), 400);
    return () => clearTimeout(t);
  }, [filters.q]);

  const [skuDebounced, setSkuDebounced] = useState(filters.sku);
  useEffect(() => {
    const t = setTimeout(() => setSkuDebounced(filters.sku), 300);
    return () => clearTimeout(t);
  }, [filters.sku]);

  // Reset página al cambiar filtros principales
  useEffect(() => {
    setPage(1);
  }, [qDebounced, skuDebounced, filters.familia, filters.subfamilia, filters.clasificacion, filters.activo]);

  type ProductosData = { items: Producto[]; total?: number; hasMore?: boolean };

  const fetchProductosData = useCallback(async (): Promise<ProductosData> => {
    const skip = (page - 1) * limit;
    const skuTerm = (skuDebounced ?? "").trim();
    if (skuTerm) {
      const resp = await searchProductosBySkuAPI(skuTerm, { limit, skip });
      const ordered = sortInClient(resp.items, sortField, sortDir);
      return { items: ordered, total: resp.total, hasMore: resp.hasMore };
    }

    const resp = await listProductosMixedAPI({
      name: qDebounced || null,
      dg: filters.familia || null,
      dsg: filters.subfamilia || null,
      tipo: filters.clasificacion || null,
      activo: filters.activo === "" ? null : filters.activo === "true",
      limit,
      skip,
    });

    const ordered = sortInClient(resp.items, sortField, sortDir);
    return { items: ordered, total: resp.total, hasMore: resp.hasMore };
  }, [
    skuDebounced,
    qDebounced,
    filters.familia,
    filters.subfamilia,
    filters.clasificacion,
    filters.activo,
    limit,
    page,
    sortDir,
    sortField,
  ]);

  // Carga remota
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProductosData();
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Error al cargar productos");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProductosData]);

  // Autocierre de toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /** ============================================================
   *  Acciones (solo APIs)
   *  ============================================================ */

  const upsertProducto = async (p: Producto) => {
    setError(null);
    try {
      // Visual: calc IVA (el backend puede recalcular)
      const payloadVista: Producto = { ...p, priceVat: calcIVA19(p.priceNet) };

      if (p.id) {
        // UPDATE
        await updateProductoAPI(payloadVista);
        void logProductoEvent({
          event: "update",
          payload: {
            id: (payloadVista as any).id ?? payloadVista.sku,
            sku: payloadVista.sku,
            activo: payloadVista.activo,
            tipo: payloadVista.classification,
          },
          userAlias: payloadVista.sku,
        });
        setToast({ type: "success", msg: `Producto ${payloadVista.sku} actualizado.` });
      } else {
        // CREATE
        const creado = await createProductoAPI(payloadVista);
        void logProductoEvent({
          event: "create",
          payload: {
            id: (creado as any).id ?? payloadVista.sku,
            sku: creado.sku ?? payloadVista.sku,
            activo: creado.activo,
            tipo: creado.classification,
          },
          userAlias: creado.sku ?? payloadVista.sku,
        });
        setToast({ type: "success", msg: `Producto ${creado.sku} creado.` });
      }

      // Refetch manteniendo filtros/paginación y orden
      try {
        const data = await fetchProductosData();
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (refreshErr: any) {
        setError(refreshErr?.message ?? "Error al recargar productos");
      }
      return;
    } catch (e: any) {
      const msg = e?.message ?? (p.id ? "No se pudo actualizar el producto" : "No se pudo crear el producto");
      setToast({ type: "error", msg });
      throw e;
    }
  };


  const removeProducto = async (_sku: string) => {
    const msg = "La eliminación fue reemplazada por Deshabilitar/Habilitar.";
    setToast({ type: "error", msg });
    throw new Error(msg);
  };

  const toggleProductoActivo = async (id: string, nextActivo: boolean) => {
  if (!id) {
    setToast({ type: "error", msg: "Producto sin ID; no se pudo cambiar estado." });
    return;
  }

  // 1) Snapshot para rollback si falla
  const prevItems = items;

  // 2) Helper: ¿el item actualizado sigue calzando con el filtro 'activo'?
  const matchesActivoFilter = (value: boolean) => {
    if (filters.activo === "") return true;              // "Todos"
    return (filters.activo === "true") === value;        // "true"|"false"
  };

  // 3) Actualización optimista inmediata
  setItems((curr) => {
    const idx = curr.findIndex((x) => (x.id ?? x.sku) === id);
    if (idx < 0) return curr;

    const updated = { ...curr[idx], activo: nextActivo };
    const next = [...curr];

    // Si tras el cambio ya NO calza con el filtro, lo quitamos de la lista visible
    if (!matchesActivoFilter(nextActivo)) {
      next.splice(idx, 1);
      return next;
    }

    // Si calza con el filtro actual, solo lo actualizamos en su posición
    next[idx] = updated;
    return next;
  });

  try {
    // 4) Llamada real al backend
    const toggled = await toggleProductoActivoAPI(id, nextActivo);
    void logProductoEvent({
      event: nextActivo ? "enable" : "disable",
      payload: {
        id: toggled.id ?? id,
        sku: toggled.sku ?? id,
        activo: toggled.activo,
      },
      userAlias: toggled.sku ?? id,
    });

    setToast({
      type: "success",
      msg: nextActivo ? "Producto habilitado." : "Producto deshabilitado.",
    });

    // 5) (Opcional) Refetch para quedar 100% sincronizados con backend
    try {
      const data = await fetchProductosData();
      setItems(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (refreshErr: any) {
      setError(refreshErr?.message ?? "Error al recargar productos");
    }
  } catch (e: any) {
    // 6) Rollback si la API falla
    setItems(prevItems);
    setToast({ type: "error", msg: e?.message ?? "No se pudo cambiar el estado del producto" });
    throw e;
  }
};

  /** ============================================================
   *  Derivados/UI helpers
   *  ============================================================ */
  const subfamiliasDisponibles = useMemo(() => {
    if (!filters.familia) return [];
    return getSubfamilyNames(filters.familia);
  }, [filters.familia]);

  const toggleSort = (campo: string) => {
    const normalized = campo === "nombre" ? "name" : campo;
    if (normalized === sortField) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortField(normalized);
      setSortDir(1);
    }
    setPage(1);
  };

  return {
    // filtros
    filters, setFilters, subfamiliasDisponibles,
    // datos
    items, setItems, loading, error, total, hasMore,
    // paginación / orden
    page, setPage, limit, setLimit, sortField, sortDir, toggleSort,
    // modales
    isCreateOpen, setCreateOpen, editing, setEditing, deleting, setDeleting, isImportOpen, setImportOpen,
    // notificaciones
    toast, setToast,
    // acciones (solo reales)
    upsertProducto, toggleProductoActivo, removeProducto,
  };
}
