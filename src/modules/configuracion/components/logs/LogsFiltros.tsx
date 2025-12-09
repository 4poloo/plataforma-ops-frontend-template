import { useState } from "react";
import type { LogSeverity } from "../../../logs/services/logs.api";

type Props = {
  onApply: (f: {
    q: string;
    severity: LogSeverity | "Todas";
    from?: string;
    to?: string;
  }) => void;
  onClear: () => void;
};

export default function LogsFiltros({ onApply, onClear }: Props) {
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<LogSeverity | "Todas">("Todas");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  return (
    <div className="rounded-2xl bg-white shadow p-4 border-1">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Buscar</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="acción, usuario, detalle"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Severidad</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as LogSeverity | "Todas")}
          >
            <option>Todas</option>
            <option>INFO</option>
            <option>WARN</option>
            <option>ERROR</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Desde</span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Hasta</span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            onClick={() => onApply({ q, severity, from, to })}
            className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white hover:border-secondary"
          >
            Aplicar
          </button>
          <button
            onClick={onClear}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
