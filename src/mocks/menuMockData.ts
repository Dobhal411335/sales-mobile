/**
 * Development-only mock menu data.
 * Replace with menuService → GET /api/menu/* in a later integration phase.
 */
import type {MenuCategory, MenuProduct, TaxRate} from '../types/product';

export const MOCK_CATEGORY_NAMES = [
  'All',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Soups',
  'Kids Menu',
  'Tea & Coffee',
  'Soft Drinks',
  'Bar & Alcohol',
  'Offer',
] as const;

const categories: MenuCategory[] = MOCK_CATEGORY_NAMES.filter(
  (name) => name !== 'All',
).map((name, index) => ({
  id: `cat-${index + 1}`,
  name,
  status: 'Active',
}));

export const MOCK_GLOBAL_TAXES: TaxRate[] = [
  {id: 'tax-hst', name: 'HST', type: 'percent', value: 13},
];

const products: MenuProduct[] = [
  {
    id: 'prod-a1',
    name: 'Hungry Man',
    productCode: 'A1',
    productType: 'KITCHEN',
    category: {id: 'cat-1', name: 'Breakfast'},
    price: 18.64,
    preparationStyles: [],
  },
  {
    id: 'prod-a2',
    name: 'Three Eggs With Bacon',
    productCode: 'A2',
    productType: 'KITCHEN',
    category: {id: 'cat-1', name: 'Breakfast'},
    price: 12.5,
    preparationStyles: ['Over Easy', 'Scrambled', 'Sunny Side Up'],
  },
  {
    id: 'prod-a3',
    name: 'Classic Pancakes',
    productCode: 'A3',
    productType: 'KITCHEN',
    category: {id: 'cat-1', name: 'Breakfast'},
    price: 11.25,
    variants: [
      {size: 'Single', price: 11.25},
      {size: 'Double', price: 15.5},
    ],
  },
  {
    id: 'prod-l1',
    name: 'Grilled Chicken Club',
    productCode: 'L1',
    productType: 'KITCHEN',
    category: {id: 'cat-2', name: 'Lunch'},
    price: 16.95,
    addons: [
      {name: 'Extra Bacon', price: 3.5},
      {name: 'Avocado', price: 2.75},
    ],
    choiceOptions: [
      {
        name: 'Bread',
        subChoices: ['White', 'Whole Wheat', 'Gluten Free'],
      },
    ],
  },
  {
    id: 'prod-l2',
    name: 'Caesar Salad',
    productCode: 'L2',
    productType: 'KITCHEN',
    category: {id: 'cat-2', name: 'Lunch'},
    price: 13.5,
    addons: [{name: 'Grilled Chicken', price: 5}],
  },
  {
    id: 'prod-d1',
    name: 'Ribeye Steak',
    productCode: 'D1',
    productType: 'KITCHEN',
    category: {id: 'cat-3', name: 'Dinner'},
    price: 34.99,
    preparationStyles: ['Medium Rare', 'Medium', 'Well Done'],
    addons: [{name: 'Garlic Butter', price: 2}],
  },
  {
    id: 'prod-d2',
    name: 'Salmon Fillet',
    productCode: 'D2',
    productType: 'KITCHEN',
    category: {id: 'cat-3', name: 'Dinner'},
    price: 28.5,
    preparationStyles: ['Grilled', 'Pan Seared'],
  },
  {
    id: 'prod-s1',
    name: 'Tomato Basil Soup',
    productCode: 'S1',
    productType: 'KITCHEN',
    category: {id: 'cat-4', name: 'Soups'},
    price: 7.95,
    variants: [
      {size: 'Cup', price: 7.95},
      {size: 'Bowl', price: 10.95},
    ],
  },
  {
    id: 'prod-k1',
    name: 'Kids Chicken Fingers',
    productCode: 'K1',
    productType: 'KITCHEN',
    category: {id: 'cat-5', name: 'Kids Menu'},
    price: 9.5,
  },
  {
    id: 'prod-t1',
    name: 'English Breakfast Tea',
    productCode: 'T1',
    productType: 'KITCHEN',
    category: {id: 'cat-6', name: 'Tea & Coffee'},
    price: 3.25,
  },
  {
    id: 'prod-t2',
    name: 'Latte',
    productCode: 'T2',
    productType: 'KITCHEN',
    category: {id: 'cat-6', name: 'Tea & Coffee'},
    price: 4.75,
    variants: [
      {size: 'Small', price: 4.75},
      {size: 'Large', price: 5.75},
    ],
  },
  {
    id: 'prod-soft1',
    name: 'Coke',
    productCode: 'SD1',
    productType: 'BAR',
    category: {id: 'cat-7', name: 'Soft Drinks'},
    price: 3.5,
  },
  {
    id: 'prod-soft2',
    name: 'Sparkling Water',
    productCode: 'SD2',
    productType: 'BAR',
    category: {id: 'cat-7', name: 'Soft Drinks'},
    price: 3.25,
  },
  {
    id: 'prod-b1',
    name: 'House Lager',
    productCode: 'B1',
    productType: 'BAR',
    category: {id: 'cat-8', name: 'Bar & Alcohol'},
    price: 7.5,
  },
  {
    id: 'prod-b2',
    name: 'Old Fashioned',
    productCode: 'B2',
    productType: 'BAR',
    category: {id: 'cat-8', name: 'Bar & Alcohol'},
    price: 14,
    choiceOptions: [
      {
        name: 'Spirit',
        subChoices: ['Bourbon', 'Rye', 'Whiskey'],
      },
    ],
  },
];

const tableContextById: Record<
  string,
  {tableNumber: string; floorName: string; guestCount?: number}
> = {
    t01: {tableNumber: '01', floorName: 'Main Hall Area'},
    t02: {tableNumber: '02', floorName: 'Main Hall Area'},
    t03: {tableNumber: '03', floorName: 'Main Hall Area', guestCount: 6},
    t04: {tableNumber: '04', floorName: 'Main Hall Area'},
    t05: {tableNumber: '05', floorName: 'Main Hall Area'},
    t06: {tableNumber: '06', floorName: 'Main Hall Area', guestCount: 3},
    t07: {tableNumber: '07', floorName: 'Main Hall Area'},
    t08: {tableNumber: '08', floorName: 'Main Hall Area', guestCount: 4},
    t09: {tableNumber: '09', floorName: 'Main Hall Area', guestCount: 8},
    t10: {tableNumber: '10', floorName: 'Main Hall Area', guestCount: 2},
    t11: {tableNumber: '11', floorName: 'Main Hall Area'},
    t12: {tableNumber: '12', floorName: 'Main Hall Area'},
  };

export function getMockMenuData() {
  return {
    categories,
    products,
    offers: [],
    globalTaxes: MOCK_GLOBAL_TAXES,
    categoryNames: [...MOCK_CATEGORY_NAMES],
  };
}

export function getMockSessionContext(tableId?: string) {
  if (!tableId) {
    return null;
  }
  return tableContextById[tableId] ?? {
    tableNumber: tableId,
    floorName: 'Main Hall Area',
  };
}
