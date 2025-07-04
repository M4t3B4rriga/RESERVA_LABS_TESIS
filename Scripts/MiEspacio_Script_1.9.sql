/*==============================================================*/
/* DBMS name:      MySQL 5.0                                    */
/* Created on:     18/7/2023 09:38:46                           */
/*==============================================================*/


drop table if exists T_MCPERSONA_EXTERNA;

drop table if exists T_MCPERSONA_INTERNA;

drop table if exists T_MEDIRIGENTE_ESPACIO;

drop table if exists T_MEDIRIGENTE_UNIDAD;

drop table if exists T_MEEHORARIO;

drop table if exists T_MEEQUIPO;

drop table if exists T_MEERESTRICCION;

drop table if exists T_MEESPACIO;

drop table if exists T_MEFOTO_ESPACIO;

drop table if exists T_METIPO_EQUIPO;

drop table if exists T_METIPO_ESPACIO;

drop table if exists T_MEUNIDAD;

drop table if exists T_MREQUIPO_RESERVADO;

drop table if exists T_MRREPASO;

drop table if exists T_MRRESERVA;

drop table if exists T_MRSERVICIO_ESPECIAL;

drop table if exists T_MRSERVICIO_ESPECIAL_RESERVA;

drop table if exists T_MRTIPO_EVENTO;

drop table if exists T_MSAUDITORIA;

drop table if exists T_MSFUNCIONALIDAD;

drop table if exists T_MSITEM_MENU;

drop table if exists T_MSPERMISO;

drop table if exists T_MSROL;

drop table if exists T_MSROL_USUARIO;

drop table if exists T_MSSUBITEM_MENU;

drop table if exists T_MSSUB_SUBITEM_MENU;

drop table if exists T_MSUSUARIO;

/*==============================================================*/
/* Table: T_MCPERSONA_EXTERNA                                   */
/*==============================================================*/
create table T_MCPERSONA_EXTERNA
(
   PK_TMCPERSONA_EXTERNA int not null auto_increment,
   PEE_NOMBRE           varchar(50) not null,
   PEE_APELLIDO_PATERNO varchar(35) not null,
   PEE_APELLIDO_MATERNO varchar(35) not null,
   PEE_CEDULA           varchar(13),
   PEE_EMAIL_PERSONAL   varchar(100) not null,
   PEE_ORGANIZACION     varchar(100),
   PEE_TELEFONO         varchar(15),
   ESTADO               int not null,
   primary key (PK_TMCPERSONA_EXTERNA)
);

alter table T_MCPERSONA_EXTERNA comment 'Entidad que almacena  la información de persona externa';

/*==============================================================*/
/* Table: T_MCPERSONA_INTERNA                                   */
/*==============================================================*/
create table T_MCPERSONA_INTERNA
(
   PK_TMCPERSONA_INTERNA int not null auto_increment,
   PK_TMEUNIDAD         int,
   PEI_NOMBRE           varchar(50) not null,
   PEI_APELLIDO_PATERNO varchar(50) not null,
   PEI_APELLIDO_MATERNO varchar(50) not null,
   PEI_CARNET_ID        varchar(18) not null,
   PEI_EMAIL_INSTITUCIONAL varchar(100) not null,
   PEI_EMAIL_PERSONAL   varchar(100),
   PEI_CEDULA           varchar(13),
   PEI_TELEFONO         varchar(15),
   primary key (PK_TMCPERSONA_INTERNA)
);

alter table T_MCPERSONA_INTERNA comment 'Entidad que almacena  la información de los empleados de la ';

/*==============================================================*/
/* Table: T_MEDIRIGENTE_ESPACIO                                 */
/*==============================================================*/
create table T_MEDIRIGENTE_ESPACIO
(
   PK_TMEESPACIO        int not null,
   PK_TMEDIRIGENTE_ESPACIO int not null auto_increment,
   PK_TMCPERSONA_INTERNA int not null,
   DES_FECHA_ASIGNACION datetime not null,
   DES_FECHA_RETIRO     datetime,
   ESTADO               int not null,
   primary key (PK_TMEDIRIGENTE_ESPACIO)
);

/*==============================================================*/
/* Table: T_MEDIRIGENTE_UNIDAD                                  */
/*==============================================================*/
create table T_MEDIRIGENTE_UNIDAD
(
   PK_TMEUNIDAD         int not null,
   PK_TMEDIRIGENTE_UNIDAD int not null auto_increment,
   PK_TMCPERSONA_INTERNA int not null,
   DUN_FECHA_ASIGNACION datetime not null,
   DUN_FECHA_RETIRO     datetime,
   ESTADO               int not null,
   primary key (PK_TMEDIRIGENTE_UNIDAD)
);

alter table T_MEDIRIGENTE_UNIDAD comment 'Entidad que relaciona al empleado que dirige un departamento';

/*==============================================================*/
/* Table: T_MEEHORARIO                                          */
/*==============================================================*/
create table T_MEEHORARIO
(
   PK_TMEEHORARIO       int not null auto_increment,
   PK_TMEERESTRICCION   int not null,
   HOR_DIA              int not null,
   HOR_HORA_INICIO      time not null,
   HOR_HORA_FIN         time not null,
   ESTADO               int not null,
   primary key (PK_TMEEHORARIO)
);

/*==============================================================*/
/* Table: T_MEEQUIPO                                            */
/*==============================================================*/
create table T_MEEQUIPO
(
   PK_TMEEQUIPO         int not null auto_increment,
   PK_TMEESPACIO        int not null,
   PK_TMETIPO_EQUIPO    int not null,
   EQU_NOMBRE           varchar(30) not null,
   EQU_CANTIDAD         int not null,
   EQU_ESTA_INSTALADO   int not null,
   EQU_MARCA            varchar(50),
   EQU_MODELO           varchar(50),
   ESTADO               int not null,
   primary key (PK_TMEEQUIPO)
);

/*==============================================================*/
/* Table: T_MEERESTRICCION                                      */
/*==============================================================*/
create table T_MEERESTRICCION
(
   PK_TMEERESTRICCION   int not null auto_increment,
   PK_TMEESPACIO        int not null,
   PK_TMCPERSONA_INTERNA int not null,
   RES_FECHA_CREACION   datetime not null,
   RES_FECHA_EDICION    datetime not null,
   ESTADO               int not null,
   primary key (PK_TMEERESTRICCION)
);

/*==============================================================*/
/* Table: T_MEESPACIO                                           */
/*==============================================================*/
create table T_MEESPACIO
(
   PK_TMEESPACIO        int not null auto_increment,
   PK_TMEUNIDAD         int not null,
   PK_TMCPERSONA_INTERNA int not null,
   PK_TMETIPO_ESPACIO   int not null,
   ESP_NOMBRE           varchar(50) not null,
   ESP_DESCRIPCION      varchar(300) not null,
   ESP_CAPACIDAD        int not null,
   ESP_DESCRIPCION_UBICACION varchar(150) not null,
   ESP_DISPONIBILIDAD   int not null,
   ESP_DIAS_ANTELACION  int not null,
   ESP_FECHA_CREACION   datetime not null,
   ESP_FECHA_EDICION    datetime not null,
   ESTADO               int not null,
   primary key (PK_TMEESPACIO)
);

alter table T_MEESPACIO comment 'Entidad relacionada a la gestión y almacenamiento de la info';

/*==============================================================*/
/* Table: T_MEFOTO_ESPACIO                                      */
/*==============================================================*/
create table T_MEFOTO_ESPACIO
(
   PK_TMEFOTO_ESPACIO   int not null auto_increment,
   PK_TMEESPACIO        int not null,
   FES_RUTA             varchar(150) not null,
   FES_NOMBRE           varchar(150) not null,
   FES_ORDEN            int not null,
   ESTADO               int not null,
   primary key (PK_TMEFOTO_ESPACIO)
);

/*==============================================================*/
/* Table: T_METIPO_EQUIPO                                       */
/*==============================================================*/
create table T_METIPO_EQUIPO
(
   PK_TMETIPO_EQUIPO    int not null auto_increment,
   TEQ_NOMBRE           varchar(20) not null,
   TEQ_DESCRIPCION      varchar(50),
   ESTADO               int not null,
   primary key (PK_TMETIPO_EQUIPO)
);

/*==============================================================*/
/* Table: T_METIPO_ESPACIO                                      */
/*==============================================================*/
create table T_METIPO_ESPACIO
(
   PK_TMETIPO_ESPACIO   int not null auto_increment,
   TES_NOMBRE           varchar(50) not null,
   TES_DESCRIPCION      varchar(100),
   ESTADO               int not null,
   primary key (PK_TMETIPO_ESPACIO)
);

/*==============================================================*/
/* Table: T_MEUNIDAD                                            */
/*==============================================================*/
create table T_MEUNIDAD
(
   PK_TMEUNIDAD         int not null auto_increment,
   UNI_NOMBRE           varchar(100) not null,
   UNI_SIGLAS           varchar(10) not null,
   UNI_DESCRIPCION      varchar(250),
   ESTADO               int not null,
   primary key (PK_TMEUNIDAD)
);

alter table T_MEUNIDAD comment 'Entidad  relacionada a la gestión y almacenamiento de inform';

/*==============================================================*/
/* Table: T_MREQUIPO_RESERVADO                                  */
/*==============================================================*/
create table T_MREQUIPO_RESERVADO
(
   PK_TMREQUIPO_RESERVADO int not null auto_increment,
   PK_TMRRESERVA        int not null,
   PK_TMEEQUIPO         int not null,
   ERE_FECHA_ASIGNACION datetime not null,
   ESTADO               int not null,
   primary key (PK_TMREQUIPO_RESERVADO)
);

/*==============================================================*/
/* Table: T_MRREPASO                                            */
/*==============================================================*/
create table T_MRREPASO
(
   CODRESERVA2          int not null auto_increment,
   PK_TMRRESERVA        int not null,
   REP_DIA              date not null,
   REP_HORA_INICIO      time not null,
   REP_HORA_FIN         time not null,
   ESTADO               int not null,
   primary key (CODRESERVA2)
);

/*==============================================================*/
/* Table: T_MRRESERVA                                           */
/*==============================================================*/
create table T_MRRESERVA
(
   PK_TMRRESERVA        int not null auto_increment,
   PK_TMCPERSONA_INTERNA int not null,
   PK_TMEESPACIO        int not null,
   PK_TMRTIPO_EVENTO    int,
   PK_TMCPERSONA_EXTERNA int,
   RES_FECHA_CREACION   datetime not null,
   RES_RAZON            varchar(200) not null,
   RES_ESTADO_SOLICITUD int not null,
   RES_ES_PERSONA_EXT   int not null,
   RES_EVENTO_ACADEMICO int not null,
   RES_DIA              date not null,
   RES_HORA_INICIO      time not null,
   RES_HORA_FIN         time not null,
   ESTADO               int not null,
   primary key (PK_TMRRESERVA)
);

/*==============================================================*/
/* Table: T_MRSERVICIO_ESPECIAL                                 */
/*==============================================================*/
create table T_MRSERVICIO_ESPECIAL
(
   PK_TMRSERVICIO_ESPECIAL int not null auto_increment,
   PK_TMEUNIDAD         int not null,
   SES_NOMBRE           varchar(30) not null,
   SES_DESCRIPCION      varchar(50) not null,
   ESTADO               int not null,
   primary key (PK_TMRSERVICIO_ESPECIAL)
);

/*==============================================================*/
/* Table: T_MRSERVICIO_ESPECIAL_RESERVA                         */
/*==============================================================*/
create table T_MRSERVICIO_ESPECIAL_RESERVA
(
   PK_TMRSERVICIO_ESPECIAL_RESERVA int not null auto_increment,
   PK_TMRRESERVA        int not null,
   PK_TMRSERVICIO_ESPECIAL int not null,
   SER_FECHA_ASIGNACION datetime not null,
   ESTADO               int not null,
   primary key (PK_TMRSERVICIO_ESPECIAL_RESERVA)
);

/*==============================================================*/
/* Table: T_MRTIPO_EVENTO                                       */
/*==============================================================*/
create table T_MRTIPO_EVENTO
(
   PK_TMRTIPO_EVENTO    int not null auto_increment,
   TEV_NOMBRE           varchar(50) not null,
   TEV_DESCRIPCION      varchar(100) not null,
   ESTADO               int not null,
   primary key (PK_TMRTIPO_EVENTO)
);

/*==============================================================*/
/* Table: T_MSAUDITORIA                                         */
/*==============================================================*/
create table T_MSAUDITORIA
(
   PK_TMSAUDITORIA      int not null auto_increment,
   XEUSU_CODIGO         int not null,
   AUD_FECHA            date not null,
   AUD_HORA             time not null,
   AUD_IP_USUARIO       varchar(50),
   AUD_DESCRIPCION_ACTIV varchar(100) not null,
   AUD_RESULTADO_ACTIV  varchar(100),
   AUD_NAVEGADOR        varchar(100),
   AUD_DISPOSITIVO      varchar(100),
   ESTADO               int not null,
   primary key (PK_TMSAUDITORIA)
);

/*==============================================================*/
/* Table: T_MSFUNCIONALIDAD                                     */
/*==============================================================*/
create table T_MSFUNCIONALIDAD
(
   PK_TMSFUNCIONALIDAD  int not null auto_increment,
   FUN_NOMBRE           varchar(100) not null,
   FUN_DESCRIPCION      varchar(150),
   ESTADO               int not null,
   primary key (PK_TMSFUNCIONALIDAD)
);

/*==============================================================*/
/* Table: T_MSITEM_MENU                                         */
/*==============================================================*/
create table T_MSITEM_MENU
(
   PK_TMS_ITEM_MENU     int not null auto_increment,
   IME_NOMBRE           varchar(50) not null,
   IME_URL              varchar(200) not null,
   IME_POSICION         int not null,
   IME_ICONO            varchar(25),
   ESTADO               int not null,
   primary key (PK_TMS_ITEM_MENU)
);

/*==============================================================*/
/* Table: T_MSPERMISO                                           */
/*==============================================================*/
create table T_MSPERMISO
(
   PK_TMSPERMISO        int not null auto_increment,
   PK_TMSROL            int not null,
   PK_TMS_ITEM_MENU     int,
   PK_TMSSUBITEM_MENU   int,
   PK_TMSSUB_SUBITEM_MENU int,
   PK_TMSFUNCIONALIDAD  int,
   PER_FECHA_ASIGNACION datetime not null,
   ESTADO               int not null,
   primary key (PK_TMSPERMISO)
);

/*==============================================================*/
/* Table: T_MSROL                                               */
/*==============================================================*/
create table T_MSROL
(
   PK_TMSROL            int not null auto_increment,
   ROL_NOMBRE           varchar(20) not null,
   ROL_DESCRIPCION      varchar(50) not null,
   ESTADO               int not null,
   primary key (PK_TMSROL)
);

alter table T_MSROL comment 'Rol del usuario';

/*==============================================================*/
/* Table: T_MSROL_USUARIO                                       */
/*==============================================================*/
create table T_MSROL_USUARIO
(
   PK_TMSROL_USUARIO    int not null auto_increment,
   PK_TMSROL            int not null,
   XEUSU_CODIGO         int not null,
   RUS_FECHA_ASIGNACION datetime not null,
   ESTADO               int not null,
   primary key (PK_TMSROL_USUARIO)
);

/*==============================================================*/
/* Table: T_MSSUBITEM_MENU                                      */
/*==============================================================*/
create table T_MSSUBITEM_MENU
(
   PK_TMSSUBITEM_MENU   int not null auto_increment,
   PK_TMS_ITEM_MENU     int not null,
   SME_NOMBRE           varchar(50) not null,
   SME_URL              varchar(200) not null,
   SME_POSICION         int not null,
   SME_ICON             varchar(25),
   ESTADO               int not null,
   primary key (PK_TMSSUBITEM_MENU)
);

/*==============================================================*/
/* Table: T_MSSUB_SUBITEM_MENU                                  */
/*==============================================================*/
create table T_MSSUB_SUBITEM_MENU
(
   PK_TMSSUB_SUBITEM_MENU int not null auto_increment,
   PK_TMSSUBITEM_MENU   int not null,
   SSM_NOMBRE           varchar(50) not null,
   SSM_URL              varchar(200) not null,
   SSM_POSICION         int not null,
   ESTADO               int not null,
   primary key (PK_TMSSUB_SUBITEM_MENU)
);

/*==============================================================*/
/* Table: T_MSUSUARIO                                           */
/*==============================================================*/
create table T_MSUSUARIO
(
   XEUSU_CODIGO         int not null auto_increment,
   PK_TMCPERSONA_INTERNA int not null,
   USU_NOMBRE           varchar(30) not null,
   XEUSU_PASWD          varchar(256) not null,
   primary key (XEUSU_CODIGO)
);

alter table T_MSUSUARIO comment 'Entidad relacionada para gentionar los usuario que ingrsan a';

alter table T_MCPERSONA_INTERNA add constraint FK_UNIDAD_MECPEI foreign key (PK_TMEUNIDAD)
      references T_MEUNIDAD (PK_TMEUNIDAD) on delete restrict on update restrict;

alter table T_MEDIRIGENTE_ESPACIO add constraint FK_DIRIGE_ESPACIO foreign key (PK_TMEESPACIO)
      references T_MEESPACIO (PK_TMEESPACIO) on delete restrict on update restrict;

alter table T_MEDIRIGENTE_ESPACIO add constraint FK_PERSONAINTERNA_DIRIGE foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

alter table T_MEDIRIGENTE_UNIDAD add constraint FK_MECPEI_DIRIG_UNIDAD foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

alter table T_MEDIRIGENTE_UNIDAD add constraint FK_UNIDAD_DIRIG foreign key (PK_TMEUNIDAD)
      references T_MEUNIDAD (PK_TMEUNIDAD) on delete restrict on update restrict;

alter table T_MEEHORARIO add constraint FK_RESTRICCION_HORARIO foreign key (PK_TMEERESTRICCION)
      references T_MEERESTRICCION (PK_TMEERESTRICCION) on delete restrict on update restrict;

alter table T_MEEQUIPO add constraint FK_ESPACIO_ELEMENTO foreign key (PK_TMEESPACIO)
      references T_MEESPACIO (PK_TMEESPACIO) on delete restrict on update restrict;

alter table T_MEEQUIPO add constraint FK_TIPO_ELEMENTO foreign key (PK_TMETIPO_EQUIPO)
      references T_METIPO_EQUIPO (PK_TMETIPO_EQUIPO) on delete restrict on update restrict;

alter table T_MEERESTRICCION add constraint FK_ESPACIO_RESTRICCION foreign key (PK_TMEESPACIO)
      references T_MEESPACIO (PK_TMEESPACIO) on delete restrict on update restrict;

alter table T_MEERESTRICCION add constraint FK_PERSONAINTERNA_RESTRICCION foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

alter table T_MEESPACIO add constraint FK_PERSONAINTERNA_ESPACIO foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

alter table T_MEESPACIO add constraint FK_TIPOESPACIO_ESPACIO foreign key (PK_TMETIPO_ESPACIO)
      references T_METIPO_ESPACIO (PK_TMETIPO_ESPACIO) on delete restrict on update restrict;

alter table T_MEESPACIO add constraint FK_UNIDAD_ESPACIO foreign key (PK_TMEUNIDAD)
      references T_MEUNIDAD (PK_TMEUNIDAD) on delete restrict on update restrict;

alter table T_MEFOTO_ESPACIO add constraint FK_ESPACIO_FOTO foreign key (PK_TMEESPACIO)
      references T_MEESPACIO (PK_TMEESPACIO) on delete restrict on update restrict;

alter table T_MREQUIPO_RESERVADO add constraint FK_ELEMENTO_ELEMENTO foreign key (PK_TMEEQUIPO)
      references T_MEEQUIPO (PK_TMEEQUIPO) on delete restrict on update restrict;

alter table T_MREQUIPO_RESERVADO add constraint FK_RESERVA_ELEMENTO foreign key (PK_TMRRESERVA)
      references T_MRRESERVA (PK_TMRRESERVA) on delete restrict on update restrict;

alter table T_MRREPASO add constraint FK_REPASO_RESERVA foreign key (PK_TMRRESERVA)
      references T_MRRESERVA (PK_TMRRESERVA) on delete restrict on update restrict;

alter table T_MRRESERVA add constraint FK_ESPACIO_RESERVA foreign key (PK_TMEESPACIO)
      references T_MEESPACIO (PK_TMEESPACIO) on delete restrict on update restrict;

alter table T_MRRESERVA add constraint FK_REALIZA foreign key (PK_TMCPERSONA_EXTERNA)
      references T_MCPERSONA_EXTERNA (PK_TMCPERSONA_EXTERNA) on delete restrict on update restrict;

alter table T_MRRESERVA add constraint FK_SOLICITA foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

alter table T_MRRESERVA add constraint FK_TIPO_EVENTO_RESERVA foreign key (PK_TMRTIPO_EVENTO)
      references T_MRTIPO_EVENTO (PK_TMRTIPO_EVENTO) on delete restrict on update restrict;

alter table T_MRSERVICIO_ESPECIAL add constraint FK_UNIDAD_SERVICIOS_ESPECIALES foreign key (PK_TMEUNIDAD)
      references T_MEUNIDAD (PK_TMEUNIDAD) on delete restrict on update restrict;

alter table T_MRSERVICIO_ESPECIAL_RESERVA add constraint FK_RESERVA_SERVICIOS foreign key (PK_TMRRESERVA)
      references T_MRRESERVA (PK_TMRRESERVA) on delete restrict on update restrict;

alter table T_MRSERVICIO_ESPECIAL_RESERVA add constraint FK_SERVICIOS_SERVICIOS foreign key (PK_TMRSERVICIO_ESPECIAL)
      references T_MRSERVICIO_ESPECIAL (PK_TMRSERVICIO_ESPECIAL) on delete restrict on update restrict;

alter table T_MSAUDITORIA add constraint FK_USUARIO_AUDITORIA foreign key (XEUSU_CODIGO)
      references T_MSUSUARIO (XEUSU_CODIGO) on delete restrict on update restrict;

alter table T_MSPERMISO add constraint FK_FUNCIONALIDADES_PERMISOS foreign key (PK_TMSFUNCIONALIDAD)
      references T_MSFUNCIONALIDAD (PK_TMSFUNCIONALIDAD) on delete restrict on update restrict;

alter table T_MSPERMISO add constraint FK_ITEM_MENU_PERMISOS foreign key (PK_TMS_ITEM_MENU)
      references T_MSITEM_MENU (PK_TMS_ITEM_MENU) on delete restrict on update restrict;

alter table T_MSPERMISO add constraint FK_ROLES_PERMISOS foreign key (PK_TMSROL)
      references T_MSROL (PK_TMSROL) on delete restrict on update restrict;

alter table T_MSPERMISO add constraint FK_SUBITEM_PERMISOS foreign key (PK_TMSSUBITEM_MENU)
      references T_MSSUBITEM_MENU (PK_TMSSUBITEM_MENU) on delete restrict on update restrict;

alter table T_MSPERMISO add constraint FK_SUBSUBITEM foreign key (PK_TMSSUB_SUBITEM_MENU)
      references T_MSSUB_SUBITEM_MENU (PK_TMSSUB_SUBITEM_MENU) on delete restrict on update restrict;

alter table T_MSROL_USUARIO add constraint FK_ROLES_USUARIOS foreign key (PK_TMSROL)
      references T_MSROL (PK_TMSROL) on delete restrict on update restrict;

alter table T_MSROL_USUARIO add constraint FK_USUARIO_ROL foreign key (XEUSU_CODIGO)
      references T_MSUSUARIO (XEUSU_CODIGO) on delete restrict on update restrict;

alter table T_MSSUBITEM_MENU add constraint FK_MENU_ITEM foreign key (PK_TMS_ITEM_MENU)
      references T_MSITEM_MENU (PK_TMS_ITEM_MENU) on delete restrict on update restrict;

alter table T_MSSUB_SUBITEM_MENU add constraint FK_ITEM_SUBITEM foreign key (PK_TMSSUBITEM_MENU)
      references T_MSSUBITEM_MENU (PK_TMSSUBITEM_MENU) on delete restrict on update restrict;

alter table T_MSUSUARIO add constraint FK_PERSONA_INTERNA_USUARIO foreign key (PK_TMCPERSONA_INTERNA)
      references T_MCPERSONA_INTERNA (PK_TMCPERSONA_INTERNA) on delete restrict on update restrict;

