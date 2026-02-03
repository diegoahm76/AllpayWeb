
from datetime import date, datetime
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, status
from rest_framework.generics import RetrieveUpdateAPIView
from seguridad.models.seguridad_models import Auditorias,Modulos,User
from seguridad.models.transversal_models import Personas
from seguridad.serializers.auditorias_serializers import AuditoriasSerializers,AuditoriasPostSerializers
from rest_framework.response import Response
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from rest_framework.exceptions import NotFound, PermissionDenied
import pytz

from seguridad.utils import Util
from seguridad.views.personas_views import CustomPagination
from seguridad.models.alertas_models import ConfiguracionClaseAlerta



# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def getAuditorias(request):
#     #parametros de entrada
#     tipo_documento = request.query_params.get('tipo-documento')
#     numero_documento = request.query_params.get('numero-documento')
#     rango_inicial_fecha = request.query_params.get('rango-inicial-fecha')
#     rango_final_fecha = request.query_params.get('rango-final-fecha')
#     modulo = request.query_params.get('modulo')
#     subsistema = request.query_params.get('subsistema')
#     #validacion de la informacion
#     if rango_inicial_fecha==None or rango_final_fecha==None:
#         raise NotFound('No se ingresaron parametros de fecha')

#     # formateando las variables de tipo fecha
#     start_date = datetime.strptime(rango_inicial_fecha, '%Y-%m-%d').replace(hour=00, minute=00, second=00, microsecond=00)
#     end_date = datetime.strptime(rango_final_fecha, '%Y-%m-%d').replace(hour=23, minute=59, second=59, microsecond=59)

   
#     if (end_date-start_date).days > 8:
#         raise NotFound('El rango de fechas es superior a 8 días')
#     else:
#         pass

#     def consultaPersona(tipo_documento_ingresado,numero_documento_ingresado):
#         try:
#             auditoria_persona_id = Personas.objects.get(Q(tipo_documento = tipo_documento_ingresado) & Q(numero_documento=numero_documento_ingresado)).id_persona
#             auditoria_usuario_id = User.objects.get(persona=auditoria_persona_id)
#             return auditoria_usuario_id.id_usuario
#         except:
#             raise TypeError('bad type')
#     if tipo_documento == '':
#         tipo_documento = None
#     if numero_documento == '':
#         numero_documento = None
#     if modulo == '':
#         modulo = None
#     if subsistema == '':
#         subsistema = None
#     if tipo_documento != None and numero_documento != None and modulo != None and subsistema != None:
#         if int(modulo) in Modulos.objects.values_list('id_modulo', flat=True):
#             pass
#         else:
#             raise NotFound('El modulo ingresado NO existe')
#         if subsistema in Modulos.objects.values_list('subsistema', flat=True):
#             pass
#         else: 
#             raise NotFound('El subsistema ingresado NO existe')
#         tipo_y_numero_id = (tipo_documento, numero_documento)
#         persona = Personas.objects.values_list('tipo_documento', 'numero_documento')
#         if tipo_y_numero_id in persona:
#             pass
#         else:
#             raise NotFound('La persona consultada NO existe')
#         try:
#             id_usuario = consultaPersona(tipo_documento,numero_documento)
#             auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_usuario=id_usuario).filter(id_modulo = modulo).filter(subsistema = subsistema).order_by('-fecha_accion')
#             serializador = AuditoriasSerializers(auditorias, many=True)
#             if len(auditorias) == 0:
#                 raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#             return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)            
#         except:
#             raise NotFound('Esta persona no tiene un usuario asignado')
    
#     if tipo_documento != None and numero_documento != None and modulo != None and subsistema == None:
#         if int(modulo) in Modulos.objects.values_list('id_modulo', flat=True):
#             pass
#         else:
#             raise NotFound('El modulo ingresado NO existe')
#         tipo_y_numero_id = (tipo_documento, numero_documento)
#         persona = Personas.objects.values_list('tipo_documento', 'numero_documento')
#         if tipo_y_numero_id in persona:
#             pass
#         else:
#             raise NotFound('La persona consultada NO existe')
#         try:
#             id_usuario = consultaPersona(tipo_documento,numero_documento)
#             auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_usuario=id_usuario).filter(id_modulo = modulo).order_by('-fecha_accion')
#             serializador = AuditoriasSerializers(auditorias, many=True)
#             if len(auditorias) == 0:
#                 raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#             return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)                        
#         except:
#             raise NotFound('Esta persona no tiene un usuario asignado')
         
#     if tipo_documento != None and numero_documento != None and modulo == None and subsistema != None:
#         if subsistema in Modulos.objects.values_list('subsistema', flat=True):
#             pass
#         else:
#             raise NotFound('El subsistema ingresado NO existe')
#         tipo_y_numero_id = (tipo_documento, numero_documento)
#         persona = Personas.objects.values_list('tipo_documento', 'numero_documento')
#         if tipo_y_numero_id in persona:
#             pass
#         else:
#             raise NotFound('La persona consultada NO existe')
#         try:
#             id_usuario = consultaPersona(tipo_documento,numero_documento)
#             auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_usuario=id_usuario).filter(subsistema = subsistema).order_by('-fecha_accion')
#             serializador = AuditoriasSerializers(auditorias, many=True)
#             if len(auditorias) == 0:
#                 raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#             return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)                 
#         except:
#             raise NotFound('Esta persona no tiene un usuario asignado')
        
#     if tipo_documento != None and numero_documento != None and modulo == None and subsistema == None:
#         tipo_y_numero_id = (tipo_documento, numero_documento)
#         persona = Personas.objects.values_list('tipo_documento', 'numero_documento')
#         if tipo_y_numero_id in persona:
#             pass
#         else:
#             raise NotFound('La persona consultada NO existe')
#         try:
#             id_usuario = consultaPersona(tipo_documento,numero_documento)
#             auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_usuario=id_usuario).order_by('-fecha_accion')
#             serializador = AuditoriasSerializers(auditorias, many=True)
#             if len(auditorias) == 0:
#                 raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#             return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)              
#         except: 
#             raise NotFound('Esta persona no tiene un usuario asignado')
    
#     if tipo_documento == None and numero_documento == None and modulo != None and subsistema != None:
#         if int(modulo) in Modulos.objects.values_list('id_modulo', flat=True):
#             pass
#         else:
#             raise NotFound('El modulo ingresado NO existe')
#         if subsistema in Modulos.objects.values_list('subsistema', flat=True):
#             pass
#         else:
#             raise NotFound('El subsistema ingresado NO existe')
#         auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_modulo = modulo).filter(subsistema = subsistema).order_by('-fecha_accion')
#         serializador = AuditoriasSerializers(auditorias, many=True)
#         if len(auditorias) == 0:
#             raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#         return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)              
    
#     if tipo_documento == None and numero_documento == None and modulo != None and subsistema == None:
#         if int(modulo) in Modulos.objects.values_list('id_modulo', flat=True):
#             pass
#         else:
#             raise NotFound('El modulo ingresado NO existe')
#         auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(id_modulo = modulo).order_by('-fecha_accion')
#         serializador = AuditoriasSerializers(auditorias, many=True)
#         if len(auditorias) == 0:
#             raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#         return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)              
    
#     if tipo_documento == None and numero_documento == None and modulo == None and subsistema != None:
#         if subsistema in Modulos.objects.values_list('subsistema', flat=True):
#             pass
#         else:
#             raise NotFound('El subsistema ingresado NO existe')
#         auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).filter(subsistema = subsistema).order_by('-fecha_accion')
#         serializador = AuditoriasSerializers(auditorias, many=True)
#         if len(auditorias) == 0:
#             raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#         return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)              
    
#     if tipo_documento == None and numero_documento == None and modulo == None and subsistema == None:
#         auditorias = Auditorias.objects.filter(fecha_accion__range=[start_date,end_date]).order_by('-fecha_accion')
#         serializador = AuditoriasSerializers(auditorias, many=True)
#         if len(auditorias) == 0:
#             raise NotFound('No se encontraron coincidencias con los parametros de busqueda')
#         return Response({'success':True, 'detail':serializador.data}, status=status.HTTP_200_OK)
 
#     else:
#         raise NotFound('No se encontró una auditoria con estos parámetros de búsqueda')

class ListApiViews(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuditoriasSerializers
    pagination_class = CustomPagination 

    def get(self, request):
        # Filtros iniciales
        filter_conditions = {}

        # Filtro por id_modulo
        id_modulo = request.query_params.get('id_modulo', None)
        if id_modulo:
            filter_conditions['id_modulo'] = id_modulo

        # Filtro por id_usuario
        id_usuario = request.query_params.get('id_usuario', None)
        if id_usuario:
            filter_conditions['id_usuario'] = id_usuario

        # Filtro por cod_permiso
        cod_permiso = request.query_params.get('cod_permiso', None)
        if cod_permiso:
            filter_conditions['id_cod_permiso_accion'] = cod_permiso

        # Filtro por rango de fechas en fecha_accion
        fecha_inicio = request.query_params.get('fecha_inicio', None)
        fecha_fin = request.query_params.get('fecha_fin', None)
        if fecha_inicio and fecha_fin:
            try:
                fecha_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d")
                fecha_fin = datetime.strptime(fecha_fin, "%Y-%m-%d")
                filter_conditions['fecha_accion__range'] = [fecha_inicio, fecha_fin]
            except ValueError:
                return Response({
                    'success': False,
                    'detail': 'Formato de fecha inválido. Usa el formato YYYY-MM-DD.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Filtrar auditorías con los parámetros obtenidos
        auditorias = Auditorias.objects.filter(**filter_conditions)

        # Aplicar paginación correctamente
        if request.query_params.get('page'):
            page = self.paginate_queryset(auditorias)
            if page is not None:
                serializer = self.serializer_class(page, many=True)
                return self.get_paginated_response(serializer.data)

        # Si no hay paginación, devolver datos sin paginar
        serializer = self.serializer_class(auditorias, many=True)

        
        data_alerta = {}
        data_alerta['cod_clase_alerta'] = 'Com_Aud'
        data_alerta['informacion_complemento_mensaje'] = f"Se ha consultado la lista de auditorías por el usuario {request.user.nombre_de_usuario}."
        configuracion_alerta = ConfiguracionClaseAlerta.objects.filter(cod_clase_alerta=data_alerta['cod_clase_alerta']).first()
        if configuracion_alerta and configuracion_alerta.activa:
            Util.crear_alerta_evento_inmediato(data_alerta, configuracion_alerta)

        return Response({
            'success': True,
            'detail': 'Se encontraron los siguientes datos',
            'data': serializer.data
        }, status=status.HTTP_200_OK)



# class AuditoriaCreateView(generics.CreateAPIView):
#     serializer_class = AuditoriasPostSerializers
#     queryset = Auditorias.objects.all()
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request):
#         data = request.data
        
#         usuario = request.user.id_usuario
#         direccion=Util.get_client_ip(request)
        
#         auditoria_data = {
#             "id_usuario" : usuario,
#             "id_modulo" : data['id_modulo'],
#             "id_cod_permiso_accion": data['id_cod_permiso_accion'],
#             "subsistema": data['subsistema'],
#             "dirip": direccion,
#             "descripcion": data['descripcion'], 
#             "valores_actualizados": data['valores_actualizados']
#         }
        
#         serializer = self.serializer_class(data=auditoria_data)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
        
#         return Response({'success':True, 'detail':'Auditoria creada con éxito', 'data':serializer.data}, status=status.HTTP_201_CREATED)