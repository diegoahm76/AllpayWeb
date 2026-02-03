import { useState, useCallback } from 'react';
import { getRegistroNoCompras, createRegistroNoCompras, getRegistroNoComprasById, updateRegistroNoCompras, GetRegistroNoComprasParams } from '../adapter/registroNoCompras.adapter';
import { 
    RegistroNoComprasResponse, 
    RegistroNoComprasData,
    CreateRegistroNoComprasPayload,
    UpdateRegistroNoComprasPayload,
} from '../models/registroNoCompras.model';

export const useRegistroNoCompras = (token: string, pageSize: number = 10) => {
    const [data, setData] = useState<RegistroNoComprasData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<RegistroNoComprasResponse | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    
    // Estados para creación
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createdRecord, setCreatedRecord] = useState<RegistroNoComprasData | null>(null);
    
    // Estados para obtener por ID
    const [selectedRecord, setSelectedRecord] = useState<RegistroNoComprasData | null>(null);
    const [isLoadingById, setIsLoadingById] = useState(false);
    const [errorById, setErrorById] = useState<string | null>(null);
    
    // Estados para actualización
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatedRecord, setUpdatedRecord] = useState<RegistroNoComprasData | null>(null);

    const fetchRegistroNoCompras = useCallback(async (page: number = 1, params?: Omit<GetRegistroNoComprasParams, 'page'>) => {
        if (!token) {
            setError('No hay token de autenticación');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const requestParams: GetRegistroNoComprasParams = {
                page,
                page_size: pageSize,
                ...params
            };
            const result = await getRegistroNoCompras(token, requestParams);
            setResponse(result);
            // Asegurar que data siempre sea un array
            const dataArray = Array.isArray(result.data) ? result.data : [];
            setData(dataArray);
            setCurrentPage(result.current_page || page);
            setTotalPages(result.total_pages || 1);
            setTotalCount(result.total_count || dataArray.length);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener registros de no compras';
            setError(errorMessage);
            setData([]);
            setTotalPages(1);
            setTotalCount(0);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [token, pageSize]);

    const createRegistro = useCallback(async (payload: CreateRegistroNoComprasPayload) => {
        if (!token) {
            setCreateError('No hay token de autenticación');
            return;
        }

        try {
            setIsCreating(true);
            setCreateError(null);
            const result = await createRegistroNoCompras(token, payload);
            setCreatedRecord(result.data);
            
            // Actualizar la lista después de crear
            await fetchRegistroNoCompras(currentPage);
            
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear registro de no compras';
            setCreateError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsCreating(false);
        }
    }, [token, fetchRegistroNoCompras]);

    const getRegistroById = useCallback(async (id: number) => {
        if (!token) {
            setErrorById('No hay token de autenticación');
            return;
        }

        try {
            setIsLoadingById(true);
            setErrorById(null);
            const result = await getRegistroNoComprasById(token, id);
            setSelectedRecord(result.data);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener registro de no compras';
            setErrorById(errorMessage);
            setSelectedRecord(null);
            throw new Error(errorMessage);
        } finally {
            setIsLoadingById(false);
        }
    }, [token]);

    const updateRegistro = useCallback(async (id: number, payload: UpdateRegistroNoComprasPayload) => {
        if (!token) {
            setUpdateError('No hay token de autenticación');
            return;
        }

        try {
            setIsUpdating(true);
            setUpdateError(null);
            const result = await updateRegistroNoCompras(token, id, payload);
            setUpdatedRecord(result.data);
            
            // Actualizar la lista después de actualizar
            await fetchRegistroNoCompras(currentPage);
            
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar registro de no compras';
            setUpdateError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    }, [token, fetchRegistroNoCompras]);

    return {
        data,
        isLoading,
        error,
        response,
        fetchRegistroNoCompras,
        createRegistro,
        isCreating,
        createError,
        createdRecord,
        getRegistroById,
        selectedRecord,
        isLoadingById,
        errorById,
        updateRegistro,
        isUpdating,
        updateError,
        updatedRecord,
        currentPage,
        totalPages,
        totalCount
    };
};

