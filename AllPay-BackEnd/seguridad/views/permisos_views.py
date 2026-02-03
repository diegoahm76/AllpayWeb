from calendar import c
from email import message
from django.shortcuts import render
from collections import defaultdict
import pytz
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from seguridad.models.seguridad_models import EstructuraMenus, Permisos, PermisosModulo, PermisosModuloRol, Modulos, User, Auditorias, Roles, UsuariosRol
from rest_framework import status,viewsets,mixins
from rest_framework import status
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from seguridad.serializers.permisos_serializers import (
    # ModulosRolEntornoOtroSerializer,
    GetEstructuraMenusSerializer,
    PermisosSerializer,
    PermisosModuloSerializer,
    PermisosModuloPostSerializer,
    PermisosModuloRolPostSerializer,
    PermisosModuloRolSerializer,
    ModulosSerializers,
    PermisosModuloRolSerializerHyper,
    GetPermisosRolSerializer,
    ModulosRolSerializer,
    ModulosRolEntornoSerializer
)
from rest_framework.generics import ListAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework import generics
from seguridad.serializers.roles_serializers import RolesSerializer
from seguridad.utils import Util
from datetime import datetime
from django.template.loader import render_to_string
import operator, itertools

class ListarPermisos(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PermisosSerializer

    def get(self, request):
        permisos = Permisos.objects.all()
        if permisos:
            serializer = self.serializer_class(permisos, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron datos'}, status=status.HTTP_404_NOT_FOUND)


# class DetailPermisos(RetrieveAPIView):
#     serializer_class = PermisosSerializer
#     queryset = Permisos.objects.filter()

#====================================================>Vistas tabla PermisosModulo
# #----------------------------------------------------> Crear permisos por módulo
# class PermisosModulosViewSet(viewsets.ModelViewSet):
#     queryset = PermisosModulo.objects.all()
#     serializer_class = PermisosModuloPostSerializer
#     permission_classes = [IsAuthenticated]


#====================================================>Vistas tabla PermisosModuloRol
#----------------------------------------------------> Asignar un permiso de módulo a un rol
class PermisosModuloRolViewSet(viewsets.ModelViewSet):
    queryset = PermisosModuloRol.objects.all()
    queryset_rol=Roles.objects.all()
    serializer_class = PermisosModuloRolPostSerializer
    serializer_class_rol=RolesSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data_rol = {
            'nombre_rol': request.data['nombre_rol'],
            'descripcion_rol': request.data['descripcion_rol']
        }
        serializer_rol = self.serializer_class_rol(data=data_rol)
        serializer_rol.is_valid(raise_exception=True)
        serializer_rol.save()


        data = []
        for permiso_modulo in request.data['permisos_modulo']:
            permiso_modulo_instance = PermisosModulo.objects.filter(id_permisos_modulo=permiso_modulo["id_permiso_modulo"]).first()
            if permiso_modulo_instance:
                permiso_modulo = PermisosModuloRol.objects.create(
                    id_rol = serializer_rol.instance,
                    id_permiso_modulo = permiso_modulo_instance
                )
                data.append(permiso_modulo)
            else:
                raise ValidationError('No existe uno de los permisos, verifique')

        serializer = PermisosModuloRolSerializer(data, many=True)
        return Response({'success':True, 'detail':'Se crearon los siguientes datos', 'data': serializer.data}, status=status.HTTP_201_CREATED)

class RegisterRol(generics.CreateAPIView):
    serializer_class=RolesSerializer
    permission_classes = [IsAuthenticated]
    queryset=Roles.objects.all()

    def post(self, request):
        data = request.data
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success':True, 'detail':'Se creo el tipo de documento correctamente', 'data':serializer.data}, status=status.HTTP_201_CREATED)


class UpdatePermisoModulo(RetrieveUpdateAPIView):
    serializer_class = PermisosModuloPostSerializer
    queryset = PermisosModulo.objects.all()


class ListarPermisosModulo(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GetPermisosRolSerializer
    queryset = PermisosModuloRol.objects.all()
    
    def get(self, request):
        modulos = Modulos.objects.all()
        serializer_modulos = ModulosRolSerializer(modulos, many=True)
        modulos_data = serializer_modulos.data
        
        modulos_data = sorted(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema"))
        outputList = []
        
        for subsistema, info_modulos in itertools.groupby(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema")):
            modulos = list(info_modulos)
            
            for modulo in modulos:
                del modulo['subsistema']
                del modulo['desc_subsistema']
                
            subsistema_data = {
                "subsistema": subsistema[0],
                "desc_subsistema": subsistema[1],
                "modulos": modulos
            }
            outputList.append(subsistema_data)
            
        return Response({'success':True, 'detail':'Se encontraron los siguientes permisos por módulo', 'data':outputList}, status=status.HTTP_200_OK)

# class DetailPermisosModulo(RetrieveAPIView):
#     serializer_class = PermisosModuloSerializer
#     queryset = PermisosModulo.objects.filter()

class UpdatePermisoModuloRol(RetrieveUpdateAPIView):
    serializer_class = PermisosModuloRolPostSerializer
    queryset = PermisosModuloRol.objects.all()
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        rol = Roles.objects.filter(id_rol=pk).first()
        rol.nombre_rol = request.data.get('nombre_rol', rol.nombre_rol)
        rol.descripcion_rol = request.data.get('descripcion_rol', rol.descripcion_rol)
        rol.save()

        permisos_modulo = request.data.get('permisos_modulo_rol', [])
        permiso_modulo_rol = []
        if rol:
            permisos_modulo_eliminar = PermisosModuloRol.objects.filter(id_rol=pk)
            permisos_modulo_eliminar.delete()

            for permiso_modulo in permisos_modulo:
                permiso_modulo_instance = PermisosModulo.objects.filter(id_permisos_modulo=permiso_modulo["id_permiso_modulo"]).first()
                if permiso_modulo_instance:
                    permiso_modulo_rol_instance = PermisosModuloRol.objects.create(
                        id_rol = rol,
                        id_permiso_modulo = permiso_modulo_instance
                    )
                    permiso_modulo_rol.append(permiso_modulo_rol_instance)
                else:
                    raise ValidationError('No existe uno de los permisos, verifique')

            serializer = PermisosModuloRolSerializer(permiso_modulo_rol, many=True)
            return Response({'success':True, 'detail':'Se actualizaron los permisos del rol', 'data': serializer.data}, status=status.HTTP_200_OK)     
        else:
            raise NotFound('No se encontró el rol')

class ListarPermisosModuloRol(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PermisosModuloRolSerializer

    def get(self, request):
        permisos = PermisosModuloRol.objects.all()
        if permisos:
            serializer = self.serializer_class(permisos, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron datos'}, status=status.HTTP_404_NOT_FOUND)

# class DetailPermisosModuloRol(RetrieveAPIView):
#     serializer_class = PermisosModuloRolSerializer
#     queryset = PermisosModuloRol.objects.filter()

class ListarPermisosModuloRolByRol(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PermisosModuloRolSerializer
    queryset = PermisosModuloRol

    def get(self, request, pk):
        permisos_modulo_rol = PermisosModuloRol.objects.filter(id_rol=pk)
        if permisos_modulo_rol:
            serializer = self.serializer_class(permisos_modulo_rol, many=True)
            return Response({'success':True,  'detail':'Se encontraron los siguientes datos', 'data':serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron datos'}, status=status.HTTP_404_NOT_FOUND)


class GetPermisosRolByRol(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GetPermisosRolSerializer
    queryset = PermisosModuloRol.objects.all()
    
    def get(self, request, id_rol):
        permisos_modulo_rol = self.queryset.all().filter(id_rol=id_rol)
        modulos_list = [permiso_modulo_rol.id_permiso_modulo.id_modulo.id_modulo for permiso_modulo_rol in permisos_modulo_rol]
        modulos = Modulos.objects.filter(id_modulo__in=modulos_list)
        serializer_modulos = ModulosRolSerializer(modulos, many=True, context={'id_rol': id_rol})
        modulos_data = serializer_modulos.data
        
        modulos_data = sorted(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema"))
        outputList = []
        
        for subsistema, info_modulos in itertools.groupby(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema")):
            modulos = list(info_modulos)
            
            for modulo in modulos:
                del modulo['subsistema']
                del modulo['desc_subsistema']
                
            subsistema_data = {
                "subsistema": subsistema[0],
                "desc_subsistema": subsistema[1],
                "modulos": modulos
            }
            outputList.append(subsistema_data)
            
        return Response({'success':True, 'detail':'El rol ingresado tiene acceso a lo siguiente', 'data':outputList}, status=status.HTTP_200_OK)

def util_prueba(id_usuario,tipo_entorno):
    
    if not id_usuario and not tipo_entorno:
        raise ValidationError('Debe enviar los parámetros de búsqueda')
    
    usuario_instance = User.objects.filter(id_usuario=id_usuario).first()
    supersusuario = User.objects.filter(id_usuario=1).first()
    
    tipos_entorno = ['L','C']
        
    roles_list = UsuariosRol.objects.filter(id_usuario=id_usuario)
    
    if not usuario_instance:
        raise ValidationError('Debe ingresar un usuario que exista')
    else:
        if usuario_instance.is_superuser:
            roles_list = roles_list.filter(id_rol=1)
            tipo_entorno = None
        else:
            if not tipo_entorno or tipo_entorno == '':
                raise ValidationError('Debe indicar el tipo de entorno')
    
    if tipo_entorno:
        if tipo_entorno not in tipos_entorno:
            raise ValidationError('Debe ingresar un tipo de entorno valido')
    
        if tipo_entorno == 'C':
            roles_list = roles_list.filter(id_rol=2)
        elif tipo_entorno == 'L':
            if usuario_instance.persona.id_cargo is None or (usuario_instance.persona.fecha_a_finalizar_cargo_actual <= datetime.now().date()):
                subject = "Intento de ingreso a entorno laboral"
                template = "ingreso-de-entorno.html"

                # Pasa el primer nombre y el primer apellido del usuario
                context = {
                    'primer_nombre': usuario_instance.persona.primer_nombre,
                    'primer_apellido': usuario_instance.persona.primer_apellido
                }

                # Enviar correo al superusuario
                Util.notificacion(supersusuario.persona, subject, template, 
                                  primer_nombre=usuario_instance.persona.primer_nombre,
                                  primer_apellido=usuario_instance.persona.primer_apellido,
                                  nombre_de_usuario=usuario_instance.nombre_de_usuario)

                raise PermissionDenied('NO SE LE PERMITIRÁ TRABAJAR EN ENTORNO LABORAL, dado que la persona no está actualmente vinculada o la fecha final del cargo ha vencido')

            roles_list = roles_list.exclude(id_rol=2)

    roles_list = [rol.id_rol for rol in roles_list]
    
    permisos_modulo_rol = PermisosModuloRol.objects.filter(id_rol__in=roles_list)
    modulos_list = [permiso_modulo_rol.id_permiso_modulo.id_modulo.id_modulo for permiso_modulo_rol in permisos_modulo_rol]
    modulos = Modulos.objects.filter(id_modulo__in=modulos_list)
    serializer_modulos = ModulosRolEntornoSerializer(modulos, many=True, context={'roles_list': roles_list})
    modulos_data = serializer_modulos.data
    
    for modulo in modulos_data:
        if not modulo['id_menu']:
            modulo['id_menu'] = 0
    
    modulos_data = sorted(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema", "id_menu"))
    outputList = []
    
    for subsistema, info_modulos in itertools.groupby(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema", "id_menu")):
        modulos = list(info_modulos)
            
        subsistema_data = {
            "subsistema": subsistema[0],
            "desc_subsistema": subsistema[1],
            "id_menu": subsistema[2],
            "modulos": modulos
        }
        outputList.append(subsistema_data)
        
    for modulo in outputList:
        if modulo['id_menu'] == 0:
            modulo['id_menu'] = None
        
    return outputList


class GetEstructuraMenu(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GetEstructuraMenusSerializer
    queryset = PermisosModuloRol.objects.all()
    
    def get_hierarchy(self, estructura):
        submenus = EstructuraMenus.objects.filter(id_menu_padre=estructura.id_menu)

        serializer_menu_padre = self.serializer_class(estructura)
        serializer_menu_padre_data = serializer_menu_padre.data
        
        if submenus:
            serializer_menu_padre_data['modulos'] = []
            serializer_menu_padre_data['submenus'] = [self.get_hierarchy(submenu) for submenu in submenus]
            return serializer_menu_padre_data
        else:
            serializer_menu_padre_data['modulos'] = []
            serializer_menu_padre_data['submenus'] = []
            return serializer_menu_padre_data

    def find_and_update_item(self, hierarchy, subsistema, id_menu, permiso_modulo):
        for item in hierarchy:
            if item.get("subsistema") == subsistema and item.get("id_menu") == id_menu:
                item["modulos"] = permiso_modulo['modulos']
            if item.get("submenus"):
                updated_submenus = self.find_and_update_item(item.get("submenus"), subsistema, id_menu, permiso_modulo)
                if updated_submenus:
                    item['submenus'] = updated_submenus
        return hierarchy
    
    def filter_hierarchy(self, hierarchy):
        filtered_hierarchy = []
        for node in hierarchy:
            if node.get('modulos') or node.get('submenus'):
                submenus = node.get('submenus', [])
                filtered_submenus = self.filter_hierarchy(submenus)
                if filtered_submenus:
                    node['submenus'] = filtered_submenus
                if node.get('modulos') or filtered_submenus:
                    filtered_hierarchy.append(node)
        return filtered_hierarchy

    def get(self, request):
        id_usuario = self.request.user.id_usuario
        tipo_entorno = request.query_params.get('tipo_entorno')

        if not id_usuario and not tipo_entorno:
            raise ValidationError('Debe enviar los parámetros de búsqueda')

        estructuras = EstructuraMenus.objects.order_by('subsistema', 'nivel_jerarquico', 'orden_por_padre')

        hierarchy = []
        for estructura in estructuras:
            if not estructura.id_menu_padre:
                hierarchy.append(self.get_hierarchy(estructura))

        permisos_modulo = util_prueba(id_usuario,tipo_entorno)

        for permiso_modulo in permisos_modulo:
            hierarchy_2 = self.find_and_update_item(hierarchy, permiso_modulo['subsistema'], permiso_modulo['id_menu'], permiso_modulo)
            hierarchy = hierarchy_2

        hierarchy = self.filter_hierarchy(hierarchy)

        hierarchy_data = sorted(hierarchy, key=operator.itemgetter("subsistema", "desc_subsistema"))
        outputList = []

        for subsistema, info_menus in itertools.groupby(hierarchy_data, key=operator.itemgetter("subsistema", "desc_subsistema")):
            menus = list(info_menus)

            subsistema_data = {
                "subsistema": subsistema[0],
                "desc_subsistema": subsistema[1],
                "menus": menus
            }
            outputList.append(subsistema_data)

        return Response({'success':True, 'detail':'Esta es la estructura de los menús actual','data':outputList}, status=status.HTTP_200_OK)


class GetPermisosRolByEntorno(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GetPermisosRolSerializer
    queryset = PermisosModuloRol.objects.all()

    def get(self, request):
        id_usuario = self.request.user.id_usuario

        if not id_usuario:
            raise ValidationError('Debe enviar los parámetros de búsqueda')

        usuario_instance = User.objects.filter(id_usuario=id_usuario).first()
        tipo_usuario = usuario_instance.tipo_usuario if usuario_instance else None
        supersusuario = User.objects.filter(id_usuario=1).first()


        roles_list = UsuariosRol.objects.filter(id_usuario=id_usuario)

        if not usuario_instance:
            raise ValidationError('Debe ingresar un usuario que exista')
        else:
            if usuario_instance.is_superuser:
                roles_list = roles_list.filter(id_rol=1)
                tipo_usuario = None
            else:
                if not tipo_usuario or tipo_usuario == '':
                    raise ValidationError('Debe indicar el tipo de entorno')

        if tipo_usuario:

            if tipo_usuario == 'E':
                roles_list = roles_list.filter(id_rol=2)
            elif tipo_usuario == 'I':
                if usuario_instance.persona.id_cargo is None or (usuario_instance.persona.fecha_a_finalizar_cargo_actual and usuario_instance.persona.fecha_a_finalizar_cargo_actual <= datetime.now().date()):
                    
                    subject = "Intento de ingreso a entorno laboral"
                    template = "ingreso-de-entorno.html"

                    # Formatear la fecha actual
                    fecha_actual = datetime.now(pytz.timezone('America/Bogota')).strftime('%Y-%m-%d %H:%M:%S')
                    
                    context = {
                            'primer_nombre': usuario_instance.persona.primer_nombre,
                            'primer_apellido': usuario_instance.persona.primer_apellido,
                            'nombre_de_usuario': usuario_instance.nombre_de_usuario,
                            'fecha_actual': fecha_actual
                        }
                    template = render_to_string((template), context)
                    email_data = {'template': template, 'email_subject': subject, 'to_email': supersusuario.persona.email}
                    Util.send_email(email_data)
                    
                    raise PermissionDenied('NO SE LE PERMITIRÁ TRABAJAR EN ENTORNO LABORAL, dado que la persona no está actualmente vinculada o la fecha final del cargo ha vencido')
                
        
        roles_list = [rol.id_rol for rol in roles_list]

        
        permisos_modulo_rol = self.queryset.all().filter(id_rol__in=roles_list)
        modulos_list = [permiso_modulo_rol.id_permiso_modulo.id_modulo.id_modulo for permiso_modulo_rol in permisos_modulo_rol]
        # modulos = Modulos.objects.filter(id_modulo__in=modulos_list).order_by('id_modulo')
        modulos = Modulos.objects.filter(id_modulo__in=modulos_list).order_by('id_menu', 'orden_modulo')
        serializer_modulos = ModulosRolEntornoSerializer(modulos, many=True, context={'roles_list': roles_list})
        modulos_data = serializer_modulos.data
        
        modulos_data = sorted(modulos_data, key=operator.itemgetter("id_menu", "subsistema", "desc_subsistema"))
        outputList = []
        
        for subsistema, info_modulos in itertools.groupby(modulos_data, key=operator.itemgetter("subsistema", "desc_subsistema")):
            modulos = list(info_modulos)
            
            for modulo in modulos:
                del modulo['subsistema']
                del modulo['desc_subsistema']
                
            subsistema_data = {
                "subsistema": subsistema[0],
                "desc_subsistema": subsistema[1],
                "modulos": modulos
            }
            outputList.append(subsistema_data)
            
        return Response({'success':True, 'detail':'El tipo de entorno ingresado tiene acceso a lo siguiente', 'permitido':True, 'data':outputList}, status=status.HTTP_200_OK)   

#----------------------------------------------------->Tabla Modulos

class ListarModulo(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ModulosSerializers

    def get(self, request):
        modulos = Modulos.objects.all()
        if modulos:
            serializer = self.serializer_class(modulos, many=True)
            return Response({'success':True, 'detail':'Se encontraron los siguientes datos', 'data': serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response({'success':False, 'detail':'No se encontraron datos'}, status=status.HTTP_404_NOT_FOUND)


# class DetailModulo(RetrieveAPIView):
#     serializer_class = ModulosSerializers
#     queryset = Modulos.objects.filter()