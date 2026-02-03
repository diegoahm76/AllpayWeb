from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from recaudos.choices.cod_tipo_cobro_choices import cod_tipo_cobro_CHOICES
from recaudos.choices.cod_estado_choices import cod_estado_CHOICES
from recaudos.choices.cod_tipo_cargue_choices import cod_tipo_cargue_CHOICES
from recaudos.choices.cod_tipo_paz_y_salvo_choices import cod_tipo_paz_y_salvo_CHOICES
from recaudos.choices.cod_estado_acuerdo_choices import cod_estado_acuerdo_CHOICES
from recaudos.choices.cod_estado_factura_choices import cod_estado_factura_CHOICES




class CodigoTipoCobro(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_tipo_cobro_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de cobros', 'data': choices}, status=status.HTTP_200_OK)
    

class CodigoEstado(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_estado_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes codigos de estados', 'data': choices}, status=status.HTTP_200_OK)
    


class CodigoTipoCargue(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_tipo_cargue_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de cargue', 'data': choices}, status=status.HTTP_200_OK)


class CodigoTipoPazySalvo(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_tipo_paz_y_salvo_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes tipos de paz y salvo', 'data': choices}, status=status.HTTP_200_OK)
    

class CodigoEstadoAcuerdoPago(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_estado_acuerdo_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes estados de acuerdos de pago', 'data': choices}, status=status.HTTP_200_OK)
    
class CodigoEstadoFacturaUnica(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        choices = cod_estado_factura_CHOICES
        return Response({'success':True, 'detail':'Se encontraron los siguientes estados de la factura unica', 'data': choices}, status=status.HTTP_200_OK)
    
