export type Proceso = {
  codigo: string;   // Único (case-insensitive)
  nombre: string;
  costo: number;    // número puro
  creadoEn?: string;
  actualizadoEn?: string;
};

export type SortKey = 'codigo' | 'nombre' | 'costo';
export type SortOrder = 'asc' | 'desc';

export type Filtros = {
  search: string;          // busca en código/nombre
  costoMin?: number | null;
  costoMax?: number | null;
  sortBy: SortKey;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
};
