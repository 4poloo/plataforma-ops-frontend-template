// src/modules/mainmenu/pages/Dashboard.tsx
import { FiCloud, FiTrendingUp, FiClock, FiCalendar } from "react-icons/fi";
import WidgetCard from "../../../global/components/WidgetCard";
import Clima from "./Clima";
import Bolsa from "./Bolsa";
import Reloj from "./Reloj";
import Calendario from "./Calendario";

export default function Dashboard() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold text-foreground text-center">
        Widgets de interés de Empresa
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <WidgetCard title="Clima" icon={FiCloud}>
          <Clima />
        </WidgetCard>

        <WidgetCard title="Bolsa Chilena" icon={FiTrendingUp}>
          <Bolsa />
        </WidgetCard>

        <WidgetCard title="Reloj" icon={FiClock}>
          <Reloj />
        </WidgetCard>

        <WidgetCard title="Calendario" icon={FiCalendar}>
          <Calendario />
        </WidgetCard>
      </div>
    </>
  );
}
