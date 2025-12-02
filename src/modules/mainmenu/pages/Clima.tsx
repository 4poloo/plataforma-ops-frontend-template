import { useEffect, useRef } from "react";

/**
 * Widget embebido de WeatherAPI (El Monte, °C).
 * Se fuerza la recarga al montar y se limpia al desmontar
 * para que funcione correctamente al navegar entre rutas.
 */
export default function WeatherEmbed() {
  // IDs únicos por montaje para evitar colisiones y forzar init del script
  const containerIdRef = useRef<string>(
    `weatherapi-weather-widget-${Math.random().toString(36).slice(2)}`
  );
  const scriptIdRef = useRef<string>(
    `weatherapi-script-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const containerId = containerIdRef.current;

    // Por si acaso, limpiar el contenedor antes de inyectar
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";

    // Insertar script SIEMPRE (con el div dinámico)
    const script = document.createElement("script");
    script.id = scriptIdRef.current;
    script.async = true;
    script.src =
      `https://www.weatherapi.com/weather/widget.ashx` +
      `?loc=370047&wid=5&tu=1&div=${containerId}`;
    document.body.appendChild(script);

    // Limpieza: quitar script y contenido para permitir re-init en el próximo mount
    return () => {
      const s = document.getElementById(scriptIdRef.current);
      if (s && s.parentNode) s.parentNode.removeChild(s);
      const c = document.getElementById(containerId);
      if (c) c.innerHTML = "";
    };
  }, []);

  return (
    <>
      <div id={containerIdRef.current} />
      <noscript>
        <a
          href="https://www.weatherapi.com/weather/q/el-monte-370047"
          aria-label="Pronóstico El Monte"
        >
          10 day hour by hour El Monte weather
        </a>
      </noscript>
    </>
  );
}
