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
import type {MenuProduct, TaxRate} from '../../types/product';
import {calculateItemTax, nextCartId} from '../../utils/cartPricing';
import {
  normalizeChoiceOptions,
} from '../../utils/productChoices';
import {formatCurrency} from '../../utils/currency';

interface ModifierModalProps {
  visible: boolean;
  product: MenuProduct | null;
  globalTaxes: TaxRate[];
  onClose: () => void;
  onAdd: (items: CartLineItem[]) => void;
}

function Stepper({
  value,
  onChange,
  label,
  price,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  price?: number;
}) {
  return (
    <View style={styles.stepperRow}>
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

export function ModifierModal({
  visible,
  product,
  globalTaxes,
  onClose,
  onAdd,
}: ModifierModalProps) {
  const [variantQtyBySize, setVariantQtyBySize] = useState<Record<string, number>>(
    {},
  );
  const [addonQtyByName, setAddonQtyByName] = useState<Record<string, number>>(
    {},
  );
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
    setAddonQtyByName({});
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

    const addonEntries = Object.entries(addonQtyByName).filter(
      ([, qty]) => qty > 0,
    );

    addonEntries.forEach(([addonName, qty]) => {
      const addon = product.addons?.find((item) => item.name === addonName);
      const price = addon?.price ?? 0;
      const tax = calculateItemTax(product, price, globalTaxes);
      lines.push({
        cartId: nextCartId(),
        id: product.id,
        name: product.name,
        productCode: product.productCode,
        category: product.category?.name || 'ITEMS',
        price,
        tax,
        qty,
        size: 'Extra',
        productType: product.productType,
        taxes: product.taxes,
        preparationStyle: selectedStyle || null,
        options: [addonName],
        modifier: `Addons: ${addonName}`,
      });
    });

    if (!hasVariants && addonEntries.length === 0) {
      const price = product.price || 0;
      const tax = calculateItemTax(product, price, globalTaxes);
      const modifierParts = [
        'Size: Standard',
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
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.subtitle}>
            {product.category?.name || 'Menu item'}
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
                {stylesList.map((style) => {
                  const active = selectedStyle === style;
                  return (
                    <Pressable
                      key={style}
                      style={[styles.choiceRow, active && styles.choiceRowActive]}
                      onPress={() => setSelectedStyle(active ? '' : style)}
                      accessibilityRole="button"
                      accessibilityState={{selected: active}}>
                      <Text style={styles.choiceText}>{style}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {choiceGroups.map((group) => (
              <View key={group.name} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.name}</Text>
                {group.subChoices.map((subChoice) => {
                  const active = (selectedChoices[group.name] || []).includes(
                    subChoice,
                  );
                  return (
                    <Pressable
                      key={subChoice}
                      style={[styles.choiceRow, active && styles.choiceRowActive]}
                      onPress={() => toggleChoice(group.name, subChoice)}
                      accessibilityRole="button"
                      accessibilityState={{selected: active}}>
                      <Text style={styles.choiceText}>{subChoice}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {product.addons?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Extras</Text>
                {product.addons.map((addon) => (
                  <Stepper
                    key={addon.name}
                    label={addon.name}
                    price={addon.price}
                    value={addonQtyByName[addon.name] || 0}
                    onChange={(qty) =>
                      setAddonQtyByName((prev) => ({
                        ...prev,
                        [addon.name]: qty,
                      }))
                    }
                  />
                ))}
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
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  stepperRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperButtonText: {
    fontSize: 22,
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
  choiceRow: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.cream,
  },
  choiceRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '600',
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
