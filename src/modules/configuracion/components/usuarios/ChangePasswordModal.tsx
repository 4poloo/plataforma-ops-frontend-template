import { useEffect, useState } from "react";
import type { Usuario } from "../../services/users.api";
import { useFlashBanner } from "../../../../global/components/FlashBanner";

type Props = {
  open: boolean;
  user?: Usuario | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: { userId: string; passwordActual: string; passwordNueva: string }) => void;
};

export default function ChangePasswordModal({ open, user, saving, onClose, onSubmit }: Props) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const { showError } = useFlashBanner();

  useEffect(() => {
    if (!open) return;
    setPasswordActual("");
    setPasswordNueva("");
  }, [open, user?.id]);

  if (!open || !user?.id) return null;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="bg-white rounded-2xl shadow p-4 w-full max-w-lg">
        <h3 className="text-sm font-semibold mb-3">Cambiar contraseña — {user.email}</h3>
        <div className="space-y-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Contraseña actual</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              placeholder="Contraseña actual"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Contraseña nueva</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-success hover:text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => {
              if (passwordNueva.trim().length < 8) {
                showError("La contraseña nueva debe tener al menos 8 caracteres");
                return;
              }
              onSubmit({
                userId: user.id,
                passwordActual: passwordActual.trim(),
                passwordNueva: passwordNueva.trim(),
              });
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm border-red-500 text-white bg-secondary hover:bg-red-500 disabled:opacity-50"
            disabled={saving}
            onClick={() => {
              if (!saving) onClose();
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
