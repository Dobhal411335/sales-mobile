import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import type {
  KotLineItem,
  ReceiptMode,
  ReceiptOrder,
  TaxBreakdownLine,
} from '../../types/receipt';
import {formatCurrency} from '../../utils/currency';
import {
  formatReceiptDate,
  formatTableNumbersWithFloor,
  getReceiptModifierLines,
} from '../../utils/receiptFormat';

interface ReceiptPreviewProps {
  mode: ReceiptMode;
  order: ReceiptOrder;
  kotItems?: KotLineItem[];
  taxBreakdown?: TaxBreakdownLine[];
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  restaurantName?: string;
}

function groupKotItems(items: KotLineItem[]): Record<string, KotLineItem[]> {
  const groups: Record<string, KotLineItem[]> = {};
  items.forEach((item) => {
    const groupName = item.isOffer ? 'Offers' : item.category || 'ITEMS';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });
  return groups;
}

function KotReceiptBody({
  order,
  kotItems,
  serverName,
  guestCount,
  specialNote,
  restaurantName,
  title,
}: {
  order: ReceiptOrder;
  kotItems: KotLineItem[];
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  restaurantName?: string;
  title: string;
}) {
  const tableLabel = formatTableNumbersWithFloor(
    order.tableNo,
    order.floorName,
  );
  const partyLabel = order.partyName || order.guestName || 'Walk-in';
  const grouped = groupKotItems(kotItems);
  const note = specialNote || order.specialNote;

  return (
    <>
      <View style={styles.receiptHeader}>
        {restaurantName ? (
          <Text style={styles.restaurantMeta}>{restaurantName}</Text>
        ) : null}
        <Text style={styles.receiptTitle}>{title}</Text>
        <Text style={styles.receiptBold}>
          {tableLabel || partyLabel}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Order #:</Text> {order.orderNumber}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Sent:</Text>{' '}
          {formatReceiptDate(order.createdAt)}
        </Text>
        {serverName ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Server:</Text> {serverName}
          </Text>
        ) : null}
        {partyLabel ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Party:</Text> {partyLabel}
            {guestCount != null ? ` · ${guestCount} guests` : ''}
          </Text>
        ) : null}
        {note ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Note:</Text> {note}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {Object.entries(grouped).map(([group, items]) => (
        <View key={group} style={styles.categoryBlock}>
          <Text style={styles.categoryTitle}>{group.toUpperCase()}</Text>
          {items.map((item, index) => {
            const modifierLines = getReceiptModifierLines(item);
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
                {modifierLines.map((line, lineIdx) => (
                  <Text key={lineIdx} style={styles.modifierLine}>
                    {line.text}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.divider} />
      <Text style={styles.kotFooter}>
        *** {title} #{order.orderNumber} ***
      </Text>
    </>
  );
}

function CustomerReceiptBody({
  order,
  taxBreakdown,
  serverName,
  guestCount,
  restaurantName = 'TASTY BITES',
}: {
  order: ReceiptOrder;
  taxBreakdown?: TaxBreakdownLine[];
  serverName?: string;
  guestCount?: number;
  restaurantName?: string;
}) {
  const tableLabel = formatTableNumbersWithFloor(
    order.tableNo,
    order.floorName,
  );
  const partyLabel = order.partyName || order.guestName;
  const items = order.items ?? [];
  const hstAmount =
    taxBreakdown && taxBreakdown.length > 0
      ? taxBreakdown.reduce((sum, line) => sum + line.amount, 0)
      : Number(order.taxTotal || 0);
  const tip = Number(order.tipAmount || 0);
  const discount = Number(order.discountTotal || 0);
  const serviceCharge = Number(order.serviceChargeTotal || 0);
  const giftUsed = Number(order.giftcardUsedAmount || 0);
  const orderTotal = Number(order.totalAmount || 0);
  const grandTotal = orderTotal + tip;

  return (
    <>
      <View style={styles.receiptHeader}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>
        {tableLabel ? (
          <Text style={styles.receiptBold}>{tableLabel}</Text>
        ) : null}
        {partyLabel ? (
          <Text style={styles.receiptSub}>{partyLabel}</Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Order #:</Text> {order.orderNumber}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaBold}>Date:</Text>{' '}
          {formatReceiptDate(order.createdAt)}
        </Text>
        {serverName ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Server:</Text> {serverName}
          </Text>
        ) : null}
        {guestCount != null ? (
          <Text style={styles.metaLine}>
            <Text style={styles.metaBold}>Guests:</Text> {guestCount}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {items.map((item: CartLineItem) => {
        const modifierLines = getReceiptModifierLines(item);
        const lineTotal = item.price * item.qty;
        return (
          <View key={item.cartId} style={styles.customerItem}>
            <View style={styles.customerItemRow}>
              <Text style={styles.customerItemName} numberOfLines={2}>
                {item.qty > 1 ? `${item.qty}× ` : ''}
                {item.name}
              </Text>
              <Text style={styles.customerItemPrice}>
                {formatCurrency(lineTotal)}
              </Text>
            </View>
            {modifierLines.map((line, idx) => (
              <Text key={idx} style={styles.modifierLine}>{line.text}</Text>
            ))}
          </View>
        );
      })}

      <View style={styles.divider} />

      <View style={styles.totalsBlock}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(order.subTotal ?? 0)}
          </Text>
        </View>
        {discount > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Discount{order.discountCode ? ` (${order.discountCode})` : ''}
            </Text>
            <Text style={styles.totalValue}>-{formatCurrency(discount)}</Text>
          </View>
        ) : null}
        {serviceCharge > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {order.serviceChargeName || 'Service Charge'}
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(serviceCharge)}
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>HST</Text>
          <Text style={styles.totalValue}>{formatCurrency(hstAmount)}</Text>
        </View>
        {giftUsed > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gift Card</Text>
            <Text style={styles.totalValue}>
              -{formatCurrency(giftUsed)}
            </Text>
          </View>
        ) : null}
        <View style={styles.dividerThin} />
        <View style={styles.totalRow}>
          <Text style={styles.totalBold}>TOTAL</Text>
          <Text style={styles.totalBold}>{formatCurrency(orderTotal)}</Text>
        </View>
        {tip > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Tip{order.tipMethod ? ` (${order.tipMethod})` : ''}
            </Text>
            <Text style={styles.totalValue}>{formatCurrency(tip)}</Text>
          </View>
        ) : null}
        {tip > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalBold}>GRAND TOTAL</Text>
            <Text style={styles.totalBold}>{formatCurrency(grandTotal)}</Text>
          </View>
        ) : null}
      </View>

      {order.paymentMethod ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.paymentLine}>
            Paid: {order.paymentMethod}
            {order.paymentStatus ? ` · ${order.paymentStatus}` : ''}
          </Text>
        </>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.thankYou}>Thank you! Please come again!</Text>
    </>
  );
}

export function ReceiptPreview({
  mode,
  order,
  kotItems = [],
  taxBreakdown,
  serverName,
  guestCount,
  specialNote,
  restaurantName,
}: ReceiptPreviewProps) {
  const title =
    mode === 'bar' ? 'BAR RECEIPT' : mode === 'kot' ? 'KOT' : 'RECEIPT';

  return (
    <View style={styles.paper}>
      {mode === 'customer' ? (
        <CustomerReceiptBody
          order={order}
          taxBreakdown={taxBreakdown}
          serverName={serverName}
          guestCount={guestCount}
          restaurantName={restaurantName}
        />
      ) : (
        <KotReceiptBody
          order={order}
          kotItems={kotItems}
          serverName={serverName}
          guestCount={guestCount}
          specialNote={specialNote}
          restaurantName={restaurantName}
          title={title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: 300,
    backgroundColor: '#FFFFFF',
    padding: 16,
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
    marginBottom: 8,
    gap: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  restaurantMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
  },
  receiptBold: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  receiptSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    borderTopWidth: 2,
    borderTopColor: colors.text,
    marginVertical: 10,
  },
  dividerThin: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: 6,
  },
  metaBlock: {
    gap: 3,
  },
  metaLine: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  metaBold: {
    fontWeight: '800',
  },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  itemBlock: {
    marginBottom: 8,
  },
  itemLine: {
    fontSize: 12,
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  itemQty: {
    fontWeight: '900',
  },
  itemName: {
    fontWeight: '800',
  },
  modifierLine: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 20,
    marginTop: 2,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  kotFooter: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
  },
  customerItem: {
    marginBottom: 8,
  },
  customerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  customerItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  customerItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  totalsBlock: {
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  totalBold: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  paymentLine: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  thankYou: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
});
