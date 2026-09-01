import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import {countryCodes} from '../../utils/countryCodes';
import {
  formatTableLocation,
  resolvePartyName,
  validatePartyEmail,
  validatePartyPhone,
} from '../../utils/partyName';

interface PartyNameFormProps {
  guestName: string;
  guestPhone: string;
  guestCountryCode: string;
  guestEmail: string;
  onChangeGuestName: (value: string) => void;
  onChangeGuestPhone: (value: string) => void;
  onChangeGuestCountryCode: (value: string) => void;
  onChangeGuestEmail: (value: string) => void;
  tableNumber?: string;
  floorName?: string;
  guestCount?: number;
  isWalkIn?: boolean;
  orderType?: string;
}

export function PartyNameForm({
  guestName,
  guestPhone,
  guestCountryCode,
  guestEmail,
  onChangeGuestName,
  onChangeGuestPhone,
  onChangeGuestCountryCode,
  onChangeGuestEmail,
  tableNumber,
  floorName,
  guestCount,
  isWalkIn,
  orderType,
}: PartyNameFormProps) {
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const tableLabel = formatTableLocation(tableNumber, floorName);
  const fallbackName = resolvePartyName('', guestName, {
    isWalkIn,
    orderType: orderType as 'walking' | 'table' | undefined,
    tableLabel,
    guestCount,
  });

  return (
    <View style={styles.container}>
      <View style={styles.formColumn}>
        <View style={styles.field}>
          <Text style={styles.label}>
            CUSTOMER / PARTY NAME{' '}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Doe"
            value={guestName}
            onChangeText={onChangeGuestName}
            autoCapitalize="words"
            accessibilityLabel="Customer or party name"
          />
          <Text style={styles.hint}>
            If empty, will use:{' '}
            <Text style={styles.hintBold}>{fallbackName}</Text>
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            PHONE <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.phoneRow}>
            <Pressable
              style={styles.countryButton}
              onPress={() => setCountryPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Select country code">
              <Text style={styles.countryButtonText}>
                {guestCountryCode} ▾
              </Text>
            </Pressable>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="e.g. 5551234567"
              value={guestPhone}
              onChangeText={onChangeGuestPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              accessibilityLabel="Phone number"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            EMAIL <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. guest@email.com"
            value={guestEmail}
            onChangeText={onChangeGuestEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address"
          />
        </View>
      </View>

      {(tableLabel || guestCount != null) && (
        <View style={styles.contextPanel}>
          <Text style={styles.contextTitle}>ORDER CONTEXT</Text>
          {tableLabel ? (
            <Text style={styles.contextText}>{tableLabel}</Text>
          ) : null}
          {guestCount != null ? (
            <Text style={styles.contextText}>Guests: {guestCount}</Text>
          ) : null}
        </View>
      )}

      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setCountryPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Country Code</Text>
            <ScrollView style={styles.pickerList}>
              {countryCodes.map((entry) => (
                <Pressable
                  key={entry.code}
                  style={styles.pickerItem}
                  onPress={() => {
                    onChangeGuestCountryCode(entry.code);
                    setCountryPickerOpen(false);
                  }}>
                  <Text style={styles.pickerItemText}>
                    {entry.code} {entry.country}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function validatePartyNameForm(
  guestEmail: string,
  guestPhone: string,
): string | null {
  const emailError = validatePartyEmail(guestEmail);
  if (emailError) {
    return emailError;
  }
  return validatePartyPhone(guestPhone);
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  formColumn: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  optional: {
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 0,
  },
  countryButton: {
    minHeight: 48,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  hintBold: {
    fontWeight: '800',
    color: colors.text,
  },
  contextPanel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  contextTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: 400,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerItem: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
