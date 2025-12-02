import { useEffect, useState } from "react";

// Hook simple para refrescar la hora cada segundo
function useNow(tz?: string) {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const zone = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dateStr = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: zone,
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(now);

  return { zone, dateStr, timeStr };
}

export default function Reloj() {
  const { zone, dateStr, timeStr } = useNow("America/Santiago");

  return (
    // Centrado del reloj dentro del card
    <div className="flex justify-center ">
      {/* inline-flex + flex-col para apilar y centrar todo */}
      <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-border px-6 py-4">
        <div className="text-xs uppercase tracking-wide text-foreground/60">
          {zone}
        </div>
        <div className="font-mono text-4xl font-semibold text-primary">
          {timeStr}
        </div>
        <div className="text-lg text-foreground/80">{dateStr}</div>
      </div>
    </div>
  );
}
