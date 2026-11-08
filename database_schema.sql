-- =============================================================================
-- ESQUEMA DE BASE DE DATOS SQL - MOVEXA TRANSPORTE & PAQUETERÍA EXPRESS
-- Ruta: Teziutlán ↔ Puebla (Parque Puebla & Plaza Dorada)
-- Motor compatible: PostgreSQL 12+ / Supabase
-- =============================================================================

DROP TABLE IF EXISTS reservaciones CASCADE;
DROP TABLE IF EXISTS viajes_diarios CASCADE;
DROP TABLE IF EXISTS pasajeros CASCADE;
DROP TABLE IF EXISTS corridas CASCADE;
DROP TABLE IF EXISTS paradas CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;

-- 1. TABLA DE UNIDADES (CAMIONETAS TIPO URBAN)
CREATE TABLE unidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,              -- ej. 'Urvan 1 (MOVEXA)', 'Urvan 2 (MOVEXA)'
    placas VARCHAR(20) UNIQUE NOT NULL,       -- Placas vehiculares
    capacidad INT NOT NULL DEFAULT 14,        -- Capacidad de pasajeros
    distribucion_json JSONB NOT NULL,         -- Layout de distribución de asientos
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PARADAS AUTORIZADAS
CREATE TABLE paradas (
    id SERIAL PRIMARY KEY,
    ciudad VARCHAR(50) NOT NULL,              -- 'Puebla' o 'Teziutlán'
    nombre_parada VARCHAR(100) NOT NULL,      -- 'Parque Puebla', 'Plaza Dorada'
    referencia VARCHAR(255),                  
    orden_ruta INT NOT NULL,                  -- Secuencia geográfica
    activa BOOLEAN DEFAULT TRUE
);

-- 3. TABLA DE CORRIDAS (HORARIOS HABITUALES MOVEXA)
CREATE TABLE corridas (
    id SERIAL PRIMARY KEY,
    origen VARCHAR(50) NOT NULL,              -- 'Teziutlán' o 'Puebla'
    destino VARCHAR(50) NOT NULL,             -- 'Puebla' o 'Teziutlán'
    hora_salida TIME NOT NULL,                -- ej. '05:00:00'
    activa BOOLEAN DEFAULT TRUE
);

-- 4. TABLA DE PASAJEROS
CREATE TABLE pasajeros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    whatsapp_id VARCHAR(50) UNIQUE,
    messenger_id VARCHAR(50) UNIQUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE VIAJES DIARIOS
CREATE TABLE viajes_diarios (
    id SERIAL PRIMARY KEY,
    corrida_id INT NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
    unidad_id INT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    chofer_nombre VARCHAR(100) DEFAULT 'Chofer Asignado',
    estatus VARCHAR(20) DEFAULT 'PROGRAMADO',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(corrida_id, fecha)
);

-- 6. TABLA DE RESERVACIONES
CREATE TABLE reservaciones (
    id SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(20) UNIQUE NOT NULL,
    viaje_id INT NOT NULL REFERENCES viajes_diarios(id) ON DELETE CASCADE,
    pasajero_id INT NOT NULL REFERENCES pasajeros(id) ON DELETE RESTRICT,
    numero_asiento INT NOT NULL,
    parada_descenso_id INT REFERENCES paradas(id) ON DELETE RESTRICT,
    codigo_qr_token TEXT NOT NULL,
    estatus_pago VARCHAR(20) DEFAULT 'PENDIENTE',
    estatus_abordaje VARCHAR(20) DEFAULT 'NO_ABORDADO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(viaje_id, numero_asiento)
);

CREATE INDEX idx_reservaciones_viaje ON reservaciones(viaje_id);
CREATE INDEX idx_viajes_fecha ON viajes_diarios(fecha);
CREATE INDEX idx_pasajeros_wa ON pasajeros(whatsapp_id);

-- DATOS SEMILLA MOVEXA
INSERT INTO unidades (nombre, placas, capacidad, distribucion_json) VALUES
('Urvan 1 MOVEXA', 'TXZ-101-A', 14, '{
    "filas": 5,
    "asientos": [
        {"numero": 1, "posicion": "Copiloto"},
        {"numero": 2, "posicion": "Fila 2 - Izq"}, {"numero": 3, "posicion": "Fila 2 - Centro"}, {"numero": 4, "posicion": "Fila 2 - Der Ventana"},
        {"numero": 5, "posicion": "Fila 3 - Izq"}, {"numero": 6, "posicion": "Fila 3 - Der Ventana"},
        {"numero": 7, "posicion": "Fila 4 - Izq"}, {"numero": 8, "posicion": "Fila 4 - Der Ventana"},
        {"numero": 9, "posicion": "Fila 5 - Izq"}, {"numero": 10, "posicion": "Fila 5 - Centro"}, {"numero": 11, "posicion": "Fila 5 - Der Ventana"},
        {"numero": 12, "posicion": "Fila 6 - Izq"}, {"numero": 13, "posicion": "Fila 6 - Centro"}, {"numero": 14, "posicion": "Fila 6 - Der Ventana"}
    ]
}'::jsonb),
('Urvan 2 MOVEXA', 'TXZ-202-B', 14, '{
    "filas": 5,
    "asientos": [
        {"numero": 1, "posicion": "Copiloto"},
        {"numero": 2, "posicion": "Fila 2 - Izq"}, {"numero": 3, "posicion": "Fila 2 - Centro"}, {"numero": 4, "posicion": "Fila 2 - Der Ventana"},
        {"numero": 5, "posicion": "Fila 3 - Izq"}, {"numero": 6, "posicion": "Fila 3 - Der Ventana"},
        {"numero": 7, "posicion": "Fila 4 - Izq"}, {"numero": 8, "posicion": "Fila 4 - Der Ventana"},
        {"numero": 9, "posicion": "Fila 5 - Izq"}, {"numero": 10, "posicion": "Fila 5 - Centro"}, {"numero": 11, "posicion": "Fila 5 - Der Ventana"},
        {"numero": 12, "posicion": "Fila 6 - Izq"}, {"numero": 13, "posicion": "Fila 6 - Centro"}, {"numero": 14, "posicion": "Fila 6 - Der Ventana"}
    ]
}'::jsonb);

-- PARADAS OFICIALES MOVEXA
INSERT INTO paradas (ciudad, nombre_parada, referencia, orden_ruta) VALUES
('Puebla', 'Parque Puebla', 'Plaza Comercial Parque Puebla (Calzada Zaragoza)', 1),
('Puebla', 'Plaza Dorada', 'Plaza Comercial Plaza Dorada (Bulevar 5 de Mayo)', 2),
('Teziutlán', 'Terminal Teziutlán', 'Terminal MOVEXA Teziutlán', 1);

-- HORARIOS OFICIALES LUNES A SÁBADO MOVEXA
INSERT INTO corridas (origen, destino, hora_salida) VALUES
-- Teziutlán -> Puebla
('Teziutlán', 'Puebla', '05:00:00'),
('Teziutlán', 'Puebla', '08:00:00'),
('Teziutlán', 'Puebla', '11:00:00'),
('Teziutlán', 'Puebla', '20:00:00'),
-- Puebla -> Teziutlán
('Puebla', 'Teziutlán', '05:00:00'),
('Puebla', 'Teziutlán', '08:00:00'),
('Puebla', 'Teziutlán', '11:00:00'),
('Puebla', 'Teziutlán', '14:00:00'),
('Puebla', 'Teziutlán', '17:00:00'),
('Puebla', 'Teziutlán', '20:00:00');

CREATE OR REPLACE FUNCTION obtener_asientos_ocupados(p_viaje_id INT)
RETURNS TABLE(numero_asiento INT, estatus_pago VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT r.numero_asiento, r.estatus_pago
    FROM reservaciones r
    WHERE r.viaje_id = p_viaje_id;
END;
$$ LANGUAGE plpgsql;