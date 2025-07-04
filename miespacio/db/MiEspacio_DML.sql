INSERT INTO T_MSROL (ROL_NOMBRE, ROL_DESCRIPCION, ESTADO)
VALUES
    ('Usuario', 'Rol para usuarios estándar', 1),
    ('Administrador', 'Rol para administradores', 1),
    ('Admin Root', 'Rol para el administrador raíz', 1);

-- Insertar personas internas
INSERT INTO T_MCPERSONA_INTERNA (PK_TMEUNIDAD, PEI_NOMBRE, PEI_APELLIDO_PATERNO, PEI_APELLIDO_MATERNO, PEI_CARNET_ID, PEI_EMAIL_INSTITUCIONAL, PEI_EMAIL_PERSONAL, PEI_CEDULA, PEI_TELEFONO)
VALUES
    (NULL, 'Christian Paul', 'Novoa', 'Chico', 'L00387442', 'cpnovoa@espe.edu.ec', '', '1725793390', '0995210841');

-- Insertar usuarios
INSERT INTO T_MSUSUARIO (PK_TMCPERSONA_INTERNA, USU_NOMBRE, XEUSU_PASWD)
VALUES
    (1, 'cpnovoa', 'Contraseña123');

-- Insertar asignaciones de rol para los usuarios
INSERT INTO T_MSROL_USUARIO (PK_TMSROL, XEUSU_CODIGO, RUS_FECHA_ASIGNACION, ESTADO)
VALUES
    (3, 1, NOW(), 1);

INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Inicio', '/', 1, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Espacios', '/espacios', 2, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Reservas', '/reservas', 3, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Equipos', '/equipo', 4, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Roles', '/roles', 5, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Unidades', '/unidad', 6, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Servicios Especiales', '/servicioEspecial', 7, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Usuarios', '/usuarios', 8, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Gestionar Items', '/item', 9, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Gestionar Permisos', '/permisos', 10, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Gestionar Funcionalidades', '/funcionalidades', 11, '', 1);
INSERT INTO T_MSITEM_MENU (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES ('Auditoria', '/auditoria', 12, '', 1);

	INSERT INTO T_MSSUBITEM_MENU (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (8, 'Asignar Roles', '/asignar-rol', 2, '', 1);
	INSERT INTO T_MSSUBITEM_MENU (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (8, 'Asignar Unidades', '/asignar-unidad', 3, '', 1);
	INSERT INTO T_MSSUBITEM_MENU (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (3, 'Tipo de Evento', '/tipoEvento', 4, '', 1);
	INSERT INTO T_MSSUBITEM_MENU (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (4, 'Tipo de Equipo', '/tipoEquipo', 5, '', 1);
	INSERT INTO T_MSSUBITEM_MENU (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (2, 'Tipos de Espacio', '/tipoEspacio', 6, '', 1);

-- Insertar permisos para los ítems y funcionalidades asociadas al rol "Admin Root"
INSERT INTO T_MSPERMISO (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PK_TMSFUNCIONALIDAD, PER_FECHA_ASIGNACION, ESTADO)
VALUES
    (3, 1, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Inicio'
    (3, 2, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Espacios'
    (3, 3, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Reservas'
    (3, 4, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Equipos'
    (3, 5, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Roles'
    (3, 6, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Unidades'
    (3, 7, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Servicios Especiales'
    (3, 8, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Usuarios'
    (3, 9, NULL, NULL, NULL, NOW(), 1),  -- Permiso para ítem 'Gestionar Items'
    (3, 10, NULL, NULL, NULL, NOW(), 1), -- Permiso para ítem 'Gestionar Permisos'
    (3, 11, NULL, NULL, NULL, NOW(), 1), -- Permiso para ítem 'Gestionar Funcionalidades'
    (3, 12, NULL, NULL, NULL, NOW(), 1); -- Permiso para ítem 'Auditoria'

-- Insertar permisos para los subítems asociados a los ítems existentes
INSERT INTO T_MSPERMISO (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PK_TMSFUNCIONALIDAD, PER_FECHA_ASIGNACION, ESTADO)
VALUES
    (3, NULL, 1, NULL, NULL, NOW(), 1), -- Permiso para subítem 'Asignar Roles' del ítem 8
    (3, NULL, 2, NULL, NULL, NOW(), 1), -- Permiso para subítem 'Asignar Unidades' del ítem 8
    (3, NULL, 3, NULL, NULL, NOW(), 1), -- Permiso para subítem 'Tipo de Evento' del ítem 3
    (3, NULL, 4, NULL, NULL, NOW(), 1), -- Permiso para subítem 'Tipo de Equipo' del ítem 4
    (3, NULL, 5, NULL, NULL, NOW(), 1); -- Permiso para subítem 'Tipos de Espacio' del ítem 2

