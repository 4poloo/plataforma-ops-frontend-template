// components/DeleteConfirmModal.tsx
import type { Producto } from "../types/producto";

export default function DeleteConfirmModal({
  producto,
  onCancel,
  onConfirm,
}: {
  producto: Producto;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDeshabilitar = producto.activo !== false; // si no viene, asumimos activo
  const title = isDeshabilitar
    ? `¿Deshabilitar producto ${producto.sku}?`
    : `¿Habilitar producto ${producto.sku}?`;

  const msg = isDeshabilitar
    ? "El producto dejará de estar disponible para nuevas operaciones, pero no se eliminará. Podrás habilitarlo nuevamente cuando quieras."
    : "El producto volverá a estar disponible para su uso en operaciones y recetas.";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{msg}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border px-3 py-2 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-3 py-2 text-white ${isDeshabilitar ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isDeshabilitar ? "Deshabilitar" : "Habilitar"}
          </button>
        </div>
      </div>
    </div>
  );
}
