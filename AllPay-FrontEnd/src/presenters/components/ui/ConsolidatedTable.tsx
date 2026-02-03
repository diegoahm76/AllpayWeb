import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { Pagination } from '@mui/material';
import * as XLSX from 'xlsx';
// Importar componentes de alerta personalizados
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';

interface HeaderColumn {
    key: string;
    label: string;
    colspan?: number;
    subColumns?: {
        key: string;
        label: string;
        render?: (value: any, row: any) => React.ReactNode;
    }[];
    render?: (value: any, row: any) => React.ReactNode;
}

interface ConsolidatedTableProps {
    headerColumns: HeaderColumn[];
    data: any[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    actions?: {
        label: string;
        render: (row: any) => React.ReactNode;
    }[];
    isLoading?: boolean;
    fetchAllData?: (page: number) => Promise<{ data: any[]; total_pages: number }>;
    actionsHeader?: React.ReactNode;
    actionsTop?: React.ReactNode;
}

const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({
    headerColumns,
    data,
    currentPage,
    totalPages,
    onPageChange,
    actions,
    isLoading = false,
    fetchAllData,
    actionsHeader,
    actionsTop
}) => {
    const { theme } = useTheme();
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    } | null>(null);
    
    // Estados para alertas personalizadas
    const [showLoaderAlert, setShowLoaderAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
        try {
            if (!fetchAllData) {
                console.warn('No se proporcionó la función fetchAllData');
                return;
            }

            setShowLoaderAlert(true);

            let allData: any[] = [];
            let currentPage = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const pageResponse = await fetchAllData(currentPage);
                if (pageResponse.data && pageResponse.data.length > 0) {
                    allData = [...allData, ...pageResponse.data];
                    currentPage++;
                    hasMorePages = currentPage <= pageResponse.total_pages;
                } else {
                    hasMorePages = false;
                }
            }

            if (allData.length === 0) {
                setShowLoaderAlert(false);
                setErrorMessage('No hay datos disponibles para exportar');
                setShowErrorAlert(true);
                return;
            }

            // Formatear los datos según las columnas definidas
            const formattedData = allData.map(row => {
                const formattedRow: { [key: string]: any } = {};
                headerColumns.forEach(headerCol => {
                    if (headerCol.subColumns) {
                        headerCol.subColumns.forEach(subCol => {
                            formattedRow[`${headerCol.label} - ${subCol.label}`] = row[subCol.key];
                        });
                    } else {
                        formattedRow[headerCol.label] = row[headerCol.key];
                    }
                });
                return formattedRow;
            });

            // Crear el libro de Excel
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(wb, ws, 'Reporte Consolidado');

            // Generar el archivo Excel
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'reporte_consolidado.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);

            setShowLoaderAlert(false);
            setShowSuccessAlert(true);

        } catch (error) {
            console.error('Error al generar el Excel:', error);
            setShowLoaderAlert(false);
            setErrorMessage('Ocurrió un error al generar el archivo Excel. Por favor, intente nuevamente.');
            setShowErrorAlert(true);
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

    // Calcular el número total de columnas para los headers
    const getTotalColumns = () => {
        let total = 0;
        headerColumns.forEach(col => {
            if (col.subColumns) {
                total += col.subColumns.length;
            } else {
                total += col.colspan || 1;
            }
        });
        if (actions) total += 1;
        return total;
    };

    // Obtener todas las subcolumnas para el segundo nivel de headers
    const getAllSubColumns = () => {
        const subCols: any[] = [];
        headerColumns.forEach(col => {
            if (col.subColumns) {
                subCols.push(...col.subColumns);
            } else {
                subCols.push(col);
            }
        });
        return subCols;
    };

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
            
            <div className="flex items-center justify-end mb-2 mr-6 gap-x-4">
                {actionsTop && <div className="flex items-center">{actionsTop}</div>}
                {fetchAllData && <div className="flex items-center"><DownloadButton /></div>}
            </div>

            <div className="w-full rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto scrollbar-custom">
                    <table className="w-full min-w-300 table-auto">
                        <thead>
                            {/* Primer nivel de headers */}
                            <tr
                                className={`h-12 ${theme === 'dark'
                                    ? 'bg-[#562707] text-white'
                                    : 'bg-[#DEDEDE] text-[#562707]'
                                }`}
                            >
                                {headerColumns.map((headerCol, index) => (
                                    <th
                                        key={index}
                                        colSpan={headerCol.subColumns ? headerCol.subColumns.length : (headerCol.colspan || 1)}
                                        className="text-center px-6 py-3 border-r border-white last:border-r-0"
                                    >
                                        <div className="font-medium">
                                            {headerCol.label.toUpperCase()}
                                        </div>
                                    </th>
                                ))}
                                {actions && (
                                    <th rowSpan={2} className="text-center px-6 py-3">
                                        <div className="font-medium">ACCIONES</div>
                                        {actionsHeader && (
                                            <div className="mt-2 flex justify-center">{actionsHeader}</div>
                                        )}
                                    </th>
                                )}
                            </tr>
                            
                            {/* Segundo nivel de headers (subcolumnas) */}
                            <tr
                                className={`h-12 ${theme === 'dark'
                                    ? 'bg-[#562707] text-white'
                                    : 'bg-[#DEDEDE] text-[#562707]'
                                }`}
                            >
                                {getAllSubColumns().map((subCol, index) => (
                                    <th
                                        key={index}
                                        className="text-center px-6 py-3 cursor-pointer hover:bg-opacity-80 transition-colors duration-200 border-r border-white last:border-r-0"
                                        onClick={() => handleSort(subCol.key)}
                                    >
                                        <div className="flex items-center justify-center gap-2 font-medium">
                                            {subCol.label.toUpperCase()}
                                            {sortConfig?.key === subCol.key && (
                                                <span className="text-md">
                                                    {sortConfig?.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={getTotalColumns()}
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            No hay datos disponibles en la tabla
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`h-10 w-full border-b border-gray-200 transition-colors duration-200 text-md ${theme === 'dark'
                                            ? 'text-white hover:bg-[#562707]/20'
                                            : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {getAllSubColumns().map((subCol, colIndex) => (
                                            <td key={colIndex} className="px-6 py-2 text-center">
                                                {subCol.render
                                                    ? subCol.render(row[subCol.key], row)
                                                    : row[subCol.key] || '-'}
                                            </td>
                                        ))}
                                        {actions && (
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3 justify-center">
                                                    {actions.map((action, actionIndex) => (
                                                        <React.Fragment key={actionIndex}>
                                                            {action.render(row)}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
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
            `}</style>
        </div>
    );
};

export default React.memo(ConsolidatedTable);