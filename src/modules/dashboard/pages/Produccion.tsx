import { useEffect, useMemo, useState, useCallback } from "react";
import { FiRefreshCw } from "react-icons/fi";
import {
  listGestionProduccion,
  type GestionProduccionRecord,
} from "../../produccion/services/gestion-produccion.api";
import { fetchDashboardSkusByOt } from "../services/dashboards.api";

const STATUS_STYLES: Record<string, string> = {
  CREADA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "EN PROCESO": "bg-amber-100 text-amber-800 border-amber-200",
  PAUSADA: "bg-orange-100 text-orange-800 border-orange-200",
  REPROGRAMADA: "bg-violet-100 text-violet-800 border-violet-200",
  CANCELADA: "bg-red-100 text-red-800 border-red-200",
  CERRADA: "bg-red-200 text-red-900 border-red-300",
};

const formatDate = (value: string): string => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatTime = (value: string): string => {
  if (!value) return "";
  if (/^\d{2}:\d{2}:\d{2}$/u.test(value)) return value.slice(0, 5);
  if (/^\d{2}:\d{2}$/u.test(value)) return value;
  const time = value.split("T")[1]?.slice(0, 5);
  if (time) return time;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function DashboardProduccion() {
  const [records, setRecords] = useState<GestionProduccionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => todayISO());
  const [endDate, setEndDate] = useState(() => todayISO());
  const [produccionPorOt, setProduccionPorOt] = useState<Record<string, number>>({});
  const [produccionError, setProduccionError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listGestionProduccion();
      setRecords(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No fue posible cargar la gestión de producción";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchRecords();
    };

    void run();
    const interval = window.setInterval(run, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchRecords]);

  useEffect(() => {
    const keys = records
      .map((r) => {
        const ot = Number(r?.OT ?? 0);
        const sku = (r?.contenido?.SKU ?? "").toString().trim().toUpperCase();
        if (!Number.isFinite(ot) || ot <= 0 || !sku) return null;
        return { ot, sku };
      })
      .filter((item): item is { ot: number; sku: string } => Boolean(item));

    if (keys.length === 0) {
      setProduccionPorOt({});
      setProduccionError(null);
      return;
    }

    let cancelled = false;
    setProduccionError(null);

    void Promise.all(
      keys.map(async ({ ot, sku }) => {
        try {
          const total = await fetchDashboardSkusByOt(ot, sku);
          return { ot, sku, total };
        } catch (err) {
          return {
            ot,
            sku,
            error: err instanceof Error ? err.message : "Error obteniendo producción",
          };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      const errors: string[] = [];
      results.forEach((item) => {
        if (typeof item.total === "number" && Number.isFinite(item.total)) {
          const key = `${item.ot}|${(item.sku || "").toUpperCase()}`;
          map[key] = item.total;
        }
        if (item.error) errors.push(`OT ${item.ot}: ${item.error}`);
      });
      setProduccionPorOt(map);
      setProduccionError(errors.length > 0 ? errors.join(" | ") : null);
    });

    return () => {
      cancelled = true;
    };
  }, [records]);

  const filtered = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
    const end = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;
    return records.filter((record) => {
      const fecha = record.contenido?.fecha;
      if (!fecha) return true;
      const time = new Date(fecha).getTime();
      if (Number.isNaN(time)) return true;
      return time >= start && time <= end;
    });
  }, [records, startDate, endDate]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">Dashboard · Producción</h2>
        <p className="text-sm text-foreground/70">
          Hoja de control de OTs provenientes de Gestión de Producción.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">Desde</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                try {
                  await fetchRecords();
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground shadow-sm transition hover:-translate-y-px hover:border-primary/40 hover:bg-primary/5 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Actualizando..." : "Refrescar"}
            </button>
            <div className="whitespace-nowrap">
              {filtered.length} registros
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white shadow-sm">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!error && produccionError && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {produccionError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">OT</th>
                <th className="px-4 py-3 text-left">Línea</th>
                <th className="px-4 py-3 text-left">Hora Entrega</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-right">Cant. planificada HN</th>
                <th className="px-4 py-3 text-right">Cant. HE</th>
                <th className="px-4 py-3 text-right">Producción</th>
                <th className="px-4 py-3 text-right">Faltante</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Cargando información…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No existen registros para el rango seleccionado.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((record) => {
                  const extra = record.contenido?.cantidad_hora_extra ?? 0;
                  const normal = record.contenido?.cantidad_hora_normal ?? 0;
                  const produccion =
                    produccionPorOt[`${record.OT}|${(record.contenido?.SKU ?? "").toString().trim().toUpperCase()}`] ??
                    record.cantidad_fin ??
                    0;
                  const faltante = normal + extra - produccion;
                  const descripcion = record.contenido?.descripcion || "—";
                  return (
                    <tr key={record._id} className="border-b border-border/70">
                      <td className="px-4 py-3">{formatDate(record.contenido?.fecha)}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{record.OT || "—"}</td>
                      <td className="px-4 py-3">{record.contenido?.linea || "—"}</td>
                      <td className="px-4 py-3">{formatTime(record.contenido?.hora_entrega || record.contenido?.fecha_fin || "")}</td>
                      <td className="px-4 py-3">{record.contenido?.SKU || "—"}</td>
                      <td className="px-4 py-3">{descripcion}</td>
                      <td className="px-4 py-3 text-right">{normal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{extra.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{produccion.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right ${faltante < 0 ? "text-emerald-700" : faltante > 0 ? "text-red-700" : ""}`}>
                        {faltante.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_STYLES[record.estado] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {record.estado || "Sin Estado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
