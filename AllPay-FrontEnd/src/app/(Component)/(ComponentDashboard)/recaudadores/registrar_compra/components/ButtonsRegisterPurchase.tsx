'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback, // 👈 se usa en handleSavePurchases
} from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AlertForm from '@/presenters/components/recaudadores/AlertForm';

import RegisterPurchase from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/components/RegisterPurchase';
import MassivePurchaseForm from './MassivePurchaseForm';

import { useTypesCocoa } from '../hooks/useTypesCocoa';
import { useCreateInvoice } from '../hooks/useCreateInvoiceExternal';
import { useCreateInternalInvoice } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/useCreateInvoiceInternal';
import { usePorcentajesCobro } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/usePorcentajesCobro';

import {
  CreateMassiveInvoiceResponse,
  FacturaMasiva,
} from '../models/invoice.createMasive.model';
import { PorcentajeCobro } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/collector.porcentage.model';
import { formatCurrency, formatNumber, formatNumberWithCommas } from '@/utils/formatters';

interface PurchaseDetailsTableProps {
  data: PurchaseData[];
  valorTotal: string;
  onValorTotalChange: (value: string) => void;
  departamento_compra?: string;
  municipio_compra?: string;
  tipo_comprador?: string;
  doc_soporte?: File;
  formData: any; // Cambiar de opcional a requerido
  setFormData: (data: any) => void; // Añadir setter como prop
}

export interface PurchaseData {
  id: string;
  tipoCacao: string;
  cantidadKilos: string;
  precioKilo: string;
  valorBruto: string;
  cuotaFomento: string;
  valorNeto: string;
}

const ButtonRegisterPurchase: React.FC<PurchaseDetailsTableProps> = ({
  data: initialData,
  valorTotal,
  onValorTotalChange,
  departamento_compra,
  municipio_compra,
  tipo_comprador,
  doc_soporte,
  formData,
  setFormData,
}) => {
  const [purchases, setPurchases] = useState<PurchaseData[]>(initialData);
  const [localValorTotal, setLocalValorTotal] = useState(valorTotal);

  /* modales */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseData | null>(null);

  const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);

  const [massivePurchaseResponse, setMassivePurchaseResponse] =
    useState<CreateMassiveInvoiceResponse | null>(null);
  const [showMassivePurchaseResultModal, setShowMassivePurchaseResultModal] =
    useState(false);

  /* % cuota fomento */
  const [porcentajeCuotaFomento, setPorcentajeCuotaFomento] =
    useState<PorcentajeCobro | null>(null);

  const router = useRouter();

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const { tiposCacao, loading, error } = useTypesCocoa(
    valueSesion?.user?.tokens?.access || '',
  );
  const { createNewInvoice } = useCreateInvoice();
  const { createNewInternalInvoice } = useCreateInternalInvoice();
  const { porcentajes } = usePorcentajesCobro();

  useEffect(() => {
    if (!valueSesion?.user?.tipo_usuario) return;
    if (valueSesion.user.tipo_usuario === 'I') {
      setIsInternalUser(true);
    } else if (valueSesion.user.tipo_usuario === 'E') {
      setIsInternalUser(false);
    }
  }, [valueSesion?.user?.tipo_usuario]);

  useEffect(() => {
    if (porcentajes && porcentajes.length > 0) {
      const cuotaFomento = porcentajes.find(p => p.cod_tipo_cobro === 'CF');
      if (cuotaFomento) {
        setPorcentajeCuotaFomento(cuotaFomento);
      }
    }
  }, [porcentajes]);

  useEffect(() => {
    setLocalValorTotal(valorTotal);
  }, [valorTotal]);

  const formattedValorTotal = formatCurrency(parseFloat(localValorTotal));

  const calcularCuotaFomento = (valorBruto: number) => {
    if (!porcentajeCuotaFomento) return '0.00';
    const valor = parseFloat(porcentajeCuotaFomento.valor);
    const resultado = valorBruto * valor;
    return resultado.toFixed(4);
  };

  const handleSavePurchases = useCallback((rows: PurchaseData[]) => {
    setPurchases((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const uniques = rows.filter((r) => !ids.has(r.id));
      const merged = [...prev, ...uniques];

      // actualiza total
      const total = merged
        .reduce((acc, p) => acc + parseFloat(p.valorNeto), 0)
        .toFixed(2);

      // Actualizamos el estado local primero
      setLocalValorTotal(total);

      // Luego notificamos al padre
      onValorTotalChange(total);

      return merged;
    });
  }, [onValorTotalChange]);

  const handleEditClick = (purchase: PurchaseData) => {
    setEditingPurchase({ ...purchase });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editingPurchase) return;
    const { name, value } = e.target;

    if (name === 'tipoCacao') {
      const selectedOption = tiposCacao.find((option) => option.value === value);
      if (selectedOption) {
        setEditingPurchase((prev) => ({
          ...prev!,
          tipoCacao: selectedOption.title
        }));
      }
      return;
    }

    setEditingPurchase((prev) => ({
      ...prev!,
      [name]: value
    }));

    // Recalcular valores si cambia cantidad o precio
    if (name === 'cantidadKilos' || name === 'precioKilo') {
      const updatedPurchase = {
        ...editingPurchase,
        [name]: value
      };
      const cantidadKilos = parseFloat(updatedPurchase.cantidadKilos) || 0;
      const precioKilo = parseFloat(updatedPurchase.precioKilo) || 0;
      // Usamos más decimales en los cálculos intermedios
      const valorBruto = (cantidadKilos * precioKilo).toFixed(4);
      const cuotaFomento = calcularCuotaFomento(parseFloat(valorBruto));
      // El valor neto también con más precisión
      const valorNeto = (parseFloat(valorBruto) - parseFloat(cuotaFomento)).toFixed(4);

      setEditingPurchase((prev) => ({
        ...prev!,
        valorBruto,
        cuotaFomento,
        valorNeto
      }));
    }
  };

  const handleEditSave = () => {
    if (!editingPurchase) return;

    // Mostrar alerta de carga
    Swal.fire({
      title: 'Guardando cambios',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      setPurchases((prev) => {
        const updatedList = prev.map((item) =>
          item.id === editingPurchase.id ? editingPurchase : item
        );
        const total = updatedList.reduce((acc, p) => acc + parseFloat(p.valorNeto), 0);
        onValorTotalChange(total.toFixed(2));
        return updatedList;
      });

      // Cerrar modal y limpiar estado
      setIsEditModalOpen(false);
      setEditingPurchase(null);

      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Cambios guardados',
        text: 'Los cambios se han guardado correctamente',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: 'Aceptar'
      });
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
      // Mostrar mensaje de error
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar los cambios',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: 'Aceptar'
      });
    }
  };

  const purchasesForTable = useMemo(() => {
    return purchases.map(p => ({
      ...p,
      cantidadKilos_display: formatNumber(+p.cantidadKilos, 4),
      precioKilo_display: formatCurrency(+p.precioKilo),
      valorBruto_display: formatCurrency(+p.valorBruto),
      cuotaFomento_display: formatCurrency(+p.cuotaFomento),
      valorNeto_display: formatCurrency(+p.valorNeto)
    }));
  }, [purchases]);

  const handleSave = async () => {
    if (!valueSesion?.user?.tokens?.access) {
      return;
    }

    const validations = [];
    if (!tipo_comprador || (Array.isArray(tipo_comprador) && tipo_comprador.length === 0)) {
      validations.push('Debe seleccionar al menos un tipo de comprador');
    }
    if (!formData?.id_persona_proveedor) {
      validations.push('Debe seleccionar un proveedor');
    }
    if (!departamento_compra) {
      validations.push('Debe seleccionar un departamento');
    }
    if (!municipio_compra) {
      validations.push('Debe seleccionar un municipio');
    }

    if (!purchases || purchases.length === 0) {
      validations.push('Debe agregar al menos un detalle de compra');
    }
    if (!formData?.fechaCompra) {
      validations.push('Debe seleccionar una fecha de compra');
    }
    if (!formData?.nro_documento_soporte) {
      validations.push('Debe ingresar el número de documento soporte');
    }

    if (validations.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        html: validations.map((msg) => `<p>• ${msg}</p>`).join(''),
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Mostrar alerta de carga
    Swal.fire({
      title: 'Guardando factura',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formDataToSend = new FormData();
      if (doc_soporte) {
        formDataToSend.append('doc_soporte', doc_soporte);
      }

      const tipoCompradorMap: { [key: string]: string } = {
        'Procesador': 'P',
        'Exportador': 'E',
        'Comerciante': 'C'
      };

      let tiposCompradorFormateados = '';
      if (tipo_comprador && Array.isArray(tipo_comprador) && tipo_comprador.length > 0) {
        tiposCompradorFormateados = tipo_comprador
          .map((tipo) => tipoCompradorMap[tipo] || tipo)
          .filter((tipo) => tipo)
          .join(' | ');
      }

      if (tiposCompradorFormateados) {
        formDataToSend.append('cod_tipo_comprador', tiposCompradorFormateados);
      }

      formDataToSend.append(
        'id_persona_proveedor',
        formData?.id_persona_proveedor?.toString() || ''
      );
      formDataToSend.append('id_departamento_cacao', departamento_compra || '');
      formDataToSend.append('id_municipio_cacao', municipio_compra || '');
      formDataToSend.append('id_porcentaje_cobro', '2');
      formDataToSend.append('fecha_compra', formData.fechaCompra);
      formDataToSend.append('fecha_doc_soporte', formData.fechaCompra);
      formDataToSend.append('nro_documento_soporte', formData.nro_documento_soporte);

      const detalles_factura = purchases.map((purchase) => ({
        id_tipo_cacao: 1,
        nro_kilos: parseFloat(purchase.cantidadKilos),
        valor_kilo: parseFloat(purchase.precioKilo),
        valor_bruto: parseFloat(purchase.valorBruto),
        cuota_fomento: parseFloat(purchase.cuotaFomento),
        valor_neto: parseFloat(purchase.valorNeto)
      }));
      formDataToSend.append('detalles_factura', JSON.stringify(detalles_factura));

      if (isInternalUser) {
        const idRecaudador = formData?.id_persona_recaudador;
        if (!idRecaudador) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se ha seleccionado un recaudador',
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: 'Aceptar'
          });
          return;
        }
        await createNewInternalInvoice(formDataToSend, valueSesion.user.tokens.access, idRecaudador);
      } else {
        await createNewInvoice(formDataToSend, valueSesion.user.tokens.access);
      }


      setPurchases([]);
      setLocalValorTotal('0.00');
      onValorTotalChange('0.00');

      await Swal.fire({
        icon: 'success',
        title: 'Factura guardada',
        text: 'La factura se ha guardado correctamente',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: 'Aceptar'
      });

      router.push('/recaudadores/consultar_factura');

    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.data.detail,
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: 'Aceptar'
      });
    }
  };

  /* ----------------------------------------------------------------
     6) Descargar plantilla masiva
     ---------------------------------------------------------------- */
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    if (isInternalUser) {
      link.href = '/documents/plantilla/registro_masivo_interno.xlsx';
      link.download = 'registro_masivo_interno.xlsx';
    } else {
      link.href = '/documents/plantilla/registro_masivo_externo.xlsx';
      link.download = 'registro_masivo_externo.xlsx';
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ----------------------------------------------------------------
     7) Limpieza manual del formulario de registro masivo
     ---------------------------------------------------------------- */
  const handleMassivePurchaseClear = () => {
    console.log('Limpiar formulario masivo');
  };

  /* ----------------------------------------------------------------
     8) Al recibir la respuesta masiva, abrimos nuestro modal padre
     ---------------------------------------------------------------- */
  const handleMassivePurchaseSave = (data: CreateMassiveInvoiceResponse) => {
    setMassivePurchaseResponse(data);
    setShowMassivePurchaseResultModal(true);
  };

  /* ----------------------------------------------------------------
     9) expandedRowRender con fila de totales
     ---------------------------------------------------------------- */
  const expandedRowRender = (record: FacturaMasiva) => {
    if (!record.detalles || record.detalles.length === 0) return null;
    // Calculamos totales
    const totalKilos = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.nro_kilos).toFixed(2)) || 0), 0).toString();
    const totalPrecioKilo = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_kilo).toFixed(2)) || 0), 0).toString();
    const totalValorBruto = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_bruto).toFixed(2)) || 0), 0).toString();
    const totalCuotaFomento = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.cuota_fomento).toFixed(2)) || 0), 0).toString();
    const totalValorNeto = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_neto).toFixed(2)) || 0), 0).toString();

    return (
      <div className="py-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tipo de Cacao</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kilos</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Precio x Kilo</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Valor Bruto</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cuota Fomento</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Valor Neto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {record.detalles.map((detalle, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {detalle.nombre_tipo_cacao}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {formatNumber(detalle.nro_kilos, 2)}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {formatCurrency(detalle.valor_kilo)}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {formatCurrency(detalle.valor_bruto)}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {formatCurrency(detalle.cuota_fomento)}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-500">
                    {formatCurrency(detalle.valor_neto)}
                  </td>
                </tr>
              ))}

              {/* Fila de totales */}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-4 py-2 text-center">TOTALES:</td>
                <td className="px-4 py-2 text-center">
                  {formatNumber(totalKilos, 2)}
                </td>
                <td className="px-4 py-2 text-center">
                  {formatCurrency(totalPrecioKilo)}
                </td>
                <td className="px-4 py-2 text-center">
                  {formatCurrency(totalValorBruto)}
                </td>
                <td className="px-4 py-2 text-center">
                  {formatCurrency(totalCuotaFomento)}
                </td>
                <td className="px-4 py-2 text-center">
                  {formatCurrency(totalValorNeto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ----------------------------------------------------------------
     10) Modal padre con resultados de la compra masiva
     ---------------------------------------------------------------- */
  const renderMassivePurchaseResultModal = () => {
    if (!showMassivePurchaseResultModal || !massivePurchaseResponse) return null;

    const { detail, facturas_creadas } = massivePurchaseResponse;



    const enrichedFacturas = facturas_creadas.map(factura => {
      const totalPrecioKilo = factura.detalles?.reduce((acc, det) => acc + parseFloat(det.valor_kilo), 0) || 0;
      const date = new Date(factura.fecha_compra);
      return {
        ...factura,
        mes_compra: date.getMonth() + 1,
        anio_compra: date.getFullYear(),
        valor_kilo: totalPrecioKilo
      };
    });

    const fetchAllDataForExcel = async (page: number) => {
      if (page !== 1) return { data: [], total_pages: 1 };

      // Función auxiliar para formatear fecha y extraer mes/año
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
          formattedDate: date.toISOString().split('T')[0],
          month: date.getMonth() + 1,
          year: date.getFullYear()
        };
      };

      const flattenedData = facturas_creadas.flatMap(factura => {
        const { formattedDate, month, year } = formatDate(factura.fecha_compra);

        if (!factura.detalles || factura.detalles.length === 0) {
          return [{
            ...factura,
            nombre_tipo_cacao: '-',
            nro_kilos: '0',
            valor_kilo: '0',
            precio_kilo: '0',
            valor_bruto: '0',
            cuota_fomento: '0',
            valor_neto: '0',
            id_persona_recaudador: factura.id_persona_recaudador,
            id_persona_proveedor: factura.id_persona_proveedor,
            total_kilos: factura.total_kilos,
            fecha_compra: formattedDate,
            mes_compra: month,
            anio_compra: year
          }];
        }

        console.log("mes", month);
        console.log("year", year);

        return factura.detalles.map(detalle => {
          const valorKilo = formatCurrency(detalle.valor_kilo);
          return {

            id_factura_unica: factura.id_factura_unica,
            nombre_persona_recaudador: factura.nombre_persona_recaudador,
            nombre_persona_proveedor: factura.nombre_persona_proveedor,
            nro_documento_proveedor: factura.nro_documento_proveedor,
            tipo_documento_proveedor: factura.tipo_documento_proveedor,
            fecha_compra: formattedDate,
            mes_compra: month,
            anio_compra: year,
            nro_documento_soporte: factura.nro_documento_soporte,
            nombre_municipio_cacao: factura.nombre_municipio_cacao,
            nombre_departamento_cacao: factura.nombre_departamento_cacao,
            id_persona_recaudador: detalle.recaudador_info?.numero_documento || factura.id_persona_recaudador,
            id_persona_proveedor: detalle.proveedor_info?.numero_documento || factura.id_persona_proveedor,
            total_kilos: factura.total_kilos,
            nombre_tipo_cacao: detalle.nombre_tipo_cacao,
            nro_kilos: formatNumber(detalle.nro_kilos, 2),
            valor_kilo: valorKilo,
            precio_kilo: valorKilo,
            valor_bruto: formatCurrency(detalle.valor_bruto),
            cuota_fomento: formatCurrency(detalle.cuota_fomento),
            valor_neto: formatCurrency(detalle.valor_neto)
          };
        });
      });

      return {
        data: flattenedData,
        total_pages: 1
      };
    };

    const columns = [
      {
        key: 'id_persona_recaudador',
        label: 'NIT RECAUDADOR',
        render: (value: any) => formatNumber(value)
      },
      {
        key: 'nombre_persona_recaudador',
        label: 'NOMBRE RECAUDADOR'
      },
      {
        key: 'fecha_compra',
        label: 'FECHA DE COMPRA',
        render: (value: any) => {
          if (!value) return '-';
          let date = new Date(value);
          return date.toLocaleDateString('es-CO');
        }
      },
      {
        key: 'mes_compra',
        label: 'MES',
        render: (value: any) => value || '-'
      },
      {
        key: 'anio_compra',
        label: 'AÑO',
        render: (value: any) => value || '-'
      },
      {
        key: 'id_factura_unica',
        label: 'No. FACTURA UNICA',
        render: (value: any) => formatNumber(value)
      },
      {
        key: 'nro_documento_soporte',
        label: 'DOCUMENTO SOPORTE'
      },
      {
        key: 'id_persona_proveedor',
        label: 'NIT PROVEEDOR',
        render: (value: any) => formatNumber(value)
      },
      {
        key: 'nombre_persona_proveedor',
        label: 'NOMBRE PROVEEDOR'
      },
      {
        key: 'nombre_municipio_cacao',
        label: 'MUNICIPIO'
      },
      {
        key: 'nombre_departamento_cacao',
        label: 'DEPARTAMENTO'
      },
      {
        key: 'total_kilos',
        label: 'TOTAL KILOS',
        render: (value: number) => formatNumberWithCommas(value.toString())
      },
      {
        key: 'valor_kilo',
        label: 'PRECIO POR KILO',
        render: (value: any) => formatCurrency(value)
      },
      {
        key: 'valor_bruto',
        label: 'VALOR BRUTO',
        render: (value: any) => formatCurrency(value)
      },
      {
        key: 'cuota_fomento',
        label: 'CUOTA FOMENTO',
        render: (value: any) => formatCurrency(value)
      },
      {
        key: 'valor_neto',
        label: 'VALOR NETO',
        render: (value: any) => formatCurrency(value)
      }
    ];


    return (
      <ModalContainer
        isOpen={showMassivePurchaseResultModal}
        onClose={() => {
          setShowMassivePurchaseResultModal(false);
          router.push('/recaudadores/consultar_factura');
        }}
        size="4xl"
      >
        <div className="p-4">
          <h2 className="text-xl font-bold text-[rgb(var(--brown))] mb-6 text-center">
            Facturas cargadas
          </h2>
          <div className="space-y-4">
            <p className="text-center text-gray-600">{detail}</p>

            {facturas_creadas && facturas_creadas.length > 0 && (
              <div className="mt-4">
                <DynamicTable
                  columns={columns}
                  data={enrichedFacturas}
                  currentPage={1}
                  totalPages={1}
                  onPageChange={() => { }}
                  expandable={{
                    expandedRowRender,
                    rowExpandable: (record) =>
                      record.detalles && record.detalles.length > 0
                  }}
                  fetchAllData={fetchAllDataForExcel}
                  downloadButtonPosition="top"
                />
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                title="Cerrar"
                onClick={() => {
                  setShowMassivePurchaseResultModal(false);
                  router.push('/recaudadores/consultar_factura');
                }}
              />
            </div>
          </div>
        </div>
      </ModalContainer>
    );
  };

  const fetchAllData = async (page: number) => ({
    data: page === 1 ? purchasesForTable : [],
    total_pages: 1
  });

  const handleDeletePurchase = (purchaseId: string) => {
    // Preservar datos del recaudador antes de cualquier cambio
    const recaudadorData = {
      nitComprador: formData.nitComprador,
      comprador: formData.comprador,
      telefono: formData.telefono,
      ciudad: formData.ciudad,
      direccion: formData.direccion,
      email: formData.email,
      id_persona_recaudador: formData.id_persona_recaudador,
      tipo_documento_recaudador: formData.tipo_documento_recaudador,
      numero_documento_recaudador: formData.numero_documento_recaudador
    };

    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará la compra seleccionada',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'rgb(var(--green))',
      cancelButtonColor: 'rgb(var(--green))',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setPurchases((prev) => {
          const filtered = prev.filter((p) => p.id !== purchaseId);
          const total = filtered
            .reduce((acc, p) => acc + parseFloat(p.valorNeto), 0)
            .toFixed(2);

          setLocalValorTotal(total);
          onValorTotalChange(total);

          return filtered;
        });

        setFormData((prev: any) => ({
          ...prev,
          ...recaudadorData
        }));

        Swal.fire({
          title: 'Eliminado',
          text: 'La compra ha sido eliminada correctamente',
          icon: 'success',
          confirmButtonColor: 'rgb(var(--green))',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    });
  };

  const tableColumns = [
    { key: 'tipoCacao', label: 'TIPO DE CACAO' },
    {
      key: 'cantidadKilos',
      label: 'CANTIDAD KILOS',
      render: (v: string) => formatNumberWithCommas(v)
    },
    {
      key: 'precioKilo',
      label: 'PRECIO DE KILO',
      render: (v: string) => formatCurrency(parseFloat(v))
    },
    {
      key: 'valorBruto',
      label: 'VALOR BRUTO',
      render: (v: string) => formatCurrency(parseFloat(v))
    },
    {
      key: 'cuotaFomento',
      label: 'CUOTA FOMENTO',
      render: (v: string) => formatCurrency(parseFloat(v))
    },
    {
      key: 'valorNeto',
      label: 'VALOR NETO',
      render: (v: string) => formatCurrency(parseFloat(v))
    },
    {
      key: 'actions',
      label: 'ACCIONES',
      render: (_: any, row: PurchaseData) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditClick(row)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <img src="/images/icons/update.png" className="w-5 h-5" alt="Editar" />
          </button>
          <button
            onClick={() => handleDeletePurchase(row.id)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <img src="/images/icons/delete.png" className="w-5 h-5" alt="Eliminar" />
          </button>
        </div>
      )
    }
  ];


  return (
    <div className="bg-white rounded-3xl">

      <>
        {/* Botones superiores */}
        <div className="flex justify-end gap-4 mb-6">
          <button
            className="bg-[rgb(var(--gray-20))] px-4 py-1.5 rounded-xl text-sm
                          hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]
                     font-semibold text-center flex items-center gap-1"
            onClick={handleDownloadTemplate}
          >
            <span className="mr-1">
              <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
            </span>
            DESCARGAR PLANTILLA
          </button>

          <button
            className="bg-[rgb(var(--gray-20))] px-4 py-1.5 rounded-xl text-sm
                          hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]
                     font-semibold text-center flex items-center gap-1"
            onClick={() => setIsMassiveModalOpen(true)}
          >
            <span className="mr-1">
              <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
            </span>
            REGISTRO MASIVO DE COMPRAS
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[rgb(var(--gray-20))] px-4 py-1.5 rounded-xl text-sm
                     hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]
                     font-semibold text-center flex items-center gap-1"
          >
            <span className="mr-1">
              <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
            </span>
            REGISTRO COMPRA(S)
          </button>
        </div>

        {/* Tabla principal de compras */}
        <div className="mb-6">
          <h2 className="text-2xl mt-[39px] text-center font-bold text-[#562707] mb-4">
            DETALLE DE COMPRA
          </h2>
          <DynamicTable
            columns={tableColumns}
            data={purchases}
            currentPage={1}
            totalPages={1}
            onPageChange={() => { }}
            fetchAllData={fetchAllData}
          />
        </div>

        {/* Valor a pagar */}
        <div className="flex justify-between items-center">
          <div className="w-64">
            <AnimatedInput
              label="VALOR A PAGAR"
              name="valorTotal"
              value={formattedValorTotal}
              onChange={(e) => onValorTotalChange(e.target.value)}
              type="text"
              disabled
            />
          </div>
          <div className="flex gap-4">
            <Button title="Regresar" onClick={() => router.push('/recaudadores/consultar_factura')} />
            <Button title="Guardar" onClick={handleSave} />
            <Button title="Salir" onClick={() => router.push('/')} />
          </div>
        </div>

        {/* Modal para Registro de Compras (manual) */}
        <RegisterPurchase
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSavePurchases={handleSavePurchases}
        />

        {/* AlertForm para registro masivo */}
        <AlertForm
          isOpen={isMassiveModalOpen}
          onClose={() => setIsMassiveModalOpen(false)}
          onSave={() => {
            const massiveForm = document.querySelector('#massivePurchaseForm');
            if (massiveForm) {
              const saveButton = massiveForm.querySelector('button[type="submit"]') as HTMLButtonElement;
              if (saveButton) {
                saveButton.click();
              }
            }
          }}
          onClear={() => {
            const massiveForm = document.querySelector('#massivePurchaseForm');
            if (massiveForm) {
              const clearButton = massiveForm.querySelector('button[type="reset"]') as HTMLButtonElement;
              if (clearButton) {
                clearButton.click();
              }
            }
          }}
          title="REGISTRO MASIVO DE COMPRAS"
          size="md"
        >
          <MassivePurchaseForm
            onSave={handleMassivePurchaseSave}
            onClear={handleMassivePurchaseClear}
          />
        </AlertForm>

        {renderMassivePurchaseResultModal()}

        {isEditModalOpen && editingPurchase && (
          <ModalContainer
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingPurchase(null);
            }}
            size="md"
          >
            <h2 className="text-2xl font-bold text-[#562707] mb-6 text-center">EDITAR COMPRA 2</h2>
            <div className="space-y-4">
              <AnimatedSelect
                label="TIPO DE CACAO"
                name="tipoCacao"
                value={
                  tiposCacao.find((t) => t.title === editingPurchase.tipoCacao)?.value ||
                  ''
                }
                onChange={handleEditChange}
                options={tiposCacao}
              />
              {loading && (
                <p className="text-gray-500 text-sm mt-1">Cargando tipos de cacao...</p>
              )}
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

              <AnimatedInput
                label="Cantidad de Kilos"
                name="cantidadKilos"
                value={editingPurchase.cantidadKilos}
                onChange={handleEditChange}
                type="text"
              />

              <AnimatedInput
                label="Precio por Kilo"
                name="precioKilo"
                value={editingPurchase.precioKilo}
                onChange={handleEditChange}
                type="text"
              />

              <AnimatedInput
                label="Valor Bruto"
                name="valorBruto"
                value={formatCurrency(editingPurchase.valorBruto)}
                onChange={handleEditChange}
                type="text"
                disabled
              />

              <AnimatedInput
                label="Cuota de Fomento"
                name="cuotaFomento"
                value={formatCurrency(editingPurchase.cuotaFomento)}
                onChange={handleEditChange}
                type="text"
                disabled
              />

              <AnimatedInput
                label="Valor Neto"
                name="valorNeto"
                value={formatCurrency(editingPurchase.valorNeto)}
                onChange={handleEditChange}
                type="text"
                disabled
              />
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <Button
                title="Cancelar"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPurchase(null);
                }}
              />
              <Button title="Guardar" onClick={handleEditSave} />
            </div>
          </ModalContainer>
        )}
      </>

    </div>
  );
};

export default ButtonRegisterPurchase;
