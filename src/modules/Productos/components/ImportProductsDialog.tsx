// components/ImportProductsDialog.tsx
import { useEffect, useMemo, useState } from "react";
import {
  // ⬇️ Usamos estos 3 helpers del service (backend)
  downloadImportTemplate,   // GET /api/v1/products/import/template -> descarga CSV
  importValidate,           // POST /api/v1/products/import/validate -> retorna preview + batchId
  importConfirm,            // POST /api/v1/products/import/confirm -> ejecuta import
} from "../services/productos.api";

type BackendPreview = {
  batchId: string;
  columns: string[];
  rows: Array<Record<string, any>>;
  errorsByRow: Record<number, string[]>;
  warningsByRow: Record<number, string[]>;
};

export default function ImportProductsDialog({
  open = true,
  onClose,
  notify,
  onDone,
}: {
  open?: Boolean;
  onClose: () => void;
  notify: (type: "success" | "error", msg: string) => void;
  onDone?: () => void;
}) {
  // Estado del flujo
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackendPreview | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Totales de preview del backend (para UI)
  const totalPreview = preview?.rows?.length ?? 0;
  const totalErrores = useMemo(
    () => Object.keys(preview?.errorsByRow ?? {}).length,
    [preview]
  );
  const totalWarnings = useMemo(
    () => Object.keys(preview?.warningsByRow ?? {}).length,
    [preview]
  );

  const CSV_TO_PAYLOAD: Record<string, string> = {
    SKU: "sku",
    CODIGO_BARRA: "c_barra",
    NOMBRE: "nombre",
    UNIDAD_MEDIDA: "unidad",
    NOMBRE_GRUPO: "dg",
    CODIGO_GRUPO: "codigo_g",
    NOMBRE_SUBGRUPO: "dsg",
    CODIGO_SUBGRUPO: "codigo_sg",
    PRECIO_NETO: "pneto",
    VALOR_REPOSICION: "valor_repo",
    CLASIFICACION: "tipo",
    PIVA: "piva",
  };

  // 🔎 Lee celda: intenta exacta (row["SKU"]) y si no existe usa fallback (row["sku"])
  const cellValue = (row: Record<string, any>, column: string) => {
    if (!row) return "";
    if (column in row) return row[column];
    const fb = CSV_TO_PAYLOAD[column];
    if (fb && fb in row) return row[fb];
    return "";
  };


  // 1) DESCARGAR PLANTILLA
  // - Llama al service que hace fetch al endpoint y dispara la descarga (Blob + <a> hidden).
  // - No cambiamos estilos del botón; solo la lógica.
  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate(); // ← GET /import/template
      notify("success", "Plantilla descargada.");
    } catch (e: any) {
      notify("error", e?.message || "No se pudo descargar la plantilla");
    }
  };

  // 2) VALIDAR CSV EN BACKEND (subir archivo)
  // - Verifica extensión .csv y tamaño básico.
  // - Envía el archivo al endpoint /import/validate (FormData).
  // - El backend responde con { batchId, columns, rows, errorsByRow, warningsByRow }.
  // - Guardamos esa info en 'preview' para mostrar al usuario.
  const handleFile = async (f: File) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      setError("Solo se permite archivo .csv");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Archivo supera 5 MB.");
      return;
    }

    setError(null);
    setFile(f);
    setValidating(true);
    try {
      const resp = await importValidate(f); // ← POST /import/validate
      setPreview(resp);
      notify("success", "Archivo validado. Revisa el preview y confirma.");
    } catch (e: any) {
      setPreview(null);
      setFile(null);
      setError(e?.message || "Error validando archivo.");
      notify("error", e?.message || "Error validando archivo.");
    } finally {
      setValidating(false);
    }
  };

  // 3) CONFIRMAR IMPORTACIÓN
  // - Envía el batchId al endpoint /import/confirm.
  // - El backend inserta/actualiza y responde un resumen { ok, created, updated, skipped }.
  const handleConfirm = async () => {
    if (!preview?.batchId) return;
    setConfirming(true);
    try {
      const resp = await importConfirm(preview.batchId); // ← POST /import/confirm
      if (resp?.ok) {
        notify(
          "success",
          `Importación OK. Creados: ${resp.created}, Actualizados: ${resp.updated}, Omitidos: ${resp.skipped}`
        );
        onDone?.();
        onClose();
      } else {
        notify("error", "No se pudo confirmar la importación.");
      }
    } catch (e: any) {
      notify("error", e?.message || "Error confirmando importación.");
    } finally {
      setConfirming(false);
    }
  };

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
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Importar Productos (.csv)</h3>

          {/* Botón: Descargar plantilla (misma UI, solo lógica agregada) */}
          <button
            className="rounded-xl shadow transition-all hover:shadow-warning hover:shadow-xs border px-3 py-2 text-sm hover:bg-gray-50 hover:border-secondary"
            onClick={handleDownloadTemplate}
            title="Descargar plantilla CSV para rellenar"
          >
            Descargar plantilla
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Subida de archivo: NO se tocan estilos */}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center justify-center rounded-xl border border-slate-300 transition-all hover:border-warning bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
              Seleccionar archivo CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) handleFile(f);
                }}
              />
            </label>
            {file && (
              <span className="text-sm text-slate-600">
                {file.name} {validating && "— validando…"}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Separador requerido: <code>;</code>  Encabezados:{" "}
            <code>
              SKU;CODIGO_BARRA;NOMBRE;UNIDAD_MEDIDA;NOMBRE_GRUPO;NOMBRE_SUBGRUPO;PRECIO_NETO;VALOR_REPOSICION;CLASIFICACION
            </code>
          </p>

          {error && <div className="text-red-600">{error}</div>}

           {/* Preview del backend */}
          {preview && (
            <div className="rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b font-semibold">
                Preview válidos ({totalPreview})
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {(preview.columns || []).map((c) => (
                        <th key={c} className="px-3 py-2 text-left">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {(preview.columns || []).map((c) => (
                          <td key={c} className="px-3 py-1.5">
                            {String(cellValue(row, c) ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {preview.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={preview.columns.length}
                          className="px-3 py-3 text-center text-slate-500"
                        >
                          Sin filas válidas para previsualizar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs text-slate-500">
                El backend limita el preview (no muestra todas las filas).
              </div>
            </div>
          )}

          {/* Errores / Warnings (abajo del preview) */}
          {preview && (
            <div className="rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b font-semibold">
                Errores ({totalErrores}) / Warnings ({totalWarnings})
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Fila</th>
                      <th className="px-3 py-2 text-left">Errores</th>
                      <th className="px-3 py-2 text-left">Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set([
                        ...Object.keys(preview.errorsByRow || {}),
                        ...Object.keys(preview.warningsByRow || {}),
                      ])
                    )
                      .slice(0, 1000)
                      .map((rowStr) => {
                        const row = Number(rowStr);
                        const errs = preview.errorsByRow[row] || [];
                        const warns = preview.warningsByRow[row] || [];
                        return (
                          <tr key={row} className="border-t align-top">
                            <td className="px-3 py-1.5">{row}</td>
                            <td className="px-3 py-1.5 text-red-600">
                              {errs.length ? (
                                <ul className="list-disc ml-4">{errs.map((e, i) => <li key={i}>{e}</li>)}</ul>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-amber-700">
                              {warns.length ? (
                                <ul className="list-disc ml-4">{warns.map((w, i) => <li key={i}>{w}</li>)}</ul>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {totalErrores + totalWarnings === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                          Sin errores ni advertencias.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs text-slate-500">
                Las filas con error no se insertarán; quedarán como <em>skipped</em> en la confirmación.
              </div>
            </div>
          )}
        </div>

        {/* Footer acciones (sin tocar estilos) */}
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-success disabled:opacity-50"
            onClick={handleConfirm}
            disabled={!preview?.batchId || confirming}
            title={!preview?.batchId ? "Primero valida un archivo" : ""}
          >
            {confirming ? "Importando…" : "Confirmar importación"}
          </button>
        </div>
      </div>
    </div>
  );
}
