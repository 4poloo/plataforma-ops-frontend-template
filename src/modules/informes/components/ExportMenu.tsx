// src/modules/informes/components/ExportMenu.tsx
import React from "react";
import { COPY } from "../copy/es";
import { requestExport } from "../hooks/useInformes";
import type { FiltrosInformes, ExportTipo, ExportRequest, ExportResponseImmediate, ExportResponseJob } from "../types/informes";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type Props = { filtros: FiltrosInformes };

const opciones: Array<{
  tipo: ExportTipo;
  label: string;     // nombre corto visible en el select
  desc: string;      // descripción corta que se muestra debajo
}> = [
  {
    tipo: "ot_consolidado",
    label: "OT — Consolidado",
    desc: "Detalle de OT con estado, línea, SKU, cantidades y cumplimiento.",
  },
  {
    tipo: "ot_linea_dia",
    label: "OT — Pivot línea × día",
    desc: "Tabla dinámica por fecha y línea (útil para control diario).",
  },
  {
    tipo: "costos_receta_detalle",
    label: "Costos por receta (detalle)",
    desc: "Consumo MP y costos de proceso por SKU PT en el período.",
  },
  {
    tipo: "top_productos",
    label: "Top productos fabricados",
    desc: "Ranking de unidades fabricadas (Top N) según filtros.",
  },
  {
    tipo: "recetas_costos",
    label: "Recetas con costos",
    desc: "Listado de recetas vigentes con costos unitarios/actualizados.",
  },
  {
    tipo: "catalogo_productos",
    label: "Catálogo de productos",
    desc: "Productos, SKUs y datos maestros relevantes para análisis.",
  },
  {
    tipo: "costos_proceso",
    label: "Costos de proceso",
    desc: "Costos por etapa de proceso (mano de obra, máquina, etc.).",
  },
];

const ExportMenu: React.FC<Props> = ({ filtros }) => {
  const [seleccion, setSeleccion] = React.useState<ExportTipo>(opciones[0].tipo);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const current = React.useMemo(
    () => opciones.find(o => o.tipo === seleccion)!,
    [seleccion]
  );
  const { showInfo, showError } = useFlashBanner();

  const handleDescargar = async () => {
    setLoading(true);
    setErr(null);
    try {
      const payload: ExportRequest = { tipo: seleccion, filtros };
      const res = await requestExport(payload);
      if ("downloadUrl" in res) {
        descargar(res);
      } else {
        // Si el backend devuelve un job, podrías hacer polling aquí.
        showInfo(`${COPY.export.listo}. Job: ${(res as ExportResponseJob).jobId}`);
      }
    } catch {
      setErr(COPY.export.error);
      showError(COPY.export.error);
    } finally {
      setLoading(false);
    }
  };

  const descargar = (resp: ExportResponseImmediate) => {
    const a = document.createElement("a");
    a.href = resp.downloadUrl;
    a.download = ""; // el backend define el nombre
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="rounded-xl border p-4">
  <div className="mb-2 text-sm font-medium">{COPY.export.exportar}</div>

  <div className="flex flex-col gap-3">
    <div>
      <label className="mb-1 block text-sm text-gray-600">Tipo de exportación</label>
      <select
        className="w-full rounded border p-2"
        value={seleccion}
        onChange={(e) => setSeleccion(e.target.value as ExportTipo)}
      >
        {opciones.map(op => (
          <option key={op.tipo} value={op.tipo}>
            {op.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">{current.desc}</p>
    </div>

    <div className="pt-2 border-t">
      <button
        disabled={loading}
        onClick={handleDescargar}
        className="mt-2 w-full rounded-md border px-4 py-2 text-sm font-medium hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50 sm:w-auto"
      >
        {loading ? COPY.export.generando : "Descargar Informe"}
      </button>
    </div>
  </div>

  {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
</div>

  );
};

export default ExportMenu;
