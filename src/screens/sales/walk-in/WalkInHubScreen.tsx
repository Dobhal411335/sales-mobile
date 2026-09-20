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
import {ArrowLeft, Plus, RefreshCw, ShoppingBag} from 'lucide-react-native';
import {OrderHubCard} from '../../../components/sales/OrderHubCard';
import {OrderHubStats} from '../../../components/sales/OrderHubStats';
import {colors} from '../../../constants/colors';
import {useOrderHub} from '../../../hooks/useOrderHub';
import type {SalesStackParamList} from '../../../navigation/types';
import type {TodayOrder} from '../../../types/todayOrder';
import {getOrderSessionId} from '../../../utils/orderDisplay';
import {isOrderOpen} from '../../../utils/todayOrderHelpers';
import {toast} from '../../../components/common/Toast';

type Props = NativeStackScreenProps<SalesStackParamList, 'WalkInHub'>;

export function WalkInHubScreen({navigation}: Props) {
  const {
    filtered,
    stats,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    refresh,
  } = useOrderHub('WALK_IN');

  const startNew = useCallback(() => {
    navigation.navigate('CreateOrder', {
      orderType: 'walking',
      fresh: true,
    });
  }, [navigation]);

  const continueOrder = useCallback(
    (order: TodayOrder) => {
      if (!isOrderOpen(order)) {
        toast.error('Only open walk-in orders can be continued.');
        return;
      }
      navigation.navigate('CreateOrder', {
        orderType: 'walking',
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
        orderType: 'walking',
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

  const emptyMessage =
    filter === 'OPEN'
      ? 'No unpaid walk-in orders'
      : filter === 'PAID'
        ? 'No paid walk-in orders yet today'
        : 'No walk-in orders today';

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
            <Text style={styles.title}>Walk-in Orders</Text>
            <Text style={styles.subtitle}>
              Same-day walk-in sales · tap a card to filter
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={({pressed}) => [
              styles.refreshBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => void refresh({silent: true})}
            disabled={refreshing || loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh">
            <RefreshCw
              size={16}
              color={colors.text}
              strokeWidth={2.4}
            />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
          <Pressable
            style={({pressed}) => [
              styles.newBtn,
              pressed && styles.pressed,
            ]}
            onPress={startNew}
            accessibilityRole="button"
            accessibilityLabel="New walk-in order">
            <Plus size={16} color={colors.surface} strokeWidth={2.6} />
            <Text style={styles.newBtnText}>New walk-in</Text>
          </Pressable>
        </View>

        <OrderHubStats
          stats={stats}
          filter={filter}
          onSelect={setFilter}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading walk-in orders…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh({silent: true})}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeading}>
              {filter === 'OPEN'
                ? 'Unpaid'
                : filter === 'PAID'
                  ? 'Paid today'
                  : 'All orders'}{' '}
              <Text style={styles.listCount}>({filtered.length})</Text>
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <ShoppingBag size={28} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <Text style={styles.emptyBody}>
                Start a new walk-in order to take a guest order without a table.
              </Text>
              <Pressable
                style={({pressed}) => [
                  styles.newBtn,
                  pressed && styles.pressed,
                ]}
                onPress={startNew}
                accessibilityRole="button"
                accessibilityLabel="New walk-in order">
                <Plus size={16} color={colors.surface} strokeWidth={2.6} />
                <Text style={styles.newBtnText}>New walk-in</Text>
              </Pressable>
            </View>
          }
          renderItem={({item}) => (
            <OrderHubCard
              order={item}
              typeLabel="Walk-in"
              onContinue={() => continueOrder(item)}
              onPay={() => payOrder(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  refreshText: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  newBtnText: {
    fontWeight: '800',
    color: colors.surface,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  listCount: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
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
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.surface,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    marginBottom: 8,
  },
});
