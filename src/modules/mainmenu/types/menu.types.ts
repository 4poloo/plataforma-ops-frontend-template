import type { IconType } from "react-icons";

export interface MenuLink {
  type: "link";
  label: string;
  path: string;
  icon: IconType;
}

export interface MenuGroup {
  type: "group";
  id: string;          // clave para persistir expansión (localStorage)
  label: string;
  icon?: IconType;
  items: MenuLink[];
}

export type MenuEntry = MenuLink | MenuGroup;
