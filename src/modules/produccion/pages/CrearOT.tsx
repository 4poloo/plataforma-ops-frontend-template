// src/modules/produccion/pages/CrearOT.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FiSave,
  FiXCircle,
  FiRefreshCw,
  FiCalendar,
  FiPrinter,
  FiFlag,
  FiActivity,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSend,
} from "react-icons/fi";

import ProductosAFabricarGrid from "../components/ProductosAFabricarGrid";
import ProductosAFabricarBulkUpload from "../components/ProductosAFabricarBulkUpload";
import {
  createWorkOrder,
  downloadWorkOrdersTemplate,
  fetchWorkOrderStatus,
  sendWorkOrdersIntegration,
  printWorkOrder,
  printWorkOrderRecipe,
  getWorkOrderByNumber,
  type WorkOrderIntegrationEntry,
  type WorkOrderCreateInput,
  type WorkOrderStatusCode,
  fetchLastWorkOrderNumber,
} from "../services/work-orders.api";
import { type RecetaMaterialOT } from "../services/recetas-ot.api";
import { fetchEncargados, type Encargado } from "../services/encargados.api";
import { useLogAction } from "../../logs/hooks/useLogAction";
import { useFeaturePermissions } from "../../auth/hooks/useAuth";
import { useFlashBanner } from "../../../global/components/FlashBanner";

/* ===========================
   Tipos del formulario (OT)
   =========================== */

type ProductoAFabricar = {
  numeroOrden: string;   // número de OT para este ítem
  sku: string;           // código del producto
  producto: string;      // descripción
  receta: string;        // código de receta (se usa en modo Form)
  recetaDesc?: string;   // descripción receta (opcional)
  cantidadBase: number;  // base de receta (modo Form)
  cantidad: number;      // cantidad a fabricar
  veces: number;         // veces de la base (modo Form)
  linea?: string;        // NUEVO: línea por ítem (modo Grilla)
  responsable?: string;  // Responsable por ítem (modo Grilla)
  componentes?: RecetaMaterialOT[]; // Materiales requeridos (modo Form/Grid)
};

type EstadoWMS = "SIN_INFO" | "CREADA" | "EN_PROCESO" | "FINALIZADA" | "CANCELADA";

type EstadoWmsDetalle = {
  numero: number;
  sku: string;
  estado: EstadoWMS;
  estadoRaw: string;
  estadoLabel: string;
};

type CrearOtForm = {
  fecha: string;                 // hoy
  fechaInicio: string;
  fechaTerminoComprometida: string;

  responsable: string;
  glosa: string;                 // usamos este campo como "Línea de producción" de la OT (valor único)

  productos: ProductoAFabricar[];
};

/* ===========================
   Utilidades locales
   =========================== */

const tomorrowISO = () => {
  const nowInChile = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Santiago" })
  );
  nowInChile.setDate(nowInChile.getDate() + 1);
  const y = nowInChile.getFullYear();
  const m = `${nowInChile.getMonth() + 1}`.padStart(2, "0");
  const d = `${nowInChile.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const LINE_OPTIONS = ["AGUA", "ROTATIVA", "PERIFERICOS", "ASEO HOGAR"] as const;

const formatDateToDDMMYYYY = (value: string): string => {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (y && m && d) return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  return value;
};

const roundTo = (value: number, decimals = 6): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

type BuiltWorkOrderPayload = {
  integrationEntries: WorkOrderIntegrationEntry[];
  workOrdersPayload: WorkOrderCreateInput[];
};

function buildWorkOrderPayload(values: CrearOtForm): BuiltWorkOrderPayload {
  const fecha = values.fecha?.trim() || tomorrowISO();
  const fechaInicio = values.fechaInicio?.trim() || fecha;
  const fechaFin = values.fechaTerminoComprometida?.trim() || fecha;
  const fechaIntegracion = formatDateToDDMMYYYY(fechaInicio);
  const glosaGlobal = (values.glosa ?? "").trim();
  const responsableGlobal = (values.responsable ?? "").trim();

  const integrationEntries: WorkOrderIntegrationEntry[] = [];
  const workOrdersPayload: WorkOrderCreateInput[] = [];

  for (const item of values.productos ?? []) {
    if (!item?.sku || Number(item?.cantidad ?? 0) <= 0) continue;

    const numeroRaw = (item.numeroOrden ?? "").toString().trim();
    const numeroOt = Number(numeroRaw);
    if (!numeroRaw || !Number.isFinite(numeroOt) || numeroOt <= 0) continue;

    const cantidad = Number(item.cantidad ?? 0);
    const base = Number(item.cantidadBase ?? 0);
    const glosaOrden = (item.linea ?? glosaGlobal).trim();
    const encargado = (item.responsable ?? responsableGlobal).trim();
    const descripcionProducto =
      item.producto?.trim() || item.recetaDesc?.trim() || item.sku;

    const payload: WorkOrderCreateInput = {
      OT: numeroOt,
      contenido: {
        SKU: item.sku.trim(),
        Cantidad: cantidad,
        Encargado: encargado,
        linea: glosaOrden,
        fecha,
        fecha_ini: fechaInicio,
        fecha_fin: fechaFin,
        descripcion: descripcionProducto,
      },
    };
    workOrdersPayload.push(payload);

    const factor = base > 0 ? cantidad / base : 0;

    item.componentes?.forEach((comp) => {
      if (!comp?.sku) return;
      const cantidadMaterial =
        factor > 0 ? roundTo(Number(comp.cantidad ?? 0) * factor) : 0;
      if (cantidadMaterial <= 0) return; // el backend no acepta materiales en 0
      integrationEntries.push({
        FecIniOrden: fechaIntegracion,
        GlosaOrden: glosaOrden || glosaGlobal,
        Orden: numeroOt,
        CodigoProducto: item.sku,
        DescripcionProducto: descripcionProducto,
        CantidadAFabricar: cantidad,
        CodigoMaterial: comp.sku,
        DescripcionMaterial: comp.descripcion || comp.sku,
        CantidadMaterial: cantidadMaterial,
      });
    });
  }

  return { integrationEntries, workOrdersPayload };
}

/* ===========================
   Página Crear OT
   =========================== */

export default function CrearOT() {
  // Formulario PRINCIPAL
  const methods = useForm<CrearOtForm>({
    defaultValues: {
      fecha: tomorrowISO(),
      fechaInicio: tomorrowISO(),
      fechaTerminoComprometida: tomorrowISO(),
      responsable: "",
      glosa: "",               // Línea de producción (valor único para la OT)
      productos: [],           // Se rellena desde los dos modos
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { isSubmitting },
    control,
  } = methods;

  // Modo de captura para Productos a Fabricar
  const [mode, setMode] = useState<"grid" | "excel">("grid");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [estadoWmsDetalle, setEstadoWmsDetalle] = useState<EstadoWmsDetalle[]>([]);
  const [refreshingWms, setRefreshingWms] = useState(false);
  const [ultimoNumeroOt, setUltimoNumeroOt] = useState<number | null>(null);
  const [initialNextOt, setInitialNextOt] = useState<number | null>(null);
  const [initialNextLoading, setInitialNextLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [resendingIntegration, setResendingIntegration] = useState(false);
  const nextAutoNumeroRef = useRef<number>(1);

  const logOtEvent = useLogAction({ entity: "work_order" });
  const { edit: canEditOt } = useFeaturePermissions("produccion.crearOt");
  const isReadOnly = !canEditOt;
  const { showError, showSuccess } = useFlashBanner();

  const takeNextAutoNumero = useCallback((): number => {
    const productos = (getValues("productos") ?? []) as ProductoAFabricar[];
    const maxInForm = productos.reduce((max, item) => {
      const num = Number((item?.numeroOrden ?? "").toString().trim());
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    const base = Number.isFinite(nextAutoNumeroRef.current) && nextAutoNumeroRef.current > 0
      ? Number(nextAutoNumeroRef.current)
      : 1;
    const candidate = maxInForm > 0 ? maxInForm + 1 : base;
    const next = candidate + 1;
    nextAutoNumeroRef.current = next;
    setInitialNextOt(next);
    return candidate;
  }, [getValues]);

  const reserveNextNumeroOt = useCallback(async (): Promise<number | null> => {
    return takeNextAutoNumero();
  }, [takeNextAutoNumero]);

  const releaseNumeroOt = useCallback(async () => {
    // Con el correlativo local no se requiere rollback explícito.
  }, []);

  useEffect(() => {
    const pendingReload = sessionStorage.getItem("forceReloadCrearOt");
    if (pendingReload) {
      sessionStorage.removeItem("forceReloadCrearOt");
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    void fetchEncargados({ limit: 500, skip: 0 })
      .then(setEncargados)
      .catch(() => setEncargados([]));
  }, []);

  const loadProductosDesdeCsv = useCallback(
    async (rows: string[][]) => {
      setCsvLoading(true);
      const productos: ProductoAFabricar[] = [];
      for (const r of rows || []) {
        const [numeroOrden = "", sku = "", producto = "", cantidad = "", linea = "", responsable = ""] = r;
        const numeroOrdenStr = numeroOrden?.toString().trim();
        const skuStr = sku?.toString().trim().toUpperCase();
        const productoStr = producto?.toString().trim();
        const cantidadNum = Number(String(cantidad).replace(",", ".")) || 0;
        productos.push({
          numeroOrden: numeroOrdenStr,
          sku: skuStr,
          producto: productoStr,
          receta: "",
          cantidadBase: 0,
          cantidad: cantidadNum,
          veces: 0,
          linea: linea?.toString().trim(),
          responsable: responsable?.toString().trim(),
        });
      }
      setValue("productos", productos as ProductoAFabricar[]);
      setCsvLoading(false);
    },
    [setValue]
  );

  useEffect(() => {
    let active = true;
    setInitialNextLoading(true);
    fetchLastWorkOrderNumber()
      .then((last) => {
        if (!active) return;
        const safeLast = Number.isFinite(last) && last > 0 ? last : 0;
        const next = safeLast + 1 || 1;
        nextAutoNumeroRef.current = next;
        setUltimoNumeroOt(safeLast || null);
        setInitialNextOt(next);
      })
      .catch((err) => {
        if (!active) return;
        nextAutoNumeroRef.current = 1;
        setInitialNextOt(1);
        setUltimoNumeroOt(null);
        const message =
          err instanceof Error && err.message
            ? err.message
            : "No se pudo obtener la última OT en BD.";
        showError(`${message} Se sugerirá partir desde 1.`);
      })
      .finally(() => {
        if (!active) return;
        setInitialNextLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const lineOptions = useMemo(() => {
    const set = new Set<string>(LINE_OPTIONS);
    encargados.forEach((enc) => {
      const linea = enc?.linea?.trim();
      if (linea) set.add(linea);
    });
    return Array.from(set);
  }, [encargados]);


  const mapStatusFromBackend = useCallback(
    (status: WorkOrderStatusCode | string | null | undefined): EstadoWMS => {
      const normalized = (status ?? "").toString().trim().toUpperCase();
      if (normalized === "DESPACHADO" || normalized === "CERRADA" || normalized === "FINALIZADA") {
        return "FINALIZADA";
      }
      if (
        normalized === "ASIGNADA" ||
        normalized === "ASIGNADAPARCIAL" ||
        normalized === "PICKEADA" ||
        normalized === "ENPICKING" ||
        normalized === "ENPRODUCCION" ||
        normalized === "DESPACHADOPARCIAL"
      ) {
        return "EN_PROCESO";
      }
      if (normalized === "CREADA") return "CREADA";
      if (normalized === "CANCELADA" || normalized === "RECHAZADA" || normalized === "ERROR") return "CANCELADA";
      return "EN_PROCESO";
    },
    []
  );

  const formatEstadoWms = useCallback((value: string | null | undefined) => {
    if (!value) return "";
    const normalized = value.toString().trim().toUpperCase();
    if (!normalized) return "";

    const map: Record<string, string> = {
      CREADA: "CREADA",
      ENPROCESO: "EN PROCESO",
      "EN PROCESO": "EN PROCESO",
      ENPICKING: "EN PICKING",
      ENPRODUCCION: "EN PRODUCCION",
      ENPRODUCCIÓN: "EN PRODUCCIÓN",
      PICKEADA: "PICKEADA",
      ASIGNADA: "ASIGNADA",
      ASIGNADAPARCIAL: "ASIGNADA PARCIAL",
      "ASIGNADA PARCIAL": "ASIGNADA PARCIAL",
      DESPACHADO: "DESPACHADO",
      DESPACHADOPARCIAL: "DESPACHADO PARCIAL",
      DESPACHOPARCIAL: "DESPACHO PARCIAL",
      CANCELADA: "CANCELADA",
      ERROR: "ERROR",
      RECHAZADO: "RECHAZADO",
      RECHAZADA: "RECHAZADA",
      FINALIZADA: "FINALIZADA",
      CERRADA: "CERRADA",
    };

    if (map[normalized]) return map[normalized];

    return normalized
      .replace(/_/g, " ")
      .replace(/([A-Z])(?=[A-Z][^A-Z])/g, "$1 ")
      .replace(/([A-Z])(?=[A-Z])/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const resolveEstadoDetalle = useCallback(
    async ({ numero, sku }: { numero: number; sku: string }) => {
      const normalizedSku = sku?.trim() || "";
      try {
        const statusCode = await fetchWorkOrderStatus(numero);
        const estadoRaw = statusCode?.toString() ?? "";
        const estado = mapStatusFromBackend(statusCode);
        const estadoLabel =
          estado === "SIN_INFO"
            ? "Sin información"
            : formatEstadoWms(estadoRaw || estado) || "Sin información";
        setEstadoWmsDetalle((prev) => {
          const previous = prev.find((item) => item.numero === numero);
          const filtered = prev.filter((item) => item.numero !== numero);
          const next = [
            ...filtered,
            {
              numero,
              sku: normalizedSku || previous?.sku || "",
              estado,
              estadoRaw,
              estadoLabel,
            },
          ];
          return next.sort((a, b) => a.numero - b.numero);
        });
      } catch {
        setEstadoWmsDetalle((prev) => {
          const previous = prev.find((item) => item.numero === numero);
          const filtered = prev.filter((item) => item.numero !== numero);
          const next = [
            ...filtered,
            {
              numero,
              sku: normalizedSku || previous?.sku || "",
              estado: "SIN_INFO" as EstadoWMS,
              estadoRaw: "",
              estadoLabel: "Sin información",
            },
          ];
          return next.sort((a, b) => a.numero - b.numero);
        });
      }
    },
    [formatEstadoWms, mapStatusFromBackend]
  );

  const clearEstadoDetalle = useCallback((numero: number) => {
    setEstadoWmsDetalle((prev) => prev.filter((item) => item.numero !== numero));
  }, []);

  const productosWatch = watch("productos");

  useEffect(() => {
    const activos = new Set<number>();
    if (Array.isArray(productosWatch)) {
      productosWatch.forEach((item) => {
        const numero = Number((item?.numeroOrden ?? "").toString().trim());
        if (Number.isFinite(numero) && numero > 0) {
          activos.add(numero);
        }
      });
    }
    if (activos.size === 0) {
      setEstadoWmsDetalle([]);
      return;
    }
    setEstadoWmsDetalle((prev) => prev.filter((item) => activos.has(item.numero)));
  }, [productosWatch]);

  const refreshEstadoWms = useCallback(async () => {
    const productos = (getValues("productos") ?? []) as ProductoAFabricar[];
    const entries = productos.reduce<Array<{ numero: number; sku: string }>>((acc, item) => {
      if (!item) return acc;
      const numero = Number((item.numeroOrden ?? "").toString().trim());
      const sku = (item.sku ?? "").trim();
      if (!Number.isFinite(numero) || numero <= 0) return acc;
      if (!sku) return acc;
      acc.push({ numero, sku });
      return acc;
    }, []);

    if (entries.length === 0) {
      setEstadoWmsDetalle([]);
      showError("Agrega OTs con número para consultar su estado en WMS.");
      return;
    }

    setRefreshingWms(true);
    try {
      await Promise.all(entries.map(({ numero, sku }) => resolveEstadoDetalle({ numero, sku })));
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo refrescar el estado desde WMS.";
      showError(message);
    } finally {
      setRefreshingWms(false);
    }
  }, [getValues, resolveEstadoDetalle, showError]);

  /* ===== Handlers ===== */

  const validateProductos = useCallback(
    (values: CrearOtForm): ProductoAFabricar[] | null => {
      const productosValidos = (values.productos ?? []).filter((item) => {
        if (!item) return false;
        const sku = item.sku?.trim();
        const cantidad = Number(item.cantidad ?? 0);
        return Boolean(sku) && cantidad > 0;
      });

      if (productosValidos.length === 0) {
        showError("Agrega al menos un producto con SKU y cantidad mayor a cero.");
        return null;
      }

      const sinComponentes = productosValidos
        .filter((item) => !item.componentes || item.componentes.length === 0)
        .map((item) => item.sku);
      if (sinComponentes.length > 0) {
        showError(
          `Falta cargar la receta para los siguientes SKU: ${sinComponentes.join(
            ", "
          )}. Verifica el SKU para que se autocompleten los datos.`
        );
        return null;
      }

      const basesInvalidas = productosValidos
        .filter((item) => !(Number(item.cantidadBase ?? 0) > 0))
        .map((item) => item.sku);
      if (basesInvalidas.length > 0) {
        showError(
          `Las recetas con base 0 no permiten calcular materiales. Revisa los SKU: ${basesInvalidas.join(
            ", "
          )}.`
        );
        return null;
      }

      const numerosInvalidos = productosValidos
        .filter((item) => {
          const raw = item.numeroOrden?.toString().trim() ?? "";
          const num = Number(raw);
          return !raw || !Number.isFinite(num) || num <= 0;
        })
        .map((item) => item.sku || "(sin SKU)");
      if (numerosInvalidos.length > 0) {
        showError(
          `Revisa el N° de Orden para los siguientes SKU: ${numerosInvalidos.join(
            ", "
          )}. Debe ser numérico y mayor a cero.`
        );
        return null;
      }

      const numerosDuplicados = (() => {
        const counter = new Map<string, number>();
        productosValidos.forEach((item) => {
          const raw = item.numeroOrden?.toString().trim();
          if (!raw) return;
          counter.set(raw, (counter.get(raw) ?? 0) + 1);
        });
        return Array.from(counter.entries())
          .filter(([, qty]) => qty > 1)
          .map(([numero]) => numero);
      })();
      if (numerosDuplicados.length > 0) {
        showError(
          `Existen N° de Orden repetidos: ${numerosDuplicados.join(
            ", "
          )}. Cada fila debe usar un número único.`
        );
        return null;
      }

      return productosValidos;
    },
    [showError]
  );

  const onSubmit = async (values: CrearOtForm) => {
    if (!canEditOt) {
      showError("Tu rol solo permite lectura en Crear OT.");
      return;
    }
    const productosValidos = validateProductos(values);
    if (!productosValidos) return;

    const { integrationEntries, workOrdersPayload } = buildWorkOrderPayload({
      ...values,
      productos: productosValidos,
    });
    setEstadoWmsDetalle([]);

    try {
      if (integrationEntries.length === 0 || workOrdersPayload.length === 0) {
        showError("No se pudo generar el payload para la integración de OT.");
        return;
      }

      await sendWorkOrdersIntegration({
        source: "portal",
        payload: integrationEntries,
      });

      for (const payload of workOrdersPayload) {
        await createWorkOrder(payload);
      }
      await Promise.all(
        workOrdersPayload.map((item) =>
          resolveEstadoDetalle({ numero: item.OT, sku: item.contenido.SKU })
        )
      );
      const itemsSummary = workOrdersPayload.map((item) => ({
        numeroOt: item.OT,
        sku: item.contenido.SKU,
        cantidad: item.contenido.Cantidad,
        linea: item.contenido.linea,
        encargado: item.contenido.Encargado,
      }));
      void logOtEvent({
        event: "create",
        payload: {
          numerosOt: itemsSummary.map((item) => item.numeroOt),
          items: itemsSummary,
          integrationEntries: integrationEntries.length,
        },
        userAlias: itemsSummary.map((item) => item.numeroOt).join(", "),
      });
      const numerosCreados = itemsSummary.map((item) => item.numeroOt).join(", ");
      showSuccess(
        numerosCreados
          ? `OT enviadas correctamente: ${numerosCreados}.`
          : "OT enviadas correctamente."
      );
      const maxNumeroCreado = workOrdersPayload.reduce(
        (max, item) => Math.max(max, Number(item.OT) || 0),
        0
      );
      if (maxNumeroCreado > 0) {
        setUltimoNumeroOt(maxNumeroCreado);
        nextAutoNumeroRef.current = maxNumeroCreado + 1;
        setInitialNextOt(nextAutoNumeroRef.current);
      }
      setValue("productos", []);
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Error al crear la OT";
      showError(message);
    }
  };

  const onReenviar = async () => {
    if (!canEditOt) {
      showError("Tu rol solo permite lectura en Crear OT.");
      return;
    }

    const snapshot = getValues();
    const productosValidos = validateProductos(snapshot);
    if (!productosValidos) return;

    const numerosOt = Array.from(
      new Set(
        productosValidos
          .map((item) => item.numeroOrden?.toString().trim() ?? "")
          .filter(Boolean)
      )
    );

    setResendingIntegration(true);
    try {
      const faltantes: string[] = [];
      for (const numero of numerosOt) {
        try {
          const order = await getWorkOrderByNumber(numero);
          if (!order) faltantes.push(numero);
        } catch (err) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : "No se pudo validar la existencia de la OT.";
          showError(message);
          return;
        }
      }

      if (faltantes.length > 0) {
        showError(
          faltantes.length === 1
            ? `La OT ${faltantes[0]} no existe en la base. Solo se puede reenviar si ya fue creada.`
            : `Las OT ${faltantes.join(
                ", "
              )} no existen en la base. Solo se pueden reenviar si ya fueron creadas.`
        );
        return;
      }

      const { integrationEntries } = buildWorkOrderPayload({
        ...snapshot,
        productos: productosValidos,
      });

      if (integrationEntries.length === 0) {
        showError("No se pudo generar el payload para reenviar la OT.");
        return;
      }

      await sendWorkOrdersIntegration({
        source: "portal",
        payload: integrationEntries,
      });

      const numerosLabel = numerosOt.join(", ");
      showSuccess(
        numerosLabel
          ? `OT reenviadas correctamente: ${numerosLabel}.`
          : "OT reenviadas correctamente."
      );
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "No se pudo reenviar la OT.";
      showError(message);
    } finally {
      setResendingIntegration(false);
    }
  };

  const onLimpiar = () => {
    reset();
    setMode("grid");
    setEstadoWmsDetalle([]);
  };

  const downloadAndAutoPrintPdf = (blob: Blob, filename: string) => {
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

    const printUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = printUrl;

    let cleaned = false;
    const cleanupPrint = () => {
      if (cleaned) return;
      cleaned = true;
      setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(printUrl);
      }, 500);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          cleanupPrint();
          return;
        }

        const handleAfterPrint = () => {
          win.removeEventListener("afterprint", handleAfterPrint);
          cleanupPrint();
        };

        win.addEventListener("afterprint", handleAfterPrint);
        win.focus();
        win.print();
        // Fallback: si afterprint no se dispara, limpiamos después de un rato.
        setTimeout(cleanupPrint, 15000);
      } catch {
        // Si la ventana de impresión falla, igualmente limpiamos.
      } finally {
        // No llamamos cleanup aquí para no cerrar el diálogo de impresión de inmediato.
      }
    };
    iframe.onerror = cleanupPrint;
    document.body.appendChild(iframe);
  };

  // Botón imprimir (mock, a conectar con backend/Excel)
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingRecipe, setPrintingRecipe] = useState(false);
  const onImprimir = async () => {
    const valuesSnapshot = getValues();
    const validItems = (valuesSnapshot.productos ?? []).filter(
      (item) =>
        item?.sku &&
        Number(item?.cantidad ?? 0) > 0 &&
        Number((item.numeroOrden ?? "").toString().trim()) > 0
    );
    if (validItems.length === 0) {
      showError("Agrega al menos un producto antes de imprimir la OT.");
      return;
    }

    const opciones = validItems
      .map((item) => `${item.numeroOrden} (${item.sku})`)
      .join(", ");

    const target =
      validItems.length === 1
        ? validItems[0]
        : (() => {
            const entrada = window
              .prompt(`Ingresa el N° de Orden a imprimir: ${opciones}`)
              ?.trim();
            if (!entrada) return null;
            return validItems.find(
              (item) => item.numeroOrden?.toString().trim() === entrada
            );
          })();

    if (!target) {
      showError("No se seleccionó un N° de Orden válido para imprimir.");
      return;
    }

    const numeroStr = target.numeroOrden?.toString().trim() ?? "";
    const numeroOt = Number(numeroStr);
    if (!numeroStr || !Number.isFinite(numeroOt) || numeroOt <= 0) {
      showError("El N° de Orden seleccionado no es válido.");
      return;
    }

    try {
      setIsPrinting(true);
      const { blob, filename } = await printWorkOrder(numeroOt);
      downloadAndAutoPrintPdf(blob, filename || `OT-${numeroStr}.pdf`);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "No se pudo generar la impresión de la OT.";
      showError(message);
    } finally {
      setIsPrinting(false);
    }
  };



  const onImprimirReceta = async () => {
    const snapshot = getValues();
    const items = (snapshot.productos ?? []).filter(
      (item) =>
        item?.sku &&
        Number(item?.cantidad ?? 0) > 0 &&
        Number((item.numeroOrden ?? "").toString().trim()) > 0
    );
    if (items.length === 0) {
      showError("Agrega al menos un producto antes de imprimir la receta.");
      return;
    }

    const opciones = items.map((item) => `${item.numeroOrden} (${item.sku})`).join(", ");
    const target =
      items.length === 1
        ? items[0]
        : (() => {
            const entrada = window
              .prompt(`Ingresa el N° de Orden a imprimir receta: ${opciones}`)
              ?.trim();
            if (!entrada) return null;
            return items.find((item) => item.numeroOrden?.toString().trim() === entrada);
          })();

    if (!target) {
      showError("No se seleccionó un N° de Orden válido para imprimir la receta.");
      return;
    }

    const numeroStr = target.numeroOrden?.toString().trim() ?? "";
    const numeroOt = Number(numeroStr);
    if (!numeroStr || !Number.isFinite(numeroOt) || numeroOt <= 0) {
      showError("El N° de Orden seleccionado no es válido.");
      return;
    }

    const payload = {
      skuPT: target.sku.trim(),
      cantidad: Number(target.cantidad ?? 0),
      numeroOT: numeroStr,
      encargado: target.responsable?.trim() || snapshot.responsable?.trim() || "",
      fecha_ini: snapshot.fechaInicio?.trim() || tomorrowISO(),
    };

    try {
      setPrintingRecipe(true);
      const { blob, filename } = await printWorkOrderRecipe(payload);
      downloadAndAutoPrintPdf(blob, filename || `OT-${numeroStr}-receta.pdf`);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "No se pudo generar la receta.";
      showError(message);
    } finally {
      setPrintingRecipe(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const { blob, filename } = await downloadWorkOrdersTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "plantilla_ot.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo descargar la plantilla.";
      showError(message);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  /* ===========================
     UI
     =========================== */

  return (
    <div className="space-y-5">
      {/* Encabezado + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Crear Orden de Trabajo</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLimpiar}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <FiRefreshCw className="h-4 w-4" /> Limpiar
          </button>

          <button
            type="button"
            onClick={onImprimir}
            disabled={isSubmitting || isPrinting || printingRecipe}
            title="Imprimir OT"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm hover:bg-primary disabled:opacity-60 hover:text-white hover:border-secondary"
          >
            <FiPrinter className="h-4 w-4" />
            Imprimir
          </button>

          <button
            type="button"
            onClick={onImprimirReceta}
            disabled={isSubmitting || printingRecipe || isPrinting}
            title="Imprimir receta"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm hover:bg-primary disabled:opacity-60 hover:text-white hover:border-secondary"
          >
            <FiFileText className="h-4 w-4" />
            Imprimir receta
          </button>

          <button
            type="button"
            onClick={() => void onReenviar()}
            disabled={isSubmitting || resendingIntegration}
            title="Reenviar datos de OT a Invas"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:opacity-60"
          >
            <FiSend className={resendingIntegration ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {resendingIntegration ? "Reenviando OT…" : "Reenviar OT"}
          </button>

          <button
            type="submit"
            form="form-crear-ot"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-success disabled:opacity-60"
          >
            <FiSave className="h-4 w-4" /> Crear OT
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-danger bg-transparent hover:border-red-500 px-3 py-2 text-sm font-medium text-secondary hover:text-white hover:bg-danger/90"
            onClick={() => history.back()}
          >
            <FiXCircle className="h-4 w-4" /> Cancelar
          </button>
        </div>
      </div>

      {/* Formulario */}
      <form
        id="form-crear-ot"
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border bg-white p-5 shadow-sm"
      >
        {isReadOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este perfil tiene acceso solo de lectura. Las acciones están deshabilitadas.
          </div>
        )}
        <fieldset disabled={isReadOnly} className="space-y-6">
        {/* Línea 1: Fecha */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/70">Fecha</label>
          <div className="relative">
            <input
              type="date"
              {...register("fecha", { required: true })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <FiCalendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50" />
          </div>
        </div>

        {/* Línea 2: Fechas de hitos */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">Fecha de Inicio</label>
            <input
              type="date"
              {...register("fechaInicio", { required: true })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">Fecha Término Comprometida</label>
            <input
              type="date"
              {...register("fechaTerminoComprometida", { required: true })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <Tabs>
          <Tab title="Productos a Fabricar" defaultOpen>
            {/* Selector de modo */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-border p-1">
                <button
                  type="button"
                  name="grid"
                  onClick={() => setMode("grid")}
                  className={`rounded-lg px-3 py-1 text-sm ${mode === "grid" ? "bg-primary text-white" : "hover:bg-muted"}`}
                >
                  Modo Grilla
                </button>
                <button
                  type="button"
                  onClick={() => setMode("excel")}
                  className={`rounded-lg px-3 py-1 text-sm ${mode === "excel" ? "bg-primary text-white" : "hover:bg-muted"}`}
                >
                  Carga Excel
                </button>
              </div>

              {mode === "excel" && (
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
                >
                  <FiDownload className="h-4 w-4" />
                  {downloadingTemplate ? "Descargando…" : "Descargar plantilla"}
                </button>
              )}
            </div>

            {mode === "grid" && (
              <p className="text-xs text-foreground/60">
                Última OT en BD:{" "}
                {initialNextLoading ? "obteniendo…" : ultimoNumeroOt != null ? ultimoNumeroOt : "—"}
                {" • "}Siguiente sugerido:{" "}
                {initialNextLoading ? "obteniendo…" : initialNextOt != null ? initialNextOt : "—"}
              </p>
            )}
            {mode === "excel" && csvLoading && (
              <p className="text-xs text-foreground/60">Cargando datos del CSV…</p>
            )}

            {mode === "grid" ? (
              <ProductosAFabricarGrid
                control={control}
                watch={watch}
                lineOptions={lineOptions}
                encargados={encargados}
                onEstadoResolve={resolveEstadoDetalle}
                onEstadoClear={clearEstadoDetalle}
                reserveNumeroOt={reserveNextNumeroOt}
                releaseNumeroOt={releaseNumeroOt}
                initialNumeroOt={initialNextOt}
                initialNumeroOtLoading={initialNextLoading}
              />
            ) : (
              <ProductosAFabricarBulkUpload
                onLoad={(rows) => {
                  void loadProductosDesdeCsv(rows || []);
                }}
              />
            )}
          </Tab>

          {/* ===========================
              Estado de OT en WMS (semáforo visual)
             =========================== */}
          <Tab title="Estado de OT en WMS">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-foreground/70">
                Consulta el estado actual de las OTs ingresadas en la grilla.
              </p>
              <button
                type="button"
                onClick={() => void refreshEstadoWms()}
                disabled={refreshingWms}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className={refreshingWms ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                {refreshingWms ? "Actualizando…" : "Actualizar estados"}
              </button>
            </div>
            <EstadoWMSPanel items={estadoWmsDetalle} />
          </Tab>
        </Tabs>
        </fieldset>
      </form>
    </div>
  );
}

/* ===========================
   Componentes auxiliares
   =========================== */

function Tabs({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Tab({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-border bg-white" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-medium">
        {title}
        <span className="text-foreground/60">(click para Expandir/Contraer)</span>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

/** Panel visual del Estado WMS (display-only, no seleccionable) */
function EstadoWMSPanel({ items }: { items: EstadoWmsDetalle[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        Aún no hay información de WMS. Crea OT desde la grilla para ver el estado de cada número.
      </div>
    );
  }

  const cardInactive = "border-border bg-muted/40 text-foreground/60";
  const cardActive: Record<"CREADA" | "EN_PROCESO" | "FINALIZADA" | "CANCELADA", string> = {
    CREADA: "border-secondary bg-secondary/10",
    EN_PROCESO: "border-warning bg-warning/10",
    FINALIZADA: "border-success bg-success/10",
    CANCELADA: "border-danger bg-danger/10",
  };
  const badgeActive: Record<"CREADA" | "EN_PROCESO" | "FINALIZADA" | "CANCELADA", string> = {
    CREADA: "bg-secondary/20 text-secondary",
    EN_PROCESO: "bg-warning/20 text-warning",
    FINALIZADA: "bg-success/20 text-success",
    CANCELADA: "bg-danger/20 text-danger",
  };
  const dotActive: Record<"CREADA" | "EN_PROCESO" | "FINALIZADA" | "CANCELADA", string> = {
    CREADA: "bg-secondary",
    EN_PROCESO: "bg-warning",
    FINALIZADA: "bg-success",
    CANCELADA: "bg-danger",
  };

  const pasos: {
    key: EstadoWMS;
    label: string;
    Icon: React.ElementType;
    inactiveClass: string;
  }[] = [
    { key: "CREADA", label: "Creada", Icon: FiFlag, inactiveClass: "border-border bg-muted/40 text-foreground/60" },
    { key: "EN_PROCESO", label: "En proceso", Icon: FiActivity, inactiveClass: "border-border bg-muted/40 text-foreground/60" },
    { key: "FINALIZADA", label: "Finalizada", Icon: FiCheckCircle, inactiveClass: "border-border bg-muted/40 text-foreground/60" },
    { key: "CANCELADA", label: "Cancelada", Icon: FiXCircle, inactiveClass: "border-border bg-muted/40 text-foreground/60" },
  ];

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const badgeClass =
          item.estado !== "SIN_INFO" ? badgeActive[item.estado] ?? "bg-muted text-foreground/60" : "bg-muted text-foreground/60";
        const resumenEstado =
          item.estado !== "SIN_INFO" ? item.estadoLabel : "Sin información disponible";

        return (
          <div
            key={`${item.numero}-${item.sku}`}
            className="rounded-xl border border-border p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  OT {item.numero}
                </p>
                <p className="text-xs text-foreground/60">SKU {item.sku}</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                <FiActivity className="h-3 w-3" />
                {resumenEstado}
              </span>
            </div>

            <p className="mt-3 text-xs text-foreground/70">
              Estado reportado por WMS (solo lectura). Si no hay información, las fases quedan inactivas.
            </p>

            <ol className="mt-3 grid gap-3 md:grid-cols-4">
              {pasos.map(({ key, label, Icon, inactiveClass }) => {
                const activo = item.estado !== "SIN_INFO" && item.estado === key;
                const cardClass = activo ? cardActive[key] : inactiveClass || cardInactive;
                const badgeDotClass = activo ? badgeActive[key] : "bg-muted text-foreground/50";

                return (
                  <li
                    key={key}
                    aria-current={activo ? "step" : undefined}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${cardClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-full ${badgeDotClass}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`text-sm ${activo ? "font-medium text-foreground" : ""}`}>{label}</span>
                    </div>

                    {activo && (
                      <span
                        className={`ml-3 inline-block h-2 w-2 animate-pulse rounded-full ${dotActive[key]}`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="mt-3 text-xs text-foreground/60">
              Código WMS: {item.estadoRaw?.trim() ? item.estadoRaw : "Sin datos"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
