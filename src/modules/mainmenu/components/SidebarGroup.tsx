import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { MenuGroup } from "../types/menu.types";
import { FiChevronRight } from "react-icons/fi";
import type { IconType } from "react-icons";

export default function SidebarGroup({
  group,
  collapsed,
}: {
  group: MenuGroup;
  collapsed: boolean;
}) {
  const location = useLocation();

  // Determina si algún hijo del grupo está activo con la URL actual
  const hasActiveChild = useMemo(
    () => group.items.some((it) => location.pathname.startsWith(it.path)),
    [group.items, location.pathname]
  );

  // Abre por defecto si hay un hijo activo
  const [open, setOpen] = useState<boolean>(hasActiveChild);

  // Si cambia la ruta y algún hijo queda activo, mantenemos el grupo abierto
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  // Tipado seguro para los íconos (evita errores si los tipos los marcan como opcionales)
  const GroupIcon = (group.icon as IconType) || (() => null);

  const headerBase =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70";
  const headerCls = [
    headerBase,
    collapsed ? "justify-center" : "justify-between",
    // El header NUNCA va en rojo. Solo un sutil highlight cuando está abierto o con hijo activo.
    open || hasActiveChild ? "bg-white/10" : "hover:bg-white/10",
  ].join(" ");

  const itemBase =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70";

  return (
    <div>
      {/* Header del grupo */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={headerCls}
        aria-expanded={open}
        aria-controls={`grp-${group.id}`}
        title={collapsed ? group.label : undefined}
      >
        <div
          className={`flex items-center gap-3 ${
            collapsed ? "w-full justify-center" : ""
          }`}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{group.label}</span>}
        </div>
        {!collapsed && (
          <FiChevronRight
            className={`h-4 w-4 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
        )}
      </button>

      {/* Submenú */}
      {open && (
        <div id={`grp-${group.id}`} className="mt-1 space-y-1 pl-2">
          {group.items.map((it) => {
            const ItemIcon = (it.icon as IconType) || (() => null);
            const isExactConfig = it.path === "/app/configuracion"; // <<-- SOLO aquí pedimos coincidencia exacta

            return (
              <NavLink
                key={it.path}
                to={it.path}
                end={isExactConfig} // <<--- ESTA LÍNEA evita que "Mi cuenta" quede activo en /configuracion/*
                className={({ isActive }) =>
                  [
                    itemBase,
                    collapsed ? "justify-center" : "justify-start",
                    isActive
                      ? "bg-secondary/80 text-white" // activo (rojo)
                      : "hover:bg-secondary/50 text-primary-foreground",
                  ].join(" ")
                }
                title={collapsed ? it.label : undefined}
                aria-label={collapsed ? it.label : undefined}
              >
                <ItemIcon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
