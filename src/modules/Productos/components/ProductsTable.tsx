// components/ProductsTable.tsx
import type { Producto } from "../types/producto";
import { formatCLP } from "../utils/currency";

type Props = {
  items: Producto[];
  onEdit: (p: Producto) => void;
  onDes: (p: Producto) => void;
  onSort?: (campo: string) => void;     // <- opcional: habilita clic en cabeceras
  sortField?: string;                    // <- muestra indicador ↑/↓
  sortDir?: 1 | -1;
  canEdit?: boolean;
};

const SortHeader: React.FC<{
  label: string;
  campo?: string;
  active?: boolean;
  dir?: 1 | -1;
  onSort?: (c: string) => void;
}> = ({ label, campo, active, dir, onSort }) => {
  if (!campo || !onSort) return <>{label}</>;
  return (
    <button
      type="button"
      onClick={() => onSort(campo)}
      className="inline-flex items-center gap-1"
      title="Ordenar"
    >
      <span>{label}</span>
      {active && (
        <span aria-hidden="true">{dir === 1 ? "↑" : "↓"}</span>
      )}
    </button>
  );
};

export default function ProductsTable({
  items,
  onEdit,
  onDes,
  onSort,
  sortField,
  sortDir,
  canEdit = true,
}: Props) {
  const isActive = (campo: string) =>
    sortField === campo || (campo === "name" && sortField === "nombre");

  return (
    <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky top-0 z-10 border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader
                  label="SKU"
                  campo="sku"
                  active={isActive("sku")}
                  dir={sortDir}
                  onSort={onSort}
                />
              </th>
              <th className="sticky top-0 z-10 border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader
                  label="Descripción"
                  campo="name"           // UI usa name (el service mapea a 'nombre')
                  active={isActive("name")}
                  dir={sortDir}
                  onSort={onSort}
                />
              </th>
              {["Clasificación","Precio Neto","Precio c/IVA","Familia","Subfamilia","Acciones"].map((h) => (
                <th key={h} className="sticky top-0 z-10 border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.sku} className="hover:bg-gray-50">
                <td className="border-b px-4 py-3 font-mono">{p.sku}</td>
                <td className="border-b px-4 py-3">{p.name}</td>
                <td className="border-b px-4 py-3">{p.classification}</td>
                <td className="border-b px-4 py-3">{formatCLP(p.priceNet)}</td>
                <td className="border-b px-4 py-3">{formatCLP(p.priceVat ?? Math.round(p.priceNet * 1.19))}</td>
                <td className="border-b px-4 py-3">{p.groupName ?? "-"}</td>
                <td className="border-b px-4 py-3">{p.subgroupName ?? "-"}</td>
                <td className="border-b px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(p)}
                      disabled={!canEdit}
                      className={`rounded-lg border px-3 py-1 text-sm hover:border-secondary hover:bg-primary hover:text-white ${
                        canEdit ? "" : "cursor-not-allowed opacity-60"
                      }`}
                      title={canEdit ? "Editar" : "Sin permisos"}
                    >
                      {canEdit ? "Editar" : "Ver"}
                    </button>
                    {/* NUEVO: botón Habilitar/Deshabilitar */}
                    {p.activo ? (
                      <button
                        onClick={() => onDes(p)}
                        disabled={!canEdit}
                        className={`rounded-lg px-3 py-1 text-sm text-white ${
                          canEdit
                            ? "bg-red-700 hover:bg-secondary"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                        title="Deshabilitar"
                      >
                        Deshabilitar
                      </button>
                    ) : (
                      <button
                        onClick={() => onDes(p)}
                        disabled={!canEdit}
                        className={`rounded-lg px-3 py-1 text-sm text-white ${
                          canEdit
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                        title="Habilitar"
                      >
                        Habilitar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin productos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
