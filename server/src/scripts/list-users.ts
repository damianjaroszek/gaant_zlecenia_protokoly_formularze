/**
 * Skrypt do listowania użytkowników.
 *
 * Użycie:
 *   npx tsx src/scripts/list-users.ts
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function listUsers() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const result = await pool.query(`
      SELECT id, username, display_name, is_active, created_at
      FROM app_produkcja.users
      ORDER BY id
    `);

    if (result.rows.length === 0) {
      console.log('Brak użytkowników w bazie.');
      return;
    }

    console.log('Lista użytkowników:');
    console.log('-'.repeat(80));
    console.log(
      'ID'.padEnd(6) +
      'Login'.padEnd(20) +
      'Nazwa'.padEnd(25) +
      'Aktywny'.padEnd(10) +
      'Utworzony'
    );
    console.log('-'.repeat(80));

    for (const user of result.rows) {
      const createdAt = new Date(user.created_at).toLocaleDateString('pl-PL');
      console.log(
        String(user.id).padEnd(6) +
        user.username.padEnd(20) +
        (user.display_name || '-').padEnd(25) +
        (user.is_active ? 'Tak' : 'Nie').padEnd(10) +
        createdAt
      );
    }

    console.log('-'.repeat(80));
    console.log(`Razem: ${result.rows.length} użytkownik(ów)`);

  } catch (error) {
    console.error('Błąd bazy danych:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listUsers();
