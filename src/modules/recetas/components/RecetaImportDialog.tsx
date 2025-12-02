import { useMemo, useRef, useState } from "react";
import { parseFile } from "../services/recetas-import.api";
import type { MaterialLinea } from "../models/receta.model";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (modo: "REPLACE" | "UPSERT", materiales: MaterialLinea[]) => void;
};

export default function RecetaImportDialog({
  open,
  onClose,
  onConfirm,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mater, setMater] = useState<MaterialLinea[]>([]);
  const [modo, setModo] = useState<"REPLACE" | "UPSERT">("REPLACE");
  const [err, setErr] = useState<string | null>(null);

  const ready = useMemo(() => mater.length > 0 && !err, [mater, err]);

  if (!open) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErr(null);
    setMater([]);

    try {
      const res = await parseFile(f);
      setMater(res.materiales);
    } catch (e: any) {
      setErr(e?.message ?? "Error al parsear archivo");
    }
  }

  function confirm() {
    if (!ready) return;
    onConfirm(modo, mater);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-lg ring-1 ring-black/5">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Importar materiales</h3>
          <button className="btn btn-sm btn-outline" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Aviso de seguridad */}
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Por seguridad, la importación <b>Excel (.xlsx/.xls)</b> se realizará en el{" "}
            <b>servidor</b>. En esta etapa el navegador acepta <b>CSV</b> y <b>JSON</b>.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selección de archivo */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Archivo a importar</p>
                <span className="text-[11px] uppercase tracking-wide text-slate-500">
                  CSV / JSON
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={onPick}
                />
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:border-primary hover:text-primary transition-all shadow-sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Seleccionar archivo
                </button>
                {file && (
                  <span className="text-xs text-slate-600 truncate" title={file.name}>
                    {file.name}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Máximo 1 archivo. Usa separador <code>,</code> o <code>;</code>. Asegúrate que
                el SKU y cantidad estén presentes.
              </p>

              {err && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}
            </div>

            {/* Modo de importación */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Modo de importación</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  className={`rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                    modo === "REPLACE"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 hover:border-primary/60"
                  }`}
                  onClick={() => setModo("REPLACE")}
                >
                  <span className="block font-semibold">REPLACE</span>
                  <span className="text-xs text-slate-600">
                    Reemplaza todos los materiales de la receta con este archivo.
                  </span>
                </button>
                <button
                  className={`rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                    modo === "UPSERT"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 hover:border-primary/60"
                  }`}
                  onClick={() => setModo("UPSERT")}
                >
                  <span className="block font-semibold">UPSERT</span>
                  <span className="text-xs text-slate-600">
                    Agrega o actualiza por SKU manteniendo los materiales existentes.
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-auto border rounded-xl border-slate-200 max-h-80">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">SKU</th>
                  <th className="p-2 text-left">Descripción</th>
                  <th className="p-2 text-center">U/M</th>
                  <th className="p-2 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {mater.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      Sin filas para previsualizar
                    </td>
                  </tr>
                )}
                {mater.map((m, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono">{m.sku}</td>
                    <td className="p-2">{m.descripcion}</td>
                    <td className="p-2 text-center">{m.unidad}</td>
                    <td className="p-2 text-right">{m.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-4 border-t bg-slate-50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-slate-500">
            Revisa el archivo y confirma el modo antes de importar.
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button disabled={!ready} className="btn btn-primary" onClick={confirm}>
              Importar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
