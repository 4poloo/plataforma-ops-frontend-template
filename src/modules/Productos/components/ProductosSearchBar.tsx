import type { ProductosFilter } from "../types/producto";

interface Props {
  filters: ProductosFilter;
  setFilters: (updater: (f: ProductosFilter) => ProductosFilter) => void;
  familias: string[];
  subfamilias: string[];
  onClear: () => void;
}

export default function ProductosSearchBar({
  filters, setFilters, familias, subfamilias, onClear,
}: Props) {
  return (
    <section className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Búsqueda por código (SKU)</label>
            <input
              value={filters.sku}
              onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}
              placeholder="Ej: PT-000123"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-primary hover:bg-gray-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Búsqueda por nombre, grupo y subgrupo</label>
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Nombre, familia o subfamilia…"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-primary hover:bg-gray-50"
            />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Familia</label>
            <select
              value={filters.familia}
              onChange={(e) => setFilters((f) => ({ ...f, familia: e.target.value, subfamilia: "" }))}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="">Todas</option>
              {familias.map((fam) => <option key={fam} value={fam}>{fam}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subfamilia</label>
            <select
              value={filters.subfamilia}
              onChange={(e) => setFilters((f) => ({ ...f, subfamilia: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              disabled={!filters.familia}
            >
              <option value="">Todas</option>
              {subfamilias.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Clasificación</label>
            <select
              value={filters.clasificacion}
              onChange={(e) => setFilters((f) => ({ ...f, clasificacion: e.target.value as any }))}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="">Todas</option>
              <option value="MP">MP</option>
              <option value="PT">PT</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <select
              value={filters.activo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, activo: e.target.value as "" | "true" | "false" }))
              }
              className="w-full rounded-xl border px-3 py-2"
              title="Filtra por estado de habilitación"
            >
              <option value="">Todos</option>
              <option value="true">Habilitados</option>
              <option value="false">Deshabilitados</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={onClear} className="rounded-xl border px-3 py-2 text-sm hover:border-secondary hover:bg-primary hover:text-white">
            Limpiar
          </button>
        </div>
      </div>
    </section>
  );
}
