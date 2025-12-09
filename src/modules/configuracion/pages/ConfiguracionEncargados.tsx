import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEncargado,
  fetchEncargados,
  updateEncargado,
  type Encargado,
} from "../../produccion/services/encargados.api";
import EncargadosFiltros from "../components/encargados/EncargadosFiltros";
import EncargadosTabla from "../components/encargados/EncargadosTabla";
import EncargadoModal from "../components/encargados/EncargadoModal";
import EncargadosPaginacion from "../components/encargados/EncargadosPaginacion";
import { useLogAction } from "../../logs/hooks/useLogAction.ts";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type Filters = {
  q: string;
  linea: string;
};

const DEFAULT_FILTERS: Filters = { q: "", linea: "Todas" };

export default function ConfiguracionEncargados() {
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS }));
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Encargado | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const logEncargadoEvent = useLogAction({ entity: "encargado" });
  const { showError, showSuccess } = useFlashBanner();

  const loadEncargados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEncargados({ limit: 500, skip: 0 });
      setEncargados(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los encargados";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEncargados();
  }, [loadEncargados]);

  const lineOptions = useMemo(
    () => Array.from(new Set(encargados.map((e) => e.linea))).filter(Boolean),
    [encargados]
  );

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    const linea = filters.linea;
    return encargados.filter((encargado) => {
      const matchesLinea =
        linea === "Todas" || encargado.linea.toLowerCase() === linea.toLowerCase();
      if (!matchesLinea) return false;
      if (!needle) return true;
      const haystack = `${encargado.nombre} ${encargado.linea}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [encargados, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleSubmit = async (payload: { _id?: string; nombre: string; linea: string; predeterminado?: boolean }) => {
    setSaving(true);
    try {
      if (payload._id) {
        const updated = await updateEncargado(payload._id, {
          nombre: payload.nombre,
          linea: payload.linea,
          predeterminado: Boolean((payload as any).predeterminado),
        });
        void logEncargadoEvent({
          event: "update",
          payload: {
            id: updated._id,
            nombre: updated.nombre,
            linea: updated.linea,
            predeterminado: updated.predeterminado,
          },
          userAlias: updated.nombre,
        });
      } else {
        const created = await createEncargado({
          nombre: payload.nombre,
          linea: payload.linea,
          predeterminado: Boolean((payload as any).predeterminado),
        });
        void logEncargadoEvent({
          event: "create",
          payload: {
            id: created._id,
            nombre: created.nombre,
            linea: created.linea,
            predeterminado: created.predeterminado,
          },
          userAlias: created.nombre,
        });
      }
      await loadEncargados();
      setOpen(false);
      setEditRow(null);
      showSuccess("Encargado guardado correctamente.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar el encargado";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Configuración — Encargados de línea</h2>
            <p className="text-sm opacity-90">
              Administra los encargados y la línea de producción que supervisan.
            </p>
          </div>
          <button
            onClick={() => {
              setEditRow(null);
              setOpen(true);
            }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-success hover:text-white"
          >
            Nuevo encargado
          </button>
        </div>
      </div>

      <EncargadosFiltros
        lineas={lineOptions}
        onApply={(next) => setFilters({ q: next.q, linea: next.linea })}
        onClear={() => setFilters({ ...DEFAULT_FILTERS })}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <EncargadosTabla
        rows={pageRows}
        loading={loading}
        onEdit={(encargado) => {
          setEditRow(encargado);
          setOpen(true);
        }}
      />

      <div className="flex justify-end">
        <EncargadosPaginacion page={currentPage} pages={pages} onPageChange={setPage} />
      </div>

      <EncargadoModal
        open={open}
        saving={saving}
        initial={editRow ?? undefined}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            setEditRow(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
