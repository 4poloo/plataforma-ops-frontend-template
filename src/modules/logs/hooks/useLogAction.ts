import { useCallback, useMemo } from "react";
import { useAuthOptional } from "../../auth/hooks/useAuth";
import { createLog, type LogSeverity } from "../services/logs.api";

type UseLogDefaults = {
  entity?: string;
  actor?: string;
  userAlias?: string;
};

type LogActionInput = {
  event: string;
  entity?: string;
  payload?: unknown;
  severity?: LogSeverity;
  actor?: string;
  userAlias?: string;
  loggedAt?: string;
};

const ALLOWED_ACTORS = ["admin", "user", "sistema"] as const;

const normalizeActor = (value?: string | null, fallback: string = "sistema"): string => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (ALLOWED_ACTORS.includes(normalized as (typeof ALLOWED_ACTORS)[number])) {
    return normalized;
  }
  return fallback;
};

export function useLogAction(defaults?: UseLogDefaults) {
  const auth = useAuthOptional();
  const user = auth?.user;

  const derivedActor = useMemo(() => {
    const role = user?.role?.trim().toLowerCase();
    if (role && ALLOWED_ACTORS.includes(role as (typeof ALLOWED_ACTORS)[number])) {
      return role;
    }
    return undefined;
  }, [user?.role]);

  const fallbackAlias = defaults?.userAlias ?? user?.email ?? user?.nombre ?? user?.role ?? "sistema";

  return useCallback(
    async (input: LogActionInput) => {
      const entity = input.entity ?? defaults?.entity ?? "general";
      const actor = normalizeActor(
        input.actor ?? defaults?.actor ?? derivedActor,
        normalizeActor(user?.role, "sistema")
      );
      const userAlias = input.userAlias ?? fallbackAlias ?? actor;

      try {
        await createLog({
          entity,
          event: input.event,
          payload: input.payload,
          severity: input.severity,
          loggedAt: input.loggedAt,
          actor,
          userAlias,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[logs] No se pudo registrar el evento", error);
        }
      }
    },
    [defaults?.entity, defaults?.actor, fallbackAlias, derivedActor, user?.role]
  );
}
