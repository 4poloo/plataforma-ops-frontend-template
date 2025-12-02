import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import RecetasSearchBar from '../components/RecetasSearchBar';
import RecetasTable from '../components/RecetasTable';
import RecetasImportMasivoDialog from '../components/RecetasImportMasivoDialog';

import { useRecetas } from '../hooks/useRecetas';
import { recetasApi } from '../services/recetas.api';
import type { RecetaDetalleDTO } from '../models/receta.model';
import { useFlashBanner } from '../../../global/components/FlashBanner';

export default function RecetasPage() {
  const nav = useNavigate();
  const s = useRecetas();
  const { error, clearError } = s;
  const { showError } = useFlashBanner();
  const [importOpen, setImportOpen] = useState(false);

  const reportError = (err: unknown, fallback: string) => {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message.trim()
        : fallback || "Ha ocurrido un error al ejecutar la acción.";
    showError(message);
  };

  useEffect(() => {
    if (!error) return;
    showError(error);
    clearError();
  }, [error, showError, clearError]);

  async function onDisable(id: string, habilitar: boolean) {
    try {
      await recetasApi.toggleHabilitada(id, habilitar);
      s.refresh();
    } catch (err) {
      reportError(err, "Ha ocurrido un error al actualizar la receta.");
    }
  }

  async function onClone(id: string) {
    try {
      const rec: RecetaDetalleDTO = await recetasApi.cloneVersion(id);
      nav(`/recetas/${rec.id}`);
    } catch (err) {
      reportError(err, "Ha ocurrido un error al clonar la receta.");
    }
  }

  function onEdit(id: string) {
    nav(`/recetas/${id}`);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Recetas</h1>

      <RecetasSearchBar
        codigo={s.codigo}
        setCodigo={s.setCodigo}
        descripcion={s.descripcion}
        setDescripcion={s.setDescripcion}
        skuExacto={s.skuExacto}
        setSkuExacto={s.setSkuExacto}
        estado={s.estado}               
        setEstado={s.setEstado}         
        onNew={() => nav('/recetas/new')}
        onImport={() => setImportOpen(true)}
        onRefresh={s.refresh}
      />

      <RecetasTable
        rows={s.rows}
        loading={s.loading}
        onDisable={onDisable}
        onClone={onClone}
        onEdit={onEdit}
        page={s.page}
        pages={s.pages}
        onPageChange={s.setPage}
      />

      {/* Import masivo (preview cliente) */}
      <RecetasImportMasivoDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => s.refresh()}
      />
    </div>
  );
}
