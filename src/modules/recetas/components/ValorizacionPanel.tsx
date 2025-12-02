// src/modules/recetas/components/ValorizacionPanel.tsx
import { useEffect, useMemo, useState } from "react";
import type { RecetaDetalleDTO } from "../models/receta.model";
import type { ValorizacionResp, ValorizacionLinea } from "../models/valorizacion.model";
import { costosApi } from "../services/recetas-costos.api";

type Props = { receta: RecetaDetalleDTO };

export default function ValorizacionPanel({ receta }: Props) {
  const [data, setData] = useState<ValorizacionResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    costosApi
      .valorizar(receta, { cost_method: "pneto" })
      .then((res) => {
        if (!alive) return;
        setData(res);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e?.message ?? "Error al valorizar");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [receta.id, receta.version]);

  const lineas: ValorizacionLinea[] = useMemo(
    () => (data?.lineas ?? []),
    [data]
  );

  const totNeto = data?.totales?.promedio;
  const totBruto = data?.totales?.reposicion;
  const costoProcesos = data?.costoProcesos ?? 0;

  if (loading) return <div className="text-sm text-gray-500 p-3">Calculando valorización…</div>;
  if (err) return <div className="text-sm text-red-600 p-3">Error: {err}</div>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Warnings si quieres mostrarlos (opcional) */}
      {"warnings" in (data as any) && Array.isArray((data as any).warnings) && (data as any).warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          <b>Advertencias:</b>
          <ul className="list-disc pl-5">
            {(data as any).warnings.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-center">U/M</th>
              <th className="p-2 text-right">Cantidad (efectiva)</th>

              {/* NETO */}
              <th className="p-2 text-right">C/U Neto</th>
              <th className="p-2 text-right">Subtotal Neto</th>

              {/* +IVA */}
              <th className="p-2 text-right">C/U +IVA</th>
              <th className="p-2 text-right">Subtotal +IVA</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Sin líneas para valorizar
                </td>
              </tr>
            )}

            {lineas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 font-mono">{l.sku || ""}</td>
                <td className="p-2">{l.descripcion || ""}</td>
                <td className="p-2 text-center">{l.unidad || ""}</td>
                <td className="p-2 text-right">{fmt(l.cantidad)}</td>

                {/* Neto (promedio) */}
                <td className="p-2 text-right">{fmt(l.costoUnitarioPromedio)}</td>
                <td className="p-2 text-right">{fmt(l.costoTotalPromedio)}</td>

                {/* +IVA (reposicion) */}
                <td className="p-2 text-right">{fmt(l.costoReposicion)}</td>
                <td className="p-2 text-right">{fmt(l.costoTotalReposicion)}</td>
              </tr>
            ))}
          </tbody>

          {/* Totales */}
          <tfoot>
            <tr className="bg-gray-50 border-t">
              <td colSpan={5} className="p-2 text-right font-medium">Costo Materiales Neto</td>
              <td className="p-2 text-right font-semibold">
                {fmt(totNeto?.costoMateriales ?? 0)}
              </td>
              <td className="p-2 text-right font-medium">Costo Materiales +IVA</td>
              <td className="p-2 text-right font-semibold">
                {fmt(totBruto?.costoMateriales ?? 0)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td colSpan={5} className="p-2 text-right font-medium">Costo Procesos</td>
              <td className="p-2 text-right">{fmt(costoProcesos)}</td>
              <td className="p-2 text-right font-medium">Costo Procesos (+IVA si aplica UI)</td>
              <td className="p-2 text-right">{fmt(costoProcesos)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td colSpan={5} className="p-2 text-right font-semibold">TOTAL Neto</td>
              <td className="p-2 text-right font-bold">
                {fmt(totNeto?.total ?? 0)}
              </td>
              <td className="p-2 text-right font-semibold">TOTAL +IVA</td>
              <td className="p-2 text-right font-bold">
                {fmt(totBruto?.total ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data?.cantidadBase != null && (
        <p className="text-xs text-gray-500">
          Cantidad base: {data.cantidadBase} {data.unidadBase} • Cálculo: NETO = método base, +IVA = NETO × 1.19.
        </p>
      )}
    </div>
  );
}

function fmt(n: number | undefined) {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
