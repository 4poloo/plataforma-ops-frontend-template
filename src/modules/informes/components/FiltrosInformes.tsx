import React from "react";
import { COPY } from "../copy/es";
import type { EstadoOT, GroupBy } from "../types/informes";
import { useInformesStore } from "../store/useInformesStore";

/**
 * Estructura solicitada:
 * - FILA 0: Rango de fechas (full width).
 * - FILA 1: Agrupar por | Producto/SKU (ocupa 2)  [md: 3 cols]
 * - FILA 2: Línea (multi) | Estado OT (multi)     [md: 2 cols]
 * - Botonera abajo a la derecha separada por una línea.
 */

const estados: EstadoOT[] = ["Creada", "En Proceso", "Cerrada", "Anulada"];
// Reemplazar por líneas del backend si ya las tienes:
const lineasDemo = ["AGUA", "ASEO HOGAR", "ROTATIVA", "PERIFERICOS", "VERDE", "GALON"];

const groupByOps: { label: string; value: GroupBy }[] = [
  { label: COPY.filtros.day, value: "day" },
  { label: COPY.filtros.week, value: "week" },
  { label: COPY.filtros.month, value: "month" },
];

type Props = { onApply: () => void; onClear: () => void };

const FiltrosInformes: React.FC<Props> = ({ onApply, onClear }) => {
  const { filtros, setFiltros } = useInformesStore();

  const handleMultiChange = (
    key: "linea" | "estado",
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const values = Array.from(e.target.selectedOptions).map((o) => o.value);
    setFiltros({ [key]: values } as any);
  };

  return (
    <fieldset className="rounded-2xl border p-4 sm:p-5">
      <legend className="px-2 text-sm font-medium text-gray-700">
        {COPY.titulo} · Filtros
      </legend>

      {/* FILA 0 — Rango de fechas (full width) */}
      <div className="mt-2">
        <label className="mb-1 block text-sm text-gray-600">{COPY.filtros.rango}</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            className="w-full rounded border p-2"
            value={filtros.from}
            onChange={(e) => setFiltros({ from: e.target.value })}
          />
          <span className="hidden select-none text-gray-400 sm:block">—</span>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={filtros.to}
            onChange={(e) => setFiltros({ to: e.target.value })}
          />
        </div>
      </div>

      {/* FILA 1 — Agrupar por | Producto/SKU  (grid estándar, sin posiciones absolutas) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Agrupar por */}
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-gray-600">{COPY.filtros.agrupar}</label>
          <select
            className="w-full rounded border p-2"
            value={filtros.groupBy}
            onChange={(e) => setFiltros({ groupBy: e.target.value as GroupBy })}
          >
            {groupByOps.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Producto / SKU (ocupa 2 columnas en md+) */}
        <div className="min-w-0 md:col-span-2">
          <label className="mb-1 block text-sm text-gray-600">{COPY.filtros.sku}</label>
          <input
            type="text"
            className="w-full rounded border p-2"
            placeholder="Ej: PT-001, PT-014 (separar por coma)"
            onBlur={(e) => {
              const arr = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setFiltros({ sku: arr });
            }}
          />
          <span className="mt-1 block text-xs text-gray-400">
            Presiona fuera del input para aplicar la lista.
          </span>
        </div>
      </div>

      {/* FILA 2 — Línea y Estado OT (multiselección) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Línea */}
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-gray-600">{COPY.filtros.linea}</label>
          <select
            multiple
            className="h-28 w-full rounded border p-2"
            value={filtros.linea}
            onChange={(e) => handleMultiChange("linea", e)}
          >
            {lineasDemo.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-400">
            Puedes seleccionar múltiples líneas (Ctrl/Cmd + clic).
          </span>
        </div>

        {/* Estado OT */}
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-gray-600">{COPY.filtros.estado}</label>
          <select
            multiple
            className="h-28 w-full rounded border p-2"
            value={filtros.estado}
            onChange={(e) => handleMultiChange("estado", e)}
          >
            {estados.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-400">
            Puedes seleccionar múltiples estados (Ctrl/Cmd + clic).
          </span>
        </div>
      </div>

      {/* Separador y botonera */}
      <div className="my-4 border-t border-gray-200" />
      <div className="flex w-full items-center justify-end gap-2">
        <button
          className="rounded-md border px-3 py-2 text-sm hover:border-secondary hover:bg-secondary hover:text-white"
          onClick={onClear}
        >
          {COPY.filtros.limpiar}
        </button>
        <button
          className="rounded-md border px-3 py-2 text-sm hover:border-primary hover:bg-primary hover:text-white"
          onClick={onApply}
        >
          {COPY.filtros.aplicar}
        </button>
      </div>
    </fieldset>
  );
};

export default FiltrosInformes;
