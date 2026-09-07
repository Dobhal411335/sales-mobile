import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import {colors} from '../constants/colors';
import {SalesHeader} from '../components/common/SalesHeader';
import {useNotificationBootstrap} from '../socket/socket';
import {MobilePrintAgent} from '../components/printing/MobilePrintAgent';
import {CreateOrderScreen} from '../screens/sales/create-order/CreateOrderScreen';
import {DayCloseScreen} from '../screens/sales/day-close/DayCloseScreen';
import {FloorScreen} from '../screens/sales/floor/FloorScreen';
import {NotificationsScreen} from '../screens/sales/notifications/NotificationsScreen';
import {TodaySalesScreen} from '../screens/sales/today/TodaySales';
import {PaymentScreen} from '../screens/sales/payment/PaymentScreen';
import {ReceiptScreen} from '../screens/sales/payment/ReceiptScreen';
import {PrintJobsScreen} from '../screens/sales/print-jobs/PrintJobsScreen';
import {ReportsScreen} from '../screens/sales/reports/ReportsScreen';
import type {SalesStackParamList} from './types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

const screenOptions = {
  header: (props: NativeStackHeaderProps) => <SalesHeader {...props} />,
  contentStyle: {backgroundColor: colors.background},
};

export function SalesNavigator() {
  useNotificationBootstrap();

  return (
    <>
      <MobilePrintAgent />
      <Stack.Navigator initialRouteName="Floor" screenOptions={screenOptions}>
      <Stack.Screen name="Floor" component={FloorScreen} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Receipt"
        component={ReceiptScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen name="Orders" component={TodaySalesScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrintJobs" component={PrintJobsScreen} />
      <Stack.Screen name="DayClose" component={DayCloseScreen} />
    </Stack.Navigator>
    </>
  );
}
