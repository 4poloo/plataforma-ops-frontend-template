import type { Proceso } from "../types";

type Props = {
  rows: Proceso[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onEdit: (p: Proceso) => void;
  onDelete: (p: Proceso) => void;
  canEdit?: boolean;
};

export default function ProcesosTable({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
  canEdit = true,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fmt = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl border border-primary overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600 text-xs font-semibold uppercase tracking-wider bg-gray-100">
              <th className="px-4 py-3 w-48">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 w-40 text-right">Costo (CLP)</th>
              <th className="px-4 py-3 w-40 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                  Sin resultados
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.codigo} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono font-medium">{p.codigo}</td>
                <td className="px-4 py-3">{p.nombre}</td>
                <td className="px-4 py-3 text-right">{fmt.format(p.costo)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className={`rounded-lg border border-slate-300 px-3 py-1.5 text-sm ${
                        canEdit ? "hover:bg-slate-50" : "cursor-not-allowed opacity-60"
                      }`}
                      onClick={() => onEdit(p)}
                      disabled={!canEdit}
                      title={canEdit ? "Editar" : "Sin permisos"}
                    >
                      {canEdit ? "Editar" : "Ver"}
                    </button>
                    <button
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${
                        canEdit
                          ? "bg-red-600 hover:bg-red-500"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => onDelete(p)}
                      disabled={!canEdit}
                      title={canEdit ? "Eliminar" : "Sin permisos"}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

     {/* Paginación */}
      <div className="p-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Página {page} de {totalPages} — {total} ítems
        </span>
                
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
                
          {/* Tabs de páginas */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  p === page
                    ? "bg-primary border-secondary text-white"
                    : "hover:bg-primary hover:border-secondary hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          
          <button
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
