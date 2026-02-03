import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from datetime import datetime, timedelta
from num2words import num2words
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound
from decimal import Decimal
from recaudos.models.recaudos_models import Pagos, LiquidacionesFacturaUnica, Personas, FacturaUnica
from recaudos.integrations.zonapagos_client import inicio_pago, verificacion_pago
from recaudos.integrations.zonapagos_soap import inicio_pago_soap, verificacion_pago_soap, TIPO_ID
from recaudos.integrations.zonapagos_parser import parse_str_res_pago
from recaudos.integrations.zonapagos_utils import map_doc, ip_permitida, ESTADOS_FINALES, ESTADOS_PEND
import traceback
from celery import shared_task


# Definir tamaño máximo de archivos (10MB)
max_file_size = settings.FILE_UPLOAD_MAX_MEMORY_SIZE

# Definir extensiones permitidas
ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"]
ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]
ALLOWED_EXCEL_EXTENSIONS = ["xlsx", "xls"]
ID_COMERCIO = settings.ZPAGOS["ID_COMERCIO"]
USR = settings.ZPAGOS["USUARIO"]
PWD = settings.ZPAGOS["CLAVE"]
T_RUTA = settings.ZPAGOS.get("T_RUTA", "")
COD_SERVICIO = settings.ZPAGOS.get("CODIGO_SERVICIO", "")

class Utils:

    def validate_file(file, allowed_extensions):    

        # Validar tamaño
        if file.size > max_file_size:
            tamaño_total = {max_file_size / (1024 * 1024)}
            raise ValidationError(f"El archivo {file.name} es demasiado grande. Tamaño máximo permitido: {tamaño_total}MB.")

        # Validar extensión
        extension = file.name.split('.')[-1].lower()
        if extension not in allowed_extensions:
            raise ValidationError(f"Formato de archivo no permitido para {file.name}. Extensiones permitidas: {', '.join(allowed_extensions)}")
        


    @staticmethod
    def generar_consecutivo(consecutivo: int) -> str:
        """
        Genera un número de consecutivo con ceros a la izquierda.
        :param consecutivo: El número de consecutivo.
        :return: El número de consecutivo formateado como una cadena.
        """
        return str(consecutivo).zfill(5)
    

    def archivo_existe_en_s3(key):
        """
        Verifica si un archivo existe en un bucket de S3.

        :param bucket_name: Nombre del bucket de S3.
        :param key: Ruta del archivo dentro del bucket (clave).
        :return: True si el archivo existe, False en caso contrario.
        """
        s3_client = boto3.client('s3')
        try:
            # Intenta obtener los metadatos del archivo
            s3_client.head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
            print(f"El archivo {key} existe en S3.")
            return True
        except ClientError as e:
            # Si el error es 404, el archivo no existe
            if e.response['Error']['Code'] == "404":
                return False
            else:
                raise e
            
    def validador_dato_tipo(tipo, dato):
        """
        Valida el tipo de dato de una variable.
        :param tipo: Tipo de dato esperado (str, int, float).
        :param dato: Dato a validar.
        :return: True si el tipo de dato es correcto, False en caso contrario.
        """

        try:
            if tipo == "fecha":
                datetime.strptime(dato, "%Y-%m-%d")
            elif tipo == "entero":
                int(dato)
            elif tipo == "decimal":
                float(dato)
            elif tipo == "booleano":
                if str(dato).lower() not in ["true", "false", "1", "0"]:
                    raise ValueError("Valor booleano inválido")
            elif tipo == "texto":
                if not isinstance(dato, str):
                    raise ValueError("No es una cadena de texto")
            else:
                raise ValueError("Tipo de dato no soportado")
        except ValueError:
            raise ValueError(f"Formato de {tipo} inválido")
        

    def convertir_numeros_a_letras(numero):
        """
        Convierte un número a su representación en texto.
        :param numero: Número a convertir.
        :return: Representación en letras del número.
        """
        
        # Convertir el número a su representación en texto
        numero_en_letras = num2words(numero, lang='es')
        return numero_en_letras
    
    def formatear_fecha(fecha_str):
        """
        Formatea una fecha en el formato 'YYYY-MM-DD' a 'DD/MM/YYYY'.
        :param fecha: Fecha en formato 'YYYY-MM-DD'.
        :return: Fecha formateada en 'DD/MM/YYYY'.
        """

        if fecha_str is None:
            return None
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            return fecha.strftime("%d-%m-%Y")
        except ValueError:
            raise ValidationError("La fecha no es válida.")
        
    def mes_en_letras(mes):
        """
        Convierte un número de mes (1-12) a su representación en letras.
        :param mes: Número de mes (1-12).
        :return: Nombre del mes en letras.
        """
        if mes is None:
            return None
        
        if str(mes).count("-") > 0:
            mes = str(mes).split("-")[1]
        try:
            mes = int(mes)
        except ValueError:
            raise ValidationError("El mes debe ser un número entero.")
        if mes < 1 or mes > 12:
            raise ValidationError("El mes debe estar entre 1 y 12.")
        
        # Diccionario para mapear números de mes a nombres
        meses = {
            1: "ENERO",
            2: "FEBRERO",
            3: "MARZO",
            4: "ABRIL",
            5: "MAYO",
            6: "JUNIO",
            7: "JULIO",
            8: "AGOSTO",
            9: "SEPTIEMBRE",
            10: "OCTUBRE",
            11: "NOVIEMBRE",
            12: "DICIEMBRE"
        }
        return meses.get(mes, None)
    
    def formato_peso(valor):
        if valor is None:
            valor = 0.0
        try:
            valor = float(valor)
            valor_formateado = "${:,.0f}".format(valor).replace(",", "TEMP").replace(".", ",").replace("TEMP", ".")
            return valor_formateado
        except (ValueError, TypeError):
            raise ValidationError("El valor no es un número válido.")


def activarSonda():
    fecha_limite = datetime.now() - timedelta(hours=1)
    pagos_pendientes = Pagos.objects.filter(
        cod_estado_pago__in=('PE', 'IN'),
        fecha_estado_pago__gte=fecha_limite, 
        str_id_pago_zp__isnull=False 
    ).exclude(
        str_id_pago_zp=''
    )
    return pagos_pendientes.exists()

def ejecutar_sonda_pagos():
    # 1. Buscar todos los pagos en estado pendiente.
    # Filtra por el campo que almacena el ID que se envía a la pasarela (ZP)
    fecha_limite = datetime.now() - timedelta(hours=1)

    pagos_pendientes = Pagos.objects.filter(
        cod_estado_pago__in=('PE'),
        fecha_estado_pago__gte=fecha_limite, 
        str_id_pago_zp__isnull=False 
    ).exclude(
        str_id_pago_zp=''
    )
    
    total_pendientes = pagos_pendientes.count()
    print(f"Pagos pendientes encontrados para verificar: {total_pendientes}")
    
    if total_pendientes == 0:
        print("--- Tarea finalizada: No hay pagos pendientes. ---")
        return

    for i, pago_obj in enumerate(pagos_pendientes):
        id_pago_zp = pago_obj.str_id_pago_zp
        print(f"\n[{i+1}/{total_pendientes}] Procesando pago DB ID: {pago_obj.id_pago} | ZP ID: {id_pago_zp}")

        try:
            # 2a. Llamada SOAP (misma lógica que en tu view)
            resp = verificacion_pago_soap(
                int_id_comercio=str(ID_COMERCIO), # Asegúrate que estas CONSTANTES estén disponibles
                str_usr_comercio=USR,
                str_pwd_Comercio=PWD,
                str_id_pago=str(id_pago_zp),
                int_no_pago=-1
            )
            
            if not resp["success"]:
                print(f"  ❌ Verificación falló: {resp.get('error') or 'Error desconocido'}")
                continue # Pasa al siguiente pago
            
            pagos_zp = resp.get("res_pago", [])
            
            if pagos_zp:
                # 2b. Llamada a la lógica de asentamiento (reutilizando tu método _asentar)
                # La función _asentar debe ser capaz de recibir el ID de ZP y los datos de ZP.
                _asentar(pago_obj.id_pago, pagos_zp)
            else:
                print("  ⚠️ No se encontraron pagos en ZP para este ID, saltando asentamiento.")

        except Exception as e:
            # Capturar errores por pago individual y continuar con el siguiente
            print(f"  ❌ ERROR FATAL al verificar pago ZP ID {id_pago_zp}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\n--- ✅ Tarea CRON finalizada: {total_pendientes} pagos procesados. ---")

# def _asentar(id_pago, pagos):
#     """Asienta los pagos verificados"""
#     print(f"\n🔄 ASENTANDO PAGO:")
#     print(f"  id_pago recibido: {id_pago}")
#     print(f"  cantidad de pagos recibidos: {len(pagos) if pagos else 0}")
    
#     if not pagos:
#         print("  ⚠️  No hay pagos para asentar")
#         return
        
#     p0 = pagos[0]
#     print(f"  datos del primer pago: {p0}")
    
#     estado = str(p0.get("int_estado_pago")).strip()
#     print(f"  estado extraído: '{estado}'")
    
#     # BUSCAR EL PAGO CON PRIORIDADES (fix para matching correcto)
#     obj = None
    
#     # 1. Buscar por str_id_pago_zp (el que enviamos a ZonaPagos)
#     print(f"  🔍 Buscando por str_id_pago_zp={id_pago}...")
#     obj = Pagos.objects.filter(id_pago=id_pago).order_by('-id_pago').first()
    
#     # 2. Fallback: buscar por int_no_pago si coincide con el identificador de ZP
#     if not obj and p0.get('int_n_pago'):
#         int_n_pago = str(p0.get('int_n_pago')).strip()
#         print(f"  🔍 No encontrado. Intentando por int_no_pago={int_n_pago}...")
#         obj = Pagos.objects.filter(int_no_pago=int_n_pago).order_by('-id_pago').first()
    
#     # 3. Fallback final: buscar por id_pago autoincremental (legacy)
#     if not obj:
#         print(f"  🔍 No encontrado. Intentando por id_pago={id_pago}...")
#         try:
#             obj = Pagos.objects.filter(id_pago=int(id_pago)).select_for_update().first()
#         except (ValueError, TypeError):
#             pass
    
#     if not obj:
#         print(f"  ❌ No se encontró el pago con ningún criterio. Valores buscados:")
#         print(f"     - str_id_pago_zp: {id_pago}")
#         print(f"     - int_n_pago: {p0.get('int_n_pago')}")
#         print(f"     - id_pago (PK): {id_pago}")
#         return
    
#     print(f"  ✅ Pago encontrado: {obj.id_pago} (estado actual: {obj.cod_estado_pago}, str_id_pago_zp: {obj.str_id_pago_zp})")
    
#     obj.cod_estado_pago = estado
#     obj.valor_pagado = _to_dec(p0.get("dbl_valor_pagado"))
#     obj.fecha_estado_pago = timezone.now()
#     obj.cod_medio_pago = _medio(str(p0.get("int_id_forma_pago")))
    
#     # Persistir trazabilidad Zonapagos
#     obj.int_no_pago = str(p0.get("int_n_pago") or "").strip()
#     obj.int_estado_pago = estado
#     obj.int_id_forma_pago = str(p0.get("int_id_forma_pago") or "").strip()
    
#     # Campos adicionales PSE (CORREGIDOS: CUS y Ticket estaban intercambiados)
#     obj.ticket_id = p0.get("str_ticketID") or obj.ticket_id  # ej: 8365100007
#     obj.cus = p0.get("str_codigo_transaccion") or obj.cus    # ej: 5084156 (CUS correcto)
    
#     print(f"  📝 Actualizando:")
#     print(f"    cod_estado_pago: {obj.cod_estado_pago}")
#     print(f"    valor_pagado: {obj.valor_pagado}")
#     print(f"    int_estado_pago: {obj.int_estado_pago}")
#     print(f"    int_no_pago: {obj.int_no_pago}")
#     print(f"    ticket_id: {obj.ticket_id}")
#     print(f"    cus: {obj.cus}")
#     print(f"    cod_medio_pago: {obj.cod_medio_pago}")
        
#     if estado in ESTADOS_FINALES:
#         print(f"  ✅ Estado FINAL detectado ({estado}), finalizando documentos...")
#         obj.fecha_pago = timezone.now()
#         _finalizar_documentos(obj)  # actualiza liquidación, facturas, PDFs
#     else:
#         print(f"  ⏳ Estado NO FINAL ({estado}), no se finalizan documentos aún")
        
#     obj.save()
#     print(f"  ✅ Pago actualizado en BD\n")

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
        traceback.print_exc()

def _asentar_pago(id_pago: str, pagos: list):
    if not pagos:
        print("⚠️ No hay pagos para asentar")
        return
    
    p0 = pagos[0]
    estado = str(p0.get("int_estado_pago")).strip()

    # Buscar pago
    obj = (
        Pagos.objects.filter(str_id_pago_zp=str(id_pago)).order_by('-id_pago').first()
    )

    if not obj and p0.get("int_n_pago"):
        obj = Pagos.objects.filter(
            int_no_pago=str(p0.get("int_n_pago"))
        ).order_by('-id_pago').first()

    if not obj:
        try:
            obj = Pagos.objects.filter(id_pago=int(id_pago)).first()
        except:
            pass

    if not obj:
        print("❌ No se encontró el pago")
        return

    # Actualizar datos
    obj.cod_estado_pago = estado
    obj.valor_pagado = _to_dec(p0.get("dbl_valor_pagado"))
    obj.fecha_estado_pago = timezone.now()
    obj.int_no_pago = str(p0.get("int_n_pago") or "").strip()
    obj.int_estado_pago = estado

    if estado in ESTADOS_FINALES:
        obj.fecha_pago = timezone.now()
        _finalizar_documentos(obj)

    obj.save()

def verificar_pago(id_pago: str) -> dict:
    """
    Función reutilizable que verifica el estado de un pago en Zonapagos
    y lo asienta en BD.
    """

    try:
        # Consulta SOAP
        resp = verificacion_pago_soap(
            int_id_comercio=str(ID_COMERCIO),
            str_usr_comercio=USR,
            str_pwd_Comercio=PWD,
            str_id_pago=str(id_pago),
            int_no_pago=-1
        )

        if not resp["success"]:
            raise ValidationError(resp.get("error") or "Respuesta no válida desde SOAP")

        pagos = resp.get("res_pago", [])
        cantidad = resp.get("cantidad_pagos", "0")

        # Asentar
        _asentar_pago(id_pago, pagos)

        return {
            "success": True,
            "cantidad_pagos": cantidad,
            "data": pagos
        }
    except Exception as e:
        print(f"❌ ERROR en verificar_pago(): {e}")
        traceback.print_exc()
        raise e


def verificar_pago_recurrente(id_pago):
    ESTADOS_FINALES = {"1", "1000", "1001", "4000", "4003"}
    print("Entra aqui al pago recurrente")

    pago = Pagos.objects.filter(str_id_pago_zp=id_pago).first()
    if not pago:
        return "Pago no encontrado"

    # Expiró el tiempo máximo?
    if pago.fecha_iniciado and timezone.now() > pago.fecha_iniciado + timedelta(hours=1):
        pago.cod_estado_pago = "1000"  # expira
        pago.save()
        return "Expirado"

    # Verificar
    resp = verificar_pago(pago.str_id_pago_zp)

    # Estado final?
    estado = resp["data"][0].get("int_estado_pago")
    if str(estado) in ESTADOS_FINALES:
        return "Finalizado"

    # Reprogramar en 5 minutos
    verificar_pago_recurrente.apply_async((id_pago,), countdown=300)

    return "Reprogramado"

