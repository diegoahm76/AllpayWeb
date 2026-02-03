from datetime import datetime, date
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Q, Exists, OuterRef
from django.db.models.functions import TruncMonth
from decimal import Decimal
from reportes.utils import mes_en_letras
from reportes.models import TRM, BolsaNY
from recaudos.models.recaudos_models import FacturaUnica, Pagos, LiquidacionesFacturaUnica
from recaudos.models.acuerdos_pago_models import CuotasAcuerdoPago
from recaudos.choices.cod_estado_factura_choices import cod_estado_factura_CHOICES


class PromediosMensualesCombinadoView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/promedios-mensuales/
    Devuelve por mes: NAL COP/TON, USD/TON NAL, USD/TON NY, Diferencia %, TRM promedio.
    Filtros obligatorios: fecha_inicio (YYYY-MM-DD), fecha_fin (YYYY-MM-DD)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            fecha_inicio_str = request.query_params.get('fecha_inicio')
            fecha_fin_str = request.query_params.get('fecha_fin')

            if not fecha_inicio_str or not fecha_fin_str:
                return Response({
                    "success": False,
                    "detail": "Los parámetros fecha_inicio y fecha_fin son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

            if fecha_inicio > fecha_fin:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio debe ser menor o igual a la fecha de fin"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Base de facturas efectivamente pagadas
            facturas_base = (
                FacturaUnica.objects
                .filter(
                    fecha_compra__range=(fecha_inicio, fecha_fin)
                )
                .annotate(
                    liq_pagada=Exists(
                        LiquidacionesFacturaUnica.objects.filter(
                            pk=OuterRef('id_liq_factura_unica'), cod_estado__in=['P', 'L']
                        )
                    ),
                    pago_aprobado=Exists(
                        Pagos.objects.filter(
                            id_liquidacion_pago=OuterRef('id_liq_factura_unica'), cod_estado_pago='AP'
                        )
                    ),
                    cuota_pagada=Exists(
                        CuotasAcuerdoPago.objects.filter(
                            id_liquidacion=OuterRef('id_liq_factura_unica'), pagada=True
                        )
                    ),
                )
                .filter(
                    Q(estado_factura='PA') | Q(liq_pagada=True) | Q(pago_aprobado=True) | Q(cuota_pagada=True)
                )
            )

            # Querys agregadas por mes
            facturas_mes = (
                facturas_base
                .annotate(mes_trunc=TruncMonth('fecha_compra'))
                .values('mes_trunc')
                .annotate(
                    total_valor_neto=Sum('valor_neto'),
                    total_kilos=Sum('total_kilos')
                )
            )

            trm_mes = (
                TRM.objects
                .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
                .annotate(mes_trunc=TruncMonth('fecha_registro'))
                .values('mes_trunc')
                .annotate(trm_promedio=Avg('precio_trm'))
            )

            ny_mes = (
                BolsaNY.objects
                .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
                .annotate(mes_trunc=TruncMonth('fecha_registro'))
                .values('mes_trunc')
                .annotate(usd_ton_ny=Avg('precio_cierre'))
            )

            map_facturas = { (r['mes_trunc'].year, r['mes_trunc'].month): r for r in facturas_mes }
            map_trm = { (r['mes_trunc'].year, r['mes_trunc'].month): r['trm_promedio'] for r in trm_mes }
            map_ny = { (r['mes_trunc'].year, r['mes_trunc'].month): r['usd_ton_ny'] for r in ny_mes }

            # Construir meses del rango
            meses = []
            y, m = fecha_inicio.year, fecha_inicio.month
            while True:
                meses.append(date(y, m, 1))
                if y == fecha_fin.year and m == fecha_fin.month:
                    break
                m += 1
                if m == 13:
                    m = 1
                    y += 1

            filas = []
            nal_list = []
            trm_list = []
            ny_list = []
            usd_nal_list = []
            dif_list = []
            for mes_dt in meses:
                mes_key = (mes_dt.year, mes_dt.month)
                f = map_facturas.get(mes_key)
                total_valor = Decimal(f['total_valor_neto']) if f and f.get('total_valor_neto') else Decimal('0')
                total_kg = Decimal(f['total_kilos']) if f and f.get('total_kilos') else Decimal('0')
                trm_raw = map_trm.get(mes_key)
                ny_raw = map_ny.get(mes_key)
                trm_val = Decimal(str(trm_raw)) if trm_raw is not None else None
                ny_val = Decimal(str(ny_raw)) if ny_raw is not None else None

                nal_cop_val = None
                if total_kg > 0 and total_valor > 0:
                    nal_cop_val = (total_valor / total_kg) * Decimal('1000')

                usd_ton_nal_val = None
                if nal_cop_val is not None and trm_val not in (None, Decimal('0')):
                    usd_ton_nal_val = nal_cop_val / trm_val

                dif_pct = None
                if usd_ton_nal_val is not None and ny_val not in (None, Decimal('0')):
                    dif_pct = ((usd_ton_nal_val - ny_val) / ny_val) * 100

                nal_out = int(nal_cop_val.quantize(Decimal('1'))) if nal_cop_val is not None else None
                trm_out = int(trm_val.quantize(Decimal('1'))) if trm_val is not None else None
                ny_out = int(ny_val.quantize(Decimal('1'))) if ny_val is not None else None
                usd_nal_out = int(usd_ton_nal_val.quantize(Decimal('1'))) if usd_ton_nal_val is not None else None

                if nal_out is not None:
                    nal_list.append(nal_out)
                if trm_out is not None:
                    trm_list.append(trm_out)
                if ny_out is not None:
                    ny_list.append(ny_out)
                if usd_nal_out is not None:
                    usd_nal_list.append(usd_nal_out)
                if dif_pct is not None:
                    dif_list.append(float(round(dif_pct, 1)))

                filas.append({
                    "mes": mes_dt.month,
                    "label": mes_en_letras(mes_dt.month)[:3].upper(),
                    "nal_cop": nal_out,
                    "usd_ton_nal": usd_nal_out,
                    "usd_ton_ny": ny_out,
                    "diferencia_pct": round(float(dif_pct), 1) if dif_pct is not None else None,
                    "trm_promedio": trm_out
                })
            # Totales a partir de meses (promedio de meses con dato)
            def avg_int(lst):
                return int(round(sum(lst) / len(lst))) if lst else None
            def avg_pct(lst):
                return round(sum(lst) / len(lst), 1) if lst else None

            total_nal_cop = avg_int(nal_list)
            total_trm = avg_int(trm_list)
            total_ny = avg_int(ny_list)
            total_usd_nal = avg_int(usd_nal_list)
            dif_pct_total = avg_pct(dif_list)

            return Response({
                "success": True,
                "message": "Promedios mensuales combinados calculados correctamente",
                "data": {
                    "filtros": {
                        "fecha_inicio": fecha_inicio.strftime('%Y-%m-%d'),
                        "fecha_fin": fecha_fin.strftime('%Y-%m-%d')
                    },
                    "meses": filas,
                    "totales": {
                        "nal_cop": total_nal_cop,
                        "usd_ton_nal": total_usd_nal,
                        "usd_ton_ny": total_ny,
                        "diferencia_pct": dif_pct_total,
                        "trm_promedio": total_trm
                    }
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "message": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error al calcular promedios mensuales combinados: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PromediosMensualesComparadoView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/promedios-mensuales-comparado
    Modos:
    - Manual: ?fecha_inicio1=YYYY-MM-DD&fecha_fin1=YYYY-MM-DD&fecha_inicio2=YYYY-MM-DD&fecha_fin2=YYYY-MM-DD
    - Periodo anterior: ?fecha_inicio1=YYYY-MM-DD&fecha_fin1=YYYY-MM-DD&comparar=1
    """
    permission_classes = [IsAuthenticated]

    def _calcular_periodo(self, fecha_inicio, fecha_fin):
        # Reutiliza la misma lógica del endpoint combinado para construir meses y totales
        facturas_base = (
            FacturaUnica.objects
            .filter(
                fecha_compra__range=(fecha_inicio, fecha_fin)
            )
            .annotate(
                liq_pagada=Exists(
                    LiquidacionesFacturaUnica.objects.filter(
                        pk=OuterRef('id_liq_factura_unica'), cod_estado__in=['P', 'L']
                    )
                ),
                pago_aprobado=Exists(
                    Pagos.objects.filter(
                        id_liquidacion_pago=OuterRef('id_liq_factura_unica'), cod_estado_pago='AP'
                    )
                ),
                cuota_pagada=Exists(
                    CuotasAcuerdoPago.objects.filter(
                        id_liquidacion=OuterRef('id_liq_factura_unica'), pagada=True
                    )
                ),
            )
            .filter(
                Q(estado_factura='PA') | Q(liq_pagada=True) | Q(pago_aprobado=True) | Q(cuota_pagada=True)
            )
        )
        facturas_mes = (
            facturas_base
            .annotate(mes_trunc=TruncMonth('fecha_compra'))
            .values('mes_trunc')
            .annotate(
                total_valor_neto=Sum('valor_neto'),
                total_kilos=Sum('total_kilos')
            )
        )

        trm_mes = (
            TRM.objects
            .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
            .annotate(mes_trunc=TruncMonth('fecha_registro'))
            .values('mes_trunc')
            .annotate(trm_promedio=Avg('precio_trm'))
        )

        ny_mes = (
            BolsaNY.objects
            .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
            .annotate(mes_trunc=TruncMonth('fecha_registro'))
            .values('mes_trunc')
            .annotate(usd_ton_ny=Avg('precio_cierre'))
        )

        map_facturas = { (r['mes_trunc'].year, r['mes_trunc'].month): r for r in facturas_mes }
        map_trm = { (r['mes_trunc'].year, r['mes_trunc'].month): r['trm_promedio'] for r in trm_mes }
        map_ny = { (r['mes_trunc'].year, r['mes_trunc'].month): r['usd_ton_ny'] for r in ny_mes }

        # Meses del rango
        meses = []
        y, m = fecha_inicio.year, fecha_inicio.month
        while True:
            meses.append(date(y, m, 1))
            if y == fecha_fin.year and m == fecha_fin.month:
                break
            m += 1
            if m == 13:
                m = 1
                y += 1

        filas = []
        nal_list: list[int] = []
        trm_list: list[int] = []
        ny_list: list[int] = []
        usd_nal_list: list[int] = []
        dif_list: list[float] = []
        for mes_dt in meses:
            mes_key = (mes_dt.year, mes_dt.month)
            f = map_facturas.get(mes_key)
            total_valor = Decimal(f['total_valor_neto']) if f and f.get('total_valor_neto') else Decimal('0')
            total_kg = Decimal(f['total_kilos']) if f and f.get('total_kilos') else Decimal('0')
            trm_raw = map_trm.get(mes_key)
            ny_raw = map_ny.get(mes_key)
            trm_val = Decimal(str(trm_raw)) if trm_raw is not None else None
            ny_val = Decimal(str(ny_raw)) if ny_raw is not None else None

            nal_cop_val = None
            if total_kg > 0 and total_valor > 0:
                nal_cop_val = (total_valor / total_kg) * Decimal('1000')

            usd_ton_nal_val = None
            if nal_cop_val is not None and trm_val not in (None, Decimal('0')):
                usd_ton_nal_val = nal_cop_val / trm_val

            dif_pct = None
            if usd_ton_nal_val is not None and ny_val not in (None, Decimal('0')):
                dif_pct = ((usd_ton_nal_val - ny_val) / ny_val) * 100

            nal_out = int(nal_cop_val.quantize(Decimal('1'))) if nal_cop_val is not None else None
            trm_out = int(trm_val.quantize(Decimal('1'))) if trm_val is not None else None
            ny_out = int(ny_val.quantize(Decimal('1'))) if ny_val is not None else None
            usd_nal_out = int(usd_ton_nal_val.quantize(Decimal('1'))) if usd_ton_nal_val is not None else None

            if nal_out is not None:
                nal_list.append(nal_out)
            if trm_out is not None:
                trm_list.append(trm_out)
            if ny_out is not None:
                ny_list.append(ny_out)
            if usd_nal_out is not None:
                usd_nal_list.append(usd_nal_out)
            if dif_pct is not None:
                dif_list.append(float(round(dif_pct, 1)))

            filas.append({
                "mes": mes_dt.month,
                "label": mes_en_letras(mes_dt.month)[:3].upper(),
                "nal_cop": nal_out,
                "usd_ton_nal": usd_nal_out,
                "usd_ton_ny": ny_out,
                "diferencia_pct": round(float(dif_pct), 1) if dif_pct is not None else None,
                "trm_promedio": trm_out
            })

        # Totales a partir de meses (promedio de meses con dato)
        def avg_int(lst):
            return int(round(sum(lst) / len(lst))) if lst else None
        def avg_pct(lst):
            return round(sum(lst) / len(lst), 1) if lst else None

        total_nal_cop = avg_int(nal_list)
        total_trm = avg_int(trm_list)
        total_ny = avg_int(ny_list)
        total_usd_nal = avg_int(usd_nal_list)
        dif_pct_total = avg_pct(dif_list)

        return {
            "anio": fecha_inicio.year,
            "meses": filas,
            "totales": {
                "nal_cop": total_nal_cop,
                "usd_ton_nal": total_usd_nal,
                "usd_ton_ny": total_ny,
                "diferencia_pct": dif_pct_total,
                "trm_promedio": total_trm
            }
        }

    def get(self, request):
        try:
            # Leer modo de comparación
            comparar = request.query_params.get('comparar')
            fecha_inicio1 = request.query_params.get('fecha_inicio1')
            fecha_fin1 = request.query_params.get('fecha_fin1')
            fecha_inicio2 = request.query_params.get('fecha_inicio2')
            fecha_fin2 = request.query_params.get('fecha_fin2')

            if not fecha_inicio1 or not fecha_fin1:
                return Response({
                    "success": False,
                    "message": "Los parámetros fecha_inicio1 y fecha_fin1 son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fi1 = datetime.strptime(fecha_inicio1, '%Y-%m-%d').date()
            ff1 = datetime.strptime(fecha_fin1, '%Y-%m-%d').date()

            if fi1 > ff1:
                return Response({
                    "success": False,
                    "message": "La fecha de inicio 1 debe ser menor o igual a la fecha de fin 1"
                }, status=status.HTTP_400_BAD_REQUEST)

            modo = "manual"
            if comparar in ("1", "true", "True") and (not fecha_inicio2 or not fecha_fin2):
                # Derivar periodo anterior restando 1 año
                fi2 = fi1.replace(year=fi1.year - 1)
                ff2 = ff1.replace(year=ff1.year - 1)
                modo = "anterior"
            else:
                if not fecha_inicio2 or not fecha_fin2:
                    return Response({
                        "success": False,
                        "message": "Debe enviar fecha_inicio2 y fecha_fin2 o activar comparar=1"
                    }, status=status.HTTP_400_BAD_REQUEST)
                fi2 = datetime.strptime(fecha_inicio2, '%Y-%m-%d').date()
                ff2 = datetime.strptime(fecha_fin2, '%Y-%m-%d').date()
                if fi2 > ff2:
                    return Response({
                        "success": False,
                        "message": "La fecha de inicio 2 debe ser menor o igual a la fecha de fin 2"
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular ambos periodos
            anio1 = self._calcular_periodo(fi1, ff1)
            anio2 = self._calcular_periodo(fi2, ff2)

            return Response({
                "success": True,
                "message": "Comparación generada correctamente",
                "data": {
                    "filtros": {
                        "modo": modo,
                        "rango1": {"fecha_inicio": fi1.strftime('%Y-%m-%d'), "fecha_fin": ff1.strftime('%Y-%m-%d')},
                        "rango2": {"fecha_inicio": fi2.strftime('%Y-%m-%d'), "fecha_fin": ff2.strftime('%Y-%m-%d')}
                    },
                    "anio1": anio1,
                    "anio2": anio2
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "message": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error al generar la comparación: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SerieMensualNalNyView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/serie-nal-ny/
    Retorna series mensuales de USD/TON NAL y USD/TON NY para 2 periodos.

    Modos:
    - Manual: ?fecha_inicio1=YYYY-MM-DD&fecha_fin1=YYYY-MM-DD&fecha_inicio2=YYYY-MM-DD&fecha_fin2=YYYY-MM-DD
    - Periodo anterior: ?fecha_inicio1=YYYY-MM-DD&fecha_fin1=YYYY-MM-DD&comparar=1
    """
    permission_classes = [IsAuthenticated]

    def _build_months(self, fi: date, ff: date):
        meses = []
        y, m = fi.year, fi.month
        while True:
            meses.append(date(y, m, 1))
            if y == ff.year and m == ff.month:
                break
            m += 1
            if m == 13:
                m = 1
                y += 1
        return meses

    def _compute_period(self, fi: date, ff: date):
        # Base de facturas efectivamente pagadas (mismo criterio que los otros endpoints)
        facturas_base = (
            FacturaUnica.objects
            .filter(
                fecha_compra__range=(fi, ff)
            )
            .annotate(
                liq_pagada=Exists(
                    LiquidacionesFacturaUnica.objects.filter(
                        pk=OuterRef('id_liq_factura_unica'), cod_estado__in=['P', 'L']
                    )
                ),
                pago_aprobado=Exists(
                    Pagos.objects.filter(
                        id_liquidacion_pago=OuterRef('id_liq_factura_unica'), cod_estado_pago='AP'
                    )
                ),
                cuota_pagada=Exists(
                    CuotasAcuerdoPago.objects.filter(
                        id_liquidacion=OuterRef('id_liq_factura_unica'), pagada=True
                    )
                ),
            )
            .filter(
                Q(estado_factura='PA') | Q(liq_pagada=True) | Q(pago_aprobado=True) | Q(cuota_pagada=True)
            )
        )

        facturas_mes = (
            facturas_base
            .annotate(mes_trunc=TruncMonth('fecha_compra'))
            .values('mes_trunc')
            .annotate(
                total_valor_neto=Sum('valor_neto'),
                total_kilos=Sum('total_kilos')
            )
        )

        trm_mes = (
            TRM.objects
            .filter(fecha_registro__range=(fi, ff))
            .annotate(mes_trunc=TruncMonth('fecha_registro'))
            .values('mes_trunc')
            .annotate(trm_promedio=Avg('precio_trm'))
        )

        ny_mes = (
            BolsaNY.objects
            .filter(fecha_registro__range=(fi, ff))
            .annotate(mes_trunc=TruncMonth('fecha_registro'))
            .values('mes_trunc')
            .annotate(usd_ton_ny=Avg('precio_cierre'))
        )

        map_facturas = { (r['mes_trunc'].year, r['mes_trunc'].month): r for r in facturas_mes }
        map_trm = { (r['mes_trunc'].year, r['mes_trunc'].month): r['trm_promedio'] for r in trm_mes }
        map_ny = { (r['mes_trunc'].year, r['mes_trunc'].month): r['usd_ton_ny'] for r in ny_mes }

        meses = self._build_months(fi, ff)
        categorias = [mes_en_letras(d.month)[:3].upper() for d in meses]

        usd_ton_nal_values = []
        usd_ton_ny_values = []

        for d in meses:
            key = (d.year, d.month)
            f = map_facturas.get(key)
            trm_raw = map_trm.get(key)
            ny_raw = map_ny.get(key)

            total_valor = Decimal(f['total_valor_neto']) if f and f.get('total_valor_neto') else Decimal('0')
            total_kg = Decimal(f['total_kilos']) if f and f.get('total_kilos') else Decimal('0')
            trm_val = Decimal(str(trm_raw)) if trm_raw is not None else None
            ny_val = Decimal(str(ny_raw)) if ny_raw is not None else None

            nal_cop_val = None
            if total_kg > 0 and total_valor > 0:
                nal_cop_val = (total_valor / total_kg) * Decimal('1000')

            usd_ton_nal_val = None
            if nal_cop_val is not None and trm_val not in (None, Decimal('0')):
                usd_ton_nal_val = nal_cop_val / trm_val

            usd_ton_nal_values.append(int(usd_ton_nal_val.quantize(Decimal('1'))) if usd_ton_nal_val is not None else None)
            usd_ton_ny_values.append(int(ny_val.quantize(Decimal('1'))) if ny_val is not None else None)

        return categorias, usd_ton_nal_values, usd_ton_ny_values

    def get(self, request):
        try:
            comparar = request.query_params.get('comparar')
            fecha_inicio1 = request.query_params.get('fecha_inicio1')
            fecha_fin1 = request.query_params.get('fecha_fin1')
            fecha_inicio2 = request.query_params.get('fecha_inicio2')
            fecha_fin2 = request.query_params.get('fecha_fin2')

            if not fecha_inicio1 or not fecha_fin1:
                return Response({
                    "success": False,
                    "message": "Los parámetros fecha_inicio1 y fecha_fin1 son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fi1 = datetime.strptime(fecha_inicio1, '%Y-%m-%d').date()
            ff1 = datetime.strptime(fecha_fin1, '%Y-%m-%d').date()
            if fi1 > ff1:
                return Response({
                    "success": False,
                    "message": "La fecha de inicio 1 debe ser menor o igual a la fecha de fin 1"
                }, status=status.HTTP_400_BAD_REQUEST)

            modo = "manual"
            if comparar in ("1", "true", "True") and (not fecha_inicio2 or not fecha_fin2):
                fi2 = fi1.replace(year=fi1.year - 1)
                ff2 = ff1.replace(year=ff1.year - 1)
                modo = "anterior"
            else:
                if not fecha_inicio2 or not fecha_fin2:
                    return Response({
                        "success": False,
                        "message": "Debe enviar fecha_inicio2 y fecha_fin2 o activar comparar=1"
                    }, status=status.HTTP_400_BAD_REQUEST)
                fi2 = datetime.strptime(fecha_inicio2, '%Y-%m-%d').date()
                ff2 = datetime.strptime(fecha_fin2, '%Y-%m-%d').date()
                if fi2 > ff2:
                    return Response({
                        "success": False,
                        "message": "La fecha de inicio 2 debe ser menor o igual a la fecha de fin 2"
                    }, status=status.HTTP_400_BAD_REQUEST)

            cat1, nal1, ny1 = self._compute_period(fi1, ff1)
            cat2, nal2, ny2 = self._compute_period(fi2, ff2)

            # Unificar categorías (se asume mismo número de meses por simplicidad)
            categorias = cat1 if len(cat1) >= len(cat2) else cat2

            # Construir mapas mes->valor para cada serie
            def to_map(labels, values):
                return {labels[i].lower(): values[i] for i in range(len(labels))}

            map_nal_1 = to_map(cat1, nal1)
            map_ny_1 = to_map(cat1, ny1)
            map_nal_2 = to_map(cat2, nal2)
            map_ny_2 = to_map(cat2, ny2)

            # KPIs y cards
            def avg_int(values):
                vals = [v for v in values if v is not None]
                return int(round(sum(vals) / len(vals))) if vals else None

            ny_all = [v for v in (ny1 + ny2) if v not in (None, )]
            ny_pos = [v for v in ny_all if v and v > 0]
            prom_ny_1 = avg_int(ny1)
            prom_ny_2 = avg_int(ny2)
            max_ny = max(ny_all) if ny_all else None
            min_ny = min(ny_pos) if ny_pos else None

            prom_nal_1 = avg_int(nal1)
            prom_nal_2 = avg_int(nal2)

            valor_abs = (prom_ny_2 - prom_ny_1) if (prom_ny_1 is not None and prom_ny_2 is not None) else None
            variacion_pct = (round((valor_abs / prom_ny_1) * 100, 1) if (valor_abs is not None and prom_ny_1) else None)

            data = {
                "filtros": {
                    "rango1": {"fecha_inicio": fi1.strftime('%Y-%m-%d'), "fecha_fin": ff1.strftime('%Y-%m-%d')},
                    "rango2": {"fecha_inicio": fi2.strftime('%Y-%m-%d'), "fecha_fin": ff2.strftime('%Y-%m-%d')},
                },
                "categorias": categorias,
                "series": [
                    {"key": "usd_ton_nal_1p", "label": "USD/TON NAL (US$) 1P", "values": map_nal_1},
                    {"key": "usd_ton_ny_1p",  "label": "USD/TON N.Y. (US$) 1P",  "values": map_ny_1},
                    {"key": "usd_ton_nal_2p", "label": "USD/TON NAL (US$) 2P", "values": map_nal_2},
                    {"key": "usd_ton_ny_2p",  "label": "USD/TON N.Y. (US$) 2P",  "values": map_ny_2},
                ],
                "kpis": {
                    "ny": {
                        "promedio_1p": prom_ny_1,
                        "promedio_2p": prom_ny_2,
                        "maximo": max_ny,
                        "minimo": min_ny,
                        "valor_abs": valor_abs,
                        "variacion_pct": variacion_pct
                    },
                    "promedios_nal": {
                        "promedio_1p": prom_nal_1,
                        "promedio_2p": prom_nal_2,
                    }
                },
                "cards": {
                    "base": "1P",
                    "promedio_bolsa_ny": prom_ny_1,
                    "maximo_ny": max_ny,
                    "minimo_ny": min_ny,
                    "valor_abs": valor_abs,
                    "variacion_pct": variacion_pct,
                },
                "anotaciones": {
                    "avg_lines": [
                        {"series": "usd_ton_ny_1p",  "value": prom_ny_1,  "label": f"${prom_ny_1:,}" if prom_ny_1 is not None else None, "style": "dotted", "arrow": "right"},
                        {"series": "usd_ton_nal_1p", "value": prom_nal_1, "label": f"${prom_nal_1:,}" if prom_nal_1 is not None else None, "style": "dotted", "arrow": "right"},
                        {"series": "usd_ton_ny_2p",  "value": prom_ny_2,  "label": f"${prom_ny_2:,}" if prom_ny_2 is not None else None, "style": "dotted", "arrow": "right"},
                        {"series": "usd_ton_nal_2p", "value": prom_nal_2, "label": f"${prom_nal_2:,}" if prom_nal_2 is not None else None, "style": "dotted", "arrow": "right"},
                    ],
                    "markers": []
                }
            }

            return Response({
                "success": True,
                "message": "Serie mensual NAL vs N.Y. (2 periodos) lista para graficar",
                "data": data
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "message": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error al generar serie comparada: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NalPromedioMensualView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/nal-promedio-mensual/
    Promedio mensual del precio nacional en COP/TON de facturas nacionales pagadas.
    Filtros: fecha_inicio (YYYY-MM-DD), fecha_fin (YYYY-MM-DD) [obligatorios]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            fecha_inicio_str = request.query_params.get('fecha_inicio')
            fecha_fin_str = request.query_params.get('fecha_fin')

            if not fecha_inicio_str or not fecha_fin_str:
                return Response({
                    "success": False,
                    "detail": "Los parámetros fecha_inicio y fecha_fin son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

            if fecha_inicio > fecha_fin:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio debe ser menor o igual a la fecha de fin"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Agregar mes truncado y sumar valor_neto y kilos por mes
            qs = (
                FacturaUnica.objects
                .filter(fecha_compra__range=(fecha_inicio, fecha_fin), estado_factura='PA')
                .annotate(mes=TruncMonth('fecha_compra'))
                .values('mes')
                .annotate(
                    total_valor_neto=Sum('valor_neto'),
                    total_kilos=Sum('total_kilos')
                )
                .order_by('mes')
            )

            # Mapear resultados por mes
            datos_por_mes = {r['mes']: r for r in qs}

            # Generar todos los meses del rango
            meses = []
            y, m = fecha_inicio.year, fecha_inicio.month
            while True:
                meses.append(date(y, m, 1))
                if y == fecha_fin.year and m == fecha_fin.month:
                    break
                m += 1
                if m == 13:
                    m = 1
                    y += 1

            filas = []
            for mes_dt in meses:
                registro = datos_por_mes.get(mes_dt, None)
                total_valor = Decimal(registro['total_valor_neto']) if registro and registro['total_valor_neto'] else Decimal('0')
                total_kg = Decimal(registro['total_kilos']) if registro and registro['total_kilos'] else Decimal('0')
                nal_cop_ton = Decimal('0')
                if total_kg > 0:
                    # Precio promedio COP por TON: (valor_neto / kilos) * 1000
                    nal_cop_ton = (total_valor / total_kg) * Decimal('1000')

                filas.append({
                    "mes": mes_dt.month,
                    "label": mes_en_letras(mes_dt.month)[:3].upper(),
                    "nal_cop": int(nal_cop_ton.quantize(Decimal('1')))
                })

            response_data = {
                "success": True,
                "detail": f"Promedio mensual NAL obtenido. Total meses: {len(filas)}",
                "data": {
                    "filtros": {
                        "fecha_inicio": fecha_inicio.strftime('%Y-%m-%d'),
                        "fecha_fin": fecha_fin.strftime('%Y-%m-%d')
                    },
                    "filas": filas
                }
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener NAL promedio mensual: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrmPromedioMensualView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/trm-promedio-mensual/
    Promedio mensual de TRM.
    Filtros: fecha_inicio (YYYY-MM-DD), fecha_fin (YYYY-MM-DD) [obligatorios]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            fecha_inicio_str = request.query_params.get('fecha_inicio')
            fecha_fin_str = request.query_params.get('fecha_fin')

            if not fecha_inicio_str or not fecha_fin_str:
                return Response({
                    "success": False,
                    "detail": "Los parámetros fecha_inicio y fecha_fin son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

            if fecha_inicio > fecha_fin:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio debe ser menor o igual a la fecha de fin"
                }, status=status.HTTP_400_BAD_REQUEST)

            qs = (
                TRM.objects
                .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
                .annotate(mes=TruncMonth('fecha_registro'))
                .values('mes')
                .annotate(trm_promedio=Avg('precio_trm'))
                .order_by('mes')
            )

            datos_por_mes = {r['mes']: r['trm_promedio'] for r in qs}

            meses = []
            y, m = fecha_inicio.year, fecha_inicio.month
            while True:
                meses.append(date(y, m, 1))
                if y == fecha_fin.year and m == fecha_fin.month:
                    break
                m += 1
                if m == 13:
                    m = 1
                    y += 1

            filas = []
            for mes_dt in meses:
                valor = datos_por_mes.get(mes_dt)
                filas.append({
                    "mes": mes_dt.month,
                    "label": mes_en_letras(mes_dt.month)[:3].upper(),
                    "trm_promedio": int(Decimal(str(valor)).quantize(Decimal('1'))) if valor is not None else 0
                })

            return Response({
                "success": True,
                "detail": f"TRM promedio mensual obtenido. Total meses: {len(filas)}",
                "data": {
                    "filtros": {
                        "fecha_inicio": fecha_inicio.strftime('%Y-%m-%d'),
                        "fecha_fin": fecha_fin.strftime('%Y-%m-%d')
                    },
                    "filas": filas
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener TRM promedio mensual: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BolsaNyPromedioMensualView(APIView):
    """
    Endpoint: GET /apii/reportes/tablero6/bolsa-ny-promedio-mensual/
    Promedio mensual de precios USD/TON de NY.
    Filtros: fecha_inicio (YYYY-MM-DD), fecha_fin (YYYY-MM-DD) [obligatorios]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            fecha_inicio_str = request.query_params.get('fecha_inicio')
            fecha_fin_str = request.query_params.get('fecha_fin')

            if not fecha_inicio_str or not fecha_fin_str:
                return Response({
                    "success": False,
                    "detail": "Los parámetros fecha_inicio y fecha_fin son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)

            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

            if fecha_inicio > fecha_fin:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio debe ser menor o igual a la fecha de fin"
                }, status=status.HTTP_400_BAD_REQUEST)

            qs = (
                BolsaNY.objects
                .filter(fecha_registro__range=(fecha_inicio, fecha_fin))
                .annotate(mes=TruncMonth('fecha_registro'))
                .values('mes')
                .annotate(usd_ton_ny=Avg('precio_cierre'))
                .order_by('mes')
            )

            datos_por_mes = {r['mes']: r['usd_ton_ny'] for r in qs}

            meses = []
            y, m = fecha_inicio.year, fecha_inicio.month
            while True:
                meses.append(date(y, m, 1))
                if y == fecha_fin.year and m == fecha_fin.month:
                    break
                m += 1
                if m == 13:
                    m = 1
                    y += 1

            filas = []
            for mes_dt in meses:
                valor = datos_por_mes.get(mes_dt)
                filas.append({
                    "mes": mes_dt.month,
                    "label": mes_en_letras(mes_dt.month)[:3].upper(),
                    "usd_ton_ny": int(Decimal(str(valor)).quantize(Decimal('1'))) if valor is not None else 0
                })

            return Response({
                "success": True,
                "detail": f"Bolsa NY promedio mensual obtenido. Total meses: {len(filas)}",
                "data": {
                    "filtros": {
                        "fecha_inicio": fecha_inicio.strftime('%Y-%m-%d'),
                        "fecha_fin": fecha_fin.strftime('%Y-%m-%d')
                    },
                    "filas": filas
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al obtener Bolsa NY promedio mensual: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TableroComparativoPreciosNalNy(APIView):
    """
    Tablero comparativo de precios nacionales vs Nueva York
    Endpoint: GET /apii/reportes/tablero-precio-promedio/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Validar y obtener fechas
            fechas = self.validar_fechas(request)
            if isinstance(fechas, Response):
                return fechas
            
            fecha_inicio_1, fecha_fin_1, fecha_inicio_2, fecha_fin_2, comparar_periodo_anterior = fechas
            
            # Obtener datos para ambos periodos
            datos_periodo_1 = self.obtener_datos_periodo(fecha_inicio_1, fecha_fin_1)
            datos_periodo_2 = self.obtener_datos_periodo(fecha_inicio_2, fecha_fin_2) if fecha_inicio_2 else None
            
            # Generar filas mensuales
            filas = self.generar_filas_mensuales(datos_periodo_1, datos_periodo_2, comparar_periodo_anterior)
            
            # Calcular resumen por año
            resumen = self.calcular_resumen_anual(datos_periodo_1, datos_periodo_2, comparar_periodo_anterior)
            
            # Preparar respuesta
            anio_izq = fecha_inicio_1.year
            anio_der = fecha_inicio_2.year if fecha_inicio_2 else None
            
            response_data = {
                "success": True,
                "detail": f"Datos del tablero de precios NAL vs N.Y. obtenidos correctamente. Total meses: {len(filas)}",
                "data": {
                    "filtros": {
                        "anio_izq": anio_izq,
                        "anio_der": anio_der,
                        "fecha_inicio_1": fecha_inicio_1.strftime("%Y-%m-%d"),
                        "fecha_fin_1": fecha_fin_1.strftime("%Y-%m-%d"),
                        "fecha_inicio_2": fecha_inicio_2.strftime("%Y-%m-%d") if fecha_inicio_2 else None,
                        "fecha_fin_2": fecha_fin_2.strftime("%Y-%m-%d") if fecha_fin_2 else None,
                        "comparar_periodo_anterior": comparar_periodo_anterior
                    },
                    "resumen": resumen,
                    "filas": filas
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "detail": f"Error al generar el tablero: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def validar_fechas(self, request):
        """Valida y obtiene las fechas de los parámetros de la request"""
        try:
            # Fechas del periodo 1 (obligatorias)
            fecha_inicio_1_str = request.query_params.get('fecha_inicio_1')
            fecha_fin_1_str = request.query_params.get('fecha_fin_1')
            
            if not fecha_inicio_1_str or not fecha_fin_1_str:
                return Response({
                    "success": False,
                    "detail": "Los parámetros fecha_inicio_1 y fecha_fin_1 son obligatorios"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            fecha_inicio_1 = datetime.strptime(fecha_inicio_1_str, '%Y-%m-%d').date()
            fecha_fin_1 = datetime.strptime(fecha_fin_1_str, '%Y-%m-%d').date()
            
            if fecha_inicio_1 > fecha_fin_1:
                return Response({
                    "success": False,
                    "detail": "La fecha de inicio debe ser menor o igual a la fecha de fin"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Fechas del periodo 2 (opcionales)
            fecha_inicio_2 = None
            fecha_fin_2 = None
            comparar_periodo_anterior = request.query_params.get('comparar_periodo_anterior', 'false').lower() == 'true'
            
            if comparar_periodo_anterior:
                # Si se activa comparar_periodo_anterior, derivar periodo 2
                rango_dias = (fecha_fin_1 - fecha_inicio_1).days
                fecha_inicio_2 = fecha_inicio_1.replace(year=fecha_inicio_1.year - 1)
                fecha_fin_2 = fecha_fin_1.replace(year=fecha_fin_1.year - 1)
            else:
                # Fechas explícitas del periodo 2
                fecha_inicio_2_str = request.query_params.get('fecha_inicio_2')
                fecha_fin_2_str = request.query_params.get('fecha_fin_2')
                
                if fecha_inicio_2_str and fecha_fin_2_str:
                    fecha_inicio_2 = datetime.strptime(fecha_inicio_2_str, '%Y-%m-%d').date()
                    fecha_fin_2 = datetime.strptime(fecha_fin_2_str, '%Y-%m-%d').date()
                    
                    if fecha_inicio_2 > fecha_fin_2:
                        return Response({
                            "success": False,
                            "detail": "La fecha de inicio del periodo 2 debe ser menor o igual a la fecha de fin"
                        }, status=status.HTTP_400_BAD_REQUEST)
            
            return fecha_inicio_1, fecha_fin_1, fecha_inicio_2, fecha_fin_2, comparar_periodo_anterior
            
        except ValueError as e:
            return Response({
                "success": False,
                "detail": f"Formato de fecha inválido. Use YYYY-MM-DD: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

    def obtener_datos_periodo(self, fecha_inicio, fecha_fin):
        """Obtiene todos los datos necesarios para un periodo específico"""
        # Facturas nacionales pagadas
        facturas = FacturaUnica.objects.filter(
            fecha_compra__range=(fecha_inicio, fecha_fin),
            estado_factura='PA'  # Estado pagada
        ).select_related('id_persona_proveedor')
        
        # TRM diario
        trm_diario = TRM.objects.filter(
            fecha_registro__range=(fecha_inicio, fecha_fin)
        ).order_by('fecha_registro')
        
        # Bolsa NY diario
        bolsa_ny_diario = BolsaNY.objects.filter(
            fecha_registro__range=(fecha_inicio, fecha_fin)
        ).order_by('fecha_registro')
        
        return {
            'facturas': facturas,
            'trm_diario': trm_diario,
            'bolsa_ny_diario': bolsa_ny_diario,
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin
        }

    def generar_filas_mensuales(self, datos_periodo_1, datos_periodo_2, comparar_periodo_anterior):
        """Genera las filas mensuales con datos de ambos periodos"""
        filas = []
        
        # Generar filas para todos los meses (1-12)
        for mes in range(1, 13):
            # Datos del periodo 1 (izquierda)
            datos_izq = self.calcular_datos_mes(datos_periodo_1, mes)
            
            # Datos del periodo 2 (derecha)
            datos_der = None
            if datos_periodo_2:
                datos_der = self.calcular_datos_mes(datos_periodo_2, mes)
            else:
                # Si no hay periodo 2, crear datos vacíos
                datos_der = {
                    'nal_cop': 0,
                    'usd_ton_nal': 0.0,
                    'usd_ton_ny': 0.0
                }
            
            # Calcular y agregar diferencias (absoluta y %) dentro de cada periodo
            try:
                ny_izq = float(datos_izq.get('usd_ton_ny') or 0)
                nal_izq = float(datos_izq.get('usd_ton_nal') or 0)
                dif_abs_izq = nal_izq - ny_izq
                dif_pct_izq = ((dif_abs_izq / ny_izq) * 100) if ny_izq != 0 else None
                datos_izq['dif_abs'] = round(dif_abs_izq, 3)
                datos_izq['dif_pct'] = round(dif_pct_izq, 1) if dif_pct_izq is not None else None
            except Exception:
                pass

            try:
                ny_der = float(datos_der.get('usd_ton_ny') or 0)
                nal_der = float(datos_der.get('usd_ton_nal') or 0)
                dif_abs_der = nal_der - ny_der
                dif_pct_der = ((dif_abs_der / ny_der) * 100) if ny_der != 0 else None
                datos_der['dif_abs'] = round(dif_abs_der, 3)
                datos_der['dif_pct'] = round(dif_pct_der, 1) if dif_pct_der is not None else None
            except Exception:
                pass
            
            fila = {
                "mes": mes,
                "label": mes_en_letras(mes)[:3].upper(),
                "anio_izq": datos_izq,
                "anio_der": datos_der
            }
            
            filas.append(fila)
        
        return filas

    def calcular_datos_mes(self, datos_periodo, mes):
        """Calcula los datos para un mes específico de un periodo"""
        fecha_inicio = datos_periodo['fecha_inicio']
        fecha_fin = datos_periodo['fecha_fin']
        
        # Filtrar facturas del mes
        facturas_mes = datos_periodo['facturas'].filter(
            fecha_compra__month=mes,
            fecha_compra__year__range=(fecha_inicio.year, fecha_fin.year)
        )
        
        # Calcular totales de facturas
        total_valor_neto = facturas_mes.aggregate(
            total=Sum('valor_neto')
        )['total'] or Decimal('0')
        
        total_kilos = facturas_mes.aggregate(
            total=Sum('total_kilos')
        )['total'] or Decimal('0')
        
        # TRM promedio del mes
        trm_mes = datos_periodo['trm_diario'].filter(
            fecha_registro__month=mes,
            fecha_registro__year__range=(fecha_inicio.year, fecha_fin.year)
        )
        trm_prom_cop = trm_mes.aggregate(
            promedio=Avg('precio_trm')
        )['promedio'] or Decimal('0')
        
        # Bolsa NY promedio del mes
        bolsa_ny_mes = datos_periodo['bolsa_ny_diario'].filter(
            fecha_registro__month=mes,
            fecha_registro__year__range=(fecha_inicio.year, fecha_fin.year)
        )
        usd_ton_ny = bolsa_ny_mes.aggregate(
            promedio=Avg('precio_cierre')
        )['promedio'] or Decimal('0')
        
        # Calcular precio nacional en USD/TON
        usd_ton_nal = Decimal('0')
        if total_kilos > 0 and trm_prom_cop > 0:
            # Convertir de kg a ton (dividir por 1000)
            # precio_nal_cop_kg = total_valor_neto / total_kilos
            # usd_ton_nal = (precio_nal_cop_kg / trm_prom_cop) * 1000
            precio_nal_cop_kg = total_valor_neto / total_kilos
            usd_ton_nal = (precio_nal_cop_kg / trm_prom_cop) * 1000
        
        return {
            'nal_cop': int(total_valor_neto),
            'usd_ton_nal': round(float(usd_ton_nal), 3),
            'usd_ton_ny': round(float(usd_ton_ny), 3)
        }

    def calcular_resumen_anual(self, datos_periodo_1, datos_periodo_2, comparar_periodo_anterior):
        """Calcula el resumen anual para ambos periodos"""
        resumen = {}
        
        # Resumen del periodo 1
        anio_1 = datos_periodo_1['fecha_inicio'].year
        resumen[str(anio_1)] = self.calcular_resumen_periodo(datos_periodo_1)
        
        # Resumen del periodo 2 (si existe)
        if datos_periodo_2:
            anio_2 = datos_periodo_2['fecha_inicio'].year
            resumen[str(anio_2)] = self.calcular_resumen_periodo(datos_periodo_2)
        
        return resumen

    def calcular_resumen_periodo(self, datos_periodo):
        """Calcula el resumen para un periodo específico"""
        facturas = datos_periodo['facturas']
        trm_diario = datos_periodo['trm_diario']
        bolsa_ny_diario = datos_periodo['bolsa_ny_diario']
        
        # Total nacional en COP
        total_nal_cop = facturas.aggregate(
            total=Sum('valor_neto')
        )['total'] or Decimal('0')
        
        # TRM promedio del periodo (para cálculo interno)
        prom_trm_cop = trm_diario.aggregate(
            promedio=Avg('precio_trm')
        )['promedio'] or Decimal('0')

        # Bolsa NY promedio del periodo
        usd_ton_ny = bolsa_ny_diario.aggregate(
            promedio=Avg('precio_cierre')
        )['promedio'] or Decimal('0')

        # USD/TON nacional del periodo (usando precio ponderado COP/kg)
        usd_ton_nal = Decimal('0')
        total_kilos = facturas.aggregate(
            total=Sum('total_kilos')
        )['total'] or Decimal('0')
        if prom_trm_cop > 0 and total_kilos > 0:
            precio_promedio_cop_kg = total_nal_cop / total_kilos
            usd_ton_nal = (precio_promedio_cop_kg / prom_trm_cop) * 1000

        # Diferencias a nivel de periodo
        dif_abs = float(usd_ton_nal) - float(usd_ton_ny)
        dif_pct = ((dif_abs / float(usd_ton_ny)) * 100) if float(usd_ton_ny) != 0 else None

        return {
            "total_nal_cop": int(total_nal_cop),
            "usd_ton_nal": round(float(usd_ton_nal), 3),
            "usd_ton_ny": round(float(usd_ton_ny), 3),
            "dif_abs": round(dif_abs, 3),
            "dif_pct": round(dif_pct, 1) if dif_pct is not None else None
        }
