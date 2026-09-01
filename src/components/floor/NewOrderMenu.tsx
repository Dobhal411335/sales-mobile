import React from 'react';
import {ActionSheet} from '../common/ActionSheet';
import type {OrderType} from '../../navigation/types';

const ORDER_TYPE_OPTIONS: {label: string; value: OrderType}[] = [
  {label: 'Table Order', value: 'table'},
  {label: 'Walking Order', value: 'walking'},
  {label: 'Staff Order', value: 'staff'},
  {label: 'Online Order', value: 'online'},
];

interface NewOrderMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
}

export function NewOrderMenu({visible, onClose, onSelect}: NewOrderMenuProps) {
  return (
    <ActionSheet
      visible={visible}
      title="Create New Order"
      onClose={onClose}
      options={ORDER_TYPE_OPTIONS.map((option) => ({
        label: option.label,
        onPress: () => onSelect(option.value),
      }))}
    />
  );
}
