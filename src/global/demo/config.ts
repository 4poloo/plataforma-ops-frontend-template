import type { Indicadores } from "../../modules/mainmenu/services/minidicador.api";
import type { Encargado } from "../../modules/produccion/services/encargados.api";
import type { GestionProduccionRecord } from "../../modules/produccion/services/gestion-produccion.api";
import type { WorkOrder } from "../../modules/produccion/services/work-orders.api";
import type { Producto } from "../../modules/Productos/types/producto";
import type { RecetaDetalleDTO } from "../../modules/recetas/models/receta.model";
import type { Usuario } from "../../modules/configuracion/services/users.api";

export type DemoWeather = {
  location: string;
  summary: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
  forecast: Array<{ day: string; low: number; high: number; summary: string }>;
};

export type DemoData = {
  indicadores: Indicadores;
  clima: DemoWeather;
  productos: Producto[];
  encargados: Encargado[];
  workOrders: WorkOrder[];
  gestion: GestionProduccionRecord[];
  produccionPorOt: Record<string, number>;
  recetas: RecetaDetalleDTO[];
  usuarios: Usuario[];
};

export const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? "1") === "1";

const STORAGE_KEY = "sc:demo:data:v1";

const BASE_DATA: DemoData = {
  indicadores: {
    uf: {
      codigo: "uf",
      nombre: "UF",
      unidad_medida: "CLP",
      fecha: "2025-09-12",
      valor: 36890.4,
    },
    utm: {
      codigo: "utm",
      nombre: "UTM",
      unidad_medida: "CLP",
      fecha: "2025-09-01",
      valor: 65430,
    },
    dolar: {
      codigo: "dolar",
      nombre: "Dólar Observado",
      unidad_medida: "CLP",
      fecha: "2025-09-12",
      valor: 954.12,
    },
  },
  clima: {
    location: "El Monte, Región Metropolitana",
    summary: "Despejado con brisa suave",
    temperatureC: 21,
    humidity: 56,
    windKph: 11,
    forecast: [
      { day: "Vie", low: 9, high: 22, summary: "Soleado" },
      { day: "Sáb", low: 10, high: 23, summary: "Parcialmente nublado" },
      { day: "Dom", low: 11, high: 24, summary: "Soleado" },
    ],
  },
  productos: [
    {
      id: "pt-001",
      sku: "PT-001",
      name: "Detergente Multiusos 1L",
      uom: "UN",
      groupName: "LIMPIEZA",
      subgroupName: "DETERGENTES",
      priceNet: 1290,
      classification: "PT",
      replacementCost: 980,
      activo: true,
    },
    {
      id: "pt-014",
      sku: "PT-014",
      name: "Suavizante Primavera 5L",
      uom: "UN",
      groupName: "LIMPIEZA",
      subgroupName: "AROMATIZANTES",
      priceNet: 3890,
      classification: "PT",
      replacementCost: 3100,
      activo: true,
    },
    {
      id: "pt-022",
      sku: "PT-022",
      name: "Lavalozas Limón 1L",
      uom: "UN",
      groupName: "LIMPIEZA",
      subgroupName: "LIMPIADORES",
      priceNet: 1590,
      classification: "PT",
      replacementCost: 1200,
      activo: true,
    },
    {
      id: "mp-010",
      sku: "MP-010",
      name: "Tensoactivo Base",
      uom: "KG",
      groupName: "ELABORACION",
      subgroupName: "LIMPIEZA",
      priceNet: 2200,
      classification: "MP",
      replacementCost: 2100,
      activo: true,
    },
    {
      id: "mp-021",
      sku: "MP-021",
      name: "Fragancia Citrus",
      uom: "KG",
      groupName: "ELABORACION",
      subgroupName: "LIMPIEZA",
      priceNet: 6800,
      classification: "MP",
      replacementCost: 6500,
      activo: true,
    },
    {
      id: "mp-099",
      sku: "MP-099",
      name: "Envase PET 1L",
      uom: "UN",
      groupName: "INSUMOS",
      subgroupName: "ENVASES",
      priceNet: 180,
      classification: "MP",
      replacementCost: 150,
      activo: true,
    },
  ],
  encargados: [
    { _id: "enc-1", nombre: "Ana Ríos", linea: "AGUA", predeterminado: true },
    { _id: "enc-2", nombre: "Carlos Díaz", linea: "ROTATIVA" },
    { _id: "enc-3", nombre: "Fernanda Silva", linea: "PERIFERICOS" },
    { _id: "enc-4", nombre: "Gabriel Fuentes", linea: "ASEO HOGAR" },
  ],
  workOrders: [
    {
      OT: 12001,
      contenido: {
        SKU: "PT-001",
        Cantidad: 1200,
        Encargado: "Ana Ríos",
        linea: "AGUA",
        fecha: "2025-09-12",
        fecha_ini: "2025-09-12T08:00:00",
        fecha_fin: "2025-09-12T16:00:00",
        descripcion: "Detergente Multiusos 1L",
        hora_entrega: "16:00",
      },
      estado: "EN PROCESO",
    },
    {
      OT: 12002,
      contenido: {
        SKU: "PT-014",
        Cantidad: 800,
        Encargado: "Carlos Díaz",
        linea: "ROTATIVA",
        fecha: "2025-09-12",
        fecha_ini: "2025-09-12T09:00:00",
        fecha_fin: "2025-09-12T18:00:00",
        descripcion: "Suavizante Primavera 5L",
        hora_entrega: "18:30",
      },
      estado: "CREADA",
    },
    {
      OT: 12003,
      contenido: {
        SKU: "PT-022",
        Cantidad: 1500,
        Encargado: "Fernanda Silva",
        linea: "PERIFERICOS",
        fecha: "2025-09-11",
        fecha_ini: "2025-09-11T07:30:00",
        fecha_fin: "2025-09-11T15:30:00",
        descripcion: "Lavalozas Limón 1L",
        hora_entrega: "15:00",
      },
      estado: "CERRADA",
    },
    {
      OT: 12004,
      contenido: {
        SKU: "PT-001",
        Cantidad: 900,
        Encargado: "Gabriel Fuentes",
        linea: "ASEO HOGAR",
        fecha: "2025-09-13",
        fecha_ini: "2025-09-13T08:30:00",
        fecha_fin: "2025-09-13T14:00:00",
        descripcion: "Detergente Multiusos 1L",
        hora_entrega: "14:00",
      },
      estado: "PAUSADA",
    },
  ],
  gestion: [
    {
      _id: "gp-1",
      OT: 12001,
      contenido: {
        SKU: "PT-001",
        Encargado: "Ana Ríos",
        linea: "AGUA",
        fecha: "2025-09-12",
        fecha_ini: "2025-09-12T08:00:00",
        fecha_fin: "2025-09-12T16:00:00",
        hora_entrega: "16:00",
        cantidad_hora_extra: 150,
        cantidad_hora_normal: 1050,
        descripcion: "Detergente Multiusos 1L",
      },
      estado: "EN PROCESO",
      merma: 12,
      cantidad_fin: 1180,
      audit: { createdAt: "2025-09-12T08:05:00" },
    },
    {
      _id: "gp-2",
      OT: 12002,
      contenido: {
        SKU: "PT-014",
        Encargado: "Carlos Díaz",
        linea: "ROTATIVA",
        fecha: "2025-09-12",
        fecha_ini: "2025-09-12T09:00:00",
        fecha_fin: "2025-09-12T18:00:00",
        hora_entrega: "18:30",
        cantidad_hora_extra: 100,
        cantidad_hora_normal: 700,
        descripcion: "Suavizante Primavera 5L",
      },
      estado: "CREADA",
      merma: 6,
      cantidad_fin: 0,
      audit: { createdAt: "2025-09-12T09:10:00" },
    },
    {
      _id: "gp-3",
      OT: 12003,
      contenido: {
        SKU: "PT-022",
        Encargado: "Fernanda Silva",
        linea: "PERIFERICOS",
        fecha: "2025-09-11",
        fecha_ini: "2025-09-11T07:30:00",
        fecha_fin: "2025-09-11T15:30:00",
        hora_entrega: "15:00",
        cantidad_hora_extra: 0,
        cantidad_hora_normal: 1500,
        descripcion: "Lavalozas Limón 1L",
      },
      estado: "CERRADA",
      merma: 10,
      cantidad_fin: 1490,
      audit: { updatedAt: "2025-09-11T15:35:00" },
    },
  ],
  produccionPorOt: {
    "12001|PT-001": 1180,
    "12002|PT-014": 640,
    "12003|PT-022": 1490,
  },
  recetas: [
    {
      id: "PT-001",
      codigo: "PT-001",
      descripcion: "Receta Detergente Multiusos 1L",
      version: 2,
      vigente: true,
      habilitada: true,
      cantidadBase: 100,
      unidadBase: "UN",
      materiales: [
        { sku: "MP-010", descripcion: "Tensoactivo Base", unidad: "KG", cantidad: 22, mermaPct: 1 },
        { sku: "MP-021", descripcion: "Fragancia Citrus", unidad: "KG", cantidad: 2.5, mermaPct: 0.5 },
        { sku: "MP-099", descripcion: "Envase PET 1L", unidad: "UN", cantidad: 100, mermaPct: 0 },
      ],
      auditoria: {
        creadoPor: "ana.rios",
        creadoEn: "2025-08-20T10:30:00",
        modPor: "carlos.diaz",
        modEn: "2025-09-10T14:00:00",
      },
    },
    {
      id: "PT-014",
      codigo: "PT-014",
      descripcion: "Receta Suavizante Primavera 5L",
      version: 1,
      vigente: true,
      habilitada: true,
      cantidadBase: 50,
      unidadBase: "UN",
      materiales: [
        { sku: "MP-010", descripcion: "Tensoactivo Base", unidad: "KG", cantidad: 12, mermaPct: 1 },
        { sku: "MP-021", descripcion: "Fragancia Floral", unidad: "KG", cantidad: 1.2, mermaPct: 0.5 },
        { sku: "MP-099", descripcion: "Bidón 5L", unidad: "UN", cantidad: 50, mermaPct: 0 },
      ],
      auditoria: {
        creadoPor: "gabriel.fuentes",
        creadoEn: "2025-08-25T09:15:00",
      },
    },
    {
      id: "PT-022",
      codigo: "PT-022",
      descripcion: "Receta Lavalozas Limón 1L",
      version: 3,
      vigente: false,
      habilitada: false,
      cantidadBase: 80,
      unidadBase: "UN",
      materiales: [
        { sku: "MP-010", descripcion: "Tensoactivo Base", unidad: "KG", cantidad: 18, mermaPct: 1 },
        { sku: "MP-021", descripcion: "Fragancia Limón", unidad: "KG", cantidad: 1.8, mermaPct: 0.4 },
        { sku: "MP-099", descripcion: "Envase PET 1L", unidad: "UN", cantidad: 80, mermaPct: 0 },
      ],
      auditoria: {
        creadoPor: "fernanda.silva",
        creadoEn: "2025-08-15T11:00:00",
        modPor: "fernanda.silva",
        modEn: "2025-09-01T12:00:00",
      },
    },
  ],
  usuarios: [
    {
      id: "u-1",
      email: "ana.rios@demo.cl",
      nombre: "Ana",
      apellido: "Ríos",
      alias: "ana.rios",
      role: "admin",
      status: "active",
      createdAt: "2025-08-01T10:00:00",
    },
    {
      id: "u-2",
      email: "carlos.diaz@demo.cl",
      nombre: "Carlos",
      apellido: "Díaz",
      alias: "carlos.diaz",
      role: "planificador",
      status: "active",
      createdAt: "2025-08-02T09:15:00",
    },
    {
      id: "u-3",
      email: "fernanda.silva@demo.cl",
      nombre: "Fernanda",
      apellido: "Silva",
      alias: "fernanda.silva",
      role: "supervisor",
      status: "active",
      createdAt: "2025-08-05T14:22:00",
    },
    {
      id: "u-4",
      email: "gabriel.fuentes@demo.cl",
      nombre: "Gabriel",
      apellido: "Fuentes",
      alias: "gabriel.fuentes",
      role: "operador",
      status: "disabled",
      createdAt: "2025-08-08T08:45:00",
    },
    {
      id: "u-5",
      email: "qa.demo@demo.cl",
      nombre: "QA",
      apellido: "Demo",
      alias: "qa.demo",
      role: "qa",
      status: "active",
      createdAt: "2025-08-10T12:00:00",
    },
  ],
};

const cloneData = (data: DemoData): DemoData =>
  JSON.parse(JSON.stringify(data)) as DemoData;

export function loadDemoData(): DemoData {
  if (typeof localStorage === "undefined") return cloneData(BASE_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneData(BASE_DATA);
    const parsed = JSON.parse(raw) as Partial<DemoData>;
    return cloneData({ ...BASE_DATA, ...parsed });
  } catch {
    return cloneData(BASE_DATA);
  }
}

export function saveDemoData(data: DemoData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function updateDemoData(mutator: (draft: DemoData) => void): DemoData {
  const current = loadDemoData();
  const draft = cloneData(current);
  mutator(draft);
  saveDemoData(draft);
  return draft;
}
