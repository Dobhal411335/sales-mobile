import type {CartLineItem} from '../types/cart';
import type {OrderType} from '../navigation/types';
import type {TaxRate} from '../types/product';
import type {KotLineItem, ReceiptOrder, TicketType} from '../types/receipt';
import {cartLineToKotItem} from '../utils/receiptFormat';
import {buildCartTotals, getCartFingerprint} from '../utils/cartPricing';

export interface SubmitOrderPayload {
  items: CartLineItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  discountCode?: string | null;
  totalAmount: number;
  specialNote?: string;
  sessionId?: string | null;
  orderId?: string;
  tableNo?: string;
  guestName?: string;
  partyName?: string;
  contactNumber?: string | null;
  guestCountryCode?: string | null;
  guestEmail?: string | null;
  guestCount?: number | null;
  orderType?: OrderType;
  source?: string;
  staffForId?: string;
  staffOrderReason?: string | null;
  floorName?: string;
}

export interface SubmitOrderResult {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    orderNumber: string;
    ticketType: TicketType;
    kotPayload: KotLineItem[];
    items: CartLineItem[];
    subTotal: number;
    taxTotal: number;
    discountTotal: number;
    discountCode?: string;
    totalAmount: number;
    processedByName?: string;
    source?: string;
    tableNo?: string;
    guestCount?: number;
    floorName?: string;
    partyName?: string;
    guestName?: string;
    specialNote?: string;
    createdAt: string;
  };
}

let mockOrderSequence = 163;

function buildKotPayload(items: CartLineItem[]): KotLineItem[] {
  return items.map(cartLineToKotItem);
}

function detectTicketType(items: CartLineItem[]): TicketType {
  const hasBarOnly =
    items.length > 0 &&
    items.every((item) => item.category?.toLowerCase().includes('bar'));
  return hasBarOnly ? 'BAR_RECEIPT' : 'KOT';
}

export async function submitOrderMock(
  payload: SubmitOrderPayload,
): Promise<SubmitOrderResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  if (!payload.items.length) {
    return {success: false, message: 'Cart is empty.'};
  }

  mockOrderSequence += 1;
  const orderNumber = String(mockOrderSequence).padStart(4, '0');
  const orderId = payload.orderId ?? `order-${Date.now()}`;
  const kotPayload = buildKotPayload(payload.items);
  const ticketType = detectTicketType(payload.items);

  return {
    success: true,
    data: {
      _id: orderId,
      orderNumber,
      ticketType,
      kotPayload,
      items: payload.items,
      subTotal: payload.subTotal,
      taxTotal: payload.taxTotal,
      discountTotal: payload.discountTotal,
      discountCode: payload.discountCode ?? undefined,
      totalAmount: payload.totalAmount,
      processedByName: 'Akhil Maratha',
      source: payload.source,
      tableNo: payload.tableNo,
      guestCount: payload.guestCount ?? undefined,
      floorName: payload.floorName,
      partyName: payload.partyName,
      guestName: payload.guestName,
      specialNote: payload.specialNote,
      createdAt: new Date().toISOString(),
    },
  };
}

export function buildSubmitPayloadFromCart(
  items: CartLineItem[],
  globalTaxes: TaxRate[],
  appliedDiscount: {code?: string; type: 'percent' | 'fixed'; value: number} | null,
  orderNote: string,
  extras: Partial<SubmitOrderPayload>,
): SubmitOrderPayload {
  const totals = buildCartTotals(items, globalTaxes, appliedDiscount);
  return {
    items,
    subTotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    discountCode: appliedDiscount?.code ?? null,
    totalAmount: totals.total,
    specialNote: orderNote,
    ...extras,
  };
}

export function toReceiptOrder(
  data: SubmitOrderResult['data'],
): ReceiptOrder | null {
  if (!data) {
    return null;
  }
  return {
    orderNumber: data.orderNumber,
    orderId: data._id,
    tableNo: data.tableNo,
    floorName: data.floorName,
    guestName: data.guestName,
    partyName: data.partyName,
    guestCount: data.guestCount,
    createdAt: data.createdAt,
    specialNote: data.specialNote,
    items: data.items,
    subTotal: data.subTotal,
    taxTotal: data.taxTotal,
    discountTotal: data.discountTotal,
    discountCode: data.discountCode,
    totalAmount: data.totalAmount,
    source: data.source,
  };
}

export {getCartFingerprint};
