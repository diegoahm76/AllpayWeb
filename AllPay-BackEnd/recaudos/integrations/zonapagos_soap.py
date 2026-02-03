# recaudos/integrations/zonapagos_soap.py
import os
import requests
import textwrap
from datetime import datetime
from xml.etree import ElementTree as ET
from django.conf import settings

# === Endpoints SOAP oficiales ===
ZP_INICIO_PAGO_URL = "https://www.zonapagos.com/ws_inicio_pagov2/Zpagos.asmx"
ZP_VERIFICAR_PAGO_URL = "https://www.zonapagos.com/WsVerificarPagoV4/VerificarPagos.asmx"

# === Namespaces SOAP/XML ===
NS = {
    "soap": "http://schemas.xmlsoap.org/soap/envelope/",
    "zp_i": "http://www.zonapagos.com",
    "zp_v": "http://www.zonapagos.com/ws_verificar_pagosV4",
}

# === Util: map de tipo_id (usa los códigos estándar de ZonaPagos) ===
TIPO_ID = {
    "NO_APLICA": "0",
    "CC": "1",
    "CE": "2",
    "NIT": "3",
    "NT": "3",  # Alias para NIT
    "NUIP": "4",
    "TI": "5",
    "PP": "6",
    "IDC": "7",
    "CEL": "8",
    "RC": "9",
    "DE": "10",
    "OTRO": "11",
}

def _debug_print(title: str, content: str):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)
    print(content if isinstance(content, str) else str(content))
    print("=" * 80 + "\n")

def _post_soap(url: str, xml_envelope: str, timeout=30) -> ET.Element:
    headers = {"Content-Type": "text/xml; charset=utf-8"}
    _debug_print("🚀 ENVIANDO PETICIÓN SOAP", f"📍 URL: {url}\n\n📄 XML ENVELOPE:\n{xml_envelope}")

    r = requests.post(url, data=xml_envelope.encode("utf-8"), headers=headers, timeout=timeout)

    _debug_print("📥 RESPUESTA SOAP", f"📊 Status: {r.status_code}\n\n📄 Body (raw, primeros 2000 chars):\n{r.text[:2000]}")
    r.raise_for_status()

    try:
        tree = ET.fromstring(r.content)
        return tree
    except ET.ParseError as ex:
        raise RuntimeError(f"Respuesta SOAP inválida: {ex}") from ex

# --------------------------------------------------------------------------------------
# 1) INICIO DE PAGO (inicio_pagoV2)
# --------------------------------------------------------------------------------------
def inicio_pago_soap(
    *,
    id_tienda: str,
    clave: str,
    total_con_iva: str | float,
    valor_iva: str | float,
    id_pago: str | int,
    descripcion_pago: str,
    email: str,
    id_cliente: str,
    tipo_id: str = "0",
    nombre_cliente: str = "",
    apellido_cliente: str = "",
    telefono_cliente: str = "",
    codigo_servicio_principal: str = "",
    total_codigos_servicio: int = 0,
    lista_codigos_servicio_multicredito: list | None = None,
    lista_valores_iva: list | None = None,
    t_ruta: str | None = None,
):
    """
    Retorna:
      {
        "success": True/False,
        "identificador": "9111560000...." | None,
        "redirect_url": "https://www.zonapagos.com/{t_ruta}/pago.asp?..." | None,
        "error": "mensaje" | None
      }
    """
    # Nota: valores opcionales para listas deben existir aunque vayan en blanco según escenarios
    lista_codigos_servicio_multicredito = lista_codigos_servicio_multicredito or ["0"]
    lista_valores_iva = lista_valores_iva or ["0"]

    envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <inicio_pagoV2 xmlns="http://www.zonapagos.com">
      <id_tienda>{id_tienda}</id_tienda>
      <clave>{clave}</clave>
      <total_con_iva>{total_con_iva}</total_con_iva>
      <valor_iva>{valor_iva}</valor_iva>
      <id_pago>{id_pago}</id_pago>
      <descripcion_pago>{_xml_escape(descripcion_pago)}</descripcion_pago>
      <email>{_xml_escape(email)}</email>
      <id_cliente>{_xml_escape(id_cliente)}</id_cliente>
      <tipo_id>{tipo_id}</tipo_id>
      <nombre_cliente>{_xml_escape(nombre_cliente)}</nombre_cliente>
      <apellido_cliente>{_xml_escape(apellido_cliente)}</apellido_cliente>
      <telefono_cliente>{_xml_escape(telefono_cliente)}</telefono_cliente>
      <info_opcional1>0</info_opcional1>
      <info_opcional2>0</info_opcional2>
      <info_opcional3>0</info_opcional3>
      <codigo_servicio_principal>{codigo_servicio_principal}</codigo_servicio_principal>
      <lista_codigos_servicio_multicredito>
        {''.join(f'<string>{c}</string>' for c in lista_codigos_servicio_multicredito)}
      </lista_codigos_servicio_multicredito>
      <lista_valores_iva>
        {''.join(f'<double>{v}</double>' for v in lista_valores_iva)}
      </lista_valores_iva>
      <total_codigos_servicio>{total_codigos_servicio}</total_codigos_servicio>
    </inicio_pagoV2>
  </soap:Body>
</soap:Envelope>"""

    tree = _post_soap(ZP_INICIO_PAGO_URL, textwrap.dedent(envelope).strip())
    result = tree.find(".//soap:Body/zp_i:inicio_pagoV2Response/zp_i:inicio_pagoV2Result", NS)

    if result is None or result.text is None:
        return {"success": False, "identificador": None, "redirect_url": None, "error": "Sin nodo inicio_pagoV2Result"}

    identificador = result.text.strip()
    if identificador.startswith("-1"):
        # Error de negocio devuelto por WS (p.ej. parámetros inválidos)
        return {
            "success": False,
            "identificador": None,
            "redirect_url": None,
            "error": identificador,
        }

    # Construir URL de redirección
    # t_ruta: si no te lo pasan, toma settings o variable de entorno
    if not t_ruta:
        t_ruta = os.environ.get("ZPAGOS_CODIGO_RUTA") or settings.ZPAGOS.get("T_RUTA", "")

    redirect_url = f"https://www.zonapagos.com/{t_ruta}/pago.asp?estado_pago=iniciar_pago&identificador={identificador}"
    return {"success": True, "identificador": identificador, "redirect_url": redirect_url, "error": None}

# --------------------------------------------------------------------------------------
# 2) VERIFICACIÓN DE PAGO (verificar_pago_v4)
# --------------------------------------------------------------------------------------
# def verificacion_pago_soap(
#     *,
#     int_id_comercio: str,
#     str_usr_comercio: str,
#     str_pwd_Comercio: str,
#     str_id_pago: str | int,
#     int_no_pago: int = -1,
# ):
#     """
#     Retorna:
#       {
#         "success": True/False,
#         "int_error": "0"|"−1",
#         "str_detalle": "...",
#         "cantidad_pagos": "n",
#         "res_pago": [ { ...campos parseados... }, ... ],
#         "error": None|"..."
#       }
#     """
#     envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
# <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
#   <soap:Body>
#     <verificar_pago_v4 xmlns="http://www.zonapagos.com/ws_verificar_pagosV4">
#       <int_id_comercio>{int_id_comercio}</int_id_comercio>
#       <str_usr_comercio>{_xml_escape(str_usr_comercio)}</str_usr_comercio>
#       <str_pwd_Comercio>{_xml_escape(str_pwd_Comercio)}</str_pwd_Comercio>
#       <str_id_pago>{_xml_escape(str(str_id_pago))}</str_id_pago>
#       <int_no_pago>{int_no_pago}</int_no_pago>
#     </verificar_pago_v4>
#   </soap:Body>
# </soap:Envelope>"""

#     tree = _post_soap(ZP_VERIFICAR_PAGO_URL, textwrap.dedent(envelope).strip())

#     n_error = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:int_error", NS)
#     n_detalle = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:str_detalle", NS)
#     n_cantidad = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:int_cantidad_pagos", NS)
#     n_res_pago = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:str_res_pago", NS)

#     int_error = (n_error.text or "").strip() if n_error is not None else "-1"
#     str_detalle = (n_detalle.text or "").strip() if n_detalle is not None else ""
#     cantidad = (n_cantidad.text or "0").strip() if n_cantidad is not None else "0"
#     raw = (n_res_pago.text or "").strip() if n_res_pago is not None else ""

#     if int_error != "0":
#         return {"success": False, "int_error": int_error, "str_detalle": str_detalle, "cantidad_pagos": "0", "res_pago": [], "error": str_detalle or "Error WS"}

#     pagos = []
#     if raw:
#         # Cada pago se separa por '|;|' y los campos por '|'
#         for chunk in raw.split("|;|"):
#             chunk = chunk.strip()
#             if not chunk:
#                 continue
#             parts = [p.strip() for p in chunk.split("|")]
#             # Campos base (ver doc): índices 0..14
#             base = {
#                 "int_n_pago": _get(parts, 0),
#                 "int_estado_pago": _get(parts, 1),
#                 "dbl_valor_pagado": _get(parts, 2),
#                 "dbl_valor_iva_pagado": _get(parts, 3),
#                 "str_descripcion": _get(parts, 4),
#                 "str_id_cliente": _get(parts, 5),
#                 "str_nombre": _get(parts, 6),
#                 "str_apellido": _get(parts, 7),
#                 "str_telefono": _get(parts, 8),
#                 "str_email": _get(parts, 9),
#                 "str_campo1": _get(parts, 10),
#                 "str_campo2": _get(parts, 11),
#                 "str_campo3": _get(parts, 12),
#                 "dat_fecha": _get(parts, 13),
#                 "int_id_forma_pago": _get(parts, 14),
#             }
#             medio = base["int_id_forma_pago"]

#             # Extensiones por medio
#             if medio == "29":  # PSE
#                 base.update({
#                     "str_ticketID": _get(parts, 15),
#                     "int_codigo_servico": _get(parts, 16),
#                     "int_codigo_banco": _get(parts, 17),
#                     "str_nombre_banco": _get(parts, 18),
#                     "str_codigo_transaccion": _get(parts, 19),
#                     "int_ciclo_transaccion": _get(parts, 20),
#                 })
#             elif medio == "32":  # Tarjeta Crédito
#                 base.update({
#                     "str_ticketID": _get(parts, 15),
#                     "int_num_tarjeta": _get(parts, 16),
#                     "str_franquicia": _get(parts, 17),
#                     "int_cod_aprobacion": _get(parts, 18),
#                     "int_num_recibo": _get(parts, 19),
#                 })

#             pagos.append(base)

#     return {"success": True, "int_error": int_error, "str_detalle": str_detalle, "cantidad_pagos": cantidad, "res_pago": pagos, "error": None}


def verificacion_pago_soap(
    *,
    int_id_comercio: str,
    str_usr_comercio: str,
    str_pwd_Comercio: str,
    str_id_pago: str | int,
    int_no_pago: int = -1,
):
    """
    Retorna:
      {
        "success": True/False,
        "int_error": "0"|"−1",
        "str_detalle": "...",
        "cantidad_pagos": "n",
        "res_pago": [ { ...campos parseados... }, ... ],
        "error": None|"..."
      }
    """
    envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <verificar_pago_v4 xmlns="http://www.zonapagos.com/ws_verificar_pagosV4">
      <int_id_comercio>{int_id_comercio}</int_id_comercio>
      <str_usr_comercio>{_xml_escape(str_usr_comercio)}</str_usr_comercio>
      <str_pwd_Comercio>{_xml_escape(str_pwd_Comercio)}</str_pwd_Comercio>
      <str_id_pago>{_xml_escape(str(str_id_pago))}</str_id_pago>
      <int_no_pago>{int_no_pago}</int_no_pago>
    </verificar_pago_v4>
  </soap:Body>
</soap:Envelope>"""

    tree = _post_soap(ZP_VERIFICAR_PAGO_URL, textwrap.dedent(envelope).strip())

    n_error = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:int_error", NS)
    n_detalle = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:str_detalle", NS)
    n_cantidad = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:int_cantidad_pagos", NS)
    n_res_pago = tree.find(".//soap:Body/zp_v:verificar_pago_v4Response/zp_v:str_res_pago", NS)

    int_error = (n_error.text or "").strip() if n_error is not None else "-1"
    str_detalle = (n_detalle.text or "").strip() if n_detalle is not None else ""
    cantidad = (n_cantidad.text or "0").strip() if n_cantidad is not None else "0"
    raw = (n_res_pago.text or "").strip() if n_res_pago is not None else ""

    if int_error != "0":
        return {
            "success": False,
            "int_error": int_error,
            "str_detalle": str_detalle,
            "cantidad_pagos": "0",
            "res_pago": [],
            "error": str_detalle or "Error WS"
        }

    pagos = []
    if raw:
        raw = f"|{raw}"
        # ----- NUEVO: normalización robusta -----
        raw = raw.replace(" ;", ";").replace("; ", ";")
        chunks = [c.strip() for c in raw.split(";") if c.strip()]

        if len(chunks) > 1:
            chunks.pop()

        for chunk in chunks:
            parts = [p.strip() for p in chunk.split("|")]

            # Campos mínimos esperados por contrato ZonaPagos
            base = {
                "int_n_pago": _get(parts, 1),
                "int_estado_pago": _get(parts, 2),
                "dbl_valor_pagado": _get(parts, 3),
                "dbl_valor_iva_pagado": _get(parts, 4),
                "str_descripcion": _get(parts, 5),
                "str_id_cliente": _get(parts, 6),
                "str_nombre": _get(parts, 7),
                "str_apellido": _get(parts, 8),
                "str_telefono": _get(parts, 9),
                "str_email": _get(parts, 10),
                "str_campo1": _get(parts, 11),
                "str_campo2": _get(parts, 12),
                "str_campo3": _get(parts, 13),
                "dat_fecha": _get(parts, 14),
                "int_id_forma_pago": _get(parts, 15),
            }

            medio = base["int_id_forma_pago"]

            # ----- NUEVO: más robusto para detectar medio -----
            if not medio and len(parts) > 21:
                # si no vino forma de pago en columna 14, intenta inferirla
                posible = _get(parts, 15)
                if posible.isdigit():
                    medio = posible
                    base["int_id_forma_pago"] = posible

            # ----- NUEVO: estructura extendida capturada según docs -----
            if medio == "29":   # PSE
                base.update({
                    "str_ticketID": _get(parts, 16),
                    "int_codigo_servico": _get(parts, 17),
                    "int_codigo_banco": _get(parts, 18),
                    "str_nombre_banco": _get(parts, 19),
                    "str_codigo_transaccion": _get(parts, 20),
                    "int_ciclo_transaccion": _get(parts, 21),
                })

            elif medio == "32":  # Tarjeta Crédito
                base.update({
                    "str_ticketID": _get(parts, 16),
                    "int_num_tarjeta": _get(parts, 17),
                    "str_franquicia": _get(parts, 18),
                    "int_cod_aprobacion": _get(parts, 19),
                    "int_num_recibo": _get(parts, 20),
                })

            elif medio in ("3", "28", "30", "31", "33"):
                # otros medios (según documentación)
                # LOS CAMPOS ADICIONALES VARÍAN
                base["extra"] = parts[16:]  # <-- se guardan sin perder información

            pagos.append(base)

    return {
        "success": True,
        "int_error": int_error,
        "str_detalle": str_detalle,
        "cantidad_pagos": cantidad,
        "res_pago": pagos,
        "error": None
    }

# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def _xml_escape(s: str) -> str:
    if s is None:
        return ""
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )

def _get(arr, idx, default=""):
    try:
        return arr[idx]
    except Exception:
        return default

