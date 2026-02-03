// utils/formatters.ts
/**
 * Formatea un número con separador de miles “.” y separador decimal “,”.
 * *No* redondea: solo corta/rellena hasta `decimals`.
 */
export const formatNumber = (
    value: number | string | null | undefined,
    decimals = 0
): string => {
    if (value === null || value === undefined) return '';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    const [int, dec = ''] = num.toString().split('.');
    const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (decimals === 0) return intFormatted;

    const decFixed = (dec + '0'.repeat(decimals)).slice(0, decimals);
    return `${intFormatted},${decFixed}`;
};

/** Formatea como moneda colombiana (COP) — ej.: $ 1.234,56 */
export const formatCurrency = (
    value: number | string | null | undefined
): string => {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return `$ ${formatNumber(num, 0)}`;
};

/** Formatea un número como porcentaje — ej.: 3 → 3%, 22.89 → 22,89% */
export const formatPercentage = (
    value: number | string | null | undefined,
    decimals = 0
): string => {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return `${formatNumber(num, decimals)}%`;
};

/**
 * Convierte un número decimal a porcentaje con hasta dos decimales.
 * @param value Número decimal (ej. 0.03, 0.2289)
 * @returns Cadena con formato de porcentaje (ej. '3%', '22,89%')
 */
export const formatToPercentage = (value: number): string => {
    if (isNaN(value)) return '0%';
    return (value * 100).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }) + '%';
}

// Función para formatear números con comas como separador decimal (para cantidad kilos)
export const formatNumberWithCommas = (value: string): string => {
    if (!value) return '';

    const numericValue = value.replace(/[^0-9.]/g, '');
    if (!numericValue) return '';

    const hasTrailingDecimal = numericValue.endsWith('.');
    const [rawIntegerPart = '', ...decimalSections] = numericValue.split('.');
    // Limitar a máximo 2 dígitos decimales
    const decimalPart = decimalSections.join('').slice(0, 2);

    let integerPart = rawIntegerPart.replace(/^0+(?=\d)/, '');
    if (!integerPart && rawIntegerPart !== '') {
        integerPart = '0';
    }

    let formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (!formattedInteger && (decimalPart || hasTrailingDecimal)) {
        formattedInteger = '0';
    }

    if (decimalPart) {
        return `${formattedInteger},${decimalPart}`;
    }

    if (hasTrailingDecimal) {
        return `${formattedInteger},`;
    }

    return formattedInteger;
};

