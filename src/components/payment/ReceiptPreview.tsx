import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import {config} from '../../constants/config';
import type {CartLineItem} from '../../types/cart';
import type {
  KotLineItem,
  ReceiptMode,
  ReceiptOrder,
  TaxBreakdownLine,
} from '../../types/receipt';
import {formatCurrency} from '../../utils/currency';
import {isOfferItem} from '../../utils/offerDetails';
import {formatTableLocation} from '../../utils/orderDisplay';
import {
  formatReceiptDate,
  formatTableNumbersWithFloor,
  getReceiptModifierLines,
} from '../../utils/receiptFormat';

export interface ReceiptRestaurantDetails {
  name?: string;
  address?: string;
  phone?: string;
  hstNumber?: string;
  thankYouMessage?: string;
}

export interface ReceiptPreviewProps {
  mode: ReceiptMode;
  order: ReceiptOrder;
  kotItems?: Array<KotLineItem | CartLineItem>;
  barItems?: Array<KotLineItem | CartLineItem>;
  taxBreakdown?: TaxBreakdownLine[];
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  restaurantName?: string;
  restaurantDetails?: ReceiptRestaurantDetails | null;
  isReprint?: boolean;
}

function isDirectSaleOrder(order?: Partial<ReceiptOrder> | null): boolean {
  const src = String(order?.source || '').toUpperCase();
  return src === 'WALK_IN' || src === 'ONLINE';
}

function shouldShowTable(order?: Partial<ReceiptOrder> | null): boolean {
  if (!order?.tableNo) return false;
  const src = String(order?.source || '').toUpperCase();
  return src !== 'WALK_IN' && src !== 'ONLINE';
}

function groupKotItems(
  items: Array<KotLineItem | CartLineItem>,
): Record<string, Array<KotLineItem | CartLineItem>> {
  const groups: Record<string, Array<KotLineItem | CartLineItem>> = {};
  items.forEach((item) => {
    const groupName = isOfferItem(item) ? 'Offers' : item.category || 'ITEMS';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });
  return groups;
}

function getItemSeats(item: unknown): string[] {
  const obj = item as {seat?: unknown; seats?: unknown[]};
  const seatBits: string[] = [];
  if (obj?.seat) seatBits.push(String(obj.seat));
  if (Array.isArray(obj?.seats)) {
    obj.seats.filter(Boolean).forEach((s) => seatBits.push(String(s)));
  }
  return seatBits;
}

/**
 * Hardware-independent Kitchen Order Ticket preview matching KitchenOrderTicket.jsx
 */
function KotReceiptBody({
  order,
  kotItems = [],
  serverName,
  guestCount,
  specialNote,
  restaurantName = config.APP_NAME.toUpperCase(),
  isReprint = false,
}: {
  order: ReceiptOrder;
  kotItems?: Array<KotLineItem | CartLineItem>;
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  restaurantName?: string;
  isReprint?: boolean;
}) {
  const items =
    kotItems && kotItems.length > 0 ? kotItems : (order.items || []);

  if (!items.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.restaurantMeta}>{restaurantName}</Text>
        <Text style={styles.receiptTitle}>KOT</Text>
        {isReprint ? (
          <Text style={styles.reprintBadge}>*** REPRINT ***</Text>
        ) : null}
        <Text style={styles.emptyText}>No items found for this KOT ticket.</Text>
      </View>
    );
  }

  const {orderNumber, tableNo, guestName, partyName, createdAt} = order;
  const tableLabel = formatTableLocation(tableNo, order.floorName);
  const note = specialNote || order.specialNote;
  const partyLabel =
    partyName || guestName || (isDirectSaleOrder(order) ? 'Walk-in' : '');
  const directSale = isDirectSaleOrder(order);
  const resolvedGuests =
    guestCount != null
      ? guestCount
      : order.guestCount != null
        ? order.guestCount
        : null;
  const grouped = groupKotItems(items);

  return (
    <>
      <View style={styles.receiptHeader}>
        <Text style={styles.restaurantMeta}>{restaurantName}</Text>
        <Text style={styles.receiptTitle}>KOT</Text>
        {isReprint ? (
          <Text style={styles.reprintBadge}>*** REPRINT ***</Text>
        ) : null}
        <Text style={styles.receiptBold}>
          {directSale
            ? partyLabel || 'Walk-in'
            : tableLabel || 'Takeaway / No Table'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Order #:</Text> {orderNumber}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Sent:</Text>{' '}
          {formatReceiptDate(createdAt)}
        </Text>
        {serverName ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Server:</Text> {serverName}
          </Text>
        ) : null}
        {resolvedGuests != null ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Guests:</Text> {resolvedGuests}
          </Text>
        ) : null}
        {partyLabel ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Party:</Text> {partyLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {Object.entries(grouped).map(([group, groupItems]) => (
        <View key={group} style={styles.categoryBlock}>
          <Text style={styles.categoryTitle}>{group.toUpperCase()}</Text>
          {groupItems.map((item, index) => {
            const modifierLines = getReceiptModifierLines(item);
            const itemNotes =
              (item as {notes?: string; specialInstructions?: string}).notes ||
              (item as {notes?: string; specialInstructions?: string})
                .specialInstructions;
            const seat = (item as {seat?: string}).seat;
            const course = (item as {course?: string}).course;

            return (
              <View key={`${item.name}-${index}`} style={styles.itemBlock}>
                <Text style={styles.itemLine}>
                  <Text style={styles.itemQty}>{item.qty} × </Text>
                  <Text style={styles.itemName}>
                    {item.productCode ? `${item.productCode} ` : ''}
                    {item.name}
                    {item.size && item.size !== 'Standard'
                      ? ` (${item.size})`
                      : ''}
                  </Text>
                </Text>
                {seat ? (
                  <Text style={styles.itemMetaLine}>Seat: {seat}</Text>
                ) : null}
                {course ? (
                  <Text style={styles.itemMetaLine}>Course: {course}</Text>
                ) : null}
                {modifierLines.map((line, lineIdx) => (
                  <Text key={lineIdx} style={styles.modifierLine}>
                    + {line.text}
                  </Text>
                ))}
                {itemNotes ? (
                  <Text style={styles.itemNoteLine}>Note: {itemNotes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {note ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesBoxTitle}>SPECIAL INSTRUCTIONS / NOTES:</Text>
          <Text style={styles.notesBoxText}>{note}</Text>
        </View>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.kotFooter}>*** KOT #{orderNumber} ***</Text>
    </>
  );
}

/**
 * Hardware-independent Bar Ticket preview matching BarReceipt.jsx
 */
function BarReceiptBody({
  order,
  barItems = [],
  serverName,
  guestCount,
  specialNote,
  restaurantName = config.APP_NAME.toUpperCase(),
  isReprint = false,
}: {
  order: ReceiptOrder;
  barItems?: Array<KotLineItem | CartLineItem>;
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  restaurantName?: string;
  isReprint?: boolean;
}) {
  const items = barItems && barItems.length > 0 ? barItems : (order.items || []);

  if (!items.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.restaurantMeta}>{restaurantName}</Text>
        <Text style={styles.receiptTitle}>BAR RECEIPT</Text>
        {isReprint ? (
          <Text style={styles.reprintBadge}>*** REPRINT ***</Text>
        ) : null}
        <Text style={styles.emptyText}>No items found for this bar ticket.</Text>
      </View>
    );
  }

  const {orderNumber, tableNo, guestName, partyName, createdAt} = order;
  const tableLabel = formatTableNumbersWithFloor(tableNo, order.floorName);
  const note = specialNote || order.specialNote;
  const partyLabel =
    partyName || guestName || (isDirectSaleOrder(order) ? 'Walk-in' : '');
  const directSale = isDirectSaleOrder(order);
  const covers =
    guestCount != null
      ? guestCount
      : order.guestCount != null
        ? order.guestCount
        : null;

  return (
    <>
      <View style={styles.receiptHeader}>
        <Text style={styles.restaurantMeta}>{restaurantName}</Text>
        <Text style={styles.receiptTitle}>BAR RECEIPT</Text>
        {isReprint ? (
          <Text style={styles.reprintBadge}>*** REPRINT ***</Text>
        ) : null}
      </View>

      {(partyLabel || covers != null || (!directSale && tableLabel)) ? (
        <View style={styles.barTopBlock}>
          {partyLabel || covers != null ? (
            <Text style={styles.barTopBold}>
              PARTY: {partyLabel || covers}
              {covers != null && partyLabel ? ` (${covers})` : ''}
            </Text>
          ) : null}
          {!directSale ? (
            <Text style={styles.barTopBold}>
              TABLE: {tableLabel || 'Takeaway'}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Sent:</Text>{' '}
          {formatReceiptDate(createdAt)}
        </Text>
        {!directSale && tableLabel ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Table:</Text> {tableLabel}
            {covers != null
              ? `, ${covers} Cover${covers === 1 ? '' : 's'}`
              : ''}
          </Text>
        ) : null}
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Order:</Text> {orderNumber}
        </Text>
        {partyLabel ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Party Name:</Text> {partyLabel}
          </Text>
        ) : null}
        {serverName ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Server:</Text> {serverName}
          </Text>
        ) : null}
      </View>

      {note ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesBoxTitle}>SPECIAL INSTRUCTIONS / NOTES:</Text>
          <Text style={styles.notesBoxText}>{note}</Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.categoryBlock}>
        <Text style={styles.categoryTitle}>DRINKS</Text>
        {items.map((item, index) => {
          const modifierLines = getReceiptModifierLines(item);
          const seatBits = getItemSeats(item);
          const course = (item as {course?: string}).course;
          const itemNotes =
            (item as {notes?: string; specialInstructions?: string}).notes ||
            (item as {notes?: string; specialInstructions?: string})
              .specialInstructions;

          return (
            <View key={`${item.name}-${index}`} style={styles.itemBlock}>
              <Text style={styles.itemLine}>
                <Text style={styles.itemQty}>{item.qty} × </Text>
                <Text style={styles.itemName}>
                  {item.productCode ? `${item.productCode} ` : ''}
                  {item.name}
                  {item.size && item.size !== 'Standard'
                    ? ` (${item.size})`
                    : ''}
                  {seatBits.length > 0
                    ? ` (${seatBits
                        .map((s) => `S${s.replace(/^S/i, '')}`)
                        .join(', ')})`
                    : ''}
                </Text>
              </Text>
              {course ? (
                <Text style={styles.itemMetaLine}>Course: {course}</Text>
              ) : null}
              {modifierLines.map((line, lineIdx) => (
                <Text key={lineIdx} style={styles.modifierLine}>
                  + {line.text}
                </Text>
              ))}
              {itemNotes ? (
                <Text style={styles.itemNoteLine}>Note: {itemNotes}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.divider} />
      <Text style={styles.kotFooter}>*** BAR #{orderNumber} ***</Text>
    </>
  );
}

/**
 * Customer Receipt preview matching CustomerReceipt.jsx
 */
function CustomerReceiptBody({
  order,
  taxBreakdown,
  serverName,
  guestCount,
  restaurantName = config.APP_NAME.toUpperCase(),
  restaurantDetails,
  isReprint = false,
}: {
  order: ReceiptOrder;
  taxBreakdown?: TaxBreakdownLine[];
  serverName?: string;
  guestCount?: number;
  restaurantName?: string;
  restaurantDetails?: ReceiptRestaurantDetails | null;
  isReprint?: boolean;
}) {
  const restName =
    restaurantDetails?.name || restaurantName || order?.restaurantName || config.APP_NAME.toUpperCase();
  const restAddress =
    restaurantDetails?.address ||
    '345 Main Street South\nExeter, ON, Canada, N0M 1S6';
  const restPhone = restaurantDetails?.phone || '519 235 0050';
  const hstNumber = restaurantDetails?.hstNumber || '740811146';
  const thankYou =
    restaurantDetails?.thankYouMessage || 'Thank You! Please Come Again!';

  const rawTableLabel = formatTableNumbersWithFloor(order?.tableNo, order?.floorName);
  const tableLabel = rawTableLabel.replace(/^(tables?\s*)+/i, '').trim();
  const partyLabel = order?.partyName || order?.guestName;
  const items = (order?.items ?? []) as CartLineItem[];

  const resolvedTaxBreakdown = (() => {
    const fromProp = Array.isArray(taxBreakdown) ? taxBreakdown : [];
    const fromOrder = Array.isArray(
      (order as {taxBreakdown?: TaxBreakdownLine[]})?.taxBreakdown,
    )
      ? (order as {taxBreakdown?: TaxBreakdownLine[]}).taxBreakdown!
      : [];
    return fromProp.length > 0 ? fromProp : fromOrder;
  })();

  const hstAmount = (() => {
    if (resolvedTaxBreakdown.length > 0) {
      return resolvedTaxBreakdown.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      );
    }
    return Number(order?.taxTotal || 0);
  })();

  const tip = Number(order?.tipAmount || 0);
  const discount = Number(order?.discountTotal || 0);
  const serviceCharge = Number(order?.serviceChargeTotal || 0);
  const giftUsed = Number(
    order?.giftcardUsedAmount ??
      (order as {giftCardUsedAmount?: number})?.giftCardUsedAmount ??
      (order as {giftCardUsed?: number})?.giftCardUsed ??
      0,
  );
  const cash = Number(order?.cashAmount || 0);
  const card = Number(order?.cardAmount || 0);
  const orderTotal = Number(order?.totalAmount || 0);
  const grandTotal = orderTotal + tip;

  const resolvedGuests =
    guestCount != null
      ? guestCount
      : order?.guestCount != null
        ? order.guestCount
        : null;

  const discountPct = (() => {
    if (order?.discountPercent != null && Number(order.discountPercent) > 0) {
      return Number(order.discountPercent);
    }
    const numSub = Number(order?.subTotal || 0);
    const numDisc = Number(discount || 0);
    if (numSub > 0 && numDisc > 0) {
      return Math.round((numDisc / numSub) * 1000) / 10;
    }
    return null;
  })();

  const discountLabel = (() => {
    if (discountPct != null && discountPct > 0) {
      return `Discount (${discountPct}%)`;
    }
    if (discount > 0) {
      return `Discount ($${discount.toFixed(2)})`;
    }
    return 'Discount';
  })();

  const totalHstRate = (() => {
    const breakdownRatesSum = resolvedTaxBreakdown.reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) {
      return Math.round(breakdownRatesSum * 10) / 10;
    }
    const sub = Number(order?.subTotal || 0);
    const taxableBase = Math.max(0, sub - Number(discount || 0));
    if (
      taxableBase > 0 &&
      (hstAmount > 0 || Number(order?.taxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(order?.taxTotal || hstAmount) / taxableBase) * 1000,
        ) / 10
      );
    }
    if (
      sub > 0 &&
      (hstAmount > 0 || Number(order?.taxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(order?.taxTotal || hstAmount) / sub) * 1000,
        ) / 10
      );
    }
    return null;
  })();

  const hstLabel =
    totalHstRate != null && totalHstRate > 0
      ? `HST (${totalHstRate}%)`
      : 'HST';

  const methodStr = String(
    order?.paymentMethod || (order as {method?: string})?.method || '',
  ).trim();
  const cardLabelMatch = methodStr.match(/Card\s*-\s*([^+/]+)/i);
  const cardLabel = cardLabelMatch
    ? `Card (${cardLabelMatch[1].trim()})`
    : 'Card';

  const tipLabel = (() => {
    if (!(tip > 0)) return 'Tip';
    const raw = String(order?.tipMethod || '').trim();
    if (/gift/i.test(raw)) return 'Tip (Gift Card)';
    if (/cash/i.test(raw)) return 'Tip (Cash)';
    if (/card/i.test(raw)) return 'Tip (Card)';
    if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
      return 'Tip (Gift Card)';
    }
    if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) return 'Tip (Cash)';
    if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) return 'Tip (Card)';
    return 'Tip';
  })();

  const hasPaymentSplit = Boolean(
    giftUsed > 0 || cash > 0 || card > 0 || methodStr,
  );

  const regularItems = items.filter((item) => !isOfferItem(item));
  const offerItems = items.filter((item) => isOfferItem(item));

  const renderReceiptItem = (item: CartLineItem, idx: number | string) => {
    const modifierLines = getReceiptModifierLines(item);
    const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);

    return (
      <View key={idx} style={styles.customerItem}>
        <View style={styles.customerItemRow}>
          <Text style={styles.customerItemName} numberOfLines={2}>
            {item.qty > 1 ? `${item.qty} × ` : ''}
            {item.productCode ? `${item.productCode} ` : ''}
            {item.name}
            {item.size && item.size !== 'Standard' ? ` (${item.size})` : ''}
          </Text>
          <Text style={styles.customerItemPrice}>
            {formatCurrency(lineTotal)}
          </Text>
        </View>
        {modifierLines.map((line, lineIdx) => (
          <Text key={lineIdx} style={styles.modifierLine}>
            + {line.text}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <>
      <View style={styles.receiptHeader}>
        <Text style={styles.restaurantName}>{restName}</Text>
        {isReprint ? (
          <Text style={styles.reprintBadge}>*** REPRINT ***</Text>
        ) : null}
        {restAddress ? (
          <Text style={styles.restaurantAddress}>{restAddress}</Text>
        ) : null}
        {restPhone ? (
          <Text style={styles.restaurantPhone}>{restPhone}</Text>
        ) : null}
        <Text style={styles.receiptDate}>
          {formatReceiptDate(order.createdAt)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <View style={styles.metaTwoCol}>
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Order #:</Text> {order?.orderNumber}
          </Text>
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Invoice No:</Text>{' '}
            {order?.invoiceNumber || '—'}
          </Text>
        </View>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Server:</Text>{' '}
          {serverName || (order as {serverName?: string}).serverName || 'Server'}
        </Text>
        {shouldShowTable(order) && tableLabel ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Table:</Text> {tableLabel}
          </Text>
        ) : null}
        {partyLabel || !shouldShowTable(order) ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Party:</Text>{' '}
            {partyLabel || 'Walk-in'}
          </Text>
        ) : null}
        {resolvedGuests != null ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Guests:</Text> {resolvedGuests}
          </Text>
        ) : null}
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>HST:</Text> {hstNumber}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* ITEM / AMOUNT Column Header */}
      <View style={styles.tableColHeader}>
        <Text style={styles.tableColLabel}>ITEM</Text>
        <Text style={styles.tableColLabel}>AMOUNT</Text>
      </View>

      <View style={styles.divider} />

      {regularItems.map((item, idx) => renderReceiptItem(item, idx))}

      {offerItems.length > 0 ? (
        <View style={styles.offersBlock}>
          {regularItems.length > 0 ? <View style={styles.divider} /> : null}
          <Text style={styles.offersTitle}>OFFERS</Text>
          <View style={styles.dividerDashed} />
          {offerItems.map((item, idx) =>
            renderReceiptItem(item, `offer-${idx}`),
          )}
        </View>
      ) : null}

      <View style={styles.divider} />

      {/* Totals Section */}
      <View style={styles.totalsBlock}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(order?.subTotal ?? 0)}
          </Text>
        </View>

        {discount > 0 ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelDiscount}>{discountLabel}</Text>
              <Text style={styles.totalValueDiscount}>
                -{formatCurrency(discount)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Net Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(
                  Math.max(0, (order?.subTotal ?? 0) - discount),
                )}
              </Text>
            </View>
          </>
        ) : null}

        {hstAmount > 0 || (discount > 0 && totalHstRate != null && totalHstRate > 0) ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{hstLabel}</Text>
            <Text style={styles.totalValue}>{formatCurrency(hstAmount)}</Text>
          </View>
        ) : null}

        {serviceCharge > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {order?.serviceChargeName || 'Server Charge'}
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(serviceCharge)}
            </Text>
          </View>
        ) : null}

        {tip > 0 ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Order Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{tipLabel}</Text>
              <Text style={styles.totalValue}>{formatCurrency(tip)}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.dividerThin} />
        <View style={styles.totalRow}>
          <Text style={styles.totalBold}>TOTAL</Text>
          <Text style={styles.totalBold}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      {/* Payment Method Split */}
      {hasPaymentSplit ? (
        <>
          <View style={styles.dividerDashed} />
          <View style={styles.totalsBlock}>
            <Text style={styles.paymentSectionTitle}>PAYMENT METHOD</Text>
            {giftUsed > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gift Card</Text>
                <Text style={styles.totalValue}>{formatCurrency(giftUsed)}</Text>
              </View>
            ) : null}
            {cash > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Cash</Text>
                <Text style={styles.totalValue}>{formatCurrency(cash)}</Text>
              </View>
            ) : null}
            {card > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{cardLabel}</Text>
                <Text style={styles.totalValue}>{formatCurrency(card)}</Text>
              </View>
            ) : null}
            {giftUsed <= 0 && cash <= 0 && card <= 0 && methodStr ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {methodStr.includes('+')
                    ? methodStr
                    : /gift/i.test(methodStr)
                    ? 'Gift Card'
                    : /cash/i.test(methodStr)
                    ? 'Cash'
                    : /card/i.test(methodStr)
                    ? cardLabel
                    : methodStr}
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(grandTotal > 0 ? grandTotal : orderTotal)}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.thankYou}>{thankYou}</Text>
    </>
  );
}

export function ReceiptPreview({
  mode,
  order,
  kotItems = [],
  barItems,
  taxBreakdown,
  serverName,
  guestCount,
  specialNote,
  restaurantName = config.APP_NAME.toUpperCase(),
  restaurantDetails,
  isReprint = false,
}: ReceiptPreviewProps) {
  const resolvedReprint = isReprint || Boolean(order?.isReprint);
  const resolvedRestName =
    restaurantDetails?.name ||
    restaurantName ||
    order?.restaurantName ||
    config.APP_NAME.toUpperCase();

  return (
    <View style={styles.paper}>
      {mode === 'customer' ? (
        <CustomerReceiptBody
          order={order}
          taxBreakdown={taxBreakdown}
          serverName={serverName}
          guestCount={guestCount}
          restaurantName={resolvedRestName}
          restaurantDetails={restaurantDetails}
          isReprint={resolvedReprint}
        />
      ) : mode === 'bar' ? (
        <BarReceiptBody
          order={order}
          barItems={barItems ?? kotItems}
          serverName={serverName}
          guestCount={guestCount}
          specialNote={specialNote}
          restaurantName={resolvedRestName}
          isReprint={resolvedReprint}
        />
      ) : (
        <KotReceiptBody
          order={order}
          kotItems={kotItems}
          serverName={serverName}
          guestCount={guestCount}
          specialNote={specialNote}
          restaurantName={resolvedRestName}
          isReprint={resolvedReprint}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: 300,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  restaurantAddress: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  restaurantPhone: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  receiptDate: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  restaurantMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },
  receiptTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  reprintBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
    textAlign: 'center',
    marginVertical: 2,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  receiptBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },
  barTopBlock: {
    alignItems: 'center',
    marginVertical: 4,
    gap: 2,
  },
  barTopBold: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  divider: {
    borderTopWidth: 2,
    borderTopColor: colors.text,
    marginVertical: 8,
  },
  dividerThin: {
    borderTopWidth: 1,
    borderTopColor: colors.text,
    marginVertical: 6,
  },
  dividerDashed: {
    borderTopWidth: 1,
    borderTopColor: colors.text,
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  metaBlock: {
    gap: 3,
  },
  metaTwoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLine: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  metaBold: {
    fontWeight: '800',
  },
  tableColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 2,
  },
  tableColLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  categoryBlock: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingBottom: 3,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  offersBlock: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  offersTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  itemBlock: {
    marginBottom: 6,
  },
  itemLine: {
    fontSize: 11,
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  itemQty: {
    fontWeight: '900',
  },
  itemName: {
    fontWeight: '800',
  },
  itemMetaLine: {
    fontSize: 10,
    color: colors.textSecondary,
    paddingLeft: 18,
    marginTop: 1,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  itemNoteLine: {
    fontSize: 10,
    color: colors.text,
    fontStyle: 'italic',
    fontWeight: '700',
    paddingLeft: 18,
    marginTop: 1,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  modifierLine: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 16,
    marginTop: 1,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  notesBox: {
    padding: 7,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderStyle: 'dashed',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    marginVertical: 6,
  },
  notesBoxTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  notesBoxText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  kotFooter: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
    marginTop: 2,
  },
  customerItem: {
    marginBottom: 6,
  },
  customerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  customerItemName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  customerItemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  totalsBlock: {
    gap: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  totalLabelDiscount: {
    fontSize: 11,
    color: colors.success || '#059669',
    fontWeight: '700',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  totalValueDiscount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success || '#059669',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  totalBold: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  paymentSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  thankYou: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginVertical: 4,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});
