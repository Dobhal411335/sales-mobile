import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {colors} from '../../constants/colors';
import {fetchSalesEmployees, type SalesEmployee} from '../../services/employeeService';
import {updateTableSession, type UpdateTableSessionPayload} from '../../services/sessionService';
import type {FloorTable, TableSession} from '../../types/table';
import {
  buildCombineGroups,
  formatTableLocation,
  getOpenDurationMinutes,
  sumSeatsForTables,
  toggleLinkedTableIds,
} from '../../utils/floorCombineTables';
import {AdminReleaseDialog} from './AdminReleaseDialog';
import {CombineTablePicker} from './CombineTablePicker';

type ActionView =
  | 'MAIN'
  | 'READONLY'
  | 'GUESTS'
  | 'TRANSFER'
  | 'TRANSFER_CONFIRM'
  | 'RECONFIGURE';

interface TableActionsSheetProps {
  visible: boolean;
  table: FloorTable | null;
  session: TableSession | null;
  floorName?: string | null;
  tables: FloorTable[];
  sessions: TableSession[];
  currentUserId: string | null;
  initialView?: ActionView;
  showAdminOverrideEntry?: boolean;
  onClose: () => void;
  onContinueOrder: (sessionId: string, tableId: string) => void;
  onSessionUpdated: () => void;
  onAdminOverride?: () => void;
}

export function TableActionsSheet({
  visible,
  table,
  session,
  floorName,
  tables,
  sessions,
  currentUserId,
  initialView = 'MAIN',
  showAdminOverrideEntry = false,
  onClose,
  onContinueOrder,
  onSessionUpdated,
  onAdminOverride,
}: TableActionsSheetProps) {
  const [actionView, setActionView] = useState<ActionView>(initialView);
  const [guestCount, setGuestCount] = useState(1);
  const [effectiveSeatCount, setEffectiveSeatCount] = useState(1);
  const [selectedLinkedTableIds, setSelectedLinkedTableIds] = useState<string[]>(
    [],
  );
  const [employees, setEmployees] = useState<SalesEmployee[]>([]);
  const [pendingTransferEmployee, setPendingTransferEmployee] =
    useState<SalesEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminReleaseOpen, setAdminReleaseOpen] = useState(false);
  const actionBusyRef = useRef(false);

  const primaryTableId = session?.tableId ?? table?.id ?? '';

  useEffect(() => {
    if (visible && session && table) {
      setActionView(initialView);
      setGuestCount(session.guestCount || 1);
      const linked = (session.linkedTableIds || []).map(String);
      setSelectedLinkedTableIds(linked);
      const seatTotal =
        sumSeatsForTables(tables, [primaryTableId, ...linked]) ||
        table.seats ||
        1;
      setEffectiveSeatCount(
        session.effectiveSeatCount && session.effectiveSeatCount > seatTotal
          ? session.effectiveSeatCount
          : seatTotal,
      );
      setPendingTransferEmployee(null);
      setError(null);
      setLoading(false);
      setAdminReleaseOpen(false);
    }
  }, [visible, session, table, initialView, tables, primaryTableId]);

  useEffect(() => {
    if (!visible || actionView !== 'TRANSFER') {
      return;
    }
    let cancelled = false;
    fetchSalesEmployees()
      .then((list) => {
        if (!cancelled) {
          setEmployees(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmployees([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible, actionView]);

  const reconfigureGroups = useMemo(() => {
    if (!primaryTableId || actionView !== 'RECONFIGURE') {
      return {available: [], mine: []};
    }
    return buildCombineGroups(
      tables,
      sessions,
      primaryTableId,
      session?.assignedEmployeeId ?? currentUserId,
      session,
    );
  }, [
    actionView,
    tables,
    sessions,
    primaryTableId,
    session,
    currentUserId,
  ]);

  const combinedSeatTotal = useMemo(() => {
    return sumSeatsForTables(tables, [primaryTableId, ...selectedLinkedTableIds]);
  }, [tables, primaryTableId, selectedLinkedTableIds]);

  const primaryTable = tables.find((t) => String(t.id) === String(primaryTableId));

  const handleToggleLinked = (tableId: string, siblingIds: string[]) => {
    setSelectedLinkedTableIds((prev) => {
      const next = toggleLinkedTableIds(
        prev,
        tableId,
        siblingIds,
        primaryTableId,
      );
      setEffectiveSeatCount(
        sumSeatsForTables(tables, [primaryTableId, ...next]) || 1,
      );
      return next;
    });
  };

  const runAction = async (
    action: 'RELEASE' | 'UPDATE_GUESTS' | 'TRANSFER' | 'RECONFIGURE',
    payload: UpdateTableSessionPayload = {},
  ) => {
    if (!session || actionBusyRef.current) {
      return;
    }

    actionBusyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await updateTableSession(session.id, action, payload);
      if (!result.success) {
        if (result.requiresAdminOverride) {
          setAdminReleaseOpen(true);
          return;
        }
        setError(result.message || 'Action failed');
        return;
      }

      onSessionUpdated();
      onClose();
    } catch {
      setError('Action failed');
    } finally {
      actionBusyRef.current = false;
      setLoading(false);
    }
  };

  const handleRelease = () => {
    runAction('RELEASE').catch(() => {});
  };

  const handleAdminRelease = (reason: string) => {
    if (!session || actionBusyRef.current) {
      return;
    }
    actionBusyRef.current = true;
    setLoading(true);
    updateTableSession(session.id, 'RELEASE', {
      adminOverride: true,
      releaseReason: reason,
    })
      .then((result) => {
        if (!result.success) {
          setError(result.message || 'Release failed');
          return;
        }
        setAdminReleaseOpen(false);
        onSessionUpdated();
        onClose();
      })
      .catch(() => {
        setError('Release failed');
      })
      .finally(() => {
        actionBusyRef.current = false;
        setLoading(false);
      });
  };

  if (!table || !session) {
    return null;
  }

  const title =
    actionView === 'GUESTS'
      ? 'Adjust Guests'
      : actionView === 'TRANSFER'
        ? 'Transfer Table'
        : actionView === 'TRANSFER_CONFIRM'
          ? 'Confirm Transfer'
          : actionView === 'RECONFIGURE'
            ? 'Temporary Table Setup'
            : formatTableLocation(session.tableNumbers ?? table.tableNumber, floorName);

  const canGoBack =
    actionView === 'GUESTS' ||
    actionView === 'TRANSFER' ||
    actionView === 'RECONFIGURE' ||
    actionView === 'TRANSFER_CONFIRM';

  const transferCandidates = employees.filter(
    (emp) => String(emp.id) !== String(currentUserId ?? ''),
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                {canGoBack ? (
                  <Pressable
                    style={styles.backButton}
                    onPress={() => {
                      if (actionView === 'TRANSFER_CONFIRM') {
                        setPendingTransferEmployee(null);
                        setActionView('TRANSFER');
                        return;
                      }
                      setActionView('MAIN');
                    }}>
                    <Text style={styles.backText}>←</Text>
                  </Pressable>
                ) : (
                  <View style={styles.backSpacer} />
                )}
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                <Pressable
                  style={styles.closeIconButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close">
                  <Text style={styles.closeIconText}>✕</Text>
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {actionView === 'MAIN' ? (
                <View style={styles.section}>
                  <Text style={styles.summaryLine}>{floorName || 'Floor'}</Text>
                  <Text style={styles.summaryLine}>
                    {session.guestCount} guests in party ·{' '}
                    {session.effectiveSeatCount || table.seats} combined seats
                  </Text>
                  <Text style={styles.summaryLine}>
                    Assigned to {session.assignedEmployeeName}
                  </Text>
                  <Text style={styles.summaryMuted}>
                    Open for {getOpenDurationMinutes(session.openedAt)} min
                  </Text>

                  <ActionButton
                    label={
                      session.hasActiveOrder
                        ? 'Continue Order'
                        : 'Start Order'
                    }
                    onPress={() => onContinueOrder(session.id, table.id)}
                  />
                  <ActionButton
                    label="Adjust Guests"
                    onPress={() => {
                      setGuestCount(session.guestCount || 1);
                      setActionView('GUESTS');
                    }}
                  />
                  <ActionButton
                    label="Transfer Table"
                    onPress={() => setActionView('TRANSFER')}
                  />
                  <ActionButton
                    label="Temporary Table Setup"
                    onPress={() => {
                      const linked = (session.linkedTableIds || []).map(String);
                      setSelectedLinkedTableIds(linked);
                      const seatTotal =
                        sumSeatsForTables(tables, [primaryTableId, ...linked]) ||
                        table.seats ||
                        1;
                      setEffectiveSeatCount(
                        session.effectiveSeatCount &&
                          session.effectiveSeatCount > seatTotal
                          ? session.effectiveSeatCount
                          : seatTotal,
                      );
                      setActionView('RECONFIGURE');
                    }}
                  />
                  <ActionButton
                    label="Release Table"
                    destructive
                    loading={loading}
                    onPress={handleRelease}
                  />
                </View>
              ) : null}

              {actionView === 'READONLY' ? (
                <View style={styles.section}>
                  <Text style={styles.summaryLine}>{floorName || 'Floor'}</Text>
                  <Text style={styles.summaryLine}>
                    {session.guestCount} Guests
                  </Text>
                  <Text style={styles.summaryMuted}>
                    Assigned to {session.assignedEmployeeName}
                  </Text>
                  {session.hasActiveOrder ? (
                    <Text style={styles.orderActive}>Order in progress</Text>
                  ) : null}
                  <Text style={styles.readonlyNote}>
                    This table is currently being served by{' '}
                    {session.assignedEmployeeName}.
                  </Text>
                  {showAdminOverrideEntry && onAdminOverride ? (
                    <ActionButton
                      label="Admin Override Actions"
                      onPress={onAdminOverride}
                    />
                  ) : null}
                </View>
              ) : null}

              {actionView === 'GUESTS' ? (
                <View style={styles.section}>
                  <Text style={styles.label}>Guests</Text>
                  <Stepper
                    value={guestCount}
                    onDecrease={() => setGuestCount((c) => Math.max(1, c - 1))}
                    onIncrease={() => setGuestCount((c) => c + 1)}
                  />
                  <Text style={styles.hint}>
                    Party size for this one check. Combined table seats:{' '}
                    {session.effectiveSeatCount || table.seats}. This table has{' '}
                    {table.seats} chairs.
                  </Text>
                  <PrimaryButton
                    label={loading ? 'Saving...' : 'Save Guests'}
                    loading={loading}
                    onPress={() =>
                      runAction('UPDATE_GUESTS', {guestCount}).catch(() => {})
                    }
                  />
                </View>
              ) : null}

              {actionView === 'TRANSFER' ? (
                <View style={styles.section}>
                  {transferCandidates.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No other eligible employees available.
                    </Text>
                  ) : (
                    transferCandidates.map((emp) => (
                      <Pressable
                        key={emp.id}
                        style={styles.transferRow}
                        onPress={() => {
                          setPendingTransferEmployee(emp);
                          setActionView('TRANSFER_CONFIRM');
                        }}>
                        <Text style={styles.transferName}>{emp.name}</Text>
                        <Text style={styles.transferRole}>
                          {emp.role || 'Staff'}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}

              {actionView === 'TRANSFER_CONFIRM' && pendingTransferEmployee ? (
                <View style={styles.section}>
                  <Text style={styles.confirmText}>
                    Transfer {formatTableLocation(session.tableNumbers, floorName)}{' '}
                    to {pendingTransferEmployee.name}?
                  </Text>
                  <Text style={styles.hint}>
                    They can continue the order and collect payment.
                  </Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        setPendingTransferEmployee(null);
                        setActionView('TRANSFER');
                      }}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.confirmButton}
                      onPress={() =>
                        runAction('TRANSFER', {
                          newEmployeeId: pendingTransferEmployee.id,
                        }).catch(() => {})
                      }>
                      {loading ? (
                        <ActivityIndicator color={colors.surface} />
                      ) : (
                        <Text style={styles.confirmButtonText}>Transfer table</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {actionView === 'RECONFIGURE' ? (
                <View style={styles.section}>
                  <Text style={styles.hint}>
                    Combine empty tables or your booked tables into this session
                    for one order. Seat count is temporary and does not change the
                    admin floor plan.
                  </Text>
                  {primaryTable ? (
                    <View style={styles.primaryCard}>
                      <Text style={styles.primaryLabel}>PRIMARY TABLE</Text>
                      <Text style={styles.primaryValue}>
                        Table {primaryTable.tableNumber} · {primaryTable.seats}{' '}
                        seats · locked
                      </Text>
                    </View>
                  ) : null}
                  <CombineTablePicker
                    groups={reconfigureGroups}
                    sessions={sessions}
                    primaryTableId={primaryTableId}
                    selectedLinkedTableIds={selectedLinkedTableIds}
                    onToggle={handleToggleLinked}
                    activeSession={session}
                  />
                  <Text style={styles.summaryMuted}>
                    Combined seats: {combinedSeatTotal || table.seats}
                    {session.guestCount
                      ? ` · ${session.guestCount} guests in party`
                      : ''}
                  </Text>
                  <Text style={styles.label}>Extra chairs (optional)</Text>
                  <Text style={styles.hint}>
                    Defaults to combined table seats. Raise only if you add extra
                    chairs. This is not the guest count.
                  </Text>
                  <Stepper
                    value={effectiveSeatCount}
                    onDecrease={() =>
                      setEffectiveSeatCount((c) => Math.max(1, c - 1))
                    }
                    onIncrease={() => setEffectiveSeatCount((c) => c + 1)}
                  />
                  <PrimaryButton
                    label={loading ? 'Saving...' : 'Save Setup'}
                    loading={loading}
                    onPress={() =>
                      runAction('RECONFIGURE', {
                        effectiveSeatCount,
                        linkedTableIds: selectedLinkedTableIds,
                      }).catch(() => {})
                    }
                  />
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <AdminReleaseDialog
        visible={adminReleaseOpen}
        loading={loading}
        onCancel={() => setAdminReleaseOpen(false)}
        onConfirm={handleAdminRelease}
      />
    </>
  );
}

function ActionButton({
  label,
  onPress,
  destructive = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        destructive && styles.actionButtonDestructive,
      ]}
      onPress={onPress}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator color={destructive ? colors.error : colors.text} />
      ) : (
        <Text
          style={[
            styles.actionButtonText,
            destructive && styles.actionButtonTextDestructive,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.confirmButton, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text style={styles.confirmButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function Stepper({
  value,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={onDecrease}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={onIncrease}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetScroll: {
    maxHeight: '100%',
  },
  sheetContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 36,
  },
  backText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  summaryLine: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  summaryMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  orderActive: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  readonlyNote: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.cream,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  actionButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionButtonDestructive: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  actionButtonTextDestructive: {
    color: colors.error,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
  },
  transferRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transferName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  transferRole: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryCard: {
    borderWidth: 2,
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 12,
  },
  primaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  primaryValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  closeIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
