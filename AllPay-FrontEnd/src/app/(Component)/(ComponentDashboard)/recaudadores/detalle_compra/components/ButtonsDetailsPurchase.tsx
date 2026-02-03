import React, { useEffect, useState } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/formatters';
import { useTheme } from 'next-themes';

interface Column {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface PurchaseDetailsTableProps {
    columns: Column[];
    data: any[];
    valorTotal: string;
    onValorTotalChange: (value: string) => void;
    onSalir: () => void;
}

const PurchaseDetailsTable: React.FC<PurchaseDetailsTableProps> = ({
    columns,
    data,
    valorTotal,
    onValorTotalChange,
}) => {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const total = data.reduce(
          (sum, { cuotaFomento }) => sum + (parseFloat(cuotaFomento) || 0),
          0,
        );
        onValorTotalChange(total.toFixed(2));
      }, [data, onValorTotalChange]);

    const formattedValorTotal = formatCurrency(parseFloat(valorTotal));

    // Calcular el total de páginas
    const totalPages = Math.ceil(data.length / itemsPerPage);

    const getPageData = (page: number) => {
        const start = (page - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
      };

    // Obtener los datos para la página actual
    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const fetchAllData = async (page: number) => {
        if (page === 0) {
          const formattedData = data.map(item => {
            const row: Record<string, any> = {};
            columns.forEach(({ key, label, render }) => {
              const cell = render ? render(item[key], item) : item[key];
              row[label] =
                typeof cell === 'string' || typeof cell === 'number'
                  ? cell
                  : item[key]; 
            });
            return row;
          });
    
          return { data: formattedData, total_pages: 1 };
        }

        const pageData = getPageData(page); 
    if (currentPage !== page) setCurrentPage(page);
    return { data: pageData, total_pages: totalPages };

    };

    const isDarkMode = mounted && theme === 'dark';

    if (!mounted) {
        return null;
    }

    return (
        <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} rounded-3xl p-4 transition-colors`}>
            {/* Tabla de detalles */}
            <div className="mb-6">
                <h2 className={`text-xl sm:text-2xl mt-4 sm:mt-6 lg:mt-[39px] text-center font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                    DETALLE DE COMPRA
                </h2>
                <div className="overflow-x-auto">
                    <DynamicTable
                        columns={columns}
                        data={getCurrentPageData()}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => setCurrentPage(page)}
                        fetchAllData={fetchAllData}
                        downloadButtonPosition="top"
                    />
                </div>
            </div>

            {/* Valor a pagar */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 lg:gap-0">
                <div className="w-full sm:w-80 lg:w-64">
                    <AnimatedInput
                        label="VALOR A PAGAR"
                        name="valorTotal"
                        value={formattedValorTotal}
                        onChange={(e) => onValorTotalChange(e.target.value)}
                        type="text"
                        disabled
                        darkMode={isDarkMode}
                    />
                </div>

                <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto lg:w-auto justify-center lg:justify-start'>
                    <Button
                        title="Regresar"
                        onClick={() => router.back()}
                    />

                    <Button
                        title="Salir"
                        onClick={() => router.push('/')}
                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseDetailsTable;