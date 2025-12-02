import type { JSX } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/auth/pages/LoginPage";
import MainLayout from "./modules/mainmenu/pages/MainLayout";
import Dashboard from "./modules/mainmenu/pages/Dashboard";
import CrearOT from "./modules/produccion/pages/CrearOT";
import Recetas from "./modules/produccion/pages/Recetas";
import Procesos from "./modules/produccion/pages/Procesos";
import GestionProduccion from "./modules/produccion/pages/GestionProduccion";
import Productos from "./modules/produccion/pages/Productos";
import Informes from "./modules/dashboard/pages/Informes";
import DashboardProduccion from "./modules/dashboard/pages/Produccion";
import DashboardIA from "./modules/dashboard/pages/IA";
import GestionQA from "./modules/iaqa/pages/GestionQA";
import ConfiguracionMiCuenta from "./modules/configuracion/pages/ConfiguracionMiCuenta";
import ConfiguracionUsuarios from "./modules/configuracion/pages/ConfiguracionUsuarios";
import ConfiguracionEncargados from "./modules/configuracion/pages/ConfiguracionEncargados";
import ConfiguracionLogs from "./modules/configuracion/pages/ConfiguracionLogs";
import {
  AuthProvider,
  useAuth,
  useAuthOptional,
} from "./modules/auth/hooks/useAuth";
import type { FeatureKey } from "./modules/auth/utils/permissions";
import { FlashBannerProvider } from "./global/components/FlashBanner";

const bypass =
  import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "1";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  if (bypass) return children;
  const ctx = useAuthOptional();
  if (!ctx) return <LoadingScreen />;
  const { user, loadingUser } = ctx;
  if (loadingUser) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FeatureGuard({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: JSX.Element;
}) {
  if (bypass) return children;
  const { loadingUser, user, can } = useAuth();
  if (loadingUser) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(feature, "view")) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <FlashBannerProvider>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />

            <Route path="produccion">
              <Route
                path="crear-ot"
                element={
                  <FeatureGuard feature="produccion.crearOt">
                    <CrearOT />
                  </FeatureGuard>
                }
              />
              <Route
                path="gestion"
                element={
                  <FeatureGuard feature="produccion.gestion">
                    <GestionProduccion />
                  </FeatureGuard>
                }
              />
              <Route
                path="recetas"
                element={
                  <FeatureGuard feature="produccion.recetas">
                    <Recetas />
                  </FeatureGuard>
                }
              />
              <Route
                path="productos"
                element={
                  <FeatureGuard feature="produccion.productos">
                    <Productos />
                  </FeatureGuard>
                }
              />
              <Route
                path="procesos"
                element={
                  <FeatureGuard feature="produccion.procesos">
                    <Procesos />
                  </FeatureGuard>
                }
              />
            </Route>

            <Route path="dashboard">
              <Route
                path="produccion"
                element={
                  <FeatureGuard feature="dashboard.produccion">
                    <DashboardProduccion />
                  </FeatureGuard>
                }
              />
              <Route
                path="informes"
                element={
                  <FeatureGuard feature="dashboard.informes">
                    <Informes />
                  </FeatureGuard>
                }
              />
              <Route
                path="ia"
                element={
                  <FeatureGuard feature="dashboard.ia">
                    <DashboardIA />
                  </FeatureGuard>
                }
              />
            </Route>

            <Route path="ia-qa">
              <Route
                path="gestion-qa"
                element={
                  <FeatureGuard feature="iaqa.gestionQa">
                    <GestionQA />
                  </FeatureGuard>
                }
              />
            </Route>

            <Route path="configuracion">
              <Route
                index
                element={
                  <FeatureGuard feature="configuracion.miCuenta">
                    <ConfiguracionMiCuenta />
                  </FeatureGuard>
                }
              />
              <Route
                path="encargados"
                element={
                  <FeatureGuard feature="configuracion.encargados">
                    <ConfiguracionEncargados />
                  </FeatureGuard>
                }
              />
              <Route
                path="usuarios"
                element={
                  <FeatureGuard feature="configuracion.usuarios">
                    <ConfiguracionUsuarios />
                  </FeatureGuard>
                }
              />
              <Route
                path="logs"
                element={
                  <FeatureGuard feature="configuracion.logs">
                    <ConfiguracionLogs />
                  </FeatureGuard>
                }
              />
            </Route>
          </Route>

          <Route
            path="*"
            element={<Navigate to={bypass ? "/app" : "/login"} replace />}
          />
          </Routes>
        </AuthProvider>
      </FlashBannerProvider>
    </BrowserRouter>
  );
}
