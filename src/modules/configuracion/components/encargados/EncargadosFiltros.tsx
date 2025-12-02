import { useEffect, useMemo, useState } from "react";

type Props = {
  lineas?: string[];
  onApply: (filters: { q: string; linea: string }) => void;
  onClear: () => void;
};

const sanitizeLineas = (lineas?: string[]) =>
  Array.from(
    new Set(
      (lineas ?? [])
        .map((linea) => linea?.trim())
        .filter((linea): linea is string => !!linea)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

export default function EncargadosFiltros({ lineas, onApply, onClear }: Props) {
  const [q, setQ] = useState("");
  const [linea, setLinea] = useState("Todas");

  useEffect(() => {
    setLinea("Todas");
  }, [lineas]);

  const lineOptions = useMemo(() => ["Todas", ...sanitizeLineas(lineas)], [lineas]);

  return (
    <div className="rounded-2xl bg-white shadow p-4 border-1">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Buscar</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nombre o línea"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Línea</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={linea}
            onChange={(e) => setLinea(e.target.value)}
          >
            {lineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            onClick={() => onApply({ q, linea })}
            className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white hover:border-secondary"
          >
            Aplicar
          </button>
          <button
            onClick={() => {
              setQ("");
              setLinea("Todas");
              onClear();
            }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
