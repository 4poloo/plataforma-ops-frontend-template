import type { Encargado } from "../../../produccion/services/encargados.api";

type Props = {
  rows: Encargado[];
  loading?: boolean;
  onEdit: (encargado: Encargado) => void;
};

export default function EncargadosTabla({ rows, loading, onEdit }: Props) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className="rounded-2xl bg-white shadow border-1">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500">
          <tr className="[&>th]:py-3 [&>th]:px-3 text-left">
            <th>Nombre</th>
            <th>Línea</th>
            <th>Predeterminado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || `${row.nombre}-${row.linea}`} className="border-t hover:bg-primary/5">
              <td className="px-3 py-2">{row.nombre}</td>
              <td className="px-3 py-2">{row.linea}</td>
              <td className="px-3 py-2">{row.predeterminado ? "Sí" : "No"}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onEdit(row)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-primary hover:text-white"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}

          {loading && rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                Cargando encargados…
              </td>
            </tr>
          )}

          {showEmpty && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                Sin encargados registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
