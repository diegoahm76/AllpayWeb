from rest_framework import serializers


class QuestionSerializer(serializers.Serializer):
    """Serializer para recibir preguntas del usuario"""
    question = serializers.CharField(
        max_length=1000,
        help_text="Pregunta que el usuario quiere hacer sobre el manual de Fedecacao"
    )
    max_output_tokens = serializers.IntegerField(
        default=800,
        min_value=100,
        max_value=1500,
        help_text="Número máximo de tokens en la respuesta"
    )


class AnswerSerializer(serializers.Serializer):
    """Serializer para la respuesta del modelo GPT"""
    answer = serializers.CharField(
        help_text="Respuesta generada por el modelo GPT"
    )
    sources = serializers.ListField(
        child=serializers.DictField(),
        help_text="Fuentes citadas en la respuesta",
        required=False
    )
    processing_time = serializers.FloatField(
        help_text="Tiempo de procesamiento en segundos",
        required=False
    )
