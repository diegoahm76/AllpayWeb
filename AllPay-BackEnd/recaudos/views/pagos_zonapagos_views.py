from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from decimal import Decimal

from recaudos.models.recaudos_models import Pagos, LiquidacionesFacturaUnica, Personas
from recaudos.serializers.pagos_zonapagos_serializers import InicioPagoInputSerializer, VerificarInputSerializer
from recaudos.integrations.zonapagos_client import inicio_pago, verificacion_pago
from recaudos.integrations.zonapagos_soap import inicio_pago_soap, verificacion_pago_soap, TIPO_ID
from recaudos.integrations.zonapagos_parser import parse_str_res_pago
from recaudos.integrations.zonapagos_utils import map_doc, ip_permitida, ESTADOS_FINALES, ESTADOS_PEND

ID_COMERCIO = settings.ZPAGOS["ID_COMERCIO"]
USR = settings.ZPAGOS["USUARIO"]
PWD = settings.ZPAGOS["CLAVE"]
T_RUTA = settings.ZPAGOS.get("T_RUTA", "")
COD_SERVICIO = settings.ZPAGOS.get("CODIGO_SERVICIO", "")

class IniciarPagoRESTView(generics.CreateAPIView):
    """Vista para iniciar un pago en ZonaPagos"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InicioPagoInputSerializer

    def create(self, request, *args, **kwargs):
        data = self.serializer_class(data=request.data)
        data.is_valid(raise_exception=True)
        id_liq = data.validated_data["id_liquidacion"]
        id_per = data.validated_data.get("id_persona_pago")

        liq = get_object_or_404(LiquidacionesFacturaUnica, pk=id_liq)
        
        # Crear objeto persona temporal o buscar en BD
        if id_per:
            # Opción 1: Usar persona de la BD
            per = get_object_or_404(Personas, pk=id_per)
        else:
            # Opción 2: Crear objeto temporal con los datos enviados
            class PersonaTemporal:
                def __init__(self, data):
                    self.numero_documento = data.get('numero_documento', '')
                    self.primer_nombre = data.get('primer_nombre', '')
                    self.razon_social = data.get('razon_social', '')
                    self.primer_apellido = data.get('primer_apellido', '')
                    self.email = data.get('email', '')
                    self.telefono = data.get('telefono', '')
                    # Crear objeto tipo_documento temporal
                    tipo_doc = data.get('tipo_documento', 'CC')
                    self.tipo_documento = type('obj', (object,), {'cod_tipo_documento': tipo_doc})()
            
            per = PersonaTemporal(data.validated_data)

        # Helpers
        def _fmt_amount_str(x):
            """Devuelve el monto como cadena con punto y dos decimales (p.ej. '1234.50')."""
            try:
                from decimal import Decimal, ROUND_HALF_UP
                d = Decimal(str(x or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                return format(d, '.2f')
            except Exception:
                return "0.00"

        def _digits_only(s):
            s = str(s or "")
            return "".join(ch for ch in s if ch.isdigit())

        def _sanitize_name(s: str) -> str:
            import re
            s = str(s or "")
            return re.sub(r"[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]", "", s).strip()

        def _tipo_id_code(per_obj) -> int:
            """Retorna el código numérico del tipo de documento según documentación ZonaPagos v6.0"""
            if not per_obj or not hasattr(per_obj, 'tipo_documento'):
                return 1  # Default: CC
            
            try:
                tipo_doc = per_obj.tipo_documento.cod_tipo_documento or ''
            except Exception:
                tipo_doc = ''
            
            # Normalizar y convertir a mayúsculas
            tipo_doc = str(tipo_doc).upper().strip()
            
            # Normalizar equivalencias (NT → NIT)
            if tipo_doc in ('NIT', 'NT'):
                return 3
            
            # Mapeo según documentación ZonaPagos v6.0
            mapeo_codigos = {
                'CC': 1,        # Cédula de Ciudadanía
                'CE': 2,        # Cédula de Extranjería
                'NIT': 3,       # NIT Empresa
                'NUIP': 4,      # Número Único de Identificación
                'TI': 5,        # Tarjeta de Identidad
                'PP': 6,        # Pasaporte
                'IDC': 7,       # Identificador Único del Cliente
                'CEL': 8,       # Número móvil o celular
                'RC': 9,        # Registro Civil de Nacimiento
                'DE': 10,       # Documento de Identificación Extranjero
                'OTRO': 11      # Otro no tipificado
            }
            
            return mapeo_codigos.get(tipo_doc, 1)  # Default: CC

        def _tipo_id_textual(per_obj) -> str:
            """Retorna el tipo de documento TEXTUAL para V1 legacy ("NIT", "CC", etc.)"""
            if not per_obj or not hasattr(per_obj, 'tipo_documento'):
                return "CC"  # Default: CC
            
            try:
                tipo_doc = per_obj.tipo_documento.cod_tipo_documento if per_obj.tipo_documento else None
            except Exception:
                tipo_doc = None
            
            # Mapeo textual según V1 legacy
            mapeo_textual = {
                'CC': 'CC',        # Cédula de Ciudadanía
                'CE': 'CE',        # Cédula de Extranjería
                'NIT': 'NIT',      # NIT Empresa
                'NUIP': 'NUIP',    # Número Único de Identificación
                'TI': 'TI',        # Tarjeta de Identidad
                'PP': 'PP',        # Pasaporte
                'IDC': 'IDC',      # Identificador Único del Cliente
                'CEL': 'CEL',      # Número móvil o celular
                'RC': 'RC',        # Registro Civil de Nacimiento
                'DE': 'DE',        # Documento de Identificación Extranjero
                'OTRO': 'OTRO'     # Otro no tipificado
            }
            
            return mapeo_textual.get(tipo_doc, "CC")  # Default: CC

        # Datos saneados
        total_con_iva = _fmt_amount_str(liq.valor_pagar)
        valor_iva = _fmt_amount_str(getattr(liq, "valor_intereses", 0) or 0)
        tel = _digits_only(getattr(per, "telefono", ""))
        include_tel = bool(tel) and len(tel) >= 7
        try:
            id_tienda = int(str(ID_COMERCIO))
        except Exception:
            id_tienda = ID_COMERCIO
        # Limpiar ID cliente para V1 (solo dígitos, sin guiones/espacios)
        id_cliente = _digits_only(getattr(per, "numero_documento", "")) or _digits_only(settings.ZPAGOS.get("NIT", "") or "999999999")
        nombre = _sanitize_name(getattr(per, "primer_nombre", "") or getattr(per, "razon_social", "") or "Cliente FEDECACAO")
        apellido = _sanitize_name(getattr(per, "primer_apellido", ""))
        # Limpiar descripción para V1 (quitar tildes y caracteres especiales)
        desc = f"Pago liquidacion"
        # Quitar tildes y caracteres especiales
        import unicodedata
        desc = ''.join(c for c in unicodedata.normalize('NFD', desc) if unicodedata.category(c) != 'Mn')
        if len(desc) > 70:
            desc = desc[:70]

        # Construir payload V1 (para /InicioPago)
        # ZonaPagos espera TODOS los campos como strings, incluso los numéricos
        # Montos con punto y 2 decimales según documentación oficial
        
        info_pago = {
            "flt_total_con_iva": total_con_iva,  # como string con punto y 2 decimales
            "flt_valor_iva": valor_iva,          # como string con punto y 2 decimales
            "str_id_pago": str(liq.id_liq_factura_unica),  # ID temporal basado en liquidación
            "str_descripcion_pago": desc,
            "str_email": getattr(per, "email", "no-reply@fedecacao.org") or "no-reply@fedecacao.org",
            "str_id_cliente": id_cliente,
            "str_tipo_id": _tipo_id_code(per),  # CÓDIGO NUMÉRICO según documentación v6.0
            "str_nombre_cliente": nombre,
            # str_apellido_cliente y str_opcional1 omitidos para V1 estricto (minimizar parseos)
            "str_codigo_servicio_principal": str(getattr(liq, 'codigo_servicio', settings.ZPAGOS.get("CODIGO_SERVICIO", "2701"))),
            "int_total_codigos_servicio": 0  # monocrédito según V1 (int, no string)
        }
        if include_tel:
            info_pago["str_telefono_cliente"] = tel

        # Crear payload mínimo para pruebas iterativas (descomenta para usar)
        # info_pago_minimo = {
        #     "flt_total_con_iva": "1000.00",
        #     "flt_valor_iva": "0.00", 
        #     "str_id_pago": "1",
        #     "str_descripcion_pago": "Test",
        #     "str_email": "test@test.com",
        #     "str_id_cliente": "12345678",
        #     "str_tipo_id": "CC",
        #     "str_nombre_cliente": "Test",
        #     # str_apellido_cliente omitido (V1 estricto)
        #     "str_codigo_servicio_principal": "2701",
        #     "int_total_codigos_servicio": 0  # int real
        # }
        
        # Agregar str_apellido_cliente solo si tiene valor (V1 estricto)
        if apellido and apellido.strip():
            info_pago["str_apellido_cliente"] = apellido
        
        # ===== FORMATO V1 LEGADO según hints del proveedor (ACTIVA) =====
        # Tu endpoint está en V1, NO en v6. Los hints lo confirman:
        # - flt_* = String con punto y EXACTAMENTE 2 decimales
        # - str_tipo_id = TEXTUAL ("CC", "NIT", no códigos)
        # - Código servicio = str_codigo_servicio_principal en InformacionPago
        # - int_modalidad = -1 (numérico)
        
        # ===== PAYLOAD MÍNIMO según instancia V1 (basado en hints y errores reales) =====
        # Tu endpoint V1 exige formato específico diferente a la doc v6.0:
        # - flt_* como STRINGS con 2 decimales exactos
        # - str_tipo_id TEXTUAL ("NIT", "CC", no códigos)
        # - str_codigo_servicio_principal DENTRO de InformacionPago (obligatorio en V1)
        # - int_total_codigos_servicio como ENTERO 0 (no string)
        # - int_id_comercio como ENTERO (no string)
        # - int_modalidad como ENTERO -1 (no string)
        
        codigo_servicio = str(getattr(liq, 'codigo_servicio', settings.ZPAGOS.get("CODIGO_SERVICIO", "2701")))
        
        # ===== PAYLOAD CORREGIDO según especificación oficial ZonaPagos =====
        # Cambios críticos:
        # 1. flt_* son NUMÉRICOS (float), no strings
        # 2. str_tipo_id es el CÓDIGO NUMÉRICO (string): "1"=CC, "3"=NIT, etc.
        # 3. Código de servicio va en AdicionalesConfiguracion (int_codigo: 50)
        # 4. Eliminado int_total_codigos_servicio (no documentado)
        # 5. Eliminado str_codigo_servicio_principal de InformacionPago
        # 6. str_id_pago debe ser SOLO DÍGITOS (muchos comercios validan esto)
        
        # Extraer solo dígitos del id_pago (LQF2025001363 → 2025001363)
        # Usar el nro_doc_pago de la liquidación como referencia única
        import re
        id_pago_raw = str(getattr(liq, 'nro_doc_pago', liq.id_liq_factura_unica))
        id_pago_digitos = re.sub(r'\D', '', id_pago_raw) or str(liq.id_liq_factura_unica)
        # Convertir a int para enviarlo como número
        try:
            id_pago_numerico = int(id_pago_digitos)
        except:
            id_pago_numerico = int(liq.id_liq_factura_unica)
        
        # Convertir montos a float con 2 decimales exactos
        from decimal import Decimal, ROUND_HALF_UP
        total_numerico = float(Decimal(str(total_con_iva)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        iva_numerico = float(Decimal(str(valor_iva)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        
        # str_tipo_id debe ser el código numérico como STRING
        tipo_id_codigo = str(_tipo_id_code(per))  # "1" para CC, "3" para NIT, etc.
        
        # DEBUG: Verificar qué tipo de documento y str_id_pago
        try:
            print(f"\n🔍 DEBUG TIPO DOCUMENTO Y ID PAGO:")
            print(f"  Persona: {per}")
            print(f"  tiene tipo_documento: {hasattr(per, 'tipo_documento')}")
            if hasattr(per, 'tipo_documento'):
                print(f"  tipo_documento: {per.tipo_documento}")
                if per.tipo_documento:
                    print(f"  cod_tipo_documento: {per.tipo_documento.cod_tipo_documento}")
            print(f"  numero_documento: {getattr(per, 'numero_documento', 'N/A')}")
            print(f"  str_id_cliente: {id_cliente}")
            print(f"  tipo_id_codigo CALCULADO: '{tipo_id_codigo}' (tipo: {type(tipo_id_codigo).__name__})")
            print(f"  ✅ Debería ser '3' para NIT si numero_documento={id_cliente}")
            print(f"  id_pago_raw (original): '{id_pago_raw}'")
            print(f"  id_pago_digitos (extraídos): '{id_pago_digitos}'")
            print(f"  id_pago_numerico (int): {id_pago_numerico} (tipo: {type(id_pago_numerico).__name__})")
            print(f"  ✅ str_id_pago será enviado como INT sin comillas\n")
        except Exception as e:
            print(f"  Error en debug: {e}")
        
        # ===== PAYLOAD PSE MÍNIMO según especificación oficial =====
        body = {
            "InformacionPago": {
                "flt_total_con_iva": total_numerico,  # FLOAT: 10505011.50 (con 2 decimales)
                "flt_valor_iva": iva_numerico,  # FLOAT: 0.00 (con 2 decimales)
                "str_id_pago": id_pago_numerico,  # INT: 2025001363 (sin comillas)
                "str_descripcion_pago": str(desc),  # String: "Pago liquidacion"
                "str_id_cliente": id_cliente,  # String: "900794694"
                "str_tipo_id": tipo_id_codigo  # String: "3" (código numérico para NIT)
            },
            "InformacionSeguridad": {
                "int_id_comercio": int(id_tienda),  # INT: 35069
                "str_usuario": str(USR),  # String: "Cacaoteros"
                "str_clave": str(PWD),  # String: "Cacaoteros*"
                "int_modalidad": int(-1)  # INT: -1
            },
            "AdicionalesConfiguracion": [
                {
                    "int_codigo": 50,  # INT: 50 (código de servicio PSE)
                    "str_valor": str(codigo_servicio)  # String: "2701"
                }
            ]
        }

        try:
            # ===== LOGS DE DIAGNÓSTICO V1 =====
            try:
                import json
                print("\n" + "="*80)
                print("DEBUG-ZPAGOS - PAYLOAD FINAL V1")
                print("="*80)
                print(f"URL: {settings.ZPAGOS['BASE']}/InicioPago")
                print("\n📦 Body Python (con tipos):")
                print(f"InformacionPago:")
                for k, v in body['InformacionPago'].items():
                    tipo = type(v).__name__
                    icono = "✅" if (k.startswith('int_') and tipo == 'int') or (k.startswith('str_') and tipo == 'str') or (k.startswith('flt_') and tipo == 'str') else "❌"
                    print(f"  {icono} {k}: {v!r} ({tipo})")
                
                print(f"\nInformacionSeguridad:")
                for k, v in body['InformacionSeguridad'].items():
                    tipo = type(v).__name__
                    icono = "✅" if (k.startswith('int_') and tipo == 'int') or (k.startswith('str_') and tipo == 'str') else "❌"
                    print(f"  {icono} {k}: {v!r} ({tipo})")
                
                print("\n📄 JSON final que se enviará:")
                json_str = json.dumps(body, ensure_ascii=False, indent=2, separators=(',', ': '))
                print(json_str)
                print("="*80 + "\n")
                
            except Exception as e:
                print(f"DEBUG-ZPAGOS Error en logs: {e}")
            
            # ===== LLAMADA SOAP A ZONAPAGOS =====
            print("\n" + "="*80)
            print("🔄 CAMBIANDO A SOAP en lugar de REST")
            print("="*80 + "\n")
            
            resp = inicio_pago_soap(
                id_tienda=str(ID_COMERCIO),
                clave=PWD,
                total_con_iva=total_numerico,
                valor_iva=iva_numerico,
                id_pago=str(id_pago_numerico),
                descripcion_pago=desc,
                email=getattr(per, "email", "no-reply@fedecacao.org") or "no-reply@fedecacao.org",
                id_cliente=id_cliente,
                tipo_id=tipo_id_codigo,  # "3" para NIT, "1" para CC
                nombre_cliente=nombre,
                apellido_cliente=apellido or "",
                telefono_cliente=tel if include_tel else "",
                codigo_servicio_principal=codigo_servicio,
                total_codigos_servicio=0,
                lista_codigos_servicio_multicredito=["0"],
                lista_valores_iva=["0"],
                t_ruta=T_RUTA,
            )
            
            if not resp["success"]:
                raise ValidationError({
                    "message": "InicioPago SOAP rechazado por proveedor",
                    "error": resp["error"],
                    "sent": {
                        "id_tienda": ID_COMERCIO,
                        "total_con_iva": total_numerico,
                        "valor_iva": iva_numerico,
                        "id_pago": id_pago_numerico,
                        "descripcion_pago": desc,
                        "id_cliente": id_cliente,
                        "tipo_id": tipo_id_codigo,
                        "codigo_servicio_principal": codigo_servicio,
                    }
                })

            redirect_url = resp["redirect_url"]
            identificador = resp["identificador"]
            
            print(f"\n✅ SOAP InicioPago exitoso!")
            print(f"  Identificador: {identificador}")
            print(f"  Redirect URL: {redirect_url}\n")

            # ===== CREAR REGISTRO DE PAGO SOLO SI ZONAPAGOS RESPONDIÓ EXITOSAMENTE =====
            with transaction.atomic():
                pago = Pagos.objects.create(
                    id_liquidacion_pago=liq,
                    cod_estado_pago="PE",  # Pendiente
                    fecha_estado_pago=timezone.now(),
                    cod_medio_pago="bank_account",
                    cod_pago_realizado=f"ZONAPAGOS-{identificador}",
                    # Guardar el identificador de ZonaPagos para tracking
                    int_no_pago=identificador,
                    # Guardar el ID que enviamos a ZonaPagos (para buscar en verificación)
                    str_id_pago_zp=str(id_pago_numerico)
                )
        

            return Response({
                "success": True,
                "redirect_url": redirect_url,
                "identificador": identificador,
                "id_pago": pago.id_pago
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            # No es necesario eliminar el pago porque solo se crea si ZonaPagos responde exitosamente
            err = {
                "message": "Error al iniciar pago",
                "error": str(e),
                "error_type": e.__class__.__name__,
                "sent": body,
                "hints": [
                    "flt_total_con_iva y flt_valor_iva como cadenas con punto y 2 decimales",
                    "str_tipo_id textual (V1): CC, NIT, etc.",
                    "str_apellido_cliente puede ser vacío pero no null",
                    "str_codigo_servicio_principal como string e int_total_codigos_servicio=0"
                ]
            }
            raise ValidationError(err)

# class VerificarPagoRESTView(generics.CreateAPIView):
#     """Vista para verificar el estado de un pago"""
#     permission_classes = [permissions.IsAuthenticated]
#     serializer_class = VerificarInputSerializer

#     def create(self, request, *args, **kwargs):
#         data = self.serializer_class(data=request.data)
#         data.is_valid(raise_exception=True)
#         id_pago = data.validated_data["id_pago"]
#         # pagos = Pagos.objects.get(id_pago=id_pago)

#         try:
#             # Usar SOAP para verificar el pago
#             resp = verificacion_pago_soap(
#                 int_id_comercio=str(ID_COMERCIO),
#                 str_usr_comercio=USR,
#                 str_pwd_Comercio=PWD,
#                 str_id_pago=id_pago,
#                 int_no_pago=-1
#             )
            
#             if not resp["success"]:
#                 raise ValidationError(resp.get("error") or "Verificación sin pagos")
            
#             print("Res: ", resp)

#             # Los pagos ya vienen parseados en la respuesta SOAP
#             pagos = resp.get("res_pago", [])
#             cantidad = resp.get("cantidad_pagos", "0")

#             print(f"  Cantidad de pagos: {cantidad}")
#             print(f"  Pagos encontrados: {len(pagos)}")
#             if pagos:
#                 print(f"  Estado primer pago: {pagos[0].get('int_estado_pago')}")
#             print()

#             self._asentar(id_pago, pagos)
#             return Response({
#                 "success": True,
#                 "cantidad_pagos": cantidad,
#                 "data": pagos
#             }, status=status.HTTP_200_OK)
#         except Exception as e:
#             print(f"❌ ERROR en VerificarPago: {e}")
#             import traceback
#             traceback.print_exc()
#             raise ValidationError(f"Error al verificar pago: {str(e)}")

#     def _asentar(self, id_pago, pagos):
#         """Asienta los pagos verificados"""
#         print(f"\n🔄 ASENTANDO PAGO:")
#         print(f"  id_pago recibido: {id_pago}")
#         print(f"  cantidad de pagos recibidos: {len(pagos) if pagos else 0}")
        
#         if not pagos:
#             print("  ⚠️  No hay pagos para asentar")
#             return
            
#         p0 = pagos[0]
#         print(f"  datos del primer pago: {p0}")
        
#         estado = str(p0.get("int_estado_pago")).strip()
#         print(f"  estado extraído: '{estado}'")
        
#         # BUSCAR EL PAGO CON PRIORIDADES (fix para matching correcto)
#         obj = None
        
#         # 1. Buscar por str_id_pago_zp (el que enviamos a ZonaPagos)
#         print(f"  🔍 Buscando por str_id_pago_zp={id_pago}...")
#         obj = Pagos.objects.filter(str_id_pago_zp=str(id_pago)).order_by('-id_pago').first()
        
#         # 2. Fallback: buscar por int_no_pago si coincide con el identificador de ZP
#         if not obj and p0.get('int_n_pago'):
#             int_n_pago = str(p0.get('int_n_pago')).strip()
#             print(f"  🔍 No encontrado. Intentando por int_no_pago={int_n_pago}...")
#             obj = Pagos.objects.filter(int_no_pago=int_n_pago).order_by('-id_pago').first()
        
#         # 3. Fallback final: buscar por id_pago autoincremental (legacy)
#         if not obj:
#             print(f"  🔍 No encontrado. Intentando por id_pago={id_pago}...")
#             try:
#                 obj = Pagos.objects.filter(id_pago=int(id_pago)).select_for_update().first()
#             except (ValueError, TypeError):
#                 pass
        
#         if not obj:
#             print(f"  ❌ No se encontró el pago con ningún criterio. Valores buscados:")
#             print(f"     - str_id_pago_zp: {id_pago}")
#             print(f"     - int_n_pago: {p0.get('int_n_pago')}")
#             print(f"     - id_pago (PK): {id_pago}")
#             return
        
#         print(f"  ✅ Pago encontrado: {obj.id_pago} (estado actual: {obj.cod_estado_pago}, str_id_pago_zp: {obj.str_id_pago_zp})")
        
#         obj.cod_estado_pago = estado
#         obj.valor_pagado = _to_dec(p0.get("dbl_valor_pagado"))
#         obj.fecha_estado_pago = timezone.now()
#         obj.cod_medio_pago = _medio(str(p0.get("int_id_forma_pago")))
        
#         # Persistir trazabilidad Zonapagos
#         obj.int_no_pago = str(p0.get("int_n_pago") or "").strip()
#         obj.int_estado_pago = estado
#         obj.int_id_forma_pago = str(p0.get("int_id_forma_pago") or "").strip()
        
#         # Campos adicionales PSE (CORREGIDOS: CUS y Ticket estaban intercambiados)
#         obj.ticket_id = p0.get("str_ticketID") or obj.ticket_id  # ej: 8365100007
#         obj.cus = p0.get("str_codigo_transaccion") or obj.cus    # ej: 5084156 (CUS correcto)
        
#         print(f"  📝 Actualizando:")
#         print(f"    cod_estado_pago: {obj.cod_estado_pago}")
#         print(f"    valor_pagado: {obj.valor_pagado}")
#         print(f"    int_estado_pago: {obj.int_estado_pago}")
#         print(f"    int_no_pago: {obj.int_no_pago}")
#         print(f"    ticket_id: {obj.ticket_id}")
#         print(f"    cus: {obj.cus}")
#         print(f"    cod_medio_pago: {obj.cod_medio_pago}")
            
#         if estado in ESTADOS_FINALES:
#             print(f"  ✅ Estado FINAL detectado ({estado}), finalizando documentos...")
#             obj.fecha_pago = timezone.now()
#             _finalizar_documentos(obj)  # actualiza liquidación, facturas, PDFs
#         else:
#             print(f"  ⏳ Estado NO FINAL ({estado}), no se finalizan documentos aún")
            
#         obj.save()
#         print(f"  ✅ Pago actualizado en BD\n")

class VerificarPagoRESTView(generics.CreateAPIView):
    """Vista para verificar el estado de un pago"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VerificarInputSerializer

    def create(self, request, *args, **kwargs):
        data = self.serializer_class(data=request.data)
        data.is_valid(raise_exception=True)
        id_pago = data.validated_data["id_pago"]
        pago = Pagos.objects.get(id_pago=id_pago)

        try:
            # Usar SOAP para verificar el pago
            resp = verificacion_pago_soap(
                int_id_comercio=str(ID_COMERCIO),
                str_usr_comercio=USR,
                str_pwd_Comercio=PWD,
                str_id_pago=pago.str_id_pago_zp,
                int_no_pago=-1
            )
            
            if not resp["success"]:
                raise ValidationError(resp.get("error") or "Verificación sin pagos")
            
            print("Res: ", resp)

            # Los pagos ya vienen parseados en la respuesta SOAP
            pagos = resp.get("res_pago", [])
            cantidad = resp.get("cantidad_pagos", "0")

            print(f"  Cantidad de pagos: {cantidad}")
            print(f"  Pagos encontrados: {len(pagos)}")
            if pagos:
                print(f"  Estado del ultimo pago: {pagos[-1].get('int_estado_pago')}")
            print()

            _asentar(pago.id_pago, pagos)
            return Response({
                "success": True,
                "cantidad_pagos": cantidad,
                "data": pagos
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"❌ ERROR en VerificarPago: {e}")
            import traceback
            traceback.print_exc()
            raise ValidationError(f"Error al verificar pago: {str(e)}")

def _asentar(id_pago, pagos):
    
    if not pagos:
        print("  ⚠️  No hay pagos para asentar")
        return
        
    p_reciente = pagos[-1]
    estado = str(p_reciente.get("int_estado_pago")).strip()
    obj = None
    try:
        obj = Pagos.objects.get(id_pago=id_pago)
    except Pagos.DoesNotExist:
        raise NotFound(" se encontró el pago")

    medio_pago = str(p_reciente.get("int_id_forma_pago")) if p_reciente.get("int_id_forma_pago") != "" else None
    
    # 📝 Asentar los datos del pago más reciente (p_reciente)
    obj.cod_estado_pago = _estado(estado)
    obj.valor_pagado = _to_dec(p_reciente.get("dbl_valor_pagado"))
    obj.fecha_estado_pago = timezone.now()
    obj.cod_medio_pago = _medio(medio_pago) if medio_pago is not None else "bank_account"
    obj.apellidos_persona_paga = p_reciente.get("str_apellido")
    obj.nombres_persona_paga = p_reciente.get("str_nombre")
    obj.email_persona_paga = p_reciente.get("str_email")
    obj.nro_celular_persona_paga = p_reciente.get("str_telefono")
    obj.bank_code = p_reciente.get("int_codigo_banco")
    obj.int_no_pago = str(p_reciente.get("int_n_pago") or "").strip()
    obj.int_estado_pago = estado
    obj.int_id_forma_pago = str(p_reciente.get("int_id_forma_pago") or "").strip()
    obj.ticket_id = p_reciente.get("str_ticketID") or obj.ticket_id 
    obj.cus = p_reciente.get("str_codigo_transaccion") or obj.cus 
    obj.franquicia = p_reciente.get("str_nombre_banco")
    obj.num_recibo = p_reciente.get("str_codigo_transaccion")
    
    print(f"  📝 Actualizando:")
    print(f"    cod_estado_pago: {obj.cod_estado_pago}")
    print(f"    valor_pagado: {obj.valor_pagado}")
    print(f"    int_estado_pago: {obj.int_estado_pago}")
    print(f"    int_no_pago: {obj.int_no_pago}")
    print(f"    ticket_id: {obj.ticket_id}")
    print(f"    cus: {obj.cus}")
    print(f"    cod_medio_pago: {obj.cod_medio_pago}")
        
    if estado in ESTADOS_FINALES:
        print(f"Estado FINAL detectado ({estado}), finalizando documentos...")
        obj.fecha_pago = timezone.now()
        _finalizar_documentos(obj)
        
    obj.save()
    print(f"  ✅ Pago actualizado en BD\n")


def _estado(id_estado: str) -> str:
    MAPEO_ESTADOS = {
        '1': 'AP',
        '888': 'PE',
        '999': 'PE',
        '4001': 'PE',
        '4000': 'RE',
        '4003': 'FA',
        '1000': 'RE',
        '1001': 'FA',
    }
    return MAPEO_ESTADOS.get(id_estado, 'PE')


def _medio(id_forma: str) -> str:
    """Mapea el ID de forma de pago a descripción"""
    try:
        i = int(id_forma)
    except Exception:
        return None
    return {29: "PSE", 32: "TC"}.get(i, str(i))

def _to_dec(x):
    """Convierte a Decimal de forma segura"""
    try:
        return Decimal(str(x)) if x is not None else None
    except Exception:
        return None

def _finalizar_documentos(pago: Pagos):
    """
    Finaliza los documentos cuando el pago es exitoso
    Aquí llamas tu lógica actual (la del webhook) para:
    - pasar liquidación L -> P,
    - facturas LQ -> PA,
    - generar PDF de recibo,
    - actualizar planes de pago, etc.
    Debe ser idempotente.
    """
    from recaudos.models.recaudos_models import FacturaUnica
    
    try:
        liq = pago.id_liquidacion_pago
        if not liq:
            print(f"  ⚠️  Pago {pago.id_pago} no tiene liquidación asociada")
            return
            
        print(f"  📄 Finalizando documentos para liquidación {liq.id_liq_factura_unica}...")
        
        # Actualizar estado de liquidación
        liq.cod_estado = 'P'  # Pagado
        liq.fecha_pago = pago.fecha_pago or timezone.now()
        liq.save()
        print(f"    ✅ Liquidación {liq.id_liq_factura_unica} actualizada a estado 'P'")
        
        # Actualizar estado de facturas (CORREGIDO: facturaunica_set, no faturaunica_set)
        facturas = None
        try:
            # Intenta con el related_name por defecto
            facturas = liq.facturaunica_set.all()
        except AttributeError:
            # Fallback: consulta directa
            print(f"    ⚠️  related_name no disponible, usando consulta directa")
            facturas = FacturaUnica.objects.filter(id_liq_factura_unica=liq)
        
        if facturas:
            count = 0
            for factura in facturas:
                factura.estado_factura = 'PA'  # Pagado
                factura.save()
                count += 1
            print(f"    ✅ {count} factura(s) actualizadas a estado 'PA'")
        else:
            print(f"    ⚠️  No se encontraron facturas asociadas a la liquidación")
        
        # TODO: Aquí puedes agregar la generación de PDF y otras lógicas
        # from services.reportes import generar_recibo_pdf
        # generar_recibo_pdf(liq, pago)
        
        print(f"  ✅ Finalización de documentos completada para pago {pago.id_pago}")
        
    except Exception as e:
        # Log del error pero no fallar (para no bloquear el asentamiento)
        print(f"  ❌ Error al finalizar documentos: {e}")
        import traceback
        traceback.print_exc()

class NotificarPagoRESTView(generics.GenericAPIView):
    """
    Callback GET de ZonaPagos tras el retorno del pagador.
    Acepta únicamente 'id_pago' como parámetro.
    El id_comercio se toma de la configuración ZPAGOS_ID_COMERCIO.
    """
    permission_classes = []  # público, pero filtramos por IP
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        # ===== LOG INICIO DE CALLBACK =====
        print("\n" + "="*80)
        print("🔔 CALLBACK ZONAPAGOS RECIBIDO")
        print("="*80)
        print(f"⏰ Timestamp: {timezone.now()}")
        
        # Obtener IP (considerando proxy)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
            print(f"🌐 IP (X-Forwarded-For): {ip}")
            print(f"   Cadena completa: {x_forwarded_for}")
        else:
            ip = request.META.get("REMOTE_ADDR", "")
            print(f"🌐 IP (REMOTE_ADDR): {ip}")
        
        # Log de headers importantes
        print(f"\n📋 HEADERS:")
        print(f"   Host: {request.META.get('HTTP_HOST', 'N/A')}")
        print(f"   User-Agent: {request.META.get('HTTP_USER_AGENT', 'N/A')}")
        print(f"   Referer: {request.META.get('HTTP_REFERER', 'N/A')}")
        
        # Validar IP
        print(f"\n🔒 VALIDACIÓN DE IP:")
        from django.conf import settings
        ips_permitidas = settings.ZPAGOS.get("IPS_PERMITIDAS", [])
        print(f"   IPs configuradas: {ips_permitidas}")
        
        if not ip_permitida(ip):
            print(f"   ❌ IP NO PERMITIDA: {ip}")
            print("="*80 + "\n")
            return Response({"detail": "IP no permitida"}, status=403)
        
        print(f"   ✅ IP PERMITIDA: {ip}")

        # Obtener parámetros (solo id_pago, id_comercio viene de config)
        id_pago = request.query_params.get("id_pago")
        
        print(f"\n📦 PARÁMETROS RECIBIDOS:")
        print(f"   id_comercio (config): {ID_COMERCIO}")
        print(f"   id_pago: {id_pago}")
        print(f"   Query params completos: {dict(request.query_params)}")
        
        if not id_pago:
            print(f"   ❌ FALTA PARÁMETRO REQUERIDO: id_pago")
            print("="*80 + "\n")
            raise ValidationError("id_pago es requerido")

        try:
            # Usar SOAP para verificar el pago
            print(f"\n🔍 VERIFICANDO PAGO CON ZONAPAGOS...")
            print(f"   ID Comercio: {ID_COMERCIO}")
            print(f"   Usuario: {USR}")
            print(f"   ID Pago: {id_pago}")
            
            resp = verificacion_pago_soap(
                int_id_comercio=str(ID_COMERCIO),
                str_usr_comercio=USR,
                str_pwd_Comercio=PWD,
                str_id_pago=str(id_pago),
                int_no_pago=-1
            )
            
            print(f"\n📨 RESPUESTA DE ZONAPAGOS:")
            print(f"   Success: {resp.get('success')}")
            print(f"   Cantidad pagos: {resp.get('cantidad_pagos', '0')}")
            
            if not resp["success"]:
                print(f"   ❌ Error: {resp.get('error', 'Error desconocido')}")
                print("="*80 + "\n")
                return Response({"success": False, "detail": resp.get("error", "Error al verificar")}, status=400)
            
            # Los pagos ya vienen parseados en la respuesta SOAP
            pagos = resp.get("res_pago", [])
            print(f"   Pagos encontrados: {len(pagos)}")
            if pagos:
                print(f"   Estado primer pago: {pagos[0].get('int_estado_pago')}")
                print(f"   Valor pagado: {pagos[0].get('dbl_valor_pagado')}")
            
            # Asentar (idempotente)
            print(f"\n💾 ASENTANDO PAGO EN BASE DE DATOS...")
            VerificarPagoRESTView()._asentar(id_pago, pagos)
            
            print(f"\n✅ CALLBACK PROCESADO EXITOSAMENTE")
            print("="*80 + "\n")
            return Response({"success": True, "detail": "OK", "cantidad_pagos": resp.get("cantidad_pagos", "0")})
            
        except Exception as e:
            print(f"\n❌ ERROR EN CALLBACK ZONAPAGOS:")
            print(f"   Tipo: {e.__class__.__name__}")
            print(f"   Mensaje: {str(e)}")
            import traceback
            print(f"\n📜 TRACEBACK:")
            traceback.print_exc()
            print("="*80 + "\n")
            return Response({"success": False, "detail": str(e)}, status=500) 