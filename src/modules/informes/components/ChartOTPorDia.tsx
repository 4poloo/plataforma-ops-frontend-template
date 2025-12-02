import React from "react";
import { COPY } from "../copy/es";
import type { SerieOTPorDiaResponse } from "../types/informes";
import { fmtNumber } from "../utils/formatters";

/**
 * Mini chart sin librerías:
 * - Render de barras apiladas por línea usando flex y widths proporcionales.
 * - NO es un chart de alta fidelidad; sirve como visual ágil sin dependencias.
 */
type Props = {
  data?: SerieOTPorDiaResponse;
  loading?: boolean;
  onBarClick?: (bucket: string, linea?: string) => void;
};

const ChartOTPorDia: React.FC<Props> = ({ data, loading, onBarClick }) => {
  if (loading) return <div className="h-48 animate-pulse rounded-xl border bg-gray-50" />;

  if (!data || !data.items.length)
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-500">
        {COPY.charts.empty}
      </div>
    );

  // Agrupar por bucket y sumar por línea
  const buckets = Array.from(
    data.items.reduce<Map<string, { total: number; porLinea: Record<string, number> }>>(
      (acc, it) => {
        const curr = acc.get(it.bucket) ?? { total: 0, porLinea: {} };
        const prevLinea = curr.porLinea[it.linea] ?? 0;
        curr.porLinea[it.linea] = prevLinea + it.ot_creadas; // podemos usar ot_creadas como métrica base
        curr.total += it.ot_creadas;
        acc.set(it.bucket, curr);
        return acc;
      },
      new Map()
    )
  );

  const max = Math.max(...buckets.map(([, v]) => v.total));

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 text-sm font-medium">{COPY.charts.otPorDia}</div>

      <div className="space-y-2">
        {buckets.map(([bucket, info]) => (
          <div key={bucket}>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>{bucket}</span>
              <span>{fmtNumber(info.total)} OT</span>
            </div>
            <div
              className="flex h-6 w-full overflow-hidden rounded bg-gray-100"
              role="button"
              onClick={() => onBarClick?.(bucket)}
              title={`Total: ${info.total}`}
            >
              {Object.entries(info.porLinea).map(([linea, val]) => {
                const widthPct = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div
                    key={linea}
                    className="border-r last:border-none"
                    style={{ width: `${widthPct}%` }}
                    title={`${linea}: ${val}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBarClick?.(bucket, linea);
                    }}
                  >
                    {/* Bloques coloreados con classes utilitarias, podemos alternar por índice */}
                    <div className="h-full bg-primary/70 hover:bg-primary" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400">Agrupado por {data.groupBy}</div>
    </div>
  );
};

export default ChartOTPorDia;
