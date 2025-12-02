export type FeatureKey =
  | "produccion.crearOt"
  | "produccion.gestion"
  | "produccion.recetas"
  | "produccion.productos"
  | "produccion.procesos"
  | "dashboard.informes"
  | "dashboard.produccion"
  | "dashboard.ia"
  | "iaqa.gestionQa"
  | "configuracion.miCuenta"
  | "configuracion.encargados"
  | "configuracion.usuarios"
  | "configuracion.logs";

export type FeaturePermission = {
  view: boolean;
  edit: boolean;
};

export type PermissionsMap = Record<FeatureKey, FeaturePermission>;

const FEATURES: FeatureKey[] = [
  "produccion.crearOt",
  "produccion.gestion",
  "produccion.recetas",
  "produccion.productos",
  "produccion.procesos",
  "dashboard.informes",
  "dashboard.produccion",
  "dashboard.ia",
  "iaqa.gestionQa",
  "configuracion.miCuenta",
  "configuracion.encargados",
  "configuracion.usuarios",
  "configuracion.logs",
];

const PERMISSION_DENIED: FeaturePermission = { view: false, edit: false };

const buildMap = (
  defaults: FeaturePermission
): PermissionsMap =>
  FEATURES.reduce<PermissionsMap>((acc, feature) => {
    acc[feature] = { ...defaults };
    return acc;
  }, {} as PermissionsMap);

const clone = (map: PermissionsMap): PermissionsMap =>
  FEATURES.reduce<PermissionsMap>((acc, feature) => {
    acc[feature] = { ...map[feature] };
    return acc;
  }, {} as PermissionsMap);

const grant = (
  map: PermissionsMap,
  feature: FeatureKey,
  perms: Partial<FeaturePermission>
) => {
  map[feature] = { ...map[feature], ...perms };
};

export function getPermissionsForRole(role?: string | null): PermissionsMap {
  const normalized = String(role ?? "").trim().toLowerCase();
  const base = buildMap({ view: true, edit: true });

  if (!normalized || normalized === "admin" || normalized === "administrador") {
    return base;
  }

  if (normalized === "jefe_planta" || normalized === "jefe de planta") {
    const map = clone(base);
    // Sin acceso al módulo IA QA
    grant(map, "iaqa.gestionQa", PERMISSION_DENIED);
    // Dashboard IA se mantiene disponible (lectura)
    grant(map, "dashboard.ia", { view: true, edit: false });
    // Configuración completa
    return map;
  }

  if (normalized === "gerente") {
    const map = buildMap({ view: true, edit: false });
    // Producción - solo Informes editable
    grant(map, "dashboard.informes", { view: true, edit: true });
    // Configuración: solo Mi Cuenta visible/editable
    grant(map, "configuracion.miCuenta", { view: true, edit: true });
    grant(map, "configuracion.encargados", PERMISSION_DENIED);
    grant(map, "configuracion.usuarios", PERMISSION_DENIED);
    grant(map, "configuracion.logs", PERMISSION_DENIED);
    // IA QA bloqueado
    grant(map, "iaqa.gestionQa", PERMISSION_DENIED);
    // Dashboard IA solo lectura
  grant(map, "dashboard.ia", { view: true, edit: false });
  grant(map, "dashboard.informes", { view: true, edit: true });
    grant(map, "dashboard.produccion", { view: true, edit: true });
    return map;
  }

  // Resto de roles: vista y edición permitidas por ahora
  return base;
}

export function getFeaturePermission(
  map: PermissionsMap,
  feature: FeatureKey
): FeaturePermission {
  return map[feature] ?? PERMISSION_DENIED;
}

export function hasPermission(
  map: PermissionsMap,
  feature: FeatureKey,
  type: "view" | "edit" = "view"
): boolean {
  const perm = getFeaturePermission(map, feature);
  return perm[type];
}
