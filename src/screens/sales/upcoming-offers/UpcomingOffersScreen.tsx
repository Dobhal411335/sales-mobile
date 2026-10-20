import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Gift,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
} from 'lucide-react-native';
import {toast} from '../../../components/common/Toast';
import {SalesPageSkeleton} from '../../../components/common/SalesPageSkeleton';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {fetchUpcomingOffers} from '../../../services/upcomingOffersService';
import {socketClient} from '../../../socket/socket';
import type {UpcomingOfferOrder} from '../../../types/upcomingOffer';
import {createDebouncedCallback} from '../../../utils/debounce';
import {getOfferDetailLines} from '../../../utils/offerDetails';

type Props = NativeStackScreenProps<SalesStackParamList, 'UpcomingOffers'>;

function formatTimeLabel(time?: string): string {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return time || '—';
  }
  const h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

function splitDateParts(iso?: string | null) {
  if (!iso) {
    return {weekday: '—', monthDay: '—', year: ''};
  }
  try {
    const d = new Date(`${iso}T12:00:00`);
    return {
      weekday: d.toLocaleDateString('en-CA', {weekday: 'short'}),
      monthDay: d.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      }),
      year: d.toLocaleDateString('en-CA', {year: 'numeric'}),
    };
  } catch {
    return {weekday: '—', monthDay: iso, year: ''};
  }
}

function statusColors(status?: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING') {
    return {bg: '#FFFBEB', text: '#92400E', border: '#FDE68A'};
  }
  if (s === 'CONFIRMED') {
    return {bg: '#F0F9FF', text: '#075985', border: '#BAE6FD'};
  }
  if (s === 'COMPLETED') {
    return {bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0'};
  }
  return {bg: '#F5F5F4', text: '#44403C', border: '#E7E5E4'};
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export function UpcomingOffersScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const isWide = width >= 900;
  const [rows, setRows] = useState<UpcomingOfferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRows = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await fetchUpcomingOffers();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load upcoming offers');
      }
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load upcoming offers',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRows(true);
    }, [loadRows]),
  );

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const debounced = createDebouncedCallback(() => {
      void loadRows(true);
    }, 800);
    const onChange = () => debounced.run();
    socket.on('order:created', onChange);
    socket.on('order:updated', onChange);
    return () => {
      debounced.cancel();
      socket.off('order:created', onChange);
      socket.off('order:updated', onChange);
    };
  }, [loadRows]);

  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenItems(prev => ({...prev, [key]: !prev[key]}));
  }, []);

  const renderItem = ({item: order}: {item: UpcomingOfferOrder}) => {
    const id = order._id || order.id || order.orderNumber;
    const offerItems = (order.items || []).filter(
      (item) => item.isOffer || item.inclusions?.length || item.choices?.length,
    );
    const lines = offerItems.length ? offerItems : order.items || [];
    const tone = statusColors(order.status);
    const dateParts = splitDateParts(order.offerFulfillmentDate);
    const status = String(order.status || 'PENDING').toUpperCase();
    const isSingleLine = lines.length === 1;

    return (
      <View style={[styles.card, isWide && styles.cardWide]}>
        <View style={[styles.cardInner, isWide && styles.cardInnerWide]}>
          <View style={[styles.scheduleRail, isWide && styles.scheduleRailWide]}>
            <View style={styles.dateBlock}>
              <Text style={styles.weekday}>{dateParts.weekday}</Text>
              <Text style={styles.monthDay}>{dateParts.monthDay}</Text>
              {dateParts.year ? (
                <Text style={styles.year}>{dateParts.year}</Text>
              ) : null}
            </View>
            {isWide ? <View style={styles.railDivider} /> : null}
            <View style={styles.pickupChip}>
              <Clock3 size={13} color="#EA580C" strokeWidth={2.4} />
              <Text style={styles.pickupTime}>
                {formatTimeLabel(order.pickup?.time)}
              </Text>
              <Text style={styles.pickupLabel}>Pickup</Text>
            </View>
          </View>

          <View style={styles.mainColumn}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.titleRow}>
                  <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {order.partyName || 'Guest'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  {order.contactNumber ? (
                    <View style={styles.metaItem}>
                      <Phone size={13} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{order.contactNumber}</Text>
                    </View>
                  ) : null}
                  {order.guestEmail ? (
                    <View style={[styles.metaItem, styles.metaItemFlex]}>
                      <Mail size={13} color={colors.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {order.guestEmail}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.statusBadge,
                    {backgroundColor: tone.bg, borderColor: tone.border},
                  ]}>
                  <Text style={[styles.statusText, {color: tone.text}]}>
                    {status}
                  </Text>
                </View>
                <Text style={styles.totalText}>
                  ${Number(order.totalAmount || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Accordion offer items */}
            <View style={styles.itemsBlock}>
              {lines.map((lineItem, idx) => {
                const itemKey = `${id}-item-${idx}`;
                const isOpen = Boolean(openItems[itemKey]);
                const details = getOfferDetailLines(lineItem);
                const rawPrice =
                  lineItem.price != null ? Number(lineItem.price) : null;
                const qty = Math.max(1, Number(lineItem.qty) || 1);
                const lineTotal =
                  rawPrice != null && !Number.isNaN(rawPrice)
                    ? rawPrice * qty
                    : isSingleLine && order.totalAmount != null
                      ? Number(order.totalAmount)
                      : null;
                const unitPrice =
                  lineTotal != null && qty > 1 ? lineTotal / qty : null;

                return (
                  <View key={itemKey} style={styles.accordionCard}>
                    <Pressable
                      style={({pressed}) => [
                        styles.accordionHeader,
                        pressed && styles.accordionHeaderPressed,
                      ]}
                      onPress={() => toggleItem(itemKey)}
                      accessibilityRole="button"
                      accessibilityState={{expanded: isOpen}}>
                      <View style={styles.accordionHeaderLeft}>
                        <Gift size={14} color="#F97316" strokeWidth={2.2} />
                        <Text style={styles.accordionTitle} numberOfLines={2}>
                          {lineItem.qty}× {lineItem.name}
                        </Text>
                      </View>
                      <View style={styles.accordionHeaderRight}>
                        {lineTotal != null ? (
                          <View style={styles.priceBlock}>
                            {unitPrice != null ? (
                              <Text style={styles.unitPrice}>
                                (${unitPrice.toFixed(2)} each)
                              </Text>
                            ) : null}
                            <Text style={styles.linePrice}>
                              ${lineTotal.toFixed(2)}
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.chevron,
                            isOpen && styles.chevronOpen,
                          ]}>
                          ›
                        </Text>
                      </View>
                    </Pressable>

                    {isOpen && (
                      <View style={styles.accordionBody}>
                        {details.length > 0 ? (
                          <View style={styles.detailBlock}>
                            {details.map((detail, dIdx) => {
                              const values =
                                detail.values && detail.values.length
                                  ? detail.values
                                  : String(detail.value || '')
                                      .split(/\s*,\s*/)
                                      .map(p => p.trim())
                                      .filter(Boolean);
                              return (
                                <View
                                  key={`${itemKey}-d-${dIdx}`}
                                  style={styles.detailGroup}>
                                  <Text style={styles.detailLabel}>
                                    {detail.label}
                                  </Text>
                                  {values.map((v, vi) => (
                                    <View
                                      key={`${itemKey}-d-${dIdx}-${vi}`}
                                      style={styles.bulletRow}>
                                      <View style={styles.bulletDot} />
                                      <Text style={styles.detailValue}>
                                        {v}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              );
                            })}
                          </View>
                        ) : !lineItem.notes ? (
                          <Text style={styles.emptyDetail}>
                            No additional choices or inclusions specified.
                          </Text>
                        ) : null}
                        {lineItem.notes ? (
                          <Text
                            style={[
                              styles.itemRemark,
                              details.length > 0 &&
                                styles.itemRemarkBordered,
                            ]}>
                            Remark: {lineItem.notes}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {order.specialNote ? (
              <View style={styles.specialNoteBox}>
                <MessageSquareText
                  size={15}
                  color="#B45309"
                  strokeWidth={2.2}
                />
                <Text style={styles.specialNoteText}>
                  <Text style={styles.specialNoteBold}>
                    Special instructions
                  </Text>
                  {' · '}
                  {order.specialNote}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarTop}>
          <View style={styles.titleGroup}>
            <Pressable
              style={({pressed}) => [
                styles.floorButton,
                pressed && styles.pressed,
              ]}
              onPress={() => navigation.navigate('Floor')}
              accessibilityRole="button"
              accessibilityLabel="Back to Floor">
              <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.floorButtonText}>Floor</Text>
            </Pressable>
            <View style={styles.titleBlock}>
              <View style={styles.pageTitleRow}>
                <Text style={styles.title}>Upcoming Offers</Text>
                <View style={styles.countPill}>
                  <Gift size={11} color="#C2410C" strokeWidth={2.4} />
                  <Text style={styles.countPillText}>
                    {rows.length} scheduled
                  </Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Future-dated online offers · move to Today when the day arrives
              </Text>
            </View>
          </View>
          <Pressable
            style={({pressed}) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={() => loadRows(true)}
            disabled={refreshing || loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh upcoming offers">
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <RefreshCw size={15} color={colors.text} strokeWidth={2.2} />
            )}
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && rows.length === 0 ? (
        <SalesPageSkeleton variant="bookingList" rows={6} />
      ) : rows.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <CalendarDays size={28} color="#F97316" strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>No upcoming offer bookings</Text>
          <Text style={styles.emptyText}>
            Future-dated online offers appear here until their day arrives, then
            they move into Today's Online orders.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item._id || item.id || item.orderNumber}
          renderItem={renderItem}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRows(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  floorButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pageTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 14,
  },
  card: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  cardWide: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  cardInner: {
    flexDirection: 'column',
  },
  cardInnerWide: {
    flexDirection: 'row',
  },
  scheduleRail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEDD5',
  },
  scheduleRailWide: {
    width: 118,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#FFEDD5',
    gap: 10,
    paddingVertical: 18,
  },
  dateBlock: {
    alignItems: 'flex-start',
  },
  weekday: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#C2410C',
  },
  monthDay: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  year: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  railDivider: {
    width: 36,
    height: 1,
    backgroundColor: '#FDBA74',
  },
  pickupChip: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickupTime: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  pickupLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#A8A29E',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },
  partyName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#44403C',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaItemFlex: {
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  totalText: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  itemsBlock: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#FAFAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  detailBlock: {
    marginTop: 8,
    marginLeft: 23,
    gap: 8,
  },
  detailGroup: {
    gap: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: '#A8A29E',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6D3D1',
    marginTop: 7,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  itemRemark: {
    marginTop: 8,
    marginLeft: 23,
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#92400E',
  },
  itemRemarkBordered: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    marginLeft: 0,
  },
  accordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    overflow: 'hidden',
    backgroundColor: '#FAFAF9',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  accordionHeaderPressed: {
    backgroundColor: '#F5F5F4',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 1,
  },
  unitPrice: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A8A29E',
  },
  linePrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: '#A8A29E',
    lineHeight: 26,
    transform: [{rotate: '0deg'}],
  },
  chevronOpen: {
    transform: [{rotate: '90deg'}],
    color: '#F97316',
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: '#F0EFED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyDetail: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#A8A29E',
  },
  specialNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  specialNoteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#78350F',
    lineHeight: 18,
  },
  specialNoteBold: {
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
