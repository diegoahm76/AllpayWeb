# from django.apps import AppConfig


# class SeguridadConfig(AppConfig):
#     default_auto_field = "django.db.models.BigAutoField"
#     name = "seguridad"

#     def ready(self):
#         from seguridad.jobs.updater import start
#         start()
#         import seguridad.signals.alertas_signal

import os
import sys
from django.apps import AppConfig


class SeguridadConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "seguridad"

    def ready(self):
        # Importar signals (esto siempre debe ejecutarse)
        import seguridad.signals.alertas_signal  # noqa: F401
        
        # El scheduler solo debe iniciarse bajo condiciones específicas
        if self._should_start_scheduler():
            self._start_scheduler()
    
    def _should_start_scheduler(self) -> bool:
        """
        Determina si el scheduler debe iniciarse.
        Evita iniciar en situaciones no deseadas.
        """
        # 1. No iniciar durante migraciones u otros comandos de management
        if len(sys.argv) > 1:
            comando = sys.argv[1]
            comandos_excluidos = {
                'migrate', 
                'makemigrations', 
                'collectstatic',
                'createsuperuser',
                'shell',
                'dbshell',
                'test',
                'check',
                'showmigrations',
                'flush',
                'loaddata',
                'dumpdata',
                'inspectdb',
                'diffsettings',
            }
            if comando in comandos_excluidos:
                return False
        
        # 2. En desarrollo con runserver: solo en el proceso principal (reloader)
        #    RUN_MAIN='true' indica que es el proceso hijo del autoreload
        if os.environ.get('RUN_MAIN') != 'true':
            # Si no existe RUN_MAIN, podría ser producción (Gunicorn/uWSGI)
            # o el proceso padre del autoreload
            if 'runserver' in sys.argv:
                return False  # Es el proceso padre, esperar al hijo
        
        return True
    
    def _start_scheduler(self):
        """Inicia el scheduler de forma segura"""
        try:
            from seguridad.jobs.updater import start, is_running
            
            if not is_running():
                start()
                print("Scheduler iniciado desde SeguridadConfig.ready()")
            else:
                print("Scheduler ya estaba corriendo")
                
        except Exception as e:
            # No fallar la aplicación si el scheduler no puede iniciar
            print(f"Error iniciando scheduler: {e}")
            import traceback
            traceback.print_exc()