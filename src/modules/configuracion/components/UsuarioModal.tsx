import { useEffect, useMemo, useState } from "react";
import type { Usuario } from "../services/users.api";
import {
  USER_ROLE_OPTIONS,
  getUserRoleLabel,
  DEFAULT_USER_ROLE,
} from "../constants/users";

type Props = {
  open: boolean;
  saving?: boolean;
  initial?: Usuario | null;
  roles?: string[];
  statuses?: string[];
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    email: string;
    password?: string;
    nombre: string;
    apellido: string;
    alias: string;
    role: string;
    status: string;
  }) => Promise<void>;
};

type FieldKey =
  | "nombre"
  | "apellido"
  | "alias"
  | "email"
  | "role"
  | "status"
  | "password";

type FieldErrors = Partial<Record<FieldKey, string>>;

const MIN_PASSWORD_LENGTH = 8;

const BASE_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const DEFAULT_STATUS_VALUE = BASE_STATUS_OPTIONS[0].value;

const normalizeList = (values?: string[]) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => !!value)
    )
  );

const composeRoleOptions = (extraRoles?: string[]) => {
  const dynamic = normalizeList(extraRoles);
  const combined = Array.from(
    new Set([...USER_ROLE_OPTIONS.map((o) => o.value), ...dynamic])
  );
  return combined.map((value) => ({
    value,
    label: getUserRoleLabel(value),
  }));
};

const composeStatusOptions = (statuses?: string[]) => {
  const dynamic = normalizeList(statuses);
  const combined = Array.from(
    new Set([
      ...BASE_STATUS_OPTIONS.map((option) => option.value),
      ...dynamic,
    ])
  );
  return combined.map((value) => {
    const base = BASE_STATUS_OPTIONS.find((option) => option.value === value);
    if (base) return base;
    const label =
      value.toLowerCase() === "active"
        ? "Activo"
        : value.toLowerCase() === "inactive"
        ? "Inactivo"
        : value;
    return { value, label };
  });
};

const inputClass = (hasError?: boolean) =>
  [
    "w-full rounded-lg border px-3 py-2",
    hasError
      ? "border-red-500 focus:border-red-500 focus-visible:ring-red-500"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

export default function UsuarioModal({
  open,
  saving,
  initial,
  roles,
  statuses,
  onClose,
  onSubmit,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState<string>(DEFAULT_USER_ROLE);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS_VALUE);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const availableRoles = useMemo(() => composeRoleOptions(roles), [roles]);
  const availableStatuses = useMemo(
    () => composeStatusOptions(statuses),
    [statuses]
  );

  const isEditing = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;

    setEmail(initial?.email ?? "");
    setNombre(initial?.nombre ?? "");
    setApellido(initial?.apellido ?? "");
    setAlias(initial?.alias ?? "");

    const roleValues = availableRoles.map((option) => option.value);
    const matchRole = (value?: string | null) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      return (
        roleValues.find((option) => option === trimmed) ??
        roleValues.find((option) => option.toLowerCase() === lower)
      );
    };
    const resolvedRole =
      matchRole(initial?.role) ??
      (roleValues.includes(DEFAULT_USER_ROLE) ? DEFAULT_USER_ROLE : null) ??
      roleValues[0] ??
      DEFAULT_USER_ROLE;
    setRole(resolvedRole);

    const statusValues = availableStatuses.map((option) => option.value);
    const matchStatus = (value?: string | null) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      return (
        statusValues.find((option) => option === trimmed) ??
        statusValues.find((option) => option.toLowerCase() === lower)
      );
    };
    const resolvedStatus =
      matchStatus(initial?.status) ??
      (statusValues.includes(DEFAULT_STATUS_VALUE) ? DEFAULT_STATUS_VALUE : null) ??
      statusValues[0] ??
      DEFAULT_STATUS_VALUE;
    setStatus(resolvedStatus);

    setPassword("");
    setFieldErrors({});
    setFormError(null);
  }, [open, initial, availableRoles, availableStatuses]);

  if (!open) return null;

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev || !(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      if (Object.keys(rest).length === 0) {
        setFormError(null);
      }
      return rest;
    });
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!nombre.trim()) errors.nombre = "El nombre es obligatorio";
    if (!apellido.trim()) errors.apellido = "El apellido es obligatorio";
    if (!alias.trim()) errors.alias = "El alias es obligatorio";

    if (!email.trim()) errors.email = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Correo inválido";
    }

    if (!role) errors.role = "Selecciona un rol";
    if (!status) errors.status = "Selecciona un estado";

    if (!isEditing) {
      if (!password.trim()) {
        errors.password = "La contraseña es obligatoria";
      } else if (password.trim().length < MIN_PASSWORD_LENGTH) {
        errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
      }
    }

    return errors;
  };

  const handleApiError = (message: string) => {
    const nextErrors: FieldErrors = {};
    const normalized = message.toLowerCase();

    if (normalized.includes("alias")) {
      nextErrors.alias = "El alias ya existe. Elige uno diferente.";
    }
    if (normalized.includes("email") || normalized.includes("correo")) {
      nextErrors.email = "El correo ya está registrado.";
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));

    setFormError(message);
  };

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl">
        <h3 className="text-sm font-semibold mb-3">
          {isEditing ? "Editar usuario" : "Nuevo usuario"}
        </h3>

        {formError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Nombre</span>
            <input
              className={inputClass(!!fieldErrors.nombre)}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                clearFieldError("nombre");
              }}
              placeholder="Nombre"
            />
            {fieldErrors.nombre && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.nombre}</p>
            )}
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Apellido</span>
            <input
              className={inputClass(!!fieldErrors.apellido)}
              value={apellido}
              onChange={(e) => {
                setApellido(e.target.value);
                clearFieldError("apellido");
              }}
              placeholder="Apellido"
            />
            {fieldErrors.apellido && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.apellido}</p>
            )}
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Alias</span>
            <input
              className={inputClass(!!fieldErrors.alias)}
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value);
                clearFieldError("alias");
              }}
              placeholder="Alias"
            />
            {fieldErrors.alias && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.alias}</p>
            )}
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Email</span>
            <input
              className={inputClass(!!fieldErrors.email)}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="user@example.com"
              disabled={isEditing}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Rol</span>
            <select
              className={inputClass(!!fieldErrors.role)}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                clearFieldError("role");
              }}
            >
              <option value="">Selecciona un rol</option>
              {availableRoles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.role && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>
            )}
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Estado</span>
            <select
              className={inputClass(!!fieldErrors.status)}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                clearFieldError("status");
              }}
            >
              <option value="">Selecciona un estado</option>
              {availableStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.status && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.status}</p>
            )}
          </label>
          {!isEditing && (
            <label className="text-sm md:col-span-2">
              <span className="block text-gray-600 mb-1">
                Contraseña temporal
              </span>
              <input
                className={inputClass(!!fieldErrors.password)}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </label>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-success hover:text-white disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              if (saving) return;

              const errors = validate();
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) {
                setFormError("Corrige los campos marcados e inténtalo nuevamente.");
                return;
              }

              setFormError(null);

              try {
                await onSubmit({
                  id: initial?.id,
                  email: email.trim(),
                  password: isEditing ? undefined : password.trim(),
                  nombre: nombre.trim(),
                  apellido: apellido.trim(),
                  alias: alias.trim(),
                  role,
                  status,
                });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "No se pudo guardar el usuario";
                handleApiError(message);
              }
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm border-red-500 text-white bg-secondary hover:bg-red-500 disabled:opacity-50"
            onClick={() => {
              if (!saving) onClose();
            }}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
