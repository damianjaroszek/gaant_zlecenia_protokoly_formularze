/**
 * Testy dla algorytmu kolorowania zleceń.
 *
 * Aby uruchomić testy, zainstaluj vitest:
 *   npm install -D vitest @vitest/ui
 *
 * Dodaj do package.json:
 *   "scripts": { "test": "vitest" }
 *
 * Uruchom: npm test
 */

// @ts-ignore - vitest nie jest zainstalowany domyślnie
import { describe, it, expect } from 'vitest';
import { assignOrderColors, getColorByIndex, COLOR_PALETTE } from './orderColors';
import { Order } from '../types';

// Helper do tworzenia zleceń testowych
function createOrder(
  id: number,
  date: string,
  shift: number,
  line: number
): Order {
  return {
    id_zlecenia: id,
    data_realizacji: date,
    zmiana: shift,
    liniapm: line,
    opis: `Zlecenie ${id}`,
  };
}

describe('assignOrderColors', () => {
  it('powinno zwrócić pustą mapę dla pustej listy zleceń', () => {
    const result = assignOrderColors([]);
    expect(result.size).toBe(0);
  });

  it('powinno przypisać kolor do pojedynczego zlecenia', () => {
    const orders = [createOrder(1, '2025-01-15', 1, 1)];
    const result = assignOrderColors(orders);

    expect(result.size).toBe(1);
    expect(result.has(1)).toBe(true);
    expect(result.get(1)).toBeGreaterThanOrEqual(0);
    expect(result.get(1)).toBeLessThan(COLOR_PALETTE.length);
  });

  it('powinno przypisać różne kolory sąsiadom w tej samej komórce (kolizja)', () => {
    // Dwa zlecenia w tej samej komórce
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),
      createOrder(2, '2025-01-15', 1, 1),
    ];
    const result = assignOrderColors(orders);

    expect(result.get(1)).not.toBe(result.get(2));
  });

  it('powinno przypisać różne kolory sąsiadom na sąsiednich zmianach', () => {
    // Dwa zlecenia na tej samej linii, sąsiednie zmiany
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),
      createOrder(2, '2025-01-15', 2, 1),
    ];
    const result = assignOrderColors(orders);

    expect(result.get(1)).not.toBe(result.get(2));
  });

  it('powinno przypisać różne kolory sąsiadom na sąsiednich liniach', () => {
    // Dwa zlecenia na sąsiednich liniach (1 i 2), ta sama data i zmiana
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),
      createOrder(2, '2025-01-15', 1, 2),
    ];
    const result = assignOrderColors(orders);

    expect(result.get(1)).not.toBe(result.get(2));
  });

  it('powinno przypisać różne kolory dla zleceń w promieniu 2 komórek', () => {
    // Zlecenia oddalone o 2 komórki powinny mieć różne kolory
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),  // pozycja (0, 0)
      createOrder(2, '2025-01-15', 3, 1),  // pozycja (2, 0) - odległość 2
    ];
    const result = assignOrderColors(orders);

    expect(result.get(1)).not.toBe(result.get(2));
  });

  it('powinno obsłużyć wiele zleceń na pełnym wykresie 60 dni', () => {
    // Symulacja ~700 zleceń: 60 dni × 3 zmiany × ~4 zlecenia na dzień
    const orders: Order[] = [];
    let id = 1;

    for (let day = 1; day <= 60; day++) {
      const dateStr = `2025-01-${day.toString().padStart(2, '0')}`;
      for (let shift = 1; shift <= 3; shift++) {
        // 3-4 zlecenia na zmianę na różnych liniach
        for (const line of [1, 2, 3, 33]) {
          if (Math.random() > 0.3) { // ~70% wypełnienia
            orders.push(createOrder(id++, dateStr, shift, line));
          }
        }
      }
    }

    console.log(`Testowanie z ${orders.length} zleceniami`);
    const startTime = performance.now();
    const result = assignOrderColors(orders);
    const endTime = performance.now();

    console.log(`Czas wykonania: ${(endTime - startTime).toFixed(2)}ms`);

    // Każde zlecenie powinno mieć przypisany kolor
    expect(result.size).toBe(orders.length);

    // Sprawdź że wszystkie kolory są w zakresie
    for (const colorIndex of result.values()) {
      expect(colorIndex).toBeGreaterThanOrEqual(0);
      expect(colorIndex).toBeLessThan(COLOR_PALETTE.length);
    }
  });

  it('powinno być wydajne dla 700 zleceń (< 100ms)', () => {
    const orders: Order[] = [];
    let id = 1;

    // Generuj dokładnie 700 zleceń
    const lines = [1, 2, 3, 33, 4, 44, 5, 7];
    for (let i = 0; i < 700; i++) {
      const day = Math.floor(i / 12) + 1;
      const shift = (i % 3) + 1;
      const line = lines[i % lines.length];
      const dateStr = `2025-${Math.floor(day / 30) + 1}-${((day % 30) + 1).toString().padStart(2, '0')}`;
      orders.push(createOrder(id++, dateStr, shift, line));
    }

    const startTime = performance.now();
    const result = assignOrderColors(orders);
    const endTime = performance.now();

    expect(result.size).toBe(700);
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('powinno obsłużyć zlecenia z liniapm = null', () => {
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),
      { ...createOrder(2, '2025-01-15', 1, 1), liniapm: null },
    ];

    const result = assignOrderColors(orders);

    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
  });

  it('powinno przypisać różne kolory dla trzech zleceń w kolizji', () => {
    const orders = [
      createOrder(1, '2025-01-15', 1, 1),
      createOrder(2, '2025-01-15', 1, 1),
      createOrder(3, '2025-01-15', 1, 1),
    ];
    const result = assignOrderColors(orders);

    const colors = new Set([result.get(1), result.get(2), result.get(3)]);
    expect(colors.size).toBe(3);
  });

  it('powinno maksymalizować kontrast między sąsiadami', () => {
    // Siatka 3x3 zleceń - środkowe ma 8 sąsiadów
    const orders = [
      createOrder(1, '2025-01-15', 1, 1), createOrder(2, '2025-01-15', 2, 1), createOrder(3, '2025-01-15', 3, 1),
      createOrder(4, '2025-01-15', 1, 2), createOrder(5, '2025-01-15', 2, 2), createOrder(6, '2025-01-15', 3, 2),
      createOrder(7, '2025-01-15', 1, 3), createOrder(8, '2025-01-15', 2, 3), createOrder(9, '2025-01-15', 3, 3),
    ];

    const result = assignOrderColors(orders);

    // Środkowe zlecenie (5) powinno mieć inny kolor niż wszystkie sąsiednie
    const centerColor = result.get(5);
    const neighborColors = [1, 2, 3, 4, 6, 7, 8, 9].map((id) => result.get(id));

    // Żaden bezpośredni sąsiad nie powinien mieć tego samego koloru
    for (const nc of neighborColors) {
      expect(nc).not.toBe(centerColor);
    }
  });
});

describe('getColorByIndex', () => {
  it('powinno zwrócić poprawny kolor dla indeksu 0', () => {
    const color = getColorByIndex(0);
    expect(color).toBe(COLOR_PALETTE[0]);
  });

  it('powinno zawijać indeks przekraczający rozmiar palety', () => {
    const color = getColorByIndex(COLOR_PALETTE.length);
    expect(color).toBe(COLOR_PALETTE[0]);

    const color2 = getColorByIndex(COLOR_PALETTE.length + 3);
    expect(color2).toBe(COLOR_PALETTE[3]);
  });
});

describe('COLOR_PALETTE', () => {
  it('powinno mieć 12 kolorów', () => {
    expect(COLOR_PALETTE.length).toBe(12);
  });

  it('każdy kolor powinien mieć bg, border i text', () => {
    for (const color of COLOR_PALETTE) {
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('text');

      expect(color.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(color.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(color.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
