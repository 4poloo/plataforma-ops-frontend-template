export default function DashboardIA() {
  const modelos = [
    { nombre: "Clasificador de OT", version: "v1.4", precision: 0.93, drift: "Estable" },
    { nombre: "Detección de Merma", version: "v0.9", precision: 0.88, drift: "Ligero" },
  ];
  const hallazgos = [
    { id: "HA-221", categoria: "Calidad", impacto: "Medio", estado: "Pendiente" },
    { id: "HA-224", categoria: "Seguridad", impacto: "Alto", estado: "En revisión" },
    { id: "HA-228", categoria: "Proceso", impacto: "Bajo", estado: "Cerrado" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-lg font-semibold text-foreground">Dashboard · IA</h2>
        <p className="text-sm text-foreground/70">Métricas y estado de IA en modo demo.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="text-xs font-semibold uppercase text-emerald-800">Predicciones últimas 24h</div>
          <div className="text-3xl font-semibold text-emerald-900">12.4K</div>
          <div className="text-sm text-emerald-700">Tasa de acierto 93%</div>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="text-xs font-semibold uppercase text-amber-800">Alertas activas</div>
          <div className="text-3xl font-semibold text-amber-900">4</div>
          <div className="text-sm text-amber-700">3 medias · 1 alta</div>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="text-xs font-semibold uppercase text-sky-800">Retraining</div>
          <div className="text-3xl font-semibold text-sky-900">En curso</div>
          <div className="text-sm text-sky-700">Dataset agosto · 18K filas</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 text-sm font-semibold text-foreground/80">Modelos en producción</div>
          <div className="space-y-3">
            {modelos.map((m) => (
              <div key={m.nombre} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{m.nombre}</div>
                  <div className="text-xs text-foreground/60">Versión {m.version}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-emerald-700">{Math.round(m.precision * 100)}% accuracy</div>
                  <div className="text-xs text-foreground/60">Drift: {m.drift}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 text-sm font-semibold text-foreground/80">Hallazgos recientes</div>
          <div className="space-y-2">
            {hallazgos.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold text-foreground">{h.id}</div>
                  <div className="text-xs text-foreground/60">{h.categoria} · Impacto {h.impacto}</div>
                </div>
                <span className="rounded-full border border-border bg-white px-2 py-0.5 text-xs font-semibold text-foreground/70">
                  {h.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
