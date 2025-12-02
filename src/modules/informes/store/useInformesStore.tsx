import React from "react";
import type { FiltrosInformes, GroupBy } from "../types/informes";

// Store simple basado en Context para evitar dependencias externas.
// Persiste en querystring y en sessionStorage para mantener estado por ruta.

type StoreState = {
  filtros: FiltrosInformes;
  setFiltros: (next: Partial<FiltrosInformes>, merge?: boolean) => void;
  resetFiltros: () => void;
};

const DEFAULT_FROM = new Date(Date.now() - 6 * 24 * 3600 * 1000) // últimos 7 días
  .toISOString()
  .slice(0, 10);
const DEFAULT_TO = new Date().toISOString().slice(0, 10);

const defaultFiltros: FiltrosInformes = {
  from: DEFAULT_FROM,
  to: DEFAULT_TO,
  linea: [],
  sku: [],
  estado: [],
  groupBy: "day" as GroupBy,
  page: 1,
  pageSize: 20,
};

const KEY = "informes:filtros";

function readFromSession(): FiltrosInformes | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FiltrosInformes) : null;
  } catch {
    return null;
  }
}

function writeToSession(f: FiltrosInformes) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

const Ctx = React.createContext<StoreState | null>(null);

export const InformesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filtros, setFiltrosState] = React.useState<FiltrosInformes>(() => {
    return readFromSession() ?? defaultFiltros;
  });

  // sincronizar con sessionStorage
  React.useEffect(() => writeToSession(filtros), [filtros]);

  // sincronizar con querystring (básico: from/to/groupBy)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("from", filtros.from);
    params.set("to", filtros.to);
    params.set("groupBy", filtros.groupBy);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [filtros.from, filtros.to, filtros.groupBy]);

  const setFiltros = (next: Partial<FiltrosInformes>, merge = true) => {
    setFiltrosState((prev) => {
      const base = merge ? prev : defaultFiltros;
      const merged = { ...base, ...next };
      // al cambiar filtros base, resetear paginación
      merged.page = next.page ?? 1;
      return merged;
    });
  };

  const resetFiltros = () => setFiltrosState(defaultFiltros);

  return (
    <Ctx.Provider value={{ filtros, setFiltros, resetFiltros }}>
      {children}
    </Ctx.Provider>
  );
};

export const useInformesStore = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useInformesStore debe usarse dentro de InformesProvider");
  return ctx;
};
