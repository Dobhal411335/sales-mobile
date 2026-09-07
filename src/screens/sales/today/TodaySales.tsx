import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  DollarSign,
  Gift,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  Wallet,
} from 'lucide-react-native';
import {SalesMetricCard} from '../../../components/common/SalesMetricCard';
import {TabletModal} from '../../../components/common/TabletModal';
import {OrderDetailPanel} from '../../../components/orders/OrderDetailPanel';
import {OrderFilterChips} from '../../../components/orders/OrderFilterChips';
import {TodayOrderCard} from '../../../components/orders/TodayOrderCard';
import {colors} from '../../../constants/colors';
import {useTodayOrders} from '../../../hooks/useTodayOrders';
import type {SalesStackParamList, OrderType} from '../../../navigation/types';
import type {TodayOrder, TodayOrderFilter} from '../../../types/todayOrder';
import {
  getOrderLocationLabel,
  getOrderSessionId,
  getOrderTypeLabel,
  getPlacerName,
} from '../../../utils/orderDisplay';
import {computeTodaySalesMetrics} from '../../../utils/todayOrderStats';
import {
  getEmptyFilterMessage,
  STATUS_RANK,
} from '../../../utils/todayOrderHelpers';

type Props = NativeStackScreenProps<SalesStackParamList, 'Orders'>;

const METRIC_ICONS: Record<string, React.ReactNode> = {
  sales: <DollarSign size={18} color="#FFFFFF" strokeWidth={2.4} />,
  orders: <ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.4} />,
  avg: <Receipt size={18} color="#FFFFFF" strokeWidth={2.4} />,
  tips: <Wallet size={18} color="#FFFFFF" strokeWidth={2.4} />,
  cash: <Banknote size={18} color="#FFFFFF" strokeWidth={2.4} />,
  card: <CreditCard size={18} color="#FFFFFF" strokeWidth={2.4} />,
  gift: <Gift size={18} color="#FFFFFF" strokeWidth={2.4} />,
};

function mapSourceToOrderType(source?: string): OrderType {
  switch (source) {
    case 'WALK_IN':
      return 'walking';
    case 'STAFF':
      return 'staff';
    case 'ONLINE':
      return 'online';
    default:
      return 'table';
  }
}

function filterOrders(
  orders: TodayOrder[],
  activeFilter: TodayOrderFilter,
  searchQuery: string,
): TodayOrder[] {
  const query = searchQuery.trim().toLowerCase();

  return orders
    .filter((order) => {
      const matchesTab =
        activeFilter === 'All'
          ? true
          : activeFilter === 'ONLINE'
            ? order.source === 'ONLINE'
            : order.status?.toUpperCase() === activeFilter;

      if (!matchesTab) {
        return false;
      }

      if (!query) {
        return true;
      }

      const placer = getPlacerName(order) || '';
      const typeLabel = getOrderTypeLabel(order);
      const searchString = `${order.orderNumber || ''} ${order.tableNo || ''} ${order.guestName || ''} ${order.partyName || ''} ${order.source || ''} ${typeLabel} ${placer}`.toLowerCase();
      return searchString.includes(query);
    })
    .sort((a, b) => {
      const rankA = STATUS_RANK[a.status?.toUpperCase() ?? ''] ?? 9;
      const rankB = STATUS_RANK[b.status?.toUpperCase() ?? ''] ?? 9;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export function TodaySalesScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const isWide = width >= 900;

  const {orders, loading, refreshing, error, refresh, waiveOrder} =
    useTodayOrders();

  const [activeFilter, setActiveFilter] = useState<TodayOrderFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [waiveModalVisible, setWaiveModalVisible] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiving, setWaiving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh({silent: true});
    }, [refresh]),
  );

  const filteredOrders = useMemo(
    () => filterOrders(orders, activeFilter, searchQuery),
    [orders, activeFilter, searchQuery],
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const metrics = useMemo(
    () => computeTodaySalesMetrics(orders, loading),
    [orders, loading],
  );

  const handlePayNow = useCallback(() => {
    if (!selectedOrder) {
      return;
    }

    navigation.navigate('Payment', {
      orderId: selectedOrder._id,
      sessionId: getOrderSessionId(selectedOrder) ?? undefined,
      orderType: mapSourceToOrderType(selectedOrder.source),
      subtotal: selectedOrder.subTotal,
      taxTotal: selectedOrder.taxTotal,
      total: selectedOrder.totalAmount,
      partyName: selectedOrder.partyName ?? selectedOrder.guestName,
      guestCount: selectedOrder.guestCount,
      tableNumber: selectedOrder.tableNo,
      floorName: selectedOrder.floorName,
      orderNumber: selectedOrder.orderNumber,
    });
  }, [navigation, selectedOrder]);

  const handleWaiveConfirm = useCallback(async () => {
    if (!selectedOrder) {
      return;
    }

    setWaiving(true);
    const result = await waiveOrder(selectedOrder._id, waiveReason);
    setWaiving(false);

    if (!result.success) {
      Alert.alert('Waive Failed', result.message ?? 'Failed to waive bill.');
      return;
    }

    setWaiveModalVisible(false);
    setWaiveReason('');
    Alert.alert(
      'Bill Waived',
      result.data?.sessionReleased
        ? 'Bill waived and table released.'
        : 'Bill waived successfully.',
    );
  }, [selectedOrder, waiveOrder, waiveReason]);

  const renderListContent = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading today's orders...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Unable to load today's orders.</Text>
          <Text style={styles.stateText}>
            Check your connection and try again.
          </Text>
          <Pressable
            style={({pressed}) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry">
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.stateText}>
            {getEmptyFilterMessage(activeFilter)}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        extraData={selectedOrderId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh({silent: true})}
            tintColor={colors.primary}
          />
        }
        renderItem={({item}) => (
          <TodayOrderCard
            order={item}
            selected={item._id === selectedOrderId}
            onPress={() => setSelectedOrderId(item._id)}
          />
        )}
        ItemSeparatorComponent={ListSeparator}
      />
    );
  };

  const cardsRowWidth = Math.max(width - 32, 820);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarTop}>
          <View style={styles.toolbarTitleGroup}>
            <Pressable
              style={({pressed}) => [
                styles.floorButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('Floor')}
              accessibilityRole="button"
              accessibilityLabel="Back to Floor">
              <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.floorButtonText}>Floor</Text>
            </Pressable>
            <Text style={styles.title}>Today's Orders</Text>
          </View>

          <View style={styles.toolbarActions}>
            <Pressable
              style={({pressed}) => [
                styles.refreshButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => refresh({silent: true})}
              disabled={refreshing || loading}
              accessibilityRole="button"
              accessibilityLabel="Refresh">
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <RefreshCw size={15} color={colors.text} strokeWidth={2.2} />
              )}
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
            <View style={styles.searchWrapper}>
              <Search
                size={16}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search ID, name, table..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search orders"
              />
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsScrollView}>
          <View style={[styles.metricsGrid, {width: cardsRowWidth}]}>
            {metrics.map((metric) => (
              <SalesMetricCard
                key={metric.key}
                label={metric.short}
                value={metric.value}
                count={metric.count}
                icon={METRIC_ICONS[metric.key]}
                style={styles.metricCard}
              />
            ))}
          </View>
        </ScrollView>

        <OrderFilterChips
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </View>

      <View style={styles.body}>
        <View style={[styles.listPane, isWide ? styles.listPaneWide : null]}>
          {renderListContent()}
        </View>

        {isWide ? (
          <View style={styles.detailPane}>
            {selectedOrder ? (
              <OrderDetailPanel
                order={selectedOrder}
                onPayNow={handlePayNow}
                onWaiveOff={() => {
                  setWaiveReason('');
                  setWaiveModalVisible(true);
                }}
                onClose={() => setSelectedOrderId(null)}
              />
            ) : (
              <View style={styles.detailPlaceholder}>
                <Text style={styles.detailPlaceholderTitle}>
                  Select an order
                </Text>
                <Text style={styles.detailPlaceholderText}>
                  Choose an order from the list to view details, payment
                  status, and actions.
                </Text>
              </View>
            )}
          </View>
        ) : selectedOrder ? (
          <View style={styles.detailPaneNarrow}>
            <OrderDetailPanel
              order={selectedOrder}
              onPayNow={handlePayNow}
              onWaiveOff={() => {
                setWaiveReason('');
                setWaiveModalVisible(true);
              }}
              onClose={() => setSelectedOrderId(null)}
            />
          </View>
        ) : null}
      </View>

      <TabletModal
        visible={waiveModalVisible}
        title="Waive Off Bill?"
        onClose={() => {
          if (!waiving) {
            setWaiveModalVisible(false);
            setWaiveReason('');
          }
        }}
        footerActions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => {
              setWaiveModalVisible(false);
              setWaiveReason('');
            },
            disabled: waiving,
          },
          {
            label: 'Confirm Waive',
            variant: 'destructive',
            onPress: handleWaiveConfirm,
            disabled: waiving || !waiveReason.trim(),
            loading: waiving,
          },
        ]}>
        <Text style={styles.waiveDescription}>
          Order #{selectedOrder?.orderNumber}
          {selectedOrder?.tableNo
            ? ` · ${getOrderLocationLabel(selectedOrder)}`
            : ''}
          . Enter a reason to waive this unpaid bill.
        </Text>
        <Text style={styles.waiveLabel}>
          Reason <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.waiveInput}
          value={waiveReason}
          onChangeText={setWaiveReason}
          placeholder="e.g. Customer refused to pay after food was served"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!waiving}
        />
      </TabletModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  toolbarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  floorButton: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
  },
  floorButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  refreshButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  searchWrapper: {
    flex: 1,
    maxWidth: 280,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  metricsScrollView: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 105,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  listPane: {
    flex: 1,
    minWidth: 0,
  },
  listPaneWide: {
    flex: 0.62,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  separator: {
    height: 10,
  },
  detailPane: {
    flex: 0.38,
    minWidth: 300,
  },
  detailPaneNarrow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  detailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.cream,
  },
  detailPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  detailPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  waiveDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  waiveLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  waiveInput: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
