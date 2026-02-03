/**
 * Constantes para los estados de liquidación
 */
export const ESTADO_LIQUIDACION = {
  NO_LIQUIDADO: 'N',
  LIQUIDADO: 'L',
  PAGADO: 'P'
};

/**
 * Interface básica para facturas
 */
interface FacturaBase {
  cod_estado_liquidacion?: string;
  cod_estado_liquidacion_display?: string;
  estado_liquidacion_display?: string;
}

/**
 * Filtra un array de facturas para obtener solo las que están en estado "Liquidado" (no pagadas)
 * 
 * @param facturas Array de facturas a filtrar
 * @returns Solo las facturas en estado "Liquidado"
 */
export function filtrarFacturasLiquidadasPSE<T extends FacturaBase>(facturas: T[]): T[] {
  return facturas.filter(factura => {
    // Verificar por cod_estado_liquidacion primero
    if (factura.cod_estado_liquidacion === ESTADO_LIQUIDACION.LIQUIDADO) {
      return true;
    }
    
    // Si no tiene cod_estado_liquidacion, verificar por el display
    if (!factura.cod_estado_liquidacion) {
      return factura.cod_estado_liquidacion_display === 'Liquidado' || 
             factura.estado_liquidacion_display === 'Liquidado';
    }
    
    return false;
  });
}

/**
 * Filtra un array de facturas para obtener solo las que están en estado "Pagado"
 * 
 * @param facturas Array de facturas a filtrar
 * @returns Solo las facturas en estado "Pagado"
 */
export function filtrarFacturasPagadasPSE<T extends FacturaBase>(facturas: T[]): T[] {
  return facturas.filter(factura => {
    // Verificar por cod_estado_liquidacion primero
    if (factura.cod_estado_liquidacion === ESTADO_LIQUIDACION.PAGADO) {
      return true;
    }
    
    // Si no tiene cod_estado_liquidacion, verificar por el display
    if (!factura.cod_estado_liquidacion) {
      return factura.cod_estado_liquidacion_display === 'Pagado' || 
             factura.estado_liquidacion_display === 'Pagado';
    }
    
    return false;
  });
} 