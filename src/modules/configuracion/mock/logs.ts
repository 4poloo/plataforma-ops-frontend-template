export type Severidad = "INFO" | "WARN" | "ERROR";

export type LogItem = {
  id: string;
  timestamp: string; // ISO
  actor: string;     // email o nombre visible
  accion: string;    // etiqueta corta
  severidad: Severidad;
  detalle?: string;  // JSON/string resumido
};

export const MOCK_LOGS: LogItem[] = [
  {
    id: "l_001",
    timestamp: new Date().toISOString(),
    actor: "demo@surchile.cl",
    accion: "admin.user_create",
    severidad: "INFO",
    detalle: '{"target":"maria@surchile.cl"}',
  },
  {
    id: "l_002",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    actor: "demo@surchile.cl",
    accion: "admin.user_disable",
    severidad: "WARN",
    detalle: '{"target":"juan@surchile.cl"}',
  },
  {
    id: "l_003",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    actor: "maria@surchile.cl",
    accion: "user.update_profile",
    severidad: "INFO",
  },
];
