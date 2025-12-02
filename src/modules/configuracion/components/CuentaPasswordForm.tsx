import { useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { changeUserPassword } from "../services/users.api";

const policy = (s: string) => ({
  min: s.length >= 8,
  upper: /[A-Z]/.test(s),
  num: /\d/.test(s),
});

export default function CuentaPasswordForm() {
  const { user } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSave = async () => {
    if (!user?.id) return;
    setError(null);
    setSuccess(null);

    if (!actual) {
      setError("Debes ingresar tu contraseña actual.");
      return;
    }
    const p = policy(nueva);
    if (!p.min || !p.upper || !p.num) {
      setError(
        "La nueva contraseña no cumple la política (mínimo 8 caracteres, 1 mayúscula y 1 número)."
      );
      return;
    }
    if (nueva !== confirm) {
      setError("La confirmación no coincide.");
      return;
    }

    try {
      setSaving(true);
      await changeUserPassword(user.id, {
        passwordActual: actual,
        passwordNueva: nueva,
      });
      setSuccess("Contraseña actualizada correctamente.");
      setActual("");
      setNueva("");
      setConfirm("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving) void onSave();
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Contraseña actual</span>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Nueva contraseña</span>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Confirmar</span>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      <ul className="text-xs text-gray-600">
        <li>• Mínimo 8 caracteres</li>
        <li>• Al menos una mayúscula</li>
        <li>• Al menos un número</li>
      </ul>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md border px-3 py-2 text-sm hover:bg-primary hover:text-white disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
