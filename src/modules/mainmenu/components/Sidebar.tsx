import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MENU_ITEMS, MENU_GROUPS } from "../constants/menu";
import SidebarItem from "./SidebarItem";
import SidebarGroup from "./SidebarGroup";
import { FiChevronsLeft, FiChevronsRight, FiSettings } from "react-icons/fi";
import { useAuth } from "../../auth/hooks/useAuth";
import type { FeatureKey } from "../../auth/utils/permissions";

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

const pathToFeature = (path: string): FeatureKey | null => {
  if (path.startsWith("/app/produccion/crear-ot")) return "produccion.crearOt";
  if (path.startsWith("/app/produccion/gestion")) return "produccion.gestion";
  if (path.startsWith("/app/produccion/recetas")) return "produccion.recetas";
  if (path.startsWith("/app/produccion/productos")) return "produccion.productos";
  if (path.startsWith("/app/produccion/procesos")) return "produccion.procesos";
  if (path.startsWith("/app/dashboard/informes")) return "dashboard.informes";
  if (path.startsWith("/app/dashboard/produccion")) return "dashboard.produccion";
  if (path.startsWith("/app/dashboard/ia")) return "dashboard.ia";
  if (path.startsWith("/app/ia-qa/gestion-qa")) return "iaqa.gestionQa";
  if (path === "/app/configuracion") return "configuracion.miCuenta";
  if (path.startsWith("/app/configuracion/encargados")) return "configuracion.encargados";
  if (path.startsWith("/app/configuracion/usuarios")) return "configuracion.usuarios";
  if (path.startsWith("/app/configuracion/logs")) return "configuracion.logs";
  return null;
};

export default function Sidebar({ expanded, onToggle }: Props) {
  const navigate = useNavigate();
  const { user, loadingUser, signOut, can } = useAuth();

  const initials = useMemo(() => {
    const name = user?.nombre ?? "Usuario";
    return (
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "US"
    );
  }, [user]);

  const canViewFeature = (feature: FeatureKey): boolean => can(feature, "view");

  const { topGroups, bottomGroups } = useMemo(() => {
    const filterByPermission = (group: (typeof MENU_GROUPS)[number]) => {
      const filteredItems = group.items.filter((item) => {
        const feature = pathToFeature(item.path);
        if (!feature) return true;
        return canViewFeature(feature);
      });
      return { ...group, items: filteredItems };
    };

    const top = MENU_GROUPS.filter((g) => g.id !== "config")
      .map(filterByPermission)
      .filter((g) => g.items.length > 0);
    const bottom = MENU_GROUPS.filter((g) => g.id === "config")
      .map(filterByPermission)
      .filter((g) => g.items.length > 0);
    return { topGroups: top, bottomGroups: bottom };
  }, [canViewFeature]);

  return (
    <aside
      className="sticky top-0 h-screen bg-primary text-primary-foreground shadow-xl"
      aria-label="Barra lateral de navegación"
    >
      <div className="flex h-full flex-col">
        <div
          className={`flex items-center ${
            expanded ? "gap-3 px-4" : "justify-center px-2"
          } py-4`}
        >
          <img
            src="/tulogo.png"
            alt="Logo Empresa"
            className={`rounded-full bg-white object-contain ${
              expanded ? "h-10 w-10" : "h-8 w-8"
            }`}
          />
          {expanded && (
            <span className="text-sm font-semibold tracking-wide">
              Empresa Plataforma Web
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full flex-col">
            <nav className="px-2 space-y-1">
              {MENU_ITEMS.map((mi) => (
                <SidebarItem key={mi.path} item={mi} collapsed={!expanded} />
              ))}
            </nav>

            {!!topGroups.length && (
              <>
                <div className="mx-2 my-3 h-px bg-white/20" />
                <div className="px-2 pb-2 pt-1 space-y-1">
                  {topGroups.map((group) => (
                    <SidebarGroup
                      key={group.id}
                      group={group}
                      collapsed={!expanded}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto">
              {!!bottomGroups.length && (
                <>
                  <div className="mx-2 my-3 h-px bg-white/20" />
                  <div className="px-2 pb-2 pt-1 space-y-1">
                    {bottomGroups.map((group) => (
                      <SidebarGroup
                        key={group.id}
                        group={group}
                        collapsed={!expanded}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 p-2">
        <button
          type="button"
          onClick={() => {
            const target = bottomGroups[0]?.items?.[0]?.path;
            if (target) navigate(target);
          }}
            className={`mb-2 grid h-8 w-8 place-items-center rounded-full bg-white text-primary shadow ring-2 ring-secondary/60 transition hover:brightness-95 ${
              expanded ? "ml-auto mr-2" : "mx-auto"
            }`}
            title="Configuración"
            aria-label="Abrir configuración"
          >
            <FiSettings className="h-4 w-4" />
            <span className="sr-only">Configuración</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
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
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary ring-2 ring-secondary/60 shadow">
              <span className="text-xs font-bold">
                {loadingUser ? "…" : initials}
              </span>
            </div>
            {expanded && (
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium text-primary-foreground">
                  {loadingUser ? "Cargando..." : user?.nombre ?? "Usuario"}
                </p>
                <p className="truncate text-xs text-primary-foreground/80">
                  {loadingUser ? "" : user?.role ?? "—"}
                </p>
              </div>
            )}
          </button>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full border-2 border-secondary bg-white text-secondary shadow-lg transition hover:border-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        type="button"
        aria-label={expanded ? "Contraer menú" : "Expandir menú"}
        title={expanded ? "Contraer menú" : "Expandir menú"}
      >
        {expanded ? (
          <FiChevronsLeft className="h-4 w-4" />
        ) : (
          <FiChevronsRight className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
