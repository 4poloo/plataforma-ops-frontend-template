import type { Usuario } from "../services/users.api";
import { getUserRoleLabel } from "../constants/users";

type Props = {
  rows: Usuario[];
  loading?: boolean;
  onEdit: (user: Usuario) => void;
  onToggleStatus: (user: Usuario) => void;
  onChangePassword: (user: Usuario) => void;
};

const formatStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
};

const getStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-700";
    case "inactive":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

export default function UsuariosTabla({
  rows,
  loading,
  onEdit,
  onToggleStatus,
  onChangePassword,
}: Props) {
  const emptyState = !loading && rows.length === 0;

  return (
    <div className="rounded-2xl bg-white shadow border-1">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500">
          <tr className="[&>th]:py-3 [&>th]:px-3 text-left">
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const fullName = [row.nombre, row.apellido].filter(Boolean).join(" ").trim() || row.nombre;
            const statusLabel = formatStatusLabel(row.status);
            const roleLabel = getUserRoleLabel(row.role);
            const isActive = row.status.toLowerCase() === "active";

            return (
              <tr key={row.id} className="border-t hover:bg-primary/5">
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span>{fullName}</span>
                    {row.alias && (
                      <span className="text-xs text-gray-500">Alias: {row.alias}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{roleLabel}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-1 rounded ${getStatusClass(row.status)}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onEdit(row)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-primary hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onChangePassword(row)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-primary hover:text-white hover:border-secondary"
                    >
                      Cambiar contraseña
                    </button>
                    <button
                      onClick={() => onToggleStatus(row)}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        isActive
                          ? "text-red-600 border-red-300 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400"
                          : "text-success border-success hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-green-400"
                      }`}
                    >
                      {isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {loading && rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                Cargando usuarios…
              </td>
            </tr>
          )}

          {emptyState && (
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
