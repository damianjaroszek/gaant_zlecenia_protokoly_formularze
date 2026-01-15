import { Order } from '../types';

/**
 * Paleta 12 kolorów z MAKSYMALNYM kontrastem percepcyjnym.
 * Uporządkowane tak, że sąsiednie indeksy mają MINIMALNY kontrast,
 * a odległe indeksy mają MAKSYMALNY kontrast.
 *
 * Dzięki temu można używać prostego round-robin dla zleceń w tej samej komórce.
 */
export const COLOR_PALETTE = [
  { bg: '#2196F3', border: '#1565C0', text: '#FFFFFF' },  // 0: Niebieski
  { bg: '#FF9800', border: '#E65100', text: '#000000' },  // 1: Pomarańczowy (kontrast do niebieskiego)
  { bg: '#4CAF50', border: '#2E7D32', text: '#FFFFFF' },  // 2: Zielony
  { bg: '#E91E63', border: '#C2185B', text: '#FFFFFF' },  // 3: Różowy (kontrast do zielonego)
  { bg: '#9C27B0', border: '#7B1FA2', text: '#FFFFFF' },  // 4: Fioletowy
  { bg: '#FFEB3B', border: '#F9A825', text: '#000000' },  // 5: Żółty (kontrast do fioletowego)
  { bg: '#00BCD4', border: '#0097A7', text: '#000000' },  // 6: Cyjan
  { bg: '#FF5722', border: '#D84315', text: '#FFFFFF' },  // 7: Czerwono-pomarańczowy (kontrast do cyjan)
  { bg: '#8BC34A', border: '#558B2F', text: '#000000' },  // 8: Limonkowy
  { bg: '#673AB7', border: '#4527A0', text: '#FFFFFF' },  // 9: Głęboki fiolet (kontrast do limonkowego)
  { bg: '#009688', border: '#00695C', text: '#FFFFFF' },  // 10: Morski
  { bg: '#F44336', border: '#C62828', text: '#FFFFFF' },  // 11: Czerwony (kontrast do morskiego)
];

export type OrderColor = (typeof COLOR_PALETTE)[number];

/**
 * Buduje mapę linii produkcyjnej do pozycji wizualnej dynamicznie na podstawie zleceń.
 */
function buildLineToVisualIndex(orders: Order[]): Map<number, number> {
  const uniqueLines = new Set<number>();
  for (const order of orders) {
    if (order.liniapm !== null) {
      uniqueLines.add(order.liniapm);
    }
  }
  const sortedLines = [...uniqueLines].sort((a, b) => a - b);
  const lineToVisualIndex = new Map<number, number>();
  sortedLines.forEach((line, index) => {
    lineToVisualIndex.set(line, index);
  });
  return lineToVisualIndex;
}

function normalizeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('sv-SE');
}

function dateToDayIndex(dateStr: string): number {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Oblicza pozycję w siatce 2D.
 * X = kolumna wizualna (dzień × 3 + zmiana)
 * Y = wiersz wizualny (indeks linii)
 */
function getGridPosition(
  date: string,
  shift: number,
  line: number,
  baseDayIndex: number,
  lineToVisualIndex: Map<number, number>
): { x: number; y: number } | null {
  const lineIndex = lineToVisualIndex.get(line);
  if (lineIndex === undefined) return null;

  const dayIndex = dateToDayIndex(date);
  const x = (dayIndex - baseDayIndex) * 3 + (shift - 1);
  const y = lineIndex;

  return { x, y };
}

interface OrderWithPosition {
  order: Order;
  position: { x: number; y: number };
  colorIndex: number;
}

/**
 * PROMIEŃ SĄSIEDZTWA:
 * - 0 = tylko ta sama komórka
 * - 1 = bezpośredni sąsiedzi (8 komórek wokół)
 * - 2 = sąsiedzi + ich sąsiedzi (24 komórki)
 *
 * Przy 8 liniach i 3 zmianach/dzień, radius=2 pokrywa dobrze widoczny obszar.
 */
const NEIGHBOR_RADIUS = 2;

/**
 * Główna funkcja kolorowania.
 *
 * KLUCZOWA ZMIANA: Dwuprzebiegowy algorytm
 * 1. Pierwszy przebieg: zbuduj pełny graf sąsiedztwa (wszystkie zlecenia)
 * 2. Drugi przebieg: koloruj używając informacji o WSZYSTKICH sąsiadach
 */
export function assignOrderColors(orders: Order[]): Map<number, number> {
  const colorAssignments = new Map<number, number>();

  if (orders.length === 0) {
    return colorAssignments;
  }

  // Zbuduj mapę linii do indeksów wizualnych
  const lineToVisualIndex = buildLineToVisualIndex(orders);

  // Znajdź najwcześniejszą datę jako bazę
  let minDayIndex = Infinity;
  for (const order of orders) {
    const dayIndex = dateToDayIndex(normalizeDate(order.data_realizacji));
    if (dayIndex < minDayIndex) minDayIndex = dayIndex;
  }

  // Przygotuj zlecenia z pozycjami
  const ordersWithPositions: OrderWithPosition[] = [];
  for (const order of orders) {
    if (order.liniapm === null) {
      colorAssignments.set(order.id_zlecenia, order.id_zlecenia % COLOR_PALETTE.length);
      continue;
    }

    const date = normalizeDate(order.data_realizacji);
    const position = getGridPosition(date, order.zmiana, order.liniapm, minDayIndex, lineToVisualIndex);
    if (position) {
      ordersWithPositions.push({ order, position, colorIndex: -1 });
    }
  }

  // Spatial index: pozycja -> lista zleceń
  const spatialIndex = new Map<string, OrderWithPosition[]>();
  for (const owp of ordersWithPositions) {
    const key = `${owp.position.x}_${owp.position.y}`;
    const list = spatialIndex.get(key) || [];
    list.push(owp);
    spatialIndex.set(key, list);
  }

  // KROK 1: Zbuduj graf sąsiedztwa (kto z kim sąsiaduje)
  const neighbors = new Map<OrderWithPosition, Set<OrderWithPosition>>();
  for (const owp of ordersWithPositions) {
    neighbors.set(owp, new Set());
  }

  for (const current of ordersWithPositions) {
    // Sprawdź wszystkie komórki w promieniu
    for (let dx = -NEIGHBOR_RADIUS; dx <= NEIGHBOR_RADIUS; dx++) {
      for (let dy = -NEIGHBOR_RADIUS; dy <= NEIGHBOR_RADIUS; dy++) {
        const key = `${current.position.x + dx}_${current.position.y + dy}`;
        const cellOrders = spatialIndex.get(key);
        if (!cellOrders) continue;

        for (const other of cellOrders) {
          if (other === current) continue;

          // Oblicz rzeczywistą odległość
          const dist = Math.max(
            Math.abs(current.position.x - other.position.x),
            Math.abs(current.position.y - other.position.y)
          );

          if (dist <= NEIGHBOR_RADIUS) {
            neighbors.get(current)!.add(other);
            neighbors.get(other)!.add(current);
          }
        }
      }
    }
  }

  // KROK 2: Sortuj zlecenia według liczby sąsiadów (najwięcej pierwsze)
  // To klasyczna heurystyka dla graph coloring
  const sortedOrders = [...ordersWithPositions].sort((a, b) => {
    const neighborsA = neighbors.get(a)?.size || 0;
    const neighborsB = neighbors.get(b)?.size || 0;
    // Najpierw te z największą liczbą sąsiadów
    if (neighborsB !== neighborsA) return neighborsB - neighborsA;
    // Potem po pozycji (dla determinizmu)
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });

  // KROK 3: Koloruj greedy
  for (const current of sortedOrders) {
    const currentNeighbors = neighbors.get(current)!;
    const usedColors = new Set<number>();

    // Zbierz kolory WSZYSTKICH sąsiadów (już pokolorowanych)
    for (const neighbor of currentNeighbors) {
      if (neighbor.colorIndex >= 0) {
        usedColors.add(neighbor.colorIndex);
      }
    }

    // Wybierz kolor
    let bestColor: number;

    if (usedColors.size === 0) {
      // Brak sąsiadów z kolorem - użyj deterministycznego hash
      bestColor = hashOrderId(current.order.id_zlecenia);
    } else if (usedColors.size < COLOR_PALETTE.length) {
      // Jest wolny kolor - wybierz najbardziej kontrastowy
      bestColor = findMostContrastingFreeColor(usedColors);
    } else {
      // Wszystkie kolory zajęte - wybierz najmniej konfliktowy
      bestColor = findLeastConflictingColor(usedColors, currentNeighbors);
    }

    current.colorIndex = bestColor;
    colorAssignments.set(current.order.id_zlecenia, bestColor);
  }

  return colorAssignments;
}

/**
 * Deterministyczny hash dla ID zlecenia.
 * Rozsiewa ID po palecie bardziej równomiernie niż proste modulo.
 */
function hashOrderId(id: number): number {
  // Mnożnik złotego podziału dla lepszego rozsiewu
  const hash = (id * 2654435761) >>> 0;
  return hash % COLOR_PALETTE.length;
}

/**
 * Macierz odległości percepcyjnych (0-10, gdzie 10 = max kontrast).
 * Oparta na różnicach w: jasności, nasyceniu, odcieniu.
 */
const CONTRAST_MATRIX: number[][] = [
  //  0   1   2   3   4   5   6   7   8   9  10  11
  [  0, 10,  7,  9,  8, 10,  5,  9,  6,  9,  6, 10 ], // 0: Niebieski
  [ 10,  0,  8,  7, 10,  4,  9,  3,  6, 10,  9,  5 ], // 1: Pomarańczowy
  [  7,  8,  0,  9,  7,  8,  7, 10,  3,  8,  4,  9 ], // 2: Zielony
  [  9,  7,  9,  0,  5,  8,  9,  6,  8,  6, 10,  4 ], // 3: Różowy
  [  8, 10,  7,  5,  0,  9,  8,  9,  7,  2,  8,  8 ], // 4: Fioletowy
  [ 10,  4,  8,  8,  9,  0,  6,  5,  4, 10,  7,  7 ], // 5: Żółty
  [  5,  9,  7,  9,  8,  6,  0,  9,  6,  9,  4,  9 ], // 6: Cyjan
  [  9,  3, 10,  6,  9,  5,  9,  0,  7, 10, 10,  2 ], // 7: Czerwono-pom.
  [  6,  6,  3,  8,  7,  4,  6,  7,  0,  8,  5,  8 ], // 8: Limonkowy
  [  9, 10,  8,  6,  2, 10,  9, 10,  8,  0,  8,  9 ], // 9: Głęboki fiolet
  [  6,  9,  4, 10,  8,  7,  4, 10,  5,  8,  0, 10 ], // 10: Morski
  [ 10,  5,  9,  4,  8,  7,  9,  2,  8,  9, 10,  0 ], // 11: Czerwony
];

/**
 * Znajduje wolny kolor z największym kontrastem do już użytych.
 */
function findMostContrastingFreeColor(usedColors: Set<number>): number {
  let bestColor = 0;
  let bestScore = -1;

  for (let candidate = 0; candidate < COLOR_PALETTE.length; candidate++) {
    if (usedColors.has(candidate)) continue;

    // Oblicz minimalny kontrast do wszystkich użytych kolorów
    let minContrast = Infinity;
    for (const usedColor of usedColors) {
      const contrast = CONTRAST_MATRIX[candidate][usedColor];
      if (contrast < minContrast) minContrast = contrast;
    }

    if (minContrast > bestScore) {
      bestScore = minContrast;
      bestColor = candidate;
    }
  }

  return bestColor;
}

/**
 * Gdy wszystkie kolory zajęte - wybierz ten który ma największy
 * minimalny kontrast do sąsiadów.
 */
function findLeastConflictingColor(
  usedColors: Set<number>,
  currentNeighbors: Set<OrderWithPosition>
): number {
  let bestColor = 0;
  let bestScore = -1;

  // Policz ile razy każdy kolor występuje u sąsiadów
  const colorCounts = new Map<number, number>();
  for (const neighbor of currentNeighbors) {
    if (neighbor.colorIndex >= 0) {
      colorCounts.set(
        neighbor.colorIndex,
        (colorCounts.get(neighbor.colorIndex) || 0) + 1
      );
    }
  }

  for (let candidate = 0; candidate < COLOR_PALETTE.length; candidate++) {
    // Kara za użycie tego samego koloru co sąsiad
    const sameColorCount = colorCounts.get(candidate) || 0;

    // Oblicz średni kontrast do użytych kolorów
    let totalContrast = 0;
    for (const usedColor of usedColors) {
      totalContrast += CONTRAST_MATRIX[candidate][usedColor];
    }
    const avgContrast = totalContrast / usedColors.size;

    // Score: wyższy kontrast lepszy, ale kara za kolizję
    const score = avgContrast - sameColorCount * 5;

    if (score > bestScore) {
      bestScore = score;
      bestColor = candidate;
    }
  }

  return bestColor;
}

/**
 * Pobiera kolor z palety.
 */
export function getColorByIndex(colorIndex: number): OrderColor {
  return COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
}
