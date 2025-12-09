import type { LogEntry } from "../../../logs/services/logs.api";

const formatChileDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const clDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return clDate.toLocaleString("es-CL", { hour12: false });
};

type Props = {
  rows: LogEntry[];
  loading?: boolean;
  onOpen: (log: LogEntry) => void;
};

const SevChip = ({ value }: { value: LogEntry["severity"] }) => {
  const styles: Record<LogEntry["severity"], string> = {
    INFO: "bg-blue-100 text-blue-700",
    WARN: "bg-amber-100 text-amber-800",
    ERROR: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${styles[value] ?? styles.INFO}`}>
      {value}
    </span>
  );
};

export default function LogsTabla({ rows, loading = false, onOpen }: Props) {
  return (
    <div className="rounded-2xl bg-white shadow border-1">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500">
          <tr className="[&>th]:py-3 [&>th]:px-3 text-left">
            <th>Fecha</th>
            <th>Severidad</th>
            <th>Acción</th>
            <th>Usuario</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                Cargando eventos…
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((log) => (
              <tr key={log.id} className="border-t hover:bg-primary/5">
                <td className="px-3 py-2">{formatChileDateTime(log.loggedAt)}</td>
                <td className="px-3 py-2">
                  <SevChip value={log.severity} />
                </td>
                <td className="px-3 py-2">{log.accion || `${log.actor}`}</td>
                <td className="px-3 py-2">{log.actor || "—"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onOpen(log)}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
