import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Trash2} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import {formatCurrency} from '../../utils/currency';
import {
  getItemLineTotal,
  normalizeChoiceSelections,
  normalizeCustomExtras,
} from '../../utils/productChoices';

interface CartItemProps {
  item: CartLineItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onChangeNotes: (notes: string) => void;
}

function ChoiceChips({
  groups,
  tone,
}: {
  groups: {name: string; subChoices: string[]}[];
  tone: 'choice' | 'addon';
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <View style={styles.choiceBlock}>
      {groups.map((group) => (
        <View key={`${tone}-${group.name}`}>
          <Text style={styles.choiceGroupLabel}>{group.name}</Text>
          <View style={styles.chipRow}>
            {group.subChoices.map((choice) => (
              <View
                key={`${group.name}-${choice}`}
                style={[
                  styles.chip,
                  tone === 'addon' ? styles.addonChip : styles.choiceChip,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    tone === 'addon' ? styles.addonChipText : styles.choiceChipText,
                  ]}>
                  {choice}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CartItemComponent({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  onChangeNotes,
}: CartItemProps) {
  const lineTotal = getItemLineTotal(item);
  const choiceGroups = item.isOffer
    ? []
    : normalizeChoiceSelections(item.choiceSelections);
  const addonGroups = item.isOffer
    ? []
    : normalizeChoiceSelections(item.addonChoiceSelections);
  const customExtras = item.isOffer
    ? []
    : normalizeCustomExtras(item.customExtras);
  const showSizeInName = Boolean(item.size && item.size !== 'Standard');

  return (
    <View style={styles.item}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            {item.isOffer ? (
              <Text style={styles.offerBadge}>OFFER</Text>
            ) : item.productCode ? (
              <Text style={styles.productCode}>{item.productCode}</Text>
            ) : null}
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
              {showSizeInName ? (
                <Text style={styles.sizeHint}> ({item.size})</Text>
              ) : null}
            </Text>
          </View>
          {item.modifier &&
          choiceGroups.length === 0 &&
          addonGroups.length === 0 &&
          customExtras.length === 0 ? (
            <Text style={styles.modifier} numberOfLines={4}>
              {item.modifier}
            </Text>
          ) : null}
          {item.options?.length && item.size === 'Extra' ? (
            <Text style={styles.modifier} numberOfLines={2}>
              {item.options.join(', ')}
            </Text>
          ) : null}
          {item.preparationStyle ? (
            <Text style={styles.modifier} numberOfLines={1}>
              {item.preparationStyle}
            </Text>
          ) : null}
          <ChoiceChips groups={choiceGroups} tone="choice" />
          <ChoiceChips groups={addonGroups} tone="addon" />
          {customExtras.map((extra, extraIdx) => (
            <Text
              key={`${extra.name}-${extraIdx}`}
              style={styles.modifier}
              numberOfLines={2}>
              + {extra.name} (+{formatCurrency(extra.price)})
            </Text>
          ))}
        </View>
        <Text style={styles.price}>{formatCurrency(lineTotal)}</Text>
      </View>

      <View style={styles.notesBlock}>
        <Text style={styles.notesLabel}>Item remark</Text>
        <TextInput
          style={styles.notesInput}
          value={item.notes || ''}
          onChangeText={onChangeNotes}
          onBlur={() => {
            const trimmed = String(item.notes || '').trim();
            if (trimmed !== (item.notes || '')) {
              onChangeNotes(trimmed);
            }
          }}
          placeholder="e.g. No onions, extra sauce..."
          placeholderTextColor={colors.textSecondary}
          multiline
          accessibilityLabel={`Item remark for ${item.name}`}
        />
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.trashButton}
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}>
          <Trash2 size={16} color={colors.error} />
        </Pressable>

        <View style={styles.qtyControls}>
          <Pressable
            style={styles.qtyButton}
            onPress={onDecrease}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${item.name}`}>
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.qty}</Text>
          <Pressable
            style={styles.qtyButton}
            onPress={onIncrease}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${item.name}`}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const CartItem = memo(CartItemComponent);

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  offerBadge: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  productCode: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryHover,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 20,
  },
  sizeHint: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modifier: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  choiceBlock: {
    marginTop: 8,
    gap: 8,
  },
  choiceGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  choiceChip: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  addonChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  choiceChipText: {
    color: '#9A3412',
  },
  addonChipText: {
    color: '#1E40AF',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  notesBlock: {
    gap: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    minHeight: 40,
    maxHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.cream,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F4F5',
    borderRadius: 8,
    padding: 3,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  qtyValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
});
