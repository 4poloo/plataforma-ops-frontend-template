import React from "react";
import { COPY } from "../copy/es";
import type { TablaOTResponse } from "../types/informes";
import { fmtDate, fmtNumber, fmtPercent } from "../utils/formatters";

type Props = {
  data?: TablaOTResponse;
  loading?: boolean;
  onPageChange?: (page: number) => void;
};

const TablaDetalle: React.FC<Props> = ({ data, loading, onPageChange }) => {
  if (loading) return <div className="h-48 animate-pulse rounded-xl border bg-gray-50" />;

  if (!data || !data.rows.length)
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-500">
        {COPY.tabla.vacia}
      </div>
    );

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const page = data.page;

  const renderPageTabs = () => {
    const items: number[] = [];
    // Simple: página actual ±2
    for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) items.push(p);
    return items.map((p) => (
      <button
        key={p}
        className={`rounded-md border px-3 py-1 text-sm ${
          p === page
            ? "bg-primary text-white border-secondary"
            : "hover:bg-primary hover:border-secondary hover:text-white"
        }`}
        onClick={() => onPageChange?.(p)}
      >
        {p}
      </button>
    ));
  };

  return (
    <div className="rounded-xl border p-2 sm:p-4">
      <div className="mb-2 text-sm font-medium">{COPY.tabla.titulo}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">{COPY.tabla.columnas.ot}</th>
              <th className="px-3 py-2">{COPY.tabla.columnas.estado}</th>
              <th className="px-3 py-2">{COPY.tabla.columnas.fecha}</th>
              <th className="px-3 py-2">{COPY.tabla.columnas.linea}</th>
              <th className="px-3 py-2">{COPY.tabla.columnas.sku}</th>
              <th className="px-3 py-2">{COPY.tabla.columnas.desc}</th>
              <th className="px-3 py-2 text-right">{COPY.tabla.columnas.plan}</th>
              <th className="px-3 py-2 text-right">{COPY.tabla.columnas.real}</th>
              <th className="px-3 py-2 text-right">{COPY.tabla.columnas.merma}</th>
              <th className="px-3 py-2 text-right">{COPY.tabla.columnas.cumplimiento}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.ot} className="border-b last:border-0">
                <td className="px-3 py-2">{r.ot}</td>
                <td className="px-3 py-2">{r.estado}</td>
                <td className="px-3 py-2">{fmtDate(r.fecha)}</td>
                <td className="px-3 py-2">{r.linea}</td>
                <td className="px-3 py-2">{r.sku_pt}</td>
                <td className="px-3 py-2">{r.descripcion}</td>
                <td className="px-3 py-2 text-right">{fmtNumber(r.plan_u)}</td>
                <td className="px-3 py-2 text-right">{fmtNumber(r.real_u)}</td>
                <td className="px-3 py-2 text-right">{fmtNumber(r.merma_u)}</td>
                <td className="px-3 py-2 text-right">{fmtPercent(r.cumplimiento_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botonera paginación estilo “Procesos” (según ejemplo que nos diste) */}
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={page <= 1}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
          onClick={() => onPageChange?.(page - 1)}
        >
          Anterior
        </button>
        {renderPageTabs()}
        <button
          disabled={page >= pages}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-primary hover:border-secondary hover:text-white"
          onClick={() => onPageChange?.(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default TablaDetalle;
