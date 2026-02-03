# alerts/signals.py
import json
import redis
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from seguridad.models.alertas_models import AlertasBandejaAlertaPersona

# Configura tu cliente Redis
# redis_client = redis.Redis(
#     host=settings.REDIS_HOST,
#     port=settings.REDIS_PORT,
#     db=settings.REDIS_DB,
# )

# @receiver(post_save, sender=AlertasBandejaAlertaPersona)
# def publish_new_alert(sender, instance, created, **kwargs):
#     if not created:
#         return  # sólo publicar en creación

#     payload = {
#         "id": instance.id,
#         "type": instance.alert_type,
#         "message": instance.message,
#         "created_at": instance.created_at.isoformat(),
#     }
#     channel = f"alerts_user_{instance.user_id}"
#     redis_client.publish(channel, json.dumps(payload))
