import { useEffect, useState } from "react";
import { FiDollarSign, FiCreditCard, FiRefreshCw } from "react-icons/fi";
import {
  getIndicadores,
  formatCLP,
  formatDateISO,
  type Indicadores,
} from "../services/minidicador.api"; // <- corregido

export default function MarketIndicatorsWidget() {
  const [data, setData] = useState<Indicadores | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const d = await getIndicadores();
      setData(d);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="mb-2 h-4 w-24 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 p-3 text-danger">
        <span>{err ?? "Sin datos"}</span>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border border-danger/30 px-3 py-1 text-xs hover:bg-danger/10"
        >
          <FiRefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  const rows = [
    {
      label: data.uf.nombre,
      value: formatCLP(data.uf.valor),
      date: formatDateISO(data.uf.fecha),
      Icon: FiDollarSign,
    },
    {
      label: data.utm.nombre,
      value: formatCLP(data.utm.valor),
      date: formatDateISO(data.utm.fecha),
      Icon: FiCreditCard,
    },
    {
      label: data.dolar.nombre,
      value: formatCLP(data.dolar.valor),
      date: formatDateISO(data.dolar.fecha),
      Icon: FiDollarSign,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <r.Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{r.label}</span>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-foreground">{r.value}</div>
            <div className="mt-0.5 text-xs text-foreground/60">
              Actualizado: {r.date}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
