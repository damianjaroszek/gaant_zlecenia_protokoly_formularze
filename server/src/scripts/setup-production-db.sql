-- ============================================================================
-- KOMPLETNA KONFIGURACJA BAZY POSTGRESQL DLA APLIKACJI PRODUKCJA
-- ============================================================================
--
-- INSTRUKCJA WYKONANIA:
-- 1. Zaloguj się do PostgreSQL jako superuser (np. postgres)
-- 2. Wykonaj KROK 1 (tworzenie bazy i użytkownika) - wymaga uprawnień superuser
-- 3. Połącz się z nową bazą danych
-- 4. Wykonaj KROKI 2-5 jako superuser lub właściciel bazy
--
-- UWAGA: Przed wykonaniem zmień wartości oznaczone jako [ZMIEN]:
--   - Nazwa bazy danych (domyślnie: produkcja_db)
--   - Hasło użytkownika bazodanowego (domyślnie: TwojeHasloBazodanowe123!)
--   - Hasło administratora aplikacji (domyślnie: AdminHaslo123!)
--
-- ============================================================================

-- ============================================================================
-- KROK 1: TWORZENIE BAZY DANYCH I UŻYTKOWNIKA POSTGRESQL
-- ============================================================================
-- Wykonaj jako superuser (postgres)
-- Połącz się: psql -U postgres

-- [ZMIEN] Ustaw nazwę bazy i hasło użytkownika
-- Utwórz użytkownika aplikacji
CREATE USER produkcja_app_user WITH PASSWORD 'TwojeHasloBazodanowe123!';

-- Utwórz bazę danych
CREATE DATABASE produkcja_db
    WITH OWNER = produkcja_app_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'pl_PL.UTF-8'
    LC_CTYPE = 'pl_PL.UTF-8'
    TEMPLATE = template0;

-- Jeśli masz problemy z locale, użyj:
-- CREATE DATABASE produkcja_db
--     WITH OWNER = produkcja_app_user
--     ENCODING = 'UTF8';

-- ============================================================================
-- KROK 2: POŁĄCZ SIĘ Z NOWĄ BAZĄ I WYKONAJ RESZTĘ
-- ============================================================================
-- psql -U postgres -d produkcja_db
-- LUB w pgAdmin: połącz się z bazą produkcja_db

-- Nadaj uprawnienia użytkownikowi
GRANT ALL PRIVILEGES ON DATABASE produkcja_db TO produkcja_app_user;

-- ============================================================================
-- KROK 3: TWORZENIE SCHEMATU I TABEL
-- ============================================================================

-- Schemat aplikacji (oddzielony od innych schematów)
CREATE SCHEMA IF NOT EXISTS app_produkcja;

-- Nadaj uprawnienia do schematu
GRANT ALL ON SCHEMA app_produkcja TO produkcja_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_produkcja
    GRANT ALL ON TABLES TO produkcja_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_produkcja
    GRANT ALL ON SEQUENCES TO produkcja_app_user;

-- -----------------------------------------------------------------------------
-- Tabela użytkowników
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_produkcja.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Tabela sesji (wymagana przez express-session z connect-pg-simple)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_produkcja.sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire
    ON app_produkcja.sessions (expire);

-- -----------------------------------------------------------------------------
-- Tabela linii produkcyjnych
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_produkcja.production_lines (
    id SERIAL PRIMARY KEY,
    line_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Tabela przypisań użytkowników do linii (RBAC)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_produkcja.user_line_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_produkcja.users(id) ON DELETE CASCADE,
    line_id INTEGER NOT NULL REFERENCES app_produkcja.production_lines(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, line_id)
);

CREATE INDEX IF NOT EXISTS idx_user_line_access_user
    ON app_produkcja.user_line_access (user_id);
CREATE INDEX IF NOT EXISTS idx_user_line_access_line
    ON app_produkcja.user_line_access (line_id);

-- ============================================================================
-- KROK 4: WSTAWIENIE DANYCH POCZĄTKOWYCH
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Domyślne linie produkcyjne
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Użytkownik administrator
-- -----------------------------------------------------------------------------
-- [ZMIEN] Hasło admina poniżej to: AdminHaslo123!
-- Hash wygenerowany przez bcrypt (10 rund)
-- Aby wygenerować nowy hash, użyj: npx tsx src/scripts/add-user.ts admin TwojeHaslo

INSERT INTO app_produkcja.users (username, password_hash, display_name, is_active, is_admin)
VALUES (
    'admin',
    '$2b$10$Y6ZOEuF6ipVuN6GuGm9zcOrr2dt2UrHk3TGV438IuvXemAxwDfK0q',
    'Administrator',
    true,
    true
)
ON CONFLICT (username) DO UPDATE SET
    is_admin = true,
    is_active = true;

-- ============================================================================
-- KROK 5: PRZYPISANIE ADMINISTRATORA DO WSZYSTKICH LINII
-- ============================================================================

-- Przypisz admina do wszystkich aktywnych linii produkcyjnych
INSERT INTO app_produkcja.user_line_access (user_id, line_id)
SELECT u.id, pl.id
FROM app_produkcja.users u
CROSS JOIN app_produkcja.production_lines pl
WHERE u.username = 'admin' AND pl.is_active = true
ON CONFLICT (user_id, line_id) DO NOTHING;

-- ============================================================================
-- KROK 6: NADANIE UPRAWNIEŃ KOŃCOWYCH
-- ============================================================================

-- Upewnij się, że użytkownik aplikacji ma wszystkie uprawnienia
GRANT USAGE ON SCHEMA app_produkcja TO produkcja_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_produkcja TO produkcja_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_produkcja TO produkcja_app_user;

-- ============================================================================
-- WERYFIKACJA - SPRAWDŹ CZY WSZYSTKO DZIAŁA
-- ============================================================================

-- Sprawdź utworzone tabele
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'app_produkcja' ORDER BY table_name;

-- Sprawdź użytkownika admin
SELECT id, username, display_name, is_active, is_admin FROM app_produkcja.users;

-- Sprawdź linie produkcyjne
SELECT id, line_number, name, is_active FROM app_produkcja.production_lines ORDER BY display_order;

-- Sprawdź przypisania linii do admina
SELECT u.username, pl.name as linia
FROM app_produkcja.user_line_access ula
JOIN app_produkcja.users u ON u.id = ula.user_id
JOIN app_produkcja.production_lines pl ON pl.id = ula.line_id
WHERE u.username = 'admin';

-- ============================================================================
-- KONFIGURACJA .env DLA APLIKACJI
-- ============================================================================
-- Po wykonaniu powyższych kroków, ustaw w pliku server/.env:
--
-- DB_HOST=adres_serwera_postgresql
-- DB_PORT=5432
-- DB_NAME=produkcja_db
-- DB_USER=produkcja_app_user
-- DB_PASSWORD=TwojeHasloBazodanowe123!
--
-- ============================================================================

-- ============================================================================
-- WAŻNE: ZMIANA HASŁA ADMINISTRATORA
-- ============================================================================
-- Powyższy hash to przykładowe hasło. Po pierwszym uruchomieniu aplikacji
-- ZMIEŃ hasło admina używając panelu administracyjnego lub:
--
-- cd server
-- npx tsx src/scripts/add-user.ts admin NoweHaslo123! "Administrator" --admin
--
-- Lub zresetuj hasło przez endpoint API po zalogowaniu.
-- ============================================================================
