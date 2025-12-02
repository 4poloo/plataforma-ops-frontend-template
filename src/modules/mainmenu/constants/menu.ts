import {
  FiGrid,
  FiTrendingUp,
  FiFileText,
  FiPackage,
  FiLayout,
  FiCpu,
  FiList,
  FiClipboard,
  FiSliders,
  FiBookOpen,
  FiSettings,
  FiUsers,
  FiTool,
  FiUserCheck,
  FiActivity,
} from "react-icons/fi";
import type { MenuLink, MenuGroup } from "../types/menu.types";

/**
 * Estructura final deseada:
 * - Arriba: MENU_ITEMS + grupos “produccion”, “dashboard”, “iaqa”
 * - Abajo:  grupo “config” (anclado por Sidebar, no por este archivo)
 */

export const MENU_ITEMS: MenuLink[] = [
  { type: "link", label: "Inicio", path: "/app", icon: FiGrid },
];

export const MENU_GROUPS: MenuGroup[] = [
  // ====== GRUPOS SUPERIORES (quedan arriba) ======
  {
    type: "group",
    id: "produccion",
    label: "Módulo de Producción",
    icon: FiPackage,
    items: [
      { type: "link", label: "Crear OT", path: "/app/produccion/crear-ot", icon: FiClipboard },
      { type: "link", label: "Gestión de Producción", path: "/app/produccion/gestion", icon: FiActivity },
      { type: "link", label: "Recetas",  path: "/app/produccion/recetas",  icon: FiBookOpen   },
      { type: "link", label: "Productos",path: "/app/produccion/productos",icon: FiFileText    },
      { type: "link", label: "Procesos", path: "/app/produccion/procesos", icon: FiSliders     },
    ],
  },
  {
    type: "group",
    id: "dashboard",
    label: "Dashboard",
    icon: FiLayout,
    items: [
      { type: "link", label: "Producción", path: "/app/dashboard/produccion", icon: FiGrid },
      { type: "link", label: "Informes OT", path: "/app/dashboard/informes", icon: FiTrendingUp },
      { type: "link", label: "IA",         path: "/app/dashboard/ia",         icon: FiCpu  },
    ],
  },
  {
    type: "group",
    id: "iaqa",
    label: "IA QA",
    icon: FiCpu,
    items: [
      { type: "link", label: "Gestión QA", path: "/app/ia-qa/gestion-qa", icon: FiClipboard },
    ],
  },

  // ====== GRUPO INFERIOR (siempre abajo) ======
  {
    type: "group",
    id: "config",
    label: "Configuración",
    icon: FiTool,
    items: [
      // Visible para todos
      { type: "link", label: "Mi cuenta", path: "/app/configuracion", icon: FiSettings },
      // Visibles solo si el rol es Admin (filtrado en Sidebar)
      { type: "link", label: "Encargados de línea", path: "/app/configuracion/encargados", icon: FiUserCheck },
      { type: "link", label: "Usuarios", path: "/app/configuracion/usuarios", icon: FiUsers },
      { type: "link", label: "Logs",      path: "/app/configuracion/logs",     icon: FiList     },
      // { type: "link", label: "Logs", path: "/app/configuracion/logs", icon: FiFileText },
    ],
  },
];
