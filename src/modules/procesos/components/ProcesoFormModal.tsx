import { useEffect, useState } from "react";
import type { Proceso } from "../types";
import { normalizeCodigo, validateProceso } from "../utils/validators";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (p: Proceso) => Promise<void>;
  initial?: Proceso | null;
  checkCodigoExists: (codigo: string) => boolean;
  readOnly?: boolean;
};

export default function ProcesoFormModal({
  open,
  onClose,
  onSave,
  initial,
  checkCodigoExists,
  readOnly = false,
}: Props) {
  const [form, setForm] = useState<Proceso>({ codigo: "", nombre: "", costo: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initial);
  const { showError } = useFlashBanner();

  // Cargar datos/limpieza
  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(initial ? { ...initial } : { codigo: "", nombre: "", costo: 0 });
    }
  }, [open, initial]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (readOnly) {
      showError("Tu rol solo permite lectura en Procesos.");
      return;
    }
    const payload: Proceso = {
      ...form,
      codigo: normalizeCodigo(form.codigo),
      costo: Math.round(Number(form.costo) * 100) / 100,
    };
    const { ok, errors } = validateProceso(payload);
    if (!ok) { setErrors(errors); return; }

    if (!isEdit && checkCodigoExists(payload.codigo)) {
      setErrors({ ...errors, codigo: "El código ya existe." }); return;
    }
    await onSave(payload);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true" role="dialog"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{isEdit ? "Editar Proceso" : "Nuevo Proceso"}</h3>
        </div>

        <div className="px-5 py-4 space-y-3">
          {readOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Formulario en modo lectura. No puedes guardar cambios.
            </div>
          )}
          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Código</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              value={form.codigo}
              onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
              disabled={isEdit || readOnly}
              placeholder="PR-001"
            />
            {errors.codigo && <span className="text-sm text-red-600">{errors.codigo}</span>}
          </label>

          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Nombre</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              value={form.nombre}
              onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
              disabled={readOnly}
              placeholder="MANO OBRA ASEO"
            />
            {errors.nombre && <span className="text-sm text-red-600">{errors.nombre}</span>}
          </label>

          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Costo (CLP)</span>
            <input
              type="number" step="0.01" min={0}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              value={form.costo}
              onChange={(e) => setForm(f => ({ ...f, costo: Number(e.target.value) }))}
              disabled={readOnly}
              placeholder="22.00"
            />
            {errors.costo && <span className="text-sm text-red-600">{errors.costo}</span>}
          </label>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-success"
            onClick={handleSubmit}
            disabled={readOnly}
          >
            {isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
