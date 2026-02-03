# from apscheduler.schedulers.background import BackgroundScheduler
# from apscheduler.triggers.cron import CronTrigger
# from .jobs import generar_alerta, sonda_pagos

# scheduler = None

# def start():
# 	global scheduler
# 	scheduler = BackgroundScheduler()

# 	# Tarea programada para generar alertas en horarios específicos
# 	scheduler.add_job(
# 		generar_alerta, 
# 		trigger=CronTrigger(hour='9,13,16,17', minute=59, second=0),
# 		id='alerta_job'
# 	)

# 	# Tarea programada para sonda_pagos cada 5 minutos
# 	scheduler.add_job(
# 		sonda_pagos,
# 		trigger=CronTrigger(hour='0-23', minute='*/5', second=0),
# 		id='sonda_pagos_job'
# 	)

# 	# # Tarea programada para sonda_pagos cada hora
# 	# scheduler.add_job(
# 	# 	sonda_pagos,
# 	# 	trigger=CronTrigger(minute=0, second=0),
# 	# 	id='sonda_pagos_hourly_job'
# 	# )

# 	scheduler.start()
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
import traceback

scheduler = None
_is_running = False


def job_listener(event):
    """Listener para monitorear eventos de jobs"""
    if event.exception:
        print(f"Job {event.job_id} falló con excepción: {event.exception}")
        # Imprimir traceback completo
        traceback.print_exception(
            type(event.exception), 
            event.exception, 
            event.exception.__traceback__
        )
    else:
        print(f"Job {event.job_id} ejecutado correctamente")


def start():
    global scheduler, _is_running
    
    if _is_running:
        print("Scheduler ya está corriendo, ignorando start()")
        return
    
    try:
        from .jobs import generar_alerta, sonda_pagos
        
        scheduler = BackgroundScheduler(
            job_defaults={
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 60
            }
        )
        
        scheduler.add_listener(job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)

        scheduler.add_job(
            generar_alerta, 
            trigger=CronTrigger(hour='9,13,16,17', minute=59, second=0),
            id='alerta_job',
            replace_existing=True
        )

        scheduler.add_job(
            sonda_pagos,
            trigger=CronTrigger(minute='*/5', second=0),
            id='sonda_pagos_job',
            replace_existing=True
        )

        scheduler.start()
        _is_running = True
        print("Scheduler iniciado correctamente")
        
    except Exception as e:
        print(f"Error al iniciar scheduler: {e}")
        traceback.print_exc()
        raise


def stop():
    """Detiene el scheduler de forma segura"""
    global scheduler, _is_running
    
    if scheduler and _is_running:
        scheduler.shutdown(wait=True)
        _is_running = False
        print("Scheduler detenido correctamente")


def is_running():
    """Verifica si el scheduler está corriendo"""
    return _is_running and scheduler and scheduler.running