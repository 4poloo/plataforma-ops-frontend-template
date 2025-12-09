// src/modules/procesos/services/procesos.service.ts
import type { Proceso } from "../types";
import type { Filtros } from "../types";

const KEY = "sc.procesos";
const DEFAULT_PROCESOS: Proceso[] = [
  { codigo: "MZCL-01", nombre: "Mezclado base detergente", costo: 120000 },
  { codigo: "ENV-02", nombre: "Envasado botella 1L", costo: 45000 },
  { codigo: "ETQ-03", nombre: "Etiquetado y embalaje", costo: 30000 },
];

function read(): Proceso[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    write(DEFAULT_PROCESOS);
    return DEFAULT_PROCESOS;
  }
  const parsed = JSON.parse(raw) as Proceso[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    write(DEFAULT_PROCESOS);
    return DEFAULT_PROCESOS;
  }
  return parsed;
}
function write(data: Proceso[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export const procesosService = {
  async list(): Promise<Proceso[]> {
    return read();
  },

  async create(p: Proceso): Promise<void> {
    const data = read();
    // validación simple (código único)
    if (data.some(d => d.codigo.toUpperCase() === p.codigo.toUpperCase())) {
      throw new Error("El código ya existe.");
    }
    write([...data, p]);
  },

  async update(codigo: string, patch: Partial<Proceso>): Promise<Proceso> {
    const data = read();
    const idx = data.findIndex(d => d.codigo.toUpperCase() === codigo.toUpperCase());
    if (idx === -1) throw new Error("Proceso no encontrado.");
    const updated = { ...data[idx], ...patch };
    data[idx] = updated;
    write(data);
    return updated;
  },

  async remove(codigo: string): Promise<void> {
    const data = read();
    const next = data.filter(d => d.codigo.toUpperCase() !== codigo.toUpperCase());
    write(next);
  },

  async bulkCreate(nuevos: Proceso[]): Promise<void> {
    const data = read();
    const seen = new Set(data.map(d => d.codigo.toUpperCase()));
    const toInsert = nuevos.filter(n => !seen.has(n.codigo.toUpperCase()));
    write([...data, ...toInsert]);
  },

  // ⬇️ NUEVO: export vía backend
  async exportar(filtros: Filtros): Promise<void> {
    const params = new URLSearchParams();
    if (filtros.search) params.set("search", filtros.search);
    if (typeof filtros.costoMin === "number") params.set("costoMin", String(filtros.costoMin));
    if (typeof filtros.costoMax === "number") params.set("costoMax", String(filtros.costoMax));
    params.set("sortBy", filtros.sortBy);
    params.set("sortOrder", filtros.sortOrder);

    const res = await fetch(`/api/procesos/export?${params.toString()}`, { method: "GET" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "No se pudo exportar.");
    }
    const blob = await res.blob();
    const disp = res.headers.get("Content-Disposition") || "";
    const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/.exec(disp);
    const filename = decodeURIComponent(m?.[1] || m?.[2] || "procesos.xlsx");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
