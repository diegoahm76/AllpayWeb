INSERT INTO public."Usuarios_Rol" ("Id_Rol","Id_Usuario")
SELECT 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public."Usuarios_Rol"
  WHERE "Id_Rol" = 1 AND "Id_Usuario" = 1
);

--
-- TOC entry 5172 (class 0 OID 19023)
-- Dependencies: 248
-- Data for Name: EstructuraMenus; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."EstructuraMenus"
("IdMenu", nombre, "nivelJerarquico", "ordenPorPadre", subsistema, "Id_MenuPadre")
VALUES
(1, 'Seguridad', 1, 1, 'SEGU', NULL),
(2, 'Recaudadores', 1, 1, 'RECA', NULL),
(3, 'Gestor de Recaudo', 1, 1, 'GERE', NULL),
(4, 'Gestor Deudores', 1, 1, 'GEDE', NULL),
(5, 'Reportes', 1, 1, 'REPO', NULL),
(6, 'Estadisticas', 1, 1, 'ESTA', NULL),
(7, 'Configuraciones', 1, 1, 'CONF', NULL);


--
-- TOC entry 5179 (class 0 OID 19056)
-- Dependencies: 255
-- Data for Name: Modulos; Type: TABLE DATA; Schema: public; Owner: postgres
--

-- MODULOS DEL SISTEM ALLPAY.

INSERT INTO public."Modulos"
("IdModulo", nombre, descripcion, subsistema, "rutaFormulario", "nombreIcono", "soloUsuarioWeb", "Id_Menu", "ordenModulo")
VALUES
-- SEGURIDAD
(1, 'Registro de Persona Natural', 'Permite registrar a una persona natural en el sistema', 'SEGU', '/seguridad/crear_usuario/?natural', 'test', 'f', 1, 1),
(2, 'Registro de Persona Juridica', 'Permite registrar a una persona Juridica en el sistema', 'SEGU', '/seguridad/crear_usuario/?juridico', 'test', 'f', 1, 2),
(3, 'Administración de Roles', 'Permite administrar los roles del sistema', 'SEGU', '/seguridad/roles/', 'test', 'f', 1, 3),
(4, 'Administración de Usuarios', 'Permite administrar las credenciales de acceso de las personas al sistema', 'SEGU', '/seguridad/administracion_usuario/', 'test', 'f', 1, 4),
(5, 'Auditoría del Sistema', 'Módulo para realizar la auditoría del sistema', 'SEGU', '/seguridad/auditoria/', 'test', 'f', 1, 5),
(6, 'Crear Usuario Interno', 'Permite crear a un usuario interno en el sistema', 'SEGU', '/seguridad/crear_usuario/', 'test', 'f', 1, 6),

-- RECAUDADORES

(7, 'Registro Compras de Cacao', 'Módulo para realizar el registro de compras de cacao por parte del recaudador', 'RECA', '/recaudadores/registrar_compra/', 'test', 't', 2, 1),
(8, 'Consulta Compras de Cacao', 'Módulo para realizar la consulta de compras de cacao por parte del recaudador', 'RECA', '/recaudadores/consultar_factura/', 'test', 't', 2, 2),
(9, 'Liquidación Cuota de Fomento', 'Módulo para realizar la liquidación de compras de cacao por parte del recaudador', 'RECA', 'recaudadores/generar_liquidacion/', 'test', 't', 2, 3),
(10, 'Consulta de Liquidaciones', 'Módulo para realizar la consulta de liquidaciones de compras de cacao por parte del recaudador', 'RECA', '/recaudadores/consultar_liquidacion/', 'test', 't', 2, 4),
(11, 'Pagos en Línea CF', 'Módulo para realizar pagos por pse', 'RECA', 'PSE/generar', 'test', 't', 2, 5),
(12, 'Consulta pagos en linea CF', 'Módulo para consultar pagos por pse', 'RECA', 'PSE/consultar', 'test', 't', 2, 6),
(13, 'Consulta Pagos en Línea AC', 'Módulo para consultar cuotas pagadas por un recaudador.', 'RECA', '/acuerdos_pago/consultar_pagadas', 'test', 't', 2, 7),
(14, 'Generar Paz y Salvo', 'Módulo para generar un paz y salvo por parte del usuario', 'RECA', 'recaudadores/consulta_documentos_pagos', 'test', 't', 2, 8),
(15, 'Consultar Paz y Salvo', 'Módulo para administrar los paz y salvo por parte del usuario', 'RECA', 'recaudadores/consultar_paz_salvo', 'test', 't', 2, 9),
(16, 'Solicitud Acuerdo de Pago', 'Módulo para solicitar un acuerdo de pago por parte del usuario', 'RECA', 'acuerdos_pago/solicitud', 'test', 't', 2, 10),
(17, 'Consultar Acuerdos de Pago', 'Módulo para administrar los acuerdos de pago por parte del usuario', 'RECA', 'acuerdos_pago/consultar', 'test', 't', 2, 11),
(18, 'Aprobación Acuerdo de Pago', 'Módulo para realizar la aprobación del plan de pago', 'RECA', '/acuerdos_pago/aprobacion/recaudador/', 'test', 't', 2, 12),
(19, 'Liquidación Acuerdos de Pago', 'Módulo para realizar la liquidación de las cuotas del plan de pago por parte de un recaudador', 'RECA', '/acuerdos_pago/liquidacion', 'test', 't', 2, 13),
(20, 'Pagar en Línea Acuerdo de Pago', 'Módulo para realizar pago de las cuotas en linea', 'RECA', '/pagar_cuota/consultar_liquidadas/', 'test', 't', 2, 14),
(21, 'Consulta Cartera Externo', 'Modulo para consultar la cartera como usuario externo', 'RECA', 'recaudadores/cartera_externo', 'test', 't', 2, 15),
(22, 'Consulta Facturas Pagadas Externo', 'Modulo para consultar la facturas pagadas como usuario externo', 'RECA', '/PSE/consultar/', 'test', 't', 2, 16),

-- GESTOR DE RECAUDO

(23, 'Identificación de Recaudadores', 'Módulo para registrar información sobre los recaudadores', 'GERE', '/recaudadores/identificacion_temporal/', 'test', 'f', 3, 1),
(24, 'Registro de Compra de Cacao', 'Módulo para realizar la registro de compras de cacao por parte de un usuario interno de la federación', 'GERE', '/recaudadores/registrar_compra/', 'test', 'f', 3, 2),
(25, 'Consultar Compras de Cacao', 'Módulo para realizar la consulta de compras de cacao por parte de un usuario interno de la federación', 'GERE', '/recaudadores/consultar_factura/', 'test', 'f', 3, 3),
(26, 'Consultar de Liquidaciones', 'Módulo para realizar la consulta de liquidaciones de compras de cacao por parte de un usuario interno de la federación', 'GERE', '/recaudadores/consultar_liquidacion/', 'test', 'f', 3, 4),
(27, 'Consultar de Paz y Salvo Interno', 'Módulo para consultar los paz y salvo por parte de un usuario interno de la federación', 'GERE', 'recaudadores/consultar_paz_salvo', 'test', 'f', 3, 5),
(28, 'Cargue de Datos SICEX', 'Módulo para cargar los datos SICEX', 'GERE', '/recaudadores/sicex/', 'test', 'f', 3, 6),
(29, 'Consulta Datos SICEX', 'Módulo para consultar los datos SICEX', 'GERE', '/recaudadores/sicex/', 'test', 'f', 3, 7),
(30, 'Consultar Documentos pagos', 'Módulo para consultar las facturas pagadas', 'GERE', 'recaudadores/consulta_documentos_pagos/', 'test', 'f', 3, 8),
(31, 'Consulta Facturas Pagadas Interno', 'Modulo para consultar la facturas pagadas como usuario interno', 'GERE', '/PSE/consultar_interno', 'test', 't', 3, 9),

-- GESTOR DEUDORES

(32, 'Consulta de Cartera', 'Módulo para consultar de cartera', 'GEDE', '/recaudadores/cartera/', 'test', 'f', 4, 1),
(33, 'Consulta de Acuerdos de Pago', 'Módulo para consultar los acuerdos de pago de un recaudador', 'GEDE', 'acuerdos_pago/consultar', 'test', 'f', 4, 2),
(34, 'Gestionar Acuerdos de Pago', 'Módulo para gestionar los acuerdos de pago de los recaudadores', 'GEDE', 'acuerdos_pago/gestionar', 'test', 'f', 4, 3),
(35, 'Aprobar Acuerdos de Pago Juridica', 'Módulo para Aprobar los acuerdos de pago de los recaudadores por parte de juridica', 'GEDE', 'acuerdos_pago/aprobacion/juridica', 'test', 'f', 4, 4),
(36, 'Aprobar Acuerdos de Pago Gerencia', 'Módulo para Aprobar los acuerdos de pago de los recaudadores por parte de Dirección', 'GEDE', 'acuerdos_pago/aprobacion/direccion', 'test', 'f', 4, 5),
(37, 'Notificar Acuerdos de Pago', 'Módulo para Notificar los acuerdos de pago de los recaudadores', 'GEDE', '/acuerdos_pago/notificacion/', 'test', 'f', 4, 6),
(38, 'Cobro Persuasivo', 'Módulo para realizar el cobro persuasivo a un deudor', 'GEDE', '/cobros/consulta', 'test', 'f', 4, 7),
(39, 'Cobro Coactivo', 'Módulo para realizar el cobro Coactivo a un deudor', 'GEDE', '', 'test', 'f', 4, 8),
(40, 'Liquidación Cuotas Usuario Interno', 'Módulo para realizar la liquidación de las cuotas del plan de pago por parte de un usuario interno', 'GEDE', '/acuerdos_pago/liquidacion', 'test', 'f', 4, 9),
(41, 'Consulta Pagos en Línea interno', 'Módulo para consultar cuotas pagadas para usuarios internos', 'GEDE', '/acuerdos_pago/consultar_pagadas', 'test', 'f', 4, 10),

-- REPORTES

(42, 'Reporte Libro de Compra', 'Módulo para generar reporte del libro de compras', 'REPO', '/reportes/compra_cacao_recaudador/', 'test', 'f', 5, 1),
(43, 'Reporte Consolidado Libro de Compras', 'Módulo para generar el reporte del consolidado del libro de compras.\n', 'REPO', '/reportes/compra_cacao_fecha/', 'test', 'f', 5, 2),
(44, 'Reporte Consolidado Pago de Cuotas de Fomento', 'Módulo para generar el reporte consolidado de pago de cuota de fomento.\n', 'REPO', '/reportes/cuota_fomento_recaudador/', 'test', 'f', 5, 3),
(45, 'Reporte Consolidado Demanda Nacional de Cacao', 'Reporte Consolidado Demanda Nacional de Cacao', 'REPO', '/reportes/cuota_fomento_fecha/', 'test', 'f', 5, 4),
(46, 'Reporte Sabana Importación/Exportación de Cacao', 'Módulo para generar el reporte sabana de importación/exportación de cacao.', 'REPO', '/reportes/sicex_fecha/', 'test', 'f', 5, 5),
(47, 'Reporte Consolidado de Pago en Línea', 'Módulo para generar el reporte consolidado de pagos en línea.', 'REPO', '/reportes/pagos_linea_cuota_fomento/', 'test', 'f', 5, 6),
(48, 'Reporte Precio Nacional de Cacao', 'Módulo para generar el reporte del precio nacional del cacao.', 'REPO', '/reportes/precio_nacional/', 'test', 'f', 5, 7),
(49, 'Reporte Consolidado Acuerdo de Pago', 'Módulo para generar el reporte consolidado de acuerdos de pago.', 'REPO', '/reportes/acuerdos_pago_fecha/', 'test', 'f', 5, 8),
(50, 'Reporte Consolidado Producción Nacional de Cacao', 'Módulo para generar el reporte consolidado de producción nacional de cacao.', 'REPO', '/reportes/produccion_nacional_cacao/', 'test', 'f', 5, 9),

-- ESTADISTICAS

(51, 'Exportacion Partida', 'Módulo para visualizar la estadistica de exportacion partida', 'ESTA', 'estadisticas/exportacion_partida', 'test', 'f', 6, 1 ),
(52, 'Exportacion Mensual', 'Módulo para visualizar la estadistica de exportacion mensual', 'ESTA', 'estadisticas/exportacion_mensual', 'test', 'f',6 , 2),
(53, 'Derivado Cacao', 'Módulo para visualizar la estadistica de derivado de cacao', 'ESTA', 'estadisticas/derivado_cacao', 'test', 'f', 6, 3),
(54, 'Cartera', 'Módulo para visualizar la estadistica de cartera ', 'ESTA', 'estadisticas/cartera', 'test', 'f', 6, 4),
(55, 'Comparativa Periodo', 'Módulo para visualizar la estadistica de dos periodos ', 'ESTA', 'estadisticas/comparativo_periodo', 'test', 'f', 6, 5),
(56, 'Compras Cacao', 'Módulo para visualizar la estadistica de compras de cacao ', 'ESTA', 'estadisticas/compras_cacao', 'test', 'f', 6, 6),
(57, 'Promedio Nacional', 'Módulo para visualizar la estadistica el promedio nacional de cacao ', 'ESTA', 'estadisticas/promedio_nacional', 'test', 'f', 6, 7),
(58, 'Comparativo Cacao Internacional', 'Módulo para visualizar la estadistica del cacao internacional ', 'ESTA', 'estadisticas/comparativo_cacao_internacional', 'test', 'f', 6, 8),
(59, 'Comparativo Newyork', 'Módulo para visualizar la estadistica del cacao newyork ', 'ESTA', 'estadisticas/comparativo_newyork', 'test', 'f', 6, 9),
(60, 'Colombia', 'Módulo para visualizar la estadistica del cacao Colombia ', 'ESTA', 'estadisticas/colombia', 'test', 'f', 6, 10),
(61, 'Escenarios de Estimación', 'Modulo que permite cargar la produccion nacional de cacao','ESTA', 'estadisticas/produccion_nacional_cacao', 'test', 'f', 6, 11),

-- CONFIGURACIONES

(62, 'Administración de Cargos', 'Permite administrar los cargos disponibles en el sistema', 'CONF', '/seguridad/administracion_cargos/', 'test', 'f', 7, 1),
(63, 'Administración de Documentos de Identificación', 'Permite administrar los tipos de documentos de identificación', 'CONF', '/seguridad/dni/', 'test', 'f', 7, 2),
(64, 'Cargar plantillas', 'Módulo para cargar plantillas', 'CONF', '/plantilla/descargar/', 'test', 'f', 7, 3),
(65, 'Configuración de Alertas', 'Módulo para configurar las alertas del sistema', 'CONF', '/seguridad/configuracion_alertas/', 'test', 'f', 7, 4),
(66, 'Configuración de Consecutivo', 'Módulo para configurar los consecutivos', 'CONF', '/plantilla/configuracion_consecutivo/', 'test', 'f', 7, 5),
(67, 'Configuración de las Fechas Limite', 'Módulo para configurar las fechas limite del sistema', 'CONF', 'recaudadores/fechas_limite', 'test', 'f', 7, 6),
(68, 'Configuración de los Porcentajes de Cobro', 'Módulo para configurar los porcentajes de cobro', 'CONF', 'recaudadores/cuota_porcentaje', 'test', 'f', 7, 7),
(69, 'Configuración de Tipos de cacao', 'Módulo para configurar los tipos de cacao', 'CONF', '/recaudadores/tipos_cacao/', 'test', 'f', 7, 8),
(70, 'Configuración de Tipos de Comprador', 'Módulo para configurar los tipos de comprador', 'CONF', '/seguridad/tipos_comprador/', 'test', 'f', 7, 9),
(71, 'Generador de Documentos', 'Módulo para generar los documentos del sistema', 'CONF', '/plantilla/generacion_documento/', 'test', 'f', 7, 10),
(72, 'Configuración de Acciones en Cobros', 'Módulo para la configuración de las acciones en cobros persuasivos y coactivos.', 'CONF', '/seguridad/acciones_cobros', 'test', 'f', 7, 11),
(73, 'Configuración TRM', 'Módulo para la configuración de la TRM', 'CONF', 'configuracion/trm_preciony', 'test', 'f', 7, 12),
(74, 'Configuración Historico Produccion Cacao', 'Modulo que permite cargar el historico de la produccion de cacao','CONF', 'configuracion/historico_produccion_cacao', 'test', 'f', 7, 13),
(75, 'Configuración Departamento Produccion Cacao', 'Modulo que permite configurar el departamento de la produccion de cacao','CONF', 'configuracion/departamento_produccion_cacao', 'test', 'f', 7, 14),
(76, 'Rendimiento Censo', 'Modulo que permite configurar el rendimiento del censo','CONF', 'configuracion/rendimiento_censo', 'test', 'f', 7, 15);

--
-- TOC entry 5156 (class 0 OID 18957)
-- Dependencies: 232
-- Data for Name: Permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--
-- PERMISOS

INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('CR', 'Crear');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('BO', 'Borrar');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('AC', 'Actualizar');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('CO', 'Consultar');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('EJ', 'Ejecutar');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('AP', 'Aprobar');
INSERT INTO public."Permisos" ("CodPermiso", "nombre") VALUES ('AN', 'Anular');

--
-- TOC entry 5185 (class 0 OID 19081)
-- Dependencies: 261
-- Data for Name: Permisos_Modulo; Type: TABLE DATA; Schema: public; Owner: postgres
--

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- SEGURIDAD
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Seguridad.
-- Módulo "SEGURIDAD"

-- Módulo "Registro de Persona Natural"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (1, 1, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (2, 1, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (3, 1, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (4, 1, 'BO');

-- Módulo "Registro de Persona Juridica"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (5, 2, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (6, 2, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (7, 2, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (8, 2, 'BO');

-- Módulo "Administración de Roles"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (9, 3, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (10, 3, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (11, 3, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (12, 3, 'BO');

-- Módulo "Administración de Usuarios"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (13, 4, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (14, 4, 'CO');

-- Módulo AUDITORÍA.
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (15, 5, 'CO');

-- Módulo "Crear Usuario Interno"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (16, 6, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (17, 6, 'CO');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- RECAUDADORES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Recaudadores.
-- Módulo "RECAUDADORES"

-- Módulo "Registro Compras de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (18, 7, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (19, 7, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (20, 7, 'CO');

-- Módulo "Consulta de compras de Cacao"   
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (21, 8, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (22, 8, 'AC');

-- Módulo "Liquidación Cuota de Fomento"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (23, 9, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (24, 9, 'CO');

-- Módulo "Consulta de Liquidaciones"   
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (25, 10, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (26, 10, 'AC');

-- Módulo "Pagar cuota en linea".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (27, 11, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (28, 11, 'CO');

-- Módulo "Consultar cuotas pagadas cuota de fomento".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (29, 12, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (30, 12, 'AC');

-- Módulo "Consultar cuotas pagadas acuerdos de pago".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (31, 13, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (32, 13, 'AC');

-- Módulo "Generar Paz y Salvo"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (33, 14, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (34, 14, 'CO');

-- Módulo "Consulta  de Paz y Salvo"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (35, 15, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (36, 15, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (37, 15, 'BO');

-- Módulo "Solicitud Acuerdo de Pago"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (38, 16, 'CR');

-- Módulo "Consulta de Acuerdos de Pago"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (39, 17, 'CO');

-- Módulo "Aprobar Acuerdos de Pago Recaudador"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (40, 18, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (41, 18, 'AC');

-- Módulo "Liquidación Acuerdo de Pago".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (42, 19, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (43, 19, 'CO');

-- Módulo "Pagar en linea Acuerdo de Pago".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (44, 20, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (45, 20, 'CO');

-- Módulo "Consulta de Cartera Externo".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (46, 21, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (47, 21, 'AC');

-- Módulo "Consulta de Facturas Pagadas Externo".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (48, 22, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (49, 22, 'AC');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- GESTOR DE RECAUDO
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Gestor de Recaudo.
-- Módulo "GESTOR DE RECAUDO"


-- Módulo "Identificación de Recaudadores"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (50, 23, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (51, 23, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (52, 23, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (53, 23, 'BO');

-- Módulo "Registro de Compra de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (54, 24, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (55, 24, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (56, 24, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (57, 24, 'BO');

-- Módulo "Consultar Compras de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (58, 25, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (59, 25, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (60, 25, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (61, 25, 'BO');

-- Módulo "Consulta de Liquidaciones"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (62, 26, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (63, 26, 'AC');

-- Módulo "Consulta de Paz y Salvo Interno" 
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (64, 27, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (65, 27, 'AC');

-- Módulo "Cargue de Datos SICEX"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (66, 28, 'CR');

-- Módulo "Consulta de Datos SICEX"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (67, 29, 'CO');

-- Módulo "Consulta de Documentos pagos"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (68, 30, 'CO');

-- Módulo "Consulta de Facturas pagadas"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (69, 31, 'CO');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- GESTOR DEUDORES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Gestor de Deudores.
-- Módulo "GESTOR DE DEUDORES"

-- Módulo "Consulta Cartera".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (70, 32, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (71, 32, 'AC');

-- Módulo "Consulta Acuerdos de Pago"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (72, 33, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (73, 33, 'AC');

-- Módulo "Gestionar Acuerdos de Pago"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (74, 34, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (75, 34, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (76, 34, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (77, 34, 'BO');

-- Módulo "Aprobar Acuerdos de Pago Juridica"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (78, 35, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (79, 35, 'AC');

-- Módulo "Aprobar Acuerdos de Pago Gerencia"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (80, 36, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (81, 36, 'AC');

-- Módulo "Notificar Acuerdos de Pago"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (82, 37, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (83, 37, 'AC');

-- Módulo "Cobro Persuasivo"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (84, 38, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (85, 38, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (86, 38, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (87, 38, 'BO');

-- Módulo "Cobro Coactivo"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (88, 39, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (89, 39, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (90, 39, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (91, 39, 'BO');

-- Módulo "Liquidación Cuotas".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (92, 40, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (93, 40, 'CO');

-- Módulo "Consultar cuotas pagadas interno".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (94, 41, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (95, 41, 'AC');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- REPORTES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Reportes.
-- Módulo "REPORTES"

-- Módulo "Reporte Libro de Compra"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (96, 42, 'CO');

-- Módulo "Reporte Consolidado Libro de Compras"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (97, 43, 'CO');

-- Módulo "Reporte Consolidado Pago de Cuotas de Fomento"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (98, 44, 'CO');

-- Módulo "Reporte Consolidado Demanda Nacional de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (99, 45, 'CO');

-- Módulo "Reporte Sabana Importación/Exportación de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (100, 46, 'CO');

-- Módulo "Reporte Consolidado de Pago en Línea"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (101, 47, 'CO');

-- Módulo "Reporte Precio Nacional de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (102, 48, 'CO');

-- Módulo "Reporte Consolidado Acuerdo de Pago": Módulo para generar el reporte consolidado de acuerdos de pago.
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (103, 49, 'CO');

-- Módulo "Reporte Consolidado Producción Nacional de Cacao": Módulo para generar el reporte consolidado de producción nacional de cacao.
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (104, 50, 'CO');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- ESTADISTICAS
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Estadisticas.
-- Módulo "ESTADISTICAS"

-- Módulo "Tablero Exportacion Partida"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (105, 51, 'CO');

-- Módulo "Tablero Exportacion Mensual"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (106, 52, 'CO');

-- Módulo "Tablero Derivado Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (107, 53, 'CO');

-- Módulo "Tablero Cartera"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (108, 54, 'CO');

-- Módulo "Tablero Comparativa Periodo"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (109, 55, 'CO');

-- Módulo "Tablero Compras Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (110, 56, 'CO');

-- Módulo "Tablero Promedio Nacional"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (111, 57, 'CO');

-- Módulo "Tablero Comparativo Cacao Internacional"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (112, 58, 'CO');

-- Módulo "Tablero Comparativo Newyork"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (113, 59, 'CO');

-- Módulo "Tablero Comparativo Colombia"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (114, 60, 'CO');

-- Módulo "Tablero Produccion Nacional de Cacao"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (115, 61, 'CO');

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- CONFIGURACIONES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Configuraciones.
-- Módulo "CONFIGURACIONES"

-- Módulo "Cargos"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (116, 62, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (117, 62, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (118, 62, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (119, 62, 'BO');

-- Módulo "Tipos de Documento de ID"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (120, 63, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (121, 63, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (122, 63, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (123, 63, 'BO');

-- Módulo "Cargar plantillas"
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (124, 64, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (125, 64, 'CO');

-- Módulo "Configuración de Alertas".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (126, 65, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (127, 65, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (128, 65, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (129, 65, 'BO');

-- Módulo "Configuración de Consecutivo".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (130, 66, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (131, 66, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (132, 66, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (133, 66, 'BO');

-- Módulo "Configuración de las Fechas Limite".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (134, 67, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (135, 67, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (136, 67, 'CR');

-- Módulo "Configuración de los porcentajes de cobro".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (137, 68, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (138, 68, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (139, 68, 'CR');

-- Módulo "Configuración de Tipos de cacao".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (140, 69, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (141, 69, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (142, 69, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (143, 69, 'BO');

-- Módulo "Configuración de Tipos de Comprador".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (144, 70, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (145, 70, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (146, 70, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (147, 70, 'BO');

-- Módulo "Generador de documentos".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (148, 71, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (149, 71, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (150, 71, 'BO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (151, 71, 'CR');

-- Módulo "Configuración de Acciones en Cobros".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (152, 72, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (153, 72, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (154, 72, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (155, 72, 'BO');

-- Módulo "Configuración de TRM".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (156, 73, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (157, 73, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (158, 73, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (159, 73, 'BO');

-- Módulo "Configuración de Historicos Produccion Cacao".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (160, 74, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (161, 74, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (162, 74, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (163, 74, 'BO');

-- Módulo "Configuración de Departamento de Produccion Cacao".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (164, 75, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (165, 75, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (166, 75, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (167, 75, 'BO');

-- Módulo "Configuración de Rendimiento Censo".
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (168, 76, 'CR');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (169, 76, 'CO');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (170, 76, 'AC');
INSERT INTO public."Permisos_Modulo" ("IdPermisos_Modulo", "Id_Modulo", "Cod_Permiso") OVERRIDING SYSTEM VALUE VALUES (171, 76, 'BO');



-- PERMISOS POR MODULO POR ROL PARA LOS ROLES INICIALES (ROL "SUPERUSUARIO" y ROL "USUARIOS WEB").
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- SEGURIDAD
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Seguridad.

-- Rol del SuperUsuario, "Registro de Persona Natural"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (1, 1, 1);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (2, 1, 2);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (3, 1, 3);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (4, 1, 4);

-- Rol de SuperUsuario, "Registro de Persona Juridica"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (5, 1, 5);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (6, 1, 6);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (7, 1, 7);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (8, 1, 8);

-- Rol de SuperUsuario, "Administración de Roles"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (9, 1, 9);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (10, 1, 10);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (11, 1, 11);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (12, 1, 12);

-- Rol de SuperUsuario, "Administración de Usuarios"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (13, 1, 13);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (14, 1, 14);

-- Rol de SuperUsuario, AUDITORÍA
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (15, 1, 15);

-- Rol de SuperUsuario, "Crear Usuario Interno"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (16, 1, 16);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (17, 1, 17);


----------------------------------------------------------------------------------------------------------------------------------------------------------
-- RECAUDADORES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Recaudadores

-- Módulo "Registro Compras de Cacao"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (18, 1, 18);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (19, 1, 19);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (20, 1, 20);

-- Módulo "Consulta de compras de Cacao"   
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (21, 1, 21);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (22, 1, 22);

-- Módulo "Liquidación Cuota de Fomento"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (23, 1, 23);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (24, 1, 24);

-- Módulo "Consulta de Liquidaciones"   
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (25, 1, 25);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (26, 1, 26);

-- Módulo "Pagar cuota en linea".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (27, 1, 27);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (28, 1, 28);

-- Módulo "Consultar cuotas pagadas cuota de fomento".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (29, 1, 29);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (30, 1, 30);

-- Módulo "Consultar cuotas pagadas acuerdos de pago".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (31, 1, 31);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (32, 1, 32);

-- Módulo "Generar Paz y Salvo"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (33, 1, 33);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (34, 1, 34);

-- Módulo "Consulta  de Paz y Salvo"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (35, 1, 35);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (36, 1, 36);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (37, 1, 37);

-- Módulo "Solicitud Acuerdo de Pago"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (38, 1, 38);

-- Módulo "Consulta de Acuerdos de Pago"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (39, 1, 39);

-- Módulo "Aprobar Acuerdos de Pago Recaudador"
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (40, 1, 40);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (41, 1, 41);

-- Módulo "Liquidación Acuerdo de Pago".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (42, 1, 42);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (43, 1, 43);

-- Módulo "Pagar en linea Acuerdo de Pago".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (44, 1, 44);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (45, 1, 45);

-- Módulo "Consulta de Cartera Externo".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (46, 1, 46);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (47, 1, 47);

-- Módulo "Consulta de Facturas Pagadas Externo".
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (48, 1, 48);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (49, 1, 49);
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- GESTOR DE RECAUDO
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Gestor de Recaudo.
-- Módulo "GESTOR DE RECAUDO"

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- GESTOR DE RECAUDO
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Gestor de Recaudo.
-- Módulo "GESTOR DE RECAUDO"

-- Módulo "Identificación de Recaudadores"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (50, 1, 50);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (51, 1, 51);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (52, 1, 52);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (53, 1, 53);

-- Módulo "Registro de Compra de Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (54, 1, 54);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (55, 1, 55);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (56, 1, 56);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (57, 1, 57);

-- Módulo "Consultar Compras de Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (58, 1, 58);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (59, 1, 59);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (60, 1, 60);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (61, 1, 61);

-- Módulo "Consulta de Liquidaciones"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (62, 1, 62);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (63, 1, 63);

-- Módulo "Consulta de Paz y Salvo Interno" 

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (64, 1, 64);


-- Módulo "Cargue de Datos SICEX"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (65, 1, 65);

-- Módulo "Consulta de Datos SICEX"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (66, 1, 66);

-- Módulo "Consulta de Documentos pagos"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (67, 1, 67);

-- Módulo "Consulta de Facturas pagadas"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (68, 1, 68);

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- GESTOR DEUDORES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Gestor de Deudores.
-- Módulo "GESTOR DE DEUDORES"

-- Módulo "Consulta Cartera".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (69, 1, 69);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (70, 1, 70);

-- Módulo "Consulta Acuerdos de Pago"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (71, 1, 71);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (72, 1, 72);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (73, 1, 73);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (74, 1, 74);

-- Módulo "Gestionar Acuerdos de Pago"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (75, 1, 75);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (76, 1, 76);

-- Módulo "Aprobar Acuerdos de Pago Juridica"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (77, 1, 77);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (78, 1, 78);

-- Módulo "Aprobar Acuerdos de Pago Gerencia"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (79, 1, 79);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (80, 1, 80);

-- Módulo "Notificar Acuerdos de Pago"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (81, 1, 81);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (82, 1, 82);

-- Módulo "Cobro Persuasivo"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (83, 1, 83);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (84, 1, 84);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (85, 1, 85);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (86, 1, 86);

-- Módulo "Cobro Coactivo"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (87, 1, 87);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (88, 1, 88);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (89, 1, 89);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (90, 1, 90);

-- Módulo "Liquidación Cuotas".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (91, 1, 91);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (92, 1, 92);

-- Módulo "Consultar cuotas pagadas interno".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (93, 1, 93);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (94, 1, 94);



----------------------------------------------------------------------------------------------------------------------------------------------------------
-- REPORTES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Reportes.
-- Módulo "REPORTES"

-- Módulo "Reporte Libro de Compra"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (95, 1, 95);

-- Módulo "Reporte Consolidado Libro de Compras"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (96, 1, 96);

-- Módulo "Reporte Consolidado Pago de Cuotas de Fomento"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (97, 1, 97);

-- Módulo "Reporte Consolidado Demanda Nacional de Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (98, 1, 98);

-- Módulo "Reporte Sabana Importación/Exportación de Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (99, 1, 99);

-- Módulo "Reporte Consolidado de Pago en Línea"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (100, 1, 100);

-- Módulo "Reporte Precio Nacional de Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (101, 1, 101);

-- Módulo "Reporte Consolidado Acuerdo de Pago": Módulo para generar el reporte consolidado de acuerdos de pago.

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (102, 1, 102);

-- Módulo "Reporte Consolidado Producción Nacional de Cacao": Módulo para generar el reporte consolidado de producción nacional de cacao.

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (103, 1, 103);

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- ESTADISTICAS
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Estadisticas.
-- Módulo "ESTADISTICAS"

-- Módulo "Tablero Exportacion Partida"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (104, 1, 104);

-- Módulo "Tablero Exportacion Mensual"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (105, 1, 105);

-- Módulo "Tablero Derivado Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (106, 1, 106);

-- Módulo "Tablero Cartera"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (107, 1, 107);

-- Módulo "Tablero Comparativa Periodo"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (108, 1, 108);

-- Módulo "Tablero Compras Cacao"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (109, 1, 109);

-- Módulo "Tablero Promedio Nacional"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (110, 1, 110);

-- Módulo "Tablero Comparativo Cacao Internacional"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (111, 1, 111);

-- Módulo "Tablero Comparativo Newyork"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (112, 1, 112);

-- Módulo "Tablero Comparativo Colombia"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (113, 1, 113);

-- Módulo "Tablero Comparativo Colombia"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (114, 1, 114);

----------------------------------------------------------------------------------------------------------------------------------------------------------
-- CONFIGURACIONES
----------------------------------------------------------------------------------------------------------------------------------------------------------
-- Funcionalidades del Subsistema de Configuraciones.
-- Módulo "CONFIGURACIONES"

-- Módulo "Cargos"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (115, 1, 115);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (116, 1, 116);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (117, 1, 117);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (118, 1, 118);

-- Módulo "Tipos de Documento de ID"


INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (119, 1, 119);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (120, 1, 120);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (121, 1, 121);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (122, 1, 122);

-- Módulo "Cargar plantillas"

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (123, 1, 123);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (124, 1, 124);

-- Módulo "Configuración de Alertas".


INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (125, 1, 125);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (126, 1, 126);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (127, 1, 127);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (128, 1, 128);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (129, 1, 129);

-- Módulo "Configuración de Consecutivo".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (130, 1, 130);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (131, 1, 131);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (132, 1, 132);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (133, 1, 133);

-- Módulo "Configuración de las Fechas Limite".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (134, 1, 134);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (135, 1, 135);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (136, 1, 136);

-- Módulo "Configuración de los porcentajes de cobro".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (137, 1, 137);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (138, 1, 138);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (139, 1, 139);

-- Módulo "Configuración de Tipos de cacao".


INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (140, 1, 140);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (141, 1, 141);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (142, 1, 142);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (143, 1, 143);

-- Módulo "Configuración de Tipos de Comprador".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (144, 1, 144);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (145, 1, 145);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (146, 1, 146);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (147, 1, 147);

-- Módulo "Generador de documentos".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (148, 1, 148);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (149, 1, 149);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (150, 1, 150);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (151, 1, 151);

-- Módulo "Configuración de Acciones en Cobros".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (152, 1, 152);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (153, 1, 153);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (154, 1, 154);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (155, 1, 155);

-- Módulo "Configuración de TRM".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (156, 1, 156);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (157, 1, 157);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (158, 1, 158);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (159, 1, 159);

-- Módulo "Configuración de Historico Produccion Cacao".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (162, 1, 162);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (163, 1, 163);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (160, 1, 160);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (161, 1, 161);

-- Módulo "Configuración de Departamento Produccion Cacao".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (164, 1, 164);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (165, 1, 165);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (166, 1, 166);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (167, 1, 167);

-- Módulo "Configuración de Departamento Produccion Cacao".

INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (168, 1, 168);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (169, 1, 169);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (170, 1, 170);
INSERT INTO public."Permisos_Modulo_Rol" ("IdPermisos_Modulo_Rol", "Id_Rol", "Id_Permisos_Modulo") OVERRIDING SYSTEM VALUE VALUES (171, 1, 171);

--
-- TOC entry 5255 (class 0 OID 21233)
-- Dependencies: 331
-- Data for Name: PuertosExportacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."PuertosExportacion" 
("IdPuertoExportacion", nombre, descripcion, "fechaCreacion", "Id_PersonaCrea", activo, "itemYaUsado") VALUES
(1, 'Puerto de Mamonal', 'Terminal especializado en cargas a granel y carbón, con altos estándares ambientales.', '2025-05-13 17:09:37.316218-05', 0, true, true),
(2, 'Aeropuerto José María Córdova', 'Puerto de exportación Aeropuerto  José María Córdova', '2025-06-26 15:57:44.745512-05', 0, true, true),
(3, 'Puerto de Barranquilla', 'Situado sobre el río Magdalena, destaca por su capacidad de almacenamiento de petróleo y productos industriales.', '2025-05-13 13:37:47.761857-05', 0, true, true),
(4, 'Aeropuerto el Dorado', 'Puerto de exportación Aeropuerto el Dorado', '2025-06-26 15:56:59.350808-05', 0, true, true),
(5, 'Puerto de Cartagena', 'Ubicado en el Caribe, es líder en exportaciones y turismo de cruceros, con una infraestructura moderna y conexiones internacionales.', '2025-05-17 12:05:23.796756-05', 0, true, true),
(6, 'Puerto de Coveñas', 'Terminal petrolero clave en la Costa Caribe, utilizado para la exportación de crudo.', '2025-05-13 15:01:01.123029-05', 0, true, true),
(7, 'Puerto de Turbo (Puerto Antioquia)', 'En desarrollo en el Urabá antioqueño, busca mejorar la competitividad internacional y reducir costos logísticos.', '2025-05-11 00:00:00-05', 0, true, true),
(8, 'Puerto de Buenaventura', 'Principal puerto del país en el océano Pacífico, moviliza más del 60% de la carga marítima nacional.', '2025-05-13 13:38:23.636828-05', 0, true, true),
(9, 'Puerto de Santa Marta', 'Conformado por siete muelles, maneja carga de combustibles, grano y aceite de palma, y cuenta con servicios ferroviarios exclusivos.', '2025-05-17 12:05:41.318473-05', 0, true, true),
(10, 'Puerto de Pozos Colorados', 'Ubicado en Santa Marta, operado por Ecopetrol, maneja productos petroleros.', '2025-05-17 12:05:48.619737-05', 0, true, true),
(11, 'Puerto de Tumaco', 'Ubicado en la costa pacífica, especializado en la exportación de crudo y banano, con infraestructura para granel líquido y seco.', '2025-05-17 12:05:13.02199-05', 0, true, true),
(12, 'Puerto Bolívar', 'Localizado en La Guajira, es el mayor puerto de exportación de carbón de Latinoamérica, conectado directamente con las minas del Cerrejón.', '2025-05-14 10:47:13.220613-05', 0, true, true);


--
-- TOC entry 5210 (class 0 OID 19500)
-- Dependencies: 286
-- Data for Name: PorcentajesCobro; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."PorcentajesCobro" ("IdPorcentajeCobro", "CodTipoCobro", valor) VALUES
(1, 'PI', 0.22700),
(2, 'PC', 0.33000),
(3, 'CF', 0.03000);

--
-- TOC entry 5214 (class 0 OID 19516)
-- Dependencies: 290
-- Data for Name: TiposCacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."TiposCacao" ("IdTipoCacao", nombre, activo, "itemYaUsado", "fechaCreacion", "Id_PersonaCrea", "valorMaximo", "valorMinimo", "fechaActualizacion") VALUES
(1, 'Pasilla', true, true, '2025-03-04 00:42:37.588983-05', 0, 23000.00, 20000.00, '2025-07-01 17:02:56.581494-05'),
(2, 'Cacao en grano - Premium', true, true, '2025-03-01 08:46:57.463456-05', 0, 34000.00, 32000.00, NULL),
(3, 'Cacao en baba', true, true, '2025-03-01 08:43:52.37846-05', 0, 10000.00, 9000.00, NULL),
(4, 'Nibs', true, true, '2025-03-01 08:46:49.885742-05', 0, 50000.00, 46000.00, NULL),
(5, 'Cacao en grano - Corriente', true, true, '2025-03-02 21:13:51.981607-05', 0, 32000.00, 28000.00, NULL);

--
-- TOC entry 5256 (class 0 OID 21327)
-- Dependencies: 332
-- Data for Name: TiposComprador; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."TiposComprador" ("CodTipoComprador", nombre, "registroPrecargado", activo, "itemYaUsado") VALUES
('E', 'Exportador', true, true, true),
('C', 'Comercializador', true, true, true),
('T', 'Transformador', false, true, false);

--
-- TOC entry 5166 (class 0 OID 19003)
-- Dependencies: 242
-- Data for Name: Usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."ConfiguracionClasesAlerta"
("CodClaseAlerta", "nombreClaseAlerta", "descripcionClaseAlerta", "codTipoClaseAlerta", "codCategoriaClaseAlerta", "ctdadDiasAlertasPrevias", "frecuenciaAlertasPrevias", "ctdadRepeticionesPost", "frecuenciaRepeticionesPost", "envioSimultaneoEmail", "nivelPrioridad", activa, "mensajeBaseDelDia", "mensajeBasePrevio", "mensajeBaseVencido", "asignarResponsableDirEnConfig", "nombreFuncionParaCompleAMensaje", "Id_ModuloDestino", "Id_ModuloGenerador")
VALUES
('Com_AdmUsu', 'Administración de usuarios', 'Alerta para comunicar a usuario administrador una actualización de un usuario', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado una actualizacion de un usuario:', '', '', FALSE, '', NULL, NULL),
('Com_CobPer', 'Cobro persuasivo', 'Alerta para comunicar a usuario administrador cuando un usuario interno realiza un registro de Acción de Cobro Persuasivo', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado un registro de Acción de Cobro Persuasivo:', '', '', FALSE, '', NULL, NULL),
('Com_CarSic', 'Cargue Sicex', 'Alerta para comunicar a usuario administrador cuando un usuario interno genera un cargue de los Datos del Sistema SICEX', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado un cargue sicex:', '', '', FALSE, '', NULL, NULL),
('Com_Aud', 'Auditoria', 'Alerta para comunicar a usuario administrador una descarga de los registros de auditoria', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado una descarga de los registros de auditoria:', '', '', FALSE, '', NULL, NULL),
('Com_AprAcP', 'Aprobar acuerdo de pago', 'Alerta para comunicar a usuario recaudador cuando un usuario interno aprueba un acuerdo de pago', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha aprobado un acuerdo de pago:', '', '', FALSE, '', NULL, NULL),
('Com_ConCar', 'Consulta cartera', 'Alerta para comunicar a usuario administrador cuando un usuario recaudador genera la descarga del estado de cuenta de una cuota de fomento cacaotero', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado una consulta en cartera:', '', '', FALSE, '', NULL, NULL),
('Com_ConCom', 'Consulta compra de cacao', 'Alerta para comunicar a usuario administrador cuando un usuario realiza el descargue del archivo de la factura unica nacional', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha realizado una consulta de una compra de cacao:', '', '', FALSE, '', NULL, NULL),
('Com_SolAcP', 'Solicitud Acuerdo de pago', 'Alerta para comunicar a usuario administrador cuando se realice una solicitud acuerdo de pago', 'EI', 'Com', 0, 0, 0, 0, TRUE, '1', TRUE, 'Se ha solicitado un acuerdo de pago:', '', '', FALSE, '', NULL, NULL),
('Com_IdeRec', 'Identificacion de recaudador', 'Alerta para comunicar a usuario administrador que se registro un nuevo usuario recaudador.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '2', TRUE, 'Se ha realizado la identificación de un recaudador:', '', '', FALSE, '', NULL, NULL),
('Com_RegCom', 'Registro de compras de cacao', 'Alerta para comunicar que se registro de una compra de cacao.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha realizado el registro de una compra de cacao:', '', '', FALSE, '', NULL, NULL),
('Com_LiqCoF', 'Liquidacion de cuota de fomento', 'Alerta para comunicar que se realizo la liquidacion de la cuota de fomento.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '2', TRUE, 'Se ha realizado la liquidacion de la cuota de fomento:', '', '', FALSE, '', NULL, NULL),
('Com_CarMas', 'Cargue masivo de compras de cacao', 'Alerta para comunicar que se realizo un cargue masivo de compras de cacao.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '2', FALSE, 'Se ha realizado un cargue masivo de compras de cacao:', '', '', FALSE, '', NULL, NULL),
('Ale_RegCom', 'Limite para el registro de compras de cacao', 'Alerta para recordar a usuario que debe registrar sus compras de cacao antes del dia 10.', 'FF', 'Ale', 0, 0, 0, 0, FALSE, '1', TRUE, 'Recuerde que hoy es el ultimo dia para realizar el registro de compras de cacao:', 'Recuerde que debe realizar el registro de las compras de cacao antes del 10:', '', FALSE, '', NULL, NULL),
('Com_ActPS', 'Actualización de Paz y Salvo', 'Alerta para comunicar que un recaudador ha actualizado un Paz y Salvo por cuota de fomento cacaotero.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha actualizado un Paz y Salvo:', '', '', FALSE, '', NULL, NULL),
('Com_RegRec', 'Registro de recaudador', 'Alerta para comunicar a usuario administrador que se registro un nuevo usuario recaudador.', 'EI', 'Com', 0, 0, 0, 0, TRUE, '3', TRUE, 'Se ha realizado un registro de un usuario recaudador:', '', '', FALSE, '', NULL, NULL),
('Com_ConAcP', 'Consulta Acuerdo de pago', 'Alerta para comunicar a usuario administrador cuando un usuario genera una descarga de un Acuerdo de Pagos con la Federacion', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha realizado una descarga de un acuerdo de pago:', '', '', FALSE, '', NULL, NULL),
('Com_GesAcP', 'Gestiona acuerdo de pago', 'Alerta para comunicar a usuario administrador cuando un usuario interno gestiona un acuerdo de pago', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha realizado un acuerdo de pago:', '', '', FALSE, '', NULL, NULL),
('Com_GenPS', 'Generación de Paz y Salvo', 'Alerta para comunicar que un recaudador ha generado un Paz y Salvo por cuota de fomento cacaotero.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha generado un Paz y Salvo por parte del recaudador:', '', '', FALSE, '', NULL, NULL),
('Com_ValCom', 'Validar kilos de compras de cacao', 'Alerta para comunicar que se hizo una validacion de los kilos al momento de hacer una compra de cacao.', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha validado una compra de cacao:', '', '', FALSE, '', NULL, NULL),
('Com_NotAcP', 'Notificar acuerdo de pago', 'Alerta para comunicar a usuario administrador cuando un usuario interno notifica un acuerdo de pago', 'EI', 'Com', 0, 0, 0, 0, FALSE, '1', TRUE, 'Se ha notificado un acuerdo de pago:', '', '', FALSE, '', NULL, NULL);
