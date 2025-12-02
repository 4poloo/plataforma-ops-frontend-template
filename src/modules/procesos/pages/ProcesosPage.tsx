import { useMemo, useState } from "react";
import ProcesosToolbar from "../components/ProcesosToolbar";
import ProcesosTable from "../components/ProcesosTable";
import ProcesoFormModal from "../components/ProcesoFormModal";
import ImportDialog from "../components/ImportDialog";
import DeleteConfirm from "../components/DeleteConfirm";
import { useProcesos } from "../hooks/useProcesos";
import type { Proceso } from "../types";
import { procesosService } from "../services/procesos.service";
import { useFeaturePermissions } from "../../auth/hooks/useAuth";
import { useFlashBanner } from "../../../global/components/FlashBanner";

/**
 * Página principal del módulo Procesos.
 * - Mantiene el mismo estilo/flujo que "Productos".
 * - Exportar: delega al backend vía procesosService.exportar(filtros).
 * - Importar: preview + validación; omite códigos existentes.
 * - CRUD: localStorage hasta conectar FastAPI.
 */

export default function ProcesosPage() {
  const {
    items, loading, error, filtros, setFiltros,
    visible, total, setPage, resetPage,
    create, update, remove, bulkCreate,
  } = useProcesos();
  const { edit: canEditProcesos } = useFeaturePermissions("produccion.procesos");
  const readOnly = !canEditProcesos;
  const { showError } = useFlashBanner();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Proceso | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<Proceso | null>(null);

  const checkCodigoExists = (codigo: string) =>
    items.some((x) => x.codigo.toUpperCase() === codigo.toUpperCase());

  const onNuevo = () => {
    if (readOnly) {
      showError("Tu rol solo permite lectura en Procesos.");
      return;
    }
    setEditItem(null);
    setShowForm(true);
  };
  const onEdit = (p: Proceso) => {
    if (readOnly) {
      showError("Tu rol solo permite lectura en Procesos.");
      return;
    }
    setEditItem(p);
    setShowForm(true);
  };
  const onSave = async (p: Proceso) => {
    if (readOnly) {
      showError("Tu rol no puede modificar procesos.");
      return;
    }
    if (editItem) await update(editItem.codigo, { nombre: p.nombre, costo: p.costo });
    else await create(p);
  };
  const onImportValidos = async (rows: Proceso[]) => {
    if (readOnly) {
      showError("Tu rol no puede importar procesos.");
      return;
    }
    await bulkCreate(rows);
    resetPage();
  };

  // Atajos
  useMemo(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder^="Buscar"]')?.focus();
      }
      if (e.key.toLowerCase() === "n") setShowForm(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-6">
      {/* Título + subtítulo (como Productos) */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Procesos</h1>
        <p className="text-slate-500">Buscar, crear, importar y administrar los procesos.</p>
      </div>

      {readOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este módulo está en modo solo lectura para tu rol. No podrás crear, editar ni eliminar procesos.
        </div>
      )}

      {/* Card de filtros/acciones */}
      <div className="rounded-2xl border bg-white shadow-sm border-primary">
        <div className="p-4 md:p-6">
          <ProcesosToolbar
            filtros={filtros}
            onChange={(next) =>
              setFiltros((f) => ({ ...f, ...next, page: "page" in next ? (next as any).page : 1 }))}
            onNuevo={onNuevo}
            onImportar={() => {
              if (readOnly) {
                showError("Tu rol no puede importar procesos.");
                return;
              }
              setShowImport(true);
            }}
            onExport={() => procesosService.exportar(filtros)}
            canExportCount={visible.length}
            canCreate={canEditProcesos}
            canImport={canEditProcesos}
          />
        </div>
      </div>

      {/* Tabla */}
      {loading && <div className="p-6 text-sm">Cargando…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <ProcesosTable
          rows={visible}
          page={filtros.page}
          pageSize={filtros.pageSize}
          total={total}
          onPageChange={setPage}
          onEdit={onEdit}
          onDelete={(p) => {
            if (readOnly) {
              showError("Tu rol no puede eliminar procesos.");
              return;
            }
            setToDelete(p);
          }}
          canEdit={canEditProcesos}
        />
      )}

      {/* Modales */}
      <ProcesoFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={onSave}
        initial={editItem}
        checkCodigoExists={checkCodigoExists}
        readOnly={readOnly}
      />
      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        existentes={items}
        onImportValidos={onImportValidos}
      />
      <DeleteConfirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        codigo={toDelete?.codigo}
        nombre={toDelete?.nombre}
        onConfirm={async () => {
          if (readOnly) {
            showError("Tu rol no puede eliminar procesos.");
            return;
          }
          if (toDelete) await remove(toDelete.codigo);
        }}
      />
    </div>
  );
}
