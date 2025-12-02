// src/modules/produccion/pages/GestionProduccion.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FiRefreshCw, FiSearch, FiCheckCircle, FiSave } from "react-icons/fi";
import {
  listWorkOrders,
  type WorkOrder,
  updateWorkOrderStatus,
} from "../services/work-orders.api";
import {
  type GestionProduccionEstadoPayload,
  createGestionProduccion,
  type GestionProduccionCreatePayload,
  updateGestionProduccionStatus,
  getGestionProduccionByOt,
  type GestionProduccionRecord,
} from "../services/gestion-produccion.api";
import { useFeaturePermissions } from "../../auth/hooks/useAuth";
import { useFlashBanner } from "../../../global/components/FlashBanner";

type GestionProduccionForm = {
  numeroOt: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  linea: string;
  encargado: string;
  fecha: string;
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  cantidadHoraExtra: number;
  cantidadHoraNormal: number;
  estado: string;
};

const defaultValues: GestionProduccionForm = {
  numeroOt: "",
  sku: "",
  descripcion: "",
  cantidad: 0,
  linea: "",
  encargado: "",
  fecha: "",
  fechaInicio: "",
  fechaFin: "",
  horaEntrega: "",
  cantidadHoraExtra: 0,
  cantidadHoraNormal: 0,
  estado: "",
};

const STATUS_OPTIONS = [
  "CREADA",
  "EN PROCESO",
  "PAUSADA",
  "REPROGRAMADA",
  "CANCELADA",
  "CERRADA",
] as const;

type ManualStatus = (typeof STATUS_OPTIONS)[number];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const normalizeEstado = (value: string | null | undefined): ManualStatus | "" => {
  const normalized = (value ?? "").toString().trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "ENPROCESO" || normalized === "EN_PROCESO") return "EN PROCESO";
  if (normalized === "REPROGRAMA" || normalized === "REPROGRAMADA") return "REPROGRAMADA";
  if (STATUS_OPTIONS.includes(normalized as ManualStatus)) {
    return normalized as ManualStatus;
  }
  return "";
};

const STATUS_STYLES: Record<string, string> = {
  CREADA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "EN PROCESO": "bg-amber-100 text-amber-800 border-amber-200",
  PAUSADA: "bg-orange-100 text-orange-800 border-orange-200",
  REPROGRAMADA: "bg-violet-100 text-violet-800 border-violet-200",
  CANCELADA: "bg-red-100 text-red-800 border-red-200",
  CERRADA: "bg-red-200 text-red-900 border-red-300",
};

export default function GestionProduccion() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [gestionCache, setGestionCache] = useState<Record<number, GestionProduccionRecord>>({});
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastEditedHoras, setLastEditedHoras] = useState<"extra" | "normal" | null>(null);
  const currentSkip = useMemo(() => Math.max(0, (page - 1) * pageSize), [page, pageSize]);
  const { register, handleSubmit, reset, formState, setValue, watch } =
    useForm<GestionProduccionForm>({
      defaultValues,
    });
  const estadoActual = watch("estado");
  const cantidadPlanificada = Number(watch("cantidad") ?? 0);
  const cantidadHoraExtra = Number(watch("cantidadHoraExtra") ?? 0);
  const cantidadHoraNormal = Number(watch("cantidadHoraNormal") ?? 0);
  const extraRegister = register("cantidadHoraExtra", { valueAsNumber: true });
  const normalRegister = register("cantidadHoraNormal", { valueAsNumber: true });
  const { showError, showSuccess } = useFlashBanner();
  const extractHora = useCallback((value: string | null | undefined): string => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/(\d{2}:\d{2})(?::\d{2}(?:\.\d{3})?)?/);
    if (match) return match[1];
    if (trimmed.includes("T")) {
      const isoMatch = trimmed.match(/T(\d{2}:\d{2})/);
      if (isoMatch) return isoMatch[1];
    }
    return "";
  }, []);
  const applyOrderToForm = useCallback(
    (order: WorkOrder, gestion?: GestionProduccionRecord | null) => {
      const contenidoGestion = gestion?.contenido;
      const horaEntregaInicial =
        extractHora(contenidoGestion?.hora_entrega) ||
        extractHora(order.contenido?.hora_entrega) ||
        extractHora(order.contenido?.fecha_fin);
      const descripcion =
        contenidoGestion?.descripcion ??
        order.contenido?.descripcion ??
        "";
      const estadoInicial = normalizeEstado(
        gestion?.estado ?? order.estado
      ) || "";
      const cantidadExtra = contenidoGestion?.cantidad_hora_extra ?? 0;
      const cantidadNormal =
        contenidoGestion?.cantidad_hora_normal ??
        order.contenido?.Cantidad ??
        0;

      reset({
        numeroOt: String(order.OT ?? ""),
        sku: order.contenido?.SKU ?? "",
        descripcion,
        cantidad: order.contenido?.Cantidad ?? 0,
        linea: contenidoGestion?.linea ?? order.contenido?.linea ?? "",
        encargado: contenidoGestion?.Encargado ?? order.contenido?.Encargado ?? "",
        fecha: contenidoGestion?.fecha ?? order.contenido?.fecha ?? "",
        fechaInicio: contenidoGestion?.fecha_ini ?? order.contenido?.fecha_ini ?? "",
        fechaFin: contenidoGestion?.fecha_fin ?? order.contenido?.fecha_fin ?? "",
        horaEntrega: horaEntregaInicial,
        cantidadHoraExtra: cantidadExtra,
        cantidadHoraNormal: cantidadNormal,
        estado: estadoInicial,
      });
    },
    [extractHora, reset]
  );
  useEffect(() => {
    const plan = Math.max(Number.isFinite(cantidadPlanificada) ? cantidadPlanificada : 0, 0);
    const extra = Math.max(Number.isFinite(cantidadHoraExtra) ? cantidadHoraExtra : 0, 0);
    const normal = Math.max(Number.isFinite(cantidadHoraNormal) ? cantidadHoraNormal : 0, 0);
    const epsilon = 0.000001;

    const setIfDifferent = (name: keyof GestionProduccionForm, value: number) => {
      setValue(name, value, { shouldDirty: true, shouldTouch: true });
    };

    if (plan === 0) {
      if (extra > epsilon) setIfDifferent("cantidadHoraExtra", 0);
      if (normal > epsilon) setIfDifferent("cantidadHoraNormal", 0);
      return;
    }

    if (lastEditedHoras === "extra") {
      const safeExtra = Math.min(extra, plan);
      const computedNormal = Math.max(plan - safeExtra, 0);
      if (Math.abs(safeExtra - extra) > epsilon) setIfDifferent("cantidadHoraExtra", safeExtra);
      if (Math.abs(computedNormal - normal) > epsilon) setIfDifferent("cantidadHoraNormal", computedNormal);
    } else if (lastEditedHoras === "normal") {
      const safeNormal = Math.min(normal, plan);
      const computedExtra = Math.max(plan - safeNormal, 0);
      if (Math.abs(safeNormal - normal) > epsilon) setIfDifferent("cantidadHoraNormal", safeNormal);
      if (Math.abs(computedExtra - extra) > epsilon) setIfDifferent("cantidadHoraExtra", computedExtra);
    } else {
      const safeExtra = Math.min(extra, plan);
      const computedNormal = Math.max(plan - safeExtra, 0);
      if (Math.abs(safeExtra - extra) > epsilon) setIfDifferent("cantidadHoraExtra", safeExtra);
      if (Math.abs(computedNormal - normal) > epsilon) setIfDifferent("cantidadHoraNormal", computedNormal);
    }
  }, [
    cantidadPlanificada,
    cantidadHoraExtra,
    cantidadHoraNormal,
    lastEditedHoras,
    setValue,
  ]);

  const { edit: canEdit } = useFeaturePermissions("produccion.gestion");
  const isReadOnly = !canEdit;

  const fetchOrders = useCallback(
    async ({ skip, limit, signal }: { skip: number; limit: number; signal?: AbortSignal }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listWorkOrders({ skip, limit, signal });
        setWorkOrders(data);
        setHasMore(data.length === limit);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Error cargando órdenes de trabajo"
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchOrders({ skip: currentSkip, limit: pageSize, signal: controller.signal });
    return () => controller.abort();
  }, [fetchOrders, currentSkip, pageSize]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workOrders;
    return workOrders.filter((order) => {
      const numero = String(order.OT ?? "");
      const sku = order.contenido?.SKU?.toLowerCase() ?? "";
      const encargado = order.contenido?.Encargado?.toLowerCase() ?? "";
      const linea = order.contenido?.linea?.toLowerCase() ?? "";
      return (
        numero.includes(term) ||
        sku.includes(term) ||
        encargado.includes(term) ||
        linea.includes(term)
      );
    });
  }, [search, workOrders]);

  const onSelectOrder = useCallback(
    (order: WorkOrder) => {
      setSelected(order);
      setLastEditedHoras(null);
      const cached = gestionCache[order.OT];
      applyOrderToForm(order, cached);
      if (cached) return;
      const currentOt = order.OT;
      void getGestionProduccionByOt(currentOt)
        .then((record) => {
          if (!record) return;
          setGestionCache((prev) => ({ ...prev, [currentOt]: record }));
          setSelected((prev) => {
            if (prev?.OT === currentOt) {
              applyOrderToForm(prev, record);
            }
            return prev;
          });
        })
        .catch((err) => {
          showError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los datos de gestión de producción."
          );
        });
    },
    [applyOrderToForm, gestionCache, showError]
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!selected) {
      showError("Selecciona una OT para actualizarla.");
      return;
    }

    if (!canEdit) {
      showError("Tu rol solo permite lectura en Gestión de Producción.");
      return;
    }

    const numero = Number(values.numeroOt);
    if (!Number.isFinite(numero) || numero <= 0) {
      showError("El número de OT debe ser un valor numérico válido.");
      return;
    }

    if (!values.estado) {
      showError("Selecciona un estado para la OT antes de guardar.");
      return;
    }

    const horasExtra = Math.max(Number(values.cantidadHoraExtra ?? 0), 0);
    const horasNormal = Math.max(Number(values.cantidadHoraNormal ?? 0), 0);
    const planificada = Math.max(Number(values.cantidad ?? 0), 0);
    if (horasExtra + horasNormal - planificada > 0.000001) {
      showError("La suma de horas extra y horas normales no puede exceder la cantidad planificada.");
      return;
    }
    const horaEntrega = (values.horaEntrega ?? "").trim();
    if (!horaEntrega) {
      showError("Ingresa la hora de entrega en formato HH:MM.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(horaEntrega)) {
      showError("La hora de entrega debe tener formato HH:MM (24 horas).");
      return;
    }
    const descripcion = (values.descripcion ?? "").trim();

    try {
      const estadoPayload: GestionProduccionEstadoPayload = {
        estado: values.estado,
        fecha_ini: values.fechaInicio,
        fecha_fin: values.fechaFin,
        hora_entrega: horaEntrega || undefined,
        cantidad_hora_extra: horasExtra,
        cantidad_hora_normal: horasNormal,
        descripcion: descripcion || undefined,
      };
    let gestionUpdated = false;
    try {
      await updateGestionProduccionStatus(numero, estadoPayload);
      gestionUpdated = true;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        const createPayload: GestionProduccionCreatePayload = {
          OT: numero,
          contenido: {
            SKU: values.sku.trim(),
            Encargado: values.encargado.trim(),
            linea: values.linea.trim(),
            fecha: values.fecha,
            fecha_ini: values.fechaInicio,
            fecha_fin: values.fechaFin,
            hora_entrega: horaEntrega,
            cantidad_hora_extra: horasExtra,
            cantidad_hora_normal: horasNormal,
            descripcion: descripcion || selected?.contenido.descripcion || "",
          },
          estado: values.estado,
          merma: 0,
          cantidad_fin: 0,
        };
        await createGestionProduccion(createPayload);
        await updateGestionProduccionStatus(numero, estadoPayload);
        gestionUpdated = true;
      } else {
        throw err;
      }
    }
    await updateWorkOrderStatus(numero, values.estado);
    if (!gestionUpdated) {
      throw new Error("No se pudo actualizar el estado en gestión de producción.");
    }
    showSuccess("Gestión de Producción y estado de la OT actualizados correctamente.");
    setWorkOrders((prev) =>
      prev.map((item) =>
        item.OT === numero
          ? {
              ...item,
              estado: values.estado,
              contenido: {
                ...item.contenido,
                fecha: values.fecha,
                fecha_ini: values.fechaInicio,
                fecha_fin: values.fechaFin,
                Cantidad: Number(values.cantidad ?? item.contenido.Cantidad),
                Encargado: values.encargado,
                linea: values.linea,
                descripcion: descripcion || item.contenido.descripcion,
              },
            }
          : item
      )
    );
    setSelected({
        OT: numero,
        estado: values.estado,
        contenido: {
          ...selected.contenido,
          fecha: values.fecha,
          fecha_ini: values.fechaInicio,
          fecha_fin: values.fechaFin,
          Cantidad: Number(values.cantidad ?? selected.contenido.Cantidad),
          Encargado: values.encargado,
          linea: values.linea,
          descripcion: descripcion || selected.contenido.descripcion,
        },
      });
      setValue("estado", values.estado);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar la OT seleccionada."
      );
    }
  });

  const isDisabled = isReadOnly || !selected;
  const canUpdateFields = !isDisabled;

  return (
    <div className="space-y-6 px-4 pb-10 pt-4">
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase text-secondary">
          Gestión de Producción
        </p>
        <h1 className="text-2xl font-bold text-primary">
          Buscar y actualizar OTs existentes
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecciona una orden de trabajo para revisar su información y enviar
          los nuevos datos al módulo de gestión.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <section className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número OT, SKU, línea o encargado..."
                className="w-full rounded-lg border border-border bg-muted/30 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Mostrar
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-muted/20 px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                OTs
              </span>
              <button
                type="button"
                onClick={() => void fetchOrders({ skip: currentSkip, limit: pageSize })}
                className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">OT</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Cantidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Línea</th>
                  <th className="px-4 py-2 text-left">Encargado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      {loading
                        ? "Cargando órdenes..."
                        : "No existen OTs para mostrar."}
                    </td>
                  </tr>
                )}
                {filtered.map((order) => {
                  const isActive = order.OT === selected?.OT;
                  const estado = normalizeEstado(order.estado) || "";
                  const estadoClasses =
                    STATUS_STYLES[estado] ??
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <tr
                      key={order.OT}
                      className={`cursor-pointer border-b border-border/60 transition hover:bg-muted/40 ${
                        isActive ? "bg-primary/5" : ""
                      }`}
                      onClick={() => onSelectOrder(order)}
                    >
                      <td className="px-4 py-3 font-semibold text-primary">
                        {order.OT}
                      </td>
                      <td className="px-4 py-3">{order.contenido.SKU}</td>
                      <td className="px-4 py-3">{order.contenido.Cantidad}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoClasses}`}
                        >
                          {estado || "Sin Estado"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.contenido.linea || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {order.contenido.Encargado || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <div className="font-medium">
              Página {page}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-border px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 1 || loading}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-border px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasMore || loading}
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-secondary">
                  Detalle de la OT seleccionada
                </p>
                <h2 className="text-lg font-bold text-primary">
                  {selected ? `OT ${selected.OT}` : "Sin selección"}
                </h2>
                {selected && estadoActual && (
                  <p className="text-xs font-medium text-primary">
                    Estado actual: {estadoActual}
                  </p>
                )}
              </div>
              {selected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <FiCheckCircle />
                  Seleccionada
                </span>
              )}
            </div>

            {!selected && (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Busca una orden en la tabla de la izquierda y selecciónala para
                editarla.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Número OT
                </span>
                <input
                  type="text"
                  {...register("numeroOt")}
                  readOnly
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">SKU</span>
                <input
                  type="text"
                  {...register("sku")}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Descripción</span>
              <input
                type="text"
                {...register("descripcion")}
                readOnly
                aria-readonly="true"
                className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Estado de la OT</span>
              <select
                {...register("estado")}
                disabled={!canUpdateFields}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
              >
                <option value="">Selecciona estado</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Cantidad planificada
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...register("cantidad", { valueAsNumber: true })}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Línea de producción
                </span>
                <input
                  type="text"
                  {...register("linea")}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Encargado
                </span>
                <input
                  type="text"
                  {...register("encargado")}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Fecha</span>
                <input
                  type="date"
                  {...register("fecha")}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Inicio comprometido
                </span>
                <input
                  type="date"
                  {...register("fechaInicio")}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Término comprometido
                </span>
                <input
                  type="date"
                  {...register("fechaFin")}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Hora de entrega
                </span>
                <input
                  type="time"
                  {...register("horaEntrega")}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Cantidad Hora Extra
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...extraRegister}
                  onChange={(event) => {
                    setLastEditedHoras("extra");
                    extraRegister.onChange(event);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">
                  Cantidad Hora Normal
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...normalRegister}
                  onChange={(event) => {
                    setLastEditedHoras("normal");
                    normalRegister.onChange(event);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-muted/30"
                  disabled={!canUpdateFields}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isDisabled || formState.isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSave />
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
