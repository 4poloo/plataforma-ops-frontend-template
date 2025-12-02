import { useEffect, useMemo, useState } from "react";
import type { Filtros, Proceso, SortKey, SortOrder } from "../types";
import { procesosService } from "../services/procesos.service";
import { useLogAction } from "../../logs/hooks/useLogAction";

const defaultFiltros: Filtros = {
  search: "",
  costoMin: null,
  costoMax: null,
  sortBy: "codigo",
  sortOrder: "asc",
  page: 1,
  pageSize: 25,
};

export function useProcesos() {
  const [items, setItems] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(defaultFiltros);

  const logProcesoEvent = useLogAction({ entity: "process" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await procesosService.list();
        setItems(data);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Error cargando procesos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtro + orden (SIN mutar el arreglo original)
  const filtered = useMemo(() => {
    const q = filtros.search.trim().toLowerCase();
    const min = typeof filtros.costoMin === "number" ? filtros.costoMin : -Infinity;
    const max = typeof filtros.costoMax === "number" ? filtros.costoMax : Infinity;

    const list = items.filter((p) => {
      const hit =
        !q ||
        p.codigo.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q);
      const inRange = p.costo >= min && p.costo <= max;
      return hit && inRange;
    });

    const key: SortKey = filtros.sortBy;
    const order: SortOrder = filtros.sortOrder;

    // clonar antes de ordenar
    const cloned = [...list];
    cloned.sort((a, b) => {
      const av = a[key] as any;
      const bv = b[key] as any;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "es");
      return order === "asc" ? cmp : -cmp;
    });
    return cloned;
  }, [items, filtros.search, filtros.costoMin, filtros.costoMax, filtros.sortBy, filtros.sortOrder]);

  const paged = useMemo(() => {
    const start = (filtros.page - 1) * filtros.pageSize;
    return filtered.slice(start, start + filtros.pageSize);
  }, [filtered, filtros.page, filtros.pageSize]);

  // CRUD
  const create = async (p: Proceso) => {
    await procesosService.create(p);
    setItems((prev) => [...prev, p]);
    void logProcesoEvent({
      event: "create",
      payload: {
        codigo: p.codigo,
        nombre: p.nombre,
        costo: p.costo,
      },
      userAlias: p.codigo,
    });
  };

  const update = async (codigo: string, patch: Partial<Proceso>) => {
    const upd = await procesosService.update(codigo, patch);
    setItems((prev) =>
      prev.map((x) =>
        x.codigo.toUpperCase() === codigo.toUpperCase() ? upd : x
      )
    );
    void logProcesoEvent({
      event: "update",
      payload: {
        codigo: upd.codigo,
        nombre: upd.nombre,
        costo: upd.costo,
      },
      userAlias: upd.codigo,
    });
  };

  const remove = async (codigo: string) => {
    await procesosService.remove(codigo);
    setItems((prev) =>
      prev.filter((x) => x.codigo.toUpperCase() !== codigo.toUpperCase())
    );
    void logProcesoEvent({
      event: "delete",
      payload: { codigo },
      userAlias: codigo,
    });
  };

  const bulkCreate = async (nuevos: Proceso[]) => {
    await procesosService.bulkCreate(nuevos);
    const data = await procesosService.list();
    setItems(data);
    void logProcesoEvent({
      event: "bulk_create",
      payload: {
        inserted: nuevos.length,
        codigos: nuevos.map((n) => n.codigo),
      },
      userAlias: nuevos[0]?.codigo ?? "bulk",
    });
    return { inserted: nuevos.length };
  };

  return {
    items,
    loading,
    error,
    filtros,
    setFiltros,
    total: filtered.length,
    visible: paged,
    create,
    update,
    remove,
    bulkCreate,
    resetPage: () => setFiltros((f) => ({ ...f, page: 1 })),
    setPage: (p: number) => setFiltros((f) => ({ ...f, page: p })),
  };
}
