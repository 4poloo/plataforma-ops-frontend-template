// src/modules/produccion/services/counters.api.ts
import { API_ROOT } from "./work-orders.api";

const COUNTERS_URL = `${API_ROOT}/v1/counters`;
const WORK_ORDERS_COUNTER_ID = "work_orders";

type CounterResponse = {
  id: string;
  seq: number;
};

type CounterIncrementIn = {
  step?: number;
};

const parseJson = async <T>(res: Response): Promise<T> => {
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Respuesta inválida del servicio de contadores");
  }
};

export async function fetchWorkOrdersCounter(): Promise<CounterResponse> {
  const url = `${COUNTERS_URL}/${encodeURIComponent(WORK_ORDERS_COUNTER_ID)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al obtener el contador de OT`);
  }
  return parseJson<CounterResponse>(res);
}

export async function updateWorkOrdersCounter(seq: number): Promise<CounterResponse> {
  const url = `${COUNTERS_URL}/${encodeURIComponent(WORK_ORDERS_COUNTER_ID)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al actualizar el contador de OT`);
  }

  return parseJson<CounterResponse>(res);
}

export async function getNextWorkOrderNumber(
  body: CounterIncrementIn = { step: 1 }
): Promise<CounterResponse> {
  const url = `${COUNTERS_URL}/${encodeURIComponent(WORK_ORDERS_COUNTER_ID)}/next`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { step: 1 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al obtener el siguiente número de OT`);
  }

  return parseJson<CounterResponse>(res);
}

export async function rollbackWorkOrderNumber(
  body: CounterIncrementIn = { step: 1 }
): Promise<CounterResponse> {
  const url = `${COUNTERS_URL}/${encodeURIComponent(WORK_ORDERS_COUNTER_ID)}/rollback`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { step: 1 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al revertir el número de OT`);
  }

  return parseJson<CounterResponse>(res);
}
