import { NavLink } from "react-router-dom";
import type { MenuLink } from "../types/menu.types";

export default function SidebarItem({
  item,
  collapsed,
}: {
  item: MenuLink;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  // Activa "match exacto" únicamente para Inicio (/app)
  const mustBeExact = item.path === "/app" || item.path === "/";

  // Base de estilos consistente (sin "pegar" colores).
  const base =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70";

  return (
    <NavLink
      to={item.path}
      end={mustBeExact}
      className={({ isActive }) =>
        [
          base,
          collapsed ? "justify-center" : "justify-start",
          // Activo sólo si la ruta coincide:
          isActive
            ? "bg-secondary/80 text-white"
            : "hover:bg-secondary/50 text-primary-foreground",
        ].join(" ")
      }
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
