import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  getUserById,
  updateUser,
  type Usuario,
} from "../services/users.api";

type FormState = {
  nombre: string;
  apellido: string;
  alias: string;
  email: string;
  role: string;
  status: string;
};

type StateStatus = "idle" | "loading" | "saving";

const emptyForm: FormState = {
  nombre: "",
  apellido: "",
  alias: "",
  email: "",
  role: "",
  status: "",
};

export default function CuentaPerfilForm() {
  const { user, setSession } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<StateStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userId = user?.id ?? "";

  useEffect(() => {
    let active = true;
    const load = async () => {
    if (!userId) {
      setStatus("idle");
      return;
      }
      setStatus("loading");
      setError(null);
      try {
        const detail = (await getUserById(userId)) as Usuario | null;
        const base: FormState = {
          nombre: detail?.nombre ?? user?.nombre ?? "",
          apellido: detail?.apellido ?? user?.apellido ?? "",
          alias: detail?.alias ?? user?.alias ?? "",
          email: detail?.email ?? user?.email ?? "",
          role: detail?.role ?? user?.role ?? "",
          status: detail?.status ?? user?.status ?? "",
        };
        if (!base.email) {
          // fallback to alias as email if backend omits it
          base.email = user?.email ?? "";
        }
        if (active) {
          setForm(base);
          setInitial(base);
          setStatus("idle");
        }
      } catch (err) {
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudo cargar tu perfil.";
          setError(message);
          setStatus("idle");
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId, user?.alias, user?.apellido, user?.email, user?.nombre, user?.role, user?.status]);

  const dirty = useMemo(() => {
    return (
      form.nombre !== initial.nombre ||
      form.apellido !== initial.apellido ||
      form.alias !== initial.alias
    );
  }, [form, initial]);

  if (status === "loading") {
    return (
      <div className="text-sm text-gray-500">Cargando datos de tu perfil…</div>
    );
  }

  const onSave = async () => {
    if (!userId) return;
    if (!user) return;
    setSuccess(null);
    setError(null);

    const alias = form.alias.trim();
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();

    if (alias.length < 2) {
      setError("El alias debe tener al menos 2 caracteres.");
      return;
    }
    if (!nombre) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!user) return;

    try {
      setStatus("saving");
      await updateUser(userId, {
        nombre,
        apellido,
        alias,
        role: form.role,
        status: form.status,
      });

      const updatedUser = {
        ...user,
        nombre,
        apellido,
        alias,
        email: form.email,
        role: form.role,
        status: form.status,
      };
      const updatedForm: FormState = { ...form, nombre, apellido, alias };
      setInitial(updatedForm);
      setForm(updatedForm);
      setSession({
        user: updatedUser,
        token: localStorage.getItem("token"),
      });
      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el perfil.";
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  const onReset = () => {
    setForm(initial);
    setError(null);
    setSuccess(null);
  };

  const disabled = status !== "idle";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) void onSave();
      }}
    >
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Nombre</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            disabled={disabled}
            placeholder="Tu nombre"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Apellido</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            value={form.apellido}
            onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
            disabled={disabled}
            placeholder="Tu apellido"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Alias</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            value={form.alias}
            onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))}
            disabled={disabled}
            placeholder="Nombre visible"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Correo</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
            value={form.email}
            disabled
            placeholder="correo@empresa.cl"
            type="email"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Rol</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
            value={form.role}
            disabled
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Estado</span>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500 capitalize"
            value={form.status}
            disabled
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={disabled || !dirty}
          className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white disabled:opacity-60 disabled:hover:bg-primary"
        >
          {status === "saving" ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled || !dirty}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
        >
          Deshacer cambios
        </button>
      </div>
    </form>
  );
}
