/**
 * Skrypt do nadawania/odbierania uprawnień administratora.
 *
 * Użycie:
 *   npx tsx src/scripts/make-admin.ts <username>
 *
 * Przykład:
 *   npx tsx src/scripts/make-admin.ts admin
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function makeAdmin() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Użycie: npx tsx src/scripts/make-admin.ts <username>');
    console.error('Przykład: npx tsx src/scripts/make-admin.ts admin');
    process.exit(1);
  }

  const [username] = args;

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Najpierw upewnij się, że kolumna istnieje
    await pool.query(`
      ALTER TABLE app_produkcja.users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false
    `);

    // Nadaj uprawnienia admina
    const result = await pool.query(
      `UPDATE app_produkcja.users
       SET is_admin = true
       WHERE username = $1
       RETURNING id, username, display_name, is_admin`,
      [username]
    );

    if (result.rows.length === 0) {
      console.error(`Błąd: Użytkownik "${username}" nie istnieje!`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`Nadano uprawnienia administratora użytkownikowi:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Login: ${user.username}`);
    console.log(`  Nazwa: ${user.display_name}`);
    console.log(`  Admin: Tak`);

  } catch (error) {
    console.error('Błąd bazy danych:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

makeAdmin();
