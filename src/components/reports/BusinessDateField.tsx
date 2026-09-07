import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {TabletModal} from '../common/TabletModal';
import {colors} from '../../constants/colors';
import {formatBusinessDate, todayLocalISO} from '../../utils/eodFormat';

interface BusinessDateFieldProps {
  value: string;
  onChange: (isoDate: string) => void;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function BusinessDateField({value, onChange}: BusinessDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setError(null);
    }
  }, [open, value]);

  const applyDate = () => {
    if (!isValidIsoDate(draft)) {
      setError('Enter a valid date as YYYY-MM-DD.');
      return;
    }
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        style={styles.dateButton}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select business day">
        <Text style={styles.dateText}>{formatBusinessDate(value)}</Text>
        <Text style={styles.dateIcon}>📅</Text>
      </Pressable>

      <TabletModal
        visible={open}
        title="Business Day"
        onClose={() => setOpen(false)}
        maxWidth={480}
        footerActions={[
          {
            label: 'Cancel',
            onPress: () => setOpen(false),
            variant: 'secondary',
          },
          {
            label: 'Apply',
            onPress: applyDate,
            variant: 'primary',
          },
        ]}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHint}>
            Select the business day for this End-of-Day report.
          </Text>

          <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              setError(null);
            }}
            placeholder="2026-09-01"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.quickRow}>
            <QuickButton
              label="Previous day"
              onPress={() => setDraft((prev) => shiftIsoDate(prev, -1))}
            />
            <QuickButton label="Today" onPress={() => setDraft(todayLocalISO())} />
            <QuickButton
              label="Next day"
              onPress={() => setDraft((prev) => shiftIsoDate(prev, 1))}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </TabletModal>
    </>
  );
}

function QuickButton({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <Pressable
      style={({pressed}) => [styles.quickButton, pressed && styles.quickButtonPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Text style={styles.quickButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    minWidth: 180,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dateIcon: {
    fontSize: 16,
  },
  modalContent: {
    gap: 12,
  },
  modalHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonPressed: {
    opacity: 0.9,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
