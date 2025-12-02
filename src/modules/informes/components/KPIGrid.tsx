import React from "react";
import KPICard from "./KPICard";
import { COPY } from "../copy/es";
import { fmtNumber, fmtPercent } from "../utils/formatters";
import type { KPIResponse } from "../types/informes";

type Props = {
  data?: KPIResponse;
  loading?: boolean;
  onCardClick?: (key: "creadas" | "cerradas" | "cumplimiento" | "merma") => void;
};

const Skeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-24 animate-pulse rounded-xl border bg-gray-50" />
    ))}
  </div>
);

const KPIGrid: React.FC<Props> = ({ data, loading, onCardClick }) => {
  if (loading) return <Skeleton />;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title={COPY.kpi.creadas}
        value={
          data
            ? `${fmtNumber(data.ot_creadas.hoy)} / ${fmtNumber(
                data.ot_creadas.semana
              )} / ${fmtNumber(data.ot_creadas.mes)}`
            : "-"
        }
        subtitle="Hoy / Semana / Mes"
        onClick={() => onCardClick?.("creadas")}
      />
      <KPICard
        title={COPY.kpi.cerradas}
        value={
          data
            ? `${fmtNumber(data.ot_cerradas.hoy)} / ${fmtNumber(
                data.ot_cerradas.semana
              )} / ${fmtNumber(data.ot_cerradas.mes)}`
            : "-"
        }
        subtitle="Hoy / Semana / Mes"
        onClick={() => onCardClick?.("cerradas")}
      />
      <KPICard
        title={COPY.kpi.cumplimiento}
        value={data ? fmtPercent(data.cumplimiento_pct) : "-"}
        tooltip={COPY.kpi.tooltipCumpl}
        onClick={() => onCardClick?.("cumplimiento")}
      />
      <KPICard
        title={COPY.kpi.merma}
        value={data ? fmtPercent(data.merma_pct) : "-"}
        tooltip={COPY.kpi.tooltipMerma}
        onClick={() => onCardClick?.("merma")}
      />
    </div>
  );
};

export default KPIGrid;
