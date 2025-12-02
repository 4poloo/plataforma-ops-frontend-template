export type UserRoleOption = {
  value: string;
  label: string;
};

export const DEFAULT_USER_ROLE = "trabajador";

const BASE_ROLE_OPTIONS: UserRoleOption[] = [
  { value: "gerente", label: "Gerente" },
  { value: "jefe_produccion", label: "Jefe de Producción" },
  { value: "jefe_planta", label: "Jefe de Planta" },
  { value: "operador", label: "Operador" },
  { value: "jefe_bodega", label: "Jefe de Bodega" },
  { value: "jefe_picking", label: "Jefe de Picking" },
  { value: DEFAULT_USER_ROLE, label: "Trabajador" },
  { value: "administrador", label: "Administrador" },
  { value: "informatica", label: "Informática" },
];

export const USER_ROLE_OPTIONS: UserRoleOption[] = BASE_ROLE_OPTIONS;

export const USER_ROLE_MAP = new Map(
  USER_ROLE_OPTIONS.map((option) => [option.value, option.label] as const)
);

export function getUserRoleLabel(value: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized.toLowerCase() === "admin") return "Administrador";
  const label = USER_ROLE_MAP.get(normalized);
  if (label) return label;

  const capitalized = normalized
    .split(/[\s_\-]+/)
    .map((segment) =>
      segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    )
    .join(" ");
  return capitalized;
}
