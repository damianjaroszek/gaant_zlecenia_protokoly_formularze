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
