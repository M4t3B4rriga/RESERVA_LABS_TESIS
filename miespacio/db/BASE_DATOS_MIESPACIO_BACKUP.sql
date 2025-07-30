-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: localhost    Database: swmiespacio
-- ------------------------------------------------------
-- Server version	8.0.34

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `t_cambio_password_solicitud`
--

DROP TABLE IF EXISTS `t_cambio_password_solicitud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_cambio_password_solicitud` (
  `PK_CAMBIO_PASSWORD_SOLICITUD` int NOT NULL AUTO_INCREMENT,
  `XEUSU_CODIGO` int NOT NULL,
  `USU_NOMBRE` varchar(30) NOT NULL,
  `PEI_EMAIL_INSTITUCIONAL` varchar(100) NOT NULL,
  `PEI_NOMBRE` varchar(50) NOT NULL,
  `PEI_APELLIDO_PATERNO` varchar(50) NOT NULL,
  `JUSTIFICACION` text NOT NULL,
  `ESTADO` enum('Pendiente','Aceptado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `FECHA_SOLICITUD` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `FECHA_RESPUESTA` datetime DEFAULT NULL,
  `COMENTARIO_ADMIN` text,
  `ADMIN_PROCESADOR` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`PK_CAMBIO_PASSWORD_SOLICITUD`),
  KEY `IDX_CAMBIO_PASSWORD_ESTADO` (`ESTADO`),
  KEY `IDX_CAMBIO_PASSWORD_FECHA` (`FECHA_SOLICITUD`),
  KEY `IDX_CAMBIO_PASSWORD_USUARIO` (`XEUSU_CODIGO`),
  CONSTRAINT `FK_CAMBIO_PASSWORD_USUARIO` FOREIGN KEY (`XEUSU_CODIGO`) REFERENCES `t_msusuario` (`XEUSU_CODIGO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tabla para gestionar solicitudes de cambio de contraseña';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_cambio_password_solicitud`
--

LOCK TABLES `t_cambio_password_solicitud` WRITE;
/*!40000 ALTER TABLE `t_cambio_password_solicitud` DISABLE KEYS */;
INSERT INTO `t_cambio_password_solicitud` VALUES (1,1,'cpnovoa','cpnovoa@espe.edu.ec','CHRISTIAN PAUL','NOVOA','Prueba del sistema','Aceptado','2025-07-27 15:23:34','2025-07-28 11:48:07',NULL,'gabarriga'),(2,22,'satorres','satorres@espe.edu.ec','Sofia','Torres','Prueba del sistema','Aceptado','2025-07-27 15:30:14','2025-07-28 11:31:22','aprovado','gabarriga'),(3,17,'klmacas','klmacas@kespe.edu.ec','Karol','MACAS','Prueba del sistema','Aceptado','2025-07-27 15:32:11','2025-07-28 11:42:33',NULL,'gabarriga'),(4,23,'mateobarriga','mateobarriga02182002@gmail.com','mateo','barriga','Prueba del sistema','Aceptado','2025-07-27 15:34:41','2025-07-27 15:35:03','prueba de envio ','gabarriga'),(5,23,'mateobarriga','mateobarriga02182002@gmail.com','mateo','barriga','Prueba del sistema','Aceptado','2025-07-27 15:49:34','2025-07-27 15:50:04','prueba2','gabarriga'),(6,23,'mateobarriga','mateobarriga02182002@gmail.com','mateo','barriga','hola xd 123123','Pendiente','2025-07-27 22:58:02',NULL,NULL,NULL),(7,26,'kaiser','lfcueva1@espe.COM','nando','cueva','me gilie y me olvide','Aceptado','2025-07-28 13:25:55','2025-07-28 13:26:21',NULL,'cpnovoa');
/*!40000 ALTER TABLE `t_cambio_password_solicitud` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mcpersona_externa`
--

DROP TABLE IF EXISTS `t_mcpersona_externa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mcpersona_externa` (
  `PK_TMCPERSONA_EXTERNA` int NOT NULL AUTO_INCREMENT,
  `PEE_NOMBRE` varchar(50) NOT NULL,
  `PEE_APELLIDO_PATERNO` varchar(35) NOT NULL,
  `PEE_APELLIDO_MATERNO` varchar(35) NOT NULL,
  `PEE_CEDULA` varchar(13) DEFAULT NULL,
  `PEE_EMAIL_PERSONAL` varchar(100) NOT NULL,
  `PEE_ORGANIZACION` varchar(100) DEFAULT NULL,
  `PEE_TELEFONO` varchar(15) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMCPERSONA_EXTERNA`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad que almacena  la información de persona externa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mcpersona_externa`
--

LOCK TABLES `t_mcpersona_externa` WRITE;
/*!40000 ALTER TABLE `t_mcpersona_externa` DISABLE KEYS */;
/*!40000 ALTER TABLE `t_mcpersona_externa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mcpersona_interna`
--

DROP TABLE IF EXISTS `t_mcpersona_interna`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mcpersona_interna` (
  `PK_TMCPERSONA_INTERNA` int NOT NULL AUTO_INCREMENT,
  `PK_TMEUNIDAD` int DEFAULT NULL,
  `PEI_NOMBRE` varchar(50) NOT NULL,
  `PEI_APELLIDO_PATERNO` varchar(50) NOT NULL,
  `PEI_APELLIDO_MATERNO` varchar(50) NOT NULL,
  `PEI_CARNET_ID` varchar(18) NOT NULL,
  `PEI_EMAIL_INSTITUCIONAL` varchar(100) NOT NULL,
  `PEI_EMAIL_PERSONAL` varchar(100) DEFAULT NULL,
  `PEI_CEDULA` varchar(13) DEFAULT NULL,
  `PEI_TELEFONO` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`PK_TMCPERSONA_INTERNA`),
  KEY `FK_UNIDAD_MECPEI` (`PK_TMEUNIDAD`),
  CONSTRAINT `FK_UNIDAD_MECPEI` FOREIGN KEY (`PK_TMEUNIDAD`) REFERENCES `t_meunidad` (`PK_TMEUNIDAD`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad que almacena  la información de los empleados de la ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mcpersona_interna`
--

LOCK TABLES `t_mcpersona_interna` WRITE;
/*!40000 ALTER TABLE `t_mcpersona_interna` DISABLE KEYS */;
INSERT INTO `t_mcpersona_interna` VALUES (1,NULL,'CHRISTIAN PAUL','NOVOA','CHICO','L00387442','cpnovoa@espe.edu.ec','','1725793390','0995210841'),(2,NULL,'Christian Paul','Novoa','Chico','L00387442','cpnovoa@espe.edu.ec','','1725793390','0995210841'),(3,1,'Mateo','BARRIGA','LLUMIQUINGA','L00400410','msbarriga@espe.edu.ec','','1726187683','0996085369'),(4,2,'Admin','Sistema','Principal','ADMIN001','admin@institucion.com','admin@gmail.com','1234567890','0999999999'),(5,NULL,'DIEGO IVAN','PADILLA','RODRIGUEZ','L00387433','dipadilla@espe.edu.ec',NULL,NULL,NULL),(6,NULL,'LEONARDO SEBASTIAN','SANDOVAL','VIZUETE','L00400455','lssandoval@espe.edu.ec',NULL,'1726939026',NULL),(7,NULL,'HAMILTON','PEREZ','ZAMBRANO','L00400191','hdperez@espe.edu.ec',NULL,'1311462780',NULL),(8,NULL,'DALTON','AREVALO','BASANTES','L00394155','djarevalo3@espe.edu.ec',NULL,'1724591902',NULL),(9,NULL,'MARTIN','MEDINA','ARMIJOS','L00400414','mamedina13@espe.edu.ec',NULL,'1726252453',NULL),(10,NULL,'BRYAN','YAGUARSHUNGO','AVENDAÑO','L00394173','bdyaguarshungo@espe.edu.ec',NULL,'1725186702',NULL),(11,NULL,'ANGEL','CASTILLO','CHALAN','L00384424','agcastillo2@espe.edu.ec',NULL,'1722046412',NULL),(12,NULL,'WILSON','TOAPANTA','FARINANGO','L00387527','wdtoapanta3@espe.edu.ec',NULL,'1727294363',NULL),(13,NULL,'ERICK','SANTAMARIA','CUZCO','L00384786','ejsantamaria1@espe.edu.ec',NULL,'1754993143',NULL),(14,NULL,'ERICK','MORALES','ANDINO','L00387410','ermorales5@espe.edu.ec',NULL,'1725156218',NULL),(15,NULL,'Steeven','Vargas','Andrango','L00387313','savargas4@espe.edu.ec',NULL,'1722222222',NULL),(16,NULL,'Kenneth','Andrade','Andrde','L00387676','koandrade@espe.edu.ec',NULL,'1752602209',NULL),(17,1,'Karol','MACAS','VEGA','L00412247','klmacas@kespe.edu.ec',NULL,'1751865542','0983719999'),(18,NULL,'Juan','Pérez','Gómez','L12345678','juan.perez@espe.edu.ec',NULL,NULL,NULL),(21,NULL,'Juan','Alvez','Perez','12345678','jualvez@espe.edu.ec',NULL,'1234567890','0987654321'),(23,NULL,'Gabriel','Barriga','Llumiquinga','L00410234','agbarriga@espe.edu.ec',NULL,'1726345274','0996253745'),(24,NULL,'Gabriel','Barriga','Llumiquinga','L00410237','agbarriga4@espe.edu.ec',NULL,'1726345274','0996253745'),(25,NULL,'Prueba','Tester','User','L00410221','testuser@espe.edu.ec',NULL,'1726345345','0996253635'),(26,NULL,'Sofia','Torres','Torres','L00400321','satorres@espe.edu.ec',NULL,'1736354673','0997646537'),(27,NULL,'mateo','barriga','Llumiquinga','L00437462','mateobarriga02182002@gmail.com',NULL,'17265436784','0996845637'),(28,NULL,'tester','tester','tester','L00543234','tester@gmail.com',NULL,'1763452764','0997256743'),(29,NULL,'Matias','Padrón','Aguilar','L00412131','mspadron@espe.edu.ec',NULL,'1727299297','0995328992'),(30,NULL,'nando','cueva','flores','L00394342','lfcueva1@espe.COM',NULL,'1751486951','0997407941'),(31,NULL,'Joseph','Medina','Sánchez','L00410239','jbmedina3@espe.edu.ec',NULL,'1751774793','0963514785'),(32,NULL,'James','Mena','Perez','L00418765','jsmena5@espe.edu.ec',NULL,'1752784460','0986759875'),(34,NULL,'David','Galarza','Garcia','L00068919','degalarza2@espe.edu.ec',NULL,'1721009692','0969056532'),(45,NULL,'docente','docente','docente','L00423416','docente@espe.edu.ec',NULL,'1726187650','0996845612'),(46,NULL,'estudiante','estudiante','estudiante','L00410654','estudiante@espe.edu.ec',NULL,'1726345987','0996253654'),(47,NULL,'docente','docente','docente','L00410327','docente2@espe.edu.ec',NULL,'1726345654','0996845921'),(48,NULL,'Admin','Root','Sistema','A00000001','admin.root@espe.edu.ec','admin.root@gmail.com','1234567890','0999999999'),(49,NULL,'test6','test6','test6','L00400736','test6@espe.edu.ec',NULL,'1726187600','0996253640');
/*!40000 ALTER TABLE `t_mcpersona_interna` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_medirigente_espacio`
--

DROP TABLE IF EXISTS `t_medirigente_espacio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_medirigente_espacio` (
  `PK_TMEESPACIO` int NOT NULL,
  `PK_TMEDIRIGENTE_ESPACIO` int NOT NULL AUTO_INCREMENT,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `DES_FECHA_ASIGNACION` datetime NOT NULL,
  `DES_FECHA_RETIRO` datetime DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEDIRIGENTE_ESPACIO`),
  KEY `FK_DIRIGE_ESPACIO` (`PK_TMEESPACIO`),
  KEY `FK_PERSONAINTERNA_DIRIGE` (`PK_TMCPERSONA_INTERNA`),
  CONSTRAINT `FK_DIRIGE_ESPACIO` FOREIGN KEY (`PK_TMEESPACIO`) REFERENCES `t_meespacio` (`PK_TMEESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_PERSONAINTERNA_DIRIGE` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_medirigente_espacio`
--

LOCK TABLES `t_medirigente_espacio` WRITE;
/*!40000 ALTER TABLE `t_medirigente_espacio` DISABLE KEYS */;
INSERT INTO `t_medirigente_espacio` VALUES (1,1,1,'2025-06-14 15:32:46',NULL,1),(2,2,1,'2025-06-15 12:11:18',NULL,1),(3,3,1,'2025-06-16 10:13:28','2025-06-16 00:00:00',0),(3,4,1,'2025-06-16 10:20:29',NULL,1),(4,5,1,'2025-06-18 09:40:54',NULL,1),(5,6,1,'2025-06-18 10:10:48',NULL,1);
/*!40000 ALTER TABLE `t_medirigente_espacio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_medirigente_unidad`
--

DROP TABLE IF EXISTS `t_medirigente_unidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_medirigente_unidad` (
  `PK_TMEUNIDAD` int NOT NULL,
  `PK_TMEDIRIGENTE_UNIDAD` int NOT NULL AUTO_INCREMENT,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `DUN_FECHA_ASIGNACION` datetime NOT NULL,
  `DUN_FECHA_RETIRO` datetime DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEDIRIGENTE_UNIDAD`),
  KEY `FK_MECPEI_DIRIG_UNIDAD` (`PK_TMCPERSONA_INTERNA`),
  KEY `FK_UNIDAD_DIRIG` (`PK_TMEUNIDAD`),
  CONSTRAINT `FK_MECPEI_DIRIG_UNIDAD` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_UNIDAD_DIRIG` FOREIGN KEY (`PK_TMEUNIDAD`) REFERENCES `t_meunidad` (`PK_TMEUNIDAD`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad que relaciona al empleado que dirige un departamento';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_medirigente_unidad`
--

LOCK TABLES `t_medirigente_unidad` WRITE;
/*!40000 ALTER TABLE `t_medirigente_unidad` DISABLE KEYS */;
INSERT INTO `t_medirigente_unidad` VALUES (1,1,3,'2025-05-16 16:30:15','2025-06-14 15:41:51',0),(1,2,3,'2025-06-14 15:41:51',NULL,1);
/*!40000 ALTER TABLE `t_medirigente_unidad` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_meehorario`
--

DROP TABLE IF EXISTS `t_meehorario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_meehorario` (
  `PK_TMEEHORARIO` int NOT NULL AUTO_INCREMENT,
  `PK_TMEERESTRICCION` int NOT NULL,
  `HOR_DIA` int NOT NULL,
  `HOR_HORA_INICIO` time NOT NULL,
  `HOR_HORA_FIN` time NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEEHORARIO`),
  KEY `FK_RESTRICCION_HORARIO` (`PK_TMEERESTRICCION`),
  CONSTRAINT `FK_RESTRICCION_HORARIO` FOREIGN KEY (`PK_TMEERESTRICCION`) REFERENCES `t_meerestriccion` (`PK_TMEERESTRICCION`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_meehorario`
--

LOCK TABLES `t_meehorario` WRITE;
/*!40000 ALTER TABLE `t_meehorario` DISABLE KEYS */;
INSERT INTO `t_meehorario` VALUES (13,2,1,'11:00:00','17:00:00',1),(14,3,1,'13:00:00','15:00:00',1),(16,3,3,'13:00:00','15:00:00',1),(17,3,4,'11:00:00','15:00:00',1),(21,1,0,'13:00:00','17:00:00',1),(22,1,1,'09:00:00','11:00:00',1),(23,1,2,'13:00:00','17:00:00',1),(26,1,3,'09:00:00','11:00:00',1),(27,1,4,'13:00:00','17:00:00',1),(28,4,1,'08:30:00','10:00:00',1);
/*!40000 ALTER TABLE `t_meehorario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_meequipo`
--

DROP TABLE IF EXISTS `t_meequipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_meequipo` (
  `PK_TMEEQUIPO` int NOT NULL AUTO_INCREMENT,
  `PK_TMEESPACIO` int NOT NULL,
  `PK_TMETIPO_EQUIPO` int NOT NULL,
  `EQU_NOMBRE` varchar(30) NOT NULL,
  `EQU_CANTIDAD` int NOT NULL,
  `EQU_ESTA_INSTALADO` int NOT NULL,
  `EQU_MARCA` varchar(50) DEFAULT NULL,
  `EQU_MODELO` varchar(50) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEEQUIPO`),
  KEY `FK_ESPACIO_ELEMENTO` (`PK_TMEESPACIO`),
  KEY `FK_TIPO_ELEMENTO` (`PK_TMETIPO_EQUIPO`),
  CONSTRAINT `FK_ESPACIO_ELEMENTO` FOREIGN KEY (`PK_TMEESPACIO`) REFERENCES `t_meespacio` (`PK_TMEESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_TIPO_ELEMENTO` FOREIGN KEY (`PK_TMETIPO_EQUIPO`) REFERENCES `t_metipo_equipo` (`PK_TMETIPO_EQUIPO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_meequipo`
--

LOCK TABLES `t_meequipo` WRITE;
/*!40000 ALTER TABLE `t_meequipo` DISABLE KEYS */;
INSERT INTO `t_meequipo` VALUES (1,1,1,'Monitor',33,1,'DELL','Monitor',0),(2,2,1,'Proyector',1,1,'DELL','123',0),(3,3,2,'Proyector',1,1,'DELL','1233',0),(4,2,1,'Proyector',4,0,'DELL','DEL',0),(5,1,5,'Computadora de estudiante',25,1,'DELL','1233',1),(6,1,6,'Proyector de aula',1,1,'DELL','1223v',1),(7,1,7,'Pizarrón grande ',1,1,' Ai-Pika','matel124',1);
/*!40000 ALTER TABLE `t_meequipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_meerestriccion`
--

DROP TABLE IF EXISTS `t_meerestriccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_meerestriccion` (
  `PK_TMEERESTRICCION` int NOT NULL AUTO_INCREMENT,
  `PK_TMEESPACIO` int NOT NULL,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `RES_FECHA_CREACION` datetime NOT NULL,
  `RES_FECHA_EDICION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEERESTRICCION`),
  KEY `FK_ESPACIO_RESTRICCION` (`PK_TMEESPACIO`),
  KEY `FK_PERSONAINTERNA_RESTRICCION` (`PK_TMCPERSONA_INTERNA`),
  CONSTRAINT `FK_ESPACIO_RESTRICCION` FOREIGN KEY (`PK_TMEESPACIO`) REFERENCES `t_meespacio` (`PK_TMEESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_PERSONAINTERNA_RESTRICCION` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_meerestriccion`
--

LOCK TABLES `t_meerestriccion` WRITE;
/*!40000 ALTER TABLE `t_meerestriccion` DISABLE KEYS */;
INSERT INTO `t_meerestriccion` VALUES (1,1,1,'2025-06-14 15:33:33','2025-06-14 15:33:33',1),(2,2,1,'2025-06-15 12:11:48','2025-06-15 12:11:48',1),(3,3,1,'2025-06-16 10:15:03','2025-06-16 10:15:03',1),(4,4,1,'2025-06-18 09:41:27','2025-06-18 09:41:27',1);
/*!40000 ALTER TABLE `t_meerestriccion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_meespacio`
--

DROP TABLE IF EXISTS `t_meespacio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_meespacio` (
  `PK_TMEESPACIO` int NOT NULL AUTO_INCREMENT,
  `PK_TMEUNIDAD` int NOT NULL,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `PK_TMETIPO_ESPACIO` int NOT NULL,
  `ESP_NOMBRE` varchar(50) NOT NULL,
  `ESP_DESCRIPCION` varchar(300) NOT NULL,
  `ESP_CAPACIDAD` int NOT NULL,
  `ESP_DESCRIPCION_UBICACION` varchar(150) NOT NULL,
  `ESP_DISPONIBILIDAD` int NOT NULL,
  `ESP_DIAS_ANTELACION` int NOT NULL,
  `ESP_FECHA_CREACION` datetime NOT NULL,
  `ESP_FECHA_EDICION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEESPACIO`),
  KEY `FK_PERSONAINTERNA_ESPACIO` (`PK_TMCPERSONA_INTERNA`),
  KEY `FK_TIPOESPACIO_ESPACIO` (`PK_TMETIPO_ESPACIO`),
  KEY `FK_UNIDAD_ESPACIO` (`PK_TMEUNIDAD`),
  CONSTRAINT `FK_PERSONAINTERNA_ESPACIO` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_TIPOESPACIO_ESPACIO` FOREIGN KEY (`PK_TMETIPO_ESPACIO`) REFERENCES `t_metipo_espacio` (`PK_TMETIPO_ESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_UNIDAD_ESPACIO` FOREIGN KEY (`PK_TMEUNIDAD`) REFERENCES `t_meunidad` (`PK_TMEUNIDAD`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad relacionada a la gestión y almacenamiento de la info';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_meespacio`
--

LOCK TABLES `t_meespacio` WRITE;
/*!40000 ALTER TABLE `t_meespacio` DISABLE KEYS */;
INSERT INTO `t_meespacio` VALUES (1,1,1,2,'H301','25 Computadoras \n1 parlante \n33 sillas \n1 cámara de vigilancia \n1 proyector \n8 mesas\n1 basurero \n1 borrador',33,'Bloque H Segundo piso',1,2,'2025-06-14 15:32:46','2025-06-14 15:32:46',1),(2,1,1,2,'H3O2','Aula',33,'Bloque H, segundo piso',1,3,'2025-06-15 12:11:18','2025-06-15 12:11:18',1),(3,1,1,2,'H303','Aula del departamento de DCCO ',23,'Bloque H segundo piso. ',0,2,'2025-06-16 10:13:28','2025-06-16 10:20:29',0),(4,1,1,3,'G301','Aula',33,'Bloque G segundo piso',1,2,'2025-06-18 09:40:54','2025-06-18 09:40:54',1),(5,1,1,3,'G302','aula',23,'bloque G',0,1,'2025-06-18 10:10:48','2025-06-18 10:10:48',0);
/*!40000 ALTER TABLE `t_meespacio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mefoto_espacio`
--

DROP TABLE IF EXISTS `t_mefoto_espacio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mefoto_espacio` (
  `PK_TMEFOTO_ESPACIO` int NOT NULL AUTO_INCREMENT,
  `PK_TMEESPACIO` int NOT NULL,
  `FES_RUTA` varchar(150) NOT NULL,
  `FES_NOMBRE` varchar(150) NOT NULL,
  `FES_ORDEN` int NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEFOTO_ESPACIO`),
  KEY `FK_ESPACIO_FOTO` (`PK_TMEESPACIO`),
  CONSTRAINT `FK_ESPACIO_FOTO` FOREIGN KEY (`PK_TMEESPACIO`) REFERENCES `t_meespacio` (`PK_TMEESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mefoto_espacio`
--

LOCK TABLES `t_mefoto_espacio` WRITE;
/*!40000 ALTER TABLE `t_mefoto_espacio` DISABLE KEYS */;
INSERT INTO `t_mefoto_espacio` VALUES (1,1,'/api/espacios/find_images?CodEspacio=1&NombreImagen=','1.jpg',0,1),(2,2,'/api/espacios/find_images?CodEspacio=2&NombreImagen=','2.jpg',0,1),(3,3,'/api/espacios/find_images?CodEspacio=3&NombreImagen=','descarga.jpg',0,1),(4,4,'/api/espacios/find_images?CodEspacio=4&NombreImagen=','images (2).jpg',0,1),(5,5,'/api/espacios/find_images?CodEspacio=5&NombreImagen=','images (3).jpg',0,1);
/*!40000 ALTER TABLE `t_mefoto_espacio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_metipo_equipo`
--

DROP TABLE IF EXISTS `t_metipo_equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_metipo_equipo` (
  `PK_TMETIPO_EQUIPO` int NOT NULL AUTO_INCREMENT,
  `TEQ_NOMBRE` varchar(20) NOT NULL,
  `TEQ_DESCRIPCION` varchar(50) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMETIPO_EQUIPO`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_metipo_equipo`
--

LOCK TABLES `t_metipo_equipo` WRITE;
/*!40000 ALTER TABLE `t_metipo_equipo` DISABLE KEYS */;
INSERT INTO `t_metipo_equipo` VALUES (1,'DELL','Monitor ',0),(2,'Proyector','Proyector hp',0),(3,'Proyector','Proyector hp',0),(4,'Tecnologico','Equipos de Tecnología ',0),(5,'Equipo Informáticos','Computadoras para trabajo y enseñanza',1),(6,'Equipo audiovisuales','Proyector parlante y carama de vigilancia',1),(7,'Mobiliario','Pizarrones mesas sillas y escritorio',1),(8,'Material de apoyo','Borrador para limpieza y basurero para desecho',1);
/*!40000 ALTER TABLE `t_metipo_equipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_metipo_espacio`
--

DROP TABLE IF EXISTS `t_metipo_espacio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_metipo_espacio` (
  `PK_TMETIPO_ESPACIO` int NOT NULL AUTO_INCREMENT,
  `TES_NOMBRE` varchar(50) NOT NULL,
  `TES_DESCRIPCION` varchar(100) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMETIPO_ESPACIO`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_metipo_espacio`
--

LOCK TABLES `t_metipo_espacio` WRITE;
/*!40000 ALTER TABLE `t_metipo_espacio` DISABLE KEYS */;
INSERT INTO `t_metipo_espacio` VALUES (1,'auditoria','auditoria base de datos',1),(2,'Aula bloque H ','Desarrollo de web avanzado ',1),(3,'Iterativo','Aula iterativa adaptable con zonas modulares tecnología',1);
/*!40000 ALTER TABLE `t_metipo_espacio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_meunidad`
--

DROP TABLE IF EXISTS `t_meunidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_meunidad` (
  `PK_TMEUNIDAD` int NOT NULL AUTO_INCREMENT,
  `UNI_NOMBRE` varchar(100) NOT NULL,
  `UNI_SIGLAS` varchar(10) NOT NULL,
  `UNI_DESCRIPCION` varchar(250) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMEUNIDAD`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad  relacionada a la gestión y almacenamiento de inform';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_meunidad`
--

LOCK TABLES `t_meunidad` WRITE;
/*!40000 ALTER TABLE `t_meunidad` DISABLE KEYS */;
INSERT INTO `t_meunidad` VALUES (1,'Departamento de ciencias de la computación ','DCCO','Área de computación ',1),(2,'Administración','ADM','Departamento administrativo',1);
/*!40000 ALTER TABLE `t_meunidad` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrequipo_reservado`
--

DROP TABLE IF EXISTS `t_mrequipo_reservado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrequipo_reservado` (
  `PK_TMREQUIPO_RESERVADO` int NOT NULL AUTO_INCREMENT,
  `PK_TMRRESERVA` int NOT NULL,
  `PK_TMEEQUIPO` int NOT NULL,
  `ERE_FECHA_ASIGNACION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMREQUIPO_RESERVADO`),
  KEY `FK_ELEMENTO_ELEMENTO` (`PK_TMEEQUIPO`),
  KEY `FK_RESERVA_ELEMENTO` (`PK_TMRRESERVA`),
  CONSTRAINT `FK_ELEMENTO_ELEMENTO` FOREIGN KEY (`PK_TMEEQUIPO`) REFERENCES `t_meequipo` (`PK_TMEEQUIPO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_RESERVA_ELEMENTO` FOREIGN KEY (`PK_TMRRESERVA`) REFERENCES `t_mrreserva` (`PK_TMRRESERVA`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrequipo_reservado`
--

LOCK TABLES `t_mrequipo_reservado` WRITE;
/*!40000 ALTER TABLE `t_mrequipo_reservado` DISABLE KEYS */;
INSERT INTO `t_mrequipo_reservado` VALUES (1,3,3,'2025-06-16 10:27:02',1),(2,4,6,'2025-06-17 12:07:23',1),(3,8,5,'2025-07-28 13:02:28',1),(4,11,5,'2025-07-28 13:37:40',1),(5,13,5,'2025-07-28 14:08:32',1),(6,13,6,'2025-07-28 14:08:32',1),(7,13,7,'2025-07-28 14:08:32',1);
/*!40000 ALTER TABLE `t_mrequipo_reservado` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrrepaso`
--

DROP TABLE IF EXISTS `t_mrrepaso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrrepaso` (
  `CODRESERVA2` int NOT NULL AUTO_INCREMENT,
  `PK_TMRRESERVA` int NOT NULL,
  `REP_DIA` date NOT NULL,
  `REP_HORA_INICIO` time NOT NULL,
  `REP_HORA_FIN` time NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`CODRESERVA2`),
  KEY `FK_REPASO_RESERVA` (`PK_TMRRESERVA`),
  CONSTRAINT `FK_REPASO_RESERVA` FOREIGN KEY (`PK_TMRRESERVA`) REFERENCES `t_mrreserva` (`PK_TMRRESERVA`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrrepaso`
--

LOCK TABLES `t_mrrepaso` WRITE;
/*!40000 ALTER TABLE `t_mrrepaso` DISABLE KEYS */;
/*!40000 ALTER TABLE `t_mrrepaso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrreserva`
--

DROP TABLE IF EXISTS `t_mrreserva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrreserva` (
  `PK_TMRRESERVA` int NOT NULL AUTO_INCREMENT,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `PK_TMEESPACIO` int NOT NULL,
  `PK_TMRTIPO_EVENTO` int DEFAULT NULL,
  `PK_TMCPERSONA_EXTERNA` int DEFAULT NULL,
  `RES_FECHA_CREACION` datetime NOT NULL,
  `RES_RAZON` varchar(200) NOT NULL,
  `RES_ESTADO_SOLICITUD` int NOT NULL,
  `RES_ES_PERSONA_EXT` int NOT NULL,
  `RES_EVENTO_ACADEMICO` int NOT NULL,
  `RES_DIA` date NOT NULL,
  `RES_HORA_INICIO` time NOT NULL,
  `RES_HORA_FIN` time NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMRRESERVA`),
  KEY `FK_ESPACIO_RESERVA` (`PK_TMEESPACIO`),
  KEY `FK_REALIZA` (`PK_TMCPERSONA_EXTERNA`),
  KEY `FK_SOLICITA` (`PK_TMCPERSONA_INTERNA`),
  KEY `FK_TIPO_EVENTO_RESERVA` (`PK_TMRTIPO_EVENTO`),
  CONSTRAINT `FK_ESPACIO_RESERVA` FOREIGN KEY (`PK_TMEESPACIO`) REFERENCES `t_meespacio` (`PK_TMEESPACIO`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_REALIZA` FOREIGN KEY (`PK_TMCPERSONA_EXTERNA`) REFERENCES `t_mcpersona_externa` (`PK_TMCPERSONA_EXTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_SOLICITA` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_TIPO_EVENTO_RESERVA` FOREIGN KEY (`PK_TMRTIPO_EVENTO`) REFERENCES `t_mrtipo_evento` (`PK_TMRTIPO_EVENTO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrreserva`
--

LOCK TABLES `t_mrreserva` WRITE;
/*!40000 ALTER TABLE `t_mrreserva` DISABLE KEYS */;
INSERT INTO `t_mrreserva` VALUES (1,1,2,1,NULL,'2025-06-15 12:14:34','Tutoría de POO',0,0,0,'2025-06-24','11:00:00','13:00:00',1),(2,17,2,2,NULL,'2025-06-15 12:23:36','Estudiar con compañeros EDO',1,0,0,'2025-06-24','14:00:00','15:00:00',1),(3,17,3,1,NULL,'2025-06-16 10:27:02','tutoría de poo',0,0,0,'2025-06-19','13:00:00','13:59:00',1),(4,17,1,1,NULL,'2025-06-17 12:07:23','Tutoría',1,0,0,'2025-06-20','13:30:00','14:29:00',1),(5,17,4,1,NULL,'2025-06-24 00:36:41','aegar',1,0,0,'2025-07-01','09:00:00','09:59:00',1),(6,17,4,3,NULL,'2025-07-28 11:43:45','estudio',1,0,0,'2025-08-05','09:00:00','09:59:00',1),(7,29,4,3,NULL,'2025-07-28 12:56:56','Práctica MIC',1,0,1,'2025-08-12','09:00:00','09:59:00',1),(8,29,1,1,NULL,'2025-07-28 13:02:28','efaeafaefa',1,0,0,'2025-08-01','14:00:00','14:59:00',1),(9,29,2,1,NULL,'2025-07-28 13:12:44','aewfaewfaw',0,0,0,'2025-08-05','13:30:00','14:29:00',1),(10,30,2,3,NULL,'2025-07-28 13:29:14','quiero hacer una investigacion',1,0,1,'2025-08-05','11:30:00','12:29:00',1),(11,31,1,3,NULL,'2025-07-28 13:37:40','Clases',1,0,1,'2025-08-01','13:00:00','13:59:00',1),(12,32,4,1,NULL,'2025-07-28 14:01:50','Estudiar informatica ',1,0,1,'2025-08-19','09:00:00','09:59:00',1),(13,34,1,1,NULL,'2025-07-28 14:08:32','Tutoria ',1,0,0,'2025-07-31','10:00:00','10:59:00',1),(14,47,2,1,NULL,'2025-07-28 18:19:23','eafafaef',1,0,1,'2025-08-05','15:00:00','15:59:00',1),(15,49,4,1,NULL,'2025-07-29 23:05:06','Tutoría',1,0,1,'2025-08-26','09:00:00','09:59:00',1);
/*!40000 ALTER TABLE `t_mrreserva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrservicio_especial`
--

DROP TABLE IF EXISTS `t_mrservicio_especial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrservicio_especial` (
  `PK_TMRSERVICIO_ESPECIAL` int NOT NULL AUTO_INCREMENT,
  `PK_TMEUNIDAD` int NOT NULL,
  `SES_NOMBRE` varchar(30) NOT NULL,
  `SES_DESCRIPCION` varchar(50) NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMRSERVICIO_ESPECIAL`),
  KEY `FK_UNIDAD_SERVICIOS_ESPECIALES` (`PK_TMEUNIDAD`),
  CONSTRAINT `FK_UNIDAD_SERVICIOS_ESPECIALES` FOREIGN KEY (`PK_TMEUNIDAD`) REFERENCES `t_meunidad` (`PK_TMEUNIDAD`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrservicio_especial`
--

LOCK TABLES `t_mrservicio_especial` WRITE;
/*!40000 ALTER TABLE `t_mrservicio_especial` DISABLE KEYS */;
INSERT INTO `t_mrservicio_especial` VALUES (1,1,'defensasa de tesisi','defensas de tesisi area dcco',1);
/*!40000 ALTER TABLE `t_mrservicio_especial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrservicio_especial_reserva`
--

DROP TABLE IF EXISTS `t_mrservicio_especial_reserva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrservicio_especial_reserva` (
  `PK_TMRSERVICIO_ESPECIAL_RESERVA` int NOT NULL AUTO_INCREMENT,
  `PK_TMRRESERVA` int NOT NULL,
  `PK_TMRSERVICIO_ESPECIAL` int NOT NULL,
  `SER_FECHA_ASIGNACION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMRSERVICIO_ESPECIAL_RESERVA`),
  KEY `FK_RESERVA_SERVICIOS` (`PK_TMRRESERVA`),
  KEY `FK_SERVICIOS_SERVICIOS` (`PK_TMRSERVICIO_ESPECIAL`),
  CONSTRAINT `FK_RESERVA_SERVICIOS` FOREIGN KEY (`PK_TMRRESERVA`) REFERENCES `t_mrreserva` (`PK_TMRRESERVA`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_SERVICIOS_SERVICIOS` FOREIGN KEY (`PK_TMRSERVICIO_ESPECIAL`) REFERENCES `t_mrservicio_especial` (`PK_TMRSERVICIO_ESPECIAL`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrservicio_especial_reserva`
--

LOCK TABLES `t_mrservicio_especial_reserva` WRITE;
/*!40000 ALTER TABLE `t_mrservicio_especial_reserva` DISABLE KEYS */;
INSERT INTO `t_mrservicio_especial_reserva` VALUES (1,7,1,'2025-07-28 12:56:56',1),(2,8,1,'2025-07-28 13:02:28',1),(3,9,1,'2025-07-28 13:12:44',1),(4,11,1,'2025-07-28 13:37:40',1),(5,12,1,'2025-07-28 14:01:50',1),(6,14,1,'2025-07-28 18:19:23',1),(7,15,1,'2025-07-29 23:05:06',1);
/*!40000 ALTER TABLE `t_mrservicio_especial_reserva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mrtipo_evento`
--

DROP TABLE IF EXISTS `t_mrtipo_evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mrtipo_evento` (
  `PK_TMRTIPO_EVENTO` int NOT NULL AUTO_INCREMENT,
  `TEV_NOMBRE` varchar(50) NOT NULL,
  `TEV_DESCRIPCION` varchar(100) NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMRTIPO_EVENTO`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mrtipo_evento`
--

LOCK TABLES `t_mrtipo_evento` WRITE;
/*!40000 ALTER TABLE `t_mrtipo_evento` DISABLE KEYS */;
INSERT INTO `t_mrtipo_evento` VALUES (1,'TUTORIA ','Reforzamiento de Estudiantes',1),(2,'Estudio de alumnos ','Reserva de aula estudios de estudiantes',0),(3,'Estudio de alumnos ','Grupo de Estudio',1);
/*!40000 ALTER TABLE `t_mrtipo_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msauditoria`
--

DROP TABLE IF EXISTS `t_msauditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msauditoria` (
  `PK_TMSAUDITORIA` int NOT NULL AUTO_INCREMENT,
  `XEUSU_CODIGO` int NOT NULL,
  `AUD_FECHA` date NOT NULL,
  `AUD_HORA` time NOT NULL,
  `AUD_IP_USUARIO` varchar(50) DEFAULT NULL,
  `AUD_DESCRIPCION_ACTIV` varchar(100) NOT NULL,
  `AUD_RESULTADO_ACTIV` varchar(100) DEFAULT NULL,
  `AUD_NAVEGADOR` varchar(100) DEFAULT NULL,
  `AUD_DISPOSITIVO` varchar(100) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSAUDITORIA`),
  KEY `FK_USUARIO_AUDITORIA` (`XEUSU_CODIGO`),
  CONSTRAINT `FK_USUARIO_AUDITORIA` FOREIGN KEY (`XEUSU_CODIGO`) REFERENCES `t_msusuario` (`XEUSU_CODIGO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msauditoria`
--

LOCK TABLES `t_msauditoria` WRITE;
/*!40000 ALTER TABLE `t_msauditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `t_msauditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msfuncionalidad`
--

DROP TABLE IF EXISTS `t_msfuncionalidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msfuncionalidad` (
  `PK_TMSFUNCIONALIDAD` int NOT NULL AUTO_INCREMENT,
  `FUN_NOMBRE` varchar(100) NOT NULL,
  `FUN_DESCRIPCION` varchar(150) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSFUNCIONALIDAD`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msfuncionalidad`
--

LOCK TABLES `t_msfuncionalidad` WRITE;
/*!40000 ALTER TABLE `t_msfuncionalidad` DISABLE KEYS */;
INSERT INTO `t_msfuncionalidad` VALUES (1,'funcionalida prueba','funcionalidad prueba',1);
/*!40000 ALTER TABLE `t_msfuncionalidad` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msitem_menu`
--

DROP TABLE IF EXISTS `t_msitem_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msitem_menu` (
  `PK_TMS_ITEM_MENU` int NOT NULL AUTO_INCREMENT,
  `IME_NOMBRE` varchar(50) NOT NULL,
  `IME_URL` varchar(200) NOT NULL,
  `IME_POSICION` int NOT NULL,
  `IME_ICONO` varchar(25) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMS_ITEM_MENU`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msitem_menu`
--

LOCK TABLES `t_msitem_menu` WRITE;
/*!40000 ALTER TABLE `t_msitem_menu` DISABLE KEYS */;
INSERT INTO `t_msitem_menu` VALUES (1,'Inicio','/',1,'',1),(2,'Espacios','/espacios',2,'',1),(3,'Reservas','/reservas',3,'',1),(4,'Equipos','/equipo',4,'',1),(5,'Roles','/roles',5,'',1),(6,'Unidades','/unidad',6,'',1),(7,'Servicios Especiales','/servicioEspecial',7,'',1),(8,'Usuarios','/usuarios',8,'',1),(9,'Gestionar Items','/item',9,'',1),(10,'Gestionar Permisos','/permisos',10,'',1),(11,'Gestionar Funcionalidades','/funcionalidades',11,'',1),(12,'Auditoria','/auditoria',12,'',1),(13,'Solicitudes de Registro','/solicitudes',13,'',1),(14,'Cambios de Contraseña','/manage-password-changes',14,'fas fa-key',1);
/*!40000 ALTER TABLE `t_msitem_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mspermiso`
--

DROP TABLE IF EXISTS `t_mspermiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mspermiso` (
  `PK_TMSPERMISO` int NOT NULL AUTO_INCREMENT,
  `PK_TMSROL` int NOT NULL,
  `PK_TMS_ITEM_MENU` int DEFAULT NULL,
  `PK_TMSSUBITEM_MENU` int DEFAULT NULL,
  `PK_TMSSUB_SUBITEM_MENU` int DEFAULT NULL,
  `PK_TMSFUNCIONALIDAD` int DEFAULT NULL,
  `PER_FECHA_ASIGNACION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSPERMISO`),
  KEY `FK_FUNCIONALIDADES_PERMISOS` (`PK_TMSFUNCIONALIDAD`),
  KEY `FK_ITEM_MENU_PERMISOS` (`PK_TMS_ITEM_MENU`),
  KEY `FK_ROLES_PERMISOS` (`PK_TMSROL`),
  KEY `FK_SUBITEM_PERMISOS` (`PK_TMSSUBITEM_MENU`),
  KEY `FK_SUBSUBITEM` (`PK_TMSSUB_SUBITEM_MENU`),
  CONSTRAINT `FK_FUNCIONALIDADES_PERMISOS` FOREIGN KEY (`PK_TMSFUNCIONALIDAD`) REFERENCES `t_msfuncionalidad` (`PK_TMSFUNCIONALIDAD`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_ITEM_MENU_PERMISOS` FOREIGN KEY (`PK_TMS_ITEM_MENU`) REFERENCES `t_msitem_menu` (`PK_TMS_ITEM_MENU`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_ROLES_PERMISOS` FOREIGN KEY (`PK_TMSROL`) REFERENCES `t_msrol` (`PK_TMSROL`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_SUBITEM_PERMISOS` FOREIGN KEY (`PK_TMSSUBITEM_MENU`) REFERENCES `t_mssubitem_menu` (`PK_TMSSUBITEM_MENU`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_SUBSUBITEM` FOREIGN KEY (`PK_TMSSUB_SUBITEM_MENU`) REFERENCES `t_mssub_subitem_menu` (`PK_TMSSUB_SUBITEM_MENU`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mspermiso`
--

LOCK TABLES `t_mspermiso` WRITE;
/*!40000 ALTER TABLE `t_mspermiso` DISABLE KEYS */;
INSERT INTO `t_mspermiso` VALUES (1,3,1,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(2,3,2,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(3,3,3,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(4,3,4,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(5,3,5,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(6,3,6,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(7,3,7,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(8,3,8,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(9,3,9,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(10,3,10,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(11,3,11,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(12,3,12,NULL,NULL,NULL,'2025-04-29 21:51:08',1),(13,3,NULL,1,NULL,NULL,'2025-04-29 21:51:29',1),(14,3,NULL,2,NULL,NULL,'2025-04-29 21:51:29',1),(15,3,NULL,3,NULL,NULL,'2025-04-29 21:51:29',1),(16,3,NULL,4,NULL,NULL,'2025-04-29 21:51:29',1),(17,3,NULL,5,NULL,NULL,'2025-04-29 21:51:29',1),(25,1,1,NULL,NULL,1,'2025-06-11 09:55:16',1),(26,1,2,NULL,NULL,NULL,'2025-06-11 09:55:32',1),(28,1,3,NULL,NULL,NULL,'2025-06-11 09:58:15',1),(30,5,2,NULL,NULL,NULL,'2025-06-25 09:39:36',1),(33,5,1,NULL,NULL,NULL,'2025-06-25 09:39:45',1),(34,5,3,NULL,NULL,NULL,'2025-06-25 09:39:45',1),(35,3,13,NULL,NULL,NULL,'2025-07-17 03:37:52',1),(36,3,13,NULL,NULL,NULL,'2025-07-17 19:27:26',1),(37,3,12,NULL,NULL,NULL,'2025-07-18 17:34:54',1),(38,3,14,NULL,NULL,NULL,'2025-07-27 01:11:52',1),(43,2,1,NULL,NULL,NULL,'2025-07-28 11:24:12',1),(55,2,14,NULL,NULL,NULL,'2025-07-28 11:24:41',1),(58,2,13,NULL,NULL,NULL,'2025-07-28 11:24:41',1),(59,2,2,NULL,NULL,NULL,'2025-07-28 11:25:03',1),(60,2,4,NULL,NULL,NULL,'2025-07-28 11:25:03',1),(61,2,3,NULL,NULL,NULL,'2025-07-28 11:25:03',1),(62,2,NULL,3,NULL,NULL,'2025-07-28 11:35:43',1),(63,2,NULL,5,NULL,NULL,'2025-07-28 11:35:43',1),(64,2,6,NULL,NULL,NULL,'2025-07-28 11:36:11',1),(65,2,7,NULL,NULL,NULL,'2025-07-28 11:36:11',1),(66,2,8,NULL,NULL,NULL,'2025-07-28 11:36:26',1),(67,2,NULL,2,NULL,NULL,'2025-07-28 11:36:26',1),(71,6,1,NULL,NULL,NULL,'2025-07-28 17:19:15',1),(72,6,2,NULL,NULL,NULL,'2025-07-28 17:19:18',1),(73,6,3,NULL,NULL,NULL,'2025-07-28 17:19:22',1);
/*!40000 ALTER TABLE `t_mspermiso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msrol`
--

DROP TABLE IF EXISTS `t_msrol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msrol` (
  `PK_TMSROL` int NOT NULL AUTO_INCREMENT,
  `ROL_NOMBRE` varchar(20) NOT NULL,
  `ROL_DESCRIPCION` varchar(50) NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSROL`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Rol del usuario';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msrol`
--

LOCK TABLES `t_msrol` WRITE;
/*!40000 ALTER TABLE `t_msrol` DISABLE KEYS */;
INSERT INTO `t_msrol` VALUES (1,'Usuario','Rol para usuarios estándar',0),(2,'Administrador','Rol para administradores',1),(3,'Admin Root','Rol para el administrador raíz',1),(4,'prueba','preuba',0),(5,'Estudiante','Estudiante del DCCO',1),(6,'Docente','Profesor del DCCO',1);
/*!40000 ALTER TABLE `t_msrol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msrol_usuario`
--

DROP TABLE IF EXISTS `t_msrol_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msrol_usuario` (
  `PK_TMSROL_USUARIO` int NOT NULL AUTO_INCREMENT,
  `PK_TMSROL` int NOT NULL,
  `XEUSU_CODIGO` int NOT NULL,
  `RUS_FECHA_ASIGNACION` datetime NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSROL_USUARIO`),
  KEY `FK_ROLES_USUARIOS` (`PK_TMSROL`),
  KEY `FK_USUARIO_ROL` (`XEUSU_CODIGO`),
  CONSTRAINT `FK_ROLES_USUARIOS` FOREIGN KEY (`PK_TMSROL`) REFERENCES `t_msrol` (`PK_TMSROL`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_USUARIO_ROL` FOREIGN KEY (`XEUSU_CODIGO`) REFERENCES `t_msusuario` (`XEUSU_CODIGO`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msrol_usuario`
--

LOCK TABLES `t_msrol_usuario` WRITE;
/*!40000 ALTER TABLE `t_msrol_usuario` DISABLE KEYS */;
INSERT INTO `t_msrol_usuario` VALUES (1,3,1,'2025-04-29 21:50:47',1),(8,5,17,'2025-06-25 09:41:37',1),(9,5,10,'2025-07-17 19:11:18',1),(10,1,18,'2025-07-21 09:24:16',1),(12,5,20,'2025-07-22 20:02:58',1),(13,3,19,'2025-07-23 20:32:40',1),(14,5,21,'2025-07-23 20:44:52',1),(16,6,4,'2025-07-27 15:27:40',1),(18,5,23,'2025-07-27 15:33:59',1),(20,2,24,'2025-07-28 11:28:41',1),(21,2,22,'2025-07-28 11:29:18',1),(22,5,25,'2025-07-28 12:55:04',1),(23,5,26,'2025-07-28 13:24:41',1),(24,5,27,'2025-07-28 13:36:04',1),(25,5,28,'2025-07-28 13:55:49',1),(26,5,29,'2025-07-28 14:06:20',1),(27,5,30,'2025-07-28 18:08:07',1),(28,6,31,'2025-07-28 18:18:33',1),(29,3,32,'2025-07-29 02:56:48',1),(30,5,33,'2025-07-29 23:01:25',1);
/*!40000 ALTER TABLE `t_msrol_usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mssub_subitem_menu`
--

DROP TABLE IF EXISTS `t_mssub_subitem_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mssub_subitem_menu` (
  `PK_TMSSUB_SUBITEM_MENU` int NOT NULL AUTO_INCREMENT,
  `PK_TMSSUBITEM_MENU` int NOT NULL,
  `SSM_NOMBRE` varchar(50) NOT NULL,
  `SSM_URL` varchar(200) NOT NULL,
  `SSM_POSICION` int NOT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSSUB_SUBITEM_MENU`),
  KEY `FK_ITEM_SUBITEM` (`PK_TMSSUBITEM_MENU`),
  CONSTRAINT `FK_ITEM_SUBITEM` FOREIGN KEY (`PK_TMSSUBITEM_MENU`) REFERENCES `t_mssubitem_menu` (`PK_TMSSUBITEM_MENU`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mssub_subitem_menu`
--

LOCK TABLES `t_mssub_subitem_menu` WRITE;
/*!40000 ALTER TABLE `t_mssub_subitem_menu` DISABLE KEYS */;
/*!40000 ALTER TABLE `t_mssub_subitem_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_mssubitem_menu`
--

DROP TABLE IF EXISTS `t_mssubitem_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_mssubitem_menu` (
  `PK_TMSSUBITEM_MENU` int NOT NULL AUTO_INCREMENT,
  `PK_TMS_ITEM_MENU` int NOT NULL,
  `SME_NOMBRE` varchar(50) NOT NULL,
  `SME_URL` varchar(200) NOT NULL,
  `SME_POSICION` int NOT NULL,
  `SME_ICON` varchar(25) DEFAULT NULL,
  `ESTADO` int NOT NULL,
  PRIMARY KEY (`PK_TMSSUBITEM_MENU`),
  KEY `FK_MENU_ITEM` (`PK_TMS_ITEM_MENU`),
  CONSTRAINT `FK_MENU_ITEM` FOREIGN KEY (`PK_TMS_ITEM_MENU`) REFERENCES `t_msitem_menu` (`PK_TMS_ITEM_MENU`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_mssubitem_menu`
--

LOCK TABLES `t_mssubitem_menu` WRITE;
/*!40000 ALTER TABLE `t_mssubitem_menu` DISABLE KEYS */;
INSERT INTO `t_mssubitem_menu` VALUES (1,8,'Asignar Roles','/asignar-rol',2,'',1),(2,8,'Asignar Unidades','/asignar-unidad',3,'',1),(3,3,'Tipo de Evento','/tipoEvento',4,'',1),(4,4,'Tipo de Equipo','/tipoEquipo',5,'',1),(5,2,'Tipos de Espacio','/tipoEspacio',6,'',1);
/*!40000 ALTER TABLE `t_mssubitem_menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_msusuario`
--

DROP TABLE IF EXISTS `t_msusuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_msusuario` (
  `XEUSU_CODIGO` int NOT NULL AUTO_INCREMENT,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `USU_NOMBRE` varchar(30) NOT NULL,
  `XEUSU_PASWD` varchar(256) NOT NULL,
  `ROL` enum('Estudiante','Administrativo','Docente') DEFAULT NULL,
  PRIMARY KEY (`XEUSU_CODIGO`),
  KEY `FK_PERSONA_INTERNA_USUARIO` (`PK_TMCPERSONA_INTERNA`),
  CONSTRAINT `FK_PERSONA_INTERNA_USUARIO` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Entidad relacionada para gentionar los usuario que ingrsan a';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_msusuario`
--

LOCK TABLES `t_msusuario` WRITE;
/*!40000 ALTER TABLE `t_msusuario` DISABLE KEYS */;
INSERT INTO `t_msusuario` VALUES (1,1,'cpnovoa','$2b$10$7EKzTPQITmtHOqPcdqrU1eJva9S4CyxXLgpGSTNOfWSukD7tYrPTG','Estudiante'),(2,1,'cpnovoa','Contraseña123','Estudiante'),(3,1,'cpnovoa','mateobarriga18','Estudiante'),(4,4,'admin','mateo123','Estudiante'),(5,5,'dipadilla','123456','Estudiante'),(6,6,'lssandoval','123456','Estudiante'),(7,7,'hdperez','123456','Estudiante'),(8,8,'djarevalo3','123456','Estudiante'),(9,9,'mamedina13','123456','Estudiante'),(10,10,'bdyaguarshungo','123456','Estudiante'),(11,11,'agcastillo2','123456','Estudiante'),(12,12,'wdtoapanta3','123456','Estudiante'),(13,13,'ejsantamaria1','123456','Estudiante'),(14,14,'ermorales5','123456','Estudiante'),(15,15,'savargas4','123456','Estudiante'),(16,16,'koandrade','123456','Estudiante'),(17,17,'klmacas','$2b$10$jsi9oDuq8rcsRieerL8yXOgUtvgeTSDyXf6TDXW./UInWR3aL.hki','Estudiante'),(18,18,'jperez','hashed_password','Estudiante'),(19,23,'gabarriga','$2b$10$iSfWyXAsxff47TYpe7Trz.qccBFBEHFmZ7gUXsNdZzUt.srbmfvBy','Estudiante'),(20,21,'testuser','$2b$10$5KKJrQDqxsgwL28Y6V5hVOZh.A8/Bd0vPYdX0J7od07z2CaRQKvr6','Estudiante'),(21,25,'testuser4','$2b$10$GJkhXTTRpWniAPKKrCoVseKBMXRCzBqHhsgcqTh7KLiVdmATZlqZW','Estudiante'),(22,26,'satorres','$2b$10$kAtPQDOlfKbsaSmYJIXBKu0.oZSc/e81cP1RiAiZTEetSXlBFV1su','Administrativo'),(23,27,'mateobarriga','$2b$10$y.5hKmehrpRGtG73wtRw7OFneRBdiQxbuvrTaMEQKwtHi51myfx1i','Estudiante'),(24,28,'tester5','$2b$10$kIIqj7pzjR3BhaU6QF/c6eG8Yj3nzLCQG3Dw91nxRtwGE1ylvrDS.','Administrativo'),(25,29,'mspadron','$2b$10$/LDDfg64ZvcEAKm0Gd8ahO0qJrv2Di4YO2djjkwsseCiQfPtVPMZ6','Estudiante'),(26,30,'kaiser','$2b$10$XGiZZ3go7SVe1Jw5/dyDpO8Ra1E0XzaFAES/1.Hb9/aI4N4.QHrH2','Estudiante'),(27,31,'jbmedina3','$2b$10$psOt/crv1cvNu9enviKvXeJSLqk3mXr70YX3N1wC8wPnVtbZszD5W','Estudiante'),(28,32,'jsmena5','$2b$10$OoX5NjPZJVt4Dgmrwvkw6.GK6bEXHORHHSiAFTxP9wfkF/.9ifouy','Estudiante'),(29,34,'degalarza2','$2b$10$iUNX3jXst0OU/5lCpYFMiuOweZwrb0brqhBqF4kM67oOklFZqz5VK','Estudiante'),(30,46,'estudiante','$2b$10$NyaYw5KCRyuvy.Mm64HzhurKplVFk/kmGqJHwFQ.s3xC1fQTA/7NW','Estudiante'),(31,47,'docente2','$2b$10$UQtoOjZBS7GqJ4SAQYDYQetm4zJ5c8z7oiQZpCDQFGc0z9bWKhQQ6','Docente'),(32,48,'adminroot','$2b$10$7EKzTPQITmtHOqPcdqrU1eJva9S4CyxXLgpGSTNOfWSukD7tYrPTG','Administrativo'),(33,49,'test6','$2b$10$qNio5w41HZ//5/U9K9d39OKLyhW0vooVahdk8OSqst3JhPEH.Qq3K','Estudiante');
/*!40000 ALTER TABLE `t_msusuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_registro_solicitud`
--

DROP TABLE IF EXISTS `t_registro_solicitud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_registro_solicitud` (
  `PK_REGISTRO_SOLICITUD` int NOT NULL AUTO_INCREMENT,
  `PK_TMCPERSONA_INTERNA` int NOT NULL,
  `USU_NOMBRE` varchar(30) NOT NULL,
  `XEUSU_PASWD` varchar(256) NOT NULL,
  `PEI_NOMBRE` varchar(50) NOT NULL,
  `PEI_APELLIDO_PATERNO` varchar(50) NOT NULL,
  `PEI_APELLIDO_MATERNO` varchar(50) DEFAULT NULL,
  `PEI_EMAIL_INSTITUCIONAL` varchar(100) NOT NULL,
  `ROL` enum('Estudiante','Administrativo','Docente') DEFAULT NULL,
  `ESTADO` enum('Pendiente','Aceptado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  `FECHA_SOLICITUD` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `FECHA_RESPUESTA` datetime DEFAULT NULL,
  `COMENTARIO_ADMIN` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`PK_REGISTRO_SOLICITUD`),
  KEY `PK_TMCPERSONA_INTERNA` (`PK_TMCPERSONA_INTERNA`),
  CONSTRAINT `t_registro_solicitud_ibfk_1` FOREIGN KEY (`PK_TMCPERSONA_INTERNA`) REFERENCES `t_mcpersona_interna` (`PK_TMCPERSONA_INTERNA`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_registro_solicitud`
--

LOCK TABLES `t_registro_solicitud` WRITE;
/*!40000 ALTER TABLE `t_registro_solicitud` DISABLE KEYS */;
INSERT INTO `t_registro_solicitud` VALUES (1,18,'jperez','hashed_password','Juan','Pérez','Gómez','juan.perez@espe.edu.ec','Estudiante','Aceptado','2025-07-17 19:40:18','2025-07-21 09:24:16',NULL),(4,21,'testuser','$2b$10$5KKJrQDqxsgwL28Y6V5hVOZh.A8/Bd0vPYdX0J7od07z2CaRQKvr6','Juan','Alvez','Perez','jualvez@espe.edu.ec','Estudiante','Aceptado','2025-07-22 19:53:40','2025-07-22 20:02:58','aprovado'),(5,23,'gabarriga','$2b$10$iSfWyXAsxff47TYpe7Trz.qccBFBEHFmZ7gUXsNdZzUt.srbmfvBy','Gabriel','Barriga','Llumiquinga','agbarriga@espe.edu.ec','Estudiante','Aceptado','2025-07-22 19:54:23','2025-07-22 19:58:59','ACEPTADO '),(6,24,'testuser4','$2b$10$bXdugR1hgSmhI4VbYKi6k.EYMC1H9YtfBA3XaBCakgZQFcS7A7qPu','Gabriel','Barriga','Llumiquinga','agbarriga4@espe.edu.ec','Estudiante','Rechazado','2025-07-23 12:04:32','2025-07-23 20:44:44',NULL),(7,25,'testuser4','$2b$10$GJkhXTTRpWniAPKKrCoVseKBMXRCzBqHhsgcqTh7KLiVdmATZlqZW','Prueba','Tester','User','testuser@espe.edu.ec','Estudiante','Aceptado','2025-07-23 20:44:25','2025-07-23 20:44:52','aprobado'),(8,26,'satorres','$2b$10$w39xOEi4myJFKhfSWKQ1LOm69m3Kwty8Ufw42uLCh8B42hL2NQczW','Sofia','Torres','Torres','satorres@espe.edu.ec','Administrativo','Aceptado','2025-07-24 00:07:50','2025-07-24 00:08:16','ACEPTADO'),(9,27,'mateobarriga','$2b$10$/rF6TxN8aNOkPLEX0LPJfO25JqHyKTqydm9C6bYnN/oRh8mFBhLEu','mateo','barriga','Llumiquinga','mateobarriga02182002@gmail.com','Estudiante','Aceptado','2025-07-27 15:33:51','2025-07-27 15:33:59',NULL),(10,28,'tester5','$2b$10$kIIqj7pzjR3BhaU6QF/c6eG8Yj3nzLCQG3Dw91nxRtwGE1ylvrDS.','tester','tester','tester','tester@gmail.com','Administrativo','Aceptado','2025-07-28 11:26:43','2025-07-28 11:27:04',NULL),(11,29,'mspadron','$2b$10$/LDDfg64ZvcEAKm0Gd8ahO0qJrv2Di4YO2djjkwsseCiQfPtVPMZ6','Matias','Padrón','Aguilar','mspadron@espe.edu.ec','Estudiante','Aceptado','2025-07-28 12:54:50','2025-07-28 12:55:04',NULL),(12,30,'kaiser','$2b$10$iJtSthe.EQPQX0smEugxA.Vc2vhAGGFRY88USoWc2B0npY.FMoNmi','nando','cueva','flores','lfcueva1@espe.COM','Estudiante','Aceptado','2025-07-28 13:24:16','2025-07-28 13:24:41',NULL),(13,31,'jbmedina3','$2b$10$psOt/crv1cvNu9enviKvXeJSLqk3mXr70YX3N1wC8wPnVtbZszD5W','Joseph','Medina','Sánchez','jbmedina3@espe.edu.ec','Estudiante','Aceptado','2025-07-28 13:35:52','2025-07-28 13:36:04',NULL),(14,32,'jsmena5','$2b$10$OoX5NjPZJVt4Dgmrwvkw6.GK6bEXHORHHSiAFTxP9wfkF/.9ifouy','James','Mena','Perez','jsmena5@espe.edu.ec','Estudiante','Aceptado','2025-07-28 13:55:34','2025-07-28 13:55:49',NULL),(15,34,'degalarza2','$2b$10$iUNX3jXst0OU/5lCpYFMiuOweZwrb0brqhBqF4kM67oOklFZqz5VK','David','Galarza','Garcia','degalarza2@espe.edu.ec','Estudiante','Aceptado','2025-07-28 14:06:06','2025-07-28 14:06:20',NULL),(16,45,'docente','$2b$10$XrXer9ACWkEYHhO6aPIYPeHuSPDFhO3uBZiv1Mx7ayt1iho7JWUwO','docente','docente','docente','docente@espe.edu.ec','Docente','Rechazado','2025-07-28 18:06:02','2025-07-28 18:11:26',NULL),(17,46,'estudiante','$2b$10$NyaYw5KCRyuvy.Mm64HzhurKplVFk/kmGqJHwFQ.s3xC1fQTA/7NW','estudiante','estudiante','estudiante','estudiante@espe.edu.ec','Estudiante','Aceptado','2025-07-28 18:07:55','2025-07-28 18:08:07',NULL),(18,47,'docente2','$2b$10$UQtoOjZBS7GqJ4SAQYDYQetm4zJ5c8z7oiQZpCDQFGc0z9bWKhQQ6','docente','docente','docente','docente2@espe.edu.ec','Docente','Aceptado','2025-07-28 18:12:24','2025-07-28 18:18:33',NULL),(19,49,'test6','$2b$10$qNio5w41HZ//5/U9K9d39OKLyhW0vooVahdk8OSqst3JhPEH.Qq3K','test6','test6','test6','test6@espe.edu.ec','Estudiante','Aceptado','2025-07-29 23:01:08','2025-07-29 23:01:25',NULL);
/*!40000 ALTER TABLE `t_registro_solicitud` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-29 23:32:01
