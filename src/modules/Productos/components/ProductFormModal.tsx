import { useMemo, useState } from "react";
import type { Producto } from "../types/producto";
import { calcIVA19 } from "../utils/iva";
import { UOMS } from "../constants/uoms";
import {
  getFamilyNames,
  getSubfamilyNames,
  getFamilyCode,
  getSubfamilyCode,
  resolveCodes,
} from "../constants/familias";


// acepta string | number | null | undefined y siempre devuelve string
const safeTrim = (s: unknown) =>
  (s === null || s === undefined ? "" : String(s)).trim();
// NUEVO: conversión segura a número, evitando NaN
const toNumber = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function ProductFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Producto | null;
  onClose: () => void;
  // NUEVO: permitimos promesa para poder esperar el guardado real
  onSubmit: (p: Producto) => Promise<void> | void;
}) {
  const isEdit = !!initial;

  const initialWithCodes = initial
  ? (() => {
      const { groupCode, subgroupCode } = resolveCodes({
        groupName: initial.groupName,
        subgroupName: initial.subgroupName,
        groupCode: initial.groupCode as any,
        subgroupCode: initial.subgroupCode as any,
      });
      return {
        ...initial,
        groupCode,
        subgroupCode,
        // normaliza campos de texto a string
        sku: String(initial.sku ?? ""),
        name: String(initial.name ?? ""),
        uom: String(initial.uom ?? ""),
        barcode: initial.barcode == null ? "" : String(initial.barcode),
      };
    })()
  : undefined;

const [form, setForm] = useState<Producto>(
  initialWithCodes ?? {
    sku: "",
    barcode: "",
    name: "",
    uom: "",
    groupCode: undefined,
    groupName: "",
    subgroupCode: undefined,
    subgroupName: "",
    priceNet: 0,
    priceVat: 0,
    replacementCost: 0,
    classification: "PT",
    activo: true,
  }
);

  // Opciones derivadas del mapa
  const familyOptions = getFamilyNames();                         // ⬅️ nombres de familia
  const subfamilyOptions = getSubfamilyNames(form.groupName);     // ⬅️ nombres dependientes


  const [errors, setErrors] = useState<Partial<Record<keyof Producto | "global", string>>>({});
  const [isSaving, setIsSaving] = useState(false); // NUEVO: estado de carga/submit

  const priceVat = useMemo(() => calcIVA19(Number(form.priceNet || 0)), [form.priceNet]);

  const validate = (p: Producto) => {
    const e: Partial<Record<keyof Producto | "global", string>> = {};
    if (!safeTrim(p.sku)) e.sku = "SKU es requerido.";
    if (!safeTrim(p.name)) e.name = "Nombre/Descripción es requerido.";
    if (!safeTrim(p.uom)) e.uom = "Unidad de medida es requerida.";
    if (!p.classification) e.classification = "Clasificación es requerida.";
    if (p.priceNet == null || isNaN(Number(p.priceNet)) || Number(p.priceNet) < 0) e.priceNet = "Precio Neto inválido.";
    return e;
  };

  // NUEVO: submit async, espera el hook y cierra solo si no falla
  const submit = async () => {
    if (isSaving) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Normalizamos payload antes de enviar
    const payload: Producto = {
      ...form,
      // preservamos id si viene (clave para PUT)
      id: form.id ?? initial?.id ?? undefined,
      priceNet: toNumber(form.priceNet, 0),
      priceVat: priceVat, // UI; backend recalcula si quiere
      replacementCost: form.replacementCost != null ? toNumber(form.replacementCost, 0) : 0,
      sku: safeTrim(form.sku).toUpperCase(),
      name: safeTrim(form.name),
      // barcode a string en estado, pero el service lo convierte a número si es necesario
      barcode: (safeTrim(form.barcode ?? "") || null),
      // códigos pueden venir como string -> convertimos a number en el service,
      // pero si quieres, puedes forzar número acá también:
      groupCode: (form.groupCode as any),
      subgroupCode: (form.subgroupCode as any),
      uom: safeTrim(form.uom),
      groupName: form.groupName ?? "",
      subgroupName: form.subgroupName ?? "",
      classification: form.classification,
      activo: form.activo ?? true,
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);     // espera: si falla, cae al catch
      onClose();                   // cierra solo si se guardó bien
    } catch (e: any) {
      // El hook ya muestra toast; aquí solo mantenemos el modal
      setErrors((prev) => ({ ...prev, global: e?.message ?? "No se pudo guardar" }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id="dialog-title" className="text-xl font-semibold">
            {isEdit ? "Editar producto" : "Crear producto"}
          </h2>
        </header>

        {errors.global && (
          <div className="mb-3 rounded-xl border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {errors.global}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2 ${errors.sku ? "border-red-500" : ""}`}
              placeholder="PT-0001"
              disabled={isSaving}
            />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Código de barras</label>
            <input
              value={form.barcode ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="7801234567890"
              disabled={isSaving}
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nombre / Descripción *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2 ${errors.name ? "border-red-500" : ""}`}
              placeholder="Detergente concentrado 5L"
              disabled={isSaving}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Clasificación *</label>
            <select
              value={form.classification}
              onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value as any }))}
              className={`w-full rounded-xl border px-3 py-2 ${errors.classification ? "border-red-500" : ""}`}
              disabled={isSaving}
            >
              <option value="PT">PT</option>
              <option value="MP">MP</option>
            </select>
            {errors.classification && <p className="mt-1 text-xs text-red-600">{errors.classification}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Unidad de medida *</label>
            <select
              value={form.uom}
              onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2 ${errors.uom ? "border-red-500" : ""}`}
              disabled={isSaving}
            >
              <option value="">Seleccionar…</option>
              {UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {errors.uom && <p className="mt-1 text-xs text-red-600">{errors.uom}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nombre de Grupo (Familia)</label>
            <select
              value={form.groupName ?? ""}
              onChange={(e) =>{
                const famName = e.target.value;
                setForm((f) => ({ ...f, 
                  groupName: famName,
                  groupCode: getFamilyCode(famName),  // ⬅️ código desde el mapa
                  subgroupName: "",                   // ⬅️ reset
                  subgroupCode: undefined,            // ⬅️ reset 
                  }))}}
              className="w-full rounded-xl border px-3 py-2"
              disabled={isSaving}
            >
              <option value="">Sin familia</option>
              {familyOptions.map((fam) => (
              <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nombre de SubGrupo (Subfamilia)</label>
            <select
              value={form.subgroupName ?? ""}
              onChange={(e) => {
                const subName = e.target.value;
                setForm((f) => ({
                  ...f,
                  subgroupName: subName,
                  subgroupCode: getSubfamilyCode(f.groupName, subName), // ⬅️ código desde el mapa
                }));
              }}
              className="w-full rounded-xl border px-3 py-2"
              disabled={!form.groupName}
            >
              <option value="">Sin subfamilia</option>
              {subfamilyOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* NUEVO: códigos como números (mejora DX y evita strings raros) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Código Grupo</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.groupCode as any ?? ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                groupCode: Number.isNaN(e.currentTarget.valueAsNumber)
                  ? undefined                                  // o null, según tu modelo
                  : e.currentTarget.valueAsNumber,
              }))}
              className="w-full rounded-xl border px-3 py-2"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Código SubGrupo</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.subgroupCode as any ?? ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                subgroupCode: Number.isNaN(e.currentTarget.valueAsNumber)
                  ? null                                  // o null, según tu modelo
                  : e.currentTarget.valueAsNumber,
              }))}
              className="w-full rounded-xl border px-3 py-2"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Precio Neto (CLP) *</label>
            <input
              type="number"
              min={0}
              value={form.priceNet}
              onChange={(e) => setForm((f) => ({ ...f, priceNet: Number(e.target.value) }))}
              className={`w-full rounded-xl border px-3 py-2 ${errors.priceNet ? "border-red-500" : ""}`}
              disabled={isSaving}
            />
            {errors.priceNet && <p className="mt-1 text-xs text-red-600">{errors.priceNet}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Precio con impuestos (19%)</label>
            <input
              value={priceVat.toLocaleString("es-CL")}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border bg-gray-50 px-3 py-2 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">Se calcula automáticamente desde Precio Neto (visual).</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Valor de reposición (CLP)</label>
            <input
              type="number"
              min={0}
              value={form.replacementCost ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, replacementCost: Number(e.target.value) }))}
              className="w-full rounded-xl border px-3 py-2"
              disabled={isSaving}
            />
          </div>

          {/* NUEVO: toggle Activo (si lo manejas en UI) */}
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.activo}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                disabled={isSaving}
              />
              <span>Activo</span>
            </label>
          </div>
        </div>

        <footer className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 border-red-500 text-red-500 hover:bg-secondary hover:text-white disabled:opacity-60"
            disabled={isSaving} // NUEVO: evita cerrar mientras guarda
          >
            Cancelar
          </button>

          <button
            onClick={submit}
            className="rounded-xl bg-primary px-4 py-2 text-white hover:bg-success disabled:opacity-60"
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? "Guardando…" : (isEdit ? "Guardar cambios" : "Crear producto")}
          </button>
        </footer>
      </div>
    </div>
  );
}
