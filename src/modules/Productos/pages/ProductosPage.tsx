// pages/ProductosPage.tsx
import { useEffect } from "react";
import RightActions from "../components/RightActions";
import ProductosSearchBar from "../components/ProductosSearchBar";
import ProductsTable from "../components/ProductsTable";
import ProductFormModal from "../components/ProductFormModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import ImportProductsDialog from "../components/ImportProductsDialog";
import { useProductos } from "../hooks/useProductos";
import { getFamilyNames } from "../constants/familias";
import { useFeaturePermissions } from "../../auth/hooks/useAuth";

export default function ProductosPage() {
  const {
    // filtros
    filters, setFilters, subfamiliasDisponibles,
    // datos
    items, loading, error,
    // paginación/orden
    page, setPage, limit, setLimit, total, hasMore, sortField, sortDir, toggleSort,
    // modales
    isCreateOpen, setCreateOpen, editing, setEditing, deleting, setDeleting,
    isImportOpen, setImportOpen,
    // notificaciones
    toast, setToast,
    // acciones
    // ⬇️ CAMBIO: usamos toggleProductoActivo en vez de removeProducto
    upsertProducto, toggleProductoActivo,
  } = useProductos();

  const { edit: canEditProductos } = useFeaturePermissions("produccion.productos");
  const readOnly = !canEditProductos;
  const warnReadOnly = () =>
    setToast({ type: "error", msg: "Tu rol solo permite lectura en Productos." });

  const familias = getFamilyNames();

  useEffect(() => {
    if (!toast) return;
    const root = document.getElementById("root");
    root?.setAttribute("aria-live", "polite");
  }, [toast]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-gray-500">Buscar, crear, importar y administrar tu catálogo.</p>
        </div>
        <RightActions
          onBuscar={() => setToast({ type: "success", msg: "Búsqueda aplicada." })}
          onCrear={() => {
            if (readOnly) {
              warnReadOnly();
              return;
            }
            setCreateOpen(true);
          }}
          onCarga={() => {
            if (readOnly) {
              warnReadOnly();
              return;
            }
            setImportOpen(true);
          }}
          canCreate={canEditProductos}
          canCarga={canEditProductos}
        />
      </div>

      {readOnly && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este módulo está en modo de solo lectura para tu rol. No podrás crear ni modificar productos.
        </div>
      )}

      <ProductosSearchBar
        filters={filters}
        setFilters={(u) => setFilters(u)}
        familias={familias}
        subfamilias={subfamiliasDisponibles}
        onClear={() => {
          setFilters(() => ({
            q: "",
            sku: "",
            familia: "",
            subfamilia: "",
            clasificacion: "",
            activo: "",
          }));
          setPage(1);
        }}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-8 text-center text-gray-500">Cargando…</div>
      ) : (
        <>
          <ProductsTable
            items={items}
            onEdit={(row) => {
              if (readOnly) {
                warnReadOnly();
                return;
              }
              setEditing(row);
            }}
            onDes={(row) => {
              if (readOnly) {
                warnReadOnly();
                return;
              }
              setDeleting(row);
            }}
            onSort={(campo) => toggleSort(campo)}
            sortField={sortField}
            sortDir={sortDir}
            canEdit={canEditProductos}
          />

          {/* Paginación simple */}
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="text-sm text-gray-600">
              {typeof total === "number"
                ? <>Página <span className="font-medium">{page}</span> — Límite {limit} — Total <span className="font-medium">{total}</span></>
                : <>Página <span className="font-medium">{page}</span> — Límite {limit} — {items.length < limit ? "Fin de resultados" : "Cargar más…"}</>}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <button
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => p + 1)}
                disabled={typeof total === "number"
                  ? page * limit >= total
                  : hasMore === false || items.length < limit}
              >
                Siguiente
              </button>

              <select
                value={limit}
                onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
                className="ml-2 rounded-lg border px-2 py-1 text-sm"
                title="Resultados por página"
              >
                {[20, 50, 100].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Modales */}
      {/* CREAR */}
      {isCreateOpen && canEditProductos && (
        <ProductFormModal
          onClose={() => setCreateOpen(false)}
          onSubmit={async (p) => {
            await upsertProducto(p);
          }}
        />
      )}

      {/* EDITAR */}
      {editing && canEditProductos && (
        <ProductFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (p) => {
            await upsertProducto(p);
          }}
        />
      )}

      {deleting && canEditProductos && (
        <DeleteConfirmModal
          producto={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            // ⬇️ CAMBIO: des/habilitar en vez de eliminar
            if (!deleting?.id) {
              setToast({ type: "error", msg: "Producto sin ID; no se pudo cambiar estado." });
              setDeleting(null);
              return;
            }
            await toggleProductoActivo(deleting.id, !Boolean(deleting.activo));
            setDeleting(null);
          }}
        />
      )}

      {isImportOpen && canEditProductos && (
        <ImportProductsDialog
          open={isImportOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => {
          // tras confirmar, refresca la grilla (puedes reusar tu lógica de refetch)
           setToast({ type: "success", msg: "Importación finalizada. Refrescando…" });
          // ejemplo simple: forzar recarga usando setPage(1) o re-disparar el efecto
          window.location.reload();
          }}
          notify={(type, msg) => setToast({ type, msg })}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
