# Plataforma Web – Frontend

Aplicación frontend en React + TypeScript para la gestión operativa y de información de la plataforma. Incluye autenticación, control de permisos por funcionalidad, panel principal con widgets, y módulos para producción, dashboards, IA/QA y configuración.

## Tecnologías principales
- **React 19 + TypeScript** sobre **Vite 7** (renderizado SPA, HMR, bundling rápido).
- **React Router 7** para el enrutamiento y protección de rutas.
- **Tailwind CSS 4** para estilos utilitarios y diseño responsivo.
- **React Hook Form** para formularios y validaciones.
- **PapaParse** para importación/lectura de CSV.
- **React Calendar** y **React Icons** para UI enriquecida.
- **ESLint + TypeScript ESLint** para calidad de código.

## Arquitectura y módulos
- `src/App.tsx`: define el router, rutas privadas (`PrivateRoute`) y guardas por permiso (`FeatureGuard` con `FeatureKey`).
- `modules/auth`: manejo de autenticación, contexto (`AuthProvider`), y página de login.
- `modules/mainmenu`: layout principal, barra lateral, encabezado y dashboard con widgets.
- `modules/produccion`: creación de OT, gestión, recetas, productos y procesos.
- `modules/dashboard`: tableros de producción, informes y analítica IA.
- `modules/iaqa`: gestión de QA asistida.
- `modules/configuracion`: administración de cuenta, usuarios, encargados y logs.
- `global/components`: componentes compartidos (p. ej. `FlashBannerProvider`).

## Requisitos previos
- Node.js 18+ (recomendado 20).
- npm (se usa `package-lock.json`).

## Instalación
```bash
npm install
```

## Scripts disponibles
- `npm run dev` — entorno de desarrollo con Vite y HMR.
- `npm run build` — compilación TypeScript (`tsc -b`) y build de producción con Vite.
- `npm run preview` — sirve el build generado.
- `npm run lint` — reglas de ESLint/TypeScript.

## Configuración de entorno
Crear un archivo `.env.local` o `.env.development` según el entorno. Variables usadas:
- `VITE_API_BASE_URL` — URL base del backend (sin credenciales).
- `VITE_BYPASS_AUTH` — si se establece a `1` en desarrollo, omite la autenticación para pruebas locales.

> No incluyas llaves, credenciales ni endpoints sensibles en el repositorio. Revisa `.gitignore` para evitar que `.env*` y archivos de claves se versionen.

## Ejecución local
```bash
npm run dev
```
Luego abre `http://localhost:5173` (o el puerto indicado por Vite).

## Build de producción
```bash
npm run build
npm run preview   # opcional para verificar el build
```
Los artefactos quedan en `dist/`.

## Flujo de autenticación y permisos
- `AuthProvider` expone `user`, `loadingUser` y helpers (`can`) vía contexto.
- `PrivateRoute` protege `/app/*`; redirige a `/login` si no hay sesión.
- `FeatureGuard` valida permisos finos por módulo antes de renderizar cada página.

## Estilos y UI
- Tailwind CSS se usa de forma utilitaria; los estilos globales están en `src/index.css`.
- Componentes clave: barra lateral, widgets de dashboard, calendarios, formularios y notificaciones (`FlashBannerProvider`).

## Estructura resumida
```
src/
  global/         # componentes y helpers compartidos
  modules/
    auth/         # login y contexto de autenticación
    mainmenu/     # layout, sidebar, dashboard
    produccion/   # OT, recetas, productos, procesos
    dashboard/    # tableros y reportes
    iaqa/         # gestión de QA asistida
    configuracion/# usuarios, encargados, logs, cuenta
  App.tsx         # rutas y guardas
  main.tsx        # bootstrap de React
```

## Buenas prácticas
- Mantener las variables de entorno fuera del control de versiones.
- Usar `FeatureGuard` al agregar nuevas rutas protegidas.
- Ejecutar `npm run lint` antes de subir cambios.
- Seguir los patrones de componentes existentes para consistencia de UI y accesibilidad.
