import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Gift,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react-native';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import type {
  SalesDateRange,
  TodayOrder,
} from '../../../types/todayOrder';
import {
  computeHourlySalesData,
  computeOrderTypeDistribution,
  computeTopSellingItems,
  filterOrdersByDateRange,
} from '../../../utils/salesDateFilters';
import {formatCurrency} from '../../../utils/currency';
import {
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
  getPlacerName,
} from '../../../utils/orderDisplay';
import {
  getOrderGrandTotal,
  getOrderTypeBadgeColors,
  getPaymentBadgeColors,
  getStatusColors,
  parsePaymentDetails,
} from '../../../utils/todayOrderHelpers';
import {fetchEmployeeSales} from '../../../services/todayOrdersService';
import {socketClient} from '../../../socket/socket';
import {SalesOverTimeChart} from '../../../components/sales/charts/SalesOverTimeChart';
import {TopSellingItemsChart} from '../../../components/sales/charts/TopSellingItemsChart';
import {OrderTypeDistributionChart} from '../../../components/sales/charts/OrderTypeDistributionChart';
import {TodaySalesDetailDrawer} from '../../../components/sales/TodaySalesDetailDrawer';

type Props = NativeStackScreenProps<SalesStackParamList, 'TodaySales'>;

const DATE_RANGES: SalesDateRange[] = ['Today', 'This Week', 'This Month', 'All'];
const STATUS_OPTIONS = ['All', 'PAID', 'PENDING', 'CONFIRMED', 'WAIVED', 'CANCELLED'];
const ITEMS_PER_PAGE = 10;

function getPaymentBadgeInfo(order: TodayOrder) {
  const parsed = parsePaymentDetails(order);
  const badgeColors = getPaymentBadgeColors(parsed.variant);

  let Icon = Wallet;
  if (parsed.variant === 'cash') {
    Icon = Banknote;
  } else if (parsed.variant === 'card') {
    Icon = CreditCard;
  } else if (parsed.variant === 'gift' || parsed.variant === 'combo') {
    Icon = parsed.hasGift ? Gift : CreditCard;
  }

  return {
    label: parsed.label,
    shortLabel: parsed.shortLabel,
    Icon,
    bg: badgeColors.bg,
    text: badgeColors.text,
    border: badgeColors.border,
  };
}

export function TodaySalesScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isWide = width >= 860;
  const isTablet = width >= 600;

  const [dateRange, setDateRange] = useState<SalesDateRange>('Today');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [orders, setOrders] = useState<TodayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tableContainerWidth, setTableContainerWidth] = useState(0);
  const effectiveTableWidth = Math.max(tableContainerWidth, 860);

  const onTableContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) {
      setTableContainerWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    }
  }, []);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o._id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetchEmployeeSales(false);
      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        setError(res.message || 'Failed to load sales data');
      }
    } catch {
      setError('Unable to load sales data. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders(orders.length > 0);
    }, [loadOrders, orders.length]),
  );

  // Live Socket real-time updates
  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) return;

    const onOrderOrPaymentChange = () => {
      loadOrders(true);
    };

    socket.on('order:created', onOrderOrPaymentChange);
    socket.on('order:updated', onOrderOrPaymentChange);
    socket.on('payment:completed', onOrderOrPaymentChange);
    socket.on('table:released', onOrderOrPaymentChange);

    return () => {
      socket.off('order:created', onOrderOrPaymentChange);
      socket.off('order:updated', onOrderOrPaymentChange);
      socket.off('payment:completed', onOrderOrPaymentChange);
      socket.off('table:released', onOrderOrPaymentChange);
    };
  }, [loadOrders]);

  // Date Range Filtering
  const dateFilteredOrders = useMemo(() => {
    return filterOrdersByDateRange(orders, dateRange);
  }, [orders, dateRange]);

  // Calculations — valid paid orders; exclude waived/cancelled
  const validOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) =>
        o.status !== 'CANCELLED' &&
        o.status !== 'WAIVED' &&
        (o.status === 'PAID' || o.paymentStatus === 'PAID'),
    );
  }, [dateFilteredOrders]);

  const totalPaidOrdersCount = validOrders.length;
  const totalSalesAmount = validOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );
  const avgOrderValue =
    totalPaidOrdersCount > 0 ? totalSalesAmount / totalPaidOrdersCount : 0;
  const tipsEarned = validOrders.reduce(
    (sum, o) => sum + Number(o.tipAmount || 0),
    0,
  );

  // Dynamic Chart Data
  const chartSalesData = useMemo(() => {
    return computeHourlySalesData(validOrders);
  }, [validOrders]);

  const chartTopItemsData = useMemo(() => {
    return computeTopSellingItems(validOrders, 5);
  }, [validOrders]);

  const chartOrderTypeData = useMemo(() => {
    return computeOrderTypeDistribution(dateFilteredOrders);
  }, [dateFilteredOrders]);

  // Search & Status Filtering
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((o) => {
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'PAID'
            ? o.status === 'PAID' || o.paymentStatus === 'PAID'
            : o.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const orderNum = (o.orderNumber || '').toLowerCase();
      const table = (o.tableNo || '').toLowerCase();
      const guest = (o.guestName || '').toLowerCase();
      const party = (o.partyName || '').toLowerCase();
      const method = (o.paymentMethod || '').toLowerCase();
      const paymentLabel = parsePaymentDetails(o).label.toLowerCase();
      const placer = (getPlacerName(o) || '').toLowerCase();
      const type = getOrderTypeLabel(o).toLowerCase();

      const matchesSearch =
        orderNum.includes(q) ||
        table.includes(q) ||
        guest.includes(q) ||
        party.includes(q) ||
        method.includes(q) ||
        paymentLabel.includes(q) ||
        placer.includes(q) ||
        type.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [dateFilteredOrders, statusFilter, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ITEMS_PER_PAGE),
  );
  const currentOrders = useMemo(() => {
    return filteredOrders.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE,
    );
  }, [filteredOrders, currentPage]);

  const handleDateRangeChange = (range: SalesDateRange) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true)}
            tintColor="#f97316"
          />
        }>
        {/* PAGE HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTopLine}>
              <Pressable
                style={({pressed}) => [
                  styles.backBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => navigation.navigate('Floor')}
                accessibilityRole="button"
                accessibilityLabel="Back to Floor">
                <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.backBtnText}>Floor</Text>
              </Pressable>
              <Text style={styles.pageTitle}>Sales Report</Text>
            </View>
            <Text style={styles.pageSubtitle}>
              Your live restaurant performance & transaction overview.
            </Text>
          </View>

          {/* Date range controls & refresh */}
          <View style={styles.headerControls}>
            <View style={styles.rangePillsContainer}>
              {DATE_RANGES.map((range) => {
                const active = dateRange === range;
                return (
                  <Pressable
                    key={range}
                    style={[
                      styles.rangePill,
                      active && styles.rangePillActive,
                    ]}
                    onPress={() => handleDateRangeChange(range)}>
                    <Text
                      style={[
                        styles.rangePillText,
                        active && styles.rangePillTextActive,
                      ]}>
                      {range}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({pressed}) => [
                styles.refreshBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => loadOrders(true)}
              disabled={refreshing || loading}>
              <RefreshCw
                size={14}
                color="#3f3f46"
                strokeWidth={2.2}
              />
              <Text style={styles.refreshBtnText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ERROR STATE */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* KPI STATS ROW */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : (
          <View
            style={[
              styles.kpiGrid,
              isWide ? styles.kpiGridWide : isTablet ? styles.kpiGridTablet : null,
            ]}>
            {/* Total Sales */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <View style={styles.kpiIconBox}>
                  <DollarSign size={18} color="#ea580c" strokeWidth={2.5} />
                </View>
                <View style={styles.kpiTrendBadge}>
                  <TrendingUp size={11} color="#047857" strokeWidth={2.5} />
                  <Text style={styles.kpiTrendText}>
                    {validOrders.length} orders
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>TOTAL SALES</Text>
              <Text style={styles.kpiValue}>
                {formatCurrency(totalSalesAmount)}
              </Text>
            </View>

            {/* Paid Orders */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <View style={styles.kpiIconBox}>
                  <ShoppingBag size={18} color="#ea580c" strokeWidth={2.5} />
                </View>
                <View style={styles.kpiTrendBadge}>
                  <TrendingUp size={11} color="#047857" strokeWidth={2.5} />
                  <Text style={styles.kpiTrendText}>
                    {dateFilteredOrders.length} total
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>PAID ORDERS</Text>
              <Text style={styles.kpiValue}>{totalPaidOrdersCount}</Text>
            </View>

            {/* Avg Order Value */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <View style={styles.kpiIconBox}>
                  <Receipt size={18} color="#ea580c" strokeWidth={2.5} />
                </View>
                <View style={styles.kpiTrendBadge}>
                  <TrendingUp size={11} color="#047857" strokeWidth={2.5} />
                  <Text style={styles.kpiTrendText}>per ticket</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>AVG ORDER VALUE</Text>
              <Text style={styles.kpiValue}>
                {formatCurrency(avgOrderValue)}
              </Text>
            </View>

            {/* Tips Earned */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <View style={styles.kpiIconBox}>
                  <Wallet size={18} color="#ea580c" strokeWidth={2.5} />
                </View>
                <View style={styles.kpiTrendBadge}>
                  <TrendingUp size={11} color="#047857" strokeWidth={2.5} />
                  <Text style={styles.kpiTrendText}>collected</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>TIPS EARNED</Text>
              <Text style={styles.kpiValue}>
                {formatCurrency(tipsEarned)}
              </Text>
            </View>
          </View>
        )}

        {/* CHARTS SECTION */}
        <View style={[styles.chartsLayout, isWide && styles.chartsLayoutWide]}>
          {/* Sales Over Time (Line Chart) */}
          <View style={[styles.chartCard, isWide && styles.chartCardMain]}>
            <View style={styles.chartCardHeader}>
              <View style={styles.chartHeaderTitleRow}>
                <DollarSign size={16} color="#f97316" strokeWidth={2.5} />
                <Text style={styles.chartTitle}>Sales Over Time</Text>
              </View>
              <Text style={styles.chartBadge}>{dateRange}</Text>
            </View>
            <View style={styles.chartCardBody}>
              <SalesOverTimeChart data={chartSalesData} height={200} />
            </View>
          </View>

          {/* Top Items & Order Type side cards */}
          <View style={[styles.chartsSidebar, isWide && styles.chartsSidebarWide]}>
            {/* Top Items */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={styles.chartHeaderTitleRow}>
                  <ShoppingBag size={16} color="#f97316" strokeWidth={2.5} />
                  <Text style={styles.chartTitle}>Top Selling Items</Text>
                </View>
              </View>
              <View style={styles.chartCardBody}>
                <TopSellingItemsChart data={chartTopItemsData} />
              </View>
            </View>

            {/* Order Type Distribution */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartTitleCenter}>
                  Order Type Distribution
                </Text>
              </View>
              <View style={styles.chartCardBody}>
                <OrderTypeDistributionChart data={chartOrderTypeData} size={110} />
              </View>
            </View>
          </View>
        </View>

        {/* ORDER HISTORY TABLE CARD */}
        <View style={styles.tableCard}>
          {/* Table Controls Header */}
          <View style={styles.tableHeaderSection}>
            <View
              style={[
                styles.tableHeaderTop,
                isDesktop && styles.tableHeaderTopDesktop,
              ]}>
              <View style={styles.tableTitleRow}>
                <Text style={styles.tableTitle}>Recent Transactions</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {filteredOrders.length}{' '}
                    {filteredOrders.length === 1 ? 'order' : 'orders'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.tableControlsRight,
                  isTablet && styles.tableControlsRightTablet,
                  isDesktop && styles.tableControlsRightDesktop,
                ]}>
                {/* Status Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[
                    styles.statusPillsScrollView,
                    isTablet && styles.statusPillsScrollViewTablet,
                  ]}
                  contentContainerStyle={styles.statusPillsScroll}>
                  {STATUS_OPTIONS.map((status) => {
                    const active = statusFilter === status;
                    return (
                      <Pressable
                        key={status}
                        style={[
                          styles.statusPill,
                          active && styles.statusPillActive,
                        ]}
                        onPress={() => handleStatusFilterChange(status)}>
                        <Text
                          style={[
                            styles.statusPillText,
                            active && styles.statusPillTextActive,
                          ]}>
                          {status}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Search Box */}
                <View
                  style={[
                    styles.searchBox,
                    isTablet && styles.searchBoxTablet,
                  ]}>
                  <Search size={14} color="#a1a1aa" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search order #, table, guest..."
                    placeholderTextColor="#a1a1aa"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                  />
                  {searchQuery ? (
                    <Pressable
                      style={styles.searchClearBtn}
                      onPress={() => handleSearchChange('')}>
                      <X size={14} color="#a1a1aa" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* Table Rows */}
          <View style={styles.tableContainer} onLayout={onTableContainerLayout}>
            {loading ? (
              <View style={styles.tableLoading}>
                <ActivityIndicator size="small" color="#f97316" />
              </View>
            ) : currentOrders.length === 0 ? (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyTableText}>
                  No matching orders found.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.tableScrollContent}>
                <View
                  style={[
                    styles.tableInner,
                    {width: effectiveTableWidth},
                  ]}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, styles.colOrder]}>ORDER #</Text>
                    <Text style={[styles.th, styles.colLocation]}>
                      TABLE / GUEST
                    </Text>
                    <Text style={[styles.th, styles.colItems]}>ITEMS</Text>
                    <Text style={[styles.th, styles.colTotal]}>TOTAL</Text>
                    <Text style={[styles.th, styles.colPayment]}>PAYMENT</Text>
                    <Text style={[styles.th, styles.colTime]}>TIME</Text>
                    <Text style={[styles.th, styles.colStatus, styles.thCenter]}>
                      STATUS
                    </Text>
                    <Text style={[styles.th, styles.colAction, styles.thRight]}>
                      ACTION
                    </Text>
                  </View>

                  {/* Table Body Rows */}
                  {currentOrders.map((order) => {
                    const payment = getPaymentBadgeInfo(order);
                    const PaymentIcon = payment.Icon;
                    const orderType = getOrderTypeLabel(order);
                    const typeVariant = getOrderTypeBadgeVariant(order);
                    const typeBadgeColors = getOrderTypeBadgeColors(typeVariant);
                    const grandTotal = getOrderGrandTotal(order);
                    const totalItems = (order.items || []).reduce(
                      (acc, it) => acc + (it.qty || 1),
                      0,
                    );
                    const statusColors = getStatusColors(order.status);
                    const isSelected = selectedOrderId === order._id;

                    const formattedTime = new Date(
                      order.createdAt,
                    ).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <Pressable
                        key={order._id}
                        style={[
                          styles.tr,
                          isSelected && styles.trSelected,
                        ]}
                        onPress={() => setSelectedOrderId(order._id)}>
                        {/* Order # */}
                        <View style={[styles.td, styles.colOrder]}>
                          <View style={styles.orderNumberCell}>
                            <Text style={styles.orderNumberText}>
                              #{order.orderNumber}
                            </Text>
                            <View
                              style={[
                                styles.typeTag,
                                {
                                  backgroundColor: typeBadgeColors.bg,
                                  borderColor: typeBadgeColors.border,
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.typeTagText,
                                  {color: typeBadgeColors.text},
                                ]}>
                                {orderType}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Table / Guest */}
                        <View style={[styles.td, styles.colLocation]}>
                          <Text style={styles.locationTitle} numberOfLines={1}>
                            {order.tableNo
                              ? order.tableNo.toLowerCase().startsWith('table')
                                ? order.tableNo
                                : `Table ${order.tableNo}`
                              : 'Takeaway / Counter'}
                          </Text>
                          {(order.partyName || order.guestName) && (
                            <Text style={styles.locationSubtitle} numberOfLines={1}>
                              {order.partyName || order.guestName}
                              {order.guestCount
                                ? ` · ${order.guestCount} guests`
                                : ''}
                            </Text>
                          )}
                        </View>

                        {/* Items */}
                        <View style={[styles.td, styles.colItems]}>
                          <View style={styles.itemsBadge}>
                            <Text style={styles.itemsBadgeText}>
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </Text>
                          </View>
                        </View>

                        {/* Total */}
                        <View style={[styles.td, styles.colTotal]}>
                          <Text style={styles.totalText}>
                            {formatCurrency(grandTotal)}
                          </Text>
                          {Number(order.tipAmount || 0) > 0 && (
                            <Text style={styles.tipText}>
                              +{formatCurrency(Number(order.tipAmount))} tip
                            </Text>
                          )}
                        </View>

                        {/* Payment */}
                        <View style={[styles.td, styles.colPayment]}>
                          <View
                            style={[
                              styles.paymentBadge,
                              {
                                backgroundColor: payment.bg,
                                borderColor: payment.border,
                              },
                            ]}>
                            <PaymentIcon size={11} color={payment.text} />
                            <Text
                              style={[
                                styles.paymentBadgeText,
                                {color: payment.text},
                              ]}
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {payment.label}
                            </Text>
                          </View>
                        </View>

                        {/* Time */}
                        <View style={[styles.td, styles.colTime]}>
                          <View style={styles.timeWrapper}>
                            <Clock size={12} color="#a1a1aa" />
                            <Text style={styles.timeText}>{formattedTime}</Text>
                          </View>
                        </View>

                        {/* Status */}
                        <View style={[styles.td, styles.colStatus]}>
                          <View
                            style={[
                              styles.statusTag,
                              {backgroundColor: statusColors.bg},
                            ]}>
                            <Text
                              style={[
                                styles.statusTagText,
                                {color: statusColors.text},
                              ]}>
                              {order.status}
                            </Text>
                          </View>
                        </View>

                        {/* Action */}
                        <View style={[styles.td, styles.colAction]}>
                          <Pressable
                            style={styles.viewBtn}
                            onPress={() => setSelectedOrderId(order._id)}>
                            <Eye size={13} color="#ea580c" />
                            <Text style={styles.viewBtnText}>View</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* PAGINATION FOOTER */}
          {!loading && filteredOrders.length > 0 && (
            <View style={styles.paginationRow}>
              <Text style={styles.paginationText}>
                Showing{' '}
                <Text style={styles.paginationTextBold}>
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </Text>{' '}
                to{' '}
                <Text style={styles.paginationTextBold}>
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredOrders.length,
                  )}
                </Text>{' '}
                of{' '}
                <Text style={styles.paginationTextBold}>
                  {filteredOrders.length}
                </Text>{' '}
                orders
              </Text>

              <View style={styles.paginationControls}>
                <Text style={styles.pageInfoText}>
                  Page {currentPage} of {totalPages}
                </Text>

                <Pressable
                  style={[
                    styles.pageBtn,
                    currentPage === 1 && styles.pageBtnDisabled,
                  ]}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}>
                  <ChevronLeft size={14} color="#3f3f46" />
                  <Text style={styles.pageBtnText}>Prev</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.pageBtn,
                    currentPage === totalPages && styles.pageBtnDisabled,
                  ]}
                  onPress={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}>
                  <Text style={styles.pageBtnText}>Next</Text>
                  <ChevronRight size={14} color="#3f3f46" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Slide-in Order Detail Drawer */}
      <TodaySalesDetailDrawer
        order={selectedOrder}
        visible={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: 'column',
    gap: 12,
  },
  headerTitleContainer: {
    gap: 4,
  },
  headerTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#09090b',
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangePillsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  rangePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  rangePillActive: {
    backgroundColor: '#18181b',
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525b',
  },
  rangePillTextActive: {
    color: '#FFFFFF',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272a',
  },
  btnPressed: {
    opacity: 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiGridTablet: {
    flexWrap: 'wrap',
  },
  kpiGridWide: {
    flexWrap: 'nowrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiTrendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#09090b',
    marginTop: 2,
  },
  chartsLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  chartsLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chartCardMain: {
    flex: 2,
  },
  chartsSidebar: {
    flexDirection: 'column',
    gap: 16,
  },
  chartsSidebarWide: {
    flex: 1,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  chartHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
  },
  chartTitleCenter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
    textAlign: 'center',
    flex: 1,
  },
  chartBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
  },
  chartCardBody: {
    padding: 14,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    width: '100%',
  },
  tableHeaderSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
    width: '100%',
    overflow: 'hidden',
  },
  tableHeaderTop: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  tableHeaderTopDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18181b',
  },
  countBadge: {
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525b',
  },
  tableControlsRight: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  tableControlsRightTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  tableControlsRightDesktop: {
    width: 'auto',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  statusPillsScrollView: {
    maxWidth: '100%',
  },
  statusPillsScrollViewTablet: {
    flex: 1,
    flexShrink: 1,
  },
  statusPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
  },
  statusPillActive: {
    backgroundColor: '#18181b',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525b',
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    width: '100%',
  },
  searchBoxTablet: {
    width: 220,
    flexShrink: 0,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#18181b',
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  tableContainer: {
    minHeight: 180,
    width: '100%',
  },
  tableLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTable: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  tableScrollContent: {
    minWidth: '100%',
    flexGrow: 1,
  },
  tableInner: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: '#52525b',
    letterSpacing: 0.5,
  },
  thCenter: {
    textAlign: 'center',
  },
  thRight: {
    textAlign: 'right',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  trSelected: {
    backgroundColor: '#fff7ed',
  },
  td: {
    justifyContent: 'center',
  },
  colOrder: {
    flex: 1.25,
    minWidth: 120,
  },
  colLocation: {
    flex: 2.2,
    minWidth: 180,
  },
  colItems: {
    flex: 0.85,
    minWidth: 80,
  },
  colTotal: {
    flex: 1.0,
    minWidth: 95,
  },
  colPayment: {
    flex: 1.8,
    minWidth: 165,
  },
  colTime: {
    flex: 0.95,
    minWidth: 90,
  },
  colStatus: {
    flex: 0.95,
    minWidth: 90,
    alignItems: 'center',
  },
  colAction: {
    flex: 0.8,
    minWidth: 70,
    alignItems: 'flex-end',
  },
  orderNumberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090b',
  },
  typeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
  },
  locationSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
    marginTop: 1,
  },
  itemsBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3f3f46',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090b',
  },
  tipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'center',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  paginationText: {
    fontSize: 12,
    color: '#52525b',
  },
  paginationTextBold: {
    fontWeight: '700',
    color: '#09090b',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginRight: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3f3f46',
  },
});
