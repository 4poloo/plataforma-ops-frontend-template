import { useState } from "react";
import type { Filtros } from "../types";

type Props = {
  filtros: Filtros;
  onChange: (next: Partial<Filtros>) => void;
  onNuevo: () => void;
  onImportar: () => void;
  onExport: () => void;
  canExportCount: number;
  canCreate?: boolean;
  canImport?: boolean;
};

export default function ProcesosToolbar({
  filtros,
  onChange,
  onNuevo,
  onImportar,
  onExport,
  canExportCount,
  canCreate = true,
  canImport = true,
}: Props) {
  const [search, setSearch] = useState(filtros.search);

  return (
    <div className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      {/* fila superior: búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
        <div className="md:col-span-12">
          <label className="block text-slate-600 text-sm font-medium mb-1">Buscar</label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onChange({ search })}
              placeholder="Buscar por código o nombre..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => onChange({ search })}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* fila filtros rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-sm font-medium mb-1">Costo mín</label>
          <input
            type="number" step="0.01" placeholder="0"
            defaultValue={filtros.costoMin ?? ""}
            onBlur={(e) => onChange({ costoMin: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-sm font-medium mb-1">Costo máx</label>
          <input
            type="number" step="0.01" placeholder="∞"
            defaultValue={filtros.costoMax ?? ""}
            onBlur={(e) => onChange({ costoMax: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-sm font-medium mb-1">Ordenar</label>
          <select
            value={`${filtros.sortBy}_${filtros.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("_") as [
                Filtros["sortBy"], Filtros["sortOrder"]
              ];
              onChange({ sortBy, sortOrder });
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="codigo_asc">Código (A→Z)</option>
            <option value="codigo_desc">Código (Z→A)</option>
            <option value="nombre_asc">Nombre (A→Z)</option>
            <option value="nombre_desc">Nombre (Z→A)</option>
            <option value="costo_asc">Costo (↑)</option>
            <option value="costo_desc">Costo (↓)</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-sm font-medium mb-1">Items por página</label>
          <select
            value={String(filtros.pageSize)}
            onChange={(e) => onChange({ pageSize: Number(e.target.value), page: 1 })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* fila inferior: acciones */}
      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-200">
        <button
          onClick={onNuevo}
          disabled={!canCreate}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
            canCreate
              ? "bg-primary hover:bg-success"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          title={canCreate ? "Nuevo proceso" : "Sin permisos"}
        >
          Nuevo
        </button>
        <button
          onClick={onImportar}
          disabled={!canImport}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
            canImport
              ? "bg-primary hover:bg-success"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          title={canImport ? "Importar" : "Sin permisos"}
        >
          Importar
        </button>
        <button
          onClick={onExport}
          disabled={canExportCount === 0}
          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:border-0 border-1"
          title={canExportCount === 0 ? "No hay datos para exportar" : "Exportar lo visible"}
        >
          Exportar
        </button>
      </div>
    </div>
  );
}
