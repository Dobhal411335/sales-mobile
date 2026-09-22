import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ArrowLeft, Percent, RefreshCw, Users} from 'lucide-react-native';
import {OrderHubCard} from '../../../components/sales/OrderHubCard';
import {OrderHubStats} from '../../../components/sales/OrderHubStats';
import {toast} from '../../../components/common/Toast';
import {colors} from '../../../constants/colors';
import {useOrderHub} from '../../../hooks/useOrderHub';
import {useStaffEmployees} from '../../../hooks/useStaffEmployees';
import type {SalesStackParamList} from '../../../navigation/types';
import type {SalesEmployee} from '../../../services/employeeService';
import type {PaidOrderSnapshot} from '../../../types/receipt';
import type {TodayOrder} from '../../../types/todayOrder';
import {
  getDirectSalePartyLabel,
  getOrderSessionId,
} from '../../../utils/orderDisplay';
import {isOrderOpen} from '../../../utils/todayOrderHelpers';

type Props = NativeStackScreenProps<SalesStackParamList, 'StaffHub'>;

const DEFAULT_EMP_COLOR = '#4f46e5';

function todayOrderToPaidSnapshot(order: TodayOrder): PaidOrderSnapshot {
  const staffName = getDirectSalePartyLabel(order);
  return {
    orderNumber: order.orderNumber,
    orderId: order._id,
    guestName: order.guestName,
    partyName: order.partyName || staffName,
    guestCount: order.guestCount,
    serverName: order.processedByName,
    createdAt: order.createdAt,
    specialNote: order.specialNote,
    items: (order.items || []).map((item, index) => ({
      cartId: `staff-${order._id}-${index}`,
      id: `staff-${order._id}-${index}`,
      name: item.name,
      category: item.category || 'General',
      price: item.price,
      tax: 0,
      qty: item.qty,
      size: item.size,
      preparationStyle: item.preparationStyle,
      options: item.options,
      productType:
        (item.productType as 'KITCHEN' | 'BAR' | undefined) || 'KITCHEN',
    })),
    subTotal: order.subTotal,
    taxTotal: order.taxTotal,
    discountTotal: order.discountTotal,
    discountPercent: order.discountPercent,
    discountCode: order.discountCode,
    giftcardUsedAmount: order.giftcardUsedAmount,
    totalAmount: order.totalAmount,
    tipAmount: order.tipAmount,
    tipMethod: order.tipMethod,
    serviceChargeTotal: order.serviceChargeTotal,
    serviceChargeName: order.serviceChargeName,
    paymentMethod: order.paymentMethod,
    cashAmount: order.cashAmount,
    cardAmount: order.cardAmount,
    paymentStatus: order.paymentStatus ?? 'PAID',
    source: order.source,
    restaurantName: order.restaurantName,
    paidAt: order.createdAt,
    isReprint: true,
    taxBreakdown: (order.taxBreakdown || [])
      .map((line) => ({
        name: String(line.name || 'Tax'),
        amount: Number(line.amount ?? line.taxAmount ?? 0),
        rate: line.rate != null ? Number(line.rate) : undefined,
      }))
      .filter((line) => line.amount > 0),
  };
}

export function StaffHubScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  // Match web ~320px sidebar; keep readable on phones (~36% capped).
  const sidebarWidth = Math.min(320, Math.max(240, Math.round(width * 0.38)));

  const {
    filtered,
    stats,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    refresh,
  } = useOrderHub('STAFF');

  const {
    employees,
    loading: employeesLoading,
    refresh: refreshEmployees,
  } = useStaffEmployees();

  const startStaffOrder = useCallback(
    (employee: SalesEmployee) => {
      if (!employee.id) {
        return;
      }
      navigation.navigate('CreateOrder', {
        orderType: 'staff',
        staffId: employee.id,
        fresh: true,
      });
    },
    [navigation],
  );

  const continueOrder = useCallback(
    (order: TodayOrder) => {
      if (!isOrderOpen(order)) {
        toast.error('Only open staff orders can be continued.');
        return;
      }
      navigation.navigate('CreateOrder', {
        orderType: 'staff',
        orderId: order._id,
      });
    },
    [navigation],
  );

  const payOrder = useCallback(
    (order: TodayOrder) => {
      const staffName = getDirectSalePartyLabel(order);
      navigation.navigate('Payment', {
        orderId: order._id,
        sessionId: getOrderSessionId(order) ?? undefined,
        orderType: 'staff',
        subtotal: order.subTotal,
        taxTotal: order.taxTotal,
        total: order.totalAmount,
        partyName: staffName,
        guestCount: order.guestCount,
        orderNumber: order.orderNumber,
        paymentSeed: {
          source: order.source,
          status: order.status,
          paymentStatus: order.paymentStatus,
          specialNote: order.specialNote,
          guestName: order.guestName,
          partyName: order.partyName ?? staffName,
          contactNumber: order.contactNumber,
          guestCountryCode: order.guestCountryCode,
          guestEmail: order.guestEmail,
          discountTotal: order.discountTotal,
          discountCode: order.discountCode,
          processedByName: order.processedByName,
          items: order.items,
        },
      });
    },
    [navigation],
  );

  const printReceipt = useCallback(
    (order: TodayOrder) => {
      const snapshot = todayOrderToPaidSnapshot(order);
      navigation.navigate('Receipt', {
        orderSnapshot: snapshot,
        orderType: 'staff',
        taxBreakdown: snapshot.taxBreakdown,
      });
    },
    [navigation],
  );

  const onRefreshAll = useCallback(async () => {
    await Promise.all([refresh({silent: true}), refreshEmployees()]);
  }, [refresh, refreshEmployees]);

  const emptyMessage =
    filter === 'OPEN'
      ? 'No unpaid staff orders'
      : filter === 'PAID'
        ? 'No paid staff orders yet today'
        : 'No staff orders today';

  const showOrderList = !loading && !error;

  const filterLabel =
    filter === 'OPEN'
      ? 'Unpaid'
      : filter === 'PAID'
        ? 'Paid today'
        : 'All orders';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            style={({pressed}) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Floor')}
            accessibilityRole="button"
            accessibilityLabel="Back to Floor">
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Staff Orders</Text>
            <Text style={styles.subtitle}>
              Pick staff on the left · manage today’s staff orders here
            </Text>
          </View>
          <Pressable
            style={({pressed}) => [
              styles.refreshBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => void onRefreshAll()}
            disabled={refreshing || loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh">
            <RefreshCw size={16} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>

        <OrderHubStats
          stats={stats}
          filter={filter}
          onSelect={setFilter}
        />
      </View>

      <View style={styles.body}>
        <View style={[styles.sidebar, {width: sidebarWidth}]}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarEyebrow}>New order</Text>
            <Text style={styles.sidebarTitle}>
              Employees{' '}
              <Text style={styles.sidebarCount}>({employees.length})</Text>
            </Text>
            <Text style={styles.sidebarHint}>
              Tap to start a staff order
            </Text>
          </View>

          {employeesLoading ? (
            <View style={styles.sidebarCentered}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading employees…</Text>
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.sidebarEmpty}>
              <Users size={22} color={colors.primary} strokeWidth={2} />
              <Text style={styles.emptyTitle}>No active employees found</Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.empList}
              showsVerticalScrollIndicator={false}
              renderItem={({item: employee}) => {
                const discount = Number(employee.staffDiscount) || 0;
                const avatarColor = employee.color || DEFAULT_EMP_COLOR;
                const initial = (employee.name || '?').charAt(0).toUpperCase();
                return (
                  <Pressable
                    style={({pressed}) => [
                      styles.empRow,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => startStaffOrder(employee)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start staff order for ${employee.name}`}>
                    <View
                      style={[
                        styles.empAvatar,
                        {backgroundColor: avatarColor},
                      ]}>
                      <Text style={styles.empAvatarText}>{initial}</Text>
                    </View>
                    <View style={styles.empMeta}>
                      <Text style={styles.empName} numberOfLines={1}>
                        {employee.name}
                      </Text>
                      <Text style={styles.empRole} numberOfLines={1}>
                        {employee.role || 'Staff'}
                      </Text>
                    </View>
                    {discount > 0 ? (
                      <View style={styles.discountBadge}>
                        <Percent
                          size={12}
                          color={colors.success}
                          strokeWidth={2.4}
                        />
                        <Text style={styles.discountText}>{discount}%</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>

        <FlatList
          style={styles.ordersPane}
          data={showOrderList ? filtered : []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefreshAll()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.ordersEyebrow}>Showing</Text>
              <Text style={styles.ordersTitle}>
                {filterLabel}{' '}
                <Text style={styles.listCount}>({filtered.length})</Text>
              </Text>
              {loading ? (
                <View style={styles.centeredInline}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Loading staff orders…</Text>
                </View>
              ) : error ? (
                <View style={styles.centeredInline}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            showOrderList ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Users size={28} color={colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                <Text style={styles.emptyBody}>
                  Tap an employee on the left to start a staff order.
                </Text>
              </View>
            ) : undefined
          }
          renderItem={({item}) => (
            <OrderHubCard
              order={item}
              typeLabel="Staff"
              onContinue={() => continueOrder(item)}
              onPay={() => payOrder(item)}
              onPrint={() => printReceipt(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  sidebarEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4F46E5',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sidebarCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sidebarHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sidebarCentered: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  sidebarEmpty: {
    margin: 12,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
  },
  empList: {
    padding: 10,
    paddingBottom: 24,
    gap: 8,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    backgroundColor: colors.surface,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  empMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  empName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  empRole: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
  },
  ordersPane: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 12,
  },
  ordersEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4F46E5',
  },
  ordersTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  listCount: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  centeredInline: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  errorText: {
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
