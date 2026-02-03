from django.conf import settings
import ipaddress

# Mapear tipo de documento interno -> ZP (ejemplo)
DOC_MAP = {
    "CC": "CC", "CE": "CE", "NIT": "NIT", "TI": "TI", "PPN": "PPN",
}

def map_doc(tipo) -> str:
    """Mapea el tipo de documento interno al formato de ZonaPagos.
    Acepta string o instancia (p.ej., TipoDocumento) e intenta extraer un código.
    """
    if not tipo:
        return "CC"

    # Si es objeto, intentar extraer atributos comunes
    if not isinstance(tipo, str):
        for attr in ("codigo", "cod", "abreviatura", "sigla", "nombre", "code"):
            val = getattr(tipo, attr, None)
            if isinstance(val, str) and val.strip():
                tipo = val
                break
        else:
            # Fallback seguro
            return "CC"

    return DOC_MAP.get(tipo.strip().upper(), "CC")

def ip_permitida(ip: str) -> bool:
    """Valida si la IP está en la lista de IPs permitidas"""
    redes = settings.ZPAGOS.get("IPS_PERMITIDAS") or []
    if not redes:
        return True
    ip_obj = ipaddress.ip_address(ip)
    for r in redes:
        try:
            if ip_obj in ipaddress.ip_network(r, strict=False):
                return True
        except Exception:
            continue
    return False

# Estados finales
ESTADOS_FINALES = {"1", "1000", "1001", "4000", "4003"}
ESTADOS_PEND = {"999", "4001"} 