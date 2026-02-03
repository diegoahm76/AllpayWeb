# Configuración de ZonaPagos para FedecacaoBack

## Variables de Entorno

Agrega las siguientes variables en tu archivo `.env`:

```bash
# ZonaPagos
ZPAGOS_API_BASE=https://www.zonapagos.com/Apis_CicloPago/api
ZPAGOS_ID_COMERCIO=0000
ZPAGOS_USUARIO=usuario_demo
ZPAGOS_CLAVE=clave_demo
ZPAGOS_CALLBACK_BASE=https://tu-dominio.com
ZPAGOS_IPS_PERMITIDAS=52.87.120.0/24,54.173.0.0/16
```

## Endpoints Disponibles

### 1. Iniciar Pago
- **URL**: `POST /pagos/zonapagos/iniciar/`
- **Autenticación**: Requerida
- **Body**:
```json
{
    "id_liquidacion": 123,
    "id_persona_pago": 456
}
```

### 2. Verificar Pago
- **URL**: `POST /pagos/zonapagos/verificar/`
- **Autenticación**: Requerida
- **Body**:
```json
{
    "id_pago": "789"
}
```

### 3. Notificación (Callback)
- **URL**: `GET /pagos/zonapagos/notificar/?id_comercio=123&id_pago=789`
- **Autenticación**: No requerida (filtrado por IP)

## Comando de Sonda

Para verificar pagos pendientes automáticamente:

```bash
python manage.py sonda_zonapagos
```

### Configurar Crontab (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada 10 minutos
*/10 * * * * /path/venv/bin/python /path/app/manage.py sonda_zonapagos >> /var/log/sonda_zp.log 2>&1
```

### Configurar Task Scheduler (Windows)

Crear una tarea programada que ejecute:
```
python manage.py sonda_zonapagos
```

## Flujo de Integración

1. **Inicio de Pago**: El usuario solicita iniciar un pago
2. **Redirección**: Se redirige al usuario a ZonaPagos
3. **Procesamiento**: El usuario completa el pago en ZonaPagos
4. **Callback**: ZonaPagos notifica el resultado
5. **Verificación**: El sistema verifica el estado del pago
6. **Finalización**: Se actualizan los estados de liquidación y facturas

## Estados de Pago

- **PE**: Pendiente
- **AP**: Aprobado
- **FA**: Fallido
- **CA**: Cancelado

## Notas Importantes

- La integración funciona en paralelo con el webhook existente
- Los pagos se identifican con `gateway="ZONAPAGOS"`
- La función `_finalizar_documentos` debe ser personalizada según tu lógica de negocio
- Asegúrate de configurar las IPs permitidas para el callback 