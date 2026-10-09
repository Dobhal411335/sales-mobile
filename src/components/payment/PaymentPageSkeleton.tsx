import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {SkeletonBlock} from '../common/SkeletonBlock';
import {colors} from '../../constants/colors';

/**
 * Loading placeholder that mirrors PaymentScreen layout:
 * history pane · payment controls · live bill preview.
 */
export function PaymentPageSkeleton() {
  const {width} = useWindowDimensions();
  const isWide = width >= 900;
  const isTabletThreeCol = width >= 1024;

  return (
    <View
      style={[
        styles.root,
        isWide && styles.rootWide,
        isTabletThreeCol && styles.rootThreeCol,
      ]}
      accessibilityLabel="Loading payment"
      accessibilityRole="progressbar">
      <View
        style={[
          styles.historyPane,
          isWide && styles.historyPaneWide,
          isTabletThreeCol && styles.historyPaneThreeCol,
        ]}>
        <View style={styles.paneHeader}>
          <SkeletonBlock style={styles.titleWide} />
          <SkeletonBlock style={styles.subtitle} />
        </View>
        <View style={styles.historyBody}>
          {Array.from({length: 5}, (_, i) => (
            <View key={`hist-${i}`} style={styles.historyLine}>
              <SkeletonBlock style={styles.historyLabel} />
              <SkeletonBlock style={styles.historyValue} />
            </View>
          ))}
          <View style={styles.billTotalBox}>
            <SkeletonBlock style={styles.billTotalLabel} />
            <SkeletonBlock style={styles.billTotalValue} />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.controlsPane,
          isWide && styles.controlsPaneWide,
          isTabletThreeCol && styles.controlsPaneThreeCol,
        ]}>
        <View style={styles.controlsBody}>
          <SkeletonBlock style={styles.sectionTitle} />
          <View style={styles.chipRow}>
            <SkeletonBlock style={styles.chip} />
            <SkeletonBlock style={styles.chip} />
          </View>

          <SkeletonBlock style={styles.sectionTitle} />
          <View style={styles.methodRow}>
            <SkeletonBlock style={styles.methodChip} />
            <SkeletonBlock style={styles.methodChip} />
            <SkeletonBlock style={styles.methodChip} />
          </View>

          <SkeletonBlock style={styles.sectionTitle} />
          <View style={styles.fieldBlock}>
            <SkeletonBlock style={styles.fieldLabel} />
            <SkeletonBlock style={styles.inputBone} />
          </View>
          <View style={styles.fieldBlock}>
            <SkeletonBlock style={styles.fieldLabel} />
            <SkeletonBlock style={styles.inputBone} />
          </View>

          <View style={styles.discountRow}>
            <SkeletonBlock style={styles.discountSelect} />
            <SkeletonBlock style={styles.discountApply} />
          </View>

          <SkeletonBlock style={styles.serviceCharge} />
        </View>
      </View>

      <View
        style={[
          styles.receiptPane,
          isWide && styles.receiptPaneWide,
          isTabletThreeCol && styles.receiptPaneThreeCol,
        ]}>
        <View style={styles.paneHeader}>
          <SkeletonBlock style={styles.titleNarrow} />
          <SkeletonBlock style={styles.subtitle} />
        </View>
        <View style={styles.receiptBody}>
          <View style={styles.partyCard}>
            <SkeletonBlock style={styles.fieldLabel} />
            <SkeletonBlock style={styles.inputBone} />
            <SkeletonBlock style={styles.helperLine} />
          </View>
          <View style={styles.receiptCard}>
            <SkeletonBlock style={styles.receiptHeader} />
            {Array.from({length: 4}, (_, i) => (
              <View key={`rcpt-${i}`} style={styles.receiptLine}>
                <SkeletonBlock style={styles.receiptItem} />
                <SkeletonBlock style={styles.receiptPrice} />
              </View>
            ))}
            <View style={styles.receiptDivider} />
            <View style={styles.receiptLine}>
              <SkeletonBlock style={styles.receiptItemShort} />
              <SkeletonBlock style={styles.receiptPrice} />
            </View>
            <View style={styles.receiptLine}>
              <SkeletonBlock style={styles.receiptItemShort} />
              <SkeletonBlock style={styles.receiptPrice} />
            </View>
            <View style={styles.receiptTotalRow}>
              <SkeletonBlock style={styles.receiptTotalLabel} />
              <SkeletonBlock style={styles.receiptTotalValue} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootWide: {
    flexDirection: 'row',
  },
  rootThreeCol: {
    flexDirection: 'row',
  },
  historyPane: {
    maxHeight: '32%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  historyPaneWide: {
    maxHeight: undefined,
    flex: 0.9,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  historyPaneThreeCol: {
    flex: 0,
    width: 300,
    maxWidth: 320,
  },
  controlsPane: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 220,
  },
  controlsPaneWide: {
    flex: 1.2,
  },
  controlsPaneThreeCol: {
    flex: 1,
    minWidth: 320,
  },
  receiptPane: {
    maxHeight: '38%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#F4F4F5',
  },
  receiptPaneWide: {
    maxHeight: undefined,
    flex: 1,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  receiptPaneThreeCol: {
    flex: 0,
    width: 360,
    maxWidth: 380,
  },
  paneHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  titleWide: {
    width: '55%',
    height: 14,
  },
  titleNarrow: {
    width: '40%',
    height: 14,
  },
  subtitle: {
    width: '70%',
    height: 10,
  },
  historyBody: {
    padding: 16,
    gap: 14,
  },
  historyLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLabel: {
    width: '42%',
    height: 12,
  },
  historyValue: {
    width: 72,
    height: 12,
  },
  billTotalBox: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  billTotalLabel: {
    width: '35%',
    height: 11,
  },
  billTotalValue: {
    width: '50%',
    height: 22,
  },
  controlsBody: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    width: 110,
    height: 11,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    width: 108,
    height: 36,
    borderRadius: 12,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    width: 96,
    height: 10,
  },
  inputBone: {
    width: '100%',
    height: 44,
    borderRadius: 12,
  },
  discountRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  discountSelect: {
    flex: 1,
    height: 42,
    borderRadius: 12,
  },
  discountApply: {
    width: 72,
    height: 42,
    borderRadius: 12,
  },
  serviceCharge: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    marginTop: 4,
  },
  receiptBody: {
    padding: 12,
    gap: 12,
  },
  partyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  helperLine: {
    width: '75%',
    height: 10,
  },
  receiptCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  receiptHeader: {
    width: '60%',
    height: 16,
    alignSelf: 'center',
    marginBottom: 4,
  },
  receiptLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptItem: {
    width: '55%',
    height: 11,
  },
  receiptItemShort: {
    width: '35%',
    height: 11,
  },
  receiptPrice: {
    width: 52,
    height: 11,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  receiptTotalLabel: {
    width: '30%',
    height: 14,
  },
  receiptTotalValue: {
    width: 72,
    height: 16,
  },
});
