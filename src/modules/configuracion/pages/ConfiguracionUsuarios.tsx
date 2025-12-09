import { useCallback, useEffect, useMemo, useState } from "react";
import UsuariosFiltros from "../components/UsuariosFiltros";
import UsuariosTabla from "../components/UsuariosTabla";
import UsuarioModal from "../components/UsuarioModal";
import UsuariosPaginacion from "../components/usuarios/UsuariosPaginacion";
import ChangePasswordModal from "../components/usuarios/ChangePasswordModal";
import { USER_ROLE_OPTIONS } from "../constants/users";
import { useLogAction } from "../../logs/hooks/useLogAction.ts";
import {
  changeUserPassword,
  createUser,
  listUsers,
  updateUser,
  type Usuario,
} from "../services/users.api";
import { useFlashBanner } from "../../../global/components/FlashBanner";

const PAGE_SIZE = 8;

type Filters = {
  q: string;
  role: string;
  status: string;
};

const DEFAULT_FILTERS: Filters = { q: "", role: "Todos", status: "Todos" };

const DEFAULT_ROLE_VALUES = USER_ROLE_OPTIONS.map((option) => option.value);
const DEFAULT_STATUS_VALUES = ["active", "disabled"];

const mergeUniques = (prev: string[], next: string[]) =>
  Array.from(new Set([...prev, ...next.filter(Boolean)]));

export default function ConfiguracionUsuarios() {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [rows, setRows] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [openModal, setOpenModal] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [editRow, setEditRow] = useState<Usuario | null>(null);

  const [changePassModal, setChangePassModal] = useState(false);
  const [changePassUser, setChangePassUser] = useState<Usuario | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [roleOptions, setRoleOptions] = useState<string[]>(() => [
    ...DEFAULT_ROLE_VALUES,
  ]);
  const [statusOptions, setStatusOptions] = useState<string[]>(() => [
    ...DEFAULT_STATUS_VALUES,
  ]);

  const logUserEvent = useLogAction({ entity: "user" });
  const { showError, showSuccess } = useFlashBanner();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const skip = (page - 1) * PAGE_SIZE;
    const role = filters.role !== "Todos" ? filters.role : undefined;
    const status = filters.status !== "Todos" ? filters.status : undefined;

    try {
      const response = await listUsers({
        q: filters.q || undefined,
        role,
        status,
        skip,
        limit: PAGE_SIZE,
      });

      setRows(response.items);
      setTotal(response.total);
      setRoleOptions((prev) =>
        mergeUniques(prev, response.items.map((item) => item.role))
      );
      setStatusOptions((prev) =>
        mergeUniques(prev, response.items.map((item) => item.status))
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los usuarios";
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.role, filters.status]);

  const pages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const handleSubmitUser = async (payload: {
    id?: string;
    email: string;
    password?: string;
    nombre: string;
    apellido: string;
    alias: string;
    role: string;
    status: string;
  }) => {
    setSavingUser(true);
    const mapStatusForUpdate = (status: string): string => {
      const normalized = String(status ?? "").trim().toLowerCase();
      if (normalized === "inactive" || normalized === "disabled") return "disabled";
      if (normalized === "active") return "active";
      return status;
    };

    try {
      if (payload.id) {
        const updated = await updateUser(payload.id, {
          nombre: payload.nombre,
          apellido: payload.apellido,
          alias: payload.alias,
          role: payload.role,
          status: mapStatusForUpdate(payload.status),
        });
        void logUserEvent({
          event: "update",
          payload: {
            userId: updated.id,
            email: updated.email,
            alias: updated.alias,
            role: updated.role,
            status: updated.status,
          },
          userAlias: updated.alias || updated.email,
        });
      } else {
        const created = await createUser({
          email: payload.email,
          password: payload.password ?? "",
          nombre: payload.nombre,
          alias: payload.alias,
          apellido: payload.apellido,
          role: payload.role,
        });
        void logUserEvent({
          event: "create",
          payload: {
            userId: created.id,
            email: created.email,
            alias: created.alias,
            role: created.role,
            status: created.status,
          },
          userAlias: created.alias || created.email,
        });

        if (
          payload.status &&
          payload.status !== created.status &&
          created.id
        ) {
          const updated = await updateUser(created.id, {
            nombre: created.nombre,
            apellido: created.apellido,
            alias: created.alias,
            role: created.role,
            status: mapStatusForUpdate(payload.status),
          });
          const statusEvent =
            mapStatusForUpdate(payload.status).toLowerCase() === "disabled" ? "disable" : "enable";
          void logUserEvent({
            event: statusEvent,
            payload: {
              userId: updated.id,
              status: updated.status,
            },
            userAlias: updated.alias || updated.email,
          });
        }
      }

      await fetchUsers();
      setOpenModal(false);
      setEditRow(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo guardar el usuario";
      throw new Error(message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleStatus = async (user: Usuario) => {
    const current = String(user.status ?? "").toLowerCase();
    const nextStatus = current === "active" ? "disabled" : "active";

    try {
      const updated = await updateUser(user.id, {
        nombre: user.nombre,
        apellido: user.apellido,
        alias: user.alias,
        role: user.role,
        status: nextStatus,
      });
      const statusEvent = nextStatus === "disabled" ? "disable" : "enable";
      void logUserEvent({
        event: statusEvent,
        payload: {
          userId: updated.id,
          status: updated.status,
        },
        userAlias: updated.alias || updated.email,
      });
      await fetchUsers();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado del usuario";
      showError(message);
    }
  };

  const handleChangePassword = async ({
    userId,
    passwordActual,
    passwordNueva,
  }: {
    userId: string;
    passwordActual: string;
    passwordNueva: string;
  }) => {
    setChangingPassword(true);
    try {
      await changeUserPassword(userId, {
        passwordActual,
        passwordNueva,
      });
      const targetAlias =
        changePassUser?.alias ??
        changePassUser?.email ??
        changePassUser?.nombre;
      void logUserEvent({
        event: "change_password",
        payload: {
          userId,
        },
        userAlias: targetAlias ?? undefined,
      });
      showSuccess("Contraseña actualizada correctamente");
      setChangePassModal(false);
      setChangePassUser(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña";
      showError(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Configuración — Usuarios</h2>
            <p className="text-sm opacity-90">
              Administra usuarios, roles y estados.
            </p>
          </div>
          <button
            onClick={() => {
              setEditRow(null);
              setOpenModal(true);
            }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-success hover:text-white"
          >
            Nuevo usuario
          </button>
        </div>
      </div>

      <UsuariosFiltros
        roles={roleOptions}
        statuses={statusOptions}
        onApply={(next) => {
          setFilters({
            q: next.q,
            role: next.role,
            status: next.status,
          });
        }}
        onClear={() => setFilters({ ...DEFAULT_FILTERS })}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <UsuariosTabla
        rows={rows}
        loading={loading}
        onEdit={(user) => {
          setEditRow(user);
          setOpenModal(true);
        }}
        onToggleStatus={handleToggleStatus}
        onChangePassword={(user) => {
          setChangePassUser(user);
          setChangePassModal(true);
        }}
      />

      <div className="flex justify-end">
        <UsuariosPaginacion page={page} pages={pages} onPageChange={setPage} />
      </div>

      <UsuarioModal
        open={openModal}
        saving={savingUser}
        initial={editRow ?? undefined}
        roles={roleOptions}
        statuses={statusOptions}
        onClose={() => {
          if (!savingUser) {
            setOpenModal(false);
            setEditRow(null);
          }
        }}
        onSubmit={handleSubmitUser}
      />

      <ChangePasswordModal
        open={changePassModal}
        user={changePassUser ?? undefined}
        saving={changingPassword}
        onClose={() => {
          if (!changingPassword) {
            setChangePassModal(false);
            setChangePassUser(null);
          }
        }}
        onSubmit={handleChangePassword}
      />
    </div>
  );
}
