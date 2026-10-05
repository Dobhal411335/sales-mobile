import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import {colors} from '../constants/colors';
import {SalesHeader} from '../components/common/SalesHeader';
import {useNotificationBootstrap} from '../socket/socket';
import {MobilePrintAgent} from '../components/printing/MobilePrintAgent';
import {PriceDisplayAgent} from '../components/display/PriceDisplayAgent';
import {FloorScreen} from '../screens/sales/floor/FloorScreen';
// Hot destinations: static import so Floor → Orders/Booking/hubs/CreateOrder open instantly.
import {CreateOrderScreen} from '../screens/sales/create-order/CreateOrderScreen';
import {BookingScreen} from '../screens/sales/booking/BookingScreen';
import {TodaySalesScreen as OrdersScreen} from '../screens/sales/today/TodaySales';
import {TakeAwayHubScreen} from '../screens/sales/take-away/TakeAwayHubScreen';
import {StaffHubScreen} from '../screens/sales/staff/StaffHubScreen';
import {menuSyncManager} from '../menu/menuSyncManager';
import {startOrderOutboxLifecycle} from '../store/orderOutboxStore';
import {useTodayOrdersStore} from '../store/todayOrdersStore';
import {useReservationsStore} from '../store/reservationsStore';
import {prefetchFloorDestinations} from './prefetchSalesScreens';
import type {SalesStackParamList} from './types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

const screenOptions = {
  header: (props: NativeStackHeaderProps) => <SalesHeader {...props} />,
  contentStyle: {backgroundColor: colors.background},
  freezeOnBlur: true,
  // Faster perceived transitions from Floor / header tabs.
  animation: 'fade' as const,
  animationDuration: 180,
};

function useMenuPrefetch() {
  useEffect(() => {
    void menuSyncManager.ensureReady();
  }, []);
}

function useSalesDataWarmup() {
  useEffect(() => {
    void useTodayOrdersStore.getState().fetch({silent: true});
    void useReservationsStore.getState().fetch({silent: true});
    const stopPrefetch = prefetchFloorDestinations();
    const stopOutbox = startOrderOutboxLifecycle();
    return () => {
      stopPrefetch();
      stopOutbox();
    };
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
      <PriceDisplayAgent />
    </>
  );
}

export function SalesNavigator() {
  useNotificationBootstrap();
  useMenuPrefetch();
  useSalesDataWarmup();

  return (
    <>
      <DeferredAgents />
      <Stack.Navigator
        initialRouteName="Floor"
        screenOptions={screenOptions}>
        <Stack.Screen name="Floor" component={FloorScreen} />
        <Stack.Screen name="TakeAwayHub" component={TakeAwayHubScreen} />
        <Stack.Screen name="StaffHub" component={StaffHubScreen} />
        <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen
          name="Payment"
          getComponent={() =>
            require('../screens/sales/payment/PaymentScreen').PaymentScreen
          }
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Receipt"
          getComponent={() =>
            require('../screens/sales/payment/ReceiptScreen').ReceiptScreen
          }
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="TodaySales"
          getComponent={() =>
            require('../screens/sales/today-sales/TodaySalesScreen')
              .TodaySalesScreen
          }
        />
        <Stack.Screen
          name="Reports"
          getComponent={() =>
            require('../screens/sales/reports/ReportsScreen').ReportsScreen
          }
        />
        <Stack.Screen
          name="Notifications"
          getComponent={() =>
            require('../screens/sales/notifications/NotificationsScreen')
              .NotificationsScreen
          }
        />
        <Stack.Screen
          name="PrintJobs"
          getComponent={() =>
            require('../screens/sales/print-jobs/PrintJobsScreen')
              .PrintJobsScreen
          }
        />
        <Stack.Screen
          name="PrintersSettings"
          getComponent={() =>
            require('../screens/sales/printers/PrintersSettingsScreen')
              .PrintersSettingsScreen
          }
          options={{title: 'Printer settings'}}
        />
        <Stack.Screen
          name="MenuSync"
          getComponent={() =>
            require('../screens/sales/menu-sync/MenuSyncScreen').MenuSyncScreen
          }
          options={{title: 'Sync products'}}
        />
        <Stack.Screen
          name="DayClose"
          getComponent={() =>
            require('../screens/sales/day-close/DayCloseScreen').DayCloseScreen
          }
        />
      </Stack.Navigator>
    </>
  );
}
