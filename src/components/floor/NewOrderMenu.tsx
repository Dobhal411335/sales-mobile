import React from 'react';
import {ActionSheet} from '../common/ActionSheet';

export type FloorOrderShortcut = 'takeaway' | 'staff' | 'online';

const ORDER_TYPE_OPTIONS: {
  label: string;
  value: FloorOrderShortcut;
}[] = [
  {label: 'Takeaway Order', value: 'takeaway'},
  {label: 'Staff Order', value: 'staff'},
  {label: 'Online Order', value: 'online'},
];

interface NewOrderMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (orderType: FloorOrderShortcut) => void;
  attention?: {
    takeAwayUnpaid?: number;
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
  if (value === 'takeaway') {
    return attention.takeAwayUnpaid;
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
