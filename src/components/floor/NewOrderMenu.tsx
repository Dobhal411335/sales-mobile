import React from 'react';
import {ActionSheet} from '../common/ActionSheet';
import type {OrderType} from '../../navigation/types';

export type FloorOrderShortcut = 'walking' | 'staff' | 'online';

const ORDER_TYPE_OPTIONS: {
  label: string;
  value: FloorOrderShortcut;
}[] = [
  {label: 'Walking Order', value: 'walking'},
  {label: 'Staff Order', value: 'staff'},
  {label: 'Online Order', value: 'online'},
];

interface NewOrderMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (orderType: FloorOrderShortcut) => void;
  attention?: {
    walkInUnpaid?: number;
    staffUnpaid?: number;
    onlineOpen?: number;
  };
}

function badgeFor(
  value: FloorOrderShortcut,
  attention?: NewOrderMenuProps['attention'],
): number | undefined {
  if (!attention) {
    return undefined;
  }
  if (value === 'walking') {
    return attention.walkInUnpaid;
  }
  if (value === 'staff') {
    return attention.staffUnpaid;
  }
  return attention.onlineOpen;
}

export function NewOrderMenu({
  visible,
  onClose,
  onSelect,
  attention,
}: NewOrderMenuProps) {
  return (
    <ActionSheet
      visible={visible}
      title="Create New Order"
      onClose={onClose}
      options={ORDER_TYPE_OPTIONS.map((option) => ({
        label: option.label,
        badge: badgeFor(option.value, attention),
        onPress: () => onSelect(option.value),
      }))}
    />
  );
}
