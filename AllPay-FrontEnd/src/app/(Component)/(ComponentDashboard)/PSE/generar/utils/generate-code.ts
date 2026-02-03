import { formatearFecha } from '@/utils/dateUtils';

interface GenerateCodeParams {
    empresa: string;
    referencia: string;
    valorPagar: number;
    fechaMaximaPago: string; 
}

export const generateCode = ({
        empresa,
        referencia,
        valorPagar,
        fechaMaximaPago
    }: GenerateCodeParams
): string => {

    const valorPagarFormateado = Math.trunc(valorPagar);
    const fechaMaximaPagoFormateada = formatearFecha(new Date(fechaMaximaPago));
    const fechaMaximaPagoFormateadaCompacta = formatearFechaCompacta(fechaMaximaPagoFormateada);
    const codigoBarras = `(415)${empresa}(8020)${referencia}(3900)${valorPagarFormateado}(96)${fechaMaximaPagoFormateadaCompacta}`;

    return codigoBarras;
};

/**
 * Convierte una fecha string "YYYY-MM-DD" a "YYYYMMDD"
 * @param fecha - string en formato "YYYY-MM-DD"
 * @returns string en formato "YYYYMMDD"
 */
function formatearFechaCompacta(fecha: string): string {
    return fecha.replace(/-/g, '');
  }