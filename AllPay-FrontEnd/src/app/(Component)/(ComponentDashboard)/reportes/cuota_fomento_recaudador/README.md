# Reporte Consolidado de Pago de Cuota de Fomento

Este módulo implementa la funcionalidad para consultar y mostrar el reporte consolidado de pago de cuota de fomento, incluyendo la generación de documentos PDF.

## Estructura del Módulo

```
cuota_fomento_recaudador/
├── models/
│   ├── reporteConsolidadoPagoCuotaFomento.model.ts
│   └── documentoReporteConsolidadoPagoCuotaFomento.model.ts
├── adapters/
│   ├── reporteConsolidadoPagoCuotaFomento.adapter.ts
│   └── documentoReporteConsolidadoPagoCuotaFomento.adapter.ts
├── hooks/
│   ├── useReporteConsolidadoPagoCuotaFomento.ts
│   └── useDocumentoReporteConsolidadoPagoCuotaFomento.ts
├── components/
│   └── VerReporteCFRecaudador.tsx
├── page.tsx
└── README.md
```

## Componentes

### VerReporteLibroCompra

Componente principal que muestra el formulario de consulta y la tabla de resultados del reporte consolidado de pago de cuota de fomento.

**Características:**
- Formulario con filtros opcionales organizados por secciones
- Tabla dinámica con paginación
- Alertas de éxito y error
- Resumen del valor total de cuota de fomento
- Botón para descargar reporte (funcionalidad pendiente)
- Información de usuario interno
- Filtros organizados por categorías:
  - Consulta por recaudador
  - Consulta por municipio y/o departamento
  - Consulta por fecha de pago
  - Consulta por proveedor

**Filtros disponibles:**
- Fecha Inicio
- Fecha Final
- ID Departamento Cacao
- ID Municipio Cacao
- Recaudador
- Número Documento Recaudador
- Número Documento Proveedor
- Nombres Proveedor

## Hooks

### useReporteConsolidadoPagoCuotaFomento

Hook personalizado que maneja toda la lógica del reporte.

**Estados retornados:**
- `reporteData`: Datos del reporte
- `isLoading`: Estado de carga
- `error`: Mensaje de error
- `params`: Parámetros de consulta actuales
- `showAlertNotification`: Mostrar alerta de éxito
- `alertMessage`: Mensaje de alerta de éxito
- `showErrorAlert`: Mostrar alerta de error
- `errorAlertMessage`: Mensaje de alerta de error

**Funciones retornadas:**
- `fetchReporte`: Obtener datos del reporte
- `updateParams`: Actualizar parámetros de consulta
- `clearFilters`: Limpiar filtros
- `handlePageChange`: Cambiar página
- `handlePageSizeChange`: Cambiar tamaño de página
- `applyFilters`: Aplicar filtros
- `refreshData`: Refrescar datos
- `clearAlerts`: Limpiar alertas
- `showSuccessAlert`: Mostrar alerta de éxito
- `showErrorAlertMessage`: Mostrar alerta de error

### useDocumentoReporteConsolidadoPagoCuotaFomento

Hook personalizado que maneja la generación de documentos PDF.

**Estados retornados:**
- `documentoGenerado`: Datos del documento generado
- `isLoading`: Estado de carga
- `error`: Mensaje de error
- `success`: Estado de éxito
- `successMessage`: Mensaje de éxito

**Funciones retornadas:**
- `generarDocumento`: Generar documento PDF
- `clearDocumento`: Limpiar documento generado
- `clearError`: Limpiar errores
- `clearSuccess`: Limpiar mensajes de éxito

## Adapters

### getReporteConsolidadoPagoCuotaFomento

Función que realiza la petición HTTP al endpoint de la API para consultar datos.

**Parámetros:**
- `token`: Token de autenticación JWT
- `params`: Parámetros de consulta (paginación y filtros)

**Endpoint:** `{{BASE_API_URL}}/reportes/reporte-consolidado-pago-cuota-fomento/`

**Método:** GET

### generarDocumentoReporteConsolidadoPagoCuotaFomento

Función que realiza la petición HTTP al endpoint de la API para generar documentos PDF.

**Parámetros:**
- `token`: Token de autenticación JWT
- `params`: Parámetros opcionales para filtrar el documento

**Endpoint:** `{{BASE_API_URL}}/reportes/documento-reporte-consolidado-pago-cuota-fomento/`

**Método:** GET

**Respuesta:**
```json
{
    "success": true,
    "detail": "Reporte generado correctamente.",
    "data": {
        "id_documento_generado": 7178,
        "documento_generado": "documentos_pdf/c73e90ac-0830-40fc-b3d3-cc2788b3db6b.pdf",
        "archivo": "https://aws-fedecacao-2025.s3.amazonaws.com/..."
    }
}
```

## Modelos

### Interfaces principales:

**Para consulta de datos:**
- `FacturaReporte`: Estructura de una factura individual
- `ReporteData`: Datos del reporte (facturas + valor total)
- `ReporteConsolidadoPagoCuotaFomentoResponse`: Respuesta completa de la API
- `ReporteConsolidadoPagoCuotaFomentoParams`: Parámetros de consulta
- `ReporteConsolidadoPagoCuotaFomentoMapped`: Datos mapeados para el hook

**Para generación de documentos:**
- `DocumentoGenerado`: Estructura del documento generado
- `DocumentoReporteConsolidadoPagoCuotaFomentoData`: Datos del documento
- `DocumentoReporteConsolidadoPagoCuotaFomentoResponse`: Respuesta de la API
- `DocumentoReporteConsolidadoPagoCuotaFomentoParams`: Parámetros opcionales para el documento

## Uso

```tsx
import { useReporteConsolidadoPagoCuotaFomento } from './hooks/useReporteConsolidadoPagoCuotaFomento';

const MyComponent = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;
  
  const {
    reporteData,
    isLoading,
    fetchReporte,
    clearFilters
  } = useReporteConsolidadoPagoCuotaFomento(token || '');

  // Usar las funciones y estados del hook
};
```

## Parámetros Obligatorios

- `page`: Número de página (default: 1)
- `page_size`: Tamaño de página (default: 10)

## Parámetros Opcionales

- `id_departamento_cacao`: ID del departamento
- `id_municipio_cacao`: ID del municipio
- `recaudador`: Nombre del recaudador
- `numero_documento_recaudador`: Número de documento del recaudador
- `fecha_inicio`: Fecha de inicio (formato: YYYY-MM-DD)
- `fecha_final`: Fecha final (formato: YYYY-MM-DD)
- `numero_documento_proveedor`: Número de documento del proveedor
- `nombres_proveedor`: Nombres del proveedor

## Respuesta de la API

La API devuelve una respuesta con la siguiente estructura:

```json
{
  "success": true,
  "count": 3,
  "total_pages": 1,
  "current_page": 1,
  "next": null,
  "previous": null,
  "data": {
    "facturas": [...],
    "valor_cuota_fomento_total": 1529227233.0
  }
}
```

## Características Especiales

### Información de Usuario Interno
El componente incluye el componente `InternalUserInfo` que muestra información específica para usuarios internos del sistema.

### Organización de Filtros
Los filtros están organizados en secciones lógicas para una mejor experiencia de usuario:
- **Consulta por recaudador**: Información del usuario interno
- **Consulta por municipio y/o departamento**: Filtros geográficos
- **Consulta por fecha de pago**: Filtros temporales
- **Consulta por proveedor**: Filtros de proveedores y recaudadores

### Formato de Datos
- Fechas formateadas en formato colombiano
- Valores monetarios formateados en pesos colombianos
- Arrays de valores unidos con comas para mejor visualización 