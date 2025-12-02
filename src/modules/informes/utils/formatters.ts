// Utilidades de formato (números, fechas, porcentajes)

export const fmtNumber = (n: number | undefined | null) =>
  typeof n === "number" && !Number.isNaN(n)
    ? n.toLocaleString("es-CL")
    : "-";

export const fmtPercent = (n: number | undefined | null, digits = 1) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `${n.toFixed(digits)}%`
    : "-";

export const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CL").format(d);
  } catch {
    return iso;
  }
};
