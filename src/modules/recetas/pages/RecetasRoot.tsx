import { useCallback, useEffect, useState } from "react";

import RecetasSearchBar from "../components/RecetasSearchBar";
import RecetasTable from "../components/RecetasTable";
import RecetaEditorModal from "../components/RecetaEditorModal";
import RecetasImportMasivoDialog from "../components/RecetasImportMasivoDialog";
import ValorizacionDrawer from "../components/ValorizacionDrawer";

import { useRecetas } from "../hooks/useRecetas";
import { recetasApi } from "../services/recetas.api";
import type { RecetaDetalleDTO } from "../models/receta.model";
import { useLogAction } from "../../logs/hooks/useLogAction";
import { useFeaturePermissions } from "../../auth/hooks/useAuth";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type EditorMode = "create" | "edit" | "clone";

export default function RecetasRoot() {
  const s = useRecetas();
  const { error, clearError } = s;
  const logRecetaEvent = useLogAction({ entity: "recipe" });
  const { edit: canEditRecetas } = useFeaturePermissions("produccion.recetas");
  const { showError } = useFlashBanner();
  const reportError = useCallback(
    (err: unknown, fallback: string) => {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : fallback || "Ha ocurrido un error al ejecutar la acción.";
      showError(message);
    },
    [showError]
  );

  // Crear/Editar
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RecetaDetalleDTO | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit"); // 👈 nuevo

  // Import listado
  const [importOpen, setImportOpen] = useState(false);

  // Drawer de valorización
  const [valOpen, setValOpen] = useState(false);
  const [valReceta, setValReceta] = useState<RecetaDetalleDTO | null>(null);

  useEffect(() => {
    if (!error) return;
    showError(error);
    clearError();
  }, [error, showError, clearError]);

  function openNew() {
    if (!canEditRecetas) {
      showError("Tu rol solo permite lectura en Recetas.");
      return;
    }
    const now = new Date().toISOString();
    setEditing({
      id: "tmp",
      codigo: "",
      descripcion: "",
      version: 1,
      vigente: false,
      habilitada: true,
      cantidadBase: 1,
      unidadBase: "UN",
      materiales: [],
      auditoria: { creadoPor: "usuario", creadoEn: now },
    });
    setEditorMode("create");            // 👈 crear
    setEditorOpen(true);
  }

  async function openEdit(id: string) {
    try {
      const r = await recetasApi.getById(id);
      setEditing(r);
      setEditorMode("edit");              // 👈 editar
      setEditorOpen(true);
    } catch (err) {
      reportError(err, "Ha ocurrido un error al cargar la receta seleccionada.");
    }
  }

  async function onClone(id: string) {
    if (!canEditRecetas) {
      showError("Tu rol no puede clonar recetas.");
      return;
    }
    try {
      const rec = await recetasApi.cloneVersion(id);
      setEditing(rec);
      setEditorMode("clone");             // 👈 clonar
      setEditorOpen(true);
      void logRecetaEvent({
        event: "clone",
        payload: {
          id: rec.id,
          codigo: rec.codigo,
          version: rec.version,
        },
        userAlias: rec.codigo,
      });
    } catch (err) {
      reportError(err, "Ha ocurrido un error al clonar la receta.");
    }
  }

  async function onToggle(id: string, habilitar: boolean) {
    if (!canEditRecetas) {
      showError("Tu rol no puede habilitar o deshabilitar recetas.");
      return;
    }
    try {
      await recetasApi.toggleHabilitada(id, habilitar);
      void logRecetaEvent({
        event: habilitar ? "enable" : "disable",
        payload: {
          id,
          habilitar,
        },
        userAlias: id,
      });
      s.refresh();
    } catch (err) {
      reportError(err, "Ha ocurrido un error al actualizar la receta.");
    }
  }

  async function onExport(id: string) {
    try {
      const data = await recetasApi.exportReceta(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receta_${data.codigo}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      reportError(err, "Ha ocurrido un error al exportar la receta.");
    }
  }

  async function onValorar(id: string) {
    try {
      const r = await recetasApi.getById(id);
      setValReceta(r);
      setValOpen(true);
    } catch (err) {
      reportError(err, "Ha ocurrido un error al cargar la valorización.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header simple (el shell externo pone el marco) */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Recetas</h1>
        <p className="text-sm text-gray-500">Gestión de recetas de producción.</p>
      </div>

      {!canEditRecetas && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Acceso de solo lectura: no podrás crear, clonar ni modificar recetas desde este perfil.
        </div>
      )}

      <RecetasSearchBar
        codigo={s.codigo}
        setCodigo={s.setCodigo}
        descripcion={s.descripcion}
        setDescripcion={s.setDescripcion}
        skuExacto={s.skuExacto}
        setSkuExacto={s.setSkuExacto}
        estado={s.estado}
        setEstado={s.setEstado}
        onNew={openNew}
        onImport={() => setImportOpen(true)}
        onRefresh={s.refresh}
        canCreate={canEditRecetas}
        canImport={canEditRecetas}
      />

      <RecetasTable
        rows={s.rows}
        loading={s.loading}
        onEdit={openEdit}
        onClone={onClone}
        onDisable={onToggle}
        onValorar={onValorar}
        page={s.page}
        pages={s.pages}
        onPageChange={s.setPage}
        canEdit={canEditRecetas}
      />

      {/* Drawer de valorización (con CRUD de materiales) */}
      <ValorizacionDrawer
        receta={valReceta}
        open={valOpen}
        onClose={() => setValOpen(false)}
        onUpdated={() => s.refresh()}
        readOnly={!canEditRecetas}
      />

      {/* Modal Crear/Editar/Clonar */}
      {editing && (
        <RecetaEditorModal
          open={editorOpen}
          receta={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onExport={onExport}
          onPublished={() => s.refresh()}
          canValorizar={editorMode !== "edit"} // 👈 solo crear o clonar
          readOnly={!canEditRecetas && editorMode === "edit"}
        />
      )}

      {/* Import masivo (placeholder) */}
      <RecetasImportMasivoDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => s.refresh()}
      />
    </div>
  );
}
