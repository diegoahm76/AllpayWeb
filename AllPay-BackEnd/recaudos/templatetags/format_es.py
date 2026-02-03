from decimal import Decimal, InvalidOperation
from django import template

register = template.Library()


def _to_decimal(value):
    if value is None:
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    try:
        # Permitir strings con coma decimal o punto
        s = str(value).strip()
        if s == '':
            return Decimal('0')
        # Normalizar posibles formatos "1.234,56" a "1234.56"
        if ',' in s and '.' in s:
            # quitar separador de miles '.' y cambiar ',' a '.'
            s = s.replace('.', '').replace(',', '.')
        elif ',' in s:
            s = s.replace(',', '.')
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return Decimal('0')


def _format_es_co(dec: Decimal, places: int = 2) -> str:
    q = Decimal(10) ** -places
    d = dec.quantize(q)
    # Formatear con separadores US y luego cambiar
    s = f"{d:,.{places}f}"
    # '1,234,567.89' -> '1.234.567,89'
    s = s.replace(',', 'X').replace('.', ',').replace('X', '.')
    return s


@register.filter(name='numero_es')
def numero_es(value, places: int = 2):
    """
    Formatea un número al estilo es-CO: separador de miles '.', decimal ',' y N decimales (por defecto 2).
    Uso: {{ valor|numero_es }} o {{ valor|numero_es:0 }}
    """
    try:
        places = int(places)
    except Exception:
        places = 2
    dec = _to_decimal(value)
    return _format_es_co(dec, places)
