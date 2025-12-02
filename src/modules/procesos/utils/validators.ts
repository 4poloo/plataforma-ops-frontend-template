import type { Proceso } from '../types';

export const isNonEmpty = (v: string) => v.trim().length > 0;

export function validateProceso(p: Partial<Proceso>) {
  const errors: Record<string, string> = {};
  if (!p.codigo || !isNonEmpty(p.codigo)) errors.codigo = 'Código requerido.';
  else if (p.codigo.length > 20) errors.codigo = 'Máx. 20 caracteres.';

  if (!p.nombre || !isNonEmpty(p.nombre)) errors.nombre = 'Nombre requerido.';
  else if (p.nombre.length > 120) errors.nombre = 'Máx. 120 caracteres.';

  if (p.costo === undefined || p.costo === null || Number.isNaN(p.costo))
    errors.costo = 'Costo requerido.';
  else if (p.costo < 0) errors.costo = 'Costo no puede ser negativo.';
  else if (!/^\d+(\.\d{1,2})?$/.test(String(p.costo)))
    errors.costo = 'Máx. 2 decimales.';

  return { ok: Object.keys(errors).length === 0, errors };
}

export const normalizeCodigo = (s: string) => s.trim().toUpperCase();

