import { useEffect, useState } from "react";
import type { MaterialLinea, RecetaDetalleDTO } from "../models/receta.model";

import RecetaHeader from "./RecetaHeader";
import MaterialesGrid from "./MaterialesGrid";
import RecetaHistoryModal from "./RecetaHistoryModal";
import RecetaImportDialog from "./RecetaImportDialog";
import ValorizacionPanel from "./ValorizacionPanel";

import { recetasApi } from "../services/recetas.api";
import { findDuplicateSku } from "../utils/materiales";
import { useLogAction } from "../../logs/hooks/useLogAction.ts";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type Props = {
  open: boolean;
  receta: RecetaDetalleDTO;
  onClose: () => void;
  onExport: (id: string) => void;
  onPublished?: () => void;
  canValorizar?: boolean; // 👈 nuevo: solo crear o clonar
  readOnly?: boolean;
};

export default function RecetaEditorModal({
  open,
  receta: initial,
  onClose,
  onExport,
  onPublished,
  canValorizar = false,
  readOnly = false,
}: Props) {
  const [receta, setReceta] = useState<RecetaDetalleDTO>(initial);
  const [histOpen, setHistOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showVal, setShowVal] = useState(false); // colapsable de valorización
  const [publishing, setPublishing] = useState(false);
  const logRecetaEvent = useLogAction({ entity: "recipe" });
  const isReadOnly = readOnly;
  const { showError, showSuccess } = useFlashBanner();

  // Bloqueo de scroll del body mientras el modal esté abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setReceta(initial);
    setShowVal(false); // al cambiar de receta/mode, cerramos valorización
  }, [initial]);

  const patch = (p: Partial<RecetaDetalleDTO>) => {
    setReceta((r) => ({ ...r, ...p }));
  };
  const setMateriales = (items: MaterialLinea[]) => {
    patch({ materiales: items });
  };

  async function openHistory() {
    if (receta.id === "tmp") return;
    setHistOpen(true);
  }

  if (!open) return null;

  const headerReceta: RecetaDetalleDTO = {
    ...receta,
    vigente: undefined as unknown as boolean,
  };

  async function handlePublish() {
    if (publishing) return;
    if (
      isReadOnly ||
      receta.id === "tmp" &&
      (!receta.codigo?.trim() || !receta.descripcion?.trim())
    ) {
      showError(
        isReadOnly
          ? "Tu rol tiene acceso de solo lectura a las recetas."
          : "Debes definir Código y Descripción"
      );
      return;
    }
    const duplicate = findDuplicateSku(receta.materiales);
    if (duplicate) {
      showError(`El SKU ${duplicate} está duplicado en la receta.`);
      return;
    }
    setPublishing(true);
    try {
      if (receta.id === "tmp") {
        const nombre = receta.descripcion?.trim() ?? "";
        const created = await recetasApi.create({
          codigo: receta.codigo,
          descripcion: nombre,
          cantidadBase: receta.cantidadBase,
          unidadBase: receta.unidadBase,
          materiales: receta.materiales,
          publicar: true,
        });
        void logRecetaEvent({
          event: "create",
          payload: {
            id: created.id,
            codigo: created.codigo,
            version: created.version,
          },
          userAlias: created.codigo,
        });
      } else {
        const updated = await recetasApi.update(receta.id, {
          cantidadBase: receta.cantidadBase,
          unidadBase: receta.unidadBase,
          materiales: receta.materiales,
        });
        const nombre = receta.descripcion?.trim() ?? "";
        await recetasApi.updateNombre(receta.id, nombre);
        await recetasApi.publish(receta.id);
        void logRecetaEvent({
          event: "update",
          payload: {
            id: updated.id,
            codigo: updated.codigo,
            version: updated.version,
          },
          userAlias: updated.codigo,
        });
        void logRecetaEvent({
          event: "publish",
          payload: {
            id: updated.id,
            codigo: updated.codigo,
            version: updated.version,
          },
          userAlias: updated.codigo,
        });
      }
      if (onPublished) onPublished();
      // Marca flag para refrescar Crear OT y tomar la receta recién guardada
      try {
        sessionStorage.setItem("forceReloadCrearOt", "1");
      } catch {
        /* ignore */
      }
      showSuccess("Receta publicada correctamente.");
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Error al publicar la receta";
      showError(message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
      <div className="w-full max-w-6xl rounded-xl bg-white shadow-xl">
        {/* Header del modal */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">
              {receta.id === "tmp" ? "Nueva receta" : "Editar receta"}
            </h2>
            <p className="text-sm text-gray-500">
              Código editable solo al crear. Descripción, cantidad base y U/M
              editables siempre.
            </p>
          </div>
          <div className="flex gap-2">
            {receta.id !== "tmp" && (
              <button
                onClick={() => onExport(receta.id)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white"
                title="Exportar JSON"
              >
                Exportar
              </button>
            )}
            <button
              className="rounded-md border px-3 py-2 text-sm hover:bg-secondary border-red-500  hover:text-white text-red-500"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Contenido con scroll interno */}
        <div className="max-h-[75vh] overflow-y-auto p-4">
          {isReadOnly && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Esta vista está en modo lectura: no podrás modificar la receta.
            </div>
          )}
          <fieldset disabled={isReadOnly} className="space-y-4">
            {/* Código/Descripción solo en "crear" */}
            {receta.id === "tmp" ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="text-sm text-gray-500">Código</label>
                <input
                  value={receta.codigo}
                  onChange={(e) => patch({ codigo: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm text-gray-500">Descripción</label>
                <input
                  value={receta.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
            </div>
            ) : null}

            <div className="mt-3">
              <div className="[&_span.badge]:hidden">
                <RecetaHeader
                  receta={headerReceta}
                  onChange={patch}
                  onHistory={openHistory}
                  editableDescripcion
                />
              </div>
            </div>

            {/* Materiales */}
            <div className="mt-4">
              <MaterialesGrid
                items={receta.materiales}
                onChange={setMateriales}
                onImport={() => setImportOpen(true)}
              />
            </div>

            {/* Botonera */}
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              {canValorizar && (
                <button
                  onClick={() => setShowVal((v) => !v)}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white"
                >
                  {showVal ? "Ocultar valorización" : "Valorizar receta"}
                </button>
              )}
              <button
                onClick={handlePublish}
                disabled={publishing || isReadOnly}
                className="rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-70 disabled:hover:bg-primary"
              >
                {publishing
                  ? "Publicando..."
                  : receta.id === "tmp"
                  ? "Publicar"
                  : "Publicar versión"}
              </button>
            </div>

            {/* Valorización (colapsable, solo crear/clonar) */}
            {canValorizar && showVal && (
              <div className="mt-6">
                <ValorizacionPanel receta={receta} />
              </div>
            )}
          </fieldset>
        </div>
      </div>

      {/* Modales secundarios */}
      {receta.id !== "tmp" && (
        <RecetaHistoryModal
          recetaId={receta.id}
          open={histOpen}
          onClose={() => setHistOpen(false)}
        />
      )}
      <RecetaImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={async (modo, mats) => {
          if (receta.id === "tmp") {
            setMateriales(mats);
            setImportOpen(false);
          } else {
            const updated = await recetasApi.importMaterials(receta.id, modo, mats);
            void logRecetaEvent({
              event: "import_materials",
              payload: {
                id: updated.id,
                codigo: updated.codigo,
                version: updated.version,
                materiales: mats.length,
                modo,
              },
              userAlias: updated.codigo,
            });
            const rec = await recetasApi.getById(receta.id);
            setReceta(rec);
            setImportOpen(false);
          }
        }}
      />
    </div>
  );
}
