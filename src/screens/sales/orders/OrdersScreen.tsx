import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {PlaceholderScreen} from '../../../components/common/PlaceholderScreen';
import type {SalesStackParamList} from '../../../navigation/types';

type Props = NativeStackScreenProps<SalesStackParamList, 'Orders'>;

export function OrdersScreen({route}: Props) {
  const filter = route.params?.filter ?? 'ALL';
  const isOnline = filter === 'ONLINE';

  return (
    <PlaceholderScreen
      title={isOnline ? 'Online Orders' : 'Orders'}
      description={
        isOnline
          ? 'Online orders are listed here for staff to view, pay, or waive. Full order management UI is planned for a follow-up phase.'
          : 'Orders screen will be implemented here.'
      }
    />
  );
}
