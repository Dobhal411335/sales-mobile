import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem, ChoiceSelection} from '../../types/cart';
import type {MenuProduct, ProductAddon, TaxRate} from '../../types/product';
import {calculateItemTax, nextCartId} from '../../utils/cartPricing';
import {normalizeChoiceOptions} from '../../utils/productChoices';
import {formatCurrency} from '../../utils/currency';

interface ModifierModalProps {
  visible: boolean;
  product: MenuProduct | null;
  globalTaxes: TaxRate[];
  onClose: () => void;
  onAdd: (items: CartLineItem[]) => void;
}

type AddonState = {
  qty: number;
  choicesByGroup: Record<number, string[]>;
};

function getAddonKey(addon: ProductAddon): string {
  return String(addon.id || addon.name || '');
}

function buildAddonChoiceSelections(
  addon: ProductAddon,
  choicesByGroup: Record<number, string[]> = {},
): ChoiceSelection[] {
  return normalizeChoiceOptions(addon.choiceOptions)
    .map((group, index) => ({
      name: group.name,
      subChoices: choicesByGroup[index] || [],
    }))
    .filter((group) => group.subChoices.length > 0);
}

function Stepper({
  value,
  onChange,
  label,
  price,
  flat = false,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  price?: number;
  flat?: boolean;
}) {
  return (
    <View style={[styles.stepperRow, flat && styles.stepperRowFlat]}>
      <View style={styles.stepperLabelWrap}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {price !== undefined ? (
          <Text style={styles.stepperPrice}>{formatCurrency(price)}</Text>
        ) : null}
      </View>
      <View style={styles.stepperControls}>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(0, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}>
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(value + 1)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}>
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choiceChip, active && styles.choiceChipActive]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{checked: active}}>
      <View style={[styles.checkbox, active && styles.checkboxActive]}>
        {active ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.choiceChipText}>{label}</Text>
    </Pressable>
  );
}

export function ModifierModal({
  visible,
  product,
  globalTaxes,
  onClose,
  onAdd,
}: ModifierModalProps) {
  const [variantQtyBySize, setVariantQtyBySize] = useState<
    Record<string, number>
  >({});
  const [addonStateByKey, setAddonStateByKey] = useState<
    Record<string, AddonState>
  >({});
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<
    Record<string, string[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !visible) {
      return;
    }
    const stylesList = (product.preparationStyles || []).filter(Boolean);
    setVariantQtyBySize({});
    setAddonStateByKey({});
    setSelectedChoices({});
    setSelectedStyle(stylesList.length === 1 ? stylesList[0] : '');
    setError(null);
  }, [product, visible]);

  const choiceGroups = useMemo(
    () => normalizeChoiceOptions(product?.choiceOptions),
    [product],
  );

  const toggleChoice = (groupName: string, subChoice: string) => {
    setSelectedChoices((prev) => {
      const current = prev[groupName] || [];
      const exists = current.includes(subChoice);
      return {
        ...prev,
        [groupName]: exists
          ? current.filter((value) => value !== subChoice)
          : [...current, subChoice],
      };
    });
  };

  const setAddonQty = (addon: ProductAddon, qty: number) => {
    const key = getAddonKey(addon);
    const next = Math.max(0, Math.floor(qty));
    setAddonStateByKey((prev) => {
      const copy = {...prev};
      if (next <= 0) {
        delete copy[key];
      } else {
        copy[key] = {
          qty: next,
          choicesByGroup: copy[key]?.choicesByGroup || {},
        };
      }
      return copy;
    });
  };

  const buildLines = (): CartLineItem[] => {
    if (!product) {
      return [];
    }

    const lines: CartLineItem[] = [];
    const choiceSelections: ChoiceSelection[] = Object.entries(selectedChoices)
      .map(([name, subChoices]) => ({name, subChoices}))
      .filter((group) => group.subChoices.length > 0);

    const variantEntries = Object.entries(variantQtyBySize).filter(
      ([, qty]) => qty > 0,
    );
    const hasVariants = Boolean(product.variants?.length);

    if (hasVariants) {
      variantEntries.forEach(([size, qty]) => {
        const variant = product.variants?.find((item) => item.size === size);
        const price = variant?.price ?? product.price;
        const tax = calculateItemTax(product, price, globalTaxes);
        const modifierParts = [
          size ? `Size: ${size}` : undefined,
          selectedStyle || undefined,
          ...choiceSelections.flatMap((group) =>
            group.subChoices.map((value) => `${group.name}: ${value}`),
          ),
        ].filter(Boolean);

        lines.push({
          cartId: nextCartId(),
          id: product.id,
          name: product.name,
          productCode: product.productCode,
          category: product.category?.name || 'ITEMS',
          price,
          tax,
          qty,
          size,
          productType: product.productType,
          taxes: product.taxes,
          preparationStyle: selectedStyle || null,
          choiceSelections,
          modifier: modifierParts.join(' | ') || undefined,
        });
      });
    }

    (product.addons || []).forEach((addon) => {
      const key = getAddonKey(addon);
      const entry = addonStateByKey[key];
      if (!entry || entry.qty <= 0) {
        return;
      }
      const price = addon.price ?? 0;
      const tax = calculateItemTax(product, price, globalTaxes);
      const addonChoiceSelections = buildAddonChoiceSelections(
        addon,
        entry.choicesByGroup,
      );
      const choiceParts = addonChoiceSelections.flatMap((group) =>
        group.subChoices.map((value) => `${group.name}: ${value}`),
      );
      lines.push({
        cartId: nextCartId(),
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        category: product.category?.name || 'ITEMS',
        price,
        tax,
        qty: entry.qty,
        size: 'Extra',
        productType: product.productType,
        taxes: product.taxes,
        preparationStyle: selectedStyle || null,
        options: [addon.name],
        addonChoiceSelections,
        modifier: [`Addons: ${addon.name}`, ...choiceParts]
          .filter(Boolean)
          .join(' | '),
      });
    });

    if (!hasVariants) {
      const price = product.price || 0;
      const tax = calculateItemTax(product, price, globalTaxes);
      const modifierParts = [
        'Size: Standard',
        selectedStyle || undefined,
        ...choiceSelections.flatMap((group) =>
          group.subChoices.map((value) => `${group.name}: ${value}`),
        ),
      ].filter(Boolean);

      lines.unshift({
        cartId: nextCartId(),
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        category: product.category?.name || 'ITEMS',
        price,
        tax,
        qty: 1,
        size: 'Standard',
        productType: product.productType,
        taxes: product.taxes,
        preparationStyle: selectedStyle || null,
        choiceSelections,
        modifier: modifierParts.join(' | ') || undefined,
      });
    }

    return lines;
  };

  const handleAdd = () => {
    if (!product) {
      return;
    }

    const hasVariants = Boolean(product.variants?.length);
    const variantEntries = Object.entries(variantQtyBySize).filter(
      ([, qty]) => qty > 0,
    );
    if (hasVariants && variantEntries.length === 0) {
      setError('Select at least one variant');
      return;
    }

    const lines = buildLines();
    if (!lines.length) {
      setError('Select a variant or extra');
      return;
    }

    onAdd(lines);
    onClose();
  };

  if (!product) {
    return null;
  }

  const stylesList = (product.preparationStyles || []).filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {product.productCode ? (
                <Text style={styles.productCode}>{product.productCode} </Text>
              ) : null}
              {product.name}
            </Text>
            <Text style={styles.subtitle}>Select variations and extras</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            {product.variants?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Variants</Text>
                {product.variants.map((variant) => (
                  <Stepper
                    key={variant.size}
                    label={variant.size}
                    price={variant.price}
                    value={variantQtyBySize[variant.size] || 0}
                    onChange={(qty) =>
                      setVariantQtyBySize((prev) => ({
                        ...prev,
                        [variant.size]: qty,
                      }))
                    }
                  />
                ))}
              </View>
            ) : null}

            {stylesList.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preparation</Text>
                <View style={styles.choiceGrid}>
                  {stylesList.map((style) => {
                    const active = selectedStyle === style;
                    return (
                      <ChoiceChip
                        key={style}
                        label={style}
                        active={active}
                        onPress={() => setSelectedStyle(active ? '' : style)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {choiceGroups.map((group) => (
              <View key={group.name} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.name}</Text>
                <View style={styles.choiceGrid}>
                  {group.subChoices.map((subChoice) => {
                    const active = (selectedChoices[group.name] || []).includes(
                      subChoice,
                    );
                    return (
                      <ChoiceChip
                        key={subChoice}
                        label={subChoice}
                        active={active}
                        onPress={() => toggleChoice(group.name, subChoice)}
                      />
                    );
                  })}
                </View>
              </View>
            ))}

            {product.addons?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Extras</Text>
                {product.addons.map((addon) => {
                  const addonKey = getAddonKey(addon);
                  const entry = addonStateByKey[addonKey];
                  const qty = entry?.qty || 0;
                  const choicesByGroup = entry?.choicesByGroup || {};
                  const addonChoiceGroups = normalizeChoiceOptions(
                    addon.choiceOptions,
                  );
                  const active = qty > 0;

                  return (
                    <View
                      key={addonKey}
                      style={[
                        styles.addonCard,
                        active && styles.addonCardActive,
                      ]}>
                      <Stepper
                        label={addon.name}
                        price={addon.price}
                        value={qty}
                        flat
                        onChange={(nextQty) => setAddonQty(addon, nextQty)}
                      />

                      {qty > 0 && addonChoiceGroups.length > 0 ? (
                        <View style={styles.addonChoices}>
                          {addonChoiceGroups.map((group, groupIndex) => (
                            <View
                              key={`${addonKey}-${group.name}-${groupIndex}`}
                              style={styles.addonChoiceGroup}>
                              <Text style={styles.addonChoiceTitle}>
                                {group.name}
                              </Text>
                              <View style={styles.choiceGrid}>
                                {group.subChoices.map((choice) => {
                                  const selected = (
                                    choicesByGroup[groupIndex] || []
                                  ).includes(choice);
                                  return (
                                    <ChoiceChip
                                      key={`${addonKey}-${group.name}-${choice}`}
                                      label={choice}
                                      active={selected}
                                      onPress={() => {
                                        setAddonStateByKey((prev) => {
                                          const current = prev[addonKey];
                                          if (!current || current.qty <= 0) {
                                            return prev;
                                          }
                                          const list =
                                            current.choicesByGroup?.[
                                              groupIndex
                                            ] || [];
                                          const nextChoices = list.includes(
                                            choice,
                                          )
                                            ? list.filter((v) => v !== choice)
                                            : [...list, choice];
                                          return {
                                            ...prev,
                                            [addonKey]: {
                                              ...current,
                                              choicesByGroup: {
                                                ...(current.choicesByGroup ||
                                                  {}),
                                                [groupIndex]: nextChoices,
                                              },
                                            },
                                          };
                                        });
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel="Add to order">
              <Text style={styles.addText}>Add to Order</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  productCode: {
    color: colors.primary,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  stepperRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
  },
  stepperRowFlat: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  stepperLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stepperPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    minWidth: '30%',
    flexGrow: 1,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  choiceChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  choiceChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  addonCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  addonCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  addonChoices: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  addonChoiceGroup: {
    gap: 8,
  },
  addonChoiceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
