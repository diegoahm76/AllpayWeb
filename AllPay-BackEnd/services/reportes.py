# services/reportes.py
from typing import Tuple, List, Dict
from django.db.models import QuerySet, Sum, Case, When, IntegerField, F, Q
from recaudos.models.recaudos_models import FacturaUnica, Pagos, LiquidacionesFacturaUnica, FechasCierre
from decimal import Decimal

MESES = [
    ('enero',      1),
    ('febrero',    2),
    ('marzo',      3),
    ('abril',      4),
    ('mayo',       5),
    ('junio',      6),
    ('julio',      7),
    ('agosto',     8),
    ('septiembre', 9),
    ('octubre',   10),
    ('noviembre', 11),
    ('diciembre', 12),
]


def _annotaciones_mes(alias: str, campo: str) -> Dict[str, Case]:
    """
    Devuelve un dict {f'{alias}_{mes}': Sum(Case(...))} para los 12 meses.
    ```
    alias='kilos', campo='total_kilos'  -> kilos_enero, kilos_febrero, ...
    alias='cuota', campo='cuota_fomento'
    alias='toneladas', campo='total_kilos' -> toneladas_enero, toneladas_febrero, ...
    ```
    
    NOTA: El orden final en el consolidado será: Kilos, Toneladas, Cuota Fomento
    """
    return {
        f'{mes}_{alias}': Sum(
            Case(
                When(fecha_compra__month=num, then=F(campo)),
                default=0,
                output_field=IntegerField()
            )
        )
        for mes, num in MESES
    }


def obtener_consolidado_facturas(qs: QuerySet) -> Tuple[List[dict], dict]:
    """
    Devuelve (lista_consolidado, totales_mensuales) usando **una única** query.
    
    CAMBIO IMPORTANTE: Ahora funciona con facturas pagadas basándose en la fecha de pago
    según el parámetro de cuota de fomento (del 11 al 10 del siguiente mes).
    
    NUEVO: Incluye campo de toneladas para cada mes y total anual.
    """
    # ------------- Query para el detalle por ubicación -------------
    detalle_qs = (
        qs
        .select_related('id_departamento_cacao', 'id_municipio_cacao')
        .values(
            'id_departamento_cacao__nombre',
            'id_municipio_cacao__nombre'
        )
        .annotate(
            **_annotaciones_mes('kilos', 'total_kilos'),
            **_annotaciones_mes('cuota', 'cuota_fomento'),
            **_annotaciones_mes('toneladas', 'total_kilos'),  # Agregar campo de toneladas
            total_kilos=Sum('total_kilos'),
            total_cuota=Sum('cuota_fomento')
        )
        .order_by('id_departamento_cacao__nombre',
                  'id_municipio_cacao__nombre')
    )

    consolidado = []
    for r in detalle_qs:
        # Convertir el formato de campos para que coincida con el código existente
        item = {
            'departamento': r['id_departamento_cacao__nombre'],
            'municipio': r['id_municipio_cacao__nombre'],
            'total_kilos_anual': r['total_kilos'],
            'total_cuota_fomento_anual': r['total_cuota'],
            'total_toneladas_anual': round(r['total_kilos'] / 1000, 3) if r['total_kilos'] > 0 else 0
        }
        
        # Agregar campos mensuales con el formato esperado
        # ORDEN: Kilos, Toneladas, Cuota Fomento
        for mes, num in MESES:
            item[f'{mes}_total_kilos'] = r[f'{mes}_kilos']
            # Agregar campo de toneladas (convertir kilos a toneladas) - SEGUNDO
            item[f'{mes}_total_toneladas'] = round(r[f'{mes}_kilos'] / 1000, 3) if r[f'{mes}_kilos'] > 0 else 0
            # Campo de cuota fomento - TERCERO
            item[f'{mes}_total_cuota_fomento'] = r[f'{mes}_cuota']
        
        consolidado.append(item)

    # ------------- Query para totales nacionales (1 fila) -------------
    totales_raw = qs.aggregate(
        **_annotaciones_mes('kilos', 'total_kilos'),
        **_annotaciones_mes('cuota', 'cuota_fomento'),
        **_annotaciones_mes('toneladas', 'total_kilos'),  # Agregar campo de toneladas
        total_kilos=Sum('total_kilos'),
        total_cuota=Sum('cuota_fomento')
    )
    
    # Convertir totales al formato esperado
    totales_por_mes = {}
    for mes, num in MESES:
        totales_por_mes[mes] = {
            'total_kilos': totales_raw[f'{mes}_kilos'],
            'total_cuota_fomento': totales_raw[f'{mes}_cuota'],
            'total_toneladas': round(totales_raw[f'{mes}_kilos'] / 1000, 3) if totales_raw[f'{mes}_kilos'] > 0 else 0
        }

    return consolidado, totales_por_mes


def obtener_facturas_pagadas_por_fecha_pago(fecha_inicio, fecha_final, municipio_id=None, departamento_id=None):
    """
    Obtiene facturas pagadas basándose en la fecha de pago según el parámetro de cuota de fomento.
    
    Las fechas de pago van del 11 al 10 del siguiente mes, según el parámetro de cuota de fomento.
    
    La relación entre tablas es:
    FacturaUnica -> LiquidacionesFacturaUnica -> Pagos
    """
    # Obtener la configuración de días de pago para cuota de fomento
    dias_pago = FechasCierre.objects.filter(cod_tipo_cobro_fecha="CF").values_list('dias_pago', flat=True).first()
    if not dias_pago:
        dias_pago = 10  # Valor por defecto si no hay configuración
    
    print(f"🔧 [DEBUG] Días de pago configurados para cuota de fomento: {dias_pago}")
    
    # Construir filtros base
    filtros = {}
    
    # Agregar filtros opcionales por ubicación
    if municipio_id:
        filtros['id_municipio_cacao'] = municipio_id
    if departamento_id:
        filtros['id_departamento_cacao'] = departamento_id
    
    # Obtener todas las facturas que cumplan con los filtros de ubicación
    facturas_base = FacturaUnica.objects.filter(**filtros)
    print(f"🧮 [DEBUG] Facturas base (ubicación): {facturas_base.count()} | filtros={filtros}")
    
    # Obtener IDs de facturas que tienen pagos en el rango de fechas especificado
    facturas_con_pagos = set()
    
    # Buscar liquidaciones pagadas por fecha de pago (no fecha de liquidación)
    liquidaciones_en_rango = LiquidacionesFacturaUnica.objects.filter(
        fecha_pago__date__gte=fecha_inicio,
        fecha_pago__date__lte=fecha_final,
        cod_estado__in=['P', 'L']  # Pagado / Liquidado
    )
    
    print(f"💳 [DEBUG] Liquidaciones en rango (por fecha_liquidacion): {liquidaciones_en_rango.count()}")
    sample_liq = list(liquidaciones_en_rango.values_list('id_liq_factura_unica', flat=True)[:10])
    if sample_liq:
        print(f"   Ejemplos liquidaciones: {sample_liq}")
    
    # Obtener IDs de facturas que tienen estas liquidaciones
    facturas_con_liquidaciones = facturas_base.filter(
        id_liq_factura_unica__in=liquidaciones_en_rango.values_list('id_liq_factura_unica', flat=True)
    ).exclude(id_liq_factura_unica__isnull=True)
    
    facturas_con_pagos.update(facturas_con_liquidaciones.values_list('id_factura_unica', flat=True))
    
    # Buscar en pagos relacionados con las liquidaciones
    liquidacion_ids = liquidaciones_en_rango.values_list('id_liq_factura_unica', flat=True)
    pagos_en_rango = Pagos.objects.filter(
        id_liquidacion_pago__in=liquidacion_ids,
        fecha_pago__date__gte=fecha_inicio,
        fecha_pago__date__lte=fecha_final,
        cod_estado_pago='AP'  # Solo pagos aprobados
    )
    
    print(f"💰 [DEBUG] Pagos en rango (por fecha_pago): {pagos_en_rango.count()}")
    # Breakdown por estado
    estados_breakdown = (
        pagos_en_rango.values('cod_estado_pago')
        .order_by('cod_estado_pago')
        .annotate(total=Sum(1))
    )
    try:
        print(f"   Estados de pago en rango: {[{e['cod_estado_pago']: e['total']} for e in estados_breakdown]}")
    except Exception:
        pass
    sample_pagos = list(pagos_en_rango.values_list('id_pago', 'cod_estado_pago', 'id_liquidacion_pago')[:10])
    if sample_pagos:
        print(f"   Ejemplos pagos: {sample_pagos}")
    
    # Obtener IDs de facturas que tienen estos pagos
    liquidaciones_con_pagos = LiquidacionesFacturaUnica.objects.filter(
        id_liq_factura_unica__in=pagos_en_rango.values_list('id_liquidacion_pago', flat=True)
    )
    
    facturas_con_pagos_pagos = facturas_base.filter(
        id_liq_factura_unica__in=liquidaciones_con_pagos.values_list('id_liq_factura_unica', flat=True)
    ).exclude(id_liq_factura_unica__isnull=True)
    
    facturas_con_pagos.update(facturas_con_pagos_pagos.values_list('id_factura_unica', flat=True))
    
    print(f"💳 [DEBUG] Facturas con pagos (IDs) tras unir: {len(facturas_con_pagos)}")
    if facturas_con_pagos:
        sample_fact_ids = list(facturas_con_pagos)[:10]
        print(f"   Ejemplos facturas ID: {sample_fact_ids}")
    
    # Filtrar facturas base por las que tienen pagos
    facturas_pagadas = facturas_base.filter(id_factura_unica__in=facturas_con_pagos)
    print(f"✅ [DEBUG] Facturas pagadas resultantes: {facturas_pagadas.count()}")
    sample_fact = list(facturas_pagadas.values_list('id_factura_unica', 'nro_factura_unica')[:10])
    if sample_fact:
        print(f"   Ejemplos facturas (id, nro): {sample_fact}")
    
    return facturas_pagadas 