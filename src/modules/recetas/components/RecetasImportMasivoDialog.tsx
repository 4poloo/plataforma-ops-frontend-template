import { useEffect, useMemo, useState } from "react";
import {
  clear,
  getManualUrl,
  getTemplateUrl,
  promote,
  stageCSV,
  status as fetchStatus,
  type ImportStageResp,
  type ImportStatusResp,
  type PromoteResp,
} from "../services/recetas-import.api";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

const EXPECTED_HEADERS = [
  "sku_PT",
  "version",
  "estado",
  "marcar_vigente",
  "base_qty",
  "unidad_PT",
  "sku_MP",
  "cantidad_por_base",
  "unidad_MP",
  "merma_pct",
  "process_codigo",
  "process_especial_nombre",
  "process_especial_costo",
  "fecha_publicacion",
  "publicado_por",
  "notas",
];

export default function RecetasImportMasivoDialog({ open, onClose, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [stageInfo, setStageInfo] = useState<ImportStageResp | null>(null);
  const [stageWarnings, setStageWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportStatusResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [overwriteVersion, setOverwriteVersion] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [promoteSummary, setPromoteSummary] = useState<PromoteResp | null>(null);
  const [lastRunDry, setLastRunDry] = useState<boolean | null>(null);

  const hasBatch = Boolean(batchId);
  const previewColumns = useMemo(() => {
    const cols = new Set<string>();
    preview?.first_rows?.forEach((row) =>
      Object.keys(row || {}).forEach((k) => {
        if (k) cols.add(k);
      })
    );
    if (cols.size > 0) return Array.from(cols);
    return EXPECTED_HEADERS;
  }, [preview]);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open]);

  function reset() {
    setFileName(null);
    setBatchId(null);
    setStageInfo(null);
    setStageWarnings([]);
    setPreview(null);
    setError(null);
    setPromoteSummary(null);
    setOverwriteVersion(false);
    setDryRun(false);
    setLastRunDry(null);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError("Solo se permite archivo .csv");
      return;
    }
    setLoadingStage(true);
    setError(null);
    setPromoteSummary(null);
    try {
      const staged = await stageCSV(file);
      setFileName(file.name);
      setBatchId(staged.batch_id);
      setStageInfo(staged);
      setStageWarnings(staged.warnings ?? []);
      await loadStatus(staged.batch_id);
    } catch (e: any) {
      setError(e?.message || "Error al subir el CSV.");
    } finally {
      setLoadingStage(false);
    }
  }

  async function loadStatus(batch: string) {
    if (!batch) return;
    setLoadingStatus(true);
    try {
      const st = await fetchStatus(batch);
      setPreview(st);
    } catch (e: any) {
      setError(e?.message || "Error consultando estado del lote.");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function runPromote(forceDryRun?: boolean) {
    if (!batchId) {
      setError("Primero sube un CSV para generar un batch_id.");
      return;
    }
    setPromoting(true);
    setError(null);
    setPromoteSummary(null);
    const useDryRun = typeof forceDryRun === "boolean" ? forceDryRun : dryRun;
    try {
      const resp = await promote({
        batch_id: batchId,
        overwrite_version: overwriteVersion,
        dry_run: useDryRun,
      });
      setPromoteSummary(resp);
      setLastRunDry(useDryRun);
      if (!useDryRun) onImported?.();
    } catch (e: any) {
      setError(e?.message || "Error al promover el lote.");
    } finally {
      setPromoting(false);
    }
  }

  async function handleClear() {
    if (!batchId) return;
    setClearing(true);
    setError(null);
    try {
      await clear(batchId);
      reset();
    } catch (e: any) {
      setError(e?.message || "No se pudo limpiar el lote.");
    } finally {
      setClearing(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Importar Recetas (.csv)</h3>
            <p className="text-sm text-slate-500">
              Sube el CSV, revisa el batch y luego promueve con o sin reemplazar versiones.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={getManualUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-[1px] hover:border-primary hover:text-primary hover:shadow-md"
            >
              Manual
            </a>
            <a
              href={getTemplateUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-[1px] hover:border-primary hover:text-primary hover:shadow-md"
            >
              Descargar plantilla
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-[1px] hover:border-primary hover:text-primary hover:shadow-md"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Formato esperado (cabeceras):{" "}
            <code className="break-all">{EXPECTED_HEADERS.join(", ")}</code>. Los Excel se
            procesan en el servidor, aquí solo CSV.
          </div>

          {/* Paso 1: subir CSV */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">1) Subir CSV a staging</p>
                <p className="text-xs text-slate-500">
                  Genera un <code>batch_id</code> y guarda las filas en staging_recipes.
                </p>
              </div>
              {batchId && (
                <div className="text-xs text-slate-500">
                  batch_id: <span className="font-mono text-slate-700">{batchId}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all cursor-pointer shadow-sm">
                Seleccionar CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </label>
              {fileName && (
                <span className="text-sm text-slate-600" title={fileName}>
                  {fileName} {loadingStage && "— subiendo..."}
                </span>
              )}
              {hasBatch && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => loadStatus(batchId!)}
                  disabled={loadingStatus}
                >
                  {loadingStatus ? "Actualizando..." : "Refrescar estado"}
                </button>
              )}
              {hasBatch && (
                <button
                  className="btn btn-sm btn-outline btn-error"
                  onClick={handleClear}
                  disabled={clearing}
                >
                  {clearing ? "Limpiando..." : "Limpiar staging"}
                </button>
              )}
            </div>

            {stageWarnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {stageWarnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </div>
            )}
            {stageInfo && (
              <div className="text-sm text-slate-700">
                Filas recibidas en staging: <b>{stageInfo.inserted}</b>
              </div>
            )}
          </div>

          {/* Paso 2: sample */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">2) Previsualización</p>
              <span className="text-xs text-slate-500">
                {preview ? `Total en batch: ${preview.total}` : "Sube un CSV para ver muestra"}
              </span>
            </div>

            <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {previewColumns.map((c) => (
                      <th key={c} className="px-2 py-1 text-left font-semibold text-slate-600">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview?.first_rows?.length ? (
                    preview.first_rows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {previewColumns.map((c) => (
                          <td key={c} className="px-2 py-1 text-slate-800">
                            {String((row as any)?.[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={previewColumns.length} className="px-3 py-3 text-center text-slate-500">
                        Sin filas para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paso 3: opciones y ejecutar */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">3) Promover a recetas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm hover:border-primary/60">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={overwriteVersion}
                  onChange={(e) => setOverwriteVersion(e.target.checked)}
                />
                <div>
                  <div className="font-semibold text-slate-800">Reemplazar versiones existentes</div>
                  <div className="text-xs text-slate-600">
                    Si la versión existe y el flag está activo, se reemplaza totalmente; si no existe, se agrega.
                  </div>
                </div>
              </label>

              <label className="flex gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm hover:border-primary/60">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <div>
                  <div className="font-semibold text-slate-800">Solo simular (dry_run)</div>
                  <div className="text-xs text-slate-600">
                    Calcula contadores sin modificar recetas. Usa el botón "Promocionar" o "Simular" con este flag.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-[1px] hover:border-primary hover:text-primary hover:shadow-md disabled:opacity-60"
                onClick={() => runPromote(true)}
                disabled={!hasBatch || promoting}
              >
                {promoting ? "Procesando..." : "Simular ahora"}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md disabled:opacity-70"
                onClick={() => runPromote()}
                disabled={!hasBatch || promoting}
              >
                {promoting ? "Procesando..." : "Promocionar"}
              </button>
            </div>

            {promoteSummary && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <div className="font-semibold mb-1">
                  Resultado {lastRunDry ? "(simulado)" : ""}:
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                  <span>Grupos procesados: {promoteSummary.gruposProcesados}</span>
                  <span>Recetas creadas: {promoteSummary.recetasCreadas}</span>
                  <span>Recetas actualizadas: {promoteSummary.recetasActualizadas}</span>
                  <span>Versiones agregadas: {promoteSummary.versionesAgregadas}</span>
                  <span>Versiones rechazadas: {promoteSummary.versionesRechazadas}</span>
                  <span>Vigentes seteadas: {promoteSummary.vigentesSeteadas}</span>
                </div>
                {(promoteSummary.warnings?.length ?? 0) > 0 && (
                  <div className="mt-2 text-amber-700">
                    {promoteSummary.warnings.map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                  </div>
                )}
                {(promoteSummary.errores?.length ?? 0) > 0 && (
                  <div className="mt-2 text-red-700">
                    {promoteSummary.errores.map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
