// import { getPorcentajesCobro } from "../adapter/cacao.purchasePorcentage";
// import { useState, useCallback, useEffect } from 'react';
// import { PorcentajeCobro } from '../models/percentage';

// export const usePorcentajesCobro = (token: string) => {
//     const [data, setData] = useState<PorcentajeCobro[]>([]);
//     const [isLoading, setIsLoading] = useState<boolean>(false);
//     const [error, setError] = useState<string | null>(null);

//     const fetchPorcentajesCobro = useCallback(async () => {
//         setIsLoading(true);
//         setError(null);
//         try {
//             const response = await getPorcentajesCobro(token);

//             if (response.success) {
//                 setData(response.data);
//             } else {
//                 setError(response.detail || 'Error al obtener porcentajes de cobro');
//                 console.error("Hook usePorcentajesCobro: Error en la respuesta:", response.detail);
//             }
//         } catch (err: any) {
//             setError(err.message || 'Error al obtener porcentajes de cobro');
//             console.error("Hook usePorcentajesCobro: Error en la petición:", err);
//         } finally {
//             setIsLoading(false);
//         }
//     }, [token]);

//     useEffect(() => {
//         if (token) {
//             fetchPorcentajesCobro();
//         }
//     }, [fetchPorcentajesCobro, token]);

//     return { data, isLoading, error, refetch: fetchPorcentajesCobro };
// };

// export default {
//     getPorcentajesCobro,
//     usePorcentajesCobro
// };
