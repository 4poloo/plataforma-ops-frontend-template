import { useState } from 'react';
import type { MaterialLinea, RecetaDetalleDTO } from '../models/receta.model';
import RecetaHeader from '../components/RecetaHeader';
import MaterialesGrid from '../components/MaterialesGrid';
import { recetasApi } from '../services/recetas.api';
import { useNavigate } from 'react-router-dom';
import RecetaImportDialog from '../components/RecetaImportDialog';
import { findDuplicateSku } from '../utils/materiales';
import { useLogAction } from '../../logs/hooks/useLogAction.ts';
import { useFlashBanner } from '../../../global/components/FlashBanner';

export default function CrearRecetaPage() {
  const nav = useNavigate();
  const logRecetaEvent = useLogAction({ entity: "recipe" });
  const [receta, setReceta] = useState<RecetaDetalleDTO>({
    id: 'tmp',
    codigo: '',
    descripcion: '',
    version: 1,
    vigente: false,
    habilitada: true,
    cantidadBase: 1,
    unidadBase: 'UN',
    materiales: [],
    auditoria: { creadoPor: 'usuario', creadoEn: new Date().toISOString() },
  });
  const [importOpen, setImportOpen] = useState(false);
  const { showError, showInfo } = useFlashBanner();

  const headerChange = (patch: Partial<RecetaDetalleDTO>) => setReceta(r => ({ ...r, ...patch }));
  const setMateriales = (items: MaterialLinea[]) => setReceta(r => ({ ...r, materiales: items }));

  async function onSave(publicar: boolean) {
    const codigo = receta.codigo.trim();
    const descripcion = receta.descripcion.trim();

    if (!codigo || !descripcion) {
      showError('Debes definir Código y Descripción');
      return;
    }
    const duplicate = findDuplicateSku(receta.materiales);
    if (duplicate) {
      showError(`El SKU ${duplicate} está duplicado en la receta.`);
      return;
    }
    const created = await recetasApi.create({
      codigo,
      descripcion,
      cantidadBase: receta.cantidadBase,
      unidadBase: receta.unidadBase,
      materiales: receta.materiales,
      publicar,
    });
    void logRecetaEvent({
      event: "create",
      payload: {
        id: created.id,
        codigo: created.codigo,
        version: created.version,
        publicar,
      },
      userAlias: created.codigo,
    });
    if (publicar) {
      void logRecetaEvent({
        event: "publish",
        payload: {
          id: created.id,
          codigo: created.codigo,
          version: created.version,
        },
        userAlias: created.codigo,
      });
    }
    nav(`/recetas/${created.id}`);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Nueva Receta</h1>

      {/* Código y descripción (editables al crear) */}
      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-gray-500">Código</label>
          <input value={receta.codigo} onChange={e => headerChange({ codigo: e.target.value })} className="input input-bordered w-full" />
        </div>
        <div className="md:col-span-3">
          <label className="text-sm text-gray-500">Descripción</label>
          <input value={receta.descripcion} onChange={e => headerChange({ descripcion: e.target.value })} className="input input-bordered w-full" />
        </div>
      </div>

      {/* Resto del header (cantidad / U.M) */}
      <RecetaHeader receta={receta} onChange={headerChange} />

      <MaterialesGrid
        items={receta.materiales}
        onChange={setMateriales}
        onImport={() => setImportOpen(true)}
        onExport={() => showInfo("Export en detalle de receta.")}
      />

      <div className="flex justify-end gap-2">
        <button className="btn btn-outline" onClick={() => onSave(false)}>Guardar como borrador</button>
        <button className="btn btn-primary" onClick={() => onSave(true)}>Publicar</button>
      </div>

      <RecetaImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={(_modo, mats) => {
          setImportOpen(false);
          setMateriales(mats);
        }}
      />
    </div>
  );
}
