import React from "react";
import { COPY } from "../copy/es";
import type { TopProductosResponse } from "../types/informes";
import { fmtNumber } from "../utils/formatters";

type Props = {
  data?: TopProductosResponse;
  loading?: boolean;
  onItemClick?: (sku: string) => void;
};

const ChartTopProductos: React.FC<Props> = ({ data, loading, onItemClick }) => {
  if (loading) return <div className="h-48 animate-pulse rounded-xl border bg-gray-50" />;

  if (!data || !data.items.length)
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-500">
        {COPY.charts.empty}
      </div>
    );

  const max = Math.max(...data.items.map((i) => i.unidades));

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 text-sm font-medium">{COPY.charts.topProductos}</div>
      <div className="space-y-2">
        {data.items.map((it) => {
          const width = max > 0 ? (it.unidades / max) * 100 : 0;
          return (
            <div key={it.sku}>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">{it.nombre} ({it.sku})</span>
                <span>{fmtNumber(it.unidades)} u</span>
              </div>
              <div
                className="h-5 w-full rounded bg-gray-100"
                role="button"
                onClick={() => onItemClick?.(it.sku)}
                title={`${it.nombre}: ${it.unidades} u`}
              >
                <div className="h-5 rounded bg-secondary/80 hover:bg-secondary" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChartTopProductos;
