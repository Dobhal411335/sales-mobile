import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import type {MenuProduct, TaxRate} from '../../types/product';
import {buildOfferCartLine} from '../../utils/cartBuilder';
import {cleanOfferList} from '../../utils/offerDetails';
import {formatCurrency} from '../../utils/currency';

interface OfferOptionsModalProps {
  visible: boolean;
  offer: MenuProduct | null;
  globalTaxes: TaxRate[];
  onClose: () => void;
  onAdd: (items: CartLineItem[]) => void;
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function OptionRow({
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
      style={[styles.optionRow, active && styles.optionRowActive]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{checked: active}}>
      <View style={[styles.checkbox, active && styles.checkboxActive]}>
        {active ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

export function OfferOptionsModal({
  visible,
  offer,
  globalTaxes,
  onClose,
  onAdd,
}: OfferOptionsModalProps) {
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);

  useEffect(() => {
    if (!offer || !visible) {
      return;
    }
    const inclusions = cleanOfferList(offer.inclusions);
    const choices = cleanOfferList(offer.choices);
    const drinks = cleanOfferList(offer.drinks);
    setSelectedInclusions(inclusions);
    setSelectedChoices(choices.length === 1 ? choices : []);
    setSelectedDrinks(drinks.length === 1 ? drinks : []);
  }, [offer, visible]);

  if (!offer) {
    return null;
  }

  const inclusions = cleanOfferList(offer.inclusions);
  const choices = cleanOfferList(offer.choices);
  const drinks = cleanOfferList(offer.drinks);

  const handleAdd = () => {
    onAdd([
      buildOfferCartLine(
        offer,
        {
          inclusions: selectedInclusions,
          choices: selectedChoices,
          drinks: selectedDrinks,
        },
        globalTaxes,
      ),
    ]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.offerBadge}>OFFER</Text>
              <Text style={styles.title} numberOfLines={2}>
                {offer.name}
              </Text>
            </View>
            <Text style={styles.subtitle}>
              Select inclusions, choices and drinks
            </Text>
            <Text style={styles.price}>{formatCurrency(offer.price || 0)}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            {inclusions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inclusions</Text>
                {inclusions.map((item) => (
                  <OptionRow
                    key={item}
                    label={item}
                    active={selectedInclusions.includes(item)}
                    onPress={() =>
                      setSelectedInclusions((prev) => toggleValue(prev, item))
                    }
                  />
                ))}
              </View>
            ) : null}

            {choices.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choices</Text>
                {choices.map((item) => (
                  <OptionRow
                    key={item}
                    label={item}
                    active={selectedChoices.includes(item)}
                    onPress={() =>
                      setSelectedChoices((prev) => toggleValue(prev, item))
                    }
                  />
                ))}
              </View>
            ) : null}

            {drinks.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Drinks</Text>
                {drinks.map((item) => (
                  <OptionRow
                    key={item}
                    label={item}
                    active={selectedDrinks.includes(item)}
                    onPress={() =>
                      setSelectedDrinks((prev) => toggleValue(prev, item))
                    }
                  />
                ))}
              </View>
            ) : null}
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
              accessibilityLabel={`Add ${offer.name} to cart`}>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerBadge: {
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
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  checkbox: {
    width: 20,
    height: 20,
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
    fontSize: 12,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
