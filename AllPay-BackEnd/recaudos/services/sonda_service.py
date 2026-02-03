import traceback
from datetime import timedelta
from decimal import Decimal
from typing import Optional, Dict, List, Any
from time import sleep

from django.db import transaction
from django.utils import timezone
from django.conf import settings

from recaudos.models import Pagos, FacturaUnica
from recaudos.integrations.zonapagos_soap import verificacion_pago_soap


class SondaPagosConfig:
    """Configuración centralizada de la sonda"""
    
    # Estados que indican fin del proceso de pago
    ESTADOS_FINALES = {"1", "1000", "1001", "4000", "4003"}
    
    # Estados que indican PAGO EXITOSO (solo estos finalizan documentos)
    ESTADOS_EXITOSOS = {"1"}
    
    # Mapeo de estados ZonaPagos -> Sistema interno
    MAPEO_ESTADOS = {
        '1': 'AP',      # Aprobado
        '888': 'PE',    # Pendiente
        '999': 'PE',    # Pendiente
        '4001': 'PE',   # Pendiente
        '4000': 'RE',   # Rechazado
        '4003': 'FA',   # Fallido
        '1000': 'RE',   # Rechazado
        '1001': 'FA',   # Fallido
    }
    
    # Mapeo de formas de pago
    MAPEO_MEDIOS_PAGO = {
        29: "PSE",
        32: "TC",
        41: "PDF",
        42: "GANA",
        45: "TT",
    }
    
    # Ventana de tiempo para buscar pagos pendientes
    VENTANA_HORAS = 1
    
    # Estados a consultar
    ESTADOS_PENDIENTES = ('PE', 'IN')
    
    # Reintentos para llamadas SOAP
    MAX_REINTENTOS = 3
    DELAY_REINTENTO = 2  # segundos
    
    @classmethod
    def get_credenciales(cls) -> Dict[str, str]:
        """Obtiene credenciales de forma segura"""
        zpagos = getattr(settings, 'ZPAGOS', {})
        return {
            'id_comercio': str(zpagos.get('ID_COMERCIO', '')),
            'usuario': zpagos.get('USUARIO', ''),
            'clave': zpagos.get('CLAVE', ''),
        }


class SondaPagosService:
    """
    Servicio para verificar y asentar pagos pendientes.
    """
    
    def __init__(self, config: Optional[SondaPagosConfig] = None):
        self.config = config or SondaPagosConfig()
        self.credenciales = self.config.get_credenciales()
        self.stats = {
            'total': 0,
            'procesados': 0,
            'exitosos': 0,
            'errores': 0,
            'sin_cambios': 0
        }
    
    def ejecutar(self) -> Dict[str, int]:
        """
        Ejecuta la sonda de pagos completa.
        
        Returns:
            Diccionario con estadísticas de ejecución
        """
        if not self._hay_pagos_pendientes():
            print("No hay pagos pendientes para procesar")
            return self.stats
        
        pagos_pendientes = self._obtener_pagos_pendientes()
        self.stats['total'] = pagos_pendientes.count()
        
        print(f"Encontrados {self.stats['total']} pagos pendientes")
        
        for i, pago in enumerate(pagos_pendientes, 1):
            self._procesar_pago(pago, i)
        
        return self.stats
    
    def _hay_pagos_pendientes(self) -> bool:
        """Verifica si hay pagos pendientes para procesar"""
        fecha_limite = timezone.now() - timedelta(hours=self.config.VENTANA_HORAS)
        
        return Pagos.objects.filter(
            cod_estado_pago__in=self.config.ESTADOS_PENDIENTES,
            fecha_estado_pago__gte=fecha_limite,
            str_id_pago_zp__isnull=False
        ).exclude(
            str_id_pago_zp=''
        ).exists()
    
    def _obtener_pagos_pendientes(self):
        """Obtiene queryset de pagos pendientes"""
        fecha_limite = timezone.now() - timedelta(hours=self.config.VENTANA_HORAS)
        
        return Pagos.objects.filter(
            cod_estado_pago__in=self.config.ESTADOS_PENDIENTES,
            fecha_estado_pago__gte=fecha_limite,
            str_id_pago_zp__isnull=False
        ).exclude(
            str_id_pago_zp=''
        ).select_related(
            'id_liquidacion_pago'
        ).order_by('fecha_estado_pago')
    
    def _procesar_pago(self, pago: Pagos, index: int):
        """Procesa un pago individual"""
        id_pago_zp = pago.str_id_pago_zp
        
        print(
            f"\n[{index}/{self.stats['total']}] Procesando pago "
            f"ID: {pago.id_pago} | ZP: {id_pago_zp}"
        )
        
        try:
            # 1. Consultar estado en ZonaPagos (con reintentos)
            resp = self._consultar_zonapagos_con_reintentos(id_pago_zp)
            
            if not resp['success']:
                print(f"  ⚠️ Verificación falló: {resp.get('error')}")
                self.stats['errores'] += 1
                return
            
            pagos_zp = resp.get('res_pago', [])
            
            if not pagos_zp:
                print("Sin información de pago en ZonaPagos")
                self.stats['sin_cambios'] += 1
                return
            
            # 2. Asentar el pago
            self._asentar_pago(pago, pagos_zp)
            self.stats['procesados'] += 1
            self.stats['exitosos'] += 1
            
        except Exception as e:
            print(f"  Error procesando pago ZP ID {id_pago_zp}: {e}")
            traceback.print_exc()
            self.stats['errores'] += 1
    
    def _consultar_zonapagos_con_reintentos(self, id_pago_zp: str) -> Dict[str, Any]:
        """Consulta el estado del pago en ZonaPagos con reintentos"""
        ultimo_error = None
        
        for intento in range(1, self.config.MAX_REINTENTOS + 1):
            try:
                resp = verificacion_pago_soap(
                    int_id_comercio=self.credenciales['id_comercio'],
                    str_usr_comercio=self.credenciales['usuario'],
                    str_pwd_Comercio=self.credenciales['clave'],
                    str_id_pago=str(id_pago_zp),
                    int_no_pago=-1
                )
                
                if resp.get('success'):
                    return resp
                    
                ultimo_error = resp.get('error', 'Error desconocido')
                
            except Exception as e:
                ultimo_error = str(e)
                print(f"Intento {intento}/{self.config.MAX_REINTENTOS} falló: {e}")
            
            if intento < self.config.MAX_REINTENTOS:
                sleep(self.config.DELAY_REINTENTO)
        
        return {
            'success': False,
            'error': f'Fallaron todos los reintentos. Último error: {ultimo_error}'
        }
    
    @transaction.atomic
    def _asentar_pago(self, pago: Pagos, pagos_zp: List[Dict]):
        """
        Asienta los datos del pago verificado.
        Usa transacción atómica para garantizar consistencia.
        """
        # Usar el pago más reciente de la respuesta
        p_reciente = pagos_zp[-1]
        estado_zp = str(p_reciente.get("int_estado_pago", "")).strip()
        
        # Bloquear registro para actualización
        pago = Pagos.objects.select_for_update().get(id_pago=pago.id_pago)
        
        # Verificar si ya fue procesado (evitar reprocesar)
        if pago.cod_estado_pago not in self.config.ESTADOS_PENDIENTES:
            print(f"Pago ya procesado (estado: {pago.cod_estado_pago}), saltando...")
            return
        
        # Actualizar campos del pago
        pago.cod_estado_pago = self._mapear_estado(estado_zp)
        pago.valor_pagado = self._to_decimal(p_reciente.get("dbl_valor_pagado"))
        pago.fecha_estado_pago = timezone.now()
        pago.cod_medio_pago = self._mapear_medio_pago(
            p_reciente.get("int_id_forma_pago")
        )
        
        # Datos de la persona que paga
        pago.apellidos_persona_paga = p_reciente.get("str_apellido") or pago.apellidos_persona_paga
        pago.nombres_persona_paga = p_reciente.get("str_nombre") or pago.nombres_persona_paga
        pago.email_persona_paga = p_reciente.get("str_email") or pago.email_persona_paga
        pago.nro_celular_persona_paga = p_reciente.get("str_telefono") or pago.nro_celular_persona_paga
        
        # Datos de trazabilidad ZonaPagos
        pago.bank_code = p_reciente.get("int_codigo_banco") or pago.bank_code
        pago.int_no_pago = str(p_reciente.get("int_n_pago") or "").strip() or pago.int_no_pago
        pago.int_estado_pago = estado_zp
        pago.int_id_forma_pago = str(p_reciente.get("int_id_forma_pago") or "").strip() or pago.int_id_forma_pago
        pago.ticket_id = p_reciente.get("str_ticketID") or pago.ticket_id
        pago.cus = p_reciente.get("str_codigo_transaccion") or pago.cus
        pago.franquicia = p_reciente.get("str_nombre_banco") or pago.franquicia
        pago.num_recibo = p_reciente.get("str_codigo_transaccion") or pago.num_recibo
        
        print(
            f"Actualizando: estado={pago.cod_estado_pago}, "
            f"valor={pago.valor_pagado}, medio={pago.cod_medio_pago}"
        )
        
        # Si es estado final
        if estado_zp in self.config.ESTADOS_FINALES:
            pago.fecha_pago = timezone.now()
            
            # Solo finalizar documentos si el pago fue EXITOSO
            if estado_zp in self.config.ESTADOS_EXITOSOS:
                print(f"Pago APROBADO ({estado_zp}), finalizando documentos...")
                self._finalizar_documentos(pago)
            else:
                print(f"Pago RECHAZADO/FALLIDO ({estado_zp})")
        
        pago.save()
        print(f"Pago {pago.id_pago} actualizado")
    
    def _finalizar_documentos(self, pago: Pagos):
        """Finaliza documentos relacionados al pago"""
        try:
            liq = pago.id_liquidacion_pago
            
            if not liq:
                print(f"Pago {pago.id_pago} sin liquidación asociada")
                return
            
            # Actualizar liquidación
            liq.cod_estado = 'P'
            liq.fecha_pago = pago.fecha_pago or timezone.now()
            liq.save()
            
            print(f"Liquidación {liq.id_liq_factura_unica} -> estado 'P'")
            
            # Actualizar facturas
            facturas_actualizadas = FacturaUnica.objects.filter(
                id_liq_factura_unica=liq
            ).update(estado_factura='PA')
            
            print(f"{facturas_actualizadas} factura(s) actualizadas a 'PA'")
            
        except Exception as e:
            print(f"Error finalizando documentos: {e}")
            traceback.print_exc()
    
    def _mapear_estado(self, id_estado: str) -> str:
        """Mapea estado de ZonaPagos a estado interno"""
        return self.config.MAPEO_ESTADOS.get(id_estado, 'PE')
    
    def _mapear_medio_pago(self, id_forma) -> str:
        """Mapea forma de pago de ZonaPagos a medio interno"""
        if id_forma is None or id_forma == "":
            return "bank_account"
        
        try:
            id_int = int(id_forma)
            return self.config.MAPEO_MEDIOS_PAGO.get(id_int, str(id_int))
        except (ValueError, TypeError):
            return "bank_account"
    
    @staticmethod
    def _to_decimal(value) -> Optional[Decimal]:
        """Convierte a Decimal de forma segura"""
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None


# ============================================
# FUNCIONES PÚBLICAS PARA USO EXTERNO
# ============================================

def verificar_pago_individual(id_pago_zp: str) -> Dict[str, Any]:
    """
    Función pública para verificar un pago específico.
    Útil para llamadas desde views o API.
    """
    service = SondaPagosService()
    
    try:
        pago = Pagos.objects.get(str_id_pago_zp=id_pago_zp)
        resp = service._consultar_zonapagos_con_reintentos(id_pago_zp)
        
        if not resp['success']:
            return {
                'success': False,
                'error': resp.get('error', 'Error desconocido')
            }
        
        pagos_zp = resp.get('res_pago', [])
        
        if pagos_zp:
            service._asentar_pago(pago, pagos_zp)
        
        return {
            'success': True,
            'cantidad_pagos': resp.get('cantidad_pagos', 0),
            'data': pagos_zp
        }
        
    except Pagos.DoesNotExist:
        return {
            'success': False,
            'error': f'Pago con ZP ID {id_pago_zp} no encontrado'
        }
    except Exception as e:
        print(f"Error verificando pago: {e}")
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }