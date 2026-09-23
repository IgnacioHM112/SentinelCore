-- Migración 001: Fundación - Tablas nuevas y columnas adicionales
-- Ejecutar: mysql -u root -p brujula_db < backend/migrations/001_fundacion.sql

-- 1. Tabla: vigilador_restricciones
CREATE TABLE IF NOT EXISTS `vigilador_restricciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_vigilador` INT NOT NULL,
  `tipo` ENUM('puesto','turno','dia_semana','fecha_especifica') NOT NULL,
  `valor` VARCHAR(255) NOT NULL,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_vigilador`) REFERENCES `vigiladores`(`id`) ON DELETE CASCADE,
  INDEX `idx_vigilador_tipo` (`id_vigilador`, `tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Tabla: novedades
CREATE TABLE IF NOT EXISTS `novedades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_vigilador` INT NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `tipo` ENUM('vacaciones','enfermedad','ausencia_aviso','suspension','franco','tardanza') NOT NULL,
  `horas_a_recuperar` DECIMAL(5,2) DEFAULT 0,
  `observaciones` TEXT,
  `creado_por` INT NOT NULL,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_vigilador`) REFERENCES `vigiladores`(`id`) ON DELETE CASCADE,
  INDEX `idx_vigilador_fecha` (`id_vigilador`, `fecha_inicio`, `fecha_fin`),
  INDEX `idx_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Tabla: presentismo
CREATE TABLE IF NOT EXISTS `presentismo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_asignacion` INT NOT NULL,
  `id_vigilador` INT NOT NULL,
  `fecha` DATE NOT NULL,
  `hora_entrada_programada` TIME NOT NULL,
  `hora_salida_programada` TIME NOT NULL,
  `hora_entrada_real` TIME NULL,
  `hora_salida_real` TIME NULL,
  `asistio` BOOLEAN DEFAULT TRUE,
  `novedad_tipo` ENUM('vacaciones','enfermedad','ausencia_aviso','suspension','franco','tardanza','salida_temprana') NULL,
  `horas_extra_anterior` DECIMAL(5,2) DEFAULT 0,
  `visita_jefe` BOOLEAN DEFAULT FALSE,
  `confirmado_por` INT NULL,
  `confirmado_en` TIMESTAMP NULL,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_asignacion`) REFERENCES `asignaciones_cronograma`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`id_vigilador`) REFERENCES `vigiladores`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_asignacion` (`id_asignacion`),
  INDEX `idx_vigilador_fecha` (`id_vigilador`, `fecha`),
  INDEX `idx_fecha_confirmado` (`fecha`, `confirmado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Tabla: auditoria
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `accion` VARCHAR(50) NOT NULL,
  `entidad` VARCHAR(50) NOT NULL,
  `id_entidad` INT NOT NULL,
  `antes` JSON NULL,
  `despues` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_usuario_fecha` (`usuario_id`, `creado_en`),
  INDEX `idx_entidad` (`entidad`, `id_entidad`),
  INDEX `idx_fecha` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Columnas nuevas en turnos_config
ALTER TABLE `turnos_config` 
  ADD COLUMN `es_nocturno` BOOLEAN DEFAULT FALSE AFTER `duracion_horas`,
  ADD COLUMN `recargo_porcentaje` DECIMAL(5,2) DEFAULT 0 AFTER `es_nocturno`;

-- 6. Columnas nuevas en vigiladores
ALTER TABLE `vigiladores` 
  ADD COLUMN `id_objetivo_preferido` INT NULL AFTER `activo`,
  ADD COLUMN `google_id` VARCHAR(255) NULL AFTER `id_objetivo_preferido`,
  ADD COLUMN `email` VARCHAR(255) NULL AFTER `google_id`,
  ADD INDEX `idx_google_id` (`google_id`),
  ADD INDEX `idx_objetivo_preferido` (`id_objetivo_preferido`);

-- 7. Tabla: usuarios (para auth propio + google)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `google_id` VARCHAR(255) NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `rol` ENUM('admin','encargado') DEFAULT 'admin',
  `activo` BOOLEAN DEFAULT TRUE,
  `ultimo_login` TIMESTAMP NULL,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_google_id` (`google_id`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Actualizar turnos_config existentes: calcular es_nocturno (21:00-06:00)
UPDATE `turnos_config` SET 
  `es_nocturno` = CASE 
    WHEN `hora_inicio` >= '21:00:00' THEN TRUE
    WHEN `hora_fin` <= '06:00:00' THEN TRUE
    WHEN `hora_fin` <= `hora_inicio` AND (`hora_inicio` >= '21:00:00' OR `hora_fin` <= '06:00:00') THEN TRUE
    ELSE FALSE
  END;