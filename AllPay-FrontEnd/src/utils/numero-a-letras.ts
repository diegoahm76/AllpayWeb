/* --------------------------------------------------------------
   numero-a-letras.ts
   -------------------------------------------------------------- */

   export interface NumeroALetrasOptions {
    /** Estas opciones ya no influirán en la moneda principal */
    centPlural?: string;
    centSingular?: string;
    /** true  → “una, dos” (femenino) | false → “uno, dos” (masc.)  */
    femenino?: boolean;
  }
  
  type Section = [string, number];
  
  const UNIDADES_MASC = [
    '', 'uno', 'dos', 'tres', 'cuatro',
    'cinco', 'seis', 'siete', 'ocho', 'nueve'
  ];
  const UNIDADES_FEM = [
    '', 'una', 'dos', 'tres', 'cuatro',
    'cinco', 'seis', 'siete', 'ocho', 'nueve'
  ];
  
  const DIEZ_DIECI = [
    'diez', 'once', 'doce', 'trece', 'catorce',
    'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'
  ];
  const DIEZ_VEINTI = [
    '', '', 'veinte', 'treinta', 'cuarenta',
    'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'
  ];
  const CENTENAS = [
    '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos',
    'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
  ];
  
  function seccion(num: number, divisor: number, nombreSing: string, nombrePlural: string): Section {
    const miles = Math.floor(num / divisor);
    const resto = num - miles * divisor;
    let letras = '';
    if (miles > 0) {
      letras = miles > 1 ? `${convertir(miles)} ${nombrePlural}` : nombreSing;
    }
    return [letras, resto];
  }
  
  function centenas(num: number, femenino: boolean): string {
    const unidades = femenino ? UNIDADES_FEM : UNIDADES_MASC;
    if (num === 100) return 'cien';
  
    let resultado = '';
    const centena = Math.floor(num / 100);
    const decena = Math.floor((num - centena * 100) / 10);
    const unidad = num % 10;
  
    if (centena !== 0) resultado += `${CENTENAS[centena]} `;
  
    if (decena === 1) {
      resultado += DIEZ_DIECI[unidad];
    } else if (decena === 2 && unidad !== 0) {
      resultado += `veinti${unidades[unidad]}`;
    } else {
      if (decena > 1) {
        resultado += DIEZ_VEINTI[decena];
        if (unidad > 0) resultado += ` y ${unidades[unidad]}`;
      } else if (unidad > 0) {
        resultado += unidades[unidad];
      }
    }
  
    return resultado.trim();
  }
  
  function convertir(num: number, femenino = false): string {
    if (num === 0) return 'cero';
  
    let palabras = '';
    let resto = num;
  
    // Billones
    let [letras, nuevoResto] = seccion(resto, 1_000_000_000, 'mil millones', 'mil millones');
    resto = nuevoResto;
    if (letras) palabras += `${letras} `;
  
    // Millones
    [letras, resto] = seccion(resto, 1_000_000, 'un millón', 'millones');
    if (letras) palabras += `${letras} `;
  
    // Miles
    [letras, resto] = seccion(resto, 1_000, 'mil', 'mil');
    if (letras) palabras += `${letras} `;
  
    // Resto (0-999)
    palabras += centenas(resto, femenino);
  
    // Ajuste “uno/una” antes de millón/mil
    if (palabras.endsWith(' uno')) {
      palabras = palabras.slice(0, -3) + (femenino ? 'una' : 'un');
    }
  
    return palabras.trim();
  }
  
  /**
   * Convierte un número a letras en español,
   * siempre en MAYÚSCULAS y añade "PESO MONEDA CORRIENTE" al final.
   *
   * @param n    número a convertir (hasta 999 999 999 999,99)
   * @param opts opciones de salida (solo centavos y género)
   */
  export function numeroALetras(n: number, opts: NumeroALetrasOptions = {}): string {
    if (!Number.isFinite(n)) throw new Error('Número inválido');
  
    const { centPlural = 'CENTAVOS', centSingular = 'CENTAVO', femenino = false } = opts;
  
    const entero = Math.floor(Math.abs(n));
    const centavos = Math.round((Math.abs(n) - entero) * 100);
  
    let letras = convertir(entero, femenino);
  
    // Centavos (opcional)
    if (opts.centPlural || opts.centSingular) {
      letras += ' CON ';
      letras += centavos === 0
        ? `CERO ${centPlural}`
        : `${convertir(centavos, femenino)} ${centavos === 1 ? centSingular : centPlural}`;
    }
  
    // Apéndice fijo y forzado a mayúsculas
    letras = `${letras} PESOS M/CTE`.toUpperCase();
  
    return letras;
  }
  