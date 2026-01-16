-- Tabela przypisań użytkowników do linii produkcyjnych
CREATE TABLE IF NOT EXISTS app_produkcja.user_line_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_produkcja.users(id) ON DELETE CASCADE,
    line_id INTEGER NOT NULL REFERENCES app_produkcja.production_lines(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, line_id)
);

CREATE INDEX IF NOT EXISTS idx_user_line_access_user ON app_produkcja.user_line_access (user_id);
CREATE INDEX IF NOT EXISTS idx_user_line_access_line ON app_produkcja.user_line_access (line_id);
