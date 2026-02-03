import pandas as pd
import openpyxl
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.styles import Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from jinja2 import Environment, Template
import re
import os
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from recaudos.models.documento_models import PlantillasDoc, DocumentosGenerados
from recaudos.serializers.documentos_serializers import DocumentosGeneradosSerializer
import uuid
from datetime import datetime


class ExcelPlantillaView(APIView):
    """Vista para generar documentos Excel con plantillas y variables Jinja2"""
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentosGeneradosSerializer

    def detectar_variables_jinja(self, cell_value):
        """Detecta variables Jinja2 en el contenido de una celda"""
        if isinstance(cell_value, str):
            # Buscar patrones como {{ variable }}, {% for %}, etc.
            jinja_patterns = [
                r'\{\{.*?\}\}',  # Variables simples
                r'\{%\s*for.*?%\}',  # Bucles for
                r'\{%\s*endfor\s*%\}',  # Fin de bucles
                r'\{%\s*if.*?%\}',  # Condicionales if
                r'\{%\s*endif\s*%\}',  # Fin de condicionales
            ]
            
            for pattern in jinja_patterns:
                if re.search(pattern, cell_value):
                    return True
        return False

    def extraer_variables_jinja(self, cell_value):
        """Extrae todas las variables Jinja2 de una celda"""
        variables = []
        if isinstance(cell_value, str):
            # Buscar variables simples {{ variable }}
            variables_simples = re.findall(r'\{\{\s*([^}]+)\s*\}\}', cell_value)
            variables.extend(variables_simples)
            
            # Buscar bucles for {% for item in items %}
            bucles_for = re.findall(r'\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}', cell_value)
            for variable_bucle in bucles_for:
                variables.extend(variable_bucle)
            
            # Buscar condicionales if {% if condition %}
            condicionales = re.findall(r'\{%\s*if\s+([^%]+)\s*%\}', cell_value)
            variables.extend(condicionales)
        
        return variables

    def analizar_plantilla_excel(self, plantilla):
        """Analiza una plantilla Excel y extrae todas las variables Jinja2"""
        try:
            variables_encontradas = set()
            
            # Cargar el archivo Excel
            workbook = openpyxl.load_workbook(plantilla.doc_plantilla)
            
            # Procesar cada hoja
            for sheet_name in workbook.sheetnames:
                worksheet = workbook[sheet_name]
                
                for row in worksheet.iter_rows():
                    for cell in row:
                        if cell.value and self.detectar_variables_jinja(cell.value):
                            variables_celda = self.extraer_variables_jinja(cell.value)
                            variables_encontradas.update(variables_celda)
            
            return list(variables_encontradas)
            
        except Exception as e:
            raise ValidationError(f"Error analizando plantilla Excel: {str(e)}")

    def procesar_celda_jinja(self, cell_value, variables):
        """Procesa una celda que contiene variables Jinja2"""
        if not isinstance(cell_value, str):
            return cell_value
        
        try:
            # Crear un template Jinja2
            template = Template(cell_value)
            # Renderizar con las variables
            return template.render(**variables)
        except Exception as e:
            print(f"Error procesando celda Jinja2: {cell_value}, Error: {str(e)}")
            return cell_value

    def procesar_hoja_excel(self, worksheet, variables):
        """Procesa una hoja de Excel buscando y reemplazando variables Jinja2"""
        for row in worksheet.iter_rows():
            for cell in row:
                if cell.value and self.detectar_variables_jinja(cell.value):
                    nuevo_valor = self.procesar_celda_jinja(cell.value, variables)
                    cell.value = nuevo_valor

    def generar_documento_excel(self, plantilla, variables):
        """Genera un documento Excel basado en una plantilla y variables"""
        try:
            # Cargar el archivo Excel
            workbook = openpyxl.load_workbook(plantilla.doc_plantilla)
            
            # Procesar cada hoja
            for sheet_name in workbook.sheetnames:
                worksheet = workbook[sheet_name]
                self.procesar_hoja_excel(worksheet, variables)
            
            # Guardar el archivo procesado en memoria
            output = BytesIO()
            workbook.save(output)
            output.seek(0)
            
            # Crear un archivo InMemoryUploadedFile
            file_uuid = uuid.uuid4()
            extension = os.path.splitext(plantilla.doc_plantilla.name)[1]
            new_filename = f"{file_uuid}{extension}"
            
            archivo = InMemoryUploadedFile(
                output,
                'documento_generado',
                new_filename,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                output.getbuffer().nbytes,
                None
            )
            
            return archivo
            
        except Exception as e:
            raise ValidationError(f"Error procesando plantilla Excel: {str(e)}")

    def post(self, request):
        """Generar documento Excel desde plantilla"""
        try:
            # Obtener datos del request
            id_plantilla = request.data.get('id_plantilla_doc')
            variables = request.data.get('variables', {})
            
            if not id_plantilla:
                return Response({
                    "success": False,
                    "detail": "El ID de la plantilla es obligatorio"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener la plantilla
            plantilla = PlantillasDoc.objects.filter(id_plantilla_doc=id_plantilla).first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "La plantilla especificada no existe"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar que el archivo existe
            if not plantilla.doc_plantilla:
                return Response({
                    "success": False,
                    "detail": "La plantilla no tiene un archivo asociado"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar que es un archivo Excel
            nombre_archivo = plantilla.doc_plantilla.name.lower()
            if not (nombre_archivo.endswith('.xlsx') or nombre_archivo.endswith('.xls')):
                return Response({
                    "success": False,
                    "detail": "La plantilla debe ser un archivo Excel (.xlsx o .xls)"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generar el documento
            documento_generado = self.generar_documento_excel(plantilla, variables)
            
            # Guardar en la base de datos
            data_in = {
                'id_plantilla_doc': plantilla,
                'id_persona_genera': request.user.persona.id_persona,
                'variables': variables,
                'documento_generado': documento_generado,
                'finalizado': True
            }
            
            serializer = self.serializer_class(data=data_in)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response({
                "success": True,
                "detail": "Documento Excel generado exitosamente",
                "data": {
                    "id_documento": serializer.data['id_documento_generado'],
                    "nombre_plantilla": plantilla.nombre,
                    "variables_procesadas": variables
                }
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error interno del servidor: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalizarPlantillaExcelView(APIView):
    """Vista para analizar variables Jinja2 en plantillas Excel"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Analizar variables Jinja2 en una plantilla Excel específica"""
        try:
            id_plantilla = request.query_params.get('id_plantilla_doc')
            
            if not id_plantilla:
                return Response({
                    "success": False,
                    "detail": "El ID de la plantilla es obligatorio"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener la plantilla
            plantilla = PlantillasDoc.objects.filter(id_plantilla_doc=id_plantilla).first()
            if not plantilla:
                return Response({
                    "success": False,
                    "detail": "La plantilla especificada no existe"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar que es un archivo Excel
            nombre_archivo = plantilla.doc_plantilla.name.lower()
            if not (nombre_archivo.endswith('.xlsx') or nombre_archivo.endswith('.xls')):
                return Response({
                    "success": False,
                    "detail": "La plantilla debe ser un archivo Excel (.xlsx o .xls)"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Analizar la plantilla
            excel_view = ExcelPlantillaView()
            variables_encontradas = excel_view.analizar_plantilla_excel(plantilla)
            
            return Response({
                "success": True,
                "detail": f"Análisis completado para plantilla '{plantilla.nombre}'",
                "data": {
                    "id_plantilla_doc": plantilla.id_plantilla_doc,
                    "nombre_plantilla": plantilla.nombre,
                    "archivo": plantilla.doc_plantilla.name,
                    "variables_encontradas": variables_encontradas,
                    "total_variables": len(variables_encontradas)
                }
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error interno del servidor: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PlantillasExcelView(APIView):
    """Vista para listar plantillas Excel disponibles"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Listar plantillas Excel disponibles"""
        try:
            # Buscar plantillas que sean archivos Excel
            plantillas_excel = []
            todas_plantillas = PlantillasDoc.objects.filter(activa=True)
            
            for plantilla in todas_plantillas:
                if plantilla.doc_plantilla:
                    nombre_archivo = plantilla.doc_plantilla.name.lower()
                    if nombre_archivo.endswith('.xlsx') or nombre_archivo.endswith('.xls'):
                        plantillas_excel.append({
                            'id_plantilla_doc': plantilla.id_plantilla_doc,
                            'nombre': plantilla.nombre,
                            'descripcion': plantilla.descripcion,
                            'archivo': plantilla.doc_plantilla.name,
                            'fecha_creacion': plantilla.fecha_creacion
                        })
            
            return Response({
                "success": True,
                "detail": f"Se encontraron {len(plantillas_excel)} plantillas Excel",
                "data": plantillas_excel
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error interno del servidor: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


"""
EJEMPLO DE USO:

1. Listar plantillas Excel disponibles:
   GET /apii/documentos/plantillas_excel/

2. Analizar variables Jinja2 en una plantilla:
   GET /apii/documentos/analizar_plantilla_excel/?id_plantilla_doc=134

3. Generar documento Excel desde plantilla:
   POST /apii/documentos/excel_plantilla/
   {
       "id_plantilla_doc": 123,
       "variables": {
           "fecha_inicio": "01/01/2024",
           "fecha_final": "31/12/2024",
           "items": [
               {
                   "ndocumento": "86051011",
                   "nombrerecaudador": "DIEGO ANDRES HERNANDEZ",
                   "tiporecaudador": "C|E",
                   "tkilos": "24.440",
                   "ppromedio": "$ 17.484",
                   "tcuota": "$ 12.819.390",
                   "tinteres": "$ 0"
               }
           ],
           "i": {
               "fechainicio": "01/01/2024",
               "fechafinal": "31/12/2024",
               "dpto": "ANTIOQUIA",
               "municipio": "MEDELLÍN",
               "totalkilos": "53.355",
               "tpromedio": "$ 19.562",
               "totalcuotas": "$ 31.311.615",
               "totalinteres": "$ 0"
           }
       }
   }

4. Plantilla Excel puede contener variables Jinja2 como:
   - {{ fecha_inicio }}
   - {{ i.totalkilos }}
   - {% for item in items %}
   - {{ item.nombrerecaudador }}
   - {% endfor %}

5. Para evitar el error "file is not a Word file":
   - Usar /apii/documentos/plantillas_excel/ para listar solo plantillas Excel
   - Usar /apii/documentos/excel_plantilla/ para generar documentos Excel
   - La vista PlantillasDocGet ahora incluye información del tipo de archivo
"""
