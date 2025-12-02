// src/modules/mainmenu/components/UserFooter.tsx
import type { User } from "../../auth/services/auth.api";

export default function UserFooter({
  expanded,
  user,
  loading,
  onLogout,
}: {
  expanded: boolean;
  user: User | null;
  loading: boolean;
  onLogout: () => void;
}) {
  // Iniciales como fallback si no hay avatar real
  const initials =
    user?.nombre
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "US";

  return (
    <div className="border-t border-white/20 p-2">
      <button
        type="button"
        onClick={onLogout}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/50 ${
          expanded ? "justify-start" : "justify-center"
        }`}
        title={
          expanded
            ? "Cerrar sesión"
            : `${user?.nombre ?? "Usuario"} — Cerrar sesión`
        }
        aria-label="Cerrar sesión"
      >
        {/* Avatar */}
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary ring-2 ring-secondary/60 shadow">
          {/* si más adelante tienes imagen, reemplaza por <img /> */}
          <span className="text-xs font-bold">{initials}</span>
        </div>

        {/* Nombre (solo cuando está expandido) */}
        {expanded && (
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-primary-foreground">
              {loading ? "Cargando..." : user?.nombre ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-primary-foreground/80">
              {loading ? "" : user?.role ?? "—"}
            </p>
          </div>
        )}
      </button>
    </div>
  );
}
