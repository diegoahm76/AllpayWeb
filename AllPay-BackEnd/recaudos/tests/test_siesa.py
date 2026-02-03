"""
Tests para el CRUD de Siesa
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from recaudos.models.recaudos_models import Siesa
from seguridad.models.transversal_models import Personas, TipoDocumento

User = get_user_model()


class SiesaModelTest(TestCase):
    """
    Tests para el modelo Siesa
    """

    def setUp(self):
        self.siesa_data = {
            'descripcion': 'CUOTA DE FOMENTO TEST',
            'auxiliar': '41150301',
            'compania': '02',
            'centro': '025',
            'unidad': '25',
            'sucursal': '010'
        }

    def test_create_siesa(self):
        """Test crear un registro de Siesa"""
        siesa = Siesa.objects.create(**self.siesa_data)
        
        self.assertEqual(siesa.descripcion, 'CUOTA DE FOMENTO TEST')
        self.assertEqual(siesa.auxiliar, '41150301')
        self.assertEqual(siesa.compania, '02')
        self.assertEqual(siesa.centro, '025')
        self.assertEqual(siesa.unidad, '25')
        self.assertEqual(siesa.sucursal, '010')

    def test_siesa_str_method(self):
        """Test método __str__ del modelo Siesa"""
        siesa = Siesa.objects.create(**self.siesa_data)
        expected_str = f"{siesa.descripcion} ({siesa.auxiliar})"
        self.assertEqual(str(siesa), expected_str)

    def test_siesa_with_null_unidad(self):
        """Test crear Siesa con unidad nula"""
        siesa_data = self.siesa_data.copy()
        siesa_data['unidad'] = None
        
        siesa = Siesa.objects.create(**siesa_data)
        self.assertIsNone(siesa.unidad)


class SiesaAPITest(APITestCase):
    """
    Tests para las APIs de Siesa
    """

    def setUp(self):
        # Crear usuario de prueba
        self.tipo_documento = TipoDocumento.objects.create(
            cod_tipo_documento='CC',
            tipo_documento='Cedula de Ciudadania'
        )
        
        self.persona = Personas.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='12345678',
            primer_nombre='Test',
            primer_apellido='User',
            tipo_persona='N',
            email='test@test.com'
        )
        
        self.user = User.objects.create_user(
            nombre_de_usuario='testuser',
            persona=self.persona,
            password='testpass123',
            is_active=True
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Datos de prueba
        self.siesa_data = {
            'descripcion': 'CUOTA DE FOMENTO TEST',
            'auxiliar': '41150301',
            'compania': '02',
            'centro': '025',
            'unidad': '25',
            'sucursal': '010'
        }

    def test_create_siesa_api(self):
        """Test crear Siesa vía API"""
        url = reverse('siesa-list-create')
        response = self.client.post(url, self.siesa_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['descripcion'], 'CUOTA DE FOMENTO TEST')

    def test_list_siesa_api(self):
        """Test listar Siesa vía API"""
        # Crear registro de prueba
        Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)

    def test_get_siesa_detail_api(self):
        """Test obtener detalle de Siesa vía API"""
        siesa = Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-detail', kwargs={'id': siesa.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['descripcion'], 'CUOTA DE FOMENTO TEST')

    def test_update_siesa_api(self):
        """Test actualizar Siesa vía API"""
        siesa = Siesa.objects.create(**self.siesa_data)
        
        updated_data = self.siesa_data.copy()
        updated_data['descripcion'] = 'CUOTA DE FOMENTO ACTUALIZADA'
        
        url = reverse('siesa-detail', kwargs={'id': siesa.id})
        response = self.client.put(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['descripcion'], 'CUOTA DE FOMENTO ACTUALIZADA')

    def test_delete_siesa_api(self):
        """Test eliminar Siesa vía API"""
        siesa = Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-detail', kwargs={'id': siesa.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verificar que se eliminó
        self.assertFalse(Siesa.objects.filter(id=siesa.id).exists())

    def test_bulk_create_siesa_api(self):
        """Test crear múltiples Siesa vía API"""
        bulk_data = {
            'registros': [
                {
                    'descripcion': 'CUOTA DE FOMENTO 1',
                    'auxiliar': '41150301',
                    'compania': '02',
                    'centro': '025',
                    'unidad': '25',
                    'sucursal': '010'
                },
                {
                    'descripcion': 'CUOTA DE FOMENTO 2',
                    'auxiliar': '41150302',
                    'compania': '02',
                    'centro': '025',
                    'unidad': '26',
                    'sucursal': '011'
                }
            ]
        }
        
        url = reverse('siesa-bulk-create')
        response = self.client.post(url, bulk_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 2)

    def test_siesa_options_api(self):
        """Test obtener opciones de Siesa vía API"""
        # Crear algunos registros de prueba
        Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-options')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('companias', response.data['data'])
        self.assertIn('centros', response.data['data'])
        self.assertIn('sucursales', response.data['data'])
        self.assertEqual(response.data['data']['total_registros'], 1)

    def test_search_siesa_api(self):
        """Test búsqueda de Siesa vía API"""
        Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-list-create')
        response = self.client.get(url, {'search': 'CUOTA'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)

    def test_filter_siesa_by_compania_api(self):
        """Test filtrar Siesa por compañía vía API"""
        Siesa.objects.create(**self.siesa_data)
        
        url = reverse('siesa-list-create')
        response = self.client.get(url, {'compania': '02'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)

    def test_create_siesa_duplicate_descripcion(self):
        """Test crear Siesa con descripción duplicada"""
        # Crear primer registro
        Siesa.objects.create(**self.siesa_data)
        
        # Intentar crear segundo registro con misma descripción
        url = reverse('siesa-list-create')
        response = self.client.post(url, self.siesa_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('descripcion', response.data['errors'])

    def test_create_siesa_empty_fields(self):
        """Test crear Siesa con campos vacíos"""
        invalid_data = {
            'descripcion': '',
            'auxiliar': '',
            'compania': '',
            'centro': '',
            'sucursal': ''
        }
        
        url = reverse('siesa-list-create')
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_unauthorized_access(self):
        """Test acceso no autorizado"""
        self.client.force_authenticate(user=None)
        
        url = reverse('siesa-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
