from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
from .models import TRM, BolsaNY
from .serializers.reportes_serializers import TRMSerializer, BolsaNYSerializer

User = get_user_model()


class TRMModelTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.fecha_test = date(2024, 1, 15)

    def test_crear_trm(self):
        """Prueba la creación básica de un registro TRM"""
        trm = TRM.objects.create(
            fecha_registro=self.fecha_test,
            precio_trm=Decimal('4000.50'),
            usuario_que_registra=self.user
        )
        
        self.assertEqual(trm.fecha_registro, self.fecha_test)
        self.assertEqual(trm.precio_trm, Decimal('4000.50'))
        self.assertEqual(trm.usuario_que_registra, self.user)
        self.assertEqual(trm.anio, 2024)
        self.assertEqual(trm.mes, 1)

    def test_auto_calculo_anio_mes(self):
        """Prueba que el año y mes se calculen automáticamente"""
        trm = TRM.objects.create(
            fecha_registro=self.fecha_test,
            precio_trm=Decimal('4000.50'),
            usuario_que_registra=self.user
        )
        
        # Verificar que se calcularon automáticamente
        self.assertEqual(trm.anio, 2024)
        self.assertEqual(trm.mes, 1)

    def test_str_representation(self):
        """Prueba la representación en string del modelo"""
        trm = TRM.objects.create(
            fecha_registro=self.fecha_test,
            precio_trm=Decimal('4000.50'),
            usuario_que_registra=self.user
        )
        
        expected_str = f"TRM {trm.precio_trm} - {trm.fecha_registro}"
        self.assertEqual(str(trm), expected_str)

    def test_meta_options(self):
        """Prueba las opciones Meta del modelo"""
        trm = TRM.objects.create(
            fecha_registro=self.fecha_test,
            precio_trm=Decimal('4000.50'),
            usuario_que_registra=self.user
        )
        
        self.assertEqual(trm._meta.verbose_name, 'TRM')
        self.assertEqual(trm._meta.verbose_name_plural, 'TRMs')
        self.assertEqual(trm._meta.db_table, 'trm')


class TRMSerializerTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas del serializer"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.fecha_test = date(2024, 1, 15)

    def test_serializer_valid_data(self):
        """Prueba la serialización con datos válidos"""
        data = {
            'fecha_registro': self.fecha_test,
            'precio_trm': '4000.50',
            'usuario_que_registra': self.user.id
        }
        
        serializer = TRMSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_invalid_fecha_futura(self):
        """Prueba la validación de fecha futura"""
        fecha_futura = timezone.now().date() + timedelta(days=1)
        data = {
            'fecha_registro': fecha_futura,
            'precio_trm': '4000.50',
            'usuario_que_registra': self.user.id
        }
        
        serializer = TRMSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('fecha_registro', serializer.errors)

    def test_serializer_invalid_precio_negativo(self):
        """Prueba la validación de precio negativo"""
        data = {
            'fecha_registro': self.fecha_test,
            'precio_trm': '-100.00',
            'usuario_que_registra': self.user.id
        }
        
        serializer = TRMSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('precio_trm', serializer.errors)

    def test_serializer_read_only_fields(self):
        """Prueba que los campos anio y mes sean de solo lectura"""
        trm = TRM.objects.create(
            fecha_registro=self.fecha_test,
            precio_trm=Decimal('4000.50'),
            usuario_que_registra=self.user
        )
        
        serializer = TRMSerializer(trm)
        data = serializer.data
        
        # Verificar que los campos están presentes pero son de solo lectura
        self.assertIn('anio', data)
        self.assertIn('mes', data)
        self.assertEqual(data['anio'], 2024)
        self.assertEqual(data['mes'], 1)


class TRMAdminTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas del admin"""
        self.user = User.objects.create_user(
            username='adminuser',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            is_staff=True,
            is_superuser=True
        )
        self.client.login(username='adminuser', password='adminpass123')

    def test_admin_list_display(self):
        """Prueba que el admin muestre los campos correctos"""
        from django.contrib.admin import site
        from .admin import TRMAdmin
        
        # Verificar que el modelo está registrado
        self.assertIn(TRM, site._registry)
        
        # Verificar que se usa la clase admin correcta
        admin_instance = site._registry[TRM]
        self.assertIsInstance(admin_instance, TRMAdmin)
        
        # Verificar campos de list_display
        expected_fields = ('idregistro', 'fecha_registro', 'precio_trm', 'anio', 'mes', 'usuario_que_registra')
        self.assertEqual(admin_instance.list_display, expected_fields)


class BolsaNYModelTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.fecha_test = date(2024, 1, 15)

    def test_crear_bolsa_ny(self):
        """Prueba la creación básica de un registro BolsaNY"""
        bolsa_ny = BolsaNY.objects.create(
            fecha_registro=self.fecha_test,
            precio_cierre=Decimal('2500.75'),
            idusuario=self.user
        )
        
        self.assertEqual(bolsa_ny.fecha_registro, self.fecha_test)
        self.assertEqual(bolsa_ny.precio_cierre, Decimal('2500.75'))
        self.assertEqual(bolsa_ny.idusuario, self.user)
        self.assertEqual(bolsa_ny.anio, 2024)
        self.assertEqual(bolsa_ny.mes, 1)

    def test_auto_calculo_anio_mes(self):
        """Prueba que el año y mes se calculen automáticamente"""
        bolsa_ny = BolsaNY.objects.create(
            fecha_registro=self.fecha_test,
            precio_cierre=Decimal('2500.75'),
            idusuario=self.user
        )
        
        # Verificar que se calcularon automáticamente
        self.assertEqual(bolsa_ny.anio, 2024)
        self.assertEqual(bolsa_ny.mes, 1)

    def test_str_representation(self):
        """Prueba la representación en string del modelo"""
        bolsa_ny = BolsaNY.objects.create(
            fecha_registro=self.fecha_test,
            precio_cierre=Decimal('2500.75'),
            idusuario=self.user
        )
        
        expected_str = f"Bolsa NY {bolsa_ny.precio_cierre} - {bolsa_ny.fecha_registro}"
        self.assertEqual(str(bolsa_ny), expected_str)

    def test_meta_options(self):
        """Prueba las opciones Meta del modelo"""
        bolsa_ny = BolsaNY.objects.create(
            fecha_registro=self.fecha_test,
            precio_cierre=Decimal('2500.75'),
            idusuario=self.user
        )
        
        self.assertEqual(bolsa_ny._meta.verbose_name, 'Bolsa NY')
        self.assertEqual(bolsa_ny._meta.verbose_name_plural, 'Bolsas NY')
        self.assertEqual(bolsa_ny._meta.db_table, 'bolsa_ny')


class BolsaNYSerializerTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas del serializer"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.fecha_test = date(2024, 1, 15)

    def test_serializer_valid_data(self):
        """Prueba la serialización con datos válidos"""
        data = {
            'fecha_registro': self.fecha_test,
            'precio_cierre': '2500.75',
            'idusuario': self.user.id
        }
        
        serializer = BolsaNYSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_invalid_fecha_futura(self):
        """Prueba la validación de fecha futura"""
        fecha_futura = timezone.now().date() + timedelta(days=1)
        data = {
            'fecha_registro': fecha_futura,
            'precio_cierre': '2500.75',
            'idusuario': self.user.id
        }
        
        serializer = BolsaNYSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('fecha_registro', serializer.errors)

    def test_serializer_invalid_precio_negativo(self):
        """Prueba la validación de precio negativo"""
        data = {
            'fecha_registro': self.fecha_test,
            'precio_cierre': '-100.00',
            'idusuario': self.user.id
        }
        
        serializer = BolsaNYSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('precio_cierre', serializer.errors)

    def test_serializer_read_only_fields(self):
        """Prueba que los campos anio y mes sean de solo lectura"""
        bolsa_ny = BolsaNY.objects.create(
            fecha_registro=self.fecha_test,
            precio_cierre=Decimal('2500.75'),
            idusuario=self.user
        )
        
        serializer = BolsaNYSerializer(bolsa_ny)
        data = serializer.data
        
        # Verificar que los campos están presentes pero son de solo lectura
        self.assertIn('anio', data)
        self.assertIn('mes', data)
        self.assertEqual(data['anio'], 2024)
        self.assertEqual(data['mes'], 1)


class BolsaNYAdminTest(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas del admin"""
        self.user = User.objects.create_user(
            username='adminuser',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            is_staff=True,
            is_superuser=True
        )
        self.client.login(username='adminuser', password='adminpass123')

    def test_admin_list_display(self):
        """Prueba que el admin muestre los campos correctos"""
        from django.contrib.admin import site
        from .admin import BolsaNYAdmin
        
        # Verificar que el modelo está registrado
        self.assertIn(BolsaNY, site._registry)
        
        # Verificar que se usa la clase admin correcta
        admin_instance = site._registry[BolsaNY]
        self.assertIsInstance(admin_instance, BolsaNYAdmin)
        
        # Verificar campos de list_display
        expected_fields = ('idregistro', 'fecha_registro', 'precio_cierre', 'anio', 'mes', 'idusuario')
        self.assertEqual(admin_instance.list_display, expected_fields)
