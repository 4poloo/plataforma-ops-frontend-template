export type Indicador = {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;  // ISO
  valor: number;
};

export type Indicadores = {
  uf: Indicador;
  utm: Indicador;
  dolar: Indicador;
};

const API_URL = "https://mindicador.cl/api";
const CACHE_KEY = "dashboard:mindicador:last";

export async function getIndicadores(): Promise<Indicadores> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al consultar mindicador.cl");
    const data = await res.json();

    const out: Indicadores = {
      uf: data.uf,
      utm: data.utm,
      dolar: data.dolar,
    };

    // Cachea simple en sesión
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: out }));
    } catch {}

    return out;
  } catch (err) {
    // Intentar cache si existe
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data } = JSON.parse(raw);
        return data as Indicadores;
      }
    } catch {}
    throw err;
  }
}

export function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function formatDateISO(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
