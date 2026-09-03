import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {
  MenuCategory,
  MenuHead,
  MenuOffer,
  MenuProduct,
  ProductAddon,
  ProductHeadMapping,
  ProductVariant,
  TaxRate,
} from '../types/product';
import {normalizeChoiceOptions} from '../utils/productChoices';
import {getMockMenuData} from '../mocks/menuMockData';
import {api} from './api';

export interface MenuData {
  categories: MenuCategory[];
  products: MenuProduct[];
  offers: MenuOffer[];
  heads: MenuHead[];
  productHeads: ProductHeadMapping[];
  globalTaxes: TaxRate[];
  categoryNames: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapMenuApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (!error.response) {
      return 'Unable to load menu. Check your connection and try again.';
    }
  }
  return 'Unable to load menu. Check your connection and try again.';
}

function toId(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as {_id: unknown})._id);
  }
  return String(value);
}

function normalizeTax(raw: Record<string, unknown>): TaxRate {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? 'Tax'),
    type: String(raw.type ?? 'percent'),
    value: Number(raw.value) || 0,
  };
}

function normalizeCategory(raw: Record<string, unknown>): MenuCategory {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    status: raw.status ? String(raw.status) : 'Active',
  };
}

function normalizeAddon(raw: Record<string, unknown>): ProductAddon {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    price: Number(raw.price) || 0,
    size: raw.size ? String(raw.size) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    choiceOptions: normalizeChoiceOptions(
      raw.choiceOptions as ProductAddon['choiceOptions'],
    ),
  };
}

function normalizeVariant(raw: Record<string, unknown>): ProductVariant {
  return {
    size: String(raw.size ?? 'Standard'),
    price: Number(raw.price) || 0,
    status: raw.status ? String(raw.status) : undefined,
  };
}

function normalizeProduct(raw: Record<string, unknown>): MenuProduct {
  const categoryRaw = raw.category as Record<string, unknown> | undefined;
  const category: MenuCategory = categoryRaw
    ? normalizeCategory(categoryRaw)
    : {id: '', name: 'ITEMS', status: 'Active'};

  const variants = Array.isArray(raw.variants)
    ? raw.variants.map((v) =>
        normalizeVariant(v as Record<string, unknown>),
      )
    : undefined;

  const addons = Array.isArray(raw.addons)
    ? raw.addons.map((a) => normalizeAddon(a as Record<string, unknown>))
    : undefined;

  const taxes = Array.isArray(raw.taxes)
    ? raw.taxes.map((t) => normalizeTax(t as Record<string, unknown>))
    : undefined;

  const price =
    variants?.length
      ? Math.min(...variants.map((v) => v.price))
      : Number(raw.price) || 0;

  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    productCode: raw.productCode ? String(raw.productCode) : undefined,
    productType:
      String(raw.productType || 'KITCHEN').toUpperCase() === 'BAR'
        ? 'BAR'
        : 'KITCHEN',
    status: raw.status ? String(raw.status) : 'Active',
    category,
    price,
    variants,
    addons,
    choiceOptions: normalizeChoiceOptions(
      raw.choiceOptions as MenuProduct['choiceOptions'],
    ),
    preparationStyles: Array.isArray(raw.preparationStyles)
      ? raw.preparationStyles.map((s) => String(s))
      : undefined,
    taxes,
    taxData: raw.taxData as MenuProduct['taxData'],
    inStock: raw.inStock != null ? Boolean(raw.inStock) : undefined,
  };
}

function normalizeOffer(raw: Record<string, unknown>): MenuOffer {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? 'Offer'),
    price: Number(raw.price) || 0,
    inclusions: Array.isArray(raw.inclusions)
      ? raw.inclusions.map((v) => String(v))
      : undefined,
    choices: Array.isArray(raw.choices)
      ? raw.choices.map((v) => String(v))
      : undefined,
    drinks: Array.isArray(raw.drinks)
      ? raw.drinks.map((v) => String(v))
      : undefined,
    taxes: Array.isArray(raw.taxes)
      ? raw.taxes.map((t) => normalizeTax(t as Record<string, unknown>))
      : undefined,
    taxData: raw.taxData as MenuOffer['taxData'],
    status: raw.status ? String(raw.status) : 'Active',
  };
}

function normalizeHead(raw: Record<string, unknown>): MenuHead {
  const image = raw.image as {url?: string} | undefined;
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    status: raw.status ? String(raw.status) : 'Active',
    imageUrl: image?.url ? String(image.url) : undefined,
  };
}

function normalizeProductHead(raw: Record<string, unknown>): ProductHeadMapping {
  const headRaw = raw.head as Record<string, unknown> | string | undefined;
  const headName =
    headRaw && typeof headRaw === 'object'
      ? String(headRaw.name ?? '')
      : '';
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  const productIds = categories.flatMap((entry) => {
    const row = entry as {products?: unknown[]};
    if (!Array.isArray(row.products)) {
      return [];
    }
    return row.products.map((pid) => toId(pid)).filter(Boolean);
  });

  return {
    id: toId(raw._id ?? raw.id),
    headName,
    status: raw.status ? String(raw.status) : 'Active',
    productIds,
  };
}

function offerToProduct(offer: MenuOffer): MenuProduct {
  return {
    id: offer.id,
    name: offer.name,
    productType: 'KITCHEN',
    status: offer.status,
    category: {id: 'offer', name: 'Offer', status: 'Active'},
    price: offer.price,
    taxes: offer.taxes,
    taxData: offer.taxData,
    isOffer: true,
    inclusions: offer.inclusions,
    choices: offer.choices,
    drinks: offer.drinks,
  };
}

async function fetchLiveMenuData(): Promise<MenuData> {
  const [catRes, prodRes, taxRes, offerRes, headResult, phResult] =
    await Promise.all([
      api.get<ApiEnvelope<Record<string, unknown>[]>>(
        '/api/menu/categories?active=1',
      ),
      api.get<ApiEnvelope<Record<string, unknown>[]>>(
        '/api/menu/products?active=1',
      ),
      api.get<ApiEnvelope<Record<string, unknown>[]>>('/api/tax'),
      api.get<ApiEnvelope<Record<string, unknown>[]>>(
        '/api/menu/offers?active=1',
      ),
      api
        .get<ApiEnvelope<Record<string, unknown>[]>>(
          '/api/menu/heads?active=1',
        )
        .catch(() => null),
      api
        .get<ApiEnvelope<Record<string, unknown>[]>>(
          '/api/menu/product-heads?active=1',
        )
        .catch(() => null),
    ]);

  const categories = (catRes.data.data || [])
    .map((row) => normalizeCategory(row))
    .filter((c) => String(c.status || 'Active') !== 'Inactive');

  const products = (prodRes.data.data || [])
    .map((row) => normalizeProduct(row))
    .filter((p) => {
      const productActive = String(p.status || 'Active') !== 'Inactive';
      const categoryActive =
        String(p.category?.status || 'Active') !== 'Inactive';
      return productActive && categoryActive;
    });

  const offers = (offerRes.data.data || [])
    .map((row) => normalizeOffer(row))
    .filter((o) => String(o.status || 'Active') !== 'Inactive');

  const offerProducts = offers.map(offerToProduct);
  const allProducts = [...products, ...offerProducts];

  const headRows =
    headResult?.data?.success && Array.isArray(headResult.data.data)
      ? headResult.data.data
      : [];
  const menuHeads = headRows
    .map((row) => normalizeHead(row))
    .filter(
      (h) =>
        h.name &&
        String(h.name).toLowerCase() !== 'offer' &&
        String(h.status || 'Active') !== 'Inactive',
    );

  const heads: MenuHead[] =
    menuHeads.length > 0
      ? [
          {id: 'all', name: 'All'},
          ...menuHeads,
          {id: 'offer', name: 'Offer'},
        ]
      : [
          {id: 'all', name: 'All'},
          ...categories
            .filter((c) => c.name.toLowerCase() !== 'offer')
            .map((c) => ({id: c.id, name: c.name, status: c.status})),
          {id: 'offer', name: 'Offer'},
        ];

  const phRows =
    phResult?.data?.success && Array.isArray(phResult.data.data)
      ? phResult.data.data
      : [];
  const productHeads = phRows
    .map((row) => normalizeProductHead(row))
    .filter(
      (ph) => ph.headName && String(ph.status || 'Active') !== 'Inactive',
    );

  const globalTaxes = (taxRes.data.data || [])
    .filter(
      (row) =>
        String((row as {status?: string}).status || 'Active') === 'Active',
    )
    .map((row) => normalizeTax(row));

  const categoryNames = [
    'All',
    ...categories.map((c) => c.name),
    ...(offers.length ? ['Offer'] : []),
  ];

  return {
    categories,
    products: allProducts,
    offers,
    heads,
    productHeads,
    globalTaxes,
    categoryNames,
  };
}

export function isMenuApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchMenuData(): Promise<MenuData> {
  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    return getMockMenuData();
  }

  try {
    return await fetchLiveMenuData();
  } catch (error) {
    throw new Error(mapMenuApiError(error));
  }
}
