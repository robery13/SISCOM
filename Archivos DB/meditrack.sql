CREATE DATABASE  IF NOT EXISTS `meditrack` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `meditrack`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: mysql-2a8f9d40-unah-85bf.g.aivencloud.com    Database: meditrack
-- ------------------------------------------------------
-- Server version	8.0.35

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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '2d9c0853-ae35-11f0-b9c8-862ccfb0425e:1-877,
6d21f8cc-fe1a-11f0-8144-862ccfb00f59:1-15';

--
-- Table structure for table `Registro_medicamentos`
--

DROP TABLE IF EXISTS `Registro_medicamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Registro_medicamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `dosis` varchar(50) NOT NULL,
  `frecuencia_horas` int NOT NULL,
  `hora` time NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Registro_medicamentos`
--

LOCK TABLES `Registro_medicamentos` WRITE;
/*!40000 ALTER TABLE `Registro_medicamentos` DISABLE KEYS */;
INSERT INTO `Registro_medicamentos` VALUES (1,'paracetamol','500',4,'12:20:00','2025-10-29 18:18:27'),(2,'Loratadina','400',2,'13:58:00','2025-10-29 19:57:14'),(3,'panadol','200 ml',8,'22:00:00','2025-10-29 20:53:38'),(4,'panadol','500 mg',2,'21:00:00','2025-11-03 02:20:15'),(5,'panadol','500 mg',2,'21:00:00','2025-11-03 02:20:16'),(6,'Parecetamol','200',4,'17:48:00','2025-11-08 22:47:30'),(7,'alfredo','56',6,'23:09:00','2025-11-11 02:09:47'),(8,'Parcetamo,','8',2,'04:12:00','2025-11-11 07:12:41'),(9,'Parectamol','200mg',4,'02:02:00','2025-11-11 08:01:58'),(10,'Parecetamol','500mg',2,'14:50:00','2025-11-11 20:49:54'),(11,'paracetamol','200',8,'09:30:00','2025-11-11 21:16:48'),(12,'alfredo','56',2,'15:53:00','2025-11-11 21:51:05'),(13,'alfredo','5655',6,'18:53:00','2025-11-25 00:52:33'),(14,'alfredo','5655',6,'18:53:00','2025-11-25 00:52:33'),(15,'Parecetamol','56',4,'18:55:00','2025-11-25 00:53:34'),(16,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:11'),(17,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:12'),(18,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:12'),(19,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:15'),(20,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:17'),(21,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:17'),(22,'Paracetamol','56',4,'19:22:00','2025-11-25 01:21:18'),(23,'Itrean','5655',6,'19:22:00','2025-11-25 01:21:44'),(24,'Parecetamol','56',4,'16:46:00','2025-11-25 22:45:40'),(25,'Itrean','56',4,'16:58:00','2025-11-26 22:56:11'),(26,'Parecetamol','500',8,'12:55:45','2025-12-02 18:55:46'),(27,'Parecetamol','501',8,'13:02:37','2025-12-02 19:02:39'),(28,'Parecetamol','500',8,'13:34:09','2025-12-02 19:34:10');
/*!40000 ALTER TABLE `Registro_medicamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alergia`
--

DROP TABLE IF EXISTS `alergia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alergia` (
  `id_alergia` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `nombre_alergia` varchar(100) NOT NULL,
  PRIMARY KEY (`id_alergia`),
  KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `alergia_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alergia`
--

LOCK TABLES `alergia` WRITE;
/*!40000 ALTER TABLE `alergia` DISABLE KEYS */;
INSERT INTO `alergia` VALUES (1,1,'maricos'),(2,2,'Mariscos'),(3,3,'Mariscos'),(4,4,'mmxeie'),(5,5,'ecwcewc'),(6,6,'xqed'),(7,7,'ggf'),(8,8,'ffberg'),(9,9,'yny'),(10,10,'cvt5v'),(11,11,'POLVO'),(12,12,'ccwe'),(13,13,'Mariscos'),(14,14,'Mariscos'),(15,16,'mariscos');
/*!40000 ALTER TABLE `alergia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklist`
--

DROP TABLE IF EXISTS `checklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `texto` varchar(255) NOT NULL,
  `completada` tinyint(1) DEFAULT '0',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklist`
--

LOCK TABLES `checklist` WRITE;
/*!40000 ALTER TABLE `checklist` DISABLE KEYS */;
/*!40000 ALTER TABLE `checklist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklist_confirmaciones`
--

DROP TABLE IF EXISTS `checklist_confirmaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_confirmaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` varchar(100) NOT NULL,
  `fecha` date NOT NULL,
  `medicamento_id` int NOT NULL,
  `medicamento_nombre` varchar(255) NOT NULL,
  `tomado` tinyint(1) DEFAULT '0',
  `hora_toma` timestamp NULL DEFAULT NULL,
  `actor` varchar(100) DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_check` (`paciente_id`,`fecha`,`medicamento_id`),
  KEY `idx_paciente_fecha` (`paciente_id`,`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklist_confirmaciones`
--

LOCK TABLES `checklist_confirmaciones` WRITE;
/*!40000 ALTER TABLE `checklist_confirmaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `checklist_confirmaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklist_medicamentos`
--

DROP TABLE IF EXISTS `checklist_medicamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_medicamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` varchar(100) NOT NULL,
  `fecha` date NOT NULL,
  `medicamento_id` int NOT NULL,
  `medicamento_nombre` varchar(255) NOT NULL,
  `dosis` varchar(100) DEFAULT NULL,
  `horario` varchar(10) DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paciente_fecha` (`paciente_id`,`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklist_medicamentos`
--

LOCK TABLES `checklist_medicamentos` WRITE;
/*!40000 ALTER TABLE `checklist_medicamentos` DISABLE KEYS */;
INSERT INTO `checklist_medicamentos` VALUES (1,'1 - Paciente Demo','2025-11-04',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-11 03:29:56'),(2,'1 - Paciente Demo','2025-11-04',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-11 03:29:56'),(3,'1 - Paciente Demo','2025-11-04',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-11 03:29:56'),(13,'1 - Juan Pérez','2025-11-04',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-11 03:34:22'),(14,'1 - Juan Pérez','2025-11-04',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-11 03:34:22'),(15,'1 - Juan Pérez','2025-11-04',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-11 03:34:22'),(16,'1 - Paciente Demoss','2025-11-11',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-11 03:38:11'),(17,'1 - Paciente Demoss','2025-11-11',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-11 03:38:11'),(18,'1 - Paciente Demoss','2025-11-11',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-11 03:38:11'),(19,'6 - Paciente Demoss','2025-11-11',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-11 03:39:53'),(20,'6 - Paciente Demoss','2025-11-11',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-11 03:39:53'),(21,'6 - Paciente Demoss','2025-11-11',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-11 03:39:53'),(25,'5 - Alfredo Itrean','2025-11-11',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-11 03:44:07'),(26,'5 - Alfredo Itrean','2025-11-11',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-11 03:44:07'),(27,'5 - Alfredo Itrean','2025-11-11',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-11 03:44:07'),(97,'1 - Paciente David','2025-11-24',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 01:04:22'),(98,'1 - Paciente David','2025-11-24',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 01:04:22'),(99,'1 - Paciente David','2025-11-24',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 01:04:22'),(100,'1 - Paciente David','2025-11-24',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 01:04:22'),(101,'1 - Paciente David','2025-11-24',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 01:04:22'),(102,'1 - Paciente David','2025-11-24',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 01:04:22'),(103,'1 - Paciente David','2025-11-24',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 01:04:23'),(104,'1 - Paciente David','2025-11-24',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 01:04:23'),(105,'1 - Paciente David','2025-11-24',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 01:04:23'),(232,'1 - Paciente David','2025-11-13',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 01:59:31'),(233,'1 - Paciente David','2025-11-13',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 01:59:31'),(234,'1 - Paciente David','2025-11-13',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 01:59:31'),(235,'1 - Paciente alfredor','2025-11-13',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 01:59:57'),(236,'1 - Paciente alfredor','2025-11-13',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 01:59:57'),(237,'1 - Paciente alfredor','2025-11-13',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 01:59:57'),(253,'1 - Paciente Demo','2025-11-13',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 02:36:16'),(254,'1 - Paciente Demo','2025-11-13',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 02:36:16'),(255,'1 - Paciente Demo','2025-11-13',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 02:36:16'),(256,'1 - Paciente Demo','2025-11-13',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 02:36:16'),(257,'1 - Paciente Demo','2025-11-13',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 02:36:16'),(258,'1 - Paciente Demo','2025-11-13',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 02:36:16'),(262,'1 - Paciente Demo','2025-11-25',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 02:37:29'),(263,'1 - Paciente Demo','2025-11-25',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 02:37:29'),(264,'1 - Paciente Demo','2025-11-25',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 02:37:29'),(265,'1 - Paciente Demouu','2025-11-25',1,'Paracetamol 500 mg','1 tableta','08:00','2025-11-25 02:37:48'),(266,'1 - Paciente Demouu','2025-11-25',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-11-25 02:37:48'),(267,'1 - Paciente Demouu','2025-11-25',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-11-25 02:37:48'),(268,'1 - Paciente Demo','2025-12-03',1,'Paracetamol 500 mg','1 tableta','08:00','2025-12-03 20:38:43'),(269,'1 - Paciente Demo','2025-12-03',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-12-03 20:38:43'),(270,'1 - Paciente Demo','2025-12-03',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-12-03 20:38:43'),(271,'1 - Paciente Demo','2025-12-04',1,'Paracetamol 500 mg','1 tableta','08:00','2025-12-04 18:53:07'),(272,'1 - Paciente Demo','2025-12-04',2,'Vitamina D 1000 UI','1 cápsula','12:00','2025-12-04 18:53:07'),(273,'1 - Paciente Demo','2025-12-04',3,'Ibuprofeno 200 mg','1 tableta','20:00','2025-12-04 18:53:07');
/*!40000 ALTER TABLE `checklist_medicamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `citas`
--

DROP TABLE IF EXISTS `citas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `citas` (
  `id_cita` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_paciente` int DEFAULT NULL COMMENT 'Referencia a paciente.id_paciente',
  `fecha_hora` datetime NOT NULL COMMENT 'Fecha y hora de la cita',
  `motivo` varchar(500) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Motivo de la cita',
  `anticipacion_min` int NOT NULL DEFAULT '60' COMMENT 'Minutos antes para notificación',
  `estado` enum('programada','cumplida','cancelada','vencida') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'programada',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cita`),
  KEY `idx_citas_fecha` (`fecha_hora`),
  KEY `idx_citas_estado` (`estado`),
  KEY `fk_citas_paciente` (`id_paciente`),
  CONSTRAINT `fk_citas_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `citas`
--

LOCK TABLES `citas` WRITE;
/*!40000 ALTER TABLE `citas` DISABLE KEYS */;
INSERT INTO `citas` VALUES (11,1,'2025-11-11 20:52:00','dolor de estomago',30,'programada','2025-11-11 20:50:12','2025-11-11 20:50:12'),(12,1,'2025-11-14 16:30:00','control',60,'programada','2025-11-11 21:20:29','2025-11-11 21:20:29'),(16,1,'2025-12-02 19:53:00','fgrg',30,'programada','2025-12-03 01:52:26','2025-12-03 01:52:26'),(17,1,'2025-12-02 20:14:00','consulta con pediatra',30,'programada','2025-12-03 02:13:09','2025-12-03 02:13:09'),(18,1,'2025-12-02 20:15:00','consulta',30,'programada','2025-12-03 02:14:43','2025-12-03 02:14:43'),(19,1,'2025-12-02 20:25:00','dbuy',30,'programada','2025-12-03 02:24:20','2025-12-03 02:24:20'),(20,1,'2025-12-02 20:33:00','ntt',30,'programada','2025-12-03 02:31:18','2025-12-03 02:31:18'),(21,1,'2025-12-02 20:35:00','consulta',30,'programada','2025-12-03 02:35:09','2025-12-03 02:35:09'),(22,1,'2025-12-02 20:47:00','consulta',30,'programada','2025-12-03 02:46:27','2025-12-03 02:46:27'),(27,1,'2025-12-03 11:05:00','vervr - Dr. Carlos Rodríguez - Neurólogo',30,'programada','2025-12-03 17:05:11','2025-12-03 17:05:11'),(28,1,'2025-12-03 11:05:00','vervr - Dr. Carlos Rodríguez - Neurólogo',30,'programada','2025-12-03 17:05:15','2025-12-03 17:05:15'),(29,1,'2025-12-03 11:06:00','dscwe - Dra. María López - Cardióloga',30,'programada','2025-12-03 17:05:50','2025-12-03 17:05:50'),(30,1,'2025-12-03 11:08:00','cq - Dr. Juan Pérez - Médico General',30,'programada','2025-12-03 17:06:12','2025-12-03 17:06:12'),(31,1,'2025-12-03 17:02:00','Consulta con el cardiologo - Dra. María López - Cardióloga',30,'programada','2025-12-03 23:01:15','2025-12-03 23:01:15'),(32,1,'2025-12-03 17:04:00','6n7n - Dra. María López - Cardióloga',30,'programada','2025-12-03 23:02:36','2025-12-03 23:02:36'),(33,1,'2025-12-03 17:08:00','6j787858 - Dr. Luis Hernández - Geriatra',30,'programada','2025-12-03 23:07:56','2025-12-03 23:07:56'),(34,1,'2025-12-03 17:09:00','{p{ - Cuidador Antonio Vargas',30,'programada','2025-12-03 23:08:26','2025-12-03 23:08:26'),(35,1,'2025-12-03 17:11:00','tvb54 - Dr. Luis Hernández - Geriatra',30,'programada','2025-12-03 23:09:06','2025-12-03 23:09:06'),(40,1,'2025-12-03 23:06:00','Medicina General - Dr. Juan Pérez - Médico General',30,'programada','2025-12-04 05:05:10','2025-12-04 05:05:10'),(41,1,'2025-12-03 23:10:00','Medicina General - Dr. Juan Pérez - Médico General',30,'programada','2025-12-04 05:07:52','2025-12-04 05:07:52');
/*!40000 ALTER TABLE `citas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `condicion_medica`
--

DROP TABLE IF EXISTS `condicion_medica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `condicion_medica` (
  `id_condicion` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `nombre_condicion` varchar(100) NOT NULL,
  `nivel` enum('Leve','Moderada','Crítica') NOT NULL,
  PRIMARY KEY (`id_condicion`),
  KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `condicion_medica_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `condicion_medica`
--

LOCK TABLES `condicion_medica` WRITE;
/*!40000 ALTER TABLE `condicion_medica` DISABLE KEYS */;
INSERT INTO `condicion_medica` VALUES (1,1,'diabetes','Moderada'),(2,2,'Diabetes','Leve'),(3,3,'Diabets','Leve'),(4,4,'rrfrfr','Crítica'),(5,5,'eececc','Leve'),(6,6,'rfr','Leve'),(7,7,'gtgt','Leve'),(8,8,'umtym','Leve'),(9,9,'yny','Leve'),(10,10,'v5v','Leve'),(11,11,'Diabetes','Moderada'),(12,12,'h','Moderada'),(13,13,'Diabetes','Moderada'),(14,14,'Diabets','Crítica');
/*!40000 ALTER TABLE `condicion_medica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `confirmaciones_toma`
--

DROP TABLE IF EXISTS `confirmaciones_toma`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `confirmaciones_toma` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_receta` int NOT NULL,
  `nombre_medicamento` varchar(255) NOT NULL,
  `hora_toma` time NOT NULL,
  `fecha_toma` date NOT NULL,
  `notas` text,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_confirmaciones_usuario` (`id_usuario`),
  KEY `idx_confirmaciones_fecha` (`fecha_toma`),
  KEY `idx_confirmaciones_receta` (`id_receta`),
  CONSTRAINT `confirmaciones_toma_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `confirmaciones_toma_ibfk_2` FOREIGN KEY (`id_receta`) REFERENCES `recetas_medicas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `confirmaciones_toma`
--

LOCK TABLES `confirmaciones_toma` WRITE;
/*!40000 ALTER TABLE `confirmaciones_toma` DISABLE KEYS */;
INSERT INTO `confirmaciones_toma` VALUES (40,1,31,'tff','22:47:13','2025-12-04',NULL,'2025-12-04 04:47:14'),(41,1,31,'tff','22:48:52','2025-12-04',NULL,'2025-12-04 04:48:52'),(42,1,31,'tff','23:05:15','2025-12-04',NULL,'2025-12-04 05:05:17'),(43,1,31,'tff','23:07:36','2025-12-04',NULL,'2025-12-04 05:07:37'),(44,1,31,'tff','23:10:55','2025-12-04',NULL,'2025-12-04 05:10:56');
/*!40000 ALTER TABLE `confirmaciones_toma` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contactos_emergencia`
--

DROP TABLE IF EXISTS `contactos_emergencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contactos_emergencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre_contacto` varchar(255) NOT NULL,
  `relacion` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) NOT NULL,
  `tipo` varchar(50) DEFAULT 'familiar',
  `prioridad` int DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `contactos_emergencia_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contactos_emergencia`
--

LOCK TABLES `contactos_emergencia` WRITE;
/*!40000 ALTER TABLE `contactos_emergencia` DISABLE KEYS */;
/*!40000 ALTER TABLE `contactos_emergencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `farmacias`
--

DROP TABLE IF EXISTS `farmacias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `farmacias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `farmacias`
--

LOCK TABLES `farmacias` WRITE;
/*!40000 ALTER TABLE `farmacias` DISABLE KEYS */;
/*!40000 ALTER TABLE `farmacias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_emergencias`
--

DROP TABLE IF EXISTS `historial_emergencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_emergencias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `tipo_activacion` varchar(50) NOT NULL,
  `ubicacion_lat` decimal(10,8) DEFAULT NULL,
  `ubicacion_lng` decimal(11,8) DEFAULT NULL,
  `fecha_hora` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` varchar(50) DEFAULT 'activa',
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `historial_emergencias_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_emergencias`
--

LOCK TABLES `historial_emergencias` WRITE;
/*!40000 ALTER TABLE `historial_emergencias` DISABLE KEYS */;
INSERT INTO `historial_emergencias` VALUES (1,1,'boton',15.27000000,-87.98000000,'2025-12-02 18:54:41','cancelada','Cancelada por el paciente'),(2,1,'boton',15.27000000,-87.98000000,'2025-12-02 19:05:28','cancelada','Cancelada por el paciente'),(3,1,'boton',15.27000000,-87.98000000,'2025-12-02 19:06:47','cancelada','Cancelada por el paciente'),(4,1,'boton',15.27000000,-87.98000000,'2025-12-02 19:27:41','cancelada','qe'),(5,1,'boton',15.27000000,-87.98000000,'2025-12-02 19:32:46','cancelada','gvvgcc'),(6,1,'boton',15.27000000,-87.98000000,'2025-12-02 19:55:15','cancelada','dsvwae'),(7,1,'boton',15.32000000,-87.95000000,'2025-12-03 01:43:12','cancelada','nyn'),(8,1,'boton',15.32000000,-87.95000000,'2025-12-03 01:51:04','cancelada','eabt4tb'),(9,1,'boton',15.32000000,-87.95000000,'2025-12-03 02:13:21','cancelada','uyukyu'),(10,1,'boton',15.32000000,-87.95000000,'2025-12-03 02:25:16','cancelada','nu77j7'),(11,1,'boton',15.32000000,-87.95000000,'2025-12-03 02:32:29','cancelada','ygy'),(12,1,'boton',15.32000000,-87.95000000,'2025-12-03 02:34:29','cancelada','fctucyc'),(13,1,'boton',15.31419200,-87.97119100,'2025-12-03 02:45:35','cancelada','rdrydd65'),(14,1,'boton',15.31361500,-87.97148500,'2025-12-03 02:57:19','cancelada','trhtr'),(15,1,'boton',15.49489025,-88.03186825,'2025-12-03 16:42:01','cancelada','utft'),(16,1,'boton',15.49512643,-88.03186208,'2025-12-03 18:49:01','cancelada','trg4b5b4'),(17,1,'boton',15.31361550,-87.97148400,'2025-12-03 22:59:30','cancelada','hyi'),(18,1,'boton',15.31361550,-87.97148400,'2025-12-03 23:00:08','cancelada','f55f'),(19,1,'boton',15.31361600,-87.97148400,'2025-12-03 23:32:42','cancelada','cr4vt'),(20,1,'boton',15.31361550,-87.97148400,'2025-12-04 01:43:29','cancelada','rshrr'),(21,1,'boton',15.31361550,-87.97148400,'2025-12-04 02:23:50','activa',NULL),(22,1,'boton',15.31361550,-87.97148400,'2025-12-04 02:24:18','cancelada','51151151'),(23,1,'boton',15.31361550,-87.97148400,'2025-12-04 05:05:43','activa',NULL),(24,1,'boton',15.22999640,-87.96787340,'2025-12-04 22:16:16','activa',NULL);
/*!40000 ALTER TABLE `historial_emergencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_notificaciones`
--

DROP TABLE IF EXISTS `historial_notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_notificaciones` (
  `id_historial` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_cita` bigint unsigned NOT NULL COMMENT 'Referencia a citas.id_cita',
  `intento_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Marca temporal del intento de notificación',
  `tipo_notificacion` enum('navegador','email','sms','otro') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'navegador' COMMENT 'Tipo de notificación',
  `resultado` enum('enviada','fallida','omitida') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'enviada' COMMENT 'Resultado del intento',
  `detalle` text COLLATE utf8mb4_general_ci COMMENT 'Mensaje, error o detalle adicional',
  PRIMARY KEY (`id_historial`),
  KEY `idx_hist_cita` (`id_cita`),
  CONSTRAINT `fk_hist_notif_cita` FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id_cita`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_notificaciones`
--

LOCK TABLES `historial_notificaciones` WRITE;
/*!40000 ALTER TABLE `historial_notificaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `cantidad` int NOT NULL,
  `consumo_por_dosis` int NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `inventario_chk_1` CHECK ((`cantidad` >= 0)),
  CONSTRAINT `inventario_chk_2` CHECK ((`consumo_por_dosis` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario`
--

LOCK TABLES `inventario` WRITE;
/*!40000 ALTER TABLE `inventario` DISABLE KEYS */;
INSERT INTO `inventario` VALUES (1,'ibuprofeno',3,1,'2025-10-29 18:06:21'),(2,'Loratadina',2,1,'2025-10-29 19:57:42'),(3,'Ibuprofeno',4,3,'2025-11-08 22:47:47'),(4,'evet',4,2,'2025-11-10 03:26:19'),(5,'rvr',2,2,'2025-11-10 03:42:34'),(6,'f5tv5t',2,3,'2025-11-10 21:44:23'),(7,'fwrf',2,1,'2025-11-11 02:09:33'),(8,'ddd',2,1,'2025-11-11 04:40:39'),(9,'Ibuprofeno',3,3,'2025-11-11 20:51:09'),(10,'ibuprofeno',2,2,'2025-11-25 01:33:14'),(11,'ibuprofrno',2,2,'2025-11-25 01:38:40'),(12,'Ibuprofeno',2,2,'2025-12-02 18:47:14');
/*!40000 ALTER TABLE `inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logros`
--

DROP TABLE IF EXISTS `logros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `tipo_logro` varchar(100) NOT NULL,
  `descripcion` text NOT NULL,
  `puntos_ganados` int DEFAULT '0',
  `fecha_obtenido` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `logros_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logros`
--

LOCK TABLES `logros` WRITE;
/*!40000 ALTER TABLE `logros` DISABLE KEYS */;
INSERT INTO `logros` VALUES (1,1,'medicamento_tomado','Tomaste h45',10,'2025-12-03 02:44:30'),(2,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 02:44:48'),(3,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 02:45:21'),(4,1,'medicamento_tomado','Tomaste parectamol',10,'2025-12-03 02:53:42'),(5,1,'medicamento_tomado','Tomaste parectamol',10,'2025-12-03 02:57:09'),(6,1,'medicamento_tomado','Tomaste parectamol',10,'2025-12-03 16:41:27'),(7,1,'medicamento_tomado','Tomaste parectamol',10,'2025-12-03 16:41:37'),(8,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 17:20:54'),(9,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 17:21:33'),(10,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 17:31:39'),(11,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 17:31:53'),(12,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 17:35:07'),(13,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 18:05:43'),(14,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 18:07:41'),(15,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 18:33:00'),(16,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 18:40:14'),(17,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 18:42:56'),(18,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 18:44:33'),(19,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 18:46:35'),(20,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 18:48:36'),(21,1,'medicamento_tomado','Tomaste paracetamol',10,'2025-12-03 23:03:29'),(22,1,'medicamento_tomado','Tomaste tff',10,'2025-12-03 23:07:24'),(23,1,'medicamento_tomado','Tomaste Paracetamol',10,'2025-12-03 23:09:20'),(24,1,'medicamento_tomado','Tomaste Paracetamol',10,'2025-12-03 23:14:45'),(25,1,'medicamento_tomado','Tomaste Paracetamol',10,'2025-12-03 23:20:22'),(26,1,'medicamento_tomado','Tomaste Paracetamol',10,'2025-12-03 23:21:35'),(27,1,'medicamento_tomado','Tomaste Paracetamol',10,'2025-12-03 23:22:05'),(28,1,'medicamento_tomado','Tomaste paracte',10,'2025-12-04 00:51:46'),(29,1,'medicamento_tomado','Tomaste paracte',10,'2025-12-04 00:54:06'),(30,1,'medicamento_tomado','Tomaste paracte',10,'2025-12-04 00:56:34'),(31,1,'medicamento_tomado','Tomaste parcetamol',10,'2025-12-04 02:13:34'),(32,1,'medicamento_tomado','Tomaste parcetamol',10,'2025-12-04 02:17:37'),(33,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 02:20:03'),(34,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 02:22:06'),(35,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 02:23:07'),(36,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 04:47:14'),(37,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 04:48:53'),(38,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 05:05:20'),(39,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 05:07:39'),(40,1,'medicamento_tomado','Tomaste tff',10,'2025-12-04 05:10:56');
/*!40000 ALTER TABLE `logros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medallas_usuario`
--

DROP TABLE IF EXISTS `medallas_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medallas_usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre_medalla` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `icono` varchar(50) DEFAULT NULL,
  `fecha_obtenida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `medallas_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medallas_usuario`
--

LOCK TABLES `medallas_usuario` WRITE;
/*!40000 ALTER TABLE `medallas_usuario` DISABLE KEYS */;
/*!40000 ALTER TABLE `medallas_usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medicamentos`
--

DROP TABLE IF EXISTS `medicamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `dosis` varchar(50) NOT NULL,
  `frecuencia` int NOT NULL,
  `hora` time NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `paciente_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_medicamento_paciente` (`paciente_id`),
  CONSTRAINT `fk_medicamento_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `paciente` (`id_paciente`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medicamentos`
--

LOCK TABLES `medicamentos` WRITE;
/*!40000 ALTER TABLE `medicamentos` DISABLE KEYS */;
INSERT INTO `medicamentos` VALUES (1,'paracetamol','500mg',4,'21:23:00','2025-10-23 00:22:14',1),(2,'para','500mg',4,'12:31:00','2025-10-23 00:22:41',2),(3,'paltamol','230',6,'10:23:00','2025-10-23 22:13:37',2),(4,'paracetamol','400mg',4,'23:12:00','2025-10-26 19:42:40',2),(5,'d}','23',8,'12:12:00','2025-11-04 21:42:59',1),(6,'d}','23',8,'12:12:00','2025-11-04 21:42:59',2),(7,'pala','400',6,'12:42:00','2025-11-04 21:44:04',2),(8,'prueba','400',4,'20:32:00','2025-11-04 21:50:29',1),(9,'jtyt','65',4,'07:59:00','2025-11-04 21:50:51',3),(10,'prueba2','200mg',6,'12:31:00','2025-11-04 21:54:58',4),(11,'ef','123',4,'12:31:00','2025-11-04 22:06:38',3),(12,'wesfgw','123',4,'12:23:00','2025-11-04 22:06:48',4),(13,'prueba','300mg',6,'12:43:00','2025-11-04 22:12:35',4),(14,'paltamol','400mg',4,'12:31:00','2025-11-04 23:00:26',5),(15,'prueba','230mg',6,'12:31:00','2025-11-04 23:20:33',5),(16,'wed','12',6,'12:01:00','2025-11-04 23:21:47',2),(17,'wefw','123',6,'12:22:00','2025-11-04 23:21:54',3),(18,'wf','321',6,'12:13:00','2025-11-04 23:24:32',4),(19,'qd','dq',4,'12:21:00','2025-11-04 23:35:34',3),(20,'qw','qw',4,'12:03:00','2025-11-04 23:39:16',5),(21,'hbjhi','760mg',6,'18:19:00','2025-11-05 00:16:45',5),(22,'prueba29','10mg',12,'12:31:00','2025-11-05 01:03:26',5),(23,'dwedf','240mg',6,'12:31:00','2025-11-05 04:58:43',3),(24,'prueba','200mg',4,'12:03:00','2025-12-04 21:09:00',3),(25,'prueba2','200mg',24,'12:03:00','2025-12-04 21:19:10',2),(26,'prueba3','500mg',2,'12:31:00','2025-12-04 21:19:35',3);
/*!40000 ALTER TABLE `medicamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paciente`
--

DROP TABLE IF EXISTS `paciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paciente` (
  `id_paciente` int NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id_paciente`),
  KEY `fk_paciente_usuario` (`usuario_id`),
  CONSTRAINT `fk_paciente_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paciente`
--

LOCK TABLES `paciente` WRITE;
/*!40000 ALTER TABLE `paciente` DISABLE KEYS */;
INSERT INTO `paciente` VALUES (1,'Itrean','2025-10-30','2025-10-30 18:32:38',3),(2,'john','2025-11-14','2025-11-03 03:34:56',3),(3,'Alfredo Perez','2006-01-08','2025-11-08 23:10:16',1),(4,'ctcyed eeh','2025-11-09','2025-11-10 04:01:04',3),(5,'vvweewv','2025-11-09','2025-11-10 04:14:51',1),(6,'hdhcew','2025-11-22','2025-11-10 05:16:39',1),(7,'Juan Perez','2025-11-11','2025-11-10 20:48:05',3),(8,'Juan Perez','2025-11-29','2025-11-10 20:53:39',1),(9,'Juan Perez','2025-11-14','2025-11-10 21:24:27',3),(10,'4rf4','2025-11-16','2025-11-10 21:44:34',3),(11,'Juan Perez','2025-11-10','2025-11-11 04:19:47',6),(12,'Juan Perez','2025-11-13','2025-11-11 07:04:37',1),(13,'Juan Perez','2025-11-14','2025-11-11 07:31:22',6),(14,'Juan Perez','2025-11-15','2025-11-11 20:50:55',1),(15,'juan perez','1994-12-03','2025-12-03 06:52:34',6),(16,'robertson Eli Hernandez','1994-03-19','2025-12-04 18:22:58',6);
/*!40000 ALTER TABLE `paciente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedido_medicamentos`
--

DROP TABLE IF EXISTS `pedido_medicamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_medicamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `nombre_medicamento` varchar(150) NOT NULL,
  `dosis` varchar(50) DEFAULT NULL,
  `cantidad` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pedido_id` (`pedido_id`),
  CONSTRAINT `pedido_medicamentos_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedido_medicamentos`
--

LOCK TABLES `pedido_medicamentos` WRITE;
/*!40000 ALTER TABLE `pedido_medicamentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedido_medicamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `farmacia_id` int NOT NULL,
  `notas` text,
  `receta_path` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `farmacia_id` (`farmacia_id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos_farmacia`
--

DROP TABLE IF EXISTS `pedidos_farmacia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos_farmacia` (
  `id` varchar(50) NOT NULL,
  `farmacia` varchar(255) NOT NULL,
  `notas` text,
  `estado` varchar(50) DEFAULT 'Pendiente',
  `fecha_creacion` datetime NOT NULL,
  `id_usuario` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  KEY `idx_pedido_fecha` (`fecha_creacion`),
  KEY `idx_pedido_estado` (`estado`),
  CONSTRAINT `pedidos_farmacia_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos_farmacia`
--

LOCK TABLES `pedidos_farmacia` WRITE;
/*!40000 ALTER TABLE `pedidos_farmacia` DISABLE KEYS */;
INSERT INTO `pedidos_farmacia` VALUES ('P-migiaupy','Farmacia Kielsa','Horario','Pendiente','2025-11-26 21:18:10',1),('P-migiidxj','Farmacia El Ahorro','horario','Pendiente','2025-11-26 21:24:01',1),('P-migilm60','Farmacia Siman','entregar a la resepcionista','Pendiente','2025-11-26 21:26:32',1);
/*!40000 ALTER TABLE `pedidos_farmacia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos_items`
--

DROP TABLE IF EXISTS `pedidos_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` varchar(50) NOT NULL,
  `nombre_medicamento` varchar(255) NOT NULL,
  `dosis` varchar(100) NOT NULL,
  `cantidad` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_items_pedido` (`pedido_id`),
  CONSTRAINT `pedidos_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_farmacia` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos_items`
--

LOCK TABLES `pedidos_items` WRITE;
/*!40000 ALTER TABLE `pedidos_items` DISABLE KEYS */;
INSERT INTO `pedidos_items` VALUES (11,'P-migiaupy','Parectamol','500',1),(12,'P-migiidxj','parecetamol','200',1),(13,'P-migilm60','iboprofeno','200 ml',1);
/*!40000 ALTER TABLE `pedidos_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recetas_medicas`
--

DROP TABLE IF EXISTS `recetas_medicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recetas_medicas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre_medicamento` varchar(255) NOT NULL,
  `dosis` varchar(100) NOT NULL,
  `frecuencia` varchar(100) NOT NULL,
  `archivo_url` varchar(500) DEFAULT NULL,
  `fecha_subida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `recetas_medicas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas_medicas`
--

LOCK TABLES `recetas_medicas` WRITE;
/*!40000 ALTER TABLE `recetas_medicas` DISABLE KEYS */;
INSERT INTO `recetas_medicas` VALUES (31,1,'tff','500','cada 3 minutos',NULL,'2025-12-04 04:45:28');
/*!40000 ALTER TABLE `recetas_medicas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recompensas`
--

DROP TABLE IF EXISTS `recompensas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recompensas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `puntos_totales` int DEFAULT '0',
  `medallas` int DEFAULT '0',
  `nivel` int DEFAULT '1',
  `porcentaje_cumplimiento` decimal(5,2) DEFAULT '0.00',
  `racha_dias` int DEFAULT '0',
  `ultima_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `recompensas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recompensas`
--

LOCK TABLES `recompensas` WRITE;
/*!40000 ALTER TABLE `recompensas` DISABLE KEYS */;
INSERT INTO `recompensas` VALUES (1,1,400,0,1,100.00,40,'2025-12-04 05:10:56');
/*!40000 ALTER TABLE `recompensas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `identidad` varchar(13) NOT NULL,
  `telefono` varchar(8) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `rol` enum('usuario','empleado','administrador') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `identidad` (`identidad`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'administrador','admin','123456789','999999','admin@gmail.com','admin123','administrador'),(2,'mario','josee','1803200202309','12345678','jdmenjivar@unah.hn','palta123','usuario'),(3,'Hugo','perez','1023022010203','12341234','hugo@yahoo.es','hugo123','empleado'),(4,'jhony','carvajal','3902100429312','87654321','jhony@hotmail.com','prueba','administrador'),(5,'robery','prueba','0505199900706','88888888','eli@gmail.com','prueba123','usuario'),(6,'robertson','hernandez','0505199400706','88888888','robersonhernandez1@gmail.com','prueba1234','usuario'),(36,'alfredo','perez','1236555848848','33477747','Itreanperez44@gmail.com','7890','usuario'),(43,'prueba','prueba','1290200201993','12341234','prueba@gmail.com','prueba','usuario'),(54,'jose','montes','1093200201932','12341234','palta@gmail.com','hugo123','administrador'),(66,'marcos','josue carlos','0404199700706','88888888','eliarmas@gmail.com','prueba123','usuario'),(67,'prueba1234','prueba1234','1804200201492','12341234','hugo@gmail.es','prueba','usuario'),(68,'probando123','probando123','1804200301494','12341234','prueba@yahoo.com','prueba','usuario');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-30 15:26:53

