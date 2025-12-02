import { useCallback, useEffect, useMemo, useState } from "react";
import { recetasApi } from "../services/recetas.api";
import type { RecetaListadoDTO } from "../models/receta.model";

export type EstadoFiltro = "todos" | "habilitadas" | "deshabilitadas";

export function useRecetas() {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [skuExacto, setSkuExacto] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RecetaListadoDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Resetear paginación cuando cambien filtros
  useEffect(() => {
    setPage(1);
  }, [codigo, descripcion, estado, skuExacto]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const habilitada =
        estado === "todos" ? undefined : estado === "habilitadas" ? true : false;
      const exact = skuExacto.trim();
      if (exact) {
        const exactItems = await recetasApi.searchByPtId(exact);
        let items = exactItems;
        if (habilitada !== undefined) {
          items = items.filter((r) => r.habilitada === habilitada);
        }
        setRows(items);
        setTotal(items.length);
        return;
      }
      const res = await recetasApi.search({
        codigo,
        descripcion,
        habilitada,
        page,
        limit,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : "Ha ocurrido un error al cargar las recetas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [codigo, descripcion, estado, page, skuExacto]);

  useEffect(() => {
    fetch();
  }, [fetch, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);
  const clearError = useCallback(() => setError(null), []);

  return {
    codigo, setCodigo,
    descripcion, setDescripcion,
    skuExacto, setSkuExacto,
    estado, setEstado,
    loading, rows, total, page, setPage, pages,
    refresh,
    error,
    clearError,
  };
}
