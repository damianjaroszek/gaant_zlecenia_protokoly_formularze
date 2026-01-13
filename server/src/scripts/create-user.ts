/**
 * Skrypt do tworzenia użytkowników
 * Użycie: npx tsx src/scripts/create-user.ts <username> <password> [display_name]
 */
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createUser() {
  const [,, username, password, displayName] = process.argv;

  if (!username || !password) {
    console.log('Użycie: npx tsx src/scripts/create-user.ts <username> <password> [display_name]');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO app_produkcja.users (username, password_hash, display_name)
      VALUES ($1, $2, $3)
      RETURNING id, username, display_name
    `;

    const result = await pool.query(query, [username, passwordHash, displayName || null]);
    console.log('Utworzono użytkownika:', result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      console.error('Błąd: Użytkownik o tej nazwie już istnieje');
    } else {
      console.error('Błąd:', error.message);
    }
  } finally {
    await pool.end();
  }
}

createUser();
