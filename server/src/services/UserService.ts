import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { validatePassword } from '../utils/validation.js';

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at?: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  display_name?: string;
  is_admin?: boolean;
}

export interface UpdateUserInput {
  is_active?: boolean;
  is_admin?: boolean;
  display_name?: string;
}

export interface UserLineAccess {
  id: number;
  line_number: number;
  name: string | null;
}

const SALT_ROUNDS = 10;

class UserService {
  /**
   * Find user by username (includes password hash for authentication)
   */
  async findByUsername(username: string): Promise<UserWithPassword | null> {
    const result = await pool.query(`
      SELECT id, username, password_hash, display_name, is_active, is_admin
      FROM app_produkcja.users
      WHERE username = $1
    `, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    const result = await pool.query(`
      SELECT id, username, display_name, is_active, is_admin
      FROM app_produkcja.users
      WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find active user by ID (for session validation)
   */
  async findActiveById(id: number): Promise<User | null> {
    const result = await pool.query(`
      SELECT id, username, display_name, is_admin
      FROM app_produkcja.users
      WHERE id = $1 AND is_active = true
    `, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all users (for admin panel)
   */
  async getAllUsers(): Promise<User[]> {
    const result = await pool.query(`
      SELECT id, username, display_name, is_active, is_admin, created_at
      FROM app_produkcja.users
      ORDER BY id
    `);
    return result.rows;
  }

  /**
   * Check if username already exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM app_produkcja.users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.error);
    }

    if (await this.usernameExists(input.username)) {
      throw new Error('Użytkownik o tym loginie już istnieje');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const result = await pool.query(`
      INSERT INTO app_produkcja.users (username, password_hash, display_name, is_active, is_admin)
      VALUES ($1, $2, $3, true, $4)
      RETURNING id, username, display_name, is_active, is_admin, created_at
    `, [input.username, passwordHash, input.display_name || input.username, input.is_admin || false]);

    return result.rows[0];
  }

  /**
   * Update user properties
   */
  async updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const values: (boolean | string | number)[] = [];
    let paramIndex = 1;

    if (typeof input.is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (typeof input.is_admin === 'boolean') {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(input.is_admin);
    }
    if (input.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(input.display_name);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE app_produkcja.users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, display_name, is_active, is_admin, created_at
    `, values);

    return result.rows[0] || null;
  }

  /**
   * Reset user password
   */
  async resetPassword(id: number, newPassword: string): Promise<boolean> {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.error);
    }

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Użytkownik nie znaleziony');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      'UPDATE app_produkcja.users SET password_hash = $1 WHERE id = $2',
      [passwordHash, id]
    );

    return true;
  }

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Get lines assigned to a user
   */
  async getUserLines(userId: number): Promise<UserLineAccess[]> {
    const result = await pool.query(`
      SELECT pl.id, pl.line_number, pl.name
      FROM app_produkcja.user_line_access ula
      JOIN app_produkcja.production_lines pl ON ula.line_id = pl.id
      WHERE ula.user_id = $1
      ORDER BY pl.display_order, pl.line_number
    `, [userId]);
    return result.rows;
  }

  /**
   * Set lines for a user (replaces all existing assignments)
   */
  async setUserLines(userId: number, lineIds: number[]): Promise<UserLineAccess[]> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Remove all existing assignments
      await client.query(
        'DELETE FROM app_produkcja.user_line_access WHERE user_id = $1',
        [userId]
      );

      // Add new assignments
      if (lineIds.length > 0) {
        const values = lineIds.map((_, index) => `($1, $${index + 2})`).join(', ');
        await client.query(
          `INSERT INTO app_produkcja.user_line_access (user_id, line_id) VALUES ${values}`,
          [userId, ...lineIds]
        );
      }

      await client.query('COMMIT');

      // Return updated list
      const result = await client.query(`
        SELECT pl.id, pl.line_number, pl.name
        FROM app_produkcja.user_line_access ula
        JOIN app_produkcja.production_lines pl ON ula.line_id = pl.id
        WHERE ula.user_id = $1
        ORDER BY pl.display_order, pl.line_number
      `, [userId]);

      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const userService = new UserService();
