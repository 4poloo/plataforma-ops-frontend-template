import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiUpload,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiFile,
  FiEdit2,
  FiDownload,
  FiPlus,
  FiSend,
} from "react-icons/fi";
import { importOtCsv } from "../services/ot-import.api";

/**
 * Carga masiva de productos por CSV con PREVISUALIZACIÓN y EDICIÓN en el front.
 * - Lee el archivo CSV en el navegador y lo renderiza como tabla editable.
 * - Los encabezados (headers) se muestran bloqueados (no editables) para evitar romper el formato esperado por el backend.
 * - “Descargar CSV editado” permite exportar lo modificado.
 * - No envía al backend: el payload se entrega al formulario padre para usar el botón Crear OT.
 */

type Preview = {
  headers: string[];
  rows: string[][];
  totalRows: number;
};

export type CsvRow = string[];

type Props = {
  onLoad?: (rows: CsvRow[]) => void;
};

export default function ProductosAFabricarBulkUpload({ onLoad }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<null | { ok: boolean; message: string }>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [sending, setSending] = useState(false);

  // Lee el archivo seleccionado
  const onSelectFile = (f: File | null) => {
    setErr(null);
    setSent(null);
    setPreview(null);
    setText("");
    setFile(f);
    setIsEditing(false);
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setErr("El archivo debe ser .csv");
      setFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result ?? "");
      setText(t);
    };
    reader.onerror = () => setErr("No se pudo leer el archivo");
    reader.readAsText(f, "utf-8");
  };

  // Parseo del CSV
  useEffect(() => {
    if (!text) return;
    try {
      const { headers, rows } = parseCsv(text);
      setPreview({ headers, rows, totalRows: rows.length });
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "No se pudo parsear el CSV";
      setErr(msg);
    }
  }, [text]);

  const fileInfo = useMemo(() => {
    if (!file) return null;
    const kb = (file.size / 1024).toFixed(1);
    return `${file.name} — ${kb} KB`;
  }, [file]);

  // Helpers de edición
  const setCell = (r: number, c: number, value: string) => {
    if (!preview) return;
    setPreview(prev => {
      if (!prev) return prev;
      const rows = prev.rows.map((row, idx) =>
        idx === r ? row.map((cell, j) => (j === c ? value : cell)) : row
      );
      return { ...prev, rows, totalRows: rows.length };
    });
  };

  const addRow = () => {
    if (!preview) return;
    setPreview(prev => {
      if (!prev) return prev;
      const empty = Array(prev.headers.length).fill("");
      const rows = [...prev.rows, empty];
      return { ...prev, rows, totalRows: rows.length };
    });
  };

  const removeRow = (r: number) => {
    if (!preview) return;
    setPreview(prev => {
      if (!prev) return prev;
      const rows = prev.rows.filter((_, i) => i !== r);
      return { ...prev, rows, totalRows: rows.length };
    });
  };

  // CSV a string (con escape de comillas y comas)
  const buildCsvString = (): string => {
    if (!preview) return "";
    const { headers, rows } = preview;
    const esc = (v: string) => {
      const s = String(v ?? "");
      // Si contiene comillas, coma o salto de línea, va entre comillas y se duplican las comillas internas
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const head = headers.map(esc).join(",");
    const body = rows.map(r => r.map(esc).join(",")).join("\n");
    return `${head}\n${body}`;
  };

  const onDownloadEdited = () => {
    const csv = buildCsvString();
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    const baseName = (file?.name || "archivo.csv").replace(/\.csv$/i, "");
    a.download = `${baseName}_editado.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const onClear = () => {
    setFile(null);
    setText("");
    setPreview(null);
    setErr(null);
    setSent(null);
    setIsEditing(false);
    onLoad?.([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Notificar al padre cuando cambia el preview
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    if (!preview?.rows) return;
    onLoadRef.current?.(preview.rows);
  }, [preview?.rows]);

  const handleSend = async () => {
    if (!preview) return;
    setSending(true);
    setErr(null);
    setSent(null);
    try {
      const csv = buildCsvString();
      const baseName = (file?.name || "work_orders.csv").replace(/\.csv$/i, "");
      const edited = new File([csv], `${baseName}_editado.csv`, {
        type: "text/csv;charset=utf-8",
      });
      const resp = await importOtCsv(edited);
      setSent({ ok: true, message: resp?.message ?? "Archivo enviado correctamente" });
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "No se pudo enviar el CSV";
      setErr(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">Carga masiva (CSV) — vista y edición</h3>
        <div className="text-xs text-foreground/60">
          El CSV editado se cargará en la grilla para usarlo con “Crear OT”.
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Selector de archivo */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted">
            <FiUpload className="h-4 w-4" />
            <span>Seleccionar CSV…</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {fileInfo && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/80">
              <FiFile className="h-4 w-4" />
              {fileInfo}
            </span>
          )}

          {file && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted"
              title="Quitar archivo"
            >
              <FiTrash2 className="h-4 w-4" />
              Limpiar
            </button>
          )}

          {/* Acciones de edición / descarga */}
          {preview && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(v => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted"
                title={isEditing ? "Finalizar edición" : "Editar celdas"}
              >
                {isEditing ? <FiCheckCircle className="h-4 w-4" /> : <FiEdit2 className="h-4 w-4" />}
                {isEditing ? "Finalizar edición" : "Editar"}
              </button>

              <button
                type="button"
                onClick={addRow}
                disabled={!isEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                title="Agregar fila al final"
              >
                <FiPlus className="h-4 w-4" />
                Agregar fila
              </button>

              <button
                type="button"
                onClick={onDownloadEdited}
                disabled={!preview}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                title="Descargar CSV editado"
              >
                <FiDownload className="h-4 w-4" />
                Descargar CSV
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!preview || sending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                title="Enviar CSV al backend"
              >
                <FiSend className="h-4 w-4" />
                {sending ? "Enviando…" : "Enviar CSV"}
              </button>

            </div>
          )}
        </div>

        {/* Estados de error / éxito */}
        {err && (
          <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
            <span className="inline-flex items-center gap-2">
              <FiAlertTriangle className="h-4 w-4" />
              {err}
            </span>
            <button
              onClick={() => setErr(null)}
              className="rounded-full border border-warning/30 px-3 py-1 text-xs hover:bg-warning/10"
            >
              Ocultar
            </button>
          </div>
        )}

        {sent?.ok && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-success">
            <FiCheckCircle className="h-4 w-4" />
            <span className="text-sm">{sent.message}</span>
          </div>
        )}

        {/* Preview / Editor */}
        {preview && (
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-foreground/70">
              <span>
                Vista {isEditing ? "EDITABLE" : "solo lectura"}: {preview.totalRows} filas
              </span>
              <span>Headers bloqueados • Edita solo las celdas de datos</span>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/60 text-foreground/70">
                  <tr>
                    {/* Col de acciones si está editando */}
                    <th className="px-3 py-2 w-12">{isEditing ? "" : ""}</th>
                    {preview.headers.map((h, i) => (
                      <th key={`${h}-${i}`} className="px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={1 + preview.headers.length}
                        className="px-3 py-6 text-center text-foreground/60"
                      >
                        Sin filas
                      </td>
                    </tr>
                  )}

                  {preview.rows.map((r, i) => (
                    <tr key={`r-${i}`} className="border-t border-border">
                      {/* Acciones por fila (eliminar) */}
                      <td className="px-3 py-2 align-top">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="rounded-md border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                            title="Eliminar fila"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )}
                      </td>

                      {r.map((c, j) => (
                        <td key={`c-${i}-${j}`} className="px-3 py-2">
                          {isEditing ? (
                            <input
                              value={c}
                              onChange={(e) => setCell(i, j, e.target.value)}
                              className="w-full rounded border border-border px-2 py-1 outline-none focus:ring-2 focus:ring-secondary"
                            />
                          ) : (
                            c
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===========================
   CSV Parser (maneja comillas)
   =========================== */

function parseCsv(input: string): { headers: string[]; rows: string[][] } {
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    // Si la última fila está vacía (por salto final), ignórala
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Doble comilla de escape
        if (i + 1 < text.length && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    cell += ch;
  }

  // Última celda/fila
  pushCell();
  if (row.length > 0) pushRow();

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0];
  const data = rows.slice(1);
  return { headers, rows: data };
}
