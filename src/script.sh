#!/usr/bin/env bash
set -euo pipefail

# Debes correrlo desde:
# ~/Plataforma_Web/Front/Plataforma-SC/src

echo "📂 Creando estructura del módulo Informes..."

# Crear carpetas
mkdir -p modules/informes/{pages,components,hooks,store,types,utils,copy}

# Crear archivos vacíos
touch modules/informes/pages/InformesPage.tsx

touch modules/informes/components/FiltrosInformes.tsx
touch modules/informes/components/KPIGrid.tsx
touch modules/informes/components/KPICard.tsx
touch modules/informes/components/ChartOTPorDia.tsx
touch modules/informes/components/ChartTopProductos.tsx
touch modules/informes/components/TablaDetalle.tsx
touch modules/informes/components/ExportMenu.tsx

touch modules/informes/hooks/useInformes.ts
touch modules/informes/store/useInformesStore.ts
touch modules/informes/types/informes.d.ts
touch modules/informes/utils/formatters.ts
touch modules/informes/copy/es.ts

echo "✅ Estructura de Informes creada con éxito."
