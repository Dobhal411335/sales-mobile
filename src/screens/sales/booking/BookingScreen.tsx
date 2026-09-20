import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
  CalendarDays,
  Check,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import {toast} from '../../../components/common/Toast';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {
  fetchTodayReservations,
  patchReservation,
} from '../../../services/reservationService';
import {socketClient} from '../../../socket/socket';
import type {
  ReservationFilter,
  ReservationPatchAction,
  TableReservation,
} from '../../../types/reservation';
import {RESERVATION_FILTERS} from '../../../types/reservation';

type Props = NativeStackScreenProps<SalesStackParamList, 'Booking'>;

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

function statusColors(status?: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING') {
    return {bg: '#FEF3C7', text: '#92400E', border: '#FDE68A'};
  }
  if (s === 'ACCEPTED') {
    return {bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0'};
  }
  if (s === 'SEATED') {
    return {bg: '#E0F2FE', text: '#075985', border: '#BAE6FD'};
  }
  return {bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7'};
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export function BookingScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const isWide = width >= 900;
  const [tab, setTab] = useState<ReservationFilter>('PENDING');
  const [rows, setRows] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableDrafts, setTableDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetchTodayReservations();
      if (!response.success || !response.data) {
        setError(response.message || 'Failed to load bookings');
        return;
      }
      setRows(response.data);
    } catch {
      setError('Unable to load bookings. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRows(rows.length > 0);
    }, [loadRows, rows.length]),
  );

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const onChange = () => {
      loadRows(true);
    };
    socket.on('reservation:created', onChange);
    socket.on('reservation:updated', onChange);
    return () => {
      socket.off('reservation:created', onChange);
      socket.off('reservation:updated', onChange);
    };
  }, [loadRows]);

  const counts = useMemo(() => {
    const c = {
      PENDING: 0,
      ACCEPTED: 0,
      SEATED: 0,
      DONE: 0,
      ALL: rows.length,
    };
    for (const r of rows) {
      const s = String(r.status || '').toUpperCase();
      if (s === 'PENDING') {
        c.PENDING += 1;
      } else if (s === 'ACCEPTED') {
        c.ACCEPTED += 1;
      } else if (s === 'SEATED') {
        c.SEATED += 1;
      } else if (['DECLINED', 'CANCELLED', 'NO_SHOW'].includes(s)) {
        c.DONE += 1;
      }
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (tab === 'PENDING') {
      list = list.filter((r) => r.status === 'PENDING');
    } else if (tab === 'ACCEPTED') {
      list = list.filter((r) => r.status === 'ACCEPTED');
    } else if (tab === 'SEATED') {
      list = list.filter((r) => r.status === 'SEATED');
    } else if (tab === 'DONE') {
      list = list.filter((r) =>
        ['DECLINED', 'CANCELLED', 'NO_SHOW'].includes(r.status),
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.guestName} ${r.phone} ${r.email || ''} ${r.time} ${r.status} ${r.assignedTableNo || ''}`
          .toLowerCase()
          .includes(q),
      );
    }

    return list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') {
        return -1;
      }
      if (b.status === 'PENDING' && a.status !== 'PENDING') {
        return 1;
      }
      return String(a.time).localeCompare(String(b.time));
    });
  }, [rows, tab, search]);

  const handlePatch = useCallback(
    async (
      id: string,
      action: ReservationPatchAction,
      extra?: {assignedTableNo?: string},
    ) => {
      setActingId(id);
      try {
        const result = await patchReservation(id, action, extra);
        if (!result.success || !result.data) {
          toast.error(result.message || 'Failed to update booking');
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r._id === id || r.id === id ? {...r, ...result.data!} : r,
          ),
        );
        toast.success(
          action === 'accept'
            ? 'Accepted — guest emailed'
            : result.message || 'Updated',
        );
        await loadRows(true);
      } finally {
        setActingId(null);
      }
    },
    [loadRows],
  );

  const callGuest = useCallback((phone?: string) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) {
      return;
    }
    Linking.openURL(`tel:${digits}`).catch(() => {
      toast.error('Unable to open phone dialer');
    });
  }, []);

  const renderRow = ({item}: {item: TableReservation}) => {
    const id = item._id || item.id;
    const busy = actingId === id;
    const badge = statusColors(item.status);
    const tableValue =
      tableDrafts[id] !== undefined
        ? tableDrafts[id]
        : item.assignedTableNo || '';

    return (
      <View style={styles.row}>
        <View style={[styles.rowMain, isWide && styles.rowMainWide]}>
          <View style={styles.timeCol}>
            <Text style={styles.arrivalLabel}>Arrival</Text>
            <Text style={styles.arrivalTime}>{formatTimeLabel(item.time)}</Text>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: badge.bg, borderColor: badge.border},
              ]}>
              <Text style={[styles.statusText, {color: badge.text}]}>
                {String(item.status || '').replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.guestCol}>
            <Text style={styles.guestName} numberOfLines={1}>
              {item.guestName}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Users size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {item.guests} guest{item.guests === 1 ? '' : 's'}
                </Text>
              </View>
              <Pressable
                style={styles.metaItem}
                onPress={() => callGuest(item.phone)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${item.phone}`}>
                <Phone size={14} color={colors.primary} />
                <Text style={[styles.metaText, styles.phoneLink]}>
                  {item.phone}
                </Text>
              </Pressable>
              {item.email ? (
                <View style={[styles.metaItem, styles.emailItem]}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              ) : null}
              {item.assignedTableNo ? (
                <View style={styles.tablePill}>
                  <Text style={styles.tablePillText} numberOfLines={1}>
                    Table {item.assignedTableNo}
                  </Text>
                </View>
              ) : null}
            </View>
            {item.notes ? (
              <Text style={styles.notePreview} numberOfLines={1}>
                Note: {item.notes}
              </Text>
            ) : null}
          </View>
        </View>

        {(item.status === 'PENDING' || item.status === 'ACCEPTED') && (
          <View style={styles.actionsRow}>
            <View style={styles.tableInputWrap}>
              <TextInput
                style={styles.tableInput}
                placeholder="Table note"
                placeholderTextColor={colors.textSecondary}
                value={tableValue}
                onChangeText={(value) =>
                  setTableDrafts((prev) => ({...prev, [id]: value}))
                }
                editable={!busy}
              />
            </View>

            {item.status === 'PENDING' ? (
              <View style={styles.actionButtons}>
                <Pressable
                  style={({pressed}) => [
                    styles.acceptButton,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  disabled={busy}
                  onPress={() =>
                    handlePatch(id, 'accept', {
                      assignedTableNo: tableDrafts[id]?.trim() || undefined,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Accept booking">
                  {busy ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <>
                      <Check size={15} color={colors.surface} />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={({pressed}) => [
                    styles.declineButton,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  disabled={busy}
                  onPress={() => handlePatch(id, 'decline')}
                  accessibilityRole="button"
                  accessibilityLabel="Decline booking">
                  <X size={15} color={colors.text} />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <Pressable
                  style={({pressed}) => [
                    styles.seatButton,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  disabled={busy}
                  onPress={() =>
                    handlePatch(id, 'seat', {
                      assignedTableNo:
                        tableDrafts[id]?.trim() ||
                        item.assignedTableNo ||
                        undefined,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Mark guest seated">
                  {busy ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.actionButtonText}>Seated</Text>
                  )}
                </Pressable>
                <Pressable
                  style={({pressed}) => [
                    styles.declineButton,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                  disabled={busy}
                  onPress={() => handlePatch(id, 'no-show')}
                  accessibilityRole="button"
                  accessibilityLabel="Mark no-show">
                  <Text style={styles.declineButtonText}>No-show</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const listHeader = (
    <View style={styles.tipBanner}>
      <Text style={styles.tipText}>
        Table notes are for staff only — they do not lock a floor table. Accept
        pending requests, mark Seated on arrival, then seat guests on Floor.
      </Text>
    </View>
  );

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
              <Text style={styles.title}>Table Bookings</Text>
              <Text style={styles.subtitle}>
                Today · {counts.PENDING} waiting for a decision
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
            accessibilityLabel="Refresh bookings">
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

        <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
          {[
            {
              label: 'Pending',
              value: counts.PENDING,
              tone: {bg: '#FFFBEB', text: '#B45309', border: '#FDE68A'},
            },
            {
              label: 'Accepted',
              value: counts.ACCEPTED,
              tone: {bg: '#ECFDF5', text: '#047857', border: '#A7F3D0'},
            },
            {
              label: 'Seated',
              value: counts.SEATED,
              tone: {bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD'},
            },
            {
              label: 'Closed',
              value: counts.DONE,
              tone: {bg: '#FAFAFA', text: '#52525B', border: '#E4E4E7'},
            },
            {
              label: 'Today',
              value: counts.ALL,
              tone: {bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA'},
            },
          ].map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                isWide && styles.statCardWide,
                {
                  backgroundColor: stat.tone.bg,
                  borderColor: stat.tone.border,
                },
              ]}>
              <Text style={[styles.statLabel, {color: stat.tone.text}]}>
                {stat.label}
              </Text>
              <Text style={[styles.statValue, {color: stat.tone.text}]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.filtersRow, isWide && styles.filtersRowWide]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={isWide ? styles.chipsScrollWide : undefined}>
            {RESERVATION_FILTERS.map((filter) => {
              const active = tab === filter.id;
              const count = counts[filter.id] ?? 0;
              return (
                <Pressable
                  key={filter.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTab(filter.id)}
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  accessibilityLabel={filter.label}>
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}>
                    {filter.label}
                  </Text>
                  <View
                    style={[
                      styles.chipCount,
                      active && styles.chipCountActive,
                    ]}>
                    <Text
                      style={[
                        styles.chipCountText,
                        active && styles.chipCountTextActive,
                      ]}>
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.searchWrapper, isWide && styles.searchWrapperWide]}>
            <Search
              size={16}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, phone, table…"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search bookings"
            />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>{error}</Text>
          <Pressable
            style={({pressed}) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => loadRows()}
            accessibilityRole="button"
            accessibilityLabel="Retry">
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerState}>
          <CalendarDays size={40} color={colors.border} />
          <Text style={styles.emptyTitle}>No bookings in this filter</Text>
          <Text style={styles.stateText}>
            New verified online requests land under Pending.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRows(true)}
              tintColor={colors.primary}
            />
          }
          renderItem={renderRow}
        />
      )}
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
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  titleBlock: {
    minWidth: 0,
    flexShrink: 1,
  },
  floorButton: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  refreshButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  statsRowWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    minWidth: 96,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statCardWide: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.85,
  },
  statValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '900',
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filtersRowWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsScrollWide: {
    flexGrow: 0,
    flexShrink: 1,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 2,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  chipCount: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  chipCountTextActive: {
    color: colors.surface,
  },
  searchWrapper: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchWrapperWide: {
    width: 280,
    flexShrink: 0,
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
  tipBanner: {
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    lineHeight: 17,
  },
  listContent: {
    padding: 14,
    paddingBottom: 28,
  },
  separator: {
    height: 8,
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 12,
    overflow: 'hidden',
  },
  rowMain: {
    gap: 10,
  },
  rowMainWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timeCol: {
    width: 104,
    flexShrink: 0,
    alignItems: 'flex-start',
    gap: 6,
  },
  arrivalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  arrivalTime: {
    fontSize: 20,
    fontWeight: '900',
    color: '#9A3412',
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  guestCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  guestName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
    maxWidth: '100%',
  },
  emailItem: {
    maxWidth: 220,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  phoneLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  tablePill: {
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 160,
  },
  tablePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  notePreview: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  tableInputWrap: {
    flex: 1,
    minWidth: 100,
    maxWidth: 220,
  },
  tableInput: {
    width: '100%',
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  acceptButton: {
    minHeight: 40,
    minWidth: 100,
    borderRadius: 10,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
  },
  seatButton: {
    minHeight: 40,
    minWidth: 100,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  declineButton: {
    minHeight: 40,
    minWidth: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.surface,
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  errorTitle: {
    fontSize: 16,
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
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.7,
  },
});
