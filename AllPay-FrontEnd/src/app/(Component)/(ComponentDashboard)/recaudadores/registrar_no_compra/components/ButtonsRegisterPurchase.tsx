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

import RegisterPurchase from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/components/RegisterPurchase';

import { usePorcentajesCobro } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/usePorcentajesCobro';

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
  formData,
  setFormData,
}) => {
  const [purchases, setPurchases] = useState<PurchaseData[]>(initialData);
  const [, setLocalValorTotal] = useState(valorTotal);

  /* modales */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseData | null>(null);

  const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);

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
            REGISTROS NO COMPRAS DE CACAO
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
 
          </div>
          <div className="flex gap-4">
            <Button title="Regresar" onClick={() => router.push('/recaudadores/consultar_factura')} />
            <Button title="Registrar" onClick={() => setIsModalOpen(true)}  />
            <Button title="Salir" onClick={() => router.push('/')} />
          </div>
        </div>

        {/* Modal para Registro de Compras (manual) */}
        <RegisterPurchase
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSavePurchases={handleSavePurchases}
        />

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
                  ''
                }
                onChange={handleEditChange}
                options={[]}
              />

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
