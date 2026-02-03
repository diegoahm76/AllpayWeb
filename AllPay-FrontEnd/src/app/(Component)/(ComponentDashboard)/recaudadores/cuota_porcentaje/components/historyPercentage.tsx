import { signIn, useSession } from "next-auth/react";
import { usePercentageHistory } from "../hooks/usePercentageHistory";
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PercentageHistoryFilters } from '../models/percentageHistory.model';

interface HistoryPercentageProps {
    codTipoCobro?: string;
}

export const HistoryPercentage = ({ codTipoCobro }: HistoryPercentageProps) => {
    const { theme } = useTheme();
    const router = useRouter();

    const { data: session } = useSession({
        required: true,
        onUnauthenticated: () => signIn(),
    });
    const token = (session as any)?.user?.tokens?.access;

    // Estado para manejar los filtros y paginación
    const [filters, setFilters] = useState<PercentageHistoryFilters>({
        page: 1,
        page_size: 10,
        cod_tipo_cobro: codTipoCobro
    });

    const { data, loading, error } = usePercentageHistory(token, filters);

    // Actualizar filtros cuando cambie el codTipoCobro
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            page: 1,
            cod_tipo_cobro: codTipoCobro
        }));
    }, [codTipoCobro]);

    // Acceso correcto a los datos anidados
    const tableData = data?.data?.data || [];

    const columns = [
        {
            label: "NOMBRE PERSONA",
            key: "nombre_persona_actualiza"
        },
        {
            label: "CÓDIGO TIPO COBRO",
            key: "cod_tipo_cobro"
        },
        {
            label: "VALOR",
            key: "valor",
            render: (v: string) => `${(parseFloat(v) * 100).toFixed(2)}%`
        },
        {
            label: "FECHA ACTUALIZACIÓN",
            key: "fecha_actualizacion",
            render: (v: string) =>
                new Date(v).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
        }
    ];

    // Función para cambiar de página
    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };


    // Función para obtener todos los datos (para exportar)
    const fetchAllData = async () => {
        try {
            // Hacer una petición sin paginación para obtener todos los datos
            const allFilters = { ...filters };
            delete allFilters.page;
            delete allFilters.page_size;
            
            const { getPercentageHistory } = await import('../adapter/percentageHistory.getAll');
            const allData = await getPercentageHistory(token, allFilters);
            
            return {
                data: allData?.data?.data || [],
                total_pages: 1
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    // Manejo de loading
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        );
    }

    // Manejo de error
    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error,
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            router.push('/');
        });
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <h1 className={`text-2xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                Historial de Porcentajes {codTipoCobro ? `- ${codTipoCobro}` : ''}
            </h1>
            
            <DynamicTable
                columns={columns}
                data={tableData}
                currentPage={data?.current_page || 1}
                totalPages={data?.total_pages || 1}
                onPageChange={handlePageChange}
                fetchAllData={fetchAllData}
            />
        </div>
    );
};
