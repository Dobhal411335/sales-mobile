import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {EodExportKind} from '../../types/eod';
import {BusinessDateField} from './BusinessDateField';

interface ReportActionsProps {
  businessDate: string;
  actualDeposit: string;
  loading: boolean;
  saving: boolean;
  downloading: EodExportKind | null;
  hasReport: boolean;
  onDateChange: (isoDate: string) => void;
  onDepositChange: (value: string) => void;
  onRefreshLive: () => void;
  onSave: () => void;
  onExport: (kind: EodExportKind) => void;
  onEmail: () => void;
}

export function ReportActions({
  businessDate,
  actualDeposit,
  loading,
  saving,
  downloading,
  hasReport,
  onDateChange,
  onDepositChange,
  onRefreshLive,
  onSave,
  onExport,
  onEmail,
}: ReportActionsProps) {
  const actionsDisabled = loading || saving || !!downloading;

  return (
    <View style={styles.container}>
      <View style={styles.fieldsRow}>
        <View style={styles.field}>
          <Text style={styles.label}>Business Day</Text>
          <BusinessDateField value={businessDate} onChange={onDateChange} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Actual Deposit (optional)</Text>
          <TextInput
            style={styles.depositInput}
            value={actualDeposit}
            onChangeText={onDepositChange}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            accessibilityLabel="Actual deposit amount"
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <ActionButton
          label="Refresh Live"
          onPress={onRefreshLive}
          disabled={actionsDisabled}
          loading={loading}
          variant="secondary"
        />
        <ActionButton
          label="Save Report"
          onPress={onSave}
          disabled={actionsDisabled}
          loading={saving}
          variant="primary"
        />
        <ActionButton
          label="Excel"
          onPress={() => onExport('excel')}
          disabled={actionsDisabled || !hasReport}
          loading={downloading === 'excel'}
          variant="secondary"
        />
        <ActionButton
          label="PDF"
          onPress={() => onExport('pdf')}
          disabled={actionsDisabled || !hasReport}
          loading={downloading === 'pdf'}
          variant="secondary"
        />
        <ActionButton
          label="Email"
          onPress={onEmail}
          disabled={actionsDisabled || !hasReport}
          variant="secondary"
        />
      </View>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant: 'primary' | 'secondary';
}

function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  variant,
}: ActionButtonProps) {
  return (
    <Pressable
      style={({pressed}) => [
        styles.actionButton,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.surface : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.actionButtonText,
            variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 14,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  field: {
    minWidth: 160,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  depositInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    minWidth: 140,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 100,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
  },
});

export default ReportActions;
