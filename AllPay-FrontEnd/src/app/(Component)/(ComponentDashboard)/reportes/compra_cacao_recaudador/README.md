# Módulo de Reporte de Libro de Compras - Recaudador

Este módulo maneja la funcionalidad de reportes de libro de compras para recaudadores, incluyendo la consulta de datos y la generación de documentos PDF.

## Estructura del Módulo

```
compra_cacao_recaudador/
├── models/
│   ├── reporteLibroCompras.model.ts          # Modelos para consulta de reportes
│   └── documentoReporteLibroCompras.model.ts # Modelos para generación de documentos
├── adapters/
│   ├── reporteLibroCompras.adapter.ts          # Adapter para consulta de reportes
│   └── documentoReporteLibroCompras.adapter.ts # Adapter para generación de documentos
├── hooks/
│   ├── useReporteLibroCompras.ts               # Hook para consulta de reportes
│   └── useDocumentoReporteLibroCompras.ts      # Hook para generación de documentos
├── components/
│   └── VerReporteCCRecaudador.tsx              # Componente principal                             
└── README.md                                   # Esta documentación
```

## Endpoints

### 1. Consulta de Reporte de Libro de Compras
- **URL**: `GET /apii/reportes/reporte-libro-compras/`
- **Descripción**: Obtiene los datos del reporte de libro de compras con paginación y filtros

### 2. Generación de Documento PDF
- **URL**: `GET /apii/reportes/documento-reporte-libro-compras/`
- **Descripción**: Genera un documento PDF del reporte de libro de compras

## Modelos

### ReporteLibroCompras
```typescript
interface FacturaLibroCompra {
    id_persona_recaudador: number;
    nro_factura_unica: number;
    fecha_compra: string;
    tipo_documento_proveedor: string;
    nro_documento_proveedor: string;
    nombre_proveedor: string;
    municipio_cacao_nombre: string;
    departamento_cacao_nombre: string;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    valores_kilo: number[];
}
```

### DocumentoReporteLibroCompras
```typescript
interface DocumentoReporteLibroComprasData {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}
```

## Hooks

### useReporteLibroCompras
Hook para manejar la consulta de reportes de libro de compras.

**Funciones disponibles:**
- `fetchReporte(token, params)`: Obtiene los datos del reporte
- `handlePageChange(page, token)`: Maneja el cambio de página
- `clearReporte()`: Limpia los datos del reporte
- `resetSearchParams()`: Resetea los parámetros de búsqueda

### useDocumentoReporteLibroCompras
Hook para manejar la generación de documentos PDF.

**Funciones disponibles:**
- `generarDocumento(token, params)`: Genera el documento PDF
- `clearDocumento()`: Limpia el documento generado
- `clearError()`: Limpia los errores
- `clearSuccess()`: Limpia los mensajes de éxito

## Uso en Componentes

### Importación
```typescript
import { 
    useReporteLibroCompras, 
    useDocumentoReporteLibroCompras 
} from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador';
```

### Ejemplo de uso del hook de reporte
```typescript
const {
    facturas,
    valorCuotaFomentoTotal,
    isLoading,
    error,
    currentPage,
    totalPages,
    fetchReporte,
    handlePageChange
} = useReporteLibroCompras();

// Obtener reporte
await fetchReporte(token, {
    page: 1,
    page_size: 10,
    id_recaudador: 123,
    fecha_inicio: '2024-01-01',
    fecha_final: '2024-12-31'
});
```

### Ejemplo de uso del hook de documento
```typescript
const {
    documentoGenerado,
    isLoading,
    error,
    success,
    successMessage,
    generarDocumento,
    clearDocumento
} = useDocumentoReporteLibroCompras();

// Generar documento
await generarDocumento(token, {
    id_recaudador: 123,
    fecha_inicio: '2024-01-01',
    fecha_final: '2024-12-31'
});

// Descargar documento
if (documentoGenerado?.archivo) {
    window.open(documentoGenerado.archivo, '_blank');
}
```

## Parámetros

### Parámetros de Consulta (ReporteLibroComprasParams)
- `page` (obligatorio): Número de página
- `page_size` (opcional): Tamaño de página
- `id_recaudador` (opcional): ID del recaudador
- `fecha_inicio` (opcional): Fecha de inicio (YYYY-MM-DD)
- `fecha_final` (opcional): Fecha final (YYYY-MM-DD)

### Parámetros de Documento (DocumentoReporteLibroComprasParams)
- `id_recaudador` (opcional): ID del recaudador
- `fecha_inicio` (opcional): Fecha de inicio (YYYY-MM-DD)
- `fecha_final` (opcional): Fecha final (YYYY-MM-DD)
- `page_size` (opcional): Tamaño de página para el documento

## Manejo de Errores

Todos los hooks incluyen manejo de errores robusto:
- Captura de errores de red
- Mensajes de error descriptivos
- Estados de loading para mejor UX
- Logging de errores para debugging

## Autenticación

Todos los endpoints requieren autenticación mediante token Bearer en el header `Authorization`. 