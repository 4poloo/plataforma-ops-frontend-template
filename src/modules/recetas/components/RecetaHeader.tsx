import type { FC } from 'react';
import type { RecetaDetalleDTO } from '../models/receta.model';

interface Props {
  receta: RecetaDetalleDTO;
  onChange: (patch: Partial<RecetaDetalleDTO>) => void;
  onHistory?: () => void;
  editableDescripcion?: boolean;
}
const RecetaHeader: FC<Props> = ({ receta, onChange, onHistory, editableDescripcion = false }) => {
  const showHistory = typeof onHistory === 'function';

  return (
    <div className="grid md:grid-cols-4 gap-3">
      <div>
        <label className="text-sm text-gray-500">Código</label>
        <input value={receta.codigo} readOnly className="input input-bordered w-full bg-gray-50" />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-gray-500">Descripción</label>
        <input
          value={receta.descripcion}
          readOnly={!editableDescripcion}
          onChange={
            editableDescripcion ? (e) => onChange({ descripcion: e.target.value }) : undefined
          }
          className={`input input-bordered w-full ${editableDescripcion ? '' : 'bg-gray-50'}`}
        />
      </div>
      <div className="flex items-end gap-2">
        {receta.vigente ? <span className="badge badge-success rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white">Versión vigente</span> : <span className="badge">Borrador</span>}
        {showHistory && (
          <button
            className="btn btn-outline btn-sm rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white"
            onClick={() => onHistory?.()}
          >
            Historial
          </button>
        )}
      </div>
      <div>
        <label className="text-sm text-gray-500">Cantidad base</label>
        <input type="number" step="0.001" value={receta.cantidadBase}
               onChange={e => onChange({ cantidadBase: Number(e.target.value) })}
               className="input input-bordered w-full" />
      </div>
      <div>
        <label className="text-sm text-gray-500">U/M base</label>
        <input value={receta.unidadBase}
               onChange={e => onChange({ unidadBase: e.target.value })}
               className="input input-bordered w-full" />
      </div>
    </div>
  );
};
export default RecetaHeader;
