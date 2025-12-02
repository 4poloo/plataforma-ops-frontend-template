// Módulo de Producción → Página "Recetas" (wrapper delgado)
// Renderiza el módulo aislado de Recetas dentro del panel derecho del layout.
// No agregamos contenedores extra para evitar "doble card/padding".


//import RecetasRoot from "@/modules/recetas/pages/RecetasRoot";
// Si no usas alias "@", usa el import relativo equivalente:
import RecetasRoot from "../../recetas/pages/RecetasRoot";

export default function RecetasProduccionPage() {
  /* 
    Estrategia:
    - El módulo `RecetasRoot` se encarga de su propio header interno,
      búsqueda, grillas, modales e import/export.
    - Aquí no añadimos más markup para mantener el mismo "molde" del panel derecho.
    - Si el layout de Producción requiere padding/márgenes, déjalos en el shell padre.
  */
  return <RecetasRoot/>;
}
