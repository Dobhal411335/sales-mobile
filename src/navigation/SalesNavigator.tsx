import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import {colors} from '../constants/colors';
import {SalesHeader} from '../components/common/SalesHeader';
import {useNotificationBootstrap} from '../socket/socket';
import {MobilePrintAgent} from '../components/printing/MobilePrintAgent';
import {CustomerDisplayAgent} from '../components/display/CustomerDisplayAgent';
import {CreateOrderScreen} from '../screens/sales/create-order/CreateOrderScreen';
import {DayCloseScreen} from '../screens/sales/day-close/DayCloseScreen';
import {FloorScreen} from '../screens/sales/floor/FloorScreen';
import {BookingScreen} from '../screens/sales/booking/BookingScreen';
import {NotificationsScreen} from '../screens/sales/notifications/NotificationsScreen';
import {TodaySalesScreen as OrdersScreen} from '../screens/sales/today/TodaySales';
import {TodaySalesScreen} from '../screens/sales/today-sales/TodaySalesScreen';
import {PaymentScreen} from '../screens/sales/payment/PaymentScreen';
import {ReceiptScreen} from '../screens/sales/payment/ReceiptScreen';
import {PrintJobsScreen} from '../screens/sales/print-jobs/PrintJobsScreen';
import {PrintersSettingsScreen} from '../screens/sales/printers/PrintersSettingsScreen';
import {CustomerDisplaySettingsScreen} from '../screens/sales/display/CustomerDisplaySettingsScreen';
import {MenuSyncScreen} from '../screens/sales/menu-sync/MenuSyncScreen';
import {ReportsScreen} from '../screens/sales/reports/ReportsScreen';
import {WalkInHubScreen} from '../screens/sales/walk-in/WalkInHubScreen';
import {StaffHubScreen} from '../screens/sales/staff/StaffHubScreen';
import {menuSyncManager} from '../menu/menuSyncManager';
import type {SalesStackParamList} from './types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

const screenOptions = {
  header: (props: NativeStackHeaderProps) => <SalesHeader {...props} />,
  contentStyle: {backgroundColor: colors.background},
};

function useMenuPrefetch() {
  useEffect(() => {
    void menuSyncManager.ensureReady();
  }, []);
}

function DeferredAgents() {
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <>
      <MobilePrintAgent />
      <CustomerDisplayAgent />
    </>
  );
}

export function SalesNavigator() {
  useNotificationBootstrap();
  useMenuPrefetch();

  return (
    <>
      <DeferredAgents />
      <Stack.Navigator initialRouteName="Floor" screenOptions={screenOptions}>
        <Stack.Screen name="Floor" component={FloorScreen} />
        <Stack.Screen name="WalkInHub" component={WalkInHubScreen} />
        <Stack.Screen name="StaffHub" component={StaffHubScreen} />
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
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="TodaySales" component={TodaySalesScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="PrintJobs" component={PrintJobsScreen} />
        <Stack.Screen
          name="PrintersSettings"
          component={PrintersSettingsScreen}
          options={{title: 'Printer settings'}}
        />
        <Stack.Screen
          name="CustomerDisplaySettings"
          component={CustomerDisplaySettingsScreen}
          options={{title: 'Customer display'}}
        />
        <Stack.Screen
          name="MenuSync"
          component={MenuSyncScreen}
          options={{title: 'Sync products'}}
        />
        <Stack.Screen name="DayClose" component={DayCloseScreen} />
      </Stack.Navigator>
    </>
  );
}
