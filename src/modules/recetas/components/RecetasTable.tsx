import { useEffect, useMemo, useState } from "react";
import type { RecetaListadoDTO } from "../models/receta.model";

type Props = {
  rows: RecetaListadoDTO[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onClone?: (id: string) => void;
  onDisable?: (id: string, habilitar: boolean) => void;
  onValorar?: (id: string) => void;
  page?: number;
  pages?: number;
  onPageChange?: (page: number) => void;
  canEdit?: boolean;
};

type Grupo = { codigo: string; items: RecetaListadoDTO[] };

export default function RecetasTable({
  rows,
  loading,
  onEdit = () => {},
  onDisable = () => {},
  onValorar = () => {},
  page = 1,
  pages = 1,
  onPageChange,
  canEdit = true,
}: Props) {
  // 1) Agrupar por código
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, RecetaListadoDTO[]>();
    for (const r of rows) {
      if (!map.has(r.codigo)) map.set(r.codigo, []);
      map.get(r.codigo)!.push(r);
    }
    // orden interno por versión desc (v más alta primero)
    return Array.from(map.entries()).map(([codigo, items]) => ({
      codigo,
      items: items.slice().sort((a, b) => b.version - a.version),
    }));
  }, [rows]);

  // 2) Selección de versión por código (vigente o mayor)
  const [selByCode, setSelByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = { ...selByCode };
    let changed = false;
    for (const g of grupos) {
      const ids = new Set(g.items.map((i) => i.id));
      const vigente = g.items.find((i) => i.vigente);
      const fallback = g.items[0];
      const currentSel = next[g.codigo];
      if (!currentSel || !ids.has(currentSel)) {
        next[g.codigo] = vigente?.id ?? fallback.id;
        changed = true;
      }
    }
    if (changed) setSelByCode(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos]);

  // 3) Render
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Descripción</th>
              {/*<th className="p-3">Versión</th>*/}
              <th className="p-3">Vigente</th>
              <th className="p-3">Habilitada</th>
              <th className="p-3">Actualizado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && grupos.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            )}

            {grupos.map((g) => {
              const selectedId = selByCode[g.codigo];
              const current = g.items.find((i) => i.id === selectedId) ?? g.items[0];

              return (
                <tr key={g.codigo} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono">{current.codigo}</td>
                  <td className="p-3">{current.descripcion}</td>

                  {/* Versión (dropdown si hay más de una) 
                  <td className="p-3 text-center">
                    {g.items.length > 1 ? (
                      <select
                        value={current.id}
                        onChange={(e) =>
                          setSelByCode((prev) => ({
                            ...prev,
                            [g.codigo]: e.target.value,
                          }))
                        }
                        className="rounded-md border px-2 py-1 text-sm"
                        aria-label={`Versiones de ${g.codigo}`}
                        title="Selecciona una versión"
                      >
                        {g.items.map((it) => (
                          <option key={it.id} value={it.id}>
                            v{it.version}
                            {it.vigente ? " • vigente" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>v{current.version}</span>
                    )}
                  </td>
                  */}

                  {/* Vigente */}
                  <td className="p-3 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        current.vigente
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {current.vigente ? "Sí" : "No"}
                    </span>
                  </td>

                  {/* Habilitada */}
                  <td className="p-3 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        current.habilitada
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {current.habilitada ? "Habilitada" : "Deshabilitada"}
                    </span>
                  </td>

                  {/* Actualizado */}
                  <td className="p-3 text-xs text-gray-500">
                    {current.actualizadoEn
                      ? new Date(current.actualizadoEn).toLocaleString()
                      : "—"}
                  </td>

                  {/* Acciones (aplican a la versión seleccionada) */}
                  <td className="p-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => onEdit(current.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-primary hover:border-secondary hover:text-white"
                      title="Ver/Editar"
                    >
                      Ver/Editar
                    </button>
                    <button
                      onClick={() => onValorar(current.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-primary hover:border-secondary hover:text-white"
                      title="Valorizar receta"
                    >
                      Valorizar
                    </button>
                    <button
                      onClick={() => onDisable(current.id, !current.habilitada)}
                      disabled={!canEdit}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        current.habilitada
                          ? "border-red-600 text-red-600 hover:bg-secondary hover:border-secondary hover:text-white"
                          : "border-green-600 text-green-600 hover:bg-green-600 hover:border-success hover:text-white"
                      } ${!canEdit ? "opacity-60 pointer-events-none" : ""}`}
                      title={
                        !canEdit
                          ? "Sin permisos para modificar"
                          : current.habilitada
                            ? "Deshabilitar"
                            : "Habilitar"
                      }
                    >
                      {current.habilitada ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between p-3">
        <div className="text-xs text-gray-500">
          Página {page} de {pages}
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
            onClick={() => onPageChange?.(page - 1)}
          >
            Anterior
          </button>
          {renderPageTabs(page, pages, onPageChange)}
          <button
            disabled={page >= pages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
            onClick={() => onPageChange?.(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function renderPageTabs(
  page: number,
  pages: number,
  onPageChange?: (p: number) => void
) {
  const items: (number | "...")[] = [];
  const add = (val: number | "...") => items.push(val);

  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) add(i);
  } else {
    add(1);
    if (page > 4) add("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(pages - 1, page + 1);
    for (let i = start; i <= end; i++) add(i);
    if (page < pages - 3) add("...");
    add(pages);
  }

  return items.map((it, idx) =>
    it === "..." ? (
      <span key={`dots-${idx}`} className="px-2 text-sm text-gray-500">
        …
      </span>
    ) : (
      <button
        key={it}
        onClick={() => onPageChange?.(it)}
        className={`rounded-md px-3 py-1 text-sm ${
          page === it ? "bg-primary text-white" : "border"
        }`}
      >
        {it}
      </button>
    )
  );
}
