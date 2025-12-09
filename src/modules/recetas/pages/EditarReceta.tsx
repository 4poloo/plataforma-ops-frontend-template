import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import RecetaHeader from '../components/RecetaHeader';
import MaterialesGrid from '../components/MaterialesGrid';
import RecetaHistoryModal from '../components/RecetaHistoryModal';
import RecetaImportDialog from '../components/RecetaImportDialog';
import ValorizacionPanel from '../components/ValorizacionPanel';

import { recetasApi } from '../services/recetas.api';
import type { MaterialLinea, RecetaDetalleDTO } from '../models/receta.model';
import { useLogAction } from '../../logs/hooks/useLogAction';

export default function EditarRecetaPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [receta, setReceta] = useState<RecetaDetalleDTO | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const logRecetaEvent = useLogAction({ entity: "recipe" });

  useEffect(() => {
    (async () => {
      if (id) setReceta(await recetasApi.getById(id));
    })();
  }, [id]);

  // Permitimos cambiar 'descripcion' (nombre). Bloqueamos 'codigo'.
  const patch = (p: Partial<RecetaDetalleDTO>) => {
    if ('codigo' in p) delete (p as any).codigo;
    setReceta((r) => (r ? { ...r, ...p } : r));
  };

  const setMateriales = (items: MaterialLinea[]) => {
    patch({ materiales: items });
  };

  async function cloneV() {
    if (!receta) return;
    const r: RecetaDetalleDTO = await recetasApi.cloneVersion(receta.id);
    void logRecetaEvent({
      event: "clone",
      payload: {
        id: r.id,
        codigo: r.codigo,
        version: r.version,
      },
      userAlias: r.codigo,
    });
    nav(`/recetas/${r.id}`);
  }

  if (!receta) return <div className="p-4">Cargando…</div>;

  // Ocultamos visualmente el "versión vigente" (sin tocar el componente)
  const headerReceta: RecetaDetalleDTO = { ...receta, vigente: undefined as any };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar Receta</h1>
        <Link to="/recetas" className="btn btn-outline btn-sm">
          Volver
        </Link>
      </div>

      <div className="[&_span.badge]:hidden">
        <RecetaHeader
          receta={headerReceta}
          onChange={patch}
          onHistory={() => setHistoryOpen(true)}
        />
      </div>

      <MaterialesGrid
        items={receta.materiales}
        onChange={setMateriales}
        onImport={() => setImportOpen(true)}
      />

      <div className="flex justify-end gap-2">
        <button className="btn" onClick={cloneV}>
          Clonar como nueva versión
        </button>
      </div>

      <ValorizacionPanel receta={receta} />

      <RecetaHistoryModal
        recetaId={receta.id}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <RecetaImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={async (modo, mats) => {
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
          setImportOpen(false);
          setReceta(await recetasApi.getById(receta.id));
        }}
      />
    </div>
  );
}
