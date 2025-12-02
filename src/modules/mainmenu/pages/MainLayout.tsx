import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ContentContainer from "../components/ContentContainer";
import { useSidebar } from "../hooks/useSidebar";

export default function MainLayout() {
  const { isExpanded, toggle } = useSidebar(true);

  // Ancho expandido = 30vw (con tope), colapsado = 64px (siempre deja “asa”)
  const sidebarWidth = isExpanded ? "min(30vw, 420px)" : "64px";

  return (
    <div
      className="grid min-h-screen"
      style={{ gridTemplateColumns: `${sidebarWidth} 1fr` }}
    >
      <Sidebar expanded={isExpanded} onToggle={toggle} />

      <ContentContainer>
        <Outlet />
      </ContentContainer>
    </div>
  );
}
