import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {
  MenuCategory,
  MenuHead,
  MenuOffer,
  MenuProduct,
  ProductHeadMapping,
  TaxRate,
} from '../types/product';
import {api} from './api';

export interface MenuSyncDeleted {
  products: string[];
  categories: string[];
  offers: string[];
  heads: string[];
  productHeads: string[];
  taxes: string[];
}

export interface MenuSyncResponse {
  version: string;
  serverTime: string;
  fullSync: boolean;
  categories: MenuCategory[];
  products: MenuProduct[];
  offers: MenuOffer[];
  heads: MenuHead[];
  productHeads: ProductHeadMapping[];
  taxes: TaxRate[];
  deleted: MenuSyncDeleted;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

function emptyDeleted(): MenuSyncDeleted {
  return {
    products: [],
    categories: [],
    offers: [],
    heads: [],
    productHeads: [],
    taxes: [],
  };
}

function mapSyncError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage =
      typeof error.response?.data === 'object' &&
      error.response?.data &&
      'message' in error.response.data
        ? String((error.response.data as {message?: string}).message || '')
        : '';

    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 404) {
      return 'Menu sync API not found. Is the Web server running the latest code?';
    }
    if (status && status >= 500) {
      return serverMessage || 'Server error while syncing menu.';
    }
    if (!error.response) {
      return `Cannot reach ${config.API_BASE_URL || 'API'}. For emulator use http://10.0.2.2:3000 and keep Web running.`;
    }
    return serverMessage || `Sync failed (HTTP ${status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unable to sync menu. Check your connection and try again.';
}

export function isMenuSyncConfigured(): boolean {
  return Boolean(config.API_BASE_URL);
}

export async function fetchMenuSync(
  since?: string | null,
): Promise<MenuSyncResponse> {
  if (!isMenuSyncConfigured()) {
    throw new Error('Menu API is not configured.');
  }

  try {
    // `_t` busts any intermediary/Android HTTP caches so price edits always land
    const params: Record<string, string> = {
      _t: String(Date.now()),
    };
    if (since) {
      params.since = since;
    }
    // Full menu can be large (100+ products) and slow on emulator — allow up to 60s
    const res = await api.get<ApiEnvelope<MenuSyncResponse>>(
      '/api/sales/menu/sync',
      {
        params,
        timeout: 60000,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      },
    );

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Menu sync failed');
    }

    const data = res.data.data;
    return {
      version: String(data.version || new Date().toISOString()),
      serverTime: String(data.serverTime || data.version || new Date().toISOString()),
      fullSync: Boolean(data.fullSync),
      categories: Array.isArray(data.categories) ? data.categories : [],
      products: Array.isArray(data.products) ? data.products : [],
      offers: Array.isArray(data.offers) ? data.offers : [],
      heads: Array.isArray(data.heads) ? data.heads : [],
      productHeads: Array.isArray(data.productHeads) ? data.productHeads : [],
      taxes: Array.isArray(data.taxes) ? data.taxes : [],
      deleted: {
        ...emptyDeleted(),
        ...(data.deleted || {}),
        products: data.deleted?.products || [],
        categories: data.deleted?.categories || [],
        offers: data.deleted?.offers || [],
        heads: data.deleted?.heads || [],
        productHeads: data.deleted?.productHeads || [],
        taxes: data.deleted?.taxes || [],
      },
    };
  } catch (error) {
    throw new Error(mapSyncError(error));
  }
}
