/**
 * Calculates the maximum date by adding one month to the purchase date and setting the day to the registration days
 * @param fechaCompra - Purchase date in format 'YYYY-MM-DD'
 * @param diasRegistro - Number of days to set as the day of the month
 * @returns Date object representing the maximum date
 */
export const calcularFechaMaximaParaEditarFactura = (fechaCompra: string, diasRegistro: number): Date => {
    const [year, month, day] = fechaCompra.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
  
    // Creamos dos fechas de corte para comparar: 
    const inicioRango = new Date(year, month - 1, 6); 
    const finRango = new Date(year, month, 5);        
  
    let limite: Date;
  
    if (fecha >= inicioRango && fecha <= finRango) {
      // Está dentro del rango, entonces el límite es díaRegistro del mes siguiente
      limite = new Date(year, month, diasRegistro);
    } else {
      // Está en el rango anterior, entonces el límite es díaRegistro del mes actual
      limite = new Date(year, month - 1, diasRegistro);
    }
  
    return limite;
};

/**
 * Calculates the maximum date by adding one month to the purchase date and setting the day to the registration days
 * @param diasRegistro - Number of days to set as the day of the month
 * @returns Date object representing the maximum date
 */
export const calcularFechaLimitePago = (diasRegistro: number): string => {

    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth();
    const fechaLimite = new Date(year, month + 1, diasRegistro);
    return formatearFechaDMY(fechaLimite);
};

export const obtenerNombreMes = (fechaStr: string): string => {
    const [, mes] = fechaStr.split('-');
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const indiceMes = parseInt(mes, 10) - 1;

    return meses[indiceMes] ?? 'Mes inválido';
};

export const obtenerDia = (fechaStr: string): string => {
    const [dia] = fechaStr.split('-');
    return dia;
};

export const obtenerAnio = (fechaStr: string): string => {
    const [, , anio] = fechaStr.split('-');
    return anio;
};

/**
 * Formats a date to 'DD-MM-YYYY' string format
 * @param fecha - Date object to format
 * @returns Formatted date string
 */
export const formatearFechaDMY = (fecha: Date): string => {
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();
    return `${d}-${m}-${y}`;
};

export const formatearFechaDMYUTC = (fechaStr: string): string => {
    const fecha = new Date(fechaStr); 

    const d = String(fecha.getUTCDate()).padStart(2, '0');
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const y = fecha.getUTCFullYear();

    return `${d}-${m}-${y}`;
};

/**
 * Formats a date to 'YYYY-MM-DD' string format
 * @param fecha - Date object to format
 * @returns Formatted date string
 */
export const formatearFecha = (fecha: Date): string => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const formatearFechaString = (fecha: string): Date => {
    const [year, month, day] = fecha.split('-').map(Number);
    return new Date(year, month - 1, day);
};



export const getFechaActualColombia = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  
    // Esto te da el string directamente en formato YYYY-MM-DD
    return formatter.format(new Date());
  };

/**
 * Creates a Date object from a date string without timezone issues
 * @param fechaStr - Date string in 'YYYY-MM-DD' format
 * @returns Date object representing the date in local timezone
 */
export const crearFechaSinZonaHoraria = (fechaStr: string): Date => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Formats a date string to 'DD-MM-YYYY' without timezone issues
 * @param fechaStr - Date string in 'YYYY-MM-DD' format
 * @returns Formatted date string
 */
export const formatearFechaStringDMY = (fechaStr: string): string => {
    const fecha = crearFechaSinZonaHoraria(fechaStr);
    return formatearFechaDMY(fecha);
};

/**
 * Creates a Date object from a date string, handling both ISO and simple date formats
 * @param fechaStr - Date string (can be 'YYYY-MM-DD' or ISO format)
 * @returns Date object
 */
export const crearFechaRobusta = (fechaStr: string): Date => {
    if (!fechaStr) {
        throw new Error('Fecha vacía');
    }
    
    // Si ya es formato ISO (contiene 'T' o 'Z'), usar directamente
    if (fechaStr.includes('T') || fechaStr.includes('Z')) {
        return new Date(fechaStr);
    }
    
    // Si es formato simple 'YYYY-MM-DD', agregar 'T00:00:00' para evitar zona horaria
    return new Date(fechaStr + 'T00:00:00');
};

/**
 * Formats a date string to 'DD-MM-YYYY' handling both ISO and simple date formats
 * @param fechaStr - Date string (can be 'YYYY-MM-DD' or ISO format)
 * @returns Formatted date string
 */
export const formatearFechaRobustaDMY = (fechaStr: string): string => {
    const fecha = crearFechaRobusta(fechaStr);
    return formatearFechaDMY(fecha);
};