import { useMemo, useState } from "react";
import { getUserRoleLabel } from "../constants/users";

type Props = {
  roles?: string[];
  statuses?: string[];
  onApply: (filters: { q: string; role: string; status: string }) => void;
  onClear: () => void;
};

const normalizeOptions = (values?: string[]) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => !!value)
    )
  );

const formatStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
};

export default function UsuariosFiltros({ roles, statuses, onApply, onClear }: Props) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("Todos");
  const [status, setStatus] = useState("Todos");

  const roleOptions = useMemo(
    () => ["Todos", ...normalizeOptions(roles)],
    [roles]
  );
  const statusOptions = useMemo(
    () => ["Todos", ...normalizeOptions(statuses)],
    [statuses]
  );

  return (
    <div className="rounded-2xl bg-white shadow p-4 border-1">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Buscar</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nombre, email o alias"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Rol</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {roleOptions.map((option) => {
              const label = option === "Todos" ? option : getUserRoleLabel(option);
              return (
                <option key={option} value={option}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Estado</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "Todos" ? option : formatStatus(option)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            onClick={() => onApply({ q, role, status })}
            className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white hover:border-secondary"
          >
            Aplicar
          </button>
          <button
            onClick={() => {
              setQ("");
              setRole("Todos");
              setStatus("Todos");
              onClear();
            }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
