import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import {colors} from '../../constants/colors';
import {useStaffEmployees} from '../../hooks/useStaffEmployees';
import type {SalesEmployee} from '../../services/employeeService';

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
  const {employees, loading} = useStaffEmployees();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedEmployee = employees.find((emp) => emp.id === selectedStaffId);

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
            {loading
              ? 'Loading employees...'
              : selectedEmployee
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
          <Pressable
            style={styles.pickerSheet}
            onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Employee</Text>
              <Pressable
                style={styles.pickerCloseBtn}
                onPress={() => setPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close employee picker">
                <Text style={styles.pickerCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}>
              {employees.map((emp: SalesEmployee) => {
                const isSelected = emp.id === selectedStaffId;
                return (
                  <Pressable
                    key={emp.id}
                    style={[
                      styles.pickerItem,
                      isSelected && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      onStaffChange(emp.id);
                      setPickerOpen(false);
                    }}>
                    <View style={styles.pickerItemLeft}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}>
                        {emp.name}
                        {emp.role ? ` · ${emp.role}` : ''}
                      </Text>
                      {Number(emp.staffDiscount) > 0 ? (
                        <Text style={styles.pickerItemDiscount}>
                          Staff discount: {emp.staffDiscount}% off
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={styles.pickerItemCheckmark}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 400,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#FFF7ED',
  },
  pickerItemLeft: {
    flex: 1,
    gap: 2,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pickerItemTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  pickerItemDiscount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  pickerItemCheckmark: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 8,
  },
});
