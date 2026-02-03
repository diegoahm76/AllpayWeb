import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Pagination } from '@mui/material';
import * as XLSX from 'xlsx';
// Importar componentes de alerta personalizados
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
// Importar exportador optimizado con ExcelJS
import { customExcelExporter as excelJSExporter, convertDynamicTableData } from '@/utils/excelExporter';

interface Column {
    key: string;
    label: string;
    width?: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface DynamicTableProps {
    columns: Column[];
    data: any[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    actions?: {
        label: string;
        render: (row: any) => React.ReactNode;
    }[];
    isLoading?: boolean;
    onDownloadExcel?: () => Promise<any[]>;
    downloadButtonPosition?: 'top' | 'bottom';
    expandable?: {
        expandedRowRender: (record: any) => React.ReactNode;
        rowExpandable?: (record: any) => boolean;
    };
    fetchAllData?: (page: number) => Promise<{ data: any[]; total_pages: number }>;
    fetchDataForExcel?: () => Promise<{ data: any[]; total_pages: number }>;
    /**
     * Exportador personalizado de Excel (opcional). Si se provee,
     * reemplaza la descarga por defecto y permite incluir columnas
     * distintas a las visibles en la tabla.
     */
    customExcelExporter?: () => Promise<{
        columns: { key: string; label: string }[];
        data: any[];
        fileName?: string;
        sheetName?: string;
        sheets?: {
            name: string;
            columns: { key: string; label: string }[];
            data: any[];
        }[];
    }>;
    /**
     * 🚀 Usar ExcelJS optimizado para mejor rendimiento (recomendado para datasets grandes)
     * Si es true, usa ExcelJS en lugar de XLSX para exportación
     * 
     * ⚠️ IMPORTANTE: Solo ExcelJS soporta:
     * - Imágenes (logo corporativo)
     * - Estilos avanzados (negrilla, colores, bordes)
     * - Mejor rendimiento con grandes volúmenes de datos
     * 
     * XLSX tiene limitaciones y NO soporta imágenes ni estilos complejos.
     * Por defecto es true (recomendado).
     */
    useExcelJS?: boolean;
    /**
     * Tamaño de chunk para procesamiento optimizado (solo aplica si useExcelJS es true)
     * Por defecto se calcula automáticamente basado en el tamaño de datos
     */
    excelChunkSize?: number;
    actionsHeader?: React.ReactNode;
    actionsTop?: React.ReactNode;
    darkMode?: boolean;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
    columns,
    data,
    currentPage,
    totalPages,
    onPageChange,
    actions,
    isLoading = false,
    // onDownloadExcel,
    downloadButtonPosition = 'top',
    expandable,
    fetchAllData,
    fetchDataForExcel,
    customExcelExporter,
    useExcelJS = true, // 🚀 Usar ExcelJS por defecto (soporta logo e imágenes)
    excelChunkSize,
    actionsHeader,
    actionsTop
}) => {
    // Determinar si usar table-fixed o table-auto basado en si hay columnas con width definido
    const hasFixedWidths = columns.some(col => col.width);
    const tableLayout = hasFixedWidths ? 'table-fixed' : 'table-auto';
    const { theme } = useTheme();
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    } | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    
    // Estados para alertas personalizadas
    const [showLoaderAlert, setShowLoaderAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Resetear filas expandidas cuando cambia la página
    useEffect(() => {
        setExpandedRows(new Set());
    }, [currentPage]);

    // useEffect(() => {
    //     if (columns.length > 0 && !sortConfig) {
    //         setSortConfig({ key: columns[0].key, direction: 'asc' });
    //     }
    // }, [data, columns]);

    const handleSort = (key: string) => {
        if (sortConfig?.key === key) {
            setSortConfig({
                key,
                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
            });
        } else {
            setSortConfig({ key, direction: 'desc' });
        }
    };

    const toggleRow = (index: number) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(index)) {
            newExpandedRows.delete(index);
        } else {
            newExpandedRows.add(index);
        }
        setExpandedRows(newExpandedRows);
    };
    const getNestedValue = (obj: any, keyPath: string): any => {
        return keyPath.split('.').reduce((acc, key) => acc?.[key], obj);
      };
      
      const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;
      
        const { key, direction } = sortConfig;
        const aValueRaw = getNestedValue(a, key);
        const bValueRaw = getNestedValue(b, key);
      
        const normalize = (val: any) => {
          if (val === null || val === undefined) return '';
          return typeof val === 'string' ? val.toLowerCase().trim() : val;
        };
      
        const aVal = normalize(aValueRaw);
        const bVal = normalize(bValueRaw);
      
        const isNumeric = (v: any) => !isNaN(parseFloat(v)) && isFinite(v);
      
        if (isNumeric(aVal) && isNumeric(bVal)) {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
      
        return direction === 'asc'
          ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
          : bVal.localeCompare(aVal, 'es', { sensitivity: 'base' });
      });
      
      

    const handleDownloadExcel = async () => {
        const startTime = performance.now();
        console.log('🚀 [EXCEL DEBUG] Iniciando descarga de Excel');
        
        try {
            // Reemplazar SweetAlert con AlertLoader
            const alertStart = performance.now();
            setShowLoaderAlert(true);
            console.log(`⏱️ [EXCEL DEBUG] Mostrar alerta de carga: ${(performance.now() - alertStart).toFixed(2)}ms`);

            // 🚀 CAMINO 1: Exportador personalizado con ExcelJS (si está habilitado)
            if (customExcelExporter && useExcelJS) {
                console.log('🚀 [EXCEL DEBUG] Usando exportador personalizado con ExcelJS');
                const customStart = performance.now();
                const result = await customExcelExporter();
                console.log(`⏱️ [EXCEL DEBUG] Ejecutar customExcelExporter: ${(performance.now() - customStart).toFixed(2)}ms`);
                
                // Convertir resultado a formato ExcelJS
                const excelData = convertDynamicTableData(result.columns, result.data, getNestedValue);
                
                // Usar ExcelJS optimizado
                await excelJSExporter({
                    columns: excelData.columns,
                    data: excelData.data,
                    filename: result.fileName || 'Libro-de-excel.xlsx',
                    chunkSize: excelChunkSize,
                    sheetName: result.sheetName || 'Datos',
                    sheets: result.sheets?.map(sheet => ({
                        name: sheet.name,
                        columns: convertDynamicTableData(sheet.columns, sheet.data, getNestedValue).columns,
                        data: convertDynamicTableData(sheet.columns, sheet.data, getNestedValue).data
                    }))
                });

                setShowLoaderAlert(false);
                setShowSuccessAlert(true);
                console.log(`🎉 [EXCEL DEBUG] Descarga ExcelJS completada en: ${(performance.now() - startTime).toFixed(2)}ms`);
                return;
            }

            // 🔄 CAMINO 2: Exportador personalizado con XLSX (compatibilidad)
            if (customExcelExporter && !useExcelJS) {
                console.log('📊 [EXCEL DEBUG] Usando exportador personalizado con XLSX (legacy)');
                const customStart = performance.now();
                const result = await customExcelExporter();
                console.log(`⏱️ [EXCEL DEBUG] Ejecutar customExcelExporter: ${(performance.now() - customStart).toFixed(2)}ms`);
                
                // Verificar si hay múltiples hojas
                if (result?.sheets && result.sheets.length > 0) {
                    console.log(`📋 [EXCEL DEBUG] Procesando ${result.sheets.length} hojas múltiples`);
                    const multiSheetStart = performance.now();
                    
                    // Crear múltiples hojas
                    const wbStart = performance.now();
                    const wb = XLSX.utils.book_new();
                    console.log(`⏱️ [EXCEL DEBUG] Crear libro nuevo: ${(performance.now() - wbStart).toFixed(2)}ms`);
                    
                    const fileName = result?.fileName || 'Libro-de-excel.xlsx';
                    const LOGO_ROWS = 5;
                    
                    result.sheets.forEach((sheet, sheetIndex) => {
                        const sheetStart = performance.now();
                        if (sheet.columns.length > 0 && sheet.data.length > 0) {
                            console.log(`📄 [EXCEL DEBUG] Procesando hoja ${sheetIndex + 1}: ${sheet.data.length} filas, ${sheet.columns.length} columnas`);
                            
                            const headerStart = performance.now();
                            const headerLabels = sheet.columns.map(c => c.label);
                            console.log(`⏱️ [EXCEL DEBUG] Crear headers hoja ${sheetIndex + 1}: ${(performance.now() - headerStart).toFixed(2)}ms`);
                            
                            const bodyStart = performance.now();
                            const body = sheet.data.map(row => sheet.columns.map(col => {
                                const raw = getNestedValue(row, col.key);
                                return raw !== undefined && raw !== null ? raw : '';
                            }));
                            console.log(`⏱️ [EXCEL DEBUG] Crear body hoja ${sheetIndex + 1}: ${(performance.now() - bodyStart).toFixed(2)}ms`);
                            
                            const wsStart = performance.now();
                            // Añadir filas vacías para el logo
                            const emptyRows = Array(LOGO_ROWS).fill([]);
                            const ws = XLSX.utils.aoa_to_sheet([...emptyRows, headerLabels, ...body]);
                            
                            // Aplicar estilos de negrilla a los headers
                            const headerRowIndex = LOGO_ROWS;
                            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                            
                            for (let col = range.s.c; col <= range.e.c; col++) {
                                const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                                if (ws[cellAddress]) {
                                    ws[cellAddress].s = {
                                        font: { bold: true },
                                        alignment: { horizontal: 'center', vertical: 'center' },
                                        fill: { fgColor: { rgb: 'E0E0E0' } }
                                    };
                                }
                            }
                            
                            // Centrar contenido de todas las celdas de datos
                            for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
                                for (let col = range.s.c; col <= range.e.c; col++) {
                                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                                    if (ws[cellAddress]) {
                                        if (!ws[cellAddress].s) ws[cellAddress].s = {};
                                        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
                                    }
                                }
                            }
                            
                            // Calcular anchos automáticos
                            const colWidths = sheet.columns.map((col, index) => {
                                const headerText = headerLabels[index];
                                const headerWidth = headerText.length * 1.1 + 4;
                                
                                const maxContentWidth = sheet.data.reduce((max, row) => {
                                    const cellValue = getNestedValue(row, col.key);
                                    if (!cellValue) return max;
                                    
                                    const cellString = String(cellValue);
                                    let adjustedLength = cellString.length;
                                    
                                    const uppercaseCount = (cellString.match(/[A-Z]/g) || []).length;
                                    if (uppercaseCount > cellString.length * 0.5) {
                                        adjustedLength *= 1.15;
                                    }
                                    
                                    return Math.max(max, adjustedLength);
                                }, 0);
                                
                                const contentWidth = maxContentWidth + 4;
                                const calculatedWidth = Math.max(headerWidth, contentWidth);
                                const finalWidth = Math.min(Math.max(calculatedWidth, 10), 50);
                                
                                return { wch: finalWidth };
                            });
                            
                            ws['!cols'] = colWidths;
                            
                            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
                            console.log(`⏱️ [EXCEL DEBUG] Crear y agregar hoja ${sheetIndex + 1}: ${(performance.now() - wsStart).toFixed(2)}ms`);
                        }
                        console.log(`⏱️ [EXCEL DEBUG] Total hoja ${sheetIndex + 1}: ${(performance.now() - sheetStart).toFixed(2)}ms`);
                    });
                    
                    const writeStart = performance.now();
                    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    console.log(`⏱️ [EXCEL DEBUG] Escribir buffer Excel: ${(performance.now() - writeStart).toFixed(2)}ms`);
                    
                    const blobStart = performance.now();
                    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    console.log(`⏱️ [EXCEL DEBUG] Crear blob: ${(performance.now() - blobStart).toFixed(2)}ms`);
                    
                    const downloadStart = performance.now();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.click();
                    window.URL.revokeObjectURL(url);
                    console.log(`⏱️ [EXCEL DEBUG] Descargar archivo: ${(performance.now() - downloadStart).toFixed(2)}ms`);
                    
                    console.log(`⏱️ [EXCEL DEBUG] Total hojas múltiples: ${(performance.now() - multiSheetStart).toFixed(2)}ms`);
                    
                    setShowLoaderAlert(false);
                    setShowSuccessAlert(true);
                    console.log(`🎉 [EXCEL DEBUG] Descarga completada exitosamente en: ${(performance.now() - startTime).toFixed(2)}ms`);
                    return;
                }
                
                // Fallback al método original (una sola hoja)
                console.log('📄 [EXCEL DEBUG] Procesando hoja única personalizada');
                const singleSheetStart = performance.now();
                
                const allColumns = result?.columns || [];
                const allData = result?.data || [];
                const fileName = result?.fileName || 'Libro-de-excel.xlsx';
                const sheetName = result?.sheetName || 'Datos';

                console.log(`📊 [EXCEL DEBUG] Datos recibidos: ${allData.length} filas, ${allColumns.length} columnas`);

                if (allColumns.length === 0 || allData.length === 0) {
                    setShowLoaderAlert(false);
                    setErrorMessage('No hay datos o columnas para exportar');
                    setShowErrorAlert(true);
                    return;
                }

                const headerStart = performance.now();
                const headerLabels = allColumns.map(c => c.label);
                console.log(`⏱️ [EXCEL DEBUG] Crear headers personalizados: ${(performance.now() - headerStart).toFixed(2)}ms`);

                const body = allData.map(row => allColumns.map(col => {
                    const raw = getNestedValue(row, col.key);
                    return raw !== undefined && raw !== null ? raw : '';
                }));

                const wbStart = performance.now();
                const wb = XLSX.utils.book_new();
                
                // Añadir filas vacías para el logo
                const LOGO_ROWS = 5;
                const emptyRows = Array(LOGO_ROWS).fill([]);
                const ws = XLSX.utils.aoa_to_sheet([...emptyRows, headerLabels, ...body]);
                
                // Aplicar estilos de negrilla a los headers
                const headerRowIndex = LOGO_ROWS;
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                    if (ws[cellAddress]) {
                        ws[cellAddress].s = {
                            font: { bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' },
                            fill: { fgColor: { rgb: 'E0E0E0' } }
                        };
                    }
                }
                
                // Centrar contenido de todas las celdas de datos
                for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                        if (ws[cellAddress]) {
                            if (!ws[cellAddress].s) ws[cellAddress].s = {};
                            ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
                        }
                    }
                }
                
                // Calcular anchos automáticos
                const colWidths = allColumns.map((col, index) => {
                    const headerText = headerLabels[index];
                    const headerWidth = headerText.length * 1.1 + 4;
                    
                    const maxContentWidth = allData.reduce((max, row) => {
                        const cellValue = getNestedValue(row, col.key);
                        if (!cellValue) return max;
                        
                        const cellString = String(cellValue);
                        let adjustedLength = cellString.length;
                        
                        const uppercaseCount = (cellString.match(/[A-Z]/g) || []).length;
                        if (uppercaseCount > cellString.length * 0.5) {
                            adjustedLength *= 1.15;
                        }
                        
                        return Math.max(max, adjustedLength);
                    }, 0);
                    
                    const contentWidth = maxContentWidth + 4;
                    const calculatedWidth = Math.max(headerWidth, contentWidth);
                    const finalWidth = Math.min(Math.max(calculatedWidth, 10), 50);
                    
                    return { wch: finalWidth };
                });
                
                ws['!cols'] = colWidths;
                
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                console.log(`⏱️ [EXCEL DEBUG] Crear libro y hoja personalizada: ${(performance.now() - wbStart).toFixed(2)}ms`);

                const writeStart = performance.now();
                const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                console.log(`⏱️ [EXCEL DEBUG] Escribir buffer personalizado: ${(performance.now() - writeStart).toFixed(2)}ms`);

                const blobStart = performance.now();
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                console.log(`⏱️ [EXCEL DEBUG] Crear blob personalizado: ${(performance.now() - blobStart).toFixed(2)}ms`);

                const downloadStart = performance.now();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                window.URL.revokeObjectURL(url);
                console.log(`⏱️ [EXCEL DEBUG] Descargar archivo personalizado: ${(performance.now() - downloadStart).toFixed(2)}ms`);

                console.log(`⏱️ [EXCEL DEBUG] Total hoja única personalizada: ${(performance.now() - singleSheetStart).toFixed(2)}ms`);

                setShowLoaderAlert(false);
                setShowSuccessAlert(true);
                console.log(`🎉 [EXCEL DEBUG] Descarga personalizada completada en: ${(performance.now() - startTime).toFixed(2)}ms`);
                return;
            }

            // 📊 CAMINO 3: Método estándar de tabla (con ExcelJS si está habilitado)
            console.log(`📊 [EXCEL DEBUG] Usando método estándar de tabla ${useExcelJS ? 'con ExcelJS' : 'con XLSX'}`);
            let allData: any[] = [];

            // Si hay una función específica para Excel, usarla (una sola llamada)
            if (fetchDataForExcel) {
                console.log('🔄 [EXCEL DEBUG] Usando fetchDataForExcel (una llamada)');
                const fetchStart = performance.now();
                const response = await fetchDataForExcel();
                allData = response.data || [];
                console.log(`⏱️ [EXCEL DEBUG] fetchDataForExcel completado: ${(performance.now() - fetchStart).toFixed(2)}ms`);
                console.log(`📊 [EXCEL DEBUG] Datos obtenidos: ${allData.length} filas`);
            } else if (fetchAllData) {
                console.log('🔄 [EXCEL DEBUG] Usando fetchAllData (múltiples llamadas paginadas)');
                const fetchAllStart = performance.now();
                
                // Fallback al método original (múltiples llamadas paginadas)
                let currentPage = 1;
                let hasMorePages = true;
                let totalPages = 0;

                while (hasMorePages) {
                    const pageStart = performance.now();
                    const pageResponse = await fetchAllData(currentPage);
                    console.log(`📄 [EXCEL DEBUG] Página ${currentPage}: ${pageResponse.data?.length || 0} filas obtenidas en ${(performance.now() - pageStart).toFixed(2)}ms`);
                    
                    if (pageResponse.data && pageResponse.data.length > 0) {
                        allData = [...allData, ...pageResponse.data];
                        currentPage++;
                        totalPages = pageResponse.total_pages;
                        hasMorePages = currentPage <= pageResponse.total_pages;
                    } else {
                        hasMorePages = false;
                    }
                }
                
                console.log(`⏱️ [EXCEL DEBUG] Total fetchAllData: ${(performance.now() - fetchAllStart).toFixed(2)}ms`);
                console.log(`📊 [EXCEL DEBUG] Total datos obtenidos: ${allData.length} filas de ${totalPages} páginas`);
            } else {
                console.warn('⚠️ [EXCEL DEBUG] No se proporcionó ninguna función para obtener datos');
                setShowLoaderAlert(false);
                setErrorMessage('No se pudo obtener los datos para exportar');
                setShowErrorAlert(true);
                return;
            }

            if (allData.length === 0) {
                console.log('❌ [EXCEL DEBUG] No hay datos para exportar');
                setShowLoaderAlert(false);
                setErrorMessage('No hay datos disponibles para exportar');
                setShowErrorAlert(true);
                return;
            }

            // 🚀 Usar ExcelJS si está habilitado
            if (useExcelJS) {
                console.log(`🚀 [EXCEL DEBUG] Procesando con ExcelJS optimizado: ${allData.length} filas`);
                const excelData = convertDynamicTableData(columns, allData, getNestedValue);
                
                await excelJSExporter({
                    columns: excelData.columns,
                    data: excelData.data,
                    filename: 'Libro-de-excel.xlsx',
                    chunkSize: excelChunkSize,
                    sheetName: 'Datos'
                });

                setShowLoaderAlert(false);
                setShowSuccessAlert(true);
                console.log(`🎉 [EXCEL DEBUG] Descarga ExcelJS completada en: ${(performance.now() - startTime).toFixed(2)}ms`);
                return;
            }

            // 📊 Método XLSX tradicional (fallback)
            console.log(`📊 [EXCEL DEBUG] Iniciando procesamiento XLSX de ${allData.length} filas`);
            const processStart = performance.now();

            // Construir AOA (headers + rows) con encabezados únicos por columna para evitar colisiones
            const columnsStart = performance.now();
            const exportableColumns = columns.filter(column => column.label !== 'Acciones');
            console.log(`⏱️ [EXCEL DEBUG] Filtrar columnas exportables: ${(performance.now() - columnsStart).toFixed(2)}ms`);
            console.log(`📋 [EXCEL DEBUG] Columnas exportables: ${exportableColumns.length}`);

            const headerLabels: string[] = [];
            const seen: Record<string, number> = {};
            const headerProcessStart = performance.now();
            exportableColumns.forEach(col => {
                const match = col.key.match(/_p(\d+)$/);
                const suffix = match ? ` p${match[1]}` : '';
                const base = `${col.label}${suffix}`;
                if (seen[base]) {
                    seen[base] += 1;
                    headerLabels.push(`${base} (${seen[base]})`);
                } else {
                    seen[base] = 1;
                    headerLabels.push(base);
                }
            });
            console.log(`⏱️ [EXCEL DEBUG] Procesar headers únicos: ${(performance.now() - headerProcessStart).toFixed(2)}ms`);

            const bodyStart = performance.now();
            const body = allData.map(row => exportableColumns.map(col => {
                const raw = getNestedValue(row, col.key);
                return raw !== undefined && raw !== null ? raw : '';
            }));
            console.log(`⏱️ [EXCEL DEBUG] Crear body de datos: ${(performance.now() - bodyStart).toFixed(2)}ms`);

            // Crear el libro de Excel
            const wbStart = performance.now();
            const wb = XLSX.utils.book_new();
            
            // Añadir filas vacías para el logo (5 filas)
            const LOGO_ROWS = 5;
            const emptyRows = Array(LOGO_ROWS).fill([]);
            
            // Crear la hoja con espacio para logo + headers + datos
            const ws = XLSX.utils.aoa_to_sheet([...emptyRows, headerLabels, ...body]);
            
            // Aplicar estilos de negrilla a los headers (fila LOGO_ROWS)
            const headerRowIndex = LOGO_ROWS; // Index 0-based
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            
            // Aplicar estilo de negrilla a los headers
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {
                        font: { bold: true },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        fill: { fgColor: { rgb: 'E0E0E0' } }
                    };
                }
            }
            
            // Centrar contenido de todas las celdas de datos
            for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    if (ws[cellAddress]) {
                        if (!ws[cellAddress].s) ws[cellAddress].s = {};
                        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                }
            }
            
            // Calcular anchos automáticos de columna con máximo
            const colWidths = exportableColumns.map((col, index) => {
                const headerText = headerLabels[index];
                const headerWidth = headerText.length * 1.1 + 4;
                
                const maxContentWidth = allData.reduce((max, row) => {
                    const cellValue = getNestedValue(row, col.key);
                    if (!cellValue) return max;
                    
                    const cellString = String(cellValue);
                    let adjustedLength = cellString.length;
                    
                    // Factor para mayúsculas
                    const uppercaseCount = (cellString.match(/[A-Z]/g) || []).length;
                    if (uppercaseCount > cellString.length * 0.5) {
                        adjustedLength *= 1.15;
                    }
                    
                    return Math.max(max, adjustedLength);
                }, 0);
                
                const contentWidth = maxContentWidth + 4;
                const calculatedWidth = Math.max(headerWidth, contentWidth);
                const finalWidth = Math.min(Math.max(calculatedWidth, 10), 50);
                
                return { wch: finalWidth };
            });
            
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Datos');
            console.log(`⏱️ [EXCEL DEBUG] Crear libro y hoja Excel: ${(performance.now() - wbStart).toFixed(2)}ms`);

            // Generar el archivo Excel
            const writeStart = performance.now();
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            console.log(`⏱️ [EXCEL DEBUG] Escribir buffer Excel: ${(performance.now() - writeStart).toFixed(2)}ms`);

            const blobStart = performance.now();
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            console.log(`⏱️ [EXCEL DEBUG] Crear blob: ${(performance.now() - blobStart).toFixed(2)}ms`);

            const downloadStart = performance.now();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Libro-de-excel.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);
            console.log(`⏱️ [EXCEL DEBUG] Descargar archivo: ${(performance.now() - downloadStart).toFixed(2)}ms`);

            console.log(`⏱️ [EXCEL DEBUG] Total procesamiento: ${(performance.now() - processStart).toFixed(2)}ms`);

            setShowLoaderAlert(false);
            setShowSuccessAlert(true);

            console.log(`🎉 [EXCEL DEBUG] Descarga completada exitosamente en: ${(performance.now() - startTime).toFixed(2)}ms`);

        } catch (error) {
            console.error('❌ [EXCEL DEBUG] Error al generar el Excel:', error);
            setShowLoaderAlert(false);
            setErrorMessage('Ocurrió un error al generar el archivo Excel. Por favor, intente nuevamente.');
            setShowErrorAlert(true);
            console.log(`💥 [EXCEL DEBUG] Error después de: ${(performance.now() - startTime).toFixed(2)}ms`);
        }
    };

    const DownloadButton = () => (
        <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center justify-center rounded-full border-none bg-transparent cursor-pointer"
            style={{ height: '40px', width: '40px' }}
        >
            <img
                src="https://i.postimg.cc/rFZtRsTg/Grupo-1100.png"
                alt="Descargar Excel"
                className="h-12 w-12 object-contain"
                style={{ display: 'block' }}
            />
        </button>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center w-full h-24">
                <p className="text-md font-semibold">
                    Cargando...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Componentes de alerta */}
            <AlertLoader
                isOpen={showLoaderAlert}
                loadingText="Generando Excel, por favor espere..."
            />
            
            <AlertSuccess
                isOpen={showSuccessAlert}
                onClose={() => setShowSuccessAlert(false)}
                message="El archivo Excel se ha generado correctamente"
            />
            
            <AlertError
                isOpen={showErrorAlert}
                onClose={() => setShowErrorAlert(false)}
                message={errorMessage}
            />
            
            <div className="flex items-center justify-end mb-2 mr-6 gap-x-4"> {/* Opciones solo para el top, NO para la columna de acciones */}
                {actionsTop && <div className="flex items-center">{actionsTop}</div>}
                {downloadButtonPosition === 'top' && <div className="flex items-center"><DownloadButton /></div>}
            </div>

            <div className="w-full rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto scrollbar-custom">
                    <table className={`w-full min-w-300 ${tableLayout}`}>
                        <thead>
                            <tr
                                className={`h-12 ${theme === 'dark'
                                    ? 'bg-[#562707] text-white'
                                    : 'bg-[#DEDEDE] text-[#562707]'
                                    }`}
                            >
                                {expandable && (
                                    <th className="w-10 px-4"></th>
                                )}
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className="text-center px-6 py-3 cursor-pointer hover:bg-opacity-80 transition-colors duration-200"
                                        onClick={() => handleSort(column.key)}
                                        style={column.width ? { width: column.width } : { minWidth: '120px' }}
                                    >
                                        <div className="flex items-center justify-center gap-2 font-medium">
                                            {column.label.toUpperCase()}
                                            {sortConfig?.key === column.key && (
                                                <span className="text-md">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                {actions && (
                                    <th className="text-center px-6 py-3">
                                        <div className="font-medium">ACCIONES</div>
                                        {actionsHeader && (
                                            <div className="mt-2 flex justify-center">{actionsHeader}</div>
                                        )}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={columns.length + (actions ? 1 : 0) + (expandable ? 1 : 0)}
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            No hay datos disponibles en la tabla
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map((row, index) => (
                                    <React.Fragment key={index}>
                                        <tr
                                            className={`h-10 w-full border-b border-gray-200 transition-colors duration-200 text-md ${theme === 'dark'
                                                ? 'text-white hover:bg-[#562707]/20'
                                                : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            {expandable && (
                                                <td className="w-full px-4">
                                                    {(!expandable.rowExpandable || expandable.rowExpandable(row)) && (
                                                        <button
                                                            onClick={() => toggleRow(index)}
                                                            className="w-6 h-6 flex items-center justify-center"
                                                        >
                                                            <img
                                                                src="/images/arrowDown.svg"
                                                                alt="expandir"
                                                                className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${
                                                                    expandedRows.has(index) ? 'rotate-360' : 'rotate-270'
                                                                } ${theme === 'dark' ? 'invert' : ''}`}
                                                            />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                            {columns.map((column) => (
                                                <td 
                                                    key={column.key} 
                                                    className="px-6 py-2"
                                                    style={column.width ? { width: column.width } : { minWidth: '120px' }}
                                                >
                                                    {column.render
                                                        ? column.render(row[column.key], row)
                                                        : row[column.key]}
                                                </td>
                                            ))}
                                            {actions && (
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {actions.map((action, actionIndex) => (
                                                            <React.Fragment key={actionIndex}>
                                                                {action.render(row)}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandable && expandedRows.has(index) && (!expandable.rowExpandable || expandable.rowExpandable(row)) && (
                                            <tr>
                                                <td 
                                                    colSpan={columns.length + (actions ? 2 : 1)} 
                                                    className={theme === 'dark' ? 'bg-[#260f00] border-t border-white/20' : 'bg-gray-50'}
                                                >
                                                    <div className="transform-gpu animate-expandRow overflow-hidden">
                                                        <div className={`px-0 py-4 animate-fadeIn ${theme === 'dark' ? 'dark-expanded-content text-white' : ''}`}>
                                                            {expandable.expandedRowRender(row)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div
                    className={`px-6 py-4 flex justify-center border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        }`}
                >
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        disabled={isLoading}
                        onChange={(_event, page) => !isLoading && onPageChange(page)}
                        sx={{
                            '& .MuiPaginationItem-root': {
                                color: theme === 'dark' ? '#fff' : '#4D750F',
                                '&:hover': {
                                    backgroundColor:
                                        theme === 'dark'
                                            ? 'rgba(255, 255, 255, 0.1)'
                                            : 'rgba(77, 117, 15, 0.1)'
                                }
                            },
                            '& .MuiPaginationItem-page.Mui-selected': {
                                backgroundColor: '#4D750F',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: '#3d5d0c'
                                }
                            },
                            '& .MuiPaginationItem-previousNext': {
                                color: theme === 'dark' ? '#fff' : '#4D750F'
                            }
                        }}
                    />
                </div>
            </div>

            {downloadButtonPosition === 'bottom' && <DownloadButton />}

            <style jsx global>{`
                .scrollbar-custom::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .scrollbar-custom::-webkit-scrollbar-track {
                    background: ${theme === 'dark' ? '#1a1a1a' : '#f1f1f1'};
                    border-radius: 4px;
                }
                .scrollbar-custom::-webkit-scrollbar-thumb {
                    background: ${theme === 'dark' ? '#4D750F' : '#4D750F'};
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }
                .scrollbar-custom::-webkit-scrollbar-thumb:hover {
                    background: ${theme === 'dark' ? '#3d5d0c' : '#3d5d0c'};
                }
                .scrollbar-custom {
                    scrollbar-width: thin;
                    scrollbar-color: ${theme === 'dark'
                    ? '#4D750F #1a1a1a'
                    : '#4D750F #f1f1f1'};
                }

                @keyframes expandRow {
                    from {
                        max-height: 0;
                    }
                    to {
                        max-height: 500px;
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-expandRow {
                    animation: expandRow 0.3s ease-out forwards;
                }

                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }

                ${theme === 'dark' ? `
                    /* Estilos para modo oscuro en subtablas expandidas */
                    .dark-expanded-content table {
                        color: white !important;
                    }
                    .dark-expanded-content table thead {
                        background-color: #3d1a00 !important;
                    }
                    .dark-expanded-content table thead th {
                        color: #e5e7eb !important;
                    }
                    .dark-expanded-content table tbody {
                        background-color: #260f00 !important;
                    }
                    .dark-expanded-content table tbody td {
                        color: white !important;
                    }
                    .dark-expanded-content table tbody tr {
                        border-color: rgba(255, 255, 255, 0.2) !important;
                    }
                    .dark-expanded-content table tbody tr:hover {
                        background-color: rgba(255, 255, 255, 0.05) !important;
                    }
                    /* Fila de totales en modo oscuro - múltiples selectores para cubrir todos los casos */
                    .dark-expanded-content table tbody tr:last-child,
                    .dark-expanded-content table tfoot tr,
                    .dark-expanded-content table tbody tr[class*="total"],
                    .dark-expanded-content table tbody tr[class*="TOTAL"],
                    .dark-expanded-content table tbody tr[class*="sticky"] {
                        background-color: #3d1a00 !important;
                        color: white !important;
                    }
                    .dark-expanded-content table tbody tr:last-child td,
                    .dark-expanded-content table tfoot tr td,
                    .dark-expanded-content table tbody tr[class*="sticky"] td {
                        background-color: #3d1a00 !important;
                        color: white !important;
                        font-weight: 600 !important;
                    }
                    /* Scrollbar en modo oscuro para subtablas - aplicar a todos los elementos con scroll */
                    .dark-expanded-content::-webkit-scrollbar,
                    .dark-expanded-content *::-webkit-scrollbar,
                    .dark-expanded-content div[style*="overflow"]::-webkit-scrollbar,
                    .dark-expanded-content div[style*="scroll"]::-webkit-scrollbar {
                        width: 8px !important;
                        height: 8px !important;
                    }
                    .dark-expanded-content::-webkit-scrollbar-track,
                    .dark-expanded-content *::-webkit-scrollbar-track,
                    .dark-expanded-content div[style*="overflow"]::-webkit-scrollbar-track,
                    .dark-expanded-content div[style*="scroll"]::-webkit-scrollbar-track {
                        background: #1a0a00 !important;
                        border-radius: 4px !important;
                    }
                    .dark-expanded-content::-webkit-scrollbar-thumb,
                    .dark-expanded-content *::-webkit-scrollbar-thumb,
                    .dark-expanded-content div[style*="overflow"]::-webkit-scrollbar-thumb,
                    .dark-expanded-content div[style*="scroll"]::-webkit-scrollbar-thumb {
                        background: #4D750F !important;
                        border-radius: 4px !important;
                    }
                    .dark-expanded-content::-webkit-scrollbar-thumb:hover,
                    .dark-expanded-content *::-webkit-scrollbar-thumb:hover,
                    .dark-expanded-content div[style*="overflow"]::-webkit-scrollbar-thumb:hover,
                    .dark-expanded-content div[style*="scroll"]::-webkit-scrollbar-thumb:hover {
                        background: #3d5d0c !important;
                    }
                    /* Scrollbar para Firefox */
                    .dark-expanded-content,
                    .dark-expanded-content *,
                    .dark-expanded-content div[style*="overflow"],
                    .dark-expanded-content div[style*="scroll"] {
                        scrollbar-width: thin !important;
                        scrollbar-color: #4D750F #1a0a00 !important;
                    }
                    /* Sobrescribir estilos inline del scrollbar */
                    .dark-expanded-content div[style*="scrollbarColor"] {
                        scrollbar-color: #4D750F #1a0a00 !important;
                    }
                    .dark-expanded-content div,
                    .dark-expanded-content p,
                    .dark-expanded-content span {
                        color: white !important;
                    }
                ` : ''}
            `}</style>
        </div>
    );
};

export default React.memo(DynamicTable);
