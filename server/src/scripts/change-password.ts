/**
 * Skrypt do zmiany hasła użytkownika.
 *
 * Użycie:
 *   npx tsx src/scripts/change-password.ts <username> <new_password>
 *
 * Przykład:
 *   npx tsx src/scripts/change-password.ts jan.kowalski nowehaslo456
 */

import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function changePassword() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Użycie: npx tsx src/scripts/change-password.ts <username> <new_password>');
    console.error('Przykład: npx tsx src/scripts/change-password.ts jan.kowalski nowehaslo456');
    process.exit(1);
  }

  const [username, newPassword] = args;

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Sprawdź czy użytkownik istnieje
    const checkResult = await pool.query(
      'SELECT id, username FROM app_produkcja.users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length === 0) {
      console.error(`Błąd: Użytkownik "${username}" nie istnieje!`);
      process.exit(1);
    }

    // Hashuj nowe hasło
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Zaktualizuj hasło
    await pool.query(
      'UPDATE app_produkcja.users SET password_hash = $1 WHERE username = $2',
      [passwordHash, username]
    );

    console.log(`Hasło użytkownika "${username}" zostało zmienione.`);

  } catch (error) {
    console.error('Błąd bazy danych:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

changePassword();
