/**
 * Skrypt do dodawania użytkowników do bazy danych.
 *
 * Użycie:
 *   npx tsx src/scripts/add-user.ts <username> <password> [display_name] [--admin]
 *
 * Przykład:
 *   npx tsx src/scripts/add-user.ts jan.kowalski haslo123 "Jan Kowalski"
 *   npx tsx src/scripts/add-user.ts admin admin123 "Administrator" --admin
 */

import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function addUser() {
  const args = process.argv.slice(2);
  const isAdmin = args.includes('--admin');
  const filteredArgs = args.filter(a => a !== '--admin');

  if (filteredArgs.length < 2) {
    console.error('Użycie: npx tsx src/scripts/add-user.ts <username> <password> [display_name] [--admin]');
    console.error('Przykład: npx tsx src/scripts/add-user.ts jan.kowalski haslo123 "Jan Kowalski"');
    console.error('         npx tsx src/scripts/add-user.ts admin admin123 "Administrator" --admin');
    process.exit(1);
  }

  const [username, password, displayName] = filteredArgs;

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Sprawdź czy użytkownik już istnieje
    const checkResult = await pool.query(
      'SELECT id FROM app_produkcja.users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      console.error(`Błąd: Użytkownik "${username}" już istnieje!`);
      process.exit(1);
    }

    // Hashuj hasło
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Dodaj użytkownika
    const insertResult = await pool.query(
      `INSERT INTO app_produkcja.users (username, password_hash, display_name, is_active, is_admin)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id, username, display_name, is_admin`,
      [username, passwordHash, displayName || username, isAdmin]
    );

    const newUser = insertResult.rows[0];
    console.log('Dodano użytkownika:');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Login: ${newUser.username}`);
    console.log(`  Nazwa: ${newUser.display_name}`);
    console.log(`  Admin: ${newUser.is_admin ? 'Tak' : 'Nie'}`);

  } catch (error) {
    console.error('Błąd bazy danych:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUser();
