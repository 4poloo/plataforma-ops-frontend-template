import { useEffect, useState } from 'react';
import type { RecetaDetalleDTO } from '../models/receta.model';
import type { ValorizacionResp } from '../models/valorizacion.model';
import { costosApi } from '../services/recetas-costos.api';

export function useValorizacion(receta?: RecetaDetalleDTO, open?: boolean) {
  const [data, setData] = useState<ValorizacionResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Si está cerrado o no hay receta, limpiar estado y salir
    if (!open || !receta) {
      setData(null);
      setErr(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setErr(null);
    setData(null);

    costosApi
      .valorizar(receta)
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setErr(e.message || 'Error al valorizar'); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [receta, open]);

  return { data, loading, err };
}
