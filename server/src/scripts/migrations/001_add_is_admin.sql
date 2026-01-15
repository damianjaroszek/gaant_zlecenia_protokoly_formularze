-- Migracja: Dodanie kolumny is_admin do tabeli users
-- Data: 2026-01-15
-- Opis: Umożliwia oznaczenie użytkowników jako administratorów

ALTER TABLE app_produkcja.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Opcjonalnie: ustaw pierwszego użytkownika jako admina
-- UPDATE app_produkcja.users SET is_admin = true WHERE id = 1;
