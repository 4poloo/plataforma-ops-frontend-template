import { useEffect, useState } from 'react';
import type {FC} from 'react';
import { recetasApi } from '../services/recetas.api';

type RecetaHistItem = {
  version: number;
  fecha: string;
  usuario: string;
  notas?: string | null;
};

const RecetaHistoryModal: FC<{ recetaId: string; open: boolean; onClose: () => void; }> = ({ recetaId, open, onClose }) => {
  const [rows, setRows] = useState<RecetaHistItem[]>([]);
  useEffect(() => { if (open) recetasApi.getHistory(recetaId).then(setRows); }, [recetaId, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Historial de versiones</h3>
          <button className="btn btn-sm btn-outline" onClick={onClose}>Cerrar</button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="p-2">Versión</th><th className="p-2">Fecha</th><th className="p-2">Usuario</th><th className="p-2">Notas</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-center">{r.version}</td>
                  <td className="p-2">{new Date(r.fecha).toLocaleString()}</td>
                  <td className="p-2">{r.usuario}</td>
                  <td className="p-2">{r.notas ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default RecetaHistoryModal;
