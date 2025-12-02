import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function Calendario() {
  const [value, setValue] = useState<Date>(new Date());

  return (
    // Centrado horizontal del calendario dentro del card
    <div className="flex justify-center">
      {/* inline-block hace que el contenedor se ajuste al ancho del calendario */}
      <div className="inline-block rounded-xl border border-border p-3">
        <Calendar
          value={value}
          onChange={(v) => setValue(v as Date)}
          locale="es-CL"
          calendarType="iso8601"
          prev2Label={null}
          next2Label={null}
        />
      </div>
    </div>
  );
}
