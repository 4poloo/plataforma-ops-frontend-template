import { useEffect, useState } from "react";
import type { RecetaDetalleDTO, MaterialLinea } from "../models/receta.model";
import ValorizacionPanel from "./ValorizacionPanel";
import MaterialesGrid from "./MaterialesGrid";
import { recetasApi } from "../services/recetas.api";
import { useLogAction } from "../../logs/hooks/useLogAction";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type Props = {
  receta: RecetaDetalleDTO | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (receta: RecetaDetalleDTO) => void;
  readOnly?: boolean;
};

export default function ValorizacionDrawer({
  receta,
  open,
  onClose,
  onUpdated,
  readOnly = false,
}: Props) {
  const [valKey, setValKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [working, setWorking] = useState(false);
  const [localReceta, setLocalReceta] = useState<RecetaDetalleDTO | null>(null);
  const logRecetaEvent = useLogAction({ entity: "recipe" });
  const { showError } = useFlashBanner();

  useEffect(() => {
    if (!open) return;
    setLocalReceta(receta ?? null);
    setEditMode(false);
    setValKey((k) => k + 1);
  }, [open, receta?.id]);

  if (!open || !localReceta) return null;
  const r = localReceta;

  async function saveMaterials(items: MaterialLinea[]) {
    if (readOnly) {
      showError("Tu rol solo permite lectura en la valorización.");
      return;
    }
    setWorking(true);
    try {
      const updated = await recetasApi.update(r.id, { materiales: items });
      setLocalReceta(updated);
      setEditMode(false);
      setValKey((k) => k + 1);
      onUpdated?.(updated);
      void logRecetaEvent({
        event: "update_materials",
        payload: {
          id: updated.id,
          codigo: updated.codigo,
          version: updated.version,
          materiales: items.length,
        },
        userAlias: updated.codigo,
      });
    } finally {
      setWorking(false);
    }
  }

  function eliminarTodos() {
    if (readOnly) {
      showError("Tu rol no puede modificar materiales.");
      return;
    }
    if (!confirm("¿Eliminar TODOS los materiales de esta receta?")) return;
    void saveMaterials([]);
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div>
          <h3 className="font-semibold">
            Valorización — {r.codigo} • {r.descripcion} (v{r.version})
          </h3>
          <p className="text-xs text-gray-500">
            Cantidad base: {r.cantidadBase}
          </p>
        </div>
        {/* Acciones locales del drawer (opcionales) */}
        <div className="flex gap-2">
          {editMode && !readOnly ? (
            <>
              <button
                disabled={working}
                className="btn btn-outline btn-sm"
                onClick={() => setEditMode(false)}
              >
                Cancelar edición
              </button>
              <button
                disabled={working}
                className="btn btn-sm btn-error"
                onClick={eliminarTodos}
                title="Eliminar todos los materiales"
              >
                Eliminar todos
              </button>
            </>
          ) : null}
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="p-4">
        {!editMode ? (
          <ValorizacionPanel key={valKey} receta={r} />
        ) : (
          <MaterialesGrid
            items={r.materiales}
            onChange={(items) =>
              setLocalReceta((prev) =>
                prev ? { ...prev, materiales: items } : prev
              )
            }
            onImport={() => {}}
            onExport={() => {}}
          />
        )}
      </div>
    </div>
  );
}
