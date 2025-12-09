import type { LogEntry } from "../../../logs/services/logs.api";

const formatChileDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const clDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return clDate.toLocaleString("es-CL", { hour12: false });
};

type Props = {
  open: boolean;
  log?: LogEntry | null;
  onClose: () => void;
};

const formatPayload = (payload: unknown): string => {
  if (payload == null) return "(sin contenido)";
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

export default function LogDetalleModal({ open, log, onClose }: Props) {
  if (!open || !log) return null;
  const payloadText =
    log.payload != null
      ? formatPayload(log.payload)
      : log.raw?.payload != null
        ? formatPayload(log.raw.payload)
        : "(sin contenido)";

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl">
        <h3 className="text-sm font-semibold mb-3">Detalle del evento</h3>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-gray-500">Fecha:</span>{" "}
            {formatChileDateTime(log.loggedAt)}
          </p>
          <p>
            <span className="text-gray-500">Usuario:</span> {log.actor || "—"}
          </p>
          <p>
            <span className="text-gray-500">Acción:</span>{" "}
            {log.accion || `${log.actor}.${log.entity}.${log.event}`}
          </p>
          <p>
            <span className="text-gray-500">Severidad:</span> {log.severity}
          </p>
          <div>
            <p className="text-gray-500">Payload:</p>
            <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-64">
{payloadText}
            </pre>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
