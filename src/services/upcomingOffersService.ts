import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {
  UpcomingOfferCountResponse,
  UpcomingOfferOrder,
  UpcomingOffersListResponse,
} from '../types/upcomingOffer';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapUpcomingOffersApiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to view upcoming offers.";
    }
    if (!error.response) {
      return 'Unable to load upcoming offers. Check your connection and try again.';
    }
    return message || fallback;
  }
  return fallback;
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

function normalizeUpcomingOffer(
  raw: Record<string, unknown>,
): UpcomingOfferOrder {
  const pickup = raw.pickup as {time?: string; date?: string} | null | undefined;
  const items = Array.isArray(raw.items)
    ? (raw.items as Array<Record<string, unknown>>).map((item) => ({
        name: String(item.name ?? ''),
        qty: Number(item.qty) || 0,
        price: item.price != null ? Number(item.price) : undefined,
        isOffer: Boolean(item.isOffer),
        inclusions: Array.isArray(item.inclusions)
          ? item.inclusions.map(String)
          : [],
        choices: Array.isArray(item.choices) ? item.choices.map(String) : [],
        drinks: Array.isArray(item.drinks) ? item.drinks.map(String) : [],
        notes: item.notes != null ? String(item.notes) : '',
      }))
    : [];

  return {
    id: toId(raw._id ?? raw.id),
    _id: toId(raw._id ?? raw.id),
    orderNumber: String(raw.orderNumber ?? ''),
    status: String(raw.status ?? 'PENDING'),
    paymentStatus:
      raw.paymentStatus != null ? String(raw.paymentStatus) : undefined,
    source: raw.source != null ? String(raw.source) : undefined,
    partyName: raw.partyName != null ? String(raw.partyName) : '',
    contactNumber:
      raw.contactNumber != null ? String(raw.contactNumber) : '',
    guestEmail: raw.guestEmail != null ? String(raw.guestEmail) : null,
    offerFulfillmentDate:
      raw.offerFulfillmentDate != null
        ? String(raw.offerFulfillmentDate)
        : null,
    pickup: pickup
      ? {
          time: pickup.time != null ? String(pickup.time) : undefined,
          date: pickup.date != null ? String(pickup.date) : undefined,
        }
      : null,
    specialNote: raw.specialNote != null ? String(raw.specialNote) : null,
    totalAmount: Number(raw.totalAmount) || 0,
    items,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

export async function fetchUpcomingOffers(): Promise<UpcomingOffersListResponse> {
  if (!useLiveApi) {
    return {success: true, data: []};
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      '/api/sales/upcoming-offers',
    );
    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load upcoming offers',
      };
    }
    const rows = Array.isArray(response.data.data) ? response.data.data : [];
    return {
      success: true,
      data: rows.map(normalizeUpcomingOffer),
    };
  } catch (error) {
    return {
      success: false,
      message: mapUpcomingOffersApiError(error, 'Failed to load upcoming offers'),
    };
  }
}

export async function fetchUpcomingOffersCount(): Promise<UpcomingOfferCountResponse> {
  if (!useLiveApi) {
    return {success: true, data: {pendingCount: 0}};
  }

  try {
    const response = await api.get<ApiEnvelope<{pendingCount?: number}>>(
      '/api/sales/upcoming-offers?pendingCount=true',
    );
    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load upcoming offer count',
      };
    }
    return {
      success: true,
      data: {
        pendingCount: Number(response.data.data?.pendingCount || 0),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: mapUpcomingOffersApiError(
        error,
        'Failed to load upcoming offer count',
      ),
    };
  }
}
