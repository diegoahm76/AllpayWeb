from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import time


class SleepHelloView(APIView):
    """
    Endpoint simple que espera un tiempo y devuelve un saludo.
    GET /apii/reportes/sleep-hello/

    Por defecto duerme 120 segundos (2 minutos).
    Parámetros opcionales:
      - seconds: número de segundos a esperar
      - minutes: número de minutos a esperar

    Si se envían ambos, se suman (total = minutes*60 + seconds).
    Se aplican límites de seguridad (mínimo 0, máximo 600 segundos en total).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        seconds_param = request.query_params.get("seconds")
        minutes_param = request.query_params.get("minutes")

        # Valores base por defecto (2 minutos)
        total_seconds = 120
        parsed_seconds = 0
        parsed_minutes = 0

        # Parseo robusto de segundos
        if seconds_param is not None:
            try:
                parsed_seconds = int(seconds_param)
            except (TypeError, ValueError):
                parsed_seconds = 0

        # Parseo robusto de minutos
        if minutes_param is not None:
            try:
                parsed_minutes = int(minutes_param)
            except (TypeError, ValueError):
                parsed_minutes = 0

        if seconds_param is not None or minutes_param is not None:
            total_seconds = max(0, parsed_minutes * 60 + parsed_seconds)

        # Límite superior de seguridad (10 minutos)
        if total_seconds > 600:
            total_seconds = 600

        time.sleep(total_seconds)
        return Response({
            "message": "hello",
            "slept_seconds": total_seconds,
            "requested": {
                "minutes": parsed_minutes,
                "seconds": parsed_seconds,
            },
        })
