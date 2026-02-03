---------------------------------------------------------------------------------------------------------------------------------------------------
-- INSERT DATA --------------------------------------------------------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------------------------------------------------------

-- Data for Name: 2FA
INSERT INTO public."2FA" ("Id2FA", "codTipo2FA", descripcion, "fechaRegistro") VALUES
(1, 'VEMAIL', 'Autenticación de dos factores por correo electrónico', '2025-02-27 07:12:00.297626-05'),
(2, 'VSMS', 'Autenticación de dos factores por SMS', '2025-02-27 07:12:00.297626-05')
ON CONFLICT ("Id2FA") DO NOTHING;

-- Data for Name: Paises
-- ... (miles de INSERTs de Paises) ...
-- Mantengo todo el bloque desde aquí en el archivo original
