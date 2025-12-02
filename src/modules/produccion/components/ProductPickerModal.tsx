// src/modules/produccion/components/ProductPickerModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";
import { fetchAllProducts, type Product } from "../services/products.api";
import useDebouncedValue from "../hooks/useDebouncedValue";

type FilterMode = "ambos" | "sku" | "nombre";
type PickerProduct = Product & { skuL: string; nombreL: string };

export default function ProductPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialQuery = "",
  loadAllOnOpen = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prod: Product) => void;
  initialQuery?: string;
  loadAllOnOpen?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [all, setAll] = useState<PickerProduct[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<FilterMode>("ambos");
  const [active, setActive] = useState(0);

  const debounced = useDebouncedValue(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar (mock o real) al abrir
  useEffect(() => {
    if (!isOpen) return;
    setErr(null);
    setActive(0);
    setQuery(initialQuery ?? "");
    setLoading(true);
    (async () => {
      try {
        const data = loadAllOnOpen ? await fetchAllProducts() : await fetchAllProducts();
        const normalized: PickerProduct[] = (data ?? []).map((p) => ({
          ...p,
          skuL: (p.sku ?? "").toLowerCase(),
          nombreL: (p.nombre ?? "").toLowerCase(),
        }));
        setAll(normalized);
      } catch (e: unknown) {
        const msg = e instanceof Error && e.message ? e.message : "No se pudo cargar productos";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, initialQuery, loadAllOnOpen]);

  // Focus al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Filtrado en cliente
  const filtered = useMemo(() => {
    if (!debounced.trim()) return all;
    const q = debounced.trim().toLowerCase();
    return all.filter(p => {
      const bySku = p.skuL.includes(q);
      const byNom = p.nombreL.includes(q);
      if (mode === "sku") return bySku;
      if (mode === "nombre") return byNom;
      return bySku || byNom;
    });
  }, [all, debounced, mode]);

  // Teclado: ↑/↓/Enter/Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(a => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        if (filtered[active]) {
          onSelect(filtered[active]);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, filtered, active, onClose, onSelect]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-picker-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="product-picker-title" className="text-sm font-semibold text-foreground">
            Buscar producto
          </h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground/70 hover:bg-muted"
            aria-label="Cerrar"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filtrar por SKU o Nombre…"
              className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="inline-flex rounded-lg border border-border p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("ambos")}
              className={`rounded-md px-2 py-1 ${mode === "ambos" ? "bg-primary text-white" : "hover:bg-muted"}`}
            >
              Ambos
            </button>
            <button
              type="button"
              onClick={() => setMode("sku")}
              className={`rounded-md px-2 py-1 ${mode === "sku" ? "bg-primary text-white" : "hover:bg-muted"}`}
            >
              SKU
            </button>
            <button
              type="button"
              onClick={() => setMode("nombre")}
              className={`rounded-md px-2 py-1 ${mode === "nombre" ? "bg-primary text-white" : "hover:bg-muted"}`}
            >
              Nombre
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-auto p-2">
          {loading && (
            <div className="p-6 text-center text-sm text-foreground/70">Cargando productos…</div>
          )}

          {err && !loading && (
            <div className="m-3 flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
              <span className="inline-flex items-center gap-2">
                <FiAlertTriangle className="h-4 w-4" /> {err}
              </span>
              <button
                onClick={() => {
                  setErr(null);
                  setLoading(true);
                  fetchAllProducts()
                    .then((list) =>
                      setAll(
                        (list ?? []).map((p) => ({
                          ...p,
                          skuL: (p.sku ?? "").toLowerCase(),
                          nombreL: (p.nombre ?? "").toLowerCase(),
                        }))
                      )
                    )
                    .catch((e: unknown) => {
                      const msg = e instanceof Error && e.message ? e.message : "No se pudo cargar productos";
                      setErr(msg);
                    })
                    .finally(() => setLoading(false));
                }}
                className="rounded-full border border-warning/30 px-3 py-1 text-xs hover:bg-warning/10"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !err && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/60 text-foreground/70">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-foreground/60">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => (
                    <tr
                      key={`${p.sku}-${i}`}
                      onClick={() => {
                        onSelect(p);
                        onClose();
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={`cursor-pointer border-t border-border ${
                        i === active ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                      <td className="px-3 py-2">{p.nombre}</td>
                      <td className="px-3 py-2">{p.unidad ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
