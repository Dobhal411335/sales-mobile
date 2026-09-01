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
import {MOCK_EMPLOYEES, type MockEmployee} from '../../mocks/employeeMockData';

interface StaffPartyFormProps {
  selectedStaffId: string;
  staffOrderReason: string;
  onStaffChange: (id: string) => void;
  onReasonChange: (reason: string) => void;
}

export function StaffPartyForm({
  selectedStaffId,
  staffOrderReason,
  onStaffChange,
  onReasonChange,
}: StaffPartyFormProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedEmployee = MOCK_EMPLOYEES.find(
    (emp) => emp.id === selectedStaffId,
  );

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>SELECT EMPLOYEE</Text>
        <Pressable
          style={styles.selectButton}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Select employee">
          <Text
            style={
              selectedEmployee ? styles.selectValue : styles.selectPlaceholder
            }>
            {selectedEmployee
              ? `${selectedEmployee.name}${selectedEmployee.role ? ` · ${selectedEmployee.role}` : ''}`
              : 'Choose staff member...'}
          </Text>
          <Text style={styles.selectCaret}>▾</Text>
        </Pressable>
      </View>

      {selectedEmployee ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoText}>
            Order for:{' '}
            <Text style={styles.infoBold}>{selectedEmployee.name}</Text>
          </Text>
          {Number(selectedEmployee.staffDiscount) > 0 ? (
            <Text style={styles.infoSubtext}>
              Staff discount: {selectedEmployee.staffDiscount}% off
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>
          REASON <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Optional reason for staff order"
          value={staffOrderReason}
          onChangeText={onReasonChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Staff order reason"
        />
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Employee</Text>
            <ScrollView style={styles.pickerList}>
              {MOCK_EMPLOYEES.map((emp: MockEmployee) => (
                <Pressable
                  key={emp.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    onStaffChange(emp.id);
                    setPickerOpen(false);
                  }}>
                  <Text style={styles.pickerItemText}>
                    {emp.name}
                    {emp.role ? ` · ${emp.role}` : ''}
                    {Number(emp.staffDiscount) > 0
                      ? ` · ${emp.staffDiscount}% off`
                      : ''}
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

export function getStaffPartyName(staffId: string): string {
  const employee = MOCK_EMPLOYEES.find((emp) => emp.id === staffId);
  return employee?.name ?? 'Staff';
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
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
    textTransform: 'none',
    letterSpacing: 0,
  },
  selectButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  selectCaret: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoPanel: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312E81',
  },
  infoBold: {
    fontWeight: '900',
  },
  infoSubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
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
  textarea: {
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
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
    minHeight: 52,
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
