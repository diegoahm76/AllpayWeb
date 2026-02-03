from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class SSEService:

    def __init__(self):
        self.channel_layer = get_channel_layer()

    def send_alert_to_user(self, user_id, alert_message):
        """
        Método para enviar una alerta a un usuario específico.
        """
        group_name = f"user_{user_id}"  # El grupo del usuario basado en su ID

        async_to_sync(self.channel_layer.group_send)(
            group_name,  # El grupo específico del usuario
            {
                "type": "alert_message",
                "message": alert_message
            }
        )

    def send_alert_to_multiple_users(self, user_ids, alert_message):
        """
        Método para enviar una alerta a varios usuarios.
        """
        for user_id in user_ids:
            self.send_alert_to_user(user_id, alert_message)
