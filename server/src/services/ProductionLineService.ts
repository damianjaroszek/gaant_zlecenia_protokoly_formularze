import { pool } from '../config/db.js';

export interface ProductionLine {
  id: number;
  line_number: number;
  name: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at?: string;
}

export interface CreateLineInput {
  line_number: number;
  name?: string;
}

export interface UpdateLineInput {
  is_active?: boolean;
  name?: string;
  display_order?: number;
}

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ProductionLineService {
  private activeLinesCache: CacheEntry<number[]> | null = null;
  private allLinesCache: CacheEntry<ProductionLine[]> | null = null;

  /**
   * Invalidate all caches (call after create/update/delete operations)
   */
  invalidateCache(): void {
    this.activeLinesCache = null;
    this.allLinesCache = null;
  }

  /**
   * Get all active line numbers (cached)
   */
  async getActiveLineNumbers(): Promise<number[]> {
    const now = Date.now();

    if (this.activeLinesCache && this.activeLinesCache.expiresAt > now) {
      return this.activeLinesCache.data;
    }

    const result = await pool.query(
      'SELECT line_number FROM app_produkcja.production_lines WHERE is_active = true'
    );
    const lineNumbers = result.rows.map(r => r.line_number);

    this.activeLinesCache = {
      data: lineNumbers,
      expiresAt: now + CACHE_TTL_MS
    };

    return lineNumbers;
  }

  /**
   * Get all production lines (for admin, cached)
   */
  async getAllLines(): Promise<ProductionLine[]> {
    const now = Date.now();

    if (this.allLinesCache && this.allLinesCache.expiresAt > now) {
      return this.allLinesCache.data;
    }

    const result = await pool.query(`
      SELECT id, line_number, name, is_active, display_order, created_at
      FROM app_produkcja.production_lines
      ORDER BY display_order, line_number
    `);

    this.allLinesCache = {
      data: result.rows,
      expiresAt: now + CACHE_TTL_MS
    };

    return result.rows;
  }

  /**
   * Get active lines for a specific user (based on access rights)
   */
  async getLinesForUser(userId: number, isAdmin: boolean): Promise<ProductionLine[]> {
    if (isAdmin) {
      const result = await pool.query(`
        SELECT id, line_number, name, is_active, display_order
        FROM app_produkcja.production_lines
        WHERE is_active = true
        ORDER BY display_order, line_number
      `);
      return result.rows;
    }

    const result = await pool.query(`
      SELECT pl.id, pl.line_number, pl.name, pl.is_active, pl.display_order
      FROM app_produkcja.production_lines pl
      INNER JOIN app_produkcja.user_line_access ula ON pl.id = ula.line_id
      WHERE pl.is_active = true AND ula.user_id = $1
      ORDER BY pl.display_order, pl.line_number
    `, [userId]);
    return result.rows;
  }

  /**
   * Check if a line number is valid (exists and is active)
   */
  async isValidLine(lineNumber: number): Promise<boolean> {
    const activeLines = await this.getActiveLineNumbers();
    return activeLines.includes(lineNumber);
  }

  /**
   * Create a new production line
   */
  async createLine(input: CreateLineInput): Promise<ProductionLine> {
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM app_produkcja.production_lines'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    const result = await pool.query(`
      INSERT INTO app_produkcja.production_lines (line_number, name, is_active, display_order)
      VALUES ($1, $2, true, $3)
      RETURNING id, line_number, name, is_active, display_order, created_at
    `, [input.line_number, input.name || `Linia ${input.line_number}`, nextOrder]);

    this.invalidateCache();
    return result.rows[0];
  }

  /**
   * Update a production line
   */
  async updateLine(id: number, input: UpdateLineInput): Promise<ProductionLine | null> {
    const updates: string[] = [];
    const values: (boolean | string | number)[] = [];
    let paramIndex = 1;

    if (typeof input.is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (typeof input.display_order === 'number') {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(input.display_order);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE app_produkcja.production_lines
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, line_number, name, is_active, display_order, created_at
    `, values);

    if (result.rows[0]) {
      this.invalidateCache();
    }
    return result.rows[0] || null;
  }

  /**
   * Delete a production line
   */
  async deleteLine(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM app_produkcja.production_lines WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length > 0) {
      this.invalidateCache();
    }
    return result.rows.length > 0;
  }
}

export const productionLineService = new ProductionLineService();
