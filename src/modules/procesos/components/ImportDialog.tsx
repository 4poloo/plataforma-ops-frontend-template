import { useEffect, useMemo, useState } from "react";
import type { Proceso } from "../types";
import { parseCsvFile, validateImportRows } from "../utils/csvImport";

type Props = {
  open: boolean;
  onClose: () => void;
  existentes: Proceso[];
  onImportValidos: (rows: Proceso[]) => Promise<void>;
};

const MAX_MB = 5;
const MAX_ROWS = 10_000;

export default function ImportDialog({ open, onClose, existentes, onImportValidos }: Props) {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof validateImportRows> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setParsing(false);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleFile = async (f: File) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Archivo supera ${MAX_MB} MB.`);
      return;
    }
    if (!/\.csv$/i.test(f.name)) {
      setError("Solo se permite archivo .csv");
      return;
    }

    setError(null);
    setParsing(true);
    try {
      const rows = await parseCsvFile(f);
      if (rows.length > MAX_ROWS) throw new Error(`Máximo ${MAX_ROWS.toLocaleString()} filas.`);
      const validated = validateImportRows(rows, existentes);
      setResult(validated);
    } catch (e: any) {
      setError(e.message || "Error leyendo archivo.");
    } finally {
      setParsing(false);
    }
  };

  const totalValidos = result?.validos.length ?? 0;
  const totalInvalidos = result?.invalidos.length ?? 0;
  const canImport = useMemo(() => totalValidos > 0, [totalValidos]);

  const importNow = async () => {
    if (!result) return;
    await onImportValidos(result.validos);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Importar Procesos (.csv)</h3>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            {/* Botón custom para seleccionar archivo */}
            <label className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
              Seleccionar archivo
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <p className="text-xs text-slate-500 mt-2">
              Encabezados esperados: <code>codigo,nombre,costo</code>. Límite: {MAX_MB} MB y{" "}
              {MAX_ROWS.toLocaleString()} filas. Duplicados existentes se omiten.
            </p>
          </div>

          {parsing && <div>Leyendo archivo…</div>}
          {error && <div className="text-red-600">{error}</div>}

          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Válidos */}
              <div className="rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b font-semibold">Válidos ({totalValidos})</div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.validos.slice(0, 200).map((r) => (
                        <tr key={r.codigo} className="border-t">
                          <td className="px-3 py-1.5 font-mono">{r.codigo}</td>
                          <td className="px-3 py-1.5">{r.nombre}</td>
                          <td className="px-3 py-1.5 text-right">{r.costo.toFixed(2)}</td>
                        </tr>
                      ))}
                      {result.validos.length > 200 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-slate-500">
                            … {result.validos.length - 200} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inválidos */}
              <div className="rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b font-semibold">
                  Inválidos / Omitidos ({totalInvalidos})
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.invalidos.slice(0, 200).map((r, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-1.5">{r.__row ?? "-"}</td>
                          <td className="px-3 py-1.5 font-mono">{String(r.codigo ?? "")}</td>
                          <td className="px-3 py-1.5 text-red-600">{r.error}</td>
                        </tr>
                      ))}
                      {result.invalidos.length > 200 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-slate-500">
                            … {result.invalidos.length - 200} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-success"
            onClick={importNow}
            disabled={!canImport}
            title={!canImport ? "No hay filas válidas" : ""}
          >
            Importar válidos
          </button>
        </div>
      </div>
    </div>
  );
}
