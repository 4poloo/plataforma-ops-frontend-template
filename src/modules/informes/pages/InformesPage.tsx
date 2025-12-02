import React from "react";
import { COPY } from "../copy/es";
import FiltrosInformes from "../components/FiltrosInformes";
import KPIGrid from "../components/KPIGrid";
import ChartOTPorDia from "../components/ChartOTPorDia";
import ChartTopProductos from "../components/ChartTopProductos";
import TablaDetalle from "../components/TablaDetalle";
import ExportMenu from "../components/ExportMenu";
import { InformesProvider, useInformesStore } from "../store/useInformesStore";
import {
  fetchKPIs,
  fetchSerieOTPorDia,
  fetchTablaDetalle,
  fetchTopProductos,
} from "../hooks/useInformes";
import type {
  KPIResponse,
  SerieOTPorDiaResponse,
  TablaOTResponse,
  TopProductosResponse,
} from "../types/informes";

/**
 * Page principal: orquesta filtros, carga de datos y rendering.
 * Ahora con layout responsive: contenedor fluido, grids adaptativas, y control de overflow.
 */

const Content: React.FC = () => {
  const { filtros, setFiltros, resetFiltros } = useInformesStore();

  const [kpis, setKpis] = React.useState<KPIResponse | undefined>();
  const [series, setSeries] = React.useState<SerieOTPorDiaResponse | undefined>();
  const [top, setTop] = React.useState<TopProductosResponse | undefined>();
  const [tabla, setTabla] = React.useState<TablaOTResponse | undefined>();

  const [loadingKPI, setLoadingKPI] = React.useState(false);
  const [loadingSeries, setLoadingSeries] = React.useState(false);
  const [loadingTop, setLoadingTop] = React.useState(false);
  const [loadingTabla, setLoadingTabla] = React.useState(false);

  const cargar = React.useCallback(async () => {
    setLoadingKPI(true);
    setLoadingSeries(true);
    setLoadingTop(true);
    setLoadingTabla(true);

    try {
      const [k, s, t, d] = await Promise.all([
        fetchKPIs(filtros),
        fetchSerieOTPorDia(filtros),
        fetchTopProductos(filtros, 5),
        fetchTablaDetalle(filtros),
      ]);
      setKpis(k);
      setSeries(s);
      setTop(t);
      setTabla(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingKPI(false);
      setLoadingSeries(false);
      setLoadingTop(false);
      setLoadingTabla(false);
    }
  }, [filtros]);

  React.useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setFiltros({ page: 1 });
    cargar();
  };

  const onClear = () => {
    resetFiltros();
    setTimeout(cargar, 0);
  };

  const onPageChange = (page: number) => {
    setFiltros({ page });
    setLoadingTabla(true);
    fetchTablaDetalle({ ...filtros, page })
      .then(setTabla)
      .catch(console.error)
      .finally(() => setLoadingTabla(false));
  };

  const handleKPIClick = (key: "creadas" | "cerradas" | "cumplimiento" | "merma") => {
    if (key === "creadas") {
      setFiltros({ estado: ["Creada"] });
    } else if (key === "cerradas") {
      setFiltros({ estado: ["Cerrada"] });
    }
    onApply();
  };

  return (
    <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Título */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">{COPY.titulo}</h1>
      </div>

      {/* Filtros */}
      <section className="min-w-0">
        <FiltrosInformes onApply={onApply} onClear={onClear} />
      </section>

      {/* KPIs */}
      <section className="min-w-0">
        <KPIGrid data={kpis} loading={loadingKPI} onCardClick={handleKPIClick} />
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 min-w-0">
        <div className="min-w-0">
          <ChartOTPorDia
            data={series}
            loading={loadingSeries}
            onBarClick={() => {
              /* drill-down opcional */
            }}
          />
        </div>
        <div className="min-w-0">
          <ChartTopProductos
            data={top}
            loading={loadingTop}
            onItemClick={() => {
              /* drill-down por SKU */
            }}
          />
        </div>
      </section>

      {/* Export */}
      <section className="min-w-0">
        <ExportMenu filtros={filtros} />
      </section>

      {/* Tabla detalle - con scroll horizontal seguro en móviles */}
      <section className="min-w-0">
        <div className="-mx-3 sm:mx-0">
          {/* El wrapper negativo evita que el borde se coma el padding en móviles */}
          <div className="overflow-x-auto px-3 sm:px-0">
            <TablaDetalle data={tabla} loading={loadingTabla} onPageChange={onPageChange} />
          </div>
        </div>
      </section>
    </div>
  );
};

const InformesPage: React.FC = () => {
  return (
    <InformesProvider>
      <Content />
    </InformesProvider>
  );
};

export default InformesPage;
