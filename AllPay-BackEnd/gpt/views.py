import time
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import QuestionSerializer, AnswerSerializer
from .utils import openai_service


logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method='post',
    request_body=QuestionSerializer,
    responses={
        200: AnswerSerializer,
        400: 'Error en la solicitud',
        401: 'No autorizado',
        500: 'Error interno del servidor'
    },
    operation_description="Endpoint para hacer preguntas sobre el manual de Fedecacao usando GPT",
    operation_summary="Pregunta al manual de Fedecacao",
    tags=['GPT Assistant']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_question(request):
    """
    Endpoint para hacer preguntas sobre el manual de Fedecacao.
    
    Recibe una pregunta del usuario y retorna una respuesta generada por GPT
    basada en el manual de usuario de Fedecacao.
    """

    
    try:
        start_time = time.time()
        serializer = QuestionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Datos inválidos", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        question = serializer.validated_data['question']
        max_tokens = serializer.validated_data['max_output_tokens']
        logger.info(f"Usuario {request.user.id_usuario} pregunta: {question[:100]}...")
        
        # Realizar consulta a OpenAI
        try:
            answer, sources = openai_service.ask_question(question, max_tokens)
        except Exception as e:
            logger.error(f"Error en OpenAI: {str(e)}")
            return Response(
                {"error": "Error al procesar la pregunta. Inténtalo de nuevo más tarde."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        processing_time = time.time() - start_time
        
        # Preparar respuesta
        response_data = {
            "answer": answer,
            "sources": sources,
            "processing_time": round(processing_time, 2)
        }
        
        # Validar respuesta
        response_serializer = AnswerSerializer(data=response_data)
        if response_serializer.is_valid():
            logger.info(f"Respuesta generada en {processing_time:.2f}s para usuario {request.user.id_usuario}")
            return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
        else:
            logger.error(f"Error validando respuesta: {response_serializer.errors}")
            return Response(
                {"error": "Error interno al procesar la respuesta"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        return Response(
            {"error": "Error interno del servidor"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@swagger_auto_schema(
    method='get',
    responses={
        200: openapi.Response(
            description="Estado del servicio GPT",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'status': openapi.Schema(type=openapi.TYPE_STRING),
                    'model': openapi.Schema(type=openapi.TYPE_STRING),
                    'files_configured': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'file_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                }
            )
        )
    },
    operation_description="Verifica el estado del servicio GPT",
    operation_summary="Estado del servicio GPT",
    tags=['GPT Assistant']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_status(request):
    """
    Endpoint para verificar el estado del servicio GPT.
    """
    try:
        import os
        from .utils import TARGET_FILE_IDS, MODEL, OPENAI_API_KEY, VS_NAME
        
        # Intentar obtener VS ID de entorno y/o archivo
        vector_store_id = "No configurado"
        vector_store_source = "none"
        try:
            from .utils import load_vs_id
            env_vs = os.environ.get("OPENAI_VECTOR_STORE_ID")
            if env_vs:
                vector_store_id = env_vs
                vector_store_source = "env"
            else:
                cached_vs_id = load_vs_id()
                if cached_vs_id:
                    vector_store_id = cached_vs_id
                    vector_store_source = "file"
        except Exception:
            pass
        
        status_info = {
            "status": "active",
            "model": MODEL,
            "api_key_configured": bool(OPENAI_API_KEY),
            "files_configured": len(TARGET_FILE_IDS) > 0,
            "file_count": len(TARGET_FILE_IDS),
            "file_ids": TARGET_FILE_IDS if len(TARGET_FILE_IDS) <= 5 else TARGET_FILE_IDS[:5] + ["..."],
            "vector_store_name": VS_NAME,
            "vector_store_id": vector_store_id,
            "vector_store_source": vector_store_source,
            "reasoning_effort": os.environ.get("OPENAI_REASONING_EFFORT", "low"),
            "max_output_tokens": int(os.environ.get("OPENAI_MAX_OUTPUT_TOKENS", "2000")),
            "max_continuations": int(os.environ.get("OPENAI_MAX_CONTINUATIONS", "4")),
        }
        
        return Response(status_info, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error verificando estado del servicio: {str(e)}")
        return Response(
            {"error": "Error al verificar estado del servicio"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
