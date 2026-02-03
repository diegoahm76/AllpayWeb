# Módulo de Reporte Acuerdos de Pago por Fecha

Este módulo maneja la obtención y gestión del reporte de acuerdos de pago por fecha, incluyendo las sumatorias del reporte consolidado.

## Estructura del Módulo

```
acuerdos_pago_fecha/
├── models/
│   ├── reporteAcuerdosPago.model.ts      # Interfaces y tipos TypeScript para reportes
│   └── sumatoriasAcuerdosPago.model.ts   # Interfaces y tipos TypeScript para sumatorias
├── adapters/
│   ├── reporteAcuerdosPago.adapter.ts    # Lógica de comunicación con la API para reportes
│   └── sumatoriasAcuerdosPago.adapter.ts # Lógica de comunicación con la API para sumatorias
├── hooks/
│   ├── useReporteAcuerdosPago.ts         # Hook personalizado para React para reportes
│   └── useSumatoriasAcuerdosPago.ts      # Hook personalizado para React para sumatorias
├── index.ts                              # Archivo de exportaciones
└── README.md                             # Documentación
```

## Endpoints

### Reporte de Acuerdos de Pago
- **URL**: `{{BASE_API_URL}}/reportes/reporte-acuerdos-pago/`
- **Método**: GET
- **Autenticación**: Bearer Token

### Sumatorias del Reporte Consolidado
- **URL**: `{{BASE_API_URL}}/reportes/sumatorias-reporte-consolidado-acuerdos-pago/`
- **Método**: GET
- **Autenticación**: Bearer Token

## Parámetros

### Reporte de Acuerdos de Pago

#### Obligatorios
- `page`: Número de página (número)
- `page_size`: Tamaño de página (número)

#### Opcionales
- `fecha_inicio`: Fecha de inicio (string, formato YYYY-MM-DD)
- `fecha_final`: Fecha final (string, formato YYYY-MM-DD)

### Sumatorias del Reporte Consolidado

#### Opcionales
- `fecha_inicio`: Fecha de inicio (string, formato YYYY-MM-DD)
- `fecha_final`: Fecha final (string, formato YYYY-MM-DD)

## Respuestas de la API

### Reporte de Acuerdos de Pago

```json
{
    "success": true,
    "count": 9,
    "total_pages": 1,
    "current_page": 1,
    "next": null,
    "previous": null,
    "data": [
        {
            "numero_solicitud": 123,
            "fecha_solicitud": "2025-06-12T13:24:57.887250Z",
            "estado": "APROBADO",
            "estado_display": "Aprobado",
            "id_recaudador": 1,
            "tipo_documento_recaudador": "Cédula de Ciudadanía",
            "nombre_recaudador": "Juan Pérez",
            "numero_plan_pago": 1,
            "numero_cuotas": 3,
            "facturas_asociadas": "FAC001,FAC002",
            "total_pagar_cuotas_fomento": 15251619.0,
            "total_pagar_intereses": 78723.43
        }
    ]
}
```

### Sumatorias del Reporte Consolidado

```json
{
    "success": true,
    "detail": "Sumatorias calculadas correctamente",
    "sumatorias": {
        "total_cuotas_fomento": 589044002.9200001,
        "total_intereses": 795395.85
    }
}
```

## Modelos

### Reporte de Acuerdos de Pago

#### AcuerdoPago
- `numero_solicitud`: Número de solicitud del acuerdo
- `fecha_solicitud`: Fecha de solicitud del acuerdo
- `estado`: Estado del acuerdo (código)
- `estado_display`: Estado del acuerdo (texto descriptivo)
- `id_recaudador`: ID del recaudador
- `tipo_documento_recaudador`: Tipo de documento del recaudador
- `nombre_recaudador`: Nombre del recaudador
- `numero_plan_pago`: Número del plan de pago
- `numero_cuotas`: Número de cuotas
- `facturas_asociadas`: Facturas asociadas al acuerdo
- `total_pagar_cuotas_fomento`: Total a pagar en cuotas de fomento
- `total_pagar_intereses`: Total a pagar en intereses

### Sumatorias del Reporte Consolidado

#### SumatoriasAcuerdosPago
- `total_cuotas_fomento`: Total de cuotas de fomento de todos los acuerdos
- `total_intereses`: Total de intereses de todos los acuerdos

## Adapters

### getReporteAcuerdosPago

```typescript
const response = await getReporteAcuerdosPago(token, {
    page: 1,
    page_size: 10,
    fecha_inicio: '2025-06-01',
    fecha_final: '2025-06-30'
});
```

### getSumatoriasAcuerdosPago

```typescript
const response = await getSumatoriasAcuerdosPago(token, {
    fecha_inicio: '2025-06-01',  // opcional
    fecha_final: '2025-06-30'    // opcional
});
```

## Hooks

### useReporteAcuerdosPago

#### Estados
- `reporteData`: Datos del reporte con acuerdos de pago
- `isLoading`: Estado de carga
- `error`: Mensaje de error
- `params`: Parámetros de consulta actuales
- `showAlertNotification`: Mostrar alerta de éxito
- `alertMessage`: Mensaje de la alerta de éxito
- `showErrorAlert`: Mostrar alerta de error
- `errorAlertMessage`: Mensaje de la alerta de error

#### Funciones
- `fetchReporte(params)`: Obtiene el reporte con parámetros opcionales
- `handlePageChange(page)`: Cambia de página
- `updateParams(params)`: Actualiza parámetros de consulta
- `clearFilters()`: Limpia filtros y resetea a valores iniciales
- `clearReporte()`: Limpia los datos del reporte
- `resetSearchParams()`: Resetea parámetros de búsqueda
- `clearAlerts()`: Limpia las alertas
- `showSuccessAlert(message)`: Muestra alerta de éxito
- `showErrorAlertMessage(message)`: Muestra alerta de error

### useSumatoriasAcuerdosPago

#### Estados
- `sumatoriasData`: Datos de las sumatorias calculadas
- `isLoading`: Estado de carga
- `error`: Mensaje de error
- `showAlertNotification`: Mostrar alerta de éxito
- `alertMessage`: Mensaje de la alerta de éxito
- `showErrorAlert`: Mostrar alerta de error
- `errorAlertMessage`: Mensaje de la alerta de error

#### Funciones
- `fetchSumatorias(params)`: Obtiene las sumatorias con parámetros opcionales
- `clearSumatorias()`: Limpia los datos de las sumatorias
- `clearAlerts()`: Limpia las alertas
- `showSuccessAlert(message)`: Muestra alerta de éxito
- `showErrorAlertMessage(message)`: Muestra alerta de error

## Ejemplos de Uso

### Reporte de Acuerdos de Pago

```typescript
import { useReporteAcuerdosPago } from '@/app/(Component)/(ComponentDashboard)/reportes/acuerdos_pago_fecha';

const MiComponente = () => {
    const {
        reporteData,
        isLoading,
        fetchReporte,
        handlePageChange,
        showAlertNotification,
        alertMessage,
        clearAlerts
    } = useReporteAcuerdosPago(token);

    const handleConsultar = () => {
        fetchReporte({
            page: 1,
            page_size: 10,
            fecha_inicio: '2025-06-01',
            fecha_final: '2025-06-30'
        });
    };

    return (
        <div>
            {isLoading && <p>Cargando reporte...</p>}
            
            <DynamicTable
                columns={columns}
                data={reporteData.acuerdos}
                isLoading={isLoading}
                currentPage={reporteData.current_page}
                totalPages={reporteData.total_pages}
                onPageChange={handlePageChange}
            />

            {showAlertNotification && (
                <div className="alert success">
                    {alertMessage}
                    <button onClick={clearAlerts}>Cerrar</button>
                </div>
            )}
        </div>
    );
};
```

### Sumatorias del Reporte Consolidado

```typescript
import { useSumatoriasAcuerdosPago } from '@/app/(Component)/(ComponentDashboard)/reportes/acuerdos_pago_fecha';

const MiComponenteSumatorias = () => {
    const {
        sumatoriasData,
        isLoading,
        fetchSumatorias,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        clearAlerts
    } = useSumatoriasAcuerdosPago(token);

    const handleObtenerSumatorias = () => {
        fetchSumatorias({
            fecha_inicio: '2025-06-01',  // opcional
            fecha_final: '2025-06-30'    // opcional
        });
    };

    return (
        <div>
            <button onClick={handleObtenerSumatorias} disabled={isLoading}>
                {isLoading ? 'Calculando...' : 'Obtener Sumatorias'}
            </button>

            {sumatoriasData.success && (
                <div>
                    <h3>Sumatorias del Reporte Consolidado:</h3>
                    <p>Total Cuotas Fomento: ${sumatoriasData.sumatorias.total_cuotas_fomento.toLocaleString()}</p>
                    <p>Total Intereses: ${sumatoriasData.sumatorias.total_intereses.toLocaleString()}</p>
                </div>
            )}

            {showAlertNotification && (
                <div className="alert success">
                    {alertMessage}
                    <button onClick={clearAlerts}>Cerrar</button>
                </div>
            )}

            {showErrorAlert && (
                <div className="alert error">
                    {errorAlertMessage}
                    <button onClick={clearAlerts}>Cerrar</button>
                </div>
            )}
        </div>
    );
};
```

## Manejo de Errores

El módulo maneja automáticamente los siguientes errores HTTP:

- **401**: No autorizado
- **403**: Sin permisos
- **404**: Recurso no encontrado
- **500+**: Error del servidor

## Características

### Reporte de Acuerdos de Pago
✅ **Endpoint correcto**: `{{BASE_API_URL}}/reportes/reporte-acuerdos-pago/`  
✅ **Método GET** con axios  
✅ **Autenticación** con Bearer Token  
✅ **Manejo de errores** HTTP específicos  
✅ **Alertas** para éxito y error  
✅ **Formato de datos** según la respuesta de la API  
✅ **Paginación** automática  
✅ **Filtros opcionales** para fechas  
✅ **Logs detallados** para debugging  
✅ **Estados de carga** para mejor UX

### Sumatorias del Reporte Consolidado
✅ **Endpoint correcto**: `{{BASE_API_URL}}/reportes/sumatorias-reporte-consolidado-acuerdos-pago/`  
✅ **Método GET** con axios  
✅ **Autenticación** con Bearer Token  
✅ **Filtros opcionales** para fechas  
✅ **Manejo de errores** HTTP específicos  
✅ **Alertas** para éxito y error  
✅ **Cálculos automáticos** de totales  
✅ **Logs detallados** para debugging  
✅ **Estados de carga** para mejor UX 