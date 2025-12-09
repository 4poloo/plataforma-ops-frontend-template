export default function GestionQA() {
  const pendientes = [
    { id: "QA-1032", ot: "12001", sku: "PT-001", tipo: "Revisión visual", estado: "En curso" },
    { id: "QA-1033", ot: "12002", sku: "PT-014", tipo: "Muestreo lote", estado: "Pendiente" },
  ];
  const checks = [
    { label: "pH detergente", valor: "7.1", rango: "6.8 - 7.4" },
    { label: "Viscosidad", valor: "950 cps", rango: "900 - 1100" },
    { label: "Color", valor: "Transparente", rango: "—" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <header>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Gestión QA</h2>
        <p className="text-sm text-foreground/70">Flujo demo con muestras y hallazgos recientes.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground/80">Casos pendientes</div>
          <div className="space-y-2">
            {pendientes.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold text-foreground">{item.id} · OT {item.ot}</div>
                  <div className="text-xs text-foreground/60">{item.sku} · {item.tipo}</div>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-foreground/70">
                  {item.estado}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground/80">Resultados de control</div>
          <div className="space-y-2 text-sm">
            {checks.map((chk) => (
              <div key={chk.label} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                <div>
                  <div className="font-semibold text-foreground">{chk.label}</div>
                  <div className="text-xs text-foreground/60">Rango {chk.rango}</div>
                </div>
                <div className="font-mono text-sm text-primary">{chk.valor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
