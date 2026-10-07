import React, {memo, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Plus, Trash2, X} from 'lucide-react-native';
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
  onChangeModifiedRequest: (fields: {
    noteWithout: string;
    noteAdd: string;
  }) => void;
  onAddCustomExtra: (extra: {name: string; price: number}) => void;
  onRemoveCustomExtra: (extraIndex: number) => void;
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
  onChangeModifiedRequest,
  onAddCustomExtra,
  onRemoveCustomExtra,
}: CartItemProps) {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const lineTotal = getItemLineTotal(item);
  const choiceGroups = item.isOffer
    ? []
    : normalizeChoiceSelections(item.choiceSelections);
  const addonGroups = item.isOffer
    ? []
    : normalizeChoiceSelections(item.addonChoiceSelections);
  const customExtras = normalizeCustomExtras(item.customExtras);
  const showSizeInName = Boolean(item.size && item.size !== 'Standard');

  const openCustomModal = () => {
    setCustomName('');
    setCustomPrice('');
    setCustomError(null);
    setCustomModalOpen(true);
  };

  const closeCustomModal = () => {
    setCustomModalOpen(false);
    setCustomName('');
    setCustomPrice('');
    setCustomError(null);
  };

  const submitCustomModal = () => {
    const rawName = String(customName || '').trim();
    const rawPrice = customPrice;
    const priceEmpty =
      rawPrice === '' || rawPrice === null || rawPrice === undefined;
    if (!rawName) {
      setCustomError('Custom item name is required');
      return;
    }
    if (rawName.length > 80) {
      setCustomError('Custom item name is too long (max 80 characters)');
      return;
    }
    if (priceEmpty) {
      setCustomError('Custom item price is required');
      return;
    }
    const priceNum = Number(rawPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setCustomError('Enter a valid price');
      return;
    }
    onAddCustomExtra({name: rawName, price: priceNum});
    closeCustomModal();
  };

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
            <View
              key={`${extra.name}-${extraIdx}`}
              style={styles.customExtraRow}>
              <Text style={styles.modifier} numberOfLines={2}>
                + {extra.name} (+{formatCurrency(extra.price)})
              </Text>
              <Pressable
                onPress={() => onRemoveCustomExtra(extraIdx)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${extra.name}`}>
                <Text style={styles.removeExtraText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Text style={styles.price}>{formatCurrency(lineTotal)}</Text>
      </View>

      <View style={styles.notesBlock}>
        <View style={styles.notesHeader}>
          <Text style={styles.notesLabel}>Modified request</Text>
          <Pressable
            style={styles.customItemButton}
            onPress={openCustomModal}
            accessibilityRole="button"
            accessibilityLabel={`Add custom item to ${item.name}`}>
            <Plus size={12} color={colors.primaryHover} />
            <Text style={styles.customItemButtonText}>Custom item</Text>
          </Pressable>
        </View>
        <View style={styles.modifiedRequestFields}>
          <View style={styles.modifiedRequestRow}>
            <Text style={styles.modifiedRequestLabel}>Without</Text>
            <TextInput
              style={styles.modifiedRequestInput}
              value={item.noteWithout || ''}
              onChangeText={(value) =>
                onChangeModifiedRequest({
                  noteWithout: value,
                  noteAdd: item.noteAdd || '',
                })
              }
              onBlur={() =>
                onChangeModifiedRequest({
                  noteWithout: String(item.noteWithout || '').trim(),
                  noteAdd: String(item.noteAdd || '').trim(),
                })
              }
              placeholder="Type Here"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
              accessibilityLabel={`Without for ${item.name}`}
            />
          </View>
          <View style={styles.modifiedRequestRow}>
            <Text style={styles.modifiedRequestLabel}>Add</Text>
            <TextInput
              style={styles.modifiedRequestInput}
              value={item.noteAdd || ''}
              onChangeText={(value) =>
                onChangeModifiedRequest({
                  noteWithout: item.noteWithout || '',
                  noteAdd: value,
                })
              }
              onBlur={() =>
                onChangeModifiedRequest({
                  noteWithout: String(item.noteWithout || '').trim(),
                  noteAdd: String(item.noteAdd || '').trim(),
                })
              }
              placeholder="Type Here"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
              accessibilityLabel={`Add for ${item.name}`}
            />
          </View>
        </View>
        {item.notes ? (
          <Text style={styles.modifiedRequestPreview}>{item.notes}</Text>
        ) : null}
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

      <Modal
        visible={customModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCustomModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Add custom item</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  For {item.name}
                </Text>
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={closeCustomModal}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={customName}
                  onChangeText={(value) => {
                    setCustomName(value);
                    setCustomError(null);
                  }}
                  placeholder="e.g. Extra cheese slice"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={80}
                  autoFocus
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  Price <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={customPrice}
                  onChangeText={(value) => {
                    setCustomPrice(value);
                    setCustomError(null);
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              {customError ? (
                <Text style={styles.modalError}>{customError}</Text>
              ) : null}
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={closeCustomModal}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalAddButton}
                onPress={submitCustomModal}
                accessibilityRole="button"
                accessibilityLabel="Add custom item">
                <Text style={styles.modalAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
  },
  customExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  removeExtraText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
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
    gap: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  customItemButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryHover,
  },
  modifiedRequestFields: {
    gap: 6,
  },
  modifiedRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modifiedRequestLabel: {
    width: 56,
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  modifiedRequestInput: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.cream,
  },
  modifiedRequestPreview: {
    borderRadius: 10,
    backgroundColor: '#F8E8E4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    color: '#3F3F46',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  modalField: {
    gap: 6,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  modalInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  modalError: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalAddButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  modalAddText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.surface,
  },
});
