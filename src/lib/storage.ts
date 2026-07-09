import { LiteratureItem, StockMovement } from '../types';
import { starterItems, starterMovements } from '../data';

const ITEMS_KEY = 'literature-stock-items';
const MOVEMENTS_KEY = 'literature-stock-movements';

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadItems(): LiteratureItem[] {
  return readJson<LiteratureItem[]>(ITEMS_KEY, starterItems);
}

export function saveItems(items: LiteratureItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function loadMovements(): StockMovement[] {
  return readJson<StockMovement[]>(MOVEMENTS_KEY, starterMovements);
}

export function saveMovements(movements: StockMovement[]) {
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
}

export function resetDemoData() {
  localStorage.removeItem(ITEMS_KEY);
  localStorage.removeItem(MOVEMENTS_KEY);
}
