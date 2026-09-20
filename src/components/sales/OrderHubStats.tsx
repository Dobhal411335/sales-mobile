import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {CheckCircle2, LayoutGrid, Wallet} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {HubFilter, HubStats} from '../../hooks/useOrderHub';
import {formatCurrency} from '../../utils/currency';

const STAT_CARDS: {
  id: HubFilter;
  label: string;
  Icon: typeof Wallet;
  activeBg: string;
  activeBorder: string;
  iconBg: string;
  valueColor: string;
}[] = [
  {
    id: 'OPEN',
    label: 'Unpaid',
    Icon: Wallet,
    activeBg: '#FFFBEB',
    activeBorder: '#F59E0B',
    iconBg: '#F59E0B',
    valueColor: '#78350F',
  },
  {
    id: 'PAID',
    label: 'Paid today',
    Icon: CheckCircle2,
    activeBg: '#ECFDF5',
    activeBorder: '#10B981',
    iconBg: '#059669',
    valueColor: '#064E3B',
  },
  {
    id: 'ALL',
    label: 'All orders',
    Icon: LayoutGrid,
    activeBg: '#FFF7ED',
    activeBorder: colors.primary,
    iconBg: colors.primary,
    valueColor: '#7C2D12',
  },
];

interface OrderHubStatsProps {
  stats: HubStats;
  filter: HubFilter;
  onSelect: (filter: HubFilter) => void;
}

export function OrderHubStats({stats, filter, onSelect}: OrderHubStatsProps) {
  return (
    <View style={styles.row}>
      {STAT_CARDS.map((card) => {
        const active = filter === card.id;
        const data = stats[card.id];
        const Icon = card.Icon;
        return (
          <Pressable
            key={card.id}
            style={[
              styles.card,
              active && {
                backgroundColor: card.activeBg,
                borderColor: card.activeBorder,
              },
            ]}
            onPress={() => onSelect(card.id)}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            accessibilityLabel={`${card.label}, ${data.count} orders`}>
            <View style={[styles.iconWrap, {backgroundColor: card.iconBg}]}>
              <Icon size={14} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <Text
              style={[styles.label, active && {color: card.valueColor}]}
              numberOfLines={1}>
              {card.label}
            </Text>
            <Text
              style={[styles.count, active && {color: card.valueColor}]}
              numberOfLines={1}>
              {data.count}
            </Text>
            <Text style={styles.amount} numberOfLines={1}>
              {formatCurrency(data.amount)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textSecondary,
  },
  count: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  amount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
