import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  ShoppingBag,
  UserRound,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {FloorOrderShortcut} from './FloorHeader';

interface FloorAttention {
  walkInUnpaid: number;
  staffUnpaid: number;
  onlineOpen: number;
}

interface FloorAttentionPanelProps {
  attention: FloorAttention;
  onSelect: (orderType: FloorOrderShortcut) => void;
  layout?: 'rail' | 'sheet';
}

const ATTENTION_ITEMS: {
  id: FloorOrderShortcut;
  label: string;
  countKey: keyof FloorAttention;
  Icon: typeof ShoppingBag;
  border: string;
  background: string;
  text: string;
  badgeBg: string;
}[] = [
  {
    id: 'walking',
    label: 'Walk-in unpaid',
    countKey: 'walkInUnpaid',
    Icon: ShoppingBag,
    border: '#FED7AA',
    background: '#FFF7ED',
    text: '#7C2D12',
    badgeBg: '#F97316',
  },
  {
    id: 'staff',
    label: 'Staff unpaid',
    countKey: 'staffUnpaid',
    Icon: UserRound,
    border: '#C7D2FE',
    background: '#EEF2FF',
    text: '#312E81',
    badgeBg: '#4F46E5',
  },
  {
    id: 'online',
    label: 'Online open',
    countKey: 'onlineOpen',
    Icon: Globe,
    border: '#BAE6FD',
    background: '#F0F9FF',
    text: '#0C4A6E',
    badgeBg: '#0284C7',
  },
];

const TABLE_STATUS_LEGEND = [
  {label: 'Available', color: '#FFFFFF', borderColor: '#A1A1AA'},
  {label: 'Serving', color: '#38BDF8', borderColor: '#0EA5E9'},
  {label: 'Payment', color: '#10B981', borderColor: '#059669'},
  {label: 'Ordering', color: '#F97316', borderColor: '#EA580C'},
  {label: 'Combined', color: '#8B5CF6', borderColor: '#7C3AED'},
  {label: 'Booked', color: '#EF4444', borderColor: '#DC2626'},
];

export function FloorAttentionPanel({
  attention,
  onSelect,
  layout = 'rail',
}: FloorAttentionPanelProps) {
  const total =
    attention.walkInUnpaid + attention.staffUnpaid + attention.onlineOpen;
  const isSheet = layout === 'sheet';

  return (
    <View style={[styles.panel, isSheet && styles.panelSheet]}>
      <View style={styles.panelHeader}>
        <Text style={styles.eyebrow}>Needs attention</Text>
        <Text style={styles.title}>Today’s open orders</Text>
      </View>

      <View style={[styles.list, isSheet && styles.listSheet]}>
        {ATTENTION_ITEMS.map((item) => {
          const count = attention[item.countKey] || 0;
          const Icon = item.Icon;
          return (
            <Pressable
              key={item.id}
              style={({pressed}) => [
                styles.card,
                {
                  borderColor: item.border,
                  backgroundColor: item.background,
                },
                pressed && styles.cardPressed,
              ]}
              onPress={() => onSelect(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${count}`}>
              <Icon size={16} color={item.text} strokeWidth={2.2} />
              <Text
                style={[styles.cardLabel, {color: item.text}]}
                numberOfLines={1}>
                {item.label}
              </Text>
              <View
                style={[
                  styles.badge,
                  {backgroundColor: count > 0 ? item.badgeBg : '#A1A1AA'},
                ]}>
                <Text style={styles.badgeText}>{count}</Text>
              </View>
              <ArrowRight size={14} color={item.text} strokeWidth={2.2} />
            </Pressable>
          );
        })}

        {total === 0 ? (
          <View style={styles.clearCard}>
            <CheckCircle2 size={16} color="#059669" strokeWidth={2.2} />
            <Text style={styles.clearText}>
              All clear — no unpaid walk-in, staff, or open online orders.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.legendSection}>
        <Text style={styles.eyebrow}>Table status</Text>
        <View style={styles.legendGrid}>
          {TABLE_STATUS_LEGEND.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  {
                    backgroundColor: item.color,
                    borderColor: item.borderColor,
                  },
                ]}
              />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 260,
    maxWidth: '42%',
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    flexDirection: 'column',
  },
  panelSheet: {
    width: '100%',
    maxWidth: '100%',
    borderLeftWidth: 0,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#A1A1AA',
  },
  title: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  list: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  listSheet: {
    flexGrow: 0,
    flexShrink: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
  },
  badge: {
    minWidth: 22,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  clearCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  clearText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    lineHeight: 17,
  },
  legendSection: {
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  legendGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#52525B',
  },
});
