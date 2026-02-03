from datetime import datetime
from rest_framework import generics
from seguridad.serializers.alertas_serializers import BandejaAlertaPersonaGetSerializer, AlertasBandejaAlertaPersonaSerializer, ConfiguracionClaseAlertaGetSerializer, FechaClaseAlertaGetSerializer, FechaClaseAlertaPostSerializer, PersonasAAlertarGetSerializer, PersonasAAlertarPostSerializer
from seguridad.models.alertas_models import AlertasProgramadas, BandejaAlertaPersona, AlertasBandejaAlertaPersona, ConfiguracionClaseAlerta, FechaClaseAlerta, PersonasAAlertar
from rest_framework.permissions import IsAuthenticated
from seguridad.choices.alertas_choices import cod_tipo_perfil_CHOICES
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from seguridad.utils import Util

class BandejaAlertaPersonaGetByPersona(generics.ListAPIView):
    serializer_class = BandejaAlertaPersonaGetSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self,request):
        id_persona = request.user.persona.id_persona
        bandeja = BandejaAlertaPersona.objects.filter(id_persona=id_persona).first()

        if not bandeja:
            raise NotFound("La persona no tiene bandeja de alertas porfavor comunicarse con un administrador.")
        
        serializer = self.serializer_class(bandeja)
        return Response({'success':True,'detail':"Se encontron los siguientes  registros.",'data':serializer.data},status=status.HTTP_200_OK)


class AlertasBandejaAlertaPersonaGetByBandeja(generics.ListAPIView):
    serializer_class = AlertasBandejaAlertaPersonaSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self,request, id_bandeja):        
        leidos = request.query_params.get('leidos', None)
        alertas = AlertasBandejaAlertaPersona.objects.filter(id_bandeja_alerta_persona=id_bandeja).order_by('-id_alerta_bandeja_alerta_persona')

        if leidos:
            alertas = alertas.filter(leido=leidos)

        serializer = self.serializer_class(alertas, many=True)
        return Response({'success':True,'detail':"Se encontron los siguientes  registros.",'data':serializer.data},status=status.HTTP_200_OK)
    

class ConfiguracionClaseAlertaView(generics.GenericAPIView):
    serializer_class = ConfiguracionClaseAlertaGetSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request): 
        alerta = ConfiguracionClaseAlerta.objects.all()
        if not alerta:
            raise NotFound("No se encontraron configuraciones de clase de alerta.")
        
        serializer = self.serializer_class(alerta,many=True)
        return Response({'success':True,'detail':"Se encontron los siguientes  registros.",'data':serializer.data},status=status.HTTP_200_OK)
    
    def put(self, request, pk):
        instance = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=pk).first()
        data_in=request.data
        # Verificar si la instancia existe
        if not instance:
            return Response({'detail': 'La configuración de clase de alerta no existe.'}, status=status.HTTP_404_NOT_FOUND)
        cant_dias_previas = instance.cant_dias_previas
        frecuencia_previas = instance.frecuencia_previas
        cant_dias_post = instance.cant_dias_post
        frecuencia_post = instance.frecuencia_post

        if 'cant_dias_previas' in data_in and data_in['cant_dias_previas']:
            cant_dias_previas = data_in['cant_dias_previas']

        if 'frecuencia_previas' in data_in and data_in['frecuencia_previas']:
            frecuencia_previas = data_in['frecuencia_previas']

        if 'cant_dias_post' in data_in and data_in['cant_dias_post']:
            cant_dias_post = data_in['cant_dias_post']

        if 'frecuencia_post' in data_in and data_in['frecuencia_post']:
            frecuencia_post = data_in['frecuencia_post']

        if frecuencia_previas and cant_dias_previas and frecuencia_previas >= cant_dias_previas:
            raise ValidationError("La frecuencia previa debe ser menor que la cantidad de días previos")

        if frecuencia_post and cant_dias_post and frecuencia_post >= cant_dias_post:
            raise ValidationError("La frecuencia posterior debe ser menor que la cantidad de días posteriores")

        try:                
            serializer = self.serializer_class(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            instance=serializer.save()

            cambios={       
                "requiere_envio_email": instance.envios_email,
                "nivel_prioridad": instance.nivel_prioridad,
                "activa": instance.activa
            }
                
            alertas_programadas=AlertasProgramadas.objects.filter(cod_clase_alerta=instance.cod_clase_alerta)
            print(instance.cod_clase_alerta)
           
            for alerta_programada in alertas_programadas:
                print(alerta_programada.id_alerta_programada)
                response_alerta_programada = Util.actualizar_alerta_programada(cambios, alerta_programada.id_alerta_programada)
                if not response_alerta_programada:
                    return response_alerta_programada
                print(response_alerta_programada)

        except ValidationError as e:       
            raise ValidationError(e.detail)
        
        return Response({'success': True, 'detail': 'Se actualizó la configuración de clase de alerta correctamente.', 'data': serializer.data}, status=status.HTTP_200_OK)



class PersonasAAlertarView(generics.CreateAPIView):
    serializer_class = PersonasAAlertarPostSerializer
    permission_classes = [IsAuthenticated]
    queryset = PersonasAAlertar.objects.all()
    
    def crear_persona_alerta(self, data_in):

        programadas_actualizadas=[]
        if 'cod_clase_alerta' not in data_in:
            raise ValidationError('El código de la clase de alerta es requerido.')

        if 'es_responsable_directo' not in data_in:
            data_in['es_responsable_directo']=False

        data_in['registro_editable']=True
        configuracion = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta']).first()

        if not configuracion:
            raise ValidationError('No existe esta alerta.')

        if data_in['es_responsable_directo']:
            if not configuracion.asignar_responsable:
                raise ValidationError("Esta alerta no requiere responsable directo.")

        if 'id_persona' not in data_in:
            data_in['id_persona'] = None

        if 'perfil_sistema' not in data_in:
            data_in['perfil_sistema'] = None   

        if not data_in['id_persona'] and not data_in['perfil_sistema']:
            raise ValidationError("Debe existir al menos un destinatario.")

        campos_no_nulos = sum([1 for campo in [data_in['id_persona'], data_in['perfil_sistema']] if campo])
        print(campos_no_nulos)

        # Verificamos que solo uno de los campos no sea nulo
        if campos_no_nulos != 1:
            raise ValidationError("Debe existir solo un destinatario válido.")

        # Verificar que no es un registro repetido
        registro_existente = PersonasAAlertar.objects.filter(
            id_persona=data_in['id_persona'],
            perfil_sistema=data_in['perfil_sistema'],
            cod_clase_alerta=data_in['cod_clase_alerta']
        ).exists()

        if registro_existente:
            raise ValidationError("El destinatario ya existe en esta alerta.")

        if data_in['es_responsable_directo']:
                
            directo = PersonasAAlertar.objects.filter(es_responsable_directo=True,cod_clase_alerta=configuracion.cod_clase_alerta)
            if directo:
                raise ValidationError("Ya existe un responsable directo")
        
        try:
            serializador = PersonasAAlertarPostSerializer(data=data_in)
            
            serializador.is_valid(raise_exception=True)
            instance=serializador.save()

            alertas_programadas =AlertasProgramadas.objects.filter(cod_clase_alerta=instance.cod_clase_alerta)
            if alertas_programadas:
                for programada in alertas_programadas:
                    response_alerta_programada = Util.actualizar_alerta_programada({},programada.id_alerta_programada)
                    if not response_alerta_programada:
                        return response_alerta_programada
                    programadas_actualizadas.append(response_alerta_programada)

            return Response({'success': True, 'detail': 'Se crearon los registros correctamente', 'data': serializador.data,'alertas_programadas':programadas_actualizadas}, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            raise ValidationError( e.detail)
        
    def get(self,request,cod):
        perfiles = cod_tipo_perfil_CHOICES
        
        personas_alertar = PersonasAAlertar.objects.filter(cod_clase_alerta=cod)
                
        if not personas_alertar:
            raise NotFound("No existe esta alerta.")
        
        serializer = PersonasAAlertarGetSerializer(personas_alertar,many=True)
        
        datos=serializer.data
        diccionario_ordenado=[]
        for dato in datos:
            destinatario=""
            detalle=""
            nombre=""
            principal="No"

            if dato['id_persona']:
                destinatario="Persona especifica"
                detalle=dato['numero_documento']
                nombre=dato['nombre_completo']

            if dato['perfil_sistema']:
                destinatario="Perfil del sistema"
                for cod, nombre_perfil in perfiles:
                    if dato['perfil_sistema']==cod:
                        detalle=nombre_perfil
                        break

            if dato['es_responsable_directo']:
                principal='Si'
            diccionario_ordenado.append({**dato,'datos_reordenados':{'destinatario':destinatario,'detalle':detalle,"nombre":nombre,"principal":principal}})

        return Response({'success':True,'detail':"Se encontron los siguientes  registros.",'data':diccionario_ordenado},status=status.HTTP_200_OK)


    def post(self, request):
        data_in = request.data
        response_data = self.crear_persona_alerta(data_in)
        return response_data
    
    def delete(self,request,cod):
        persona = PersonasAAlertar.objects.filter(id_persona_alertar=cod).first()
        cambios_alergas_generadas={}
        programadas_actualizadas=[]
        if not persona:
            raise NotFound("No existe la persona a eliminar.")
        if persona.es_responsable_directo:
            if persona.id_persona: 
                cambios_alergas_generadas['id_persona_implicada']=None

            if persona.perfil_sistema:
                cambios_alergas_generadas['perfil_sistema_implicado']=None
                
        serializer = self.serializer_class(persona) 
        persona.delete()
        alertas_programadas =AlertasProgramadas.objects.filter(cod_clase_alerta=persona.cod_clase_alerta)
        if alertas_programadas:
            for programada in alertas_programadas:
                response_programada = Util.actualizar_alerta_programada(cambios_alergas_generadas,programada.id_alerta_programada)
                if not response_programada:
                    raise PermissionDenied("No se pudo eliminar la alerta programada.")
                programadas_actualizadas.append(response_programada)
 
        return Response({'success':True,'detail':'Se elimino la persona correctamente.','data':serializer.data},status=status.HTTP_200_OK)

class FechaClaseAlertaView(generics.CreateAPIView):
    serializer_class = FechaClaseAlertaPostSerializer
    permission_classes = [IsAuthenticated]
    queryset = FechaClaseAlerta.objects.all()

    def get(self,request,cod):
        fechas = FechaClaseAlerta.objects.filter(cod_clase_alerta=cod)
                
        if not fechas:
            raise NotFound("No existe fechas asociadas a esta alerta.")
        
        serializer = FechaClaseAlertaGetSerializer(fechas, many=True)
        return Response({'success':True,'detail':"Se encontron los siguientes  registros.",'data':serializer.data},status=status.HTTP_200_OK)

    
    def post(self,request):
        data_in = request.data
        dia= data_in.get('dia_cumplimiento')
        mes=data_in.get('mes_cumplimiento')
        agno=data_in.get('age_cumplimiento')

        if 'age_cumplimiento' not in data_in:
            data_in['age_cumplimiento']=None
        try:
            fechas=FechaClaseAlerta.objects.filter(cod_clase_alerta=data_in['cod_clase_alerta'],dia_cumplimiento=dia, mes_cumplimiento=mes)
            for fecha in fechas:
                if agno is None:
                    raise ValidationError("Esta alerta ya cuenta con fechas dirigidas a estos dias con año especifico.")
                if fecha.age_cumplimiento is None:
                    raise ValidationError("Esta alerta ya se encuentra configurada para esta fecha.")
                elif fecha.age_cumplimiento==agno:
                    raise ValidationError("Esta alerta ya se encuentra configurada para esta fecha.(CON AÑO)")

            serializer = self.serializer_class(data=data_in)
            serializer.is_valid(raise_exception=True)
            instance=serializer.save()

            fecha_alerta={'dia_cumplimiento':instance.dia_cumplimiento,'mes_cumplimiento':instance.mes_cumplimiento,'age_cumplimiento':instance.age_cumplimiento,'cod_clase_alerta':data_in['cod_clase_alerta']}

            response_alerta=Util.crear_alerta_programada(fecha_alerta)
            if not response_alerta:
                raise PermissionDenied("No se pudo crear la alerta programada.")
           
            return Response({'success':True,'detail':'Se crearon los registros correctamente','data':{'fecha_clase_alerta':serializer.data,'alerta_programada':response_alerta.data}},status=status.HTTP_201_CREATED)
        except ValidationError as e:       
            raise ValidationError(e.detail)
        
    def delete(self,request,cod):
        fecha = FechaClaseAlerta.objects.filter(id_fecha=cod).first()
        
        if not fecha:
            raise NotFound("No existe la fecha a eliminar.")
        
        with transaction.atomic():
            if fecha.age_cumplimiento:
                alertas_programadas = AlertasProgramadas.objects.filter(cod_clase_alerta=fecha.cod_clase_alerta,dia_cumplimiento=fecha.dia_cumplimiento, mes_cumplimiento=fecha.mes_cumplimiento, agno_cumplimiento=fecha.age_cumplimiento) 
            else:
                alertas_programadas = AlertasProgramadas.objects.filter(cod_clase_alerta=fecha.cod_clase_alerta,dia_cumplimiento=fecha.dia_cumplimiento, mes_cumplimiento=fecha.mes_cumplimiento, agno_cumplimiento__isnull=True) 

            serializer = FechaClaseAlertaGetSerializer(fecha) 
            alertas_programadas.delete()
            fecha.delete()
        
        return Response({'success':True,'detail':'Se elimino la fecha correctamente.','data':serializer.data},status=status.HTTP_200_OK)



class MarcarAlertasComoLeidas(generics.UpdateAPIView):
    serializer_class = AlertasBandejaAlertaPersonaSerializer
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        try:
            marcar_todos = request.data.get('marcar_todos', False)
            pk = request.data.get('pk', None)
            if marcar_todos:    
                print("entre aqui")
                alertas = AlertasBandejaAlertaPersona.objects.filter(id_bandeja_alerta_persona=pk)
                if not alertas:
                    raise NotFound("No se encontraron alertas para marcar como leídas.")
                
                for alerta in alertas:
                    alerta.leido = True
                    alerta.fecha_leido = datetime.now()
                    alerta.save()
                
                alerta = alertas.first()
                alerta.id_bandeja_alerta_persona.pendientes_leer = False
                alerta.id_bandeja_alerta_persona.save()
            else:
                print("entre aqui 2")
                alerta = AlertasBandejaAlertaPersona.objects.filter(id_alerta_bandeja_alerta_persona=pk).first()
                alerta.leido = True
                alerta.fecha_leido = datetime.now()
                alerta.save()

                alertas = AlertasBandejaAlertaPersona.objects.filter(id_bandeja_alerta_persona=alerta.id_bandeja_alerta_persona.id_bandeja_alerta)
                if not alertas.filter(leido=False).exists():
                    print(alerta)
                    alerta.id_bandeja_alerta_persona.pendientes_leer = False
                    alerta.id_bandeja_alerta_persona.save()
                

            return Response({'success': True, 'detail': 'Se marcaron las alertas como leídas correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            raise ValidationError(str(e))