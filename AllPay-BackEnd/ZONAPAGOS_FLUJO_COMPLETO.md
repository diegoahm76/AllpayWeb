# 🚀 Flujo Completo ZonaPagos - SOAP

## ✅ Estado Actual: SOAP Funcionando

**Último test exitoso:**
- Identificador: `42751988`
- Redirect URL: `https://www.zonapagos.com/t_Fncacaoteros/pago.asp?estado_pago=iniciar_pago&identificador=42751988`

---

## 📋 Flujo Completo (Paso a Paso)

### 1️⃣ **Inicio de Pago** (Ya implementado ✅)

**Endpoint:** `POST /apii/recaudos/pagos/zonapagos/iniciar/`

**Request:**
```json
{
    "id_liquidacion": 256,
    "id_persona_pago": 123
}
```

**Response exitosa:**
```json
{
    "success": true,
    "redirect_url": "https://www.zonapagos.com/t_Fncacaoteros/pago.asp?estado_pago=iniciar_pago&identificador=42751988",
    "identificador": "42751988",
    "id_pago": 358
}
```

**En Frontend:**
```javascript
const response = await fetch('/apii/recaudos/pagos/zonapagos/iniciar/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        id_liquidacion: 256,
        id_persona_pago: 123
    })
});

const data = await response.json();
if (data.success) {
    // Redirigir al pagador a ZonaPagos
    window.location.href = data.redirect_url;
}
```

---

### 2️⃣ **Pago en ZonaPagos** (Usuario)

El usuario será redirigido a ZonaPagos donde:

**En Homologación (Banco de Pruebas):**
- Banco: **"BANCO UNIÓN COLOMBIANO"**
- Email: `soporte9@zonavirtual.com`
- **Botón "Pay"** → Aprobado ✅
- **Botón "Debug"** → Estados de prueba:
  - `NOT_AUTHORIZED` → Rechazado
  - `PENDING` → Pendiente

**Estados de Pago PSE:**
- `1` → Aprobado
- `1000` → Rechazado
- `888`, `999`, `4001` → Pendientes
- `4000`, `4003` → Rechazado TC

---

### 3️⃣ **Notificación GET de ZonaPagos** (Ya implementado ✅)

**Endpoint:** `GET /apii/recaudos/pagos/zonapagos/notificar/?id_pago=358&idcomercio=35069`

ZonaPagos llamará automáticamente a este endpoint cuando el pago cambie de estado.

**Lo que hace internamente:**
1. Llama a `verificacion_pago_soap()`
2. Actualiza `Pagos.estado_pago`
3. Marca `notificacion=True`
4. Si es exitoso (`int_estado_pago = "1"`), ejecuta `UtilsRecaudo.pago_exitoso()`

---

### 4️⃣ **Verificación Manual** (Opcional)

**Endpoint:** `GET /apii/recaudos/pagos/zonapagos/verificar/?id_pago=358&idcomercio=35069`

**Response:**
```json
{
    "success": true,
    "message": "Verificación de pago exitosa",
    "data": {
        "cantidad_pagos": "1",
        "res_pago": [
            {
                "int_n_pago": "42751988",
                "int_estado_pago": "1",
                "dbl_valor_pagado": "10505011.50",
                "str_descripcion": "Pago liquidacion",
                "str_id_cliente": "900794694",
                "str_nombre": "ISAMC SAS",
                "dat_fecha": "2025-10-17 12:30:45",
                "int_id_forma_pago": "29",
                ...
            }
        ]
    }
}
```

---

## 🔧 Variables de Entorno Necesarias

Verifica que tu `.env` tenga:

```bash
# ZonaPagos SOAP
ZPAGOS_ID_COMERCIO=35069
ZPAGOS_USUARIO=Cacaoteros
ZPAGOS_CLAVE=Cacaoteros*
ZPAGOS_CODIGO_SERVICIO=2701
ZPAGOS_T_RUTA=t_Fncacaoteros
ZPAGOS_NIT=8999991751

# Callback (URL pública para que ZonaPagos te notifique)
ZPAGOS_CALLBACK_BASE=https://tu-dominio-publico.com

# IPs permitidas de ZonaPagos
ZPAGOS_IPS_PERMITIDAS=52.87.120.0/24,54.173.0.0/16
```

---

## 🐛 Problemas Comunes y Soluciones

### ❌ `inicio_pagoV2Result` retorna `-1 ...`

**Causa:** Error funcional de ZonaPagos

**Solución:**
- Verifica que todos los campos obligatorios estén presentes
- Revisa `tipo_id` (debe ser código numérico: "1"=CC, "3"=NIT)
- Confirma que `codigo_servicio_principal` sea correcto ("2701")
- Verifica que `id_pago` sea solo dígitos

### ❌ `verificar_pago_v4` retorna `int_error != "0"`

**Causa:** Credenciales o parámetros incorrectos

**Solución:**
- Verifica `int_id_comercio`, `str_usr_comercio`, `str_pwd_Comercio`
- Confirma que `str_id_pago` sea el ID interno correcto
- Revisa que el pago exista en ZonaPagos

### ⚠️ Pagos "colgados" en estado pendiente

**Causa:** Sonda no ejecutándose o estados pendientes sin resolver

**Solución:**
- Configura un job recurrente (cada 10-15 min) con `python manage.py sonda_zonapagos`
- Para PSE pendiente (999), muestra mensaje al usuario y reintenta

---

## 📊 Mapeo de Estados de Pago

| Código | Estado | Acción |
|--------|--------|--------|
| `1` | Aprobado ✅ | Ejecutar `pago_exitoso()` |
| `1000` | Rechazado ❌ | Notificar al usuario |
| `888` | Pendiente ⏳ | Reintenta verificación |
| `999` | Pendiente PSE ⏳ | Mensaje obligatorio + reintentar |
| `4000` | Rechazado TC ❌ | Notificar al usuario |
| `4001` | Pendiente TC ⏳ | Reintenta verificación |
| `4003` | Rechazado TC ❌ | Notificar al usuario |

---

## 🧪 Prueba de Punta a Punta (3 pasos)

### Paso 1: Iniciar Pago
```bash
curl -X POST "http://127.0.0.1:8000/apii/recaudos/pagos/zonapagos/iniciar/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "id_liquidacion": 256,
    "id_persona_pago": 123
  }'
```

**Esperado:** `201` con `redirect_url` e `identificador`

### Paso 2: Simular Pago en Banco de Pruebas
1. Copia la `redirect_url` del paso 1
2. Ábrela en el navegador
3. Selecciona "BANCO UNIÓN COLOMBIANO"
4. Email: `soporte9@zonavirtual.com`
5. Click en **"Pay"** (aprobado) o **"Debug"** (rechazado/pendiente)

### Paso 3: Verificar Estado
```bash
curl "http://127.0.0.1:8000/apii/recaudos/pagos/zonapagos/verificar/?id_pago=358&idcomercio=35069" \
  -H "Authorization: Bearer TU_TOKEN"
```

**Esperado:** `res_pago[0].int_estado_pago` debe ser `"1"` si aprobaste

---

## 📝 Logs a Monitorear

Durante las pruebas, busca en la consola:

```
🔍 DEBUG TIPO DOCUMENTO Y ID PAGO:
  tipo_id_codigo CALCULADO: '3'  ← Debe ser correcto
  id_pago_numerico (int): 2025001363  ← Solo dígitos

🚀 ENVIANDO PETICIÓN SOAP
  <id_tienda>35069</id_tienda>
  <tipo_id>3</tipo_id>  ← "3" para NIT, "1" para CC
  <codigo_servicio_principal>2701</codigo_servicio_principal>

📥 RESPUESTA SOAP
  <inicio_pagoV2Result>42751988</inicio_pagoV2Result>  ← Identificador (éxito)
  <inicio_pagoV2Result>-1 Error...</inicio_pagoV2Result>  ← Error

✅ SOAP InicioPago exitoso!
  Identificador: 42751988
  Redirect URL: https://www.zonapagos.com/t_Fncacaoteros/pago.asp?...
```

---

## 🎯 Checklist Final

Antes de pasar a producción:

- [ ] Callback URL configurada en ZonaPagos apuntando a `/notificar/`
- [ ] Variables de entorno en producción configuradas
- [ ] Tipo de documento mapeado correctamente (J→NIT=3, N→CC=1)
- [ ] Sonda configurada (`python manage.py sonda_zonapagos` cada 10-15 min)
- [ ] IPs de ZonaPagos en whitelist si tienes firewall
- [ ] Logs de producción monitoreados para errores SOAP
- [ ] Flujo probado de punta a punta en homologación
- [ ] Certificación PSE completada (si aplica)

---

## 🆘 Soporte

Si encuentras errores:

1. **Copia los logs completos** de la consola (sección SOAP)
2. **Verifica las variables de entorno**
3. **Revisa que el tipo_id sea correcto** según tipo de persona
4. **Confirma que el código de servicio sea el correcto** (2701)

---

**✅ Estado: SOAP Implementado y Funcionando**

**Siguiente paso:** Probar flujo completo con banco de pruebas

