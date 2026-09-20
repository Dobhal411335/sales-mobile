import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ArrowLeft, Percent, RefreshCw, User, Users} from 'lucide-react-native';
import {OrderHubCard} from '../../../components/sales/OrderHubCard';
import {OrderHubStats} from '../../../components/sales/OrderHubStats';
import {toast} from '../../../components/common/Toast';
import {colors} from '../../../constants/colors';
import {useOrderHub} from '../../../hooks/useOrderHub';
import {useStaffEmployees} from '../../../hooks/useStaffEmployees';
import type {SalesStackParamList} from '../../../navigation/types';
import type {SalesEmployee} from '../../../services/employeeService';
import type {TodayOrder} from '../../../types/todayOrder';
import {getOrderSessionId} from '../../../utils/orderDisplay';
import {isOrderOpen} from '../../../utils/todayOrderHelpers';

type Props = NativeStackScreenProps<SalesStackParamList, 'StaffHub'>;

export function StaffHubScreen({navigation}: Props) {
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

  const {employees, loading: employeesLoading} = useStaffEmployees();

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
      navigation.navigate('Payment', {
        orderId: order._id,
        sessionId: getOrderSessionId(order) ?? undefined,
        orderType: 'staff',
        subtotal: order.subTotal,
        taxTotal: order.taxTotal,
        total: order.totalAmount,
        partyName: order.partyName ?? order.guestName,
        guestCount: order.guestCount,
        orderNumber: order.orderNumber,
        paymentSeed: {
          source: order.source,
          status: order.status,
          paymentStatus: order.paymentStatus,
          specialNote: order.specialNote,
          guestName: order.guestName,
          partyName: order.partyName,
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

  const onRefreshAll = useCallback(async () => {
    await refresh({silent: true});
  }, [refresh]);

  const emptyMessage =
    filter === 'OPEN'
      ? 'No unpaid staff orders'
      : filter === 'PAID'
        ? 'No paid staff orders yet today'
        : 'No staff orders today';

  const showOrderList = !loading && !error;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            style={({pressed}) => [
              styles.backBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate('Floor')}
            accessibilityRole="button"
            accessibilityLabel="Back to Floor">
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Staff Orders</Text>
            <Text style={styles.subtitle}>
              Tap an employee to start · filter today’s staff orders below
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

      <FlatList
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
            <Text style={styles.sectionLabel}>Employees</Text>
            {employeesLoading ? (
              <ActivityIndicator
                style={styles.empLoader}
                color={colors.primary}
              />
            ) : employees.length === 0 ? (
              <Text style={styles.empEmpty}>No employees available.</Text>
            ) : (
              <View style={styles.empGrid}>
                {employees.map((employee) => (
                  <Pressable
                    key={employee.id}
                    style={({pressed}) => [
                      styles.empCard,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => startStaffOrder(employee)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start staff order for ${employee.name}`}>
                    <View style={styles.empIcon}>
                      <User size={16} color={colors.primary} strokeWidth={2.4} />
                    </View>
                    <Text style={styles.empName} numberOfLines={1}>
                      {employee.name}
                    </Text>
                    {employee.role ? (
                      <Text style={styles.empRole} numberOfLines={1}>
                        {employee.role}
                      </Text>
                    ) : null}
                    {employee.staffDiscount != null &&
                    employee.staffDiscount > 0 ? (
                      <View style={styles.discountRow}>
                        <Percent
                          size={11}
                          color={colors.success}
                          strokeWidth={2.4}
                        />
                        <Text style={styles.discountText}>
                          {employee.staffDiscount}% off
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, styles.ordersLabel]}>
              Today’s staff orders{' '}
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
                Tap an employee above to start a staff meal order.
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
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  ordersLabel: {
    marginTop: 18,
    color: colors.text,
    textTransform: 'none',
    fontSize: 16,
    letterSpacing: 0,
  },
  listCount: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  empLoader: {
    marginVertical: 16,
  },
  empEmpty: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  empGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empCard: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    maxWidth: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  empIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
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
  },
  errorText: {
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
