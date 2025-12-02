import { useEffect, useState } from "react";
import type { EstadoFiltro } from "../hooks/useRecetas";

type Props = {
  codigo: string;
  setCodigo: (v: string) => void;
  descripcion: string;
  setDescripcion: (v: string) => void;
  skuExacto: string;
  setSkuExacto: (v: string) => void;
  estado: "todos" | "habilitadas" | "deshabilitadas";
  setEstado: (v: "todos" | "habilitadas" | "deshabilitadas") => void;
  onNew: () => void;
  onImport: () => void;
  onRefresh: () => void;
  canCreate?: boolean;
  canImport?: boolean;
};

export default function RecetasSearchBar({
  codigo: _codigo,
  setCodigo,
  descripcion,
  setDescripcion,
  skuExacto,
  setSkuExacto,
  estado,
  setEstado,
  onNew,
  onImport,
  onRefresh,
  canCreate = true,
  canImport = true,
}: Props) {
  const [skuDraft, setSkuDraft] = useState(skuExacto);

  useEffect(() => {
    setSkuDraft(skuExacto);
  }, [skuExacto]);

  const submitSearch = () => {
    setSkuExacto(skuDraft.trim());
    onRefresh();
  };

  // UX: presionar Enter en cualquier campo dispara la búsqueda
  const onEnter = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (e.key === "Enter") submitSearch();
  };

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Búsqueda general */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Búsqueda por SKU o nombre (LIKE)
          </label>
          <input
            value={descripcion}
            onChange={(e) => {
              const value = e.target.value;
              setDescripcion(value);
              setCodigo(value);
              if (skuExacto) {
                setSkuExacto("");
                setSkuDraft("");
              }
            }}
            onKeyDown={onEnter}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder={'Ej: PT-100 o "Granola"'}
            aria-label="Buscar recetas por coincidencia parcial"
          />
        </div>

        {/* Búsqueda exacta */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Búsqueda exacta por código PT
          </label>
          <input
            value={skuDraft}
            onChange={(e) => setSkuDraft(e.target.value)}
            onKeyDown={onEnter}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Ingresa el código completo (PT-0001)"
            aria-label="Buscar receta por código exacto"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="md:w-60">
          <label className="text-sm text-gray-500">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoFiltro)}
            onKeyDown={onEnter}
            className="mt-1 w-full rounded-md border px-3 py-2"
            aria-label="Estado de receta"
          >
            <option value="todos">Todos</option>
            <option value="habilitadas">Habilitadas</option>
            <option value="deshabilitadas">Deshabilitadas</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={submitSearch}
            className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white"
          >
            Buscar
          </button>
          {canImport && (
            <button
              onClick={onImport}
              className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white"
            >
              Importar
            </button>
          )}
          {canCreate && (
            <button
              onClick={onNew}
              className="rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-green-500"
            >
              Nueva Receta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
