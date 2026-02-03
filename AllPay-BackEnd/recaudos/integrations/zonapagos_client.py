import requests
import json
from django.conf import settings

BASE = settings.ZPAGOS["BASE"]

def inicio_pago(body: dict) -> dict:
    """Inicia un pago en ZonaPagos (usa recurso InicioPago del BASE configurado)"""
    url = f"{BASE}/InicioPago"
    r = None
    try:
        # Serializar manualmente para mantener tipos numéricos
        headers = {'Content-Type': 'application/json'}
        data = json.dumps(body, separators=(',', ':'))
        
        # ===== DEBUG DETALLADO =====
        print("\n" + "="*80)
        print("🚀 ENVIANDO PETICIÓN A ZONAPAGOS")
        print("="*80)
        print(f"📍 URL: {url}")
        print(f"📦 Headers: {headers}")
        print(f"\n📄 JSON RAW (exactamente lo que se envía):")
        print(data)
        print(f"\n📏 Longitud: {len(data)} bytes")
        
        # Verificar tipos en el JSON
        print(f"\n🔍 VERIFICACIÓN DE TIPOS:")
        body_parsed = json.loads(data)
        print(f"  InformacionPago:")
        for k, v in body_parsed.get('InformacionPago', {}).items():
            tipo = type(v).__name__
            print(f"    {k}: {v!r} ({tipo})")
        print(f"  InformacionSeguridad:")
        for k, v in body_parsed.get('InformacionSeguridad', {}).items():
            tipo = type(v).__name__
            print(f"    {k}: {v!r} ({tipo})")
        print(f"  AdicionalesConfiguracion: {body_parsed.get('AdicionalesConfiguracion', [])}")
        print("="*80 + "\n")
        
        # Hacer la petición
        r = requests.post(url, data=data, headers=headers, timeout=30)
        
        # ===== DEBUG RESPUESTA =====
        print("\n" + "="*80)
        print("📥 RESPUESTA DE ZONAPAGOS")
        print("="*80)
        print(f"📊 Status Code: {r.status_code}")
        print(f"📦 Headers de respuesta: {dict(r.headers)}")
        print(f"\n📄 Body de respuesta (raw):")
        print(r.text[:1000])  # Primeros 1000 caracteres
        print("="*80 + "\n")
        
        r.raise_for_status()
        resp_json = r.json()
        
        print(f"✅ Respuesta parseada como JSON:")
        print(json.dumps(resp_json, indent=2, ensure_ascii=False))
        print("\n")
        
        return resp_json
    except requests.HTTPError as ex:
        print(f"\n❌ ERROR HTTP:")
        print(f"  Status: {r.status_code if r else 'N/A'}")
        print(f"  Respuesta: {r.text[:500] if r else str(ex)}")
        return {
            "int_codigo": -1,
            "str_descripcion_error": f"HTTP {r.status_code}: {r.text[:500] if r is not None else str(ex)}",
            "_raw_text": r.text if r is not None else None
        }
    except Exception as ex:
        print(f"\n❌ ERROR GENERAL:")
        print(f"  Tipo: {type(ex).__name__}")
        print(f"  Mensaje: {str(ex)}")
        return {
            "int_codigo": -1,
            "str_descripcion_error": f"Error: {str(ex)}",
            "_raw_text": None
        }

def verificacion_pago(body: dict) -> dict:
    """Verifica el estado de un pago en ZonaPagos"""
    url = f"{BASE}/VerificaciónPago"
    try:
        # Serializar manualmente para mantener tipos numéricos
        headers = {'Content-Type': 'application/json'}
        data = json.dumps(body, separators=(',', ':'))
        r = requests.post(url, data=data, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as ex:
        return {
            "int_estado": -1,
            "str_detalle": f"HTTP {r.status_code}: {r.text[:500] if r is not None else str(ex)}",
            "_raw_text": r.text if r is not None else None
        }