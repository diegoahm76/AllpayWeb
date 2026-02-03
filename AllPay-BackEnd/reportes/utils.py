from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.exceptions import ValidationError
import math


def formato_miles(valor):
    try:
        return "{:,}".format(int(valor)).replace(",", ".")
    except:
        return valor


def formato_precio(valor):
    try:
        return "$ {:,}".format(int(round(float(valor)))).replace(",", ".")
    except:
        return valor
    

def mes_en_letras(mes):

    if mes is None:
        return None
    
    if mes < 1 or mes > 12:
        raise ValidationError("El mes debe estar entre 1 y 12.")
    
    # Diccionario para mapear números de mes a nombres
    meses = {
        1: "ENERO",
        2: "FEBRERO",
        3: "MARZO",
        4: "ABRIL",
        5: "MAYO",
        6: "JUNIO",
        7: "JULIO",
        8: "AGOSTO",
        9: "SEPTIEMBRE",
        10: "OCTUBRE",
        11: "NOVIEMBRE",
        12: "DICIEMBRE"
    }
    return meses.get(mes, None)
    

def formato_peso(valor):
    if valor is None:
        valor = 0.0
    try:
        valor = float(valor)
        valor_formateado = "${:,.2f}".format(valor).replace(",", "TEMP").replace(".", ",").replace("TEMP", ".")
        return valor_formateado
    except (ValueError, TypeError):
        raise ValidationError("El valor no es un número válido.")


def formato_numero(numero):
    if numero is None:
        return "0,00"
    return f"{numero:,.2f}".replace(",", "TEMP").replace(".", ",").replace("TEMP", ".")




class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size' 
    max_page_size = 100  

    def get_paginated_response(self, data):
        total_pages = math.ceil(self.page.paginator.count / self.page.paginator.per_page)
        current_page = self.page.number

        return Response({
            "success": True,
            "count": self.page.paginator.count,
            "total_pages": total_pages,
            "current_page": current_page,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "data": data
        })
    


