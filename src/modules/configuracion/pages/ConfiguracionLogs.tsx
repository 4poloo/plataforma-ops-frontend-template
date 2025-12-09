import { useCallback, useEffect, useMemo, useState } from "react";
import LogsFiltros from "../components/logs/LogsFiltros.tsx";
import LogsTabla from "../components/logs/LogsTabla.tsx";
import LogDetalleModal from "../components/logs/LogDetalleModal.tsx";
import LogsPaginacion from "../components/logs/LogsPaginacion.tsx";
import {
  listLogs,
  type LogEntry,
  type LogSeverity,
} from "../../logs/services/logs.api.ts";

const PAGE_SIZE = 10;

type FiltersState = {
  q: string;
  severity: LogSeverity | "Todas";
  from: string;
  to: string;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  severity: "Todas",
  from: "",
  to: "",
};

export default function ConfiguracionLogs() {
  const [filters, setFilters] = useState<FiltersState>({ ...DEFAULT_FILTERS });
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const skip = (page - 1) * PAGE_SIZE;
    const severity =
      filters.severity === "Todas" ? null : (filters.severity as LogSeverity);

    try {
      const response = await listLogs({
        q: filters.q || null,
        severity,
        from: filters.from || null,
        to: filters.to || null,
        skip,
        limit: PAGE_SIZE,
      });
      setRows(response.items);
      setTotal(response.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los logs";
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.severity, filters.from, filters.to, page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const pages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const handleApplyFilters = (next: {
    q: string;
    severity: LogSeverity | "Todas";
    from?: string;
    to?: string;
  }) => {
    setFilters({
      q: next.q,
      severity: next.severity,
      from: next.from ?? "",
      to: next.to ?? "",
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6 shadow">
        <h2 className="text-lg font-bold">Configuración — Logs</h2>
        <p className="text-sm opacity-90">
          Revisa los eventos registrados en el sistema.
        </p>
      </div>

      <LogsFiltros onApply={handleApplyFilters} onClear={handleClearFilters} />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <LogsTabla rows={rows} loading={loading} onOpen={(log: LogEntry) => setDetail(log)} />

      <div className="flex justify-end">
        <LogsPaginacion page={page} pages={pages} onPageChange={setPage} />
      </div>

      <LogDetalleModal
        open={!!detail}
        log={detail ?? undefined}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
