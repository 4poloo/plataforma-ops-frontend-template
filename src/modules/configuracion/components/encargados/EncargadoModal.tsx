import { useEffect, useState } from "react";
import type {
  Encargado,
  EncargadoPayload,
} from "../../../produccion/services/encargados.api";
import { useFlashBanner } from "../../../../global/components/FlashBanner";

type Props = {
  open: boolean;
  saving?: boolean;
  initial?: Encargado | null;
  onClose: () => void;
  onSubmit: (payload: EncargadoPayload & { _id?: string }) => void;
};

export default function EncargadoModal({
  open,
  saving,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [linea, setLinea] = useState("");
  const [predeterminado, setPredeterminado] = useState(false);
  const { showError } = useFlashBanner();

  useEffect(() => {
    if (open) {
      setNombre(initial?.nombre ?? "");
      setLinea(initial?.linea ?? "");
      setPredeterminado(Boolean(initial?.predeterminado));
    }
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl shadow p-4 w-full max-w-lg">
        <h3 className="text-sm font-semibold mb-3">
          {initial ? "Editar encargado de línea" : "Nuevo encargado de línea"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Nombre</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del encargado"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Línea</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={linea}
              onChange={(e) => setLinea(e.target.value)}
              placeholder="Línea asignada"
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={predeterminado}
              onChange={(e) => setPredeterminado(e.target.checked)}
            />
            <span className="text-gray-700">Predeterminado para la línea</span>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-success hover:text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => {
              if (!nombre.trim()) {
                showError("El nombre es obligatorio");
                return;
              }
              if (!linea.trim()) {
                showError("La línea es obligatoria");
                return;
              }

              onSubmit({
                _id: initial?._id,
                nombre: nombre.trim(),
                linea: linea.trim(),
                predeterminado,
              });
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm border-red-500 text-white bg-secondary hover:bg-red-500 disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
