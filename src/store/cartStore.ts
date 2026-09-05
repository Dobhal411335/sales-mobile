import {create} from 'zustand';
import type {
  AppliedDiscount,
  CartLineItem,
  CartTotals,
  OrderStatus,
} from '../types/cart';
import type {TaxRate} from '../types/product';
import type {KotLineItem, PaidOrderSnapshot, TicketType} from '../types/receipt';
import {
  buildCartTotals,
  getCartFingerprint,
  mergeCartLines,
} from '../utils/cartPricing';

interface PartyFields {
  guestName: string;
  guestPhone: string;
  guestCountryCode: string;
  guestEmail: string;
  partyName: string;
  staffForId: string;
  staffOrderReason: string;
}

interface CartState extends PartyFields {
  items: CartLineItem[];
  orderNote: string;
  appliedDiscount: AppliedDiscount | null;
  hasSentKot: boolean;
  kotCartFingerprint: string | null;
  activeOrderId: string | null;
  orderNumber: string | null;
  orderStatus: OrderStatus;
  persistedTotals: CartTotals | null;
  globalTaxes: TaxRate[];
  isSubmitting: boolean;
  kotPayload: KotLineItem[];
  ticketType: TicketType;
  serverName: string | null;
  setGlobalTaxes: (taxes: TaxRate[]) => void;
  addItems: (items: CartLineItem[]) => void;
  updateQty: (cartId: string, qty: number) => void;
  removeItem: (cartId: string) => void;
  setOrderNote: (note: string) => void;
  clearCart: () => void;
  resetOrderState: () => void;
  setPartyFields: (fields: Partial<PartyFields>) => void;
  setIsSubmitting: (value: boolean) => void;
  applyKotResult: (result: {
    orderNumber: string;
    orderId: string;
    kotPayload: KotLineItem[];
    ticketType: TicketType;
    persistedTotals: CartTotals;
    serverName?: string;
    partyName?: string;
    items?: CartLineItem[];
  }) => void;
  hydrateFromOrder: (input: {
    items: CartLineItem[];
    orderNumber: string;
    orderId: string;
    orderStatus: OrderStatus;
    orderNote?: string;
    partyName?: string;
    guestName?: string;
    guestPhone?: string;
    guestCountryCode?: string;
    guestEmail?: string;
    hasSentKot: boolean;
    kotCartFingerprint: string | null;
    persistedTotals: CartTotals;
    appliedDiscount: AppliedDiscount | null;
    serverName?: string;
  }) => void;
  syncItemsFromServer: (items: CartLineItem[], persistedTotals: CartTotals) => void;
  markOrderPaid: (snapshot: PaidOrderSnapshot) => void;
  getTotals: () => CartTotals;
  canPay: () => boolean;
  canSendKot: () => boolean;
}

const initialPartyFields: PartyFields = {
  guestName: '',
  guestPhone: '',
  guestCountryCode: '+1',
  guestEmail: '',
  partyName: '',
  staffForId: '',
  staffOrderReason: '',
};

const initialOrderFields = {
  hasSentKot: false,
  kotCartFingerprint: null as string | null,
  activeOrderId: null as string | null,
  orderNumber: null as string | null,
  orderStatus: 'DRAFT' as OrderStatus,
  persistedTotals: null as CartTotals | null,
  kotPayload: [] as KotLineItem[],
  ticketType: 'KOT' as TicketType,
  serverName: null as string | null,
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderNote: '',
  appliedDiscount: null,
  globalTaxes: [],
  isSubmitting: false,
  ...initialPartyFields,
  ...initialOrderFields,

  setGlobalTaxes: (taxes) => set({globalTaxes: taxes}),

  setPartyFields: (fields) => set(fields),

  setIsSubmitting: (value) => set({isSubmitting: value}),

  addItems: (incoming) =>
    set((state) => {
      const items = mergeCartLines(state.items, incoming);
      const fingerprint = getCartFingerprint(items);
      const hasSentKot =
        state.hasSentKot && state.kotCartFingerprint === fingerprint;
      return {
        items,
        hasSentKot,
        kotCartFingerprint: hasSentKot ? state.kotCartFingerprint : null,
        persistedTotals: hasSentKot ? state.persistedTotals : null,
      };
    }),

  updateQty: (cartId, qty) =>
    set((state) => {
      const items =
        qty <= 0
          ? state.items.filter((item) => item.cartId !== cartId)
          : state.items.map((item) =>
              item.cartId === cartId ? {...item, qty} : item,
            );
      const fingerprint = getCartFingerprint(items);
      const hasSentKot =
        state.hasSentKot && state.kotCartFingerprint === fingerprint;
      return {
        items,
        hasSentKot,
        kotCartFingerprint: hasSentKot ? state.kotCartFingerprint : null,
        persistedTotals: hasSentKot ? state.persistedTotals : null,
      };
    }),

  removeItem: (cartId) => get().updateQty(cartId, 0),

  setOrderNote: (note) => set({orderNote: note}),

  clearCart: () =>
    set({
      items: [],
      orderNote: '',
      appliedDiscount: null,
      ...initialPartyFields,
      ...initialOrderFields,
    }),

  resetOrderState: () =>
    set({
      items: [],
      orderNote: '',
      appliedDiscount: null,
      ...initialPartyFields,
      ...initialOrderFields,
    }),

  applyKotResult: (result) => {
    const state = get();
    const items = result.items ?? state.items;
    set({
      items,
      hasSentKot: true,
      kotCartFingerprint: getCartFingerprint(items),
      orderNumber: result.orderNumber,
      activeOrderId: result.orderId,
      orderStatus: 'PENDING',
      persistedTotals: result.persistedTotals,
      kotPayload: result.kotPayload,
      ticketType: result.ticketType,
      serverName: result.serverName ?? state.serverName,
      partyName: result.partyName ?? state.partyName,
    });
  },

  hydrateFromOrder: (input) => {
    set({
      items: input.items,
      orderNote: input.orderNote ?? '',
      guestName: input.guestName ?? '',
      partyName: input.partyName ?? '',
      guestPhone: input.guestPhone ?? '',
      guestCountryCode: input.guestCountryCode ?? '+1',
      guestEmail: input.guestEmail ?? '',
      activeOrderId: input.orderId,
      orderNumber: input.orderNumber,
      orderStatus: input.orderStatus,
      hasSentKot: input.hasSentKot,
      kotCartFingerprint: input.kotCartFingerprint,
      persistedTotals: input.persistedTotals,
      appliedDiscount: input.appliedDiscount,
      serverName: input.serverName ?? null,
      kotPayload: [],
      isSubmitting: false,
    });
  },

  syncItemsFromServer: (items, persistedTotals) => {
    const fingerprint = getCartFingerprint(items);
    set({
      items,
      persistedTotals,
      hasSentKot: true,
      kotCartFingerprint: fingerprint,
      orderStatus: 'PENDING',
    });
  },

  markOrderPaid: (snapshot) => {
    set({
      orderStatus: 'PAID',
      orderNumber: snapshot.orderNumber,
      activeOrderId: snapshot.orderId ?? get().activeOrderId,
      persistedTotals: {
        subtotal: snapshot.subTotal ?? 0,
        taxTotal: snapshot.taxTotal ?? 0,
        discountTotal: snapshot.discountTotal ?? 0,
        total: snapshot.totalAmount ?? 0,
      },
    });
  },

  getTotals: () => {
    const state = get();
    if (state.hasSentKot && state.persistedTotals) {
      return state.persistedTotals;
    }
    return buildCartTotals(
      state.items,
      state.globalTaxes,
      state.appliedDiscount,
    );
  },

  canPay: () => {
    const state = get();
    return (
      state.hasSentKot &&
      state.items.length > 0 &&
      state.orderStatus !== 'PAID'
    );
  },

  canSendKot: () => {
    const state = get();
    if (state.isSubmitting || state.items.length === 0) {
      return false;
    }
    if (!state.hasSentKot) {
      return true;
    }
    const fingerprint = getCartFingerprint(state.items);
    return state.kotCartFingerprint !== fingerprint;
  },
}));

export function useCartItemCount(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.qty, 0),
  );
}
