from seguridad.choices.subsistemas_choices import subsistemas_CHOICES
from seguridad.choices.tipo_usuario_choices import tipo_usuario_CHOICES
from seguridad.choices.direcciones_choices import direcciones_CHOICES
from seguridad.choices.tipo_persona_choices import tipo_persona_CHOICES
from seguridad.choices.cod_naturaleza_empresa_choices import cod_naturaleza_empresa_CHOICES
from seguridad.choices.tipo_direccion_choices import tipo_direccion_CHOICES
from seguridad.choices.cod_tipo_comprador import cod_tipo_comprador_CHOICES
from seguridad.choices.alertas_choices import COD_TIPOALERTAS_CHOICES, NIVEL_PRIORIDAD_CHOICES, cod_tipo_perfil_CHOICES, CATEGORIA_ALERTA_CHOICES
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status



class TipoCompradorChoices(APIView):
    def get(self,request):
        choices = cod_tipo_comprador_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': choices}, status=status.HTTP_200_OK) 


class SubsistemasChoices(APIView):
    def get(self,request):
        choices = subsistemas_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes subsistemas', 'data': choices}, status=status.HTTP_200_OK)


class TipoUsuarioChoices(APIView):
    def get(self,request):
        choices = tipo_usuario_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de usuario', 'data': choices}, status=status.HTTP_200_OK)

class DireccionesChoices(APIView):
    def get(self,request):
        choices = direcciones_CHOICES
        return Response(choices)


class TipoPersonaChoices(APIView):
    def get(self,request):
        choices = tipo_persona_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de persona', 'data': choices}, status=status.HTTP_200_OK)

class CodNaturalezaEmpresaChoices(APIView):
    def get(self,request):
        choices = cod_naturaleza_empresa_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes codigos de naturaleza de empresa', 'data': choices}, status=status.HTTP_200_OK)

class TipoDireccionChoices(APIView):
    def get(self,request):
        choices = tipo_direccion_CHOICES
        return Response(choices)
    


class NivelPrioridadChoices(APIView):
    def get(self,request):
        choices = NIVEL_PRIORIDAD_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes niveles de prioridad', 'data': choices}, status=status.HTTP_200_OK)
    

class CodTipoPerfilChoices(APIView):
    def get(self,request):
        choices = cod_tipo_perfil_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes codigos de perfil', 'data': choices}, status=status.HTTP_200_OK)
