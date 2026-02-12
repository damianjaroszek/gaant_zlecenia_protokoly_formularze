-- ============================================================
-- SKRYPT: Tworzenie użytkownika z minimalnymi uprawnieniami
-- dla aplikacji produkcja-app
-- ============================================================

-- 1. Utwórz użytkownika (zmień hasło na bezpieczne!)
CREATE USER produkcja_app_user WITH PASSWORD 'ZMIEN_NA_BEZPIECZNE_HASLO';

-- 2. Odmów domyślnych uprawnień
REVOKE ALL ON DATABASE nazwa_bazy FROM produkcja_app_user;
REVOKE ALL ON SCHEMA public FROM produkcja_app_user;

-- ============================================================
-- SCHEMAT app_produkcja (tabele aplikacji)
-- ============================================================

-- Dostęp do schematu
GRANT USAGE ON SCHEMA app_produkcja TO produkcja_app_user;

-- Tabela: users
GRANT SELECT, INSERT, UPDATE ON app_produkcja.users TO produkcja_app_user;
GRANT USAGE, SELECT ON SEQUENCE app_produkcja.users_id_seq TO produkcja_app_user;

-- Tabela: sessions (express-session)
GRANT SELECT, INSERT, UPDATE, DELETE ON app_produkcja.sessions TO produkcja_app_user;

-- Tabela: production_lines
GRANT SELECT, INSERT, UPDATE, DELETE ON app_produkcja.production_lines TO produkcja_app_user;
GRANT USAGE, SELECT ON SEQUENCE app_produkcja.production_lines_id_seq TO produkcja_app_user;

-- Tabela: user_line_access
GRANT SELECT, INSERT, DELETE ON app_produkcja.user_line_access TO produkcja_app_user;
GRANT USAGE, SELECT ON SEQUENCE app_produkcja.user_line_access_id_seq TO produkcja_app_user;

-- ============================================================
-- SCHEMAT g (tabele ERP - tylko niezbędne)
-- ============================================================

GRANT USAGE ON SCHEMA g TO produkcja_app_user;

-- Tabela: mzk_zlecenia (tylko SELECT)
GRANT SELECT ON g.mzk_zlecenia TO produkcja_app_user;

-- Tabela: mzk_zlecenia_makra (tylko SELECT)
GRANT SELECT ON g.mzk_zlecenia_makra TO produkcja_app_user;

-- Tabela: mzk_protokoly (SELECT + INSERT)
GRANT SELECT, INSERT ON g.mzk_protokoly TO produkcja_app_user;
GRANT USAGE, SELECT ON SEQUENCE g.mzk_protokoly_oid_seq TO produkcja_app_user;

-- Tabela: mzk_protokoly_poz (SELECT + INSERT + UPDATE)
GRANT SELECT, INSERT, UPDATE ON g.mzk_protokoly_poz TO produkcja_app_user;
GRANT USAGE, SELECT ON SEQUENCE g.mzk_protokoly_poz_oid_seq TO produkcja_app_user;

-- Funkcja: datasql (konwersja dat)
GRANT EXECUTE ON FUNCTION g.datasql(integer) TO produkcja_app_user;

-- Funkcja: sqldata (konwersja dat)
GRANT EXECUTE ON FUNCTION g.sqldata(date) TO produkcja_app_user;

-- ============================================================
-- SCHEMAT es (tabele ERP - tylko SELECT)
-- ============================================================

GRANT USAGE ON SCHEMA es TO produkcja_app_user;

-- Tabela: ter_karty_pracy (tylko SELECT)
GRANT SELECT ON es.ter_karty_pracy TO produkcja_app_user;

-- ============================================================
-- WERYFIKACJA UPRAWNIEŃ (opcjonalne)
-- ============================================================

-- Sprawdź uprawnienia użytkownika:
-- SELECT
--     table_schema,
--     table_name,
--     privilege_type
-- FROM information_schema.table_privileges
-- WHERE grantee = 'produkcja_app_user'
-- ORDER BY table_schema, table_name;
