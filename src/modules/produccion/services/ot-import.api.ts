// src/modules/produccion/services/ot-import.api.ts

import { API_ROOT } from "./work-orders.api";

const ENDPOINT = `${API_ROOT}/v1/work-orders/import`;

export async function importOtCsv(file: File): Promise<{ message?: string }> {
  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  // backend puede retornar texto o json; intentamos json primero
  try {
    const j = await res.json();
    return j ?? {};
  } catch {
    const t = await res.text();
    return { message: t || "OK" };
  }
}
