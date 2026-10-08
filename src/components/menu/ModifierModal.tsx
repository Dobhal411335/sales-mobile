import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import {ChevronDown, Minus, Plus} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import {useKeyboardBottomInset} from '../../hooks/useKeyboardBottomInset';
import type {
  CartLineItem,
  ChoiceSelection,
  CustomDataSelection,
} from '../../types/cart';
import type {MenuProduct, ProductAddon, TaxRate} from '../../types/product';
import {calculateItemTax, nextCartId} from '../../utils/cartPricing';
import {buildModifiedRequestRemark} from '../../utils/modifiedRequestRemark';
import {
  buildAddonChoiceSelectionsFromQtyMaps,
  normalizeAddonChoiceQtyMap,
  normalizeChoiceOptions,
  normalizeCustomDataSelections,
  sumAddonChoiceQtyMap,
  validateAddonNestedChoiceQtys,
} from '../../utils/productChoices';
import {formatCurrency} from '../../utils/currency';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateAccordionToggle() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.accordionItem}>
      <Pressable
        style={styles.accordionTrigger}
        onPress={() => {
          animateAccordionToggle();
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <ChevronDown
          size={18}
          color={colors.textSecondary}
          style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}
        />
      </Pressable>
      {open ? <View style={styles.accordionContent}>{children}</View> : null}
    </View>
  );
}

interface ModifierModalProps {
  visible: boolean;
  product: MenuProduct | null;
  globalTaxes: TaxRate[];
  onClose: () => void;
  onAdd: (items: CartLineItem[]) => void;
}

type AddonState = {
  qty: number;
  choicesByGroup: Record<number, Record<string, number>>;
};

function getAddonKey(addon: ProductAddon): string {
  return String(addon.id || addon.name || '');
}

function clampChoicesToAddonQty(
  choicesByGroup: Record<number, Record<string, number>>,
  nestedCount: number,
  nextQty: number,
): Record<number, Record<string, number>> {
  if (nextQty <= 0 || nestedCount <= 0) {
    return {};
  }
  const clamped: Record<number, Record<string, number>> = {};
  for (let groupIndex = 0; groupIndex < nestedCount; groupIndex += 1) {
    const map = normalizeAddonChoiceQtyMap(choicesByGroup[groupIndex]);
    let remaining = nextQty;
    const nextMap: Record<string, number> = {};
    for (const [sub, count] of Object.entries(map)) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(count, remaining);
      if (take > 0) {
        nextMap[sub] = take;
        remaining -= take;
      }
    }
    clamped[groupIndex] = nextMap;
  }
  return clamped;
}

function Stepper({
  value,
  onChange,
  label,
  price,
  flat = false,
  compact = false,
  min = 0,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  price?: number;
  flat?: boolean;
  compact?: boolean;
  min?: number;
  max?: number;
}) {
  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <View
      style={[
        styles.stepperRow,
        flat && styles.stepperRowFlat,
        compact && styles.stepperRowCompact,
      ]}>
      <View style={[styles.stepperLabelWrap, compact && styles.stepperLabelWrapCompact]}>
        <Text
          style={[styles.stepperLabel, compact && styles.stepperLabelCompact]}
          numberOfLines={compact ? 2 : undefined}>
          {label}
        </Text>
        {price !== undefined ? (
          <Text style={styles.stepperPrice}>{formatCurrency(price)}</Text>
        ) : null}
      </View>
      <View style={[styles.stepperControls, compact && styles.stepperControlsCompact]}>
        <Pressable
          style={[
            styles.stepperButton,
            compact && styles.stepperButtonCompact,
            !canDecrease && styles.stepperButtonDisabled,
          ]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}>
          <Text
            style={[
              styles.stepperButtonText,
              compact && styles.stepperButtonTextCompact,
            ]}>
            −
          </Text>
        </Pressable>
        <Text
          style={[styles.stepperValue, compact && styles.stepperValueCompact]}>
          {value}
        </Text>
        <Pressable
          style={[
            styles.stepperButton,
            compact && styles.stepperButtonCompact,
            !canIncrease && styles.stepperButtonDisabled,
          ]}
          onPress={() =>
            onChange(
              max === undefined ? value + 1 : Math.min(max, value + 1),
            )
          }
          disabled={!canIncrease}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}>
          <Text
            style={[
              styles.stepperButtonText,
              compact && styles.stepperButtonTextCompact,
            ]}>
            +
          </Text>
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
  const keyboardInset = useKeyboardBottomInset();
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
  /** { [groupName]: { [optionName]: string[] } } */
  const [selectedCustomData, setSelectedCustomData] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [noteWithout, setNoteWithout] = useState('');
  const [noteAdd, setNoteAdd] = useState('');
  const [modifiedRequestOpen, setModifiedRequestOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);

  const customDataGroups = useMemo(
    () => normalizeCustomDataSelections(product?.customData),
    [product],
  );
  const choiceGroups = useMemo(
    () => normalizeChoiceOptions(product?.choiceOptions),
    [product],
  );

  const sectionIds = useMemo(() => {
    if (!product) {
      return [] as string[];
    }
    const prepStyles = (product.preparationStyles || []).filter(Boolean);
    return [
      ...(product.variants?.length ? ['variants'] : []),
      ...(prepStyles.length ? ['preparation'] : []),
      ...customDataGroups.map(
        (group, index) => `custom-${index}-${group.name}`,
      ),
      ...choiceGroups.map((group, index) => `choice-${index}-${group.name}`),
      ...(product.addons?.length ? ['addons'] : []),
    ];
  }, [product, customDataGroups, choiceGroups]);

  useEffect(() => {
    if (!product || !visible) {
      return;
    }
    const stylesList = (product.preparationStyles || []).filter(Boolean);
    setVariantQtyBySize({});
    setAddonStateByKey({});
    setSelectedChoices({});
    setSelectedCustomData({});
    setSelectedStyle(stylesList.length === 1 ? stylesList[0] : '');
    setNoteWithout('');
    setNoteAdd('');
    setModifiedRequestOpen(false);
    setError(null);
    setOpenSections(sectionIds[0] ? [sectionIds[0]] : []);
  }, [product, visible, sectionIds]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const isSectionOpen = (id: string) => openSections.includes(id);

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

  const toggleCustomDataChoice = (
    groupName: string,
    optionName: string,
    choice: string,
  ) => {
    setSelectedCustomData((prev) => {
      const group = prev[groupName] || {};
      const current = group[optionName] || [];
      const exists = current.includes(choice);
      return {
        ...prev,
        [groupName]: {
          ...group,
          [optionName]: exists
            ? current.filter((value) => value !== choice)
            : [...current, choice],
        },
      };
    });
  };

  const setAddonQty = (addon: ProductAddon, qty: number) => {
    const key = getAddonKey(addon);
    const next = Math.max(0, Math.floor(qty));
    const nestedCount = normalizeChoiceOptions(addon.choiceOptions).length;
    setAddonStateByKey((prev) => {
      const copy = {...prev};
      if (next <= 0) {
        delete copy[key];
      } else {
        const prevEntry = copy[key];
        copy[key] = {
          qty: next,
          choicesByGroup: clampChoicesToAddonQty(
            prevEntry?.choicesByGroup || {},
            nestedCount,
            next,
          ),
        };
      }
      return copy;
    });
  };

  const setAddonSubChoiceQty = (
    addon: ProductAddon,
    groupIndex: number,
    subChoice: string,
    nextQty: number,
  ) => {
    const key = getAddonKey(addon);
    setAddonStateByKey((prev) => {
      const entry = prev[key];
      const addonQty = Number(entry?.qty) || 0;
      if (addonQty <= 0) {
        return prev;
      }

      const groupMap = normalizeAddonChoiceQtyMap(
        entry?.choicesByGroup?.[groupIndex],
      );
      const current = Number(groupMap[subChoice]) || 0;
      const others = sumAddonChoiceQtyMap(groupMap) - current;
      const capped = Math.max(
        0,
        Math.min(
          Math.floor(Number(nextQty) || 0),
          Math.max(0, addonQty - others),
        ),
      );

      const nextMap = {...groupMap};
      if (capped <= 0) {
        delete nextMap[subChoice];
      } else {
        nextMap[subChoice] = capped;
      }

      return {
        ...prev,
        [key]: {
          qty: addonQty,
          choicesByGroup: {
            ...(entry?.choicesByGroup || {}),
            [groupIndex]: nextMap,
          },
        },
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
    const customDataSelections: CustomDataSelection[] = customDataGroups
      .map((group) => ({
        name: group.name,
        subChoices: group.subChoices
          .map((option) => ({
            name: option.name,
            choices: selectedCustomData[group.name]?.[option.name] || [],
          }))
          .filter((option) => option.choices.length > 0),
      }))
      .filter((group) => group.subChoices.length > 0);
    const nextWithout = String(noteWithout || '').trim();
    const nextAdd = String(noteAdd || '').trim();
    const notes = buildModifiedRequestRemark(nextWithout, nextAdd);

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
          ...customDataSelections.flatMap((group) =>
            group.subChoices.map(
              (option) => `${group.name} · ${option.name}: ${option.choices.join(', ')}`,
            ),
          ),
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
          customDataSelections,
          modifier: modifierParts.join(' | ') || undefined,
          noteWithout: nextWithout,
          noteAdd: nextAdd,
          notes,
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
      const addonChoiceSelections = buildAddonChoiceSelectionsFromQtyMaps(
        addon,
        entry.choicesByGroup,
      );
      const choiceSummary = addonChoiceSelections
        .map((group) => `${group.name}: ${group.subChoices.join(', ')}`)
        .join(' · ');
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
        modifier: choiceSummary
          ? `Addons: ${addon.name} · ${choiceSummary}`
          : `Addons: ${addon.name}`,
        noteWithout: nextWithout,
        noteAdd: nextAdd,
        notes,
      });
    });

    if (!hasVariants) {
      const price = product.price || 0;
      const tax = calculateItemTax(product, price, globalTaxes);
      const modifierParts = [
        'Size: Standard',
        selectedStyle || undefined,
        ...customDataSelections.flatMap((group) =>
          group.subChoices.map(
            (option) =>
              `${group.name} · ${option.name}: ${option.choices.join(', ')}`,
          ),
        ),
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
        customDataSelections,
        modifier: modifierParts.join(' | ') || undefined,
        noteWithout: nextWithout,
        noteAdd: nextAdd,
        notes,
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

    for (const addon of product.addons || []) {
      const key = getAddonKey(addon);
      const entry = addonStateByKey[key];
      if (!entry || entry.qty <= 0) {
        continue;
      }
      const nested = normalizeChoiceOptions(addon.choiceOptions);
      if (!nested.length) {
        continue;
      }
      const check = validateAddonNestedChoiceQtys(
        addon,
        entry.qty,
        entry.choicesByGroup || {},
      );
      if (!check.ok) {
        setError(
          check.errors[0]?.message ||
            `Nested choices for ${addon.name} must equal addon quantity.`,
        );
        return;
      }
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View
          style={[
            styles.backdrop,
            keyboardInset > 0 && styles.backdropKeyboardOpen,
            {paddingBottom: Math.max(24, keyboardInset > 0 ? 12 : 24)},
          ]}>
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
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
            <View style={styles.accordionList}>
              {product.variants?.length ? (
                <AccordionSection
                  title="Variants"
                  open={isSectionOpen('variants')}
                  onToggle={() => toggleSection('variants')}>
                  <View style={styles.variantList}>
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
                </AccordionSection>
              ) : null}

              {stylesList.length ? (
                <AccordionSection
                  title="Preparation"
                  open={isSectionOpen('preparation')}
                  onToggle={() => toggleSection('preparation')}>
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
                </AccordionSection>
              ) : null}

              {customDataGroups.map((group, groupIndex) => {
                const sectionId = `custom-${groupIndex}-${group.name}`;
                return (
                  <AccordionSection
                    key={sectionId}
                    title={group.name}
                    open={isSectionOpen(sectionId)}
                    onToggle={() => toggleSection(sectionId)}>
                    <View style={styles.customDataBlock}>
                      {group.subChoices.map((option) => (
                        <View
                          key={`${group.name}-${option.name}`}
                          style={styles.customDataOption}>
                          <Text style={styles.customDataOptionLabel}>
                            {option.name}
                          </Text>
                          <View style={styles.choiceGrid}>
                            {option.choices.map((choice) => {
                              const active = (
                                selectedCustomData[group.name]?.[option.name] ||
                                []
                              ).includes(choice);
                              return (
                                <ChoiceChip
                                  key={`${group.name}-${option.name}-${choice}`}
                                  label={choice}
                                  active={active}
                                  onPress={() =>
                                    toggleCustomDataChoice(
                                      group.name,
                                      option.name,
                                      choice,
                                    )
                                  }
                                />
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  </AccordionSection>
                );
              })}

              {choiceGroups.map((group, groupIndex) => {
                const sectionId = `choice-${groupIndex}-${group.name}`;
                return (
                  <AccordionSection
                    key={sectionId}
                    title={group.name}
                    open={isSectionOpen(sectionId)}
                    onToggle={() => toggleSection(sectionId)}>
                    <View style={styles.choiceGrid}>
                      {group.subChoices.map((subChoice) => {
                        const active = (
                          selectedChoices[group.name] || []
                        ).includes(subChoice);
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
                  </AccordionSection>
                );
              })}

              {product.addons?.length ? (
                <AccordionSection
                  title="Addons"
                  open={isSectionOpen('addons')}
                  onToggle={() => toggleSection('addons')}>
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

                        {addonChoiceGroups.length > 0 ? (
                          <View style={styles.addonChoices}>
                            {qty <= 0 ? (
                              <Text style={styles.addonChoiceHint}>
                                Set addon quantity above to choose options
                              </Text>
                            ) : null}
                            {addonChoiceGroups.map((group, groupIndex) => {
                              const qtyMap = normalizeAddonChoiceQtyMap(
                                choicesByGroup[groupIndex],
                              );
                              const selectedTotal =
                                sumAddonChoiceQtyMap(qtyMap);
                              const mismatch = qty > 0 && selectedTotal !== qty;
                              const over = selectedTotal > qty;

                              return (
                                <View
                                  key={`${addonKey}-${group.name}-${groupIndex}`}
                                  style={styles.addonChoiceGroup}>
                                  <View style={styles.addonChoiceHeader}>
                                    <Text style={styles.addonChoiceTitle}>
                                      {group.name}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.addonChoiceCount,
                                        mismatch
                                          ? styles.addonChoiceCountError
                                          : selectedTotal === qty && qty > 0
                                            ? styles.addonChoiceCountOk
                                            : null,
                                      ]}>
                                      {selectedTotal} / {qty} selected
                                    </Text>
                                  </View>
                                  <View style={styles.subChoiceList}>
                                    {group.subChoices.map((choice) => {
                                      const subQty =
                                        Number(qtyMap[choice]) || 0;
                                      const others = selectedTotal - subQty;
                                      const maxForSub = Math.max(
                                        0,
                                        qty - Math.max(0, others),
                                      );
                                      return (
                                        <View
                                          key={`${addonKey}-${group.name}-${choice}`}
                                          style={[
                                            styles.subChoiceRow,
                                            subQty > 0 &&
                                              styles.subChoiceRowActive,
                                            qty <= 0 &&
                                              styles.subChoiceRowDisabled,
                                          ]}>
                                          <Stepper
                                            label={choice}
                                            value={subQty}
                                            min={0}
                                            max={maxForSub}
                                            flat
                                            compact
                                            onChange={(next) =>
                                              setAddonSubChoiceQty(
                                                addon,
                                                groupIndex,
                                                choice,
                                                next,
                                              )
                                            }
                                          />
                                        </View>
                                      );
                                    })}
                                  </View>
                                  {mismatch ? (
                                    <Text style={styles.addonChoiceError}>
                                      {over
                                        ? `Too many selections (${selectedTotal}). Must equal addon qty (${qty}).`
                                        : `Select more options (${selectedTotal} of ${qty}). Nested choices must match addon quantity.`}
                                    </Text>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </AccordionSection>
              ) : null}
            </View>

            <View style={styles.modifiedRequestBlock}>
              <Pressable
                style={styles.modifiedRequestHeadingRow}
                onPress={() => setModifiedRequestOpen((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{expanded: modifiedRequestOpen}}
                accessibilityLabel="Modified request">
                <Text style={styles.modifiedRequestHeading}>
                  Modified request
                </Text>
                <View
                  style={[
                    styles.modifiedRequestToggle,
                    modifiedRequestOpen && styles.modifiedRequestToggleOpen,
                  ]}>
                  {modifiedRequestOpen ? (
                    <Minus size={12} color={colors.primary} />
                  ) : (
                    <Plus size={12} color={colors.textSecondary} />
                  )}
                </View>
              </Pressable>
              {modifiedRequestOpen ? (
                <View style={styles.modifiedRequestFields}>
                  <View style={styles.modifiedRequestRow}>
                    <Text style={styles.modifiedRequestLabel}>Without</Text>
                    <TextInput
                      style={styles.modifiedRequestInput}
                      value={noteWithout}
                      onChangeText={setNoteWithout}
                      onBlur={() => setNoteWithout((value) => value.trim())}
                      placeholder="Type Here"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={80}
                      accessibilityLabel={`Without for ${product.name}`}
                    />
                  </View>
                  <View style={styles.modifiedRequestRow}>
                    <Text style={styles.modifiedRequestLabel}>Add</Text>
                    <TextInput
                      style={styles.modifiedRequestInput}
                      value={noteAdd}
                      onChangeText={setNoteAdd}
                      onBlur={() => setNoteAdd((value) => value.trim())}
                      placeholder="Type Here"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={80}
                      accessibilityLabel={`Add for ${product.name}`}
                    />
                  </View>
                </View>
              ) : null}
            </View>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdropKeyboardOpen: {
    justifyContent: 'flex-end',
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
  accordionList: {
    gap: 10,
  },
  accordionItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  accordionTrigger: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  accordionTitle: {
    flex: 1,
    paddingRight: 12,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  accordionContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  variantList: {
    gap: 8,
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
  stepperRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0,
    gap: 8,
  },
  stepperLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  stepperLabelWrapCompact: {
    flex: 0,
    paddingRight: 0,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stepperLabelCompact: {
    fontSize: 13,
    lineHeight: 17,
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
  stepperControlsCompact: {
    gap: 8,
    justifyContent: 'flex-start',
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
  stepperButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stepperButtonTextCompact: {
    fontSize: 18,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  stepperValueCompact: {
    minWidth: 20,
    fontSize: 15,
  },
  customDataBlock: {
    gap: 14,
  },
  customDataOption: {
    gap: 8,
  },
  customDataOptionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  addonChoiceHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addonChoiceGroup: {
    gap: 8,
  },
  addonChoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addonChoiceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  addonChoiceCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  addonChoiceCountError: {
    color: colors.error,
  },
  addonChoiceCountOk: {
    color: '#059669',
  },
  addonChoiceError: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  subChoiceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subChoiceRow: {
    width: '48.5%',
    maxWidth: '48.5%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  subChoiceRowActive: {
    borderColor: colors.primary,
  },
  subChoiceRowDisabled: {
    opacity: 0.5,
  },
  modifiedRequestBlock: {
    marginTop: 14,
    gap: 8,
  },
  modifiedRequestHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  modifiedRequestHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modifiedRequestToggle: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifiedRequestToggleOpen: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
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
