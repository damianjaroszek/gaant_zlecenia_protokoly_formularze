-- Schemat dla aplikacji (oddzielony od ERP)
CREATE SCHEMA IF NOT EXISTS app_produkcja;

-- Tabela użytkowników
CREATE TABLE IF NOT EXISTS app_produkcja.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela sesji (dla express-session)
CREATE TABLE IF NOT EXISTS app_produkcja.sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON app_produkcja.sessions (expire);

-- Przykładowy użytkownik testowy (hasło: test123)
-- INSERT INTO app_produkcja.users (username, password_hash, display_name)
-- VALUES ('admin', '$2b$10$...', 'Administrator');

-- Tabela linii produkcyjnych
CREATE TABLE IF NOT EXISTS app_produkcja.production_lines (
    id SERIAL PRIMARY KEY,
    line_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domyślne linie produkcyjne
INSERT INTO app_produkcja.production_lines (line_number, name, is_active, display_order)
VALUES
    (1, 'Linia 1', true, 1),
    (2, 'Linia 2', true, 2),
    (3, 'Linia 3', true, 3),
    (33, 'Linia 33', true, 4),
    (4, 'Linia 4', true, 5),
    (44, 'Linia 44', true, 6),
    (5, 'Linia 5', true, 7),
    (7, 'Linia 7', true, 8)
ON CONFLICT (line_number) DO NOTHING;
