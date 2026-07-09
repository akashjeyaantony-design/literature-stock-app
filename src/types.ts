export type Category =
  | 'Bibles'
  | 'Books'
  | 'Brochures and Booklets'
  | 'Forms and Supplies'
  | 'Tracts'
  | 'Public Magazines';

export type LiteratureItem = {
  id: string;
  title: string;
  code: string;
  category: Category;
  quantity: number;
  lowStockThreshold: number;
  language: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
};

export type MovementType = 'restock' | 'give_out' | 'adjustment';

export type StockMovement = {
  id: string;
  itemId: string;
  itemTitle: string;
  itemCode: string;
  type: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
};
