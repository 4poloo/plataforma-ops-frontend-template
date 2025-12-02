import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { MaterialLinea } from '../models/receta.model';
import { recetasApi } from '../services/recetas.api';

interface Props {
  items: MaterialLinea[];
  onChange: (items: MaterialLinea[]) => void;
  onImport: () => void;
  onExport?: () => void;
}

const MaterialesGrid: FC<Props> = ({ items, onChange, onImport, onExport }) => {
  const itemsRef = useRef(items);
  const [loadingSku, setLoadingSku] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [duplicates, setDuplicates] = useState<Record<number, boolean>>({});
  const lastResolved = useRef<Record<number, string>>({});
  const controllers = useRef<Record<number, AbortController | null>>({});

  useEffect(() => {
    itemsRef.current = items;
    const counts = new Map<string, number[]>();
    items.forEach((mat, idx) => {
      const sku = (mat?.sku ?? '').trim().toUpperCase();
      if (!sku) return;
      const arr = counts.get(sku) ?? [];
      arr.push(idx);
      counts.set(sku, arr);
    });
    const dupeIdx: Record<number, boolean> = {};
    counts.forEach((list) => {
      if (list.length > 1) {
        list.forEach((idx) => {
          dupeIdx[idx] = true;
        });
      }
    });
    setDuplicates(dupeIdx);
  }, [items]);

  useEffect(() => {
    const activeControllers = controllers.current;
    return () => {
      Object.values(activeControllers).forEach((ctrl) => ctrl?.abort());
    };
  }, []);

  const clearError = (idx: number) => {
    setErrors((prev) => {
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const stopLoading = (idx: number) => {
    setLoadingSku((prev) => {
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const update = (idx: number, patch: Partial<MaterialLinea>) => {
    const copy = [...itemsRef.current];
    copy[idx] = { ...copy[idx], ...patch };
    onChange(copy);
  };
  const add = () => onChange([...itemsRef.current, { sku: '', descripcion: '', unidad: 'UN', cantidad: 0 }]);
  const del = (idx: number) => {
    const copy = itemsRef.current.slice();
    copy.splice(idx, 1);
    onChange(copy);
  };

  const handleSkuChange = (idx: number, value: string) => {
    controllers.current[idx]?.abort();
    controllers.current[idx] = null;
    stopLoading(idx);
    clearError(idx);
    lastResolved.current[idx] = '';

    update(idx, { sku: value.toUpperCase() });
  };

  const handleSkuBlur = async (idx: number) => {
    const current = itemsRef.current[idx];
    const normalized = (current?.sku ?? '').trim().toUpperCase();

    if ((current?.sku ?? '') !== normalized) {
      update(idx, { sku: normalized });
    }

    if (!normalized) {
      clearError(idx);
      lastResolved.current[idx] = '';
      update(idx, { descripcion: '', unidad: 'UN' });
      return;
    }

    if (lastResolved.current[idx] === normalized) return;

    controllers.current[idx]?.abort();
    const ctrl = new AbortController();
    controllers.current[idx] = ctrl;
    setLoadingSku((prev) => ({ ...prev, [idx]: true }));
    clearError(idx);

    // Limpiamos los campos antes de traer los datos reales
    update(idx, { descripcion: '', unidad: 'UN' });

    try {
      const info = await recetasApi.getMaterialBySku(normalized, { signal: ctrl.signal });
      if (!info) {
        setErrors((prev) => ({ ...prev, [idx]: 'SKU no encontrado' }));
        lastResolved.current[idx] = '';
        return;
      }
      lastResolved.current[idx] = info.sku.toUpperCase();
      update(idx, {
        sku: info.sku.toUpperCase(),
        descripcion: info.descripcion ?? '',
        unidad: info.unidad ?? 'UN',
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
      setErrors((prev) => ({
        ...prev,
        [idx]:
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo cargar el material',
      }));
      lastResolved.current[idx] = '';
    } finally {
      stopLoading(idx);
      controllers.current[idx] = null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={add} className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white">
          Añadir material</button>
        <button onClick={onImport} className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white">Importar</button>
        {onExport && (
          <button onClick={onExport} className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:border-secondary hover:text-white">Exportar</button>
        )}
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-center">U/M</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Sin materiales</td></tr>}
            {items.map((m, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={m.sku}
                      onChange={e => handleSkuChange(i, e.target.value)}
                      onBlur={() => handleSkuBlur(i)}
                      className="input input-bordered w-36"
                    />
                    {loadingSku[i] && <span className="text-xs text-gray-500">Buscando…</span>}
                  </div>
                  {(errors[i] || duplicates[i]) && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors[i] || 'SKU duplicado en la receta'}
                    </p>
                  )}
                </td>
                <td className="p-2"><input value={m.descripcion ?? ''} onChange={e => update(i, { descripcion: e.target.value })} className="input input-bordered w-full" /></td>
                <td className="p-2 text-center"><input value={m.unidad} onChange={e => update(i, { unidad: e.target.value })} className="input input-bordered w-20 text-center" /></td>
                <td className="p-2 text-right"><input type="number" step="0.001" value={m.cantidad} onChange={e => update(i, { cantidad: Number(e.target.value) })} className="input input-bordered w-28 text-right" /></td>
                <td className="p-2 text-center">
                  <button onClick={() => del(i)} className="btn btn-xs btn-error hover:text-red-500 ">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default MaterialesGrid;
