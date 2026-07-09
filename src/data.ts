import { LiteratureItem, StockMovement } from './types';

const now = new Date().toISOString();

export const starterItems: LiteratureItem[] = [
  {
    id: 'nwt-tl',
    title: 'பரிசுத்த பைபிள் - புதிய உலக மொழிபெயர்ப்பு',
    code: 'nwt-TL',
    category: 'Bibles',
    quantity: 5,
    lowStockThreshold: 10,
    language: 'Tamil',
    coverImage: '',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'bhs-tl',
    title: 'பைபிள் உண்மையிலேயே என்ன கற்பிக்கிறது?',
    code: 'bhs-TL',
    category: 'Books',
    quantity: 14,
    lowStockThreshold: 10,
    language: 'Tamil',
    coverImage: '',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'lff-tl',
    title: 'என்றென்றும் சந்தோஷமாக வாழுங்கள்!',
    code: 'lff-TL',
    category: 'Books',
    quantity: 8,
    lowStockThreshold: 10,
    language: 'Tamil',
    coverImage: '',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'bt-tl',
    title: 'பைபிள் கற்பிக்கிறது',
    code: 'bt-TL',
    category: 'Brochures and Booklets',
    quantity: 22,
    lowStockThreshold: 10,
    language: 'Tamil',
    coverImage: '',
    createdAt: now,
    updatedAt: now
  }
];

export const starterMovements: StockMovement[] = [
  {
    id: 'movement-1',
    itemId: 'nwt-tl',
    itemTitle: 'பரிசுத்த பைபிள் - புதிய உலக மொழிபெயர்ப்பு',
    itemCode: 'nwt-TL',
    type: 'give_out',
    quantityChange: -2,
    quantityBefore: 7,
    quantityAfter: 5,
    notes: 'Given out after meeting',
    createdBy: 'Demo User',
    createdAt: now
  },
  {
    id: 'movement-2',
    itemId: 'bhs-tl',
    itemTitle: 'பைபிள் உண்மையிலேயே என்ன கற்பிக்கிறது?',
    itemCode: 'bhs-TL',
    type: 'restock',
    quantityChange: 10,
    quantityBefore: 4,
    quantityAfter: 14,
    notes: 'Restocked from storage',
    createdBy: 'Demo User',
    createdAt: now
  }
];
