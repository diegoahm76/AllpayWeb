# from datetime import datetime
# from seguridad.utils import generar_alerta_segundo_plano
# from recaudos.utils import ejecutar_sonda_pagos, activarSonda

# def generar_alerta():
# 	print("Lo e")
# 	generar_alerta_segundo_plano() 
# 	print('TAREA FINALIZADA')


# def sonda_pagos():
#     # Lógica para ejecutar la sonda de pagos
#     print("Ejecutando sonda de pagos...")
#     activar = activarSonda()
#     if activar:
#         print("Entra aqui sonda")
#         ejecutar_sonda_pagos()
#     print("Sonda de pagos finalizada.")

import traceback
from functools import wraps
from django.core.cache import cache

from seguridad.utils import generar_alerta_segundo_plano

LOCK_TIMEOUT = 300  # 5 minutos


def with_lock(lock_name, timeout=LOCK_TIMEOUT):
    """
    Decorador para evitar ejecuciones concurrentes usando cache como lock.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            lock_key = f"job_lock:{lock_name}"
            
            acquired = cache.add(lock_key, "1", timeout)
            
            if not acquired:
                print(f"Job {lock_name} ya está en ejecución, saltando...")
                return None
            
            try:
                return func(*args, **kwargs)
            finally:
                # Siempre liberar el lock
                try:
                    cache.delete(lock_key)
                except Exception:
                    pass
        
        return wrapper
    return decorator


def generar_alerta():
    """Job para generar alertas programadas"""
    print("Iniciando generación de alertas...")
    
    try:
        generar_alerta_segundo_plano()
        print("Alertas generadas correctamente")
    except Exception as e:
        print(f"Error generando alertas: {e}")
        traceback.print_exc()
        raise


@with_lock("sonda_pagos")
def sonda_pagos():
    """
    Job principal de la sonda de pagos.
    Verifica pagos pendientes y actualiza su estado.
    """
    from recaudos.services.sonda_service import SondaPagosService
    
    print("Iniciando sonda de pagos...")
    
    try:
        service = SondaPagosService()
        resultado = service.ejecutar()
        
        print(
            f"Sonda finalizada: {resultado['procesados']}/{resultado['total']} "
            f"pagos procesados, {resultado['errores']} errores, "
            f"{resultado['sin_cambios']} sin cambios"
        )
        
        return resultado
        
    except Exception as e:
        print(f"Error en sonda de pagos: {e}")
        traceback.print_exc()
        raise